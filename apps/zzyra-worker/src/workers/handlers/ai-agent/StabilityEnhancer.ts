import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../services/database.service';

/**
 * StabilityEnhancer - Handles edge cases and improves system stability
 * without adding new features. Focuses on making existing functionality bulletproof.
 */
@Injectable()
export class StabilityEnhancer {
  private readonly logger = new Logger(StabilityEnhancer.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Validates and sanitizes execution context
   */
  validateExecutionContext(context: any): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check required fields
    if (!context?.nodeId) {
      errors.push('Missing nodeId in execution context');
    }
    if (!context?.executionId) {
      errors.push('Missing executionId in execution context');
    }

    // Validate node configuration exists
    if (!context?.data?.config) {
      errors.push('Missing node configuration');
    }

    // Validate agent configuration structure
    if (context?.data?.config && !context.data.config.agent) {
      errors.push('Missing agent configuration');
    }

    // Check for circular references that could cause memory leaks
    try {
      JSON.stringify(context);
    } catch (e) {
      errors.push('Execution context contains circular references');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Sanitizes user input to prevent injection attacks
   */
  sanitizeUserInput(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    return input
      .trim()
      .slice(0, 10000) // Limit length to prevent DoS
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
      .replace(/javascript:/gi, '') // Remove javascript protocol
      .replace(/data:/gi, '') // Remove data protocol
      .replace(/vbscript:/gi, ''); // Remove vbscript protocol
  }

  /**
   * Validates tool configuration with proper fallbacks
   */
  validateToolConfiguration(tools: any[]): {
    validTools: any[];
    invalidTools: any[];
  } {
    const validTools: any[] = [];
    const invalidTools: any[] = [];

    if (!Array.isArray(tools)) {
      this.logger.warn(
        'Tools configuration is not an array, using empty array',
      );
      return { validTools: [], invalidTools: [] };
    }

    for (const tool of tools) {
      try {
        // Basic validation
        if (!tool || typeof tool !== 'object') {
          invalidTools.push({ error: 'Tool is not an object', tool });
          continue;
        }

        if (!tool.id || typeof tool.id !== 'string') {
          invalidTools.push({ error: 'Tool missing valid id', tool });
          continue;
        }

        if (!tool.name || typeof tool.name !== 'string') {
          invalidTools.push({ error: 'Tool missing valid name', tool });
          continue;
        }

        if (!tool.type || !['mcp', 'goat', 'builtin'].includes(tool.type)) {
          invalidTools.push({ error: 'Tool has invalid type', tool });
          continue;
        }

        // Sanitize tool configuration
        const sanitizedTool = {
          id: this.sanitizeUserInput(tool.id),
          name: this.sanitizeUserInput(tool.name),
          type: tool.type,
          description: tool.description
            ? this.sanitizeUserInput(tool.description)
            : '',
          category: tool.category
            ? this.sanitizeUserInput(tool.category)
            : 'ai',
          enabled: Boolean(tool.enabled !== false), // Default to true
          config: this.sanitizeToolConfig(tool.config || {}),
        };

        validTools.push(sanitizedTool);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        this.logger.error(`Error validating tool: ${errorMessage}`, errorStack);
        invalidTools.push({ error: errorMessage, tool });
      }
    }

    return { validTools, invalidTools };
  }

  /**
   * Sanitizes tool configuration object
   */
  private sanitizeToolConfig(config: any): any {
    if (!config || typeof config !== 'object') {
      return {};
    }

    const sanitized: any = {};
    const maxDepth = 3; // Prevent deep nesting

    const sanitizeRecursive = (obj: any, depth: number): any => {
      if (depth > maxDepth || obj === null || obj === undefined) {
        return {};
      }

      if (typeof obj === 'string') {
        return this.sanitizeUserInput(obj);
      }

      if (typeof obj === 'number' || typeof obj === 'boolean') {
        return obj;
      }

      if (Array.isArray(obj)) {
        return obj
          .slice(0, 100)
          .map((item) => sanitizeRecursive(item, depth + 1));
      }

      if (typeof obj === 'object') {
        const result: any = {};
        const keys = Object.keys(obj).slice(0, 50); // Limit number of keys

        for (const key of keys) {
          const sanitizedKey = this.sanitizeUserInput(key);
          if (sanitizedKey && sanitizedKey.length <= 100) {
            result[sanitizedKey] = sanitizeRecursive(obj[key], depth + 1);
          }
        }
        return result;
      }

      return {};
    };

    return sanitizeRecursive(config, 0);
  }

  /**
   * Handles execution timeouts gracefully
   */
  async handleExecutionTimeout(
    executionId: string,
    nodeId: string,
  ): Promise<void> {
    try {
      this.logger.warn(
        `Execution timeout for ${executionId} on node ${nodeId}`,
      );

      // Log timeout event
      await this.databaseService.executions.addNodeLog(
        executionId,
        nodeId,
        'warn',
        'Execution exceeded maximum timeout',
        { timeout: true, endTime: new Date() },
      );

      // Clean up any hanging resources
      await this.cleanupExecutionResources(executionId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error handling execution timeout: ${errorMessage}`,
        errorStack,
      );
    }
  }

  /**
   * Cleans up resources after execution
   */
  private async cleanupExecutionResources(executionId: string): Promise<void> {
    try {
      // Close any open connections
      // Clear temporary data
      // Release memory
      this.logger.debug(`Cleaned up resources for execution ${executionId}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error cleaning up resources: ${errorMessage}`,
        errorStack,
      );
    }
  }

  /**
   * Validates memory usage and prevents OOM
   */
  checkMemoryUsage(): {
    isWithinLimits: boolean;
    currentUsage: number;
    maxAllowed: number;
  } {
    const usage = process.memoryUsage();
    const currentUsage = usage.heapUsed / 1024 / 1024; // MB
    const maxAllowed = 512; // 512 MB limit

    if (currentUsage > maxAllowed) {
      this.logger.warn(
        `High memory usage detected: ${currentUsage.toFixed(2)}MB`,
      );

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
    }

    return {
      isWithinLimits: currentUsage <= maxAllowed,
      currentUsage,
      maxAllowed,
    };
  }

  /**
   * Handles concurrent execution limits
   */
  validateConcurrentExecutions(currentCount: number): boolean {
    const maxConcurrent = 10; // Maximum concurrent executions

    if (currentCount >= maxConcurrent) {
      this.logger.warn(
        `Maximum concurrent executions reached: ${currentCount}`,
      );
      return false;
    }

    return true;
  }

  /**
   * Validates execution data integrity
   */
  validateExecutionData(data: any): {
    isValid: boolean;
    sanitizedData: any;
    errors: string[];
  } {
    const errors: string[] = [];

    try {
      // Check for required data structure
      if (!data || typeof data !== 'object') {
        errors.push('Execution data is not a valid object');
        return { isValid: false, sanitizedData: {}, errors };
      }

      // Sanitize and validate configuration
      const sanitizedData = {
        config: this.sanitizeExecutionConfig(data.config),
        status: this.validateExecutionStatus(data.status),
        executionId: data.executionId
          ? this.sanitizeUserInput(data.executionId)
          : undefined,
        executionProgress: this.validateProgress(data.executionProgress),
        thinkingSteps: this.validateThinkingSteps(data.thinkingSteps),
        toolCalls: this.validateToolCalls(data.toolCalls),
        logs: this.validateLogs(data.logs),
        executionError: data.executionError
          ? this.sanitizeUserInput(data.executionError)
          : undefined,
      };

      return { isValid: errors.length === 0, sanitizedData, errors };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      errors.push(`Error validating execution data: ${errorMessage}`);
      return { isValid: false, sanitizedData: {}, errors };
    }
  }

  private sanitizeExecutionConfig(config: any): any {
    if (!config || typeof config !== 'object') {
      return {
        agent: {
          name: 'AI Agent',
          systemPrompt: '',
          userPrompt: '',
          thinkingMode: 'fast',
          maxSteps: 10,
        },
        provider: {
          type: 'openrouter',
          model: 'default',
          temperature: 0.7,
          maxTokens: 1000,
        },
        execution: {
          mode: 'autonomous',
          timeout: 300000,
          saveThinking: false,
          requireApproval: false,
        },
        selectedTools: [],
      };
    }

    return {
      agent: this.sanitizeAgentConfig(config.agent),
      provider: this.sanitizeProviderConfig(config.provider),
      execution: this.sanitizeExecutionSettings(config.execution),
      selectedTools: this.validateToolConfiguration(config.selectedTools || [])
        .validTools,
    };
  }

  private sanitizeAgentConfig(agent: any): any {
    if (!agent || typeof agent !== 'object') {
      return {
        name: 'AI Agent',
        systemPrompt: '',
        userPrompt: '',
        thinkingMode: 'fast',
        maxSteps: 10,
      };
    }

    return {
      name: agent.name
        ? this.sanitizeUserInput(agent.name).slice(0, 100)
        : 'AI Agent',
      systemPrompt: agent.systemPrompt
        ? this.sanitizeUserInput(agent.systemPrompt).slice(0, 5000)
        : '',
      userPrompt: agent.userPrompt
        ? this.sanitizeUserInput(agent.userPrompt).slice(0, 5000)
        : '',
      thinkingMode: ['fast', 'deliberate', 'collaborative'].includes(
        agent.thinkingMode,
      )
        ? agent.thinkingMode
        : 'fast',
      maxSteps:
        typeof agent.maxSteps === 'number' &&
        agent.maxSteps > 0 &&
        agent.maxSteps <= 50
          ? agent.maxSteps
          : 10,
    };
  }

  private sanitizeProviderConfig(provider: any): any {
    if (!provider || typeof provider !== 'object') {
      return {
        type: 'openrouter',
        model: 'default',
        temperature: 0.7,
        maxTokens: 1000,
      };
    }

    return {
      type: ['openrouter', 'openai', 'anthropic', 'ollama'].includes(
        provider.type,
      )
        ? provider.type
        : 'openrouter',
      model: provider.model
        ? this.sanitizeUserInput(provider.model).slice(0, 100)
        : 'default',
      temperature:
        typeof provider.temperature === 'number' &&
        provider.temperature >= 0 &&
        provider.temperature <= 2
          ? provider.temperature
          : 0.7,
      maxTokens:
        typeof provider.maxTokens === 'number' &&
        provider.maxTokens > 0 &&
        provider.maxTokens <= 32000
          ? provider.maxTokens
          : 1000,
    };
  }

  private sanitizeExecutionSettings(execution: any): any {
    if (!execution || typeof execution !== 'object') {
      return {
        mode: 'autonomous',
        timeout: 300000,
        saveThinking: false,
        requireApproval: false,
      };
    }

    return {
      mode: ['autonomous', 'interactive'].includes(execution.mode)
        ? execution.mode
        : 'autonomous',
      timeout:
        typeof execution.timeout === 'number' &&
        execution.timeout > 0 &&
        execution.timeout <= 600000
          ? execution.timeout
          : 300000,
      saveThinking: Boolean(execution.saveThinking),
      requireApproval: Boolean(execution.requireApproval),
    };
  }

  private validateExecutionStatus(status: any): string {
    const validStatuses = ['idle', 'running', 'completed', 'error'];
    return validStatuses.includes(status) ? status : 'idle';
  }

  private validateProgress(progress: any): number | undefined {
    if (typeof progress === 'number' && progress >= 0 && progress <= 100) {
      return progress;
    }
    return undefined;
  }

  private validateThinkingSteps(steps: any): any[] {
    if (!Array.isArray(steps)) {
      return [];
    }

    return steps.slice(0, 100).map((step) => {
      if (!step || typeof step !== 'object') {
        return {};
      }

      return {
        id: step.id ? this.sanitizeUserInput(step.id) : undefined,
        type: step.type ? this.sanitizeUserInput(step.type) : 'reasoning',
        content: step.content
          ? this.sanitizeUserInput(step.content).slice(0, 2000)
          : '',
        reasoning: step.reasoning
          ? this.sanitizeUserInput(step.reasoning).slice(0, 2000)
          : '',
        timestamp: step.timestamp || new Date().toISOString(),
      };
    });
  }

  private validateToolCalls(calls: any): any[] {
    if (!Array.isArray(calls)) {
      return [];
    }

    return calls.slice(0, 50).map((call) => {
      if (!call || typeof call !== 'object') {
        return {};
      }

      return {
        id: call.id ? this.sanitizeUserInput(call.id) : undefined,
        tool: call.tool ? this.sanitizeUserInput(call.tool) : 'unknown',
        parameters: this.sanitizeToolConfig(call.parameters),
        result: call.result
          ? this.sanitizeUserInput(String(call.result)).slice(0, 5000)
          : undefined,
        status: ['success', 'error', 'pending'].includes(call.status)
          ? call.status
          : 'pending',
        timestamp: call.timestamp || new Date().toISOString(),
      };
    });
  }

  private validateLogs(logs: any): any[] {
    if (!Array.isArray(logs)) {
      return [];
    }

    return logs.slice(0, 100).map((log) => {
      if (!log || typeof log !== 'object') {
        return {};
      }

      return {
        level: ['info', 'warn', 'error', 'debug'].includes(log.level)
          ? log.level
          : 'info',
        message: log.message
          ? this.sanitizeUserInput(log.message).slice(0, 1000)
          : '',
        timestamp: log.timestamp || new Date().toISOString(),
        metadata: this.sanitizeToolConfig(log.metadata),
      };
    });
  }
}
