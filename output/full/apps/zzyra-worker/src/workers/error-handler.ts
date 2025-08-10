import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../services/database.service';
import { ExecutionEventsService } from '../lib/services/execution-events.service';

@Injectable()
export class ErrorHandler {
  private readonly logger = new Logger(ErrorHandler.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async handleJobFailure(
    error: Error,
    executionId: string,
    userId: string,
    nodeId?: string,
  ): Promise<void> {
    const errorType = this.categorizeError(error);
    const details = {
      type: errorType,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    };

    this.logger.error(
      `[executionId=${executionId}] Job failed: ${error.message}`,
      { userId, details },
    );

    // Update execution status using DatabaseService
    await this.databaseService.executions.updateStatus(
      executionId,
      'failed',
      error.message,
    );

    // Add detailed error log
    await this.databaseService.executions.addLog(
      executionId,
      'error',
      `Job failed: ${error.message}`,
      {
        error_type: errorType,
        error_details: details,
        node_id: nodeId || 'system',
        user_id: userId,
      },
    );

    ExecutionEventsService.emitWorkflowFailed({
      executionId,
      userId,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }

  private categorizeError(error: Error): string {
    if (error.message.includes('quota')) return 'QuotaExceeded';
    if (error.message.includes('permission')) return 'Unauthorized';
    if (error.message.includes('not found')) return 'NotFound';
    if (error.message.includes('validation')) return 'ValidationError';
    return 'UnknownError';
  }
}
