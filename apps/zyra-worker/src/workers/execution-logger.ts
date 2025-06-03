import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../services/database.service';
import { BlockExecutionContext } from '@zyra/types';

// Extended logger interface with the 'log' method for compatibility
interface ExtendedLogger {
  log: (message: string, data?: any) => void;
  debug: (message: string, data?: any) => void;
  info: (message: string, data?: any) => void;
  warn: (message: string, data?: any) => void;
  error: (message: string, data?: any) => void;
}

import { configDotenv } from 'dotenv';

@Injectable()
export class ExecutionLogger {
  private readonly logger = new Logger(ExecutionLogger.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async logExecutionEvent(
    executionId: string,
    event: {
      level: 'info' | 'error' | 'warn';
      message: string;
      node_id: string;
      data?: any;
    },
  ): Promise<void> {
    try {
      await this.databaseService.executions.addLog(
        executionId,
        event.level,
        event.message,
        {
          node_id: event.node_id,
          ...event.data,
        },
      );
    } catch (err) {
      this.logger.error(
        `Error logging execution event: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async logNodeEvent(
    executionId: string,
    nodeId: string,
    level: 'info' | 'warn' | 'error',
    message: string,
    data?: any,
  ): Promise<void> {
    try {
      await this.databaseService.executions.addLog(
        executionId,
        level,
        message,
        {
          node_id: nodeId,
          ...data,
        },
      );
    } catch (err) {
      this.logger.warn(
        `Error logging node event: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  createNodeLogger(executionId: string, nodeId: string): ExtendedLogger {
    return {
      // Use log for standard informational messages (same as info for compatibility)
      log: (message: string, data?: any) =>
        this.logNodeEvent(executionId, nodeId, 'info', message, data),
      // info is an alias for log to maintain interface compatibility
      info: (message: string, data?: any) =>
        this.logNodeEvent(executionId, nodeId, 'info', message, data),
      error: (message: string, data?: any) =>
        this.logNodeEvent(executionId, nodeId, 'error', message, data),
      warn: (message: string, data?: any) =>
        this.logNodeEvent(executionId, nodeId, 'warn', message, data),
      debug: (message: string, data?: any) => {
        this.logger.debug(message);
        return this.logNodeEvent(executionId, nodeId, 'info', message, data);
      },
    };
  }
}
