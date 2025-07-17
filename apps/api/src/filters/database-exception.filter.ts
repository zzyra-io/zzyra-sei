import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Response } from "express";
import { DatabaseError } from "@zyra/database";

@Catch(DatabaseError)
export class DatabaseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger("DatabaseExceptionFilter");

  catch(exception: DatabaseError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    // Log the error with context
    this.logger.error(
      `Database error in ${request.method} ${request.url}: ${exception.message}`,
      {
        code: exception.code,
        operation: exception.operation,
        details: exception.details,
        stack: exception.stack,
        userId: request.user?.id,
        requestId: request.id,
      }
    );

    // Map database error codes to HTTP status codes
    const httpStatus = this.mapDatabaseErrorToHttpStatus(exception.code);

    // Create user-friendly error response
    const errorResponse = {
      statusCode: httpStatus,
      error: this.getErrorType(exception.code),
      message: this.getUserFriendlyMessage(exception.code, exception.message),
      timestamp: new Date().toISOString(),
      path: request.url,
      operation: exception.operation,
      ...(process.env.NODE_ENV === "development" && {
        debug: {
          code: exception.code,
          originalMessage: exception.message,
          details: exception.details,
        },
      }),
    };

    response.status(httpStatus).json(errorResponse);
  }

  private mapDatabaseErrorToHttpStatus(errorCode: string): HttpStatus {
    switch (errorCode) {
      case "CONNECTION_ERROR":
      case "CONNECTION_TIMEOUT":
      case "CONNECTION_CLOSED":
      case "DATABASE_NOT_FOUND":
        return HttpStatus.SERVICE_UNAVAILABLE;

      case "OPERATION_TIMEOUT":
        return HttpStatus.REQUEST_TIMEOUT;

      case "UNIQUE_CONSTRAINT_VIOLATION":
        return HttpStatus.CONFLICT;

      case "FOREIGN_KEY_CONSTRAINT_VIOLATION":
        return HttpStatus.BAD_REQUEST;

      case "RECORD_NOT_FOUND":
        return HttpStatus.NOT_FOUND;

      case "MAX_RETRIES_EXCEEDED":
        return HttpStatus.SERVICE_UNAVAILABLE;

      default:
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
  }

  private getErrorType(errorCode: string): string {
    switch (errorCode) {
      case "CONNECTION_ERROR":
      case "CONNECTION_TIMEOUT":
      case "CONNECTION_CLOSED":
      case "DATABASE_NOT_FOUND":
      case "MAX_RETRIES_EXCEEDED":
        return "Service Unavailable";

      case "OPERATION_TIMEOUT":
        return "Request Timeout";

      case "UNIQUE_CONSTRAINT_VIOLATION":
        return "Conflict";

      case "FOREIGN_KEY_CONSTRAINT_VIOLATION":
        return "Bad Request";

      case "RECORD_NOT_FOUND":
        return "Not Found";

      default:
        return "Internal Server Error";
    }
  }

  private getUserFriendlyMessage(
    errorCode: string,
    originalMessage: string
  ): string {
    switch (errorCode) {
      case "CONNECTION_ERROR":
      case "CONNECTION_TIMEOUT":
      case "CONNECTION_CLOSED":
        return "Database is temporarily unavailable. Please try again later.";

      case "DATABASE_NOT_FOUND":
        return "Database configuration error. Please contact support.";

      case "OPERATION_TIMEOUT":
        return "Operation took too long to complete. Please try again.";

      case "UNIQUE_CONSTRAINT_VIOLATION":
        return "A record with this information already exists.";

      case "FOREIGN_KEY_CONSTRAINT_VIOLATION":
        return "Cannot perform this operation due to data dependencies.";

      case "RECORD_NOT_FOUND":
        return "The requested resource was not found.";

      case "MAX_RETRIES_EXCEEDED":
        return "Service is temporarily unavailable due to connection issues.";

      default:
        return "An unexpected database error occurred. Please try again later.";
    }
  }
}
