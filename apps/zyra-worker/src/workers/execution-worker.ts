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
        await this.processMessageFromQueue(message);
        ack(); // Acknowledge successful processing
      } catch (err) {
        this.logger.error(
          `Message processing failed: ${err instanceof Error ? err.message : err}`,
          err instanceof Error ? err.stack : undefined,
        );
        span.recordException(err as Error);

        // Check if we should retry
        const maxRetries = 3;
        if ((message.retryCount || 0) < maxRetries) {
          // Publish to retry queue with exponential backoff
          const delayMs = Math.pow(2, message.retryCount || 0) * 1000;
          await this.rabbitmqService.publishRetry(message, delayMs);
          ack(); // Ack original message since we've queued retry
        } else {
          // Max retries exceeded, send to DLQ
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
        execution_id: executionId,
        workflow_id: workflowId,
        user_id: userId,
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
      const {
        execution_id: executionId,
        workflow_id: workflowId,
        user_id: userId,
        payload,
      } = job;
      const isRetry = payload.retried === true;
      const isResume = payload.resumed === true;
      const resumeData = isResume ? payload.resumeData || {} : {};

      // Get workflow using existing method
      let workflow =
        this.workflowCache.get(workflowId) ||
        (await this.fetchWorkflow(workflowId));
      if (workflow.user_id !== userId)
        throw new Error('User does not have permission');

      // Get or create profile using DatabaseService
      let profile =
        this.profileCache.get(userId) ||
        (await this.databaseService.getOrCreateUserProfile(userId));
      if (profile.monthlyExecutionCount >= profile.monthlyExecutionQuota) {
        throw new Error('Monthly execution quota exceeded');
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
        isResume ? payload.lastCompletedNodeId : undefined,
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
        job.execution_id,
        job.user_id,
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
