import { EventEmitter } from 'events';

/**
 * Singleton EventEmitter for workflow execution events (SSE, WebSocket, etc.)
 * Usage: import and emit/subscribe to events as needed.
 */
export class ExecutionEventsService {
  private static emitter: EventEmitter = new EventEmitter();

  static emitNodeUpdate(payload: {
    executionId: string;
    nodeId: string;
    status: string;
    output?: any;
    error?: string | null;
    updatedAt?: string;
  }) {
    this.emitter.emit('node-update', payload);
  }

  static emitWorkflowCompleted(payload: {
    executionId: string;
    userId: string;
    timestamp: string;
  }) {
    this.emitter.emit('workflow-completed', payload);
  }

  static emitWorkflowFailed(payload: {
    executionId: string;
    userId: string;
    error: string;
    timestamp: string;
  }) {
    this.emitter.emit('workflow-failed', payload);
  }

  static emitWorkflowStarted(payload: { executionId: string; userId?: string; timestamp: string }) {
    this.emitter.emit('workflow-started', payload);
  }

  static onNodeUpdate(listener: (payload: any) => void) {
    this.emitter.on('node-update', listener);
  }

  static onWorkflowCompleted(listener: (payload: any) => void) {
    this.emitter.on('workflow-completed', listener);
  }

  static onWorkflowFailed(listener: (payload: any) => void) {
    this.emitter.on('workflow-failed', listener);
  }

  static onWorkflowStarted(listener: (payload: any) => void) {
    this.emitter.on('workflow-started', listener);
  }
}
