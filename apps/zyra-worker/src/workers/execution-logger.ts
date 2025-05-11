import { Injectable, Logger } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
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

  async logExecutionEvent(
    supabase: SupabaseClient,
    executionId: string,
    event: {
      level: 'info' | 'error' | 'warning';
      message: string;
      node_id: string;
      data?: any;
    },
  ): Promise<void> {
    try {
      const { error } = await supabase.from('execution_logs').insert({
        execution_id: executionId,
        level: event.level,
        message: event.message,
        node_id: event.node_id,
        data: event.data || null,
        timestamp: new Date().toISOString(),
      });
      if (error)
        this.logger.error(`Failed to log execution event: ${error.message}`);
    } catch (err) {
      this.logger.error(
        `Error logging execution event: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async logNodeEvent(
    supabase: SupabaseClient,
    executionId: string,
    nodeId: string,
    level: 'info' | 'warning' | 'error',
    message: string,
    data?: any,
  ): Promise<void> {
    try {
      const { error } = await supabase.from('node_logs').insert({
        execution_id: executionId,
        node_id: nodeId,
        level,
        message,
        data: data || null,
        timestamp: new Date().toISOString(),
      });
      if (error) this.logger.warn(`Failed to log node event: ${error.message}`);
    } catch (err) {
      this.logger.warn(
        `Error logging node event: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  createNodeLogger(
    supabase: SupabaseClient,
    executionId: string,
    nodeId: string,
  ): ExtendedLogger {
    return {
      // Use log for standard informational messages (same as info for compatibility)
      log: (message: string, data?: any) =>
        this.logNodeEvent(supabase, executionId, nodeId, 'info', message, data),
      // info is an alias for log to maintain interface compatibility
      info: (message: string, data?: any) =>
        this.logNodeEvent(supabase, executionId, nodeId, 'info', message, data),
      error: (message: string, data?: any) =>
        this.logNodeEvent(
          supabase,
          executionId,
          nodeId,
          'error',
          message,
          data,
        ),
      warn: (message: string, data?: any) =>
        this.logNodeEvent(
          supabase,
          executionId,
          nodeId,
          'warning',
          message,
          data,
        ),
      debug: (message: string, data?: any) => {
        this.logger.debug(message);
        return this.logNodeEvent(
          supabase,
          executionId,
          nodeId,
          'info',
          message,
          data,
        );
      },
    };
  }
}
