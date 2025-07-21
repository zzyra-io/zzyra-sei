import { Injectable, Logger } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { DatabaseService } from './database.service';

export interface ExecutionStatus {
  executionId: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  currentNodeId?: string;
  progress: {
    totalNodes: number;
    completedNodes: number;
    failedNodes: number;
    currentNode?: {
      id: string;
      type: string;
      label: string;
      status: 'running' | 'completed' | 'failed';
      startTime?: Date;
      endTime?: Date;
      duration?: number;
    };
  };
  startTime: Date;
  endTime?: Date;
  error?: string;
  results?: Record<string, any>;
  logs: ExecutionLog[];
}

export interface ExecutionLog {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  nodeId?: string;
  metadata?: Record<string, any>;
}

export interface NodeExecutionUpdate {
  executionId: string;
  nodeId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  output?: any;
  error?: string;
  duration?: number;
  progress?: number; // 0-100
  nodeType?: string;
  nodeLabel?: string;
  startTime?: Date;
  endTime?: Date;
}

export interface EdgeFlowUpdate {
  executionId: string;
  edgeId: string;
  sourceNodeId: string;
  targetNodeId: string;
  status: 'flowing' | 'completed';
  data?: any;
  timestamp: Date;
}

export interface ExecutionMetrics {
  executionId: string;
  memoryUsage: number; // in MB
  cpuUsage: number; // percentage
  networkRequests: number;
  totalDuration: number; // in ms
  nodeMetrics: Record<string, {
    duration: number;
    memoryDelta: number;
    outputSize: number;
  }>;
}

