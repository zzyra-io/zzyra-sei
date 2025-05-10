import { Injectable, Logger } from '@nestjs/common';
import { createServiceClient } from '../lib/supabase/serviceClient';
import { ExecutionEventsService } from '../lib/services/execution-events.service';

@Injectable()
export class ErrorHandler {
  private readonly logger = new Logger(ErrorHandler.name);

  async handleJobFailure(
    error: Error,
    executionId: string,
    userId: string,
    nodeId?: string,
  ): Promise<void> {
    const supabase = createServiceClient();
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
    await supabase
      .from('workflow_executions')
      .update({
        status: 'failed',
        error: error.message,
        error_details: details,
        completed_at: new Date().toISOString(),
      })
      .eq('id', executionId);

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
