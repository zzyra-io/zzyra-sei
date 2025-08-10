import { ExceptionFilter, Catch, ArgumentsHost, Logger } from '@nestjs/common';
import { DatabaseError } from '@zzyra/database';

@Catch(DatabaseError)
export class DatabaseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('WorkerDatabaseExceptionFilter');

  catch(exception: DatabaseError, host: ArgumentsHost) {
    const type = host.getType();

    // Log the error with enhanced context
    this.logger.error(`Worker database error: ${exception.message}`, {
      code: exception.code,
      operation: exception.operation,
      details: exception.details,
      contextType: type,
      stack: exception.stack,
    });

    // Handle connection-related errors with retry logic
    if (this.isConnectionError(exception.code)) {
      this.handleConnectionError(exception);
    }

    // For worker processes, we typically don't return HTTP responses
    // Instead, we handle the error by logging and potentially triggering retries
    this.handleWorkerError(exception);
  }

  private isConnectionError(errorCode: string): boolean {
    return [
      'CONNECTION_ERROR',
      'CONNECTION_TIMEOUT',
      'CONNECTION_CLOSED',
      'DATABASE_NOT_FOUND',
      'MAX_RETRIES_EXCEEDED',
    ].includes(errorCode);
  }

  private handleConnectionError(exception: DatabaseError): void {
    this.logger.warn(
      `Database connection issue detected: ${exception.code}. Worker may need to retry operations.`,
      {
        code: exception.code,
        operation: exception.operation,
        details: exception.details,
      },
    );

    // Could implement circuit breaker logic here
    // Or trigger database reconnection attempts
  }

  private handleWorkerError(exception: DatabaseError): void {
    // Log structured error for monitoring and alerting
    const errorContext = {
      timestamp: new Date().toISOString(),
      errorCode: exception.code,
      operation: exception.operation,
      message: exception.message,
      details: exception.details,
      severity: this.getErrorSeverity(exception.code),
    };

    // Log for monitoring systems
    this.logger.error('Worker database operation failed', errorContext);

    // Could trigger alerts for critical errors
    if (errorContext.severity === 'critical') {
      this.triggerAlert(errorContext);
    }
  }

  private getErrorSeverity(
    errorCode: string,
  ): 'low' | 'medium' | 'high' | 'critical' {
    switch (errorCode) {
      case 'CONNECTION_ERROR':
      case 'CONNECTION_TIMEOUT':
      case 'CONNECTION_CLOSED':
      case 'DATABASE_NOT_FOUND':
      case 'MAX_RETRIES_EXCEEDED':
        return 'critical';

      case 'OPERATION_TIMEOUT':
        return 'high';

      case 'UNIQUE_CONSTRAINT_VIOLATION':
      case 'FOREIGN_KEY_CONSTRAINT_VIOLATION':
        return 'medium';

      case 'RECORD_NOT_FOUND':
        return 'low';

      default:
        return 'medium';
    }
  }

  private triggerAlert(errorContext: any): void {
    // Implementation would integrate with alerting system
    // For now, just log at error level for monitoring pickup
    this.logger.error(
      'CRITICAL DATABASE ERROR - ALERT TRIGGERED',
      errorContext,
    );

    // Could integrate with:
    // - Slack notifications
    // - PagerDuty
    // - Email alerts
    // - Monitoring dashboards
  }
}
