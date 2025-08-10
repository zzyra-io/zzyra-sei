import {
  BlockExecutionContext,
  BlockHandler,
  enhancedDataTransformSchema,
} from '@zzyra/types';
import { Logger } from '@nestjs/common';
import { z } from 'zod';

/**
 * Data Transform Handler
 * Transforms and manipulates data between blocks
 */
export class DataTransformHandler implements BlockHandler {
  // Use the enhanced schema from @zzyra/types
  static readonly inputSchema = enhancedDataTransformSchema.inputSchema;
  static readonly outputSchema = enhancedDataTransformSchema.outputSchema;
  static readonly configSchema = enhancedDataTransformSchema.configSchema;

  private readonly logger = new Logger(DataTransformHandler.name);

  async execute(
    node: any,
    context: BlockExecutionContext,
  ): Promise<Record<string, any>> {
    const startTime = Date.now();
    const transformationLog: any[] = [];

    try {
      this.logger.log(
        `Starting data transformation for node ${context.nodeId}`,
      );

      // Extract input data and config from the node
      const input = node.data?.input || {};
      const config = node.data?.config || {};

      let transformedData = input.data || {};
      const transformations = config.transformations || [];

      // Apply each transformation
      for (const transform of transformations) {
        const transformStart = Date.now();

        try {
          transformedData = this.applyTransformation(
            transformedData,
            transform,
          );

          transformationLog.push({
            type: transform.type,
            field: transform.field,
            operation: transform.operation,
            success: true,
            executionTime: Date.now() - transformStart,
          });

          this.logger.debug(
            `Applied transformation: ${transform.type} on field: ${transform.field}`,
          );
        } catch (error) {
          transformationLog.push({
            type: transform.type,
            field: transform.field,
            operation: transform.operation,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            executionTime: Date.now() - transformStart,
          });

          this.logger.error(
            `Transformation failed: ${transform.type} on field: ${transform.field}`,
            error,
          );
        }
      }

      const executionTime = Date.now() - startTime;

      this.logger.log(`Data transformation completed in ${executionTime}ms`);

      return {
        transformedData,
        originalData: input.data,
        transformationLog,
        metadata: {
          transformationCount: transformations.length,
          executionTime,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(
        `Data transformation failed for node ${context.nodeId}`,
        error,
      );
      throw error;
    }
  }

  private applyTransformation(data: any, transform: any): any {
    const { type, field, operation, value, outputField } = transform;

    switch (type) {
      case 'map':
        return this.mapTransformation(data, field, outputField);

      case 'filter':
        return this.filterTransformation(data, field, operation, value);

      case 'aggregate':
        return this.aggregateTransformation(data, field, operation);

      case 'format':
        return this.formatTransformation(data, field, operation);

      case 'extract':
        return this.extractTransformation(data, field, outputField);

      case 'combine':
        return this.combineTransformation(data, field, outputField, value);

      default:
        throw new Error(`Unknown transformation type: ${type}`);
    }
  }

  private mapTransformation(
    data: any,
    field: string,
    outputField: string,
  ): any {
    if (!field || !outputField) {
      throw new Error('Map transformation requires both field and outputField');
    }

    const result = { ...data };
    const fieldValue = this.getNestedValue(data, field);
    result[outputField] = fieldValue;

    return result;
  }

  private filterTransformation(
    data: any,
    field: string,
    operation: string,
    value: any,
  ): any {
    if (!field) {
      throw new Error('Filter transformation requires field');
    }

    const fieldValue = this.getNestedValue(data, field);

    switch (operation) {
      case 'equals':
        return fieldValue === value ? data : null;
      case 'not_equals':
        return fieldValue !== value ? data : null;
      case 'greater_than':
        return fieldValue > value ? data : null;
      case 'less_than':
        return fieldValue < value ? data : null;
      case 'contains':
        return String(fieldValue).includes(String(value)) ? data : null;
      default:
        throw new Error(`Unknown filter operation: ${operation}`);
    }
  }

  private aggregateTransformation(
    data: any,
    field: string,
    operation: string,
  ): any {
    if (!field) {
      throw new Error('Aggregate transformation requires field');
    }

    const fieldValue = this.getNestedValue(data, field);

    if (!Array.isArray(fieldValue)) {
      throw new Error('Aggregate operation requires array field');
    }

    let result: any;

    switch (operation) {
      case 'sum':
        result = fieldValue.reduce(
          (sum: number, val: any) => sum + (Number(val) || 0),
          0,
        );
        break;
      case 'average':
        const sum = fieldValue.reduce(
          (sum: number, val: any) => sum + (Number(val) || 0),
          0,
        );
        result = sum / fieldValue.length;
        break;
      case 'count':
        result = fieldValue.length;
        break;
      case 'min':
        result = Math.min(...fieldValue.map((val: any) => Number(val) || 0));
        break;
      case 'max':
        result = Math.max(...fieldValue.map((val: any) => Number(val) || 0));
        break;
      default:
        throw new Error(`Unknown aggregate operation: ${operation}`);
    }

    return { ...data, [field]: result };
  }

  private formatTransformation(
    data: any,
    field: string,
    operation: string,
  ): any {
    if (!field) {
      throw new Error('Format transformation requires field');
    }

    const fieldValue = this.getNestedValue(data, field);
    const result = { ...data };

    switch (operation) {
      case 'uppercase':
        result[field] = String(fieldValue).toUpperCase();
        break;
      case 'lowercase':
        result[field] = String(fieldValue).toLowerCase();
        break;
      case 'capitalize':
        result[field] = String(fieldValue).replace(/\b\w/g, (l: string) =>
          l.toUpperCase(),
        );
        break;
      case 'trim':
        result[field] = String(fieldValue).trim();
        break;
      case 'number':
        result[field] = Number(fieldValue) || 0;
        break;
      case 'string':
        result[field] = String(fieldValue);
        break;
      default:
        throw new Error(`Unknown format operation: ${operation}`);
    }

    return result;
  }

  private extractTransformation(
    data: any,
    field: string,
    outputField: string,
  ): any {
    if (!field || !outputField) {
      throw new Error(
        'Extract transformation requires both field and outputField',
      );
    }

    const fieldValue = this.getNestedValue(data, field);
    const result = { ...data };

    if (typeof fieldValue === 'object' && fieldValue !== null) {
      result[outputField] = fieldValue;
    } else {
      throw new Error(`Cannot extract non-object field: ${field}`);
    }

    return result;
  }

  private combineTransformation(
    data: any,
    field: string,
    outputField: string,
    separator: string = ' ',
  ): any {
    if (!field || !outputField) {
      throw new Error(
        'Combine transformation requires both field and outputField',
      );
    }

    const fieldValue = this.getNestedValue(data, field);
    const result = { ...data };

    if (Array.isArray(fieldValue)) {
      result[outputField] = fieldValue.join(separator);
    } else {
      throw new Error(`Cannot combine non-array field: ${field}`);
    }

    return result;
  }

  private getNestedValue(data: any, path: string): any {
    return path.split('.').reduce((obj, key) => obj?.[key], data);
  }
}
