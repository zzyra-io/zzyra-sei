import {
  Global,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { AmqpConnectionManager, ChannelWrapper } from 'amqp-connection-manager';
import { trace } from '@opentelemetry/api';
import { LRUCache } from 'lru-cache';
import { WorkflowService } from '../lib/services/workflow-service';
import { AMQP_CONNECTION, EXECUTION_DLQ, EXECUTION_QUEUE } from '../config';
import { WorkflowExecutor } from './workflow-executor';
import { ExecutionLogger } from './execution-logger';
import { ErrorHandler } from './error-handler';
import { DatabaseService } from '../services/database.service';

@Global()
@Injectable()
export class ExecutionWorker implements OnModuleInit {
  private readonly logger = new Logger(ExecutionWorker.name);
  private channelWrapper: ChannelWrapper;
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
    @Inject(AMQP_CONNECTION) private readonly connection: AmqpConnectionManager,
    @Inject('QUEUE_NAMES') private readonly queueOptions: any[],
    private readonly workflowService: WorkflowService,
    private readonly workflowExecutor: WorkflowExecutor,
    private readonly executionLogger: ExecutionLogger,
    private readonly errorHandler: ErrorHandler,
    private readonly databaseService: DatabaseService,
  ) {}

  async onModuleInit() {
    try {
      this.logger.log('Initializing ExecutionWorker...');

      // Initialize RabbitMQ channel
      this.channelWrapper = this.connection.createChannel({
        json: true,
        setup: async (channel) => {
          try {
            for (const queue of this.queueOptions) {
              await channel.assertQueue(queue.name, {
                durable: queue.durable,
                ...queue.options,
              });
              this.logger.log(
                `Queue ${queue.name} asserted with options: ${JSON.stringify({ durable: queue.durable, ...queue.options })}`,
              );
            }

            channel.prefetch(10);

            // Set up message consumers
            await this.setupMessageConsumers(channel);

            this.isInitialized = true;
            this.logger.log('ExecutionWorker successfully initialized');
          } catch (error) {
            this.logger.error('Error during channel setup:', error);
            throw error;
          }
        },
      });

      // Set up error handlers
      this.setupErrorHandlers();
    } catch (error) {
      this.logger.error('Failed to initialize ExecutionWorker:', error);
      throw error;
    }
  }

  private async setupMessageConsumers(channel: any) {
    // Main queue consumer
    await channel.consume(EXECUTION_QUEUE, async (msg) => {
      if (!msg) return;

      const span = this.tracer.startSpan('process_message');
      try {
        if (!this.isInitialized) {
          this.logger.warn('Worker not fully initialized, requeuing message');
          channel.nack(msg, false, true);
          return;
        }

        const batch = [JSON.parse(msg.content.toString())];
        await this.processItem(batch);
        channel.ack(msg);
      } catch (err) {
        this.logger.error(
          `Message processing failed: ${err instanceof Error ? err.message : err}`,
          err instanceof Error ? err.stack : undefined,
        );
        span.recordException(err as Error);
        channel.nack(msg, false, false);
      } finally {
        span.end();
      }
    });

    // DLQ consumer
    await channel.consume(EXECUTION_DLQ, (msg) => {
      if (msg) {
        this.logger.error(`Message moved to DLQ: ${msg.content.toString()}`);
        channel.ack(msg);
      }
    });
  }

  private setupErrorHandlers() {
    this.channelWrapper.on('error', (err) => {
      this.logger.error('Channel error:', err);
      this.isInitialized = false;
    });

    this.connection.on('error', (err) => {
      this.logger.error('Connection error:', err);
      this.isInitialized = false;
    });

    this.connection.on('connect', () => {
      this.logger.log('RabbitMQ connection established');
    });

    this.connection.on('disconnect', () => {
      this.logger.warn('RabbitMQ connection lost');
      this.isInitialized = false;
    });
  }

  private async processItem(batch: any[]): Promise<void> {
    const span = this.tracer.startSpan('processItem');
    try {
      const workerId = `worker-${process.pid}-${Math.random().toString(36).substring(2, 10)}`;
      this.logger.log(`Worker ${workerId} looking for pending executions...`);

      // Use DatabaseService instead of Supabase
      const pendingExecutions =
        await this.databaseService.getPendingExecutionsForWorker(
          batch.length || 1,
        );

      if (!pendingExecutions || pendingExecutions.length === 0) {
        this.logger.debug('No pending executions found');
        return;
      }

      this.logger.log(
        `Found ${pendingExecutions.length} pending executions: ${pendingExecutions.map((e) => e.id).join(', ')}`,
      );

      const claimedExecutions: string[] = [];
      for (const execution of pendingExecutions) {
        this.logger.log(`Attempting to claim execution ${execution.id}...`);

        try {
          // Use DatabaseService to lock execution
          await this.databaseService.lockExecutionForWorker(
            execution.id,
            workerId,
          );

          this.logger.log(`Successfully claimed execution ${execution.id}`);
          claimedExecutions.push(execution.id);

          // Log the claim
          await this.databaseService.executions.addLog(
            execution.id,
            'info',
            `Worker ${workerId} claimed execution`,
            { worker_id: workerId },
          );
        } catch (error) {
          this.logger.warn(
            `Failed to claim execution ${execution.id}: ${error}`,
          );
          continue;
        }
      }

      if (claimedExecutions.length === 0) {
        this.logger.warn('No executions were successfully claimed');
        return;
      }

      this.logger.log(
        `Successfully claimed ${claimedExecutions.length} executions: ${claimedExecutions.join(', ')}`,
      );

      const jobs = pendingExecutions
        .filter((e) => claimedExecutions.includes(e.id))
        .map((e) => ({
          execution_id: e.id,
          workflow_id: e.workflowId,
          user_id: e.userId,
          id: e.id,
          payload: {},
          status: 'processing',
        }));

      for (const job of jobs) {
        this.logger.log(`Processing job for execution ${job.execution_id}...`);
        await this.processJob(job);
      }
    } catch (error) {
      this.logger.error(
        `Error in processItem: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      span.end();
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
        result.outputs,
        result.error,
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
