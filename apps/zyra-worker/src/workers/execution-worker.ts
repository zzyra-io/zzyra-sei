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
import { createServiceClient } from '@/lib/supabase/serviceClient';

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
      const supabase = createServiceClient();
      const workerId = `worker-${process.pid}-${Math.random().toString(36).substring(2, 10)}`;
      this.logger.log(`Worker ${workerId} looking for pending executions...`);

      const { data: pendingExecutions, error } = await supabase
        .from('workflow_executions')
        .select('id, workflow_id, triggered_by, status')
        .eq('status', 'pending')
        .limit(batch.length || 1);

      if (error) {
        this.logger.error(
          `Failed to fetch pending executions: ${error.message}`,
        );
        throw new Error(`Failed to fetch pending executions: ${error.message}`);
      }

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

        // Try with a more resilient update that doesn't depend on retry_count
        const { error: updateError } = await supabase
          .from('workflow_executions')
          .update({
            status: 'running',
            locked_by: workerId,
            started_at: new Date().toISOString(),
            user_id: execution.triggered_by, // Set user_id from triggered_by
            // Don't include retry_count in the update
          })
          .eq('id', execution.id)
          .eq('status', 'pending');

        if (updateError) {
          this.logger.warn(
            `Failed to claim execution ${execution.id}: ${updateError.message}`,
          );
          continue;
        }

        this.logger.log(`Successfully claimed execution ${execution.id}`);
        claimedExecutions.push(execution.id);
        await this.executionLogger.logExecutionEvent(supabase, execution.id, {
          level: 'info',
          message: `Worker ${workerId} claimed execution`,
          node_id: 'system',
          data: { worker_id: workerId },
        });
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
          workflow_id: e.workflow_id,
          user_id: e.triggered_by,
          id: e.id,
          payload: {},
          status: 'processing',
        }));

      for (const job of jobs) {
        this.logger.log(`Processing job for execution ${job.execution_id}...`);
        await this.processJob(job, supabase);
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

  private async processJob(job: any, supabase: any): Promise<void> {
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

      let workflow =
        this.workflowCache.get(workflowId) ||
        (await this.fetchWorkflow(workflowId));
      if (workflow.user_id !== userId)
        throw new Error('User does not have permission');

      let profile =
        this.profileCache.get(userId) ||
        (await this.fetchOrCreateProfile(userId, supabase));
      if (profile.monthly_execution_count >= profile.monthly_execution_quota)
        throw new Error('Monthly execution quota exceeded');

      await supabase
        .from('profiles')
        .update({
          monthly_execution_count: profile.monthly_execution_count + 1,
        })
        .eq('id', userId);
      const { data: execution } = await supabase
        .from('workflow_executions')
        .select('status')
        .eq('id', executionId)
        .single();
      if (execution?.status === 'paused' && !isResume) return;

      await supabase
        .from('workflow_executions')
        .update({
          status: 'running',
          started_at:
            isRetry || isResume ? new Date().toISOString() : undefined,
          user_id: userId,
        })
        .eq('id', executionId);
      await this.executionLogger.logExecutionEvent(supabase, executionId, {
        level: 'info',
        message: isRetry
          ? 'Execution retry started'
          : isResume
            ? 'Execution resumed'
            : 'Execution started by worker',
        node_id: 'system',
      });

      const { nodes, edges } = this.extractNodesAndEdges(workflow);
      const result = await this.workflowExecutor.executeWorkflow(
        nodes,
        edges,
        executionId,
        userId,
        isResume ? payload.lastCompletedNodeId : undefined,
        resumeData,
      );

      await supabase
        .from('workflow_executions')
        .update({
          status: result.status,
          completed_at:
            result.status !== 'paused' ? new Date().toISOString() : null,
          result: result.outputs,
          error: result.error,
        })
        .eq('id', executionId);
      if (result.status !== 'paused')
        await this.executionLogger.logExecutionEvent(supabase, executionId, {
          level: result.status === 'completed' ? 'info' : 'error',
          message:
            result.status === 'completed'
              ? 'Execution completed successfully'
              : `Execution failed: ${result.error}`,
          node_id: 'system',
        });
      await supabase
        .from('execution_queue')
        .update({
          status: result.status === 'paused' ? 'paused' : 'completed',
          updated_at: new Date().toISOString(),
          error: result.error || null,
        })
        .eq('id', job.id);
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

  private async fetchOrCreateProfile(userId: string, supabase: any) {
    const { data, error } = await supabase
      .from('profiles')
      .select('monthly_execution_count, monthly_execution_quota')
      .eq('id', userId);
    if (error) throw new Error(`Failed to fetch profile: ${error.message}`);
    if (!data || data.length === 0) {
      const defaultProfile = {
        id: userId,
        monthly_execution_count: 0,
        monthly_execution_quota: 100,
        created_at: new Date().toISOString(),
      };
      const { error: insertError } = await supabase
        .from('profiles')
        .insert(defaultProfile);
      if (insertError)
        throw new Error(`Failed to create profile: ${insertError.message}`);
      this.profileCache.set(userId, defaultProfile);
      return defaultProfile;
    }
    this.profileCache.set(userId, data[0]);
    return data[0];
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
