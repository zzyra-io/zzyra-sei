import { ExceptionFilter, Catch, ArgumentsHost, Logger } from '@nestjs/common';
import { Prisma } from '@zyra/database';

@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientUnknownRequestError,
  Prisma.PrismaClientValidationError,
)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('WorkerPrismaExceptionFilter');

  catch(exception: any, host: ArgumentsHost) {
    const type = host.getType();

    // Log the error with context
    this.logger.error(`Worker Prisma error: ${exception.message}`, {
      code: exception.code,
      meta: exception.meta,
      contextType: type,
      stack: exception.stack,
    });

    // Handle different types of Prisma errors for worker context
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      this.handleKnownRequestError(exception);
    } else if (exception instanceof Prisma.PrismaClientUnknownRequestError) {
      this.handleUnknownRequestError(exception);
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      this.handleValidationError(exception);
    } else {
      this.handleGenericError(exception);
    }
  }

  private handleKnownRequestError(
    exception: Prisma.PrismaClientKnownRequestError,
  ) {
    const severity = this.getErrorSeverity(exception.code);

    const errorContext = {
      timestamp: new Date().toISOString(),
      type: 'PrismaKnownRequestError',
      code: exception.code,
      message: this.getPrismaErrorMessage(exception.code),
      meta: exception.meta,
      severity,
    };

    this.logger.error(
      `Worker Prisma known error: ${errorContext.message}`,
      errorContext,
    );

    // Handle specific error codes that might need special worker handling
    switch (exception.code) {
      case 'P2002':
        this.logger.warn('Unique constraint violation in worker operation', {
          fields: exception.meta?.target,
          code: exception.code,
        });
        break;
      case 'P2025':
        this.logger.warn('Record not found in worker operation', {
          cause: exception.meta?.cause,
          code: exception.code,
        });
        break;
      case 'P1001':
      case 'P1002':
      case 'P1017':
        // Connection errors - critical for worker operations
        this.logger.error('Database connection error in worker', errorContext);
        this.triggerConnectionAlert(errorContext);
        break;
    }
  }

  private handleUnknownRequestError(
    exception: Prisma.PrismaClientUnknownRequestError,
  ) {
    const errorContext = {
      timestamp: new Date().toISOString(),
      type: 'PrismaUnknownRequestError',
      message: exception.message,
      severity: 'high' as const,
    };

    this.logger.error('Worker Prisma unknown error', errorContext);
  }

  private handleValidationError(exception: Prisma.PrismaClientValidationError) {
    const errorContext = {
      timestamp: new Date().toISOString(),
      type: 'PrismaValidationError',
      message: 'Invalid data provided to database operation',
      originalMessage: exception.message,
      severity: 'medium' as const,
    };

    this.logger.error('Worker Prisma validation error', errorContext);
  }

  private handleGenericError(exception: any) {
    const errorContext = {
      timestamp: new Date().toISOString(),
      type: 'GenericPrismaError',
      message: exception.message || 'Unknown Prisma error',
      severity: 'medium' as const,
    };

    this.logger.error('Worker generic Prisma error', errorContext);
  }

  private getErrorSeverity(
    errorCode: string,
  ): 'low' | 'medium' | 'high' | 'critical' {
    switch (errorCode) {
      case 'P1001': // Can't reach database server
      case 'P1002': // Database server connection timeout
      case 'P1017': // Connection lost
        return 'critical';

      case 'P1008': // Operations timeout
      case 'P1011': // Error opening TLS connection
        return 'high';

      case 'P2002': // Unique constraint violation
      case 'P2003': // Foreign key constraint violation
      case 'P2014': // Invalid relation
        return 'medium';

      case 'P2025': // Record not found
      case 'P2001': // Record does not exist
        return 'low';

      default:
        return 'medium';
    }
  }

  private getPrismaErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'P1001':
        return 'Cannot reach database server';
      case 'P1002':
        return 'Database server connection timeout';
      case 'P1017':
        return 'Database connection lost';
      case 'P1008':
        return 'Database operation timeout';
      case 'P2002':
        return 'Unique constraint violation';
      case 'P2003':
        return 'Foreign key constraint violation';
      case 'P2025':
        return 'Record not found for operation';
      case 'P2001':
        return 'Referenced record does not exist';
      case 'P2014':
        return 'Invalid relation in data';
      default:
        return `Prisma error ${errorCode}`;
    }
  }

  private triggerConnectionAlert(errorContext: any): void {
    // Log critical connection error for monitoring systems
    this.logger.error('CRITICAL DATABASE CONNECTION ERROR IN WORKER', {
      ...errorContext,
      alertType: 'DATABASE_CONNECTION_FAILURE',
      component: 'worker',
      action: 'database_operation',
    });

    // In production, this would integrate with alerting systems
    // - Send to monitoring dashboard
    // - Trigger PagerDuty alert
    // - Send Slack notification
    // - Update health check status
  }
}
