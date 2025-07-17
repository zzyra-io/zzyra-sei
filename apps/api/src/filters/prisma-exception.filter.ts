import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Response } from "express";
import { Prisma } from "@zyra/database";

@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientUnknownRequestError,
  Prisma.PrismaClientValidationError
)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger("PrismaExceptionFilter");

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    // Log the error with context
    this.logger.error(
      `Prisma error in ${request.method} ${request.url}: ${exception.message}`,
      {
        code: exception.code,
        meta: exception.meta,
        stack: exception.stack,
        userId: request.user?.id,
        requestId: request.id,
      }
    );

    // Handle different types of Prisma errors
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      this.handleKnownRequestError(exception, response, request);
    } else if (exception instanceof Prisma.PrismaClientUnknownRequestError) {
      this.handleUnknownRequestError(exception, response, request);
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      this.handleValidationError(exception, response, request);
    } else {
      this.handleGenericError(exception, response, request);
    }
  }

  private handleKnownRequestError(
    exception: Prisma.PrismaClientKnownRequestError,
    response: Response,
    request: any
  ) {
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Database operation failed";
    let userMessage = "An error occurred while processing your request";

    switch (exception.code) {
      case "P2002":
        status = HttpStatus.CONFLICT;
        message = "Unique constraint failed";
        userMessage = "A record with this information already exists";
        break;
      case "P2003":
        status = HttpStatus.BAD_REQUEST;
        message = "Foreign key constraint failed";
        userMessage = "Cannot perform this operation due to related data";
        break;
      case "P2025":
        status = HttpStatus.NOT_FOUND;
        message = "Record not found";
        userMessage = "The requested resource was not found";
        break;
      case "P2014":
        status = HttpStatus.BAD_REQUEST;
        message = "Invalid ID relation";
        userMessage = "Invalid reference to related data";
        break;
      case "P2000":
        status = HttpStatus.BAD_REQUEST;
        message = "Value too long for column";
        userMessage = "Input data is too long";
        break;
      case "P2001":
        status = HttpStatus.NOT_FOUND;
        message = "Record does not exist";
        userMessage = "The referenced record does not exist";
        break;
    }

    const errorResponse = {
      statusCode: status,
      error: this.getErrorName(status),
      message: userMessage,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(process.env.NODE_ENV === "development" && {
        debug: {
          code: exception.code,
          originalMessage: exception.message,
          meta: exception.meta,
        },
      }),
    };

    response.status(status).json(errorResponse);
  }

  private handleUnknownRequestError(
    exception: Prisma.PrismaClientUnknownRequestError,
    response: Response,
    request: any
  ) {
    const errorResponse = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: "Internal Server Error",
      message: "An unexpected database error occurred",
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(process.env.NODE_ENV === "development" && {
        debug: {
          originalMessage: exception.message,
        },
      }),
    };

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse);
  }

  private handleValidationError(
    exception: Prisma.PrismaClientValidationError,
    response: Response,
    request: any
  ) {
    const errorResponse = {
      statusCode: HttpStatus.BAD_REQUEST,
      error: "Bad Request",
      message: "Invalid data provided",
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(process.env.NODE_ENV === "development" && {
        debug: {
          originalMessage: exception.message,
        },
      }),
    };

    response.status(HttpStatus.BAD_REQUEST).json(errorResponse);
  }

  private handleGenericError(exception: any, response: Response, request: any) {
    const errorResponse = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: "Internal Server Error",
      message: "A database error occurred",
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(process.env.NODE_ENV === "development" && {
        debug: {
          originalMessage: exception.message,
        },
      }),
    };

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse);
  }

  private getErrorName(status: HttpStatus): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return "Bad Request";
      case HttpStatus.NOT_FOUND:
        return "Not Found";
      case HttpStatus.CONFLICT:
        return "Conflict";
      default:
        return "Internal Server Error";
    }
  }
}