@Injectable()
@WebSocketGateway({
  namespace: '/execution',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class ExecutionMonitorService {
  private readonly logger = new Logger(ExecutionMonitorService.name);
  
  @WebSocketServer()
  server: Server;

  // Track active executions
  private activeExecutions = new Map<string, ExecutionStatus>();
  
  // Track client subscriptions
  private clientSubscriptions = new Map<string, Set<string>>(); // clientId -> executionIds
  
  // Track workflow definitions for edge animations
  private workflowDefinitions = new Map<string, { nodes: any[], edges: any[] }>();
  
  // Track execution metrics
  private executionMetrics = new Map<string, ExecutionMetrics>();

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Client subscribes to execution updates
   */
  @SubscribeMessage('subscribe_execution')
  async subscribeToExecution(
    @MessageBody() data: { executionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { executionId } = data;
    
    try {
      // Validate execution exists
      const execution = await this.databaseService.executions.findById(executionId);
      if (!execution) {
        client.emit('error', { message: `Execution ${executionId} not found` });
        return;
      }

      // Add client subscription
      if (!this.clientSubscriptions.has(client.id)) {
        this.clientSubscriptions.set(client.id, new Set());
      }
      this.clientSubscriptions.get(client.id)!.add(executionId);

      // Join client to execution room
      client.join(`execution:${executionId}`);

      // Send current status if available
      const currentStatus = this.activeExecutions.get(executionId);
      if (currentStatus) {
        client.emit('execution_status', currentStatus);
      } else {
        // Fetch and send current status from database
        const status = await this.getExecutionStatus(executionId);
        client.emit('execution_status', status);
      }

      this.logger.log(`Client ${client.id} subscribed to execution ${executionId}`);
    } catch (error) {
      this.logger.error(`Failed to subscribe client to execution ${executionId}:`, error);
      client.emit('error', { message: 'Failed to subscribe to execution' });
    }
  }

  /**
   * Client unsubscribes from execution updates
   */
  @SubscribeMessage('unsubscribe_execution')
  unsubscribeFromExecution(
    @MessageBody() data: { executionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { executionId } = data;
    
    // Remove from subscriptions
    this.clientSubscriptions.get(client.id)?.delete(executionId);
    
    // Leave execution room
    client.leave(`execution:${executionId}`);
    
    this.logger.log(`Client ${client.id} unsubscribed from execution ${executionId}`);
  }

  /**
   * Handle client disconnect
   */
  handleDisconnect(client: Socket) {
    // Clean up subscriptions
    this.clientSubscriptions.delete(client.id);
    this.logger.log(`Client ${client.id} disconnected`);
  }

  /**
   * Start tracking an execution
   */
  async startExecution(executionId: string, workflowId: string, totalNodes: number, workflowDefinition?: { nodes: any[], edges: any[] }) {
    const status: ExecutionStatus = {
      executionId,
      workflowId,
      status: 'running',
      progress: {
        totalNodes,
        completedNodes: 0,
        failedNodes: 0,
      },
      startTime: new Date(),
      logs: [],
    };

    this.activeExecutions.set(executionId, status);
    
    // Store workflow definition for edge animations
    if (workflowDefinition) {
      this.workflowDefinitions.set(executionId, workflowDefinition);
    }
    
    // Initialize execution metrics
    const metrics: ExecutionMetrics = {
      executionId,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // Convert to MB
      cpuUsage: 0,
      networkRequests: 0,
      totalDuration: 0,
      nodeMetrics: {},
    };
    this.executionMetrics.set(executionId, metrics);
    
    // Broadcast to subscribers
    this.server.to(`execution:${executionId}`).emit('execution_started', status);
    
    // Log to database
    await this.logExecutionEvent(executionId, 'info', 'Execution started', {
      workflowId,
      totalNodes,
    });

    this.logger.log(`Started tracking execution ${executionId}`);
  }

  /**
   * Update node execution status
   */
  async updateNodeExecution(update: NodeExecutionUpdate) {
    const { executionId, nodeId, status, output, error, duration, nodeType, nodeLabel } = update;
    
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      this.logger.warn(`Execution ${executionId} not found for node update`);
      return;
    }

    // Update metrics for the node
    const metrics = this.executionMetrics.get(executionId);
    if (metrics && duration) {
      metrics.nodeMetrics[nodeId] = {
        duration,
        memoryDelta: 0, // Will be calculated later
        outputSize: output ? JSON.stringify(output).length : 0,
      };
    }

    // Update current node
    if (status === 'running') {
      execution.currentNodeId = nodeId;
      execution.progress.currentNode = {
        id: nodeId,
        type: nodeType || 'unknown',
        label: nodeLabel || nodeId,
        status,
        startTime: new Date(),
      };
    } else if (status === 'completed') {
      execution.progress.completedNodes++;
      if (execution.progress.currentNode?.id === nodeId) {
        execution.progress.currentNode.status = status;
        execution.progress.currentNode.endTime = new Date();
        execution.progress.currentNode.duration = duration;
      }
      
      // Trigger edge animations for completed nodes
      await this.triggerEdgeFlowAnimations(executionId, nodeId, output);
    } else if (status === 'failed') {
      execution.progress.failedNodes++;
      if (execution.progress.currentNode?.id === nodeId) {
        execution.progress.currentNode.status = status;
        execution.progress.currentNode.endTime = new Date();
        execution.progress.currentNode.duration = duration;
      }
    }

    // Broadcast detailed update
    this.server.to(`execution:${executionId}`).emit('node_execution_update', {
      executionId,
      nodeId,
      status,
      output,
      error,
      duration,
      nodeType,
      nodeLabel,
      startTime: update.startTime,
      endTime: update.endTime,
      progress: (execution.progress.completedNodes / execution.progress.totalNodes) * 100,
    });

    // Log to database and in-memory
    const logLevel = status === 'failed' ? 'error' : 'info';
    const message = status === 'failed' 
      ? `Node ${nodeId} failed: ${error}` 
      : `Node ${nodeId} ${status}`;
    
    await this.logExecutionEvent(executionId, logLevel, message, {
      nodeId,
      status,
      output,
      error,
      duration,
      nodeType,
      nodeLabel,
    });

    this.logger.log(`Node ${nodeId} in execution ${executionId}: ${status}`);
  }

  /**
   * Trigger edge flow animations when a node completes
   */
  private async triggerEdgeFlowAnimations(executionId: string, sourceNodeId: string, output: any) {
    const workflowDef = this.workflowDefinitions.get(executionId);
    if (!workflowDef) return;

    // Find edges that originate from this node
    const outgoingEdges = workflowDef.edges.filter(edge => edge.source === sourceNodeId);
    
    for (const edge of outgoingEdges) {
      const edgeFlowUpdate: EdgeFlowUpdate = {
        executionId,
        edgeId: edge.id,
        sourceNodeId: edge.source,
        targetNodeId: edge.target,
        status: 'flowing',
        data: output,
        timestamp: new Date(),
      };

      // Broadcast edge flow animation
      this.server.to(`execution:${executionId}`).emit('edge_flow_update', edgeFlowUpdate);
      
      // Complete the edge flow after a short delay to show animation
      setTimeout(() => {
        this.server.to(`execution:${executionId}`).emit('edge_flow_update', {
          ...edgeFlowUpdate,
          status: 'completed',
          timestamp: new Date(),
        });
      }, 1000); // 1 second animation duration
    }
  }

  /**
   * Complete execution
   */
  async completeExecution(executionId: string, results?: Record<string, any>) {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      this.logger.warn(`Execution ${executionId} not found for completion`);
      return;
    }

    execution.status = 'completed';
    execution.endTime = new Date();
    execution.results = results;

    // Broadcast completion
    this.server.to(`execution:${executionId}`).emit('execution_completed', {
      executionId,
      results,
      duration: execution.endTime.getTime() - execution.startTime.getTime(),
      totalNodes: execution.progress.totalNodes,
      completedNodes: execution.progress.completedNodes,
      failedNodes: execution.progress.failedNodes,
    });

    // Log completion
    await this.logExecutionEvent(executionId, 'info', 'Execution completed', {
      results,
      duration: execution.endTime.getTime() - execution.startTime.getTime(),
    });

    // Broadcast final metrics
    const metrics = this.executionMetrics.get(executionId);
    if (metrics) {
      metrics.totalDuration = execution.endTime.getTime() - execution.startTime.getTime();
      this.server.to(`execution:${executionId}`).emit('execution_metrics', metrics);
    }

    // Clean up after 5 minutes
    setTimeout(() => {
      this.activeExecutions.delete(executionId);
      this.workflowDefinitions.delete(executionId);
      this.executionMetrics.delete(executionId);
    }, 5 * 60 * 1000);

    this.logger.log(`Execution ${executionId} completed`);
  }

  /**
   * Fail execution
   */
  async failExecution(executionId: string, error: string) {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      this.logger.warn(`Execution ${executionId} not found for failure`);
      return;
    }

    execution.status = 'failed';
    execution.endTime = new Date();
    execution.error = error;

    // Broadcast failure
    this.server.to(`execution:${executionId}`).emit('execution_failed', {
      executionId,
      error,
      duration: execution.endTime.getTime() - execution.startTime.getTime(),
      totalNodes: execution.progress.totalNodes,
      completedNodes: execution.progress.completedNodes,
      failedNodes: execution.progress.failedNodes,
    });

    // Log failure
    await this.logExecutionEvent(executionId, 'error', `Execution failed: ${error}`, {
      error,
      duration: execution.endTime.getTime() - execution.startTime.getTime(),
    });

    // Broadcast final metrics even on failure
    const metrics = this.executionMetrics.get(executionId);
    if (metrics) {
      metrics.totalDuration = execution.endTime.getTime() - execution.startTime.getTime();
      this.server.to(`execution:${executionId}`).emit('execution_metrics', metrics);
    }

    // Clean up after 5 minutes
    setTimeout(() => {
      this.activeExecutions.delete(executionId);
      this.workflowDefinitions.delete(executionId);
      this.executionMetrics.delete(executionId);
    }, 5 * 60 * 1000);

    this.logger.error(`Execution ${executionId} failed: ${error}`);
  }

  /**
   * Pause execution
   */
  async pauseExecution(executionId: string, reason: string) {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      this.logger.warn(`Execution ${executionId} not found for pausing`);
      return;
    }

    execution.status = 'paused';

    // Broadcast pause
    this.server.to(`execution:${executionId}`).emit('execution_paused', {
      executionId,
      reason,
    });

    // Log pause
    await this.logExecutionEvent(executionId, 'info', `Execution paused: ${reason}`, {
      reason,
    });

    this.logger.log(`Execution ${executionId} paused: ${reason}`);
  }

  /**
   * Resume execution
   */
  async resumeExecution(executionId: string) {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      this.logger.warn(`Execution ${executionId} not found for resuming`);
      return;
    }

    execution.status = 'running';

    // Broadcast resume
    this.server.to(`execution:${executionId}`).emit('execution_resumed', {
      executionId,
    });

    // Log resume
    await this.logExecutionEvent(executionId, 'info', 'Execution resumed');

    this.logger.log(`Execution ${executionId} resumed`);
  }

  /**
   * Get current execution status
   */
  async getExecutionStatus(executionId: string): Promise<ExecutionStatus | null> {
    // First check in-memory
    const activeExecution = this.activeExecutions.get(executionId);
    if (activeExecution) {
      return activeExecution;
    }

    // Fetch from database
    try {
      const execution = await this.databaseService.executions.findById(executionId);
      if (!execution) {
        return null;
      }

      // Get node executions
      const nodeExecutions = await this.databaseService.prisma.nodeExecution.findMany({
        where: { executionId },
        orderBy: { startedAt: 'asc' },
      });

      // Get logs
      const logs = await this.databaseService.prisma.executionLog.findMany({
        where: { executionId },
        orderBy: { timestamp: 'asc' },
        take: 100, // Limit to recent logs
      });

      const status: ExecutionStatus = {
        executionId,
        workflowId: execution.workflowId,
        status: execution.status as any,
        progress: {
          totalNodes: nodeExecutions.length,
          completedNodes: nodeExecutions.filter(n => n.status === 'completed').length,
          failedNodes: nodeExecutions.filter(n => n.status === 'failed').length,
        },
        startTime: execution.startedAt,
        endTime: execution.finishedAt || undefined,
        error: execution.error || undefined,
        results: execution.output as any,
        logs: logs.map(log => ({
          id: log.id,
          timestamp: log.timestamp,
          level: log.level as any,
          message: log.message,
          nodeId: (log.metadata as any)?.nodeId || undefined,
          metadata: log.metadata as any,
        })),
      };

      return status;
    } catch (error) {
      this.logger.error(`Failed to get execution status for ${executionId}:`, error);
      return null;
    }
  }

  /**
   * Get all active executions
   */
  getActiveExecutions(): ExecutionStatus[] {
    return Array.from(this.activeExecutions.values());
  }

  /**
   * Log execution event
   */
  private async logExecutionEvent(
    executionId: string,
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    metadata?: Record<string, any>
  ) {
    try {
      // Add to in-memory logs
      const execution = this.activeExecutions.get(executionId);
      if (execution) {
        const log: ExecutionLog = {
          id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(),
          level,
          message,
          nodeId: metadata?.nodeId,
          metadata,
        };
        execution.logs.push(log);

        // Keep only last 50 logs in memory
        if (execution.logs.length > 50) {
          execution.logs = execution.logs.slice(-50);
        }

        // Broadcast log to subscribers
        this.server.to(`execution:${executionId}`).emit('execution_log', log);
      }

      // Save to database - map to proper enum values (lowercase for Prisma LogLevel enum)
      const dbLevel = level === 'info' ? 'info' : 
                     level === 'warn' ? 'warn' :
                     level === 'error' ? 'error' : 'info'; // default to 'info' instead of 'DEBUG'
      
      await this.databaseService.prisma.executionLog.create({
        data: {
          executionId,
          level: dbLevel,
          message,
          timestamp: new Date(),
          metadata: metadata || {},
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log execution event:`, error);
    }
  }

  /**
   * Get real-time execution metrics
   */
  getExecutionMetricsById(executionId: string): ExecutionMetrics | null {
    return this.executionMetrics.get(executionId) || null;
  }

  /**
   * Update execution metrics (called periodically during execution)
   */
  updateExecutionMetrics(executionId: string, updates: Partial<ExecutionMetrics>) {
    const metrics = this.executionMetrics.get(executionId);
    if (metrics) {
      Object.assign(metrics, updates);
      // Broadcast updated metrics to subscribers
      this.server.to(`execution:${executionId}`).emit('execution_metrics_update', metrics);
    }
  }

  /**
   * Get execution metrics for dashboard
   */
  async getDashboardMetrics(timeRange: 'hour' | 'day' | 'week' = 'day') {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case 'hour':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
    }

    try {
      const executions = await this.databaseService.prisma.workflowExecution.findMany({
        where: {
          createdAt: {
            gte: startDate,
          },
        },
        select: {
          id: true,
          status: true,
          startedAt: true,
          finishedAt: true,
          createdAt: true,
        },
      });

      const metrics = {
        total: executions.length,
        completed: executions.filter(e => e.status === 'completed').length,
        failed: executions.filter(e => e.status === 'failed').length,
        running: executions.filter(e => e.status === 'running').length,
        paused: executions.filter(e => e.status === 'paused').length,
        averageDuration: 0,
        successRate: 0,
      };

      // Calculate average duration for completed executions
      const completedWithDuration = executions.filter(
        e => e.status === 'completed' && e.startedAt && e.finishedAt
      );
      
      if (completedWithDuration.length > 0) {
        const totalDuration = completedWithDuration.reduce((sum, e) => {
          return sum + (e.finishedAt!.getTime() - e.startedAt!.getTime());
        }, 0);
        metrics.averageDuration = totalDuration / completedWithDuration.length;
      }

      // Calculate success rate
      const finishedExecutions = metrics.completed + metrics.failed;
      if (finishedExecutions > 0) {
        metrics.successRate = (metrics.completed / finishedExecutions) * 100;
      }

      return metrics;
    } catch (error) {
      this.logger.error('Failed to get execution metrics:', error);
      throw error;
    }
  }
}