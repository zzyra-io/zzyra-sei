import { Injectable, Logger } from '@nestjs/common';
import { BlockHandler, BlockExecutionContext } from '@zyra/types';

@Injectable()
export class EdgeTransformHandler implements BlockHandler {
  private readonly logger = new Logger(EdgeTransformHandler.name);

  async execute(
    node: any,
    context: BlockExecutionContext,
  ): Promise<Record<string, any>> {
    const { inputs, config, nodeId: executionId } = context;
    const data = inputs;
    const startTime = Date.now();

    try {
      this.logger.debug(
        `Executing edge transform for execution ${executionId}`,
      );

      // Validate configuration
      if (!config.fieldMappings || config.fieldMappings.length === 0) {
        throw new Error('No field mappings configured');
      }

      // Apply field mappings
      const transformedData = await this.applyFieldMappings(
        data,
        config.fieldMappings,
      );

      // Apply conditional logic if configured
      const finalData =
        config.conditions && config.conditions.length > 0
          ? await this.applyConditions(transformedData, config.conditions)
          : transformedData;

      // Validate output if rules are configured
      if (config.validationRules && config.validationRules.length > 0) {
        const validationResult = this.validateOutput(
          finalData,
          config.validationRules,
        );
        if (!validationResult.valid) {
          throw new Error(
            `Validation failed: ${validationResult.errors.join(', ')}`,
          );
        }
      }

      return {
        data: finalData,
        metadata: {
          executionTime: Date.now() - startTime,
          transformationsApplied: config.fieldMappings.length,
          compatibilityScore: config.compatibilityScore,
        },
      };
    } catch (error) {
      this.logger.error(
        `Edge transformation failed for execution ${executionId}:`,
        error,
      );
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  private async applyFieldMappings(data: any, mappings: any[]): Promise<any> {
    const result = {};

    for (const mapping of mappings) {
      try {
        const sourceValue = this.getNestedValue(data, mapping.sourceField);

        if (sourceValue !== undefined) {
          let transformedValue = sourceValue;

          // Apply transformation based on type
          switch (mapping.transformationType) {
            case 'direct':
              transformedValue = sourceValue;
              break;
            case 'format':
              transformedValue = await this.formatValue(
                sourceValue,
                mapping.transformConfig,
              );
              break;
            case 'calculate':
              transformedValue = await this.calculateValue(
                sourceValue,
                mapping.transformConfig,
              );
              break;
            case 'conditional':
              transformedValue = await this.conditionalValue(
                sourceValue,
                mapping.transformConfig,
              );
              break;
          }

          this.setNestedValue(result, mapping.targetField, transformedValue);
        }
      } catch (error) {
        this.logger.warn(
          `Field mapping failed for ${mapping.sourceField} -> ${mapping.targetField}:`,
          error,
        );
        // Continue with other mappings
      }
    }

    return result;
  }

  private async formatValue(value: any, config: any): Promise<any> {
    if (!config || !config.operation) {
      return value;
    }

    switch (config.operation) {
      case 'uppercase':
        return typeof value === 'string' ? value.toUpperCase() : value;
      case 'lowercase':
        return typeof value === 'string' ? value.toLowerCase() : value;
      case 'trim':
        return typeof value === 'string' ? value.trim() : value;
      case 'parse_number':
        return Number(value);
      case 'to_string':
        return String(value);
      case 'parse_boolean':
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string')
          return value.toLowerCase() === 'true' || value === '1';
        return Boolean(value);
      case 'parse_json':
        try {
          return typeof value === 'string' ? JSON.parse(value) : value;
        } catch {
          return value;
        }
      default:
        return value;
    }
  }

  private async calculateValue(value: any, config: any): Promise<any> {
    if (!config || !config.operation || typeof value !== 'number') {
      return value;
    }

    switch (config.operation) {
      case 'multiply':
        return typeof config.value === 'number' ? value * config.value : value;
      case 'divide':
        return typeof config.value === 'number' && config.value !== 0
          ? value / config.value
          : value;
      case 'add':
        return typeof config.value === 'number' ? value + config.value : value;
      case 'subtract':
        return typeof config.value === 'number' ? value - config.value : value;
      case 'round':
        const decimals = config.decimals || 0;
        return (
          Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals)
        );
      default:
        return value;
    }
  }

  private async conditionalValue(value: any, config: any): Promise<any> {
    if (!config || !config.condition) {
      return value;
    }

    try {
      const conditionMet = this.evaluateCondition(value, config.condition);
      return conditionMet
        ? config.trueValue || value
        : config.falseValue || value;
    } catch (error) {
      this.logger.warn(`Conditional evaluation failed:`, error);
      return value;
    }
  }

  private async applyConditions(data: any, conditions: any[]): Promise<any> {
    // For now, just return data if all conditions pass
    // In a more complex implementation, we could filter or modify the data
    for (const condition of conditions) {
      const value = this.getNestedValue(data, condition.field);
      const conditionMet = this.evaluateCondition(value, condition);

      if (!conditionMet) {
        this.logger.debug(`Condition not met for field ${condition.field}`);
        // For now, we'll still return the data but log the failure
        // In future, we could implement different strategies (skip, error, default value)
      }
    }

    return data;
  }

  private evaluateCondition(value: any, condition: any): boolean {
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'not_equals':
        return value !== condition.value;
      case 'greater_than':
        return typeof value === 'number' && value > condition.value;
      case 'less_than':
        return typeof value === 'number' && value < condition.value;
      case 'contains':
        return typeof value === 'string' && value.includes(condition.value);
      case 'exists':
        return value !== undefined && value !== null;
      default:
        return true;
    }
  }

  private validateOutput(
    data: any,
    rules: any[],
  ): { valid: boolean; errors: string[] } {
    const errors = [];

    for (const rule of rules) {
      const value = this.getNestedValue(data, rule.field);

      switch (rule.rule) {
        case 'required':
          if (value === undefined || value === null || value === '') {
            errors.push(`Field '${rule.field}' is required`);
          }
          break;
        case 'type':
          const expectedType = rule.config.type;
          const actualType = typeof value;
          if (value !== undefined && actualType !== expectedType) {
            errors.push(
              `Field '${rule.field}' should be of type '${expectedType}', got '${actualType}'`,
            );
          }
          break;
        case 'format':
          if (rule.config.pattern && typeof value === 'string') {
            const regex = new RegExp(rule.config.pattern);
            if (!regex.test(value)) {
              errors.push(
                `Field '${rule.field}' does not match required format`,
              );
            }
          }
          break;
        case 'range':
          if (typeof value === 'number') {
            if (rule.config.min !== undefined && value < rule.config.min) {
              errors.push(
                `Field '${rule.field}' must be at least ${rule.config.min}`,
              );
            }
            if (rule.config.max !== undefined && value > rule.config.max) {
              errors.push(
                `Field '${rule.field}' must be at most ${rule.config.max}`,
              );
            }
          }
          break;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private getNestedValue(obj: any, path: string): any {
    if (!path) return obj;
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    if (!path) return;
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      return current[key];
    }, obj);
    target[lastKey] = value;
  }
}
