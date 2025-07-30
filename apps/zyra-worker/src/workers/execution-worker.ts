import {
  Global,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { trace } from '@opentelemetry/api';
import { LRUCache } from 'lru-cache';
import { WorkflowService } from '../lib/services/workflow-service';
import { WorkflowExecutor } from './workflow-executor';
import { ExecutionLogger } from './execution-logger';
import { ErrorHandler } from './error-handler';
import { DatabaseService } from '../services/database.service';
import { RabbitMQService, QueueMessage } from '../services/rabbitmq.service';
import { CircuitBreakerDbService } from '../lib/blockchain/CircuitBreakerDbService';

// Enhanced error classification
export enum ExecutionErrorType {
  VALIDATION_ERROR = 'validation_error',
  CONFIGURATION_ERROR = 'configuration_error',
  NETWORK_ERROR = 'network_error',
  AUTHENTICATION_ERROR = 'auth_error',
  RATE_LIMIT_ERROR = 'rate_limit_error',
  TIMEOUT_ERROR = 'timeout_error',
  EXTERNAL_SERVICE_ERROR = 'external_service_error',
  CIRCUIT_BREAKER_ERROR = 'circuit_breaker_error',
  RESOURCE_ERROR = 'resource_error',
  QUOTA_EXCEEDED_ERROR = 'quota_exceeded_error',
  UNKNOWN_ERROR = 'unknown_error',
}

export class EnhancedExecutionError extends Error {
  public readonly type: ExecutionErrorType;
  public readonly isRetryable: boolean;
  public readonly retryDelay: number;
  public readonly context: Record<string, any>;

  constructor(
    type: ExecutionErrorType,
    message: string,
    isRetryable = false,
    retryDelay = 1000,
    context: Record<string, any> = {},
  ) {
    super(message);
    this.type = type;
    this.isRetryable = isRetryable;
    this.retryDelay = retryDelay;
    this.context = context;
    this.name = 'EnhancedExecutionError';
  }
}

@Global()
@Injectable()
export class ExecutionWorker implements OnModuleInit {
  private readonly logger = new Logger(ExecutionWorker.name);
  private tracer = trace.getTracer('workflow-execution');
  private workflowCache = new LRUCache<string, any>({
    max: 100,
    ttl: 60 * 60 * 1000,
  });
  private profileCache = new LRUCache<string, any>({
    max: 100,
    ttl: 60 * 60 * 1000,
  });
  private isInitialized = false;

  constructor(
    private readonly rabbitmqService: RabbitMQService,
    private readonly workflowService: WorkflowService,
    private readonly workflowExecutor: WorkflowExecutor,
    private readonly executionLogger: ExecutionLogger,
    private readonly errorHandler: ErrorHandler,
    private readonly databaseService: DatabaseService,
    private readonly circuitBreakerService: CircuitBreakerDbService,
  ) {}

  async onModuleInit() {
    try {
      this.logger.log('🚀 Initializing ExecutionWorker...');

      // Setup message consumers using the new RabbitMQ service
      await this.setupMessageConsumers();

      this.isInitialized = true;
      this.logger.log('✅ ExecutionWorker successfully initialized');
    } catch (error) {
      this.logger.error('❌ Failed to initialize ExecutionWorker:', error);
      throw error;
    }
  }

  /**
   * Classify errors for better handling and retry logic
   */
  private classifyError(error: any): EnhancedExecutionError {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Network errors
    if (
      errorMessage.includes('fetch failed') ||
      errorMessage.includes('ENOTFOUND') ||
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ETIMEDOUT')
    ) {
      return new EnhancedExecutionError(
        ExecutionErrorType.NETWORK_ERROR,
        errorMessage,
        true, // Retryable
        2000, // 2 second delay
        { originalError: error },
      );
    }

    // Rate limit errors
    if (
      errorMessage.includes('rate limit') ||
      errorMessage.includes('429') ||
      errorMessage.includes('too many requests')
    ) {
      return new EnhancedExecutionError(
        ExecutionErrorType.RATE_LIMIT_ERROR,
        errorMessage,
        true, // Retryable
        5000, // 5 second delay for rate limits
        { originalError: error },
      );
    }

    // Authentication errors
    if (
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('401') ||
      errorMessage.includes('403') ||
      errorMessage.includes('invalid token')
    ) {
      return new EnhancedExecutionError(
        ExecutionErrorType.AUTHENTICATION_ERROR,
        errorMessage,
        false, // Not retryable
        0,
        { originalError: error },
      );
    }

    // Configuration errors
    if (
      errorMessage.includes('missing') ||
      errorMessage.includes('required') ||
      errorMessage.includes('invalid configuration')
    ) {
      return new EnhancedExecutionError(
        ExecutionErrorType.CONFIGURATION_ERROR,
        errorMessage,
        false, // Not retryable
        0,
        { originalError: error },
      );
    }

    // Quota exceeded errors
    if (
      errorMessage.includes('quota exceeded') ||
      errorMessage.includes('limit exceeded')
    ) {
      return new EnhancedExecutionError(
        ExecutionErrorType.QUOTA_EXCEEDED_ERROR,
        errorMessage,
        false, // Not retryable
        0,
        { originalError: error },
      );
    }

    // Circuit breaker errors
    if (errorMessage.includes('Circuit breaker is OPEN')) {
      return new EnhancedExecutionError(
        ExecutionErrorType.CIRCUIT_BREAKER_ERROR,
        errorMessage,
        true, // Retryable after cooldown
        30000, // 30 second delay
        { originalError: error },
      );
    }

    // External service errors (5xx status codes)
    if (
      errorMessage.includes('HTTP 5') ||
      errorMessage.includes('Internal Server Error')
    ) {
      return new EnhancedExecutionError(
        ExecutionErrorType.EXTERNAL_SERVICE_ERROR,
        errorMessage,
        true, // Retryable
        3000, // 3 second delay
        { originalError: error },
      );
    }

    // Default to unknown retryable error
    return new EnhancedExecutionError(
      ExecutionErrorType.UNKNOWN_ERROR,
      errorMessage,
      true, // Default to retryable
      1000, // 1 second delay
      { originalError: error },
    );
  }

  /**
   * Enhanced retry logic with circuit breaker integration
   */
  private async shouldRetryExecution(
    error: EnhancedExecutionError,
    executionId: string,
    currentRetryCount: number,
  ): Promise<{ shouldRetry: boolean; delay: number; reason: string }> {
    const maxRetries = 3;

    // Don't retry if max retries exceeded
    if (currentRetryCount >= maxRetries) {
      return {
        shouldRetry: false,
        delay: 0,
        reason: `Maximum retries (${maxRetries}) exceeded`,
      };
    }

    // Don't retry non-retryable errors
    if (!error.isRetryable) {
      return {
        shouldRetry: false,
        delay: 0,
        reason: `Error type ${error.type} is not retryable`,
      };
    }

    // Check circuit breaker state
    const circuitId = this.circuitBreakerService.generateCircuitId(
      'execution-worker',
      'workflow-execution',
    );
    const isAllowed =
      await this.circuitBreakerService.isOperationAllowed(circuitId);

    if (!isAllowed) {
      return {
        shouldRetry: false,
        delay: 0,
        reason: 'Circuit breaker is OPEN',
      };
    }

    // Calculate delay with exponential backoff
    const baseDelay = error.retryDelay;
    const backoffMultiplier = Math.pow(2, currentRetryCount);
    const jitter = Math.random() * 1000; // Add up to 1 second jitter
    const delay = Math.min(baseDelay * backoffMultiplier + jitter, 30000); // Max 30 seconds

    return {
      shouldRetry: true,
      delay,
      reason: `Retrying ${error.type} after ${delay}ms delay`,
    };
  }

  private async setupMessageConsumers() {
    // Setup execution queue consumer
    await this.rabbitmqService.consumeExecutions(async (message, ack, nack) => {
      const span = this.tracer.startSpan('process_execution_message');
      try {
        if (!this.isInitialized) {
          this.logger.warn('Worker not fully initialized, requeuing message');
          nack(true); // Requeue
          return;
        }

        this.logger.log(
          `📥 Processing execution message: ${message.executionId}`,
        );

        // Record execution attempt in circuit breaker
        const circuitId = this.circuitBreakerService.generateCircuitId(
          'execution-worker',
          'workflow-execution',
        );

        try {
          await this.processMessageFromQueue(message);

          // Record success in circuit breaker
          await this.circuitBreakerService.recordSuccess(circuitId);
          ack(); // Acknowledge successful processing
        } catch (processingError) {
          throw processingError; // Let the outer catch handle classification and retry logic
        }
      } catch (err) {
        // Classify the error for better handling
        const classifiedError = this.classifyError(err);

        this.logger.error(
          `Message processing failed (${classifiedError.type}): ${classifiedError.message}`,
          err instanceof Error ? err.stack : undefined,
        );
        span.recordException(err as Error);

        // Record failure in circuit breaker
        const circuitId = this.circuitBreakerService.generateCircuitId(
          'execution-worker',
          'workflow-execution',
        );
        await this.circuitBreakerService.recordFailure(circuitId);

        // Enhanced retry logic
        const retryDecision = await this.shouldRetryExecution(
          classifiedError,
          message.executionId,
          message.retryCount || 0,
        );

        this.logger.log(
          `Retry decision for ${message.executionId}: ${retryDecision.reason}`,
        );

        if (retryDecision.shouldRetry) {
          // Update retry count and publish to retry queue
          const retryMessage = {
            ...message,
            retryCount: (message.retryCount || 0) + 1,
          };
          await this.rabbitmqService.publishRetry(
            retryMessage,
            retryDecision.delay,
          );
          ack(); // Ack original message since we've queued retry
        } else {
          // No retry - log detailed failure information
          await this.databaseService.executions.addLog(
            message.executionId,
            'error',
            `Execution failed permanently: ${classifiedError.message}`,
            {
              error_type: classifiedError.type,
              retry_count: message.retryCount || 0,
              failure_reason: retryDecision.reason,
              context: classifiedError.context,
            },
          );
          nack(false); // Don't requeue, goes to DLQ
        }
      } finally {
        span.end();
      }
    });

    // Setup DLQ consumer for monitoring
    await this.rabbitmqService.consumeDLQ((message) => {
      this.logger.error(`💀 Failed message in DLQ: ${JSON.stringify(message)}`);
      // Here you could add alerting, metrics, or manual retry logic
    });

    this.logger.log('👂 Message consumers configured');
  }

  /**
   * Process a single message from RabbitMQ queue
   */
  private async processMessageFromQueue(message: QueueMessage): Promise<void> {
    const { executionId, workflowId, userId } = message;
    const workerId = `worker-${process.pid}-${Math.random().toString(36).substring(2, 10)}`;

    this.logger.log(
      `Worker ${workerId} processing message for execution ${executionId}`,
    );

    try {
      // Verify execution exists and is in a processable state
      const execution =
        await this.databaseService.executions.findById(executionId);
      if (!execution) {
        this.logger.error(`Execution ${executionId} not found`);
        return;
      }

      // Check if execution is already completed or failed
      if (execution.status === 'completed' || execution.status === 'failed') {
        this.logger.warn(
          `Skipping already ${execution.status} execution: ${executionId}`,
        );
        return;
      }

      // Check if execution is paused - requeue for later
      if (execution.status === 'paused') {
        this.logger.warn(`Execution ${executionId} is paused, skipping`);
        return;
      }

      // Try to claim/lock the execution for this worker
      try {
        await this.databaseService.lockExecutionForWorker(
          executionId,
          workerId,
        );
        this.logger.log(`Successfully claimed execution ${executionId}`);
      } catch (lockError) {
        this.logger.warn(
          `Failed to claim execution ${executionId}: ${lockError}. Another worker may have claimed it.`,
        );
        return;
      }

      // Log the claim
      await this.databaseService.executions.addLog(
        executionId,
        'info',
        `Worker ${workerId} claimed execution from RabbitMQ`,
        {
          worker_id: workerId,
          message_source: 'rabbitmq',
          workflow_id: workflowId,
          user_id: userId,
        },
      );

      // Create job object for processing
      const job = {
        executionId,
        workflowId,
        userId,
        id: executionId,
        payload: message.payload || {},
        status: 'processing',
      };

      this.logger.log(`Processing job for execution ${executionId}...`);
      await this.processJob(job);
    } catch (error) {
      this.logger.error(
        `Failed to process message for execution ${executionId}: ${error instanceof Error ? error.message : String(error)}`,
      );

      // Log the failure
      await this.databaseService.executions.addLog(
        executionId,
        'error',
        `Worker failed to process execution: ${error instanceof Error ? error.message : String(error)}`,
        {
          worker_id: workerId,
          error_details: error instanceof Error ? error.stack : undefined,
        },
      );

      throw error; // Re-throw to trigger message nack
    }
  }

  private async processJob(job: any): Promise<void> {
    try {
      const { executionId, workflowId, userId, payload } = job;
      const isRetry = payload?.retried === true;
      const isResume = payload?.resumed === true;
      const resumeData = isResume ? payload?.resumeData || {} : {};

      // Get workflow using existing method
      const workflow =
        this.workflowCache.get(workflowId) ||
        (await this.fetchWorkflow(workflowId));
      if (workflow.user_id !== userId)
        throw new Error('User does not have permission');

      // Get or create profile using DatabaseService
      const profile =
        this.profileCache.get(userId) ||
        (await this.databaseService.getOrCreateUserProfile(userId));
      if (profile.monthlyExecutionCount >= profile.monthlyExecutionQuota) {
        throw new EnhancedExecutionError(
          ExecutionErrorType.QUOTA_EXCEEDED_ERROR,
          'Monthly execution quota exceeded',
          false, // Not retryable
          0,
          {
            userId,
            currentCount: profile.monthlyExecutionCount,
            quota: profile.monthlyExecutionQuota,
          },
        );
      }

      // Increment execution count
      await this.databaseService.prisma.profile.update({
        where: { id: userId },
        data: {
          monthlyExecutionCount: {
            increment: 1,
          },
        },
      });

      // Check execution status
      const execution =
        await this.databaseService.executions.findById(executionId);
      if (execution?.status === 'paused' && !isResume) return;

      // Update execution status
      await this.databaseService.updateExecutionStatusWithLogging(
        executionId,
        'running',
        undefined,
        undefined,
      );

      // Extract workflow definition
      const { nodes, edges } = this.extractNodesAndEdges(workflow);

      // Execute workflow
      const result = await this.workflowExecutor.executeWorkflow(
        nodes,
        edges,
        executionId,
        userId,
        isResume ? payload?.lastCompletedNodeId : undefined,
        resumeData,
      );

      // Update final status
      await this.databaseService.updateExecutionStatusWithLogging(
        executionId,
        result.status,
        result.error,
        result.outputs,
      );
    } catch (error) {
      await this.errorHandler.handleJobFailure(
        error instanceof Error ? error : new Error(String(error)),
        job.executionId,
        job.userId,
      );
    }
  }

  private async fetchWorkflow(workflowId: string) {
    const workflowResult = await this.workflowService.getWorkflow(workflowId);
    if ('error' in workflowResult && workflowResult.error)
      throw new Error(`Failed to fetch workflow: ${workflowResult.error}`);
    const workflow =
      'data' in workflowResult ? workflowResult.data : workflowResult;
    this.workflowCache.set(workflowId, workflow);
    return workflow;
  }

  private extractNodesAndEdges(workflow: any) {
    if (workflow.nodes && workflow.edges)
      return { nodes: workflow.nodes, edges: workflow.edges };
    if (workflow.flow_data?.nodes && workflow.flow_data?.edges)
      return {
        nodes: workflow.flow_data.nodes,
        edges: workflow.flow_data.edges,
      };
    if (workflow.definition) {
      const definition =
        typeof workflow.definition === 'string'
          ? JSON.parse(workflow.definition)
          : workflow.definition;
      return { nodes: definition.nodes || [], edges: definition.edges || [] };
    }
    throw new Error('Workflow is missing nodes and edges data');
  }
}
