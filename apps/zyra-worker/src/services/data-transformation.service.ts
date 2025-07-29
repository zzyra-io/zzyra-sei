import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';

export interface DataTransformation {
  id: string;
  type:
    | 'map'
    | 'filter'
    | 'aggregate'
    | 'format'
    | 'extract'
    | 'combine'
    | 'validate'
    | 'enrich'
    | 'conditional'
    | 'loop'
    | 'sort';
  sourceField?: string;
  targetField?: string;
  operation: string;
  value?: any;
  condition?: string;
  schema?: z.ZodSchema;
  priority?: number;
  // Conditional transformation properties
  trueTransformation?: DataTransformation;
  falseTransformation?: DataTransformation;
  // Loop transformation properties
  itemTransformations?: DataTransformation[];
  batchSize?: number;
  parallel?: boolean;
}

export interface DataPipeline {
  id: string;
  transformations: DataTransformation[];
  inputSchema?: z.ZodSchema;
  outputSchema?: z.ZodSchema;
  metadata?: {
    name: string;
    description: string;
    version: string;
  };
}

export interface TransformationResult {
  success: boolean;
  data: any;
  errors: string[];
  warnings: string[];
  metadata: {
    executionTime: number;
    transformationsApplied: number;
    dataSize: {
      input: number;
      output: number;
    };
  };
}

@Injectable()
export class DataTransformationService {
  private readonly logger = new Logger(DataTransformationService.name);

  /**
   * Transform data using a single transformation rule
   */
  async transform(data: any, transformation: DataTransformation): Promise<any> {
    try {
      switch (transformation.type) {
        case 'map':
          return this.mapData(data, transformation);
        case 'filter':
          return this.filterData(data, transformation);
        case 'aggregate':
          return this.aggregateData(data, transformation);
        case 'format':
          return this.formatData(data, transformation);
        case 'extract':
          return this.extractData(data, transformation);
        case 'combine':
          return this.combineData(data, transformation);
        case 'validate':
          return this.validateData(data, transformation);
        case 'enrich':
          return this.enrichData(data, transformation);
        case 'conditional':
          return this.conditionalTransform(data, transformation);
        case 'loop':
          return this.loopTransform(data, transformation);
        case 'sort':
          return this.sortData(data, transformation);
        default:
          throw new Error(
            `Unsupported transformation type: ${transformation.type}`,
          );
      }
    } catch (error) {
      this.logger.error(`Transformation failed:`, error);
      throw error;
    }
  }

  /**
   * Apply a data pipeline (series of transformations)
   */
  async applyPipeline(
    data: any,
    pipeline: DataPipeline,
  ): Promise<TransformationResult> {
    const startTime = Date.now();
    const inputSize = JSON.stringify(data).length;
    const errors: string[] = [];
    const warnings: string[] = [];
    let transformedData = data;
    let transformationsApplied = 0;

    try {
      // Validate input schema if provided
      if (pipeline.inputSchema) {
        try {
          pipeline.inputSchema.parse(data);
        } catch (error) {
          errors.push(
            `Input validation failed: ${error instanceof Error ? error.message : String(error)}`,
          );
          return {
            success: false,
            data: transformedData,
            errors,
            warnings,
            metadata: {
              executionTime: Date.now() - startTime,
              transformationsApplied: 0,
              dataSize: { input: inputSize, output: 0 },
            },
          };
        }
      }

      // Sort transformations by priority
      const sortedTransformations = [...pipeline.transformations].sort(
        (a, b) => (a.priority || 0) - (b.priority || 0),
      );

      // Apply each transformation
      for (const transformation of sortedTransformations) {
        try {
          transformedData = await this.transform(
            transformedData,
            transformation,
          );
          transformationsApplied++;
        } catch (error) {
          const errorMsg = `Transformation ${transformation.id} failed: ${error instanceof Error ? error.message : String(error)}`;
          errors.push(errorMsg);
          this.logger.warn(errorMsg);
        }
      }

      // Validate output schema if provided
      if (pipeline.outputSchema) {
        try {
          pipeline.outputSchema.parse(transformedData);
        } catch (error) {
          warnings.push(
            `Output validation warning: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      const outputSize = JSON.stringify(transformedData).length;

      return {
        success: errors.length === 0,
        data: transformedData,
        errors,
        warnings,
        metadata: {
          executionTime: Date.now() - startTime,
          transformationsApplied,
          dataSize: { input: inputSize, output: outputSize },
        },
      };
    } catch (error) {
      errors.push(
        `Pipeline execution failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        success: false,
        data: transformedData,
        errors,
        warnings,
        metadata: {
          executionTime: Date.now() - startTime,
          transformationsApplied,
          dataSize: {
            input: inputSize,
            output: JSON.stringify(transformedData).length,
          },
        },
      };
    }
  }

  /**
   * Create a data pipeline for node-to-node data compatibility
   */
  createCompatibilityPipeline(
    sourceSchema: z.ZodSchema,
    targetSchema: z.ZodSchema,
    mapping?: Record<string, string>,
  ): DataPipeline {
    const transformations: DataTransformation[] = [];

    // Add field mapping transformations
    if (mapping) {
      Object.entries(mapping).forEach(([sourceField, targetField], index) => {
        transformations.push({
          id: `map-${index}`,
          type: 'map',
          sourceField,
          targetField,
          operation: 'rename',
          priority: index,
        });
      });
    }

    return {
      id: `compatibility-${Date.now()}`,
      transformations,
      inputSchema: sourceSchema,
      outputSchema: targetSchema,
      metadata: {
        name: 'Node Compatibility Pipeline',
        description: 'Ensures data compatibility between connected nodes',
        version: '1.0.0',
      },
    };
  }

  /**
   * Filter relevant data based on node dependencies with edge connection preservation
   */
  filterRelevantData(
    allData: Record<string, any>,
    relevantNodeIds: string[],
    preserveEdgeConnections: boolean = true,
  ): Record<string, any> {
    if (!allData || typeof allData !== 'object') {
      this.logger.warn('Invalid data provided to filterRelevantData');
      return {};
    }

    if (!Array.isArray(relevantNodeIds)) {
      this.logger.warn(
        'Invalid relevantNodeIds provided to filterRelevantData',
      );
      return allData;
    }

    const filteredData: Record<string, any> = {};
    const processedNodes = new Set<string>();

    // Process directly requested nodes
    for (const nodeId of relevantNodeIds) {
      if (typeof nodeId === 'string' && allData[nodeId] !== undefined) {
        filteredData[nodeId] = this.deepCloneData(allData[nodeId]);
        processedNodes.add(nodeId);
      }
    }

    // Preserve edge connections if requested
    if (preserveEdgeConnections) {
      this.preserveEdgeConnections(allData, filteredData, processedNodes);
    }

    this.logger.debug(
      `Filtered data for ${Object.keys(filteredData).length} nodes from ${Object.keys(allData).length} total nodes`,
    );
    return filteredData;
  }

  /**
   * Preserve edge connections between nodes to maintain data flow integrity
   */
  private preserveEdgeConnections(
    allData: Record<string, any>,
    filteredData: Record<string, any>,
    processedNodes: Set<string>,
  ): void {
    // Find nodes that are referenced by included nodes but not yet included
    const referencedNodes = new Set<string>();

    for (const [, nodeData] of Object.entries(filteredData)) {
      this.findDataReferences(nodeData, referencedNodes, allData);
    }

    // Include referenced nodes to preserve data flow
    for (const referencedNodeId of referencedNodes) {
      if (
        !processedNodes.has(referencedNodeId) &&
        allData[referencedNodeId] !== undefined
      ) {
        filteredData[referencedNodeId] = this.deepCloneData(
          allData[referencedNodeId],
        );
        processedNodes.add(referencedNodeId);

        this.logger.debug(
          `Preserved edge connection to node: ${referencedNodeId}`,
        );
      }
    }
  }

  /**
   * Find data references within node data to identify edge connections
   */
  private findDataReferences(
    data: any,
    referencedNodes: Set<string>,
    allData: Record<string, any>,
  ): void {
    if (data === null || typeof data !== 'object') {
      return;
    }

    if (Array.isArray(data)) {
      data.forEach((item) =>
        this.findDataReferences(item, referencedNodes, allData),
      );
      return;
    }

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'object' && value !== null) {
        // Pattern: reference objects with nodeId property
        if (
          'nodeId' in value &&
          typeof (value as { nodeId: string }).nodeId === 'string' &&
          allData[(value as { nodeId: string }).nodeId] !== undefined
        ) {
          referencedNodes.add((value as { nodeId: string }).nodeId);
        }

        // Pattern: pairedItem references (workflow execution context)
        if (
          'pairedItem' in value &&
          value.pairedItem &&
          typeof value.pairedItem === 'object' &&
          'nodeId' in value.pairedItem &&
          typeof (value.pairedItem as { nodeId: string }).nodeId === 'string' &&
          allData[(value.pairedItem as { nodeId: string }).nodeId] !== undefined
        ) {
          referencedNodes.add((value.pairedItem as { nodeId: string }).nodeId);
        }

        // Recursively search nested objects
        this.findDataReferences(value, referencedNodes, allData);
      }
    }
  }

  /**
   * Deep clone data to prevent reference sharing
   */
  private deepCloneData(data: any): any {
    if (data === null || typeof data !== 'object') {
      return data;
    }

    if (data instanceof Date) {
      return new Date(data.getTime());
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.deepCloneData(item));
    }

    const cloned: any = {};
    for (const [key, value] of Object.entries(data)) {
      cloned[key] = this.deepCloneData(value);
    }

    return cloned;
  }

  /**
   * Merge data from multiple sources with conflict resolution
   */
  mergeData(
    dataSources: Record<string, any>[],
    mergeStrategy: 'overwrite' | 'combine' | 'array' | 'deep' = 'overwrite',
  ): any {
    if (dataSources.length === 0) return {};
    if (dataSources.length === 1) return dataSources[0];

    switch (mergeStrategy) {
      case 'overwrite':
        return Object.assign({}, ...dataSources);

      case 'combine':
        const combined: Record<string, any> = {};
        dataSources.forEach((data) => {
          Object.keys(data).forEach((key) => {
            if (combined[key] !== undefined) {
              // Combine values into array if different
              if (Array.isArray(combined[key])) {
                combined[key].push(data[key]);
              } else {
                combined[key] = [combined[key], data[key]];
              }
            } else {
              combined[key] = data[key];
            }
          });
        });
        return combined;

      case 'array':
        return dataSources;

      case 'deep':
        return this.deepMerge(...dataSources);

      default:
        return Object.assign({}, ...dataSources);
    }
  }

  /**
   * Private transformation methods
   */
  private mapData(data: any, transformation: DataTransformation): any {
    if (!transformation.sourceField || !transformation.targetField) {
      throw new Error(
        'Map transformation requires sourceField and targetField',
      );
    }

    const result = { ...data };
    const sourceValue = this.getNestedValue(data, transformation.sourceField);

    if (sourceValue !== undefined) {
      this.setNestedValue(result, transformation.targetField, sourceValue);

      // Remove source field if it's a rename operation
      if (transformation.operation === 'rename') {
        this.deleteNestedValue(result, transformation.sourceField);
      }
    }

    return result;
  }

  private filterData(data: any, transformation: DataTransformation): any {
    if (!transformation.condition && !transformation.operation) {
      throw new Error('Filter transformation requires condition or operation');
    }

    // Handle array filtering
    if (Array.isArray(data)) {
      return data.filter((item) =>
        this.evaluateCondition(item, transformation),
      );
    }

    // Handle single item filtering
    const shouldKeep = this.evaluateCondition(data, transformation);
    return shouldKeep ? data : null;
  }

  private evaluateCondition(
    data: any,
    transformation: DataTransformation,
  ): boolean {
    try {
      if (transformation.condition) {
        // Safe condition evaluation without Function constructor
        return this.evaluateConditionSafely(transformation.condition, data);
      }

      if (transformation.operation && transformation.sourceField) {
        const value = this.getNestedValue(data, transformation.sourceField);

        switch (transformation.operation) {
          case 'exists':
            return value !== undefined && value !== null;
          case 'not_exists':
            return value === undefined || value === null;
          case 'equals':
            return this.deepEquals(value, transformation.value);
          case 'not_equals':
            return !this.deepEquals(value, transformation.value);
          case 'greater_than':
            return this.compareValues(value, transformation.value, 'gt');
          case 'greater_than_equal':
            return this.compareValues(value, transformation.value, 'gte');
          case 'less_than':
            return this.compareValues(value, transformation.value, 'lt');
          case 'less_than_equal':
            return this.compareValues(value, transformation.value, 'lte');
          case 'contains':
            return this.stringContains(value, transformation.value);
          case 'starts_with':
            return this.stringStartsWith(value, transformation.value);
          case 'ends_with':
            return this.stringEndsWith(value, transformation.value);
          case 'regex':
            return this.regexMatch(value, transformation.value);
          case 'in':
            return this.valueInArray(value, transformation.value);
          case 'not_in':
            return !this.valueInArray(value, transformation.value);
          default:
            this.logger.warn(
              `Unknown filter operation: ${transformation.operation}`,
            );
            return true;
        }
      }

      return true;
    } catch (error) {
      this.logger.warn(
        `Filter condition evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
        {
          transformation: transformation.id,
          condition: transformation.condition,
          operation: transformation.operation,
        },
      );
      return false;
    }
  }

  /**
   * Safely evaluate condition expressions without Function constructor
   */
  private evaluateConditionSafely(condition: string, data: any): boolean {
    try {
      // Parse and evaluate simple expressions safely
      const tokens = this.tokenizeCondition(condition);
      return this.evaluateTokens(tokens, data);
    } catch (error) {
      this.logger.warn(
        `Safe condition evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }

  /**
   * Tokenize condition for safe evaluation
   */
  private tokenizeCondition(condition: string): string[] {
    // Simple tokenizer for basic conditions
    // Supports: field comparisons, logical operators, parentheses
    const tokens: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < condition.length; i++) {
      const char = condition[i];

      if (!inQuotes && (char === '"' || char === "'")) {
        if (current.trim()) {
          tokens.push(current.trim());
          current = '';
        }
        inQuotes = true;
        quoteChar = char;
        current = char;
      } else if (inQuotes && char === quoteChar) {
        current += char;
        tokens.push(current);
        current = '';
        inQuotes = false;
        quoteChar = '';
      } else if (inQuotes) {
        current += char;
      } else if (/\s/.test(char)) {
        if (current.trim()) {
          tokens.push(current.trim());
          current = '';
        }
      } else if (
        ['(', ')', '&&', '||', '==', '!=', '>=', '<=', '>', '<'].some((op) =>
          condition.substring(i).startsWith(op),
        )
      ) {
        if (current.trim()) {
          tokens.push(current.trim());
          current = '';
        }

        // Handle multi-character operators
        if (condition.substring(i, i + 2).match(/^(&&|\|\||==|!=|>=|<=)$/)) {
          tokens.push(condition.substring(i, i + 2));
          i++; // Skip next character
        } else {
          tokens.push(char);
        }
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      tokens.push(current.trim());
    }

    return tokens.filter((token) => token.length > 0);
  }

  /**
   * Evaluate tokenized condition safely
   */
  private evaluateTokens(tokens: string[], data: any): boolean {
    // This is a simplified evaluator for basic conditions
    // For complex conditions, consider using a proper expression parser
    if (tokens.length === 0) return true;
    if (tokens.length === 1) {
      // Single token - treat as field existence check
      const value = this.getNestedValue(data, tokens[0]);
      return Boolean(value);
    }

    // Handle simple binary operations: field operator value
    if (tokens.length === 3) {
      const [field, operator, valueToken] = tokens;
      const fieldValue = this.getNestedValue(data, field);
      const compareValue = this.parseValue(valueToken);

      switch (operator) {
        case '==':
        case '===':
          return this.deepEquals(fieldValue, compareValue);
        case '!=':
        case '!==':
          return !this.deepEquals(fieldValue, compareValue);
        case '>':
          return this.compareValues(fieldValue, compareValue, 'gt');
        case '>=':
          return this.compareValues(fieldValue, compareValue, 'gte');
        case '<':
          return this.compareValues(fieldValue, compareValue, 'lt');
        case '<=':
          return this.compareValues(fieldValue, compareValue, 'lte');
        default:
          this.logger.warn(`Unknown condition operator: ${operator}`);
          return false;
      }
    }

    // For more complex expressions, fall back to simple truthiness
    this.logger.warn(
      `Complex condition evaluation not fully supported: ${tokens.join(' ')}`,
    );
    return true;
  }

  /**
   * Parse value token to appropriate type
   */
  private parseValue(token: string): any {
    // Remove quotes
    if (
      (token.startsWith('"') && token.endsWith('"')) ||
      (token.startsWith("'") && token.endsWith("'"))
    ) {
      return token.slice(1, -1);
    }

    // Parse numbers
    if (/^-?\d+(\.\d+)?$/.test(token)) {
      return Number(token);
    }

    // Parse booleans
    if (token === 'true') return true;
    if (token === 'false') return false;
    if (token === 'null') return null;
    if (token === 'undefined') return undefined;

    // Return as string
    return token;
  }

  /**
   * Deep equality check for values
   */
  private deepEquals(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null || b == null) return a === b;
    if (typeof a !== typeof b) return false;

    if (typeof a === 'object' && typeof b === 'object') {
      if (Array.isArray(a) !== Array.isArray(b)) return false;

      if (Array.isArray(a)) {
        if (a.length !== b.length) return false;
        return a.every((item, index) => this.deepEquals(item, b[index]));
      }

      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length) return false;

      return keysA.every(
        (key) => keysB.includes(key) && this.deepEquals(a[key], b[key]),
      );
    }

    return false;
  }

  /**
   * Compare values with type safety
   */
  private compareValues(
    a: any,
    b: any,
    operation: 'gt' | 'gte' | 'lt' | 'lte',
  ): boolean {
    if (typeof a === 'number' && typeof b === 'number') {
      switch (operation) {
        case 'gt':
          return a > b;
        case 'gte':
          return a >= b;
        case 'lt':
          return a < b;
        case 'lte':
          return a <= b;
      }
    }

    if (typeof a === 'string' && typeof b === 'string') {
      switch (operation) {
        case 'gt':
          return a > b;
        case 'gte':
          return a >= b;
        case 'lt':
          return a < b;
        case 'lte':
          return a <= b;
      }
    }

    if (a instanceof Date && b instanceof Date) {
      switch (operation) {
        case 'gt':
          return a.getTime() > b.getTime();
        case 'gte':
          return a.getTime() >= b.getTime();
        case 'lt':
          return a.getTime() < b.getTime();
        case 'lte':
          return a.getTime() <= b.getTime();
      }
    }

    return false;
  }

  /**
   * Safe string contains check
   */
  private stringContains(value: any, searchValue: any): boolean {
    return (
      typeof value === 'string' &&
      typeof searchValue === 'string' &&
      value.includes(searchValue)
    );
  }

  /**
   * Safe string starts with check
   */
  private stringStartsWith(value: any, searchValue: any): boolean {
    return (
      typeof value === 'string' &&
      typeof searchValue === 'string' &&
      value.startsWith(searchValue)
    );
  }

  /**
   * Safe string ends with check
   */
  private stringEndsWith(value: any, searchValue: any): boolean {
    return (
      typeof value === 'string' &&
      typeof searchValue === 'string' &&
      value.endsWith(searchValue)
    );
  }

  /**
   * Safe regex match check
   */
  private regexMatch(value: any, pattern: any): boolean {
    try {
      if (typeof value !== 'string' || typeof pattern !== 'string') {
        return false;
      }
      const regex = new RegExp(pattern);
      return regex.test(value);
    } catch (error) {
      this.logger.warn(`Invalid regex pattern: ${pattern}`);
      return false;
    }
  }

  /**
   * Check if value is in array
   */
  private valueInArray(value: any, array: any): boolean {
    if (!Array.isArray(array)) return false;
    return array.some((item) => this.deepEquals(value, item));
  }

  private aggregateData(data: any, transformation: DataTransformation): any {
    if (!Array.isArray(data) || !transformation.operation) {
      throw new Error(
        'Aggregate transformation requires array data and operation',
      );
    }

    switch (transformation.operation) {
      case 'sum':
        return data.reduce((sum, item) => {
          const value = transformation.sourceField
            ? this.getNestedValue(item, transformation.sourceField)
            : item;
          return sum + (typeof value === 'number' ? value : 0);
        }, 0);

      case 'avg':
        const sum = data.reduce((sum, item) => {
          const value = transformation.sourceField
            ? this.getNestedValue(item, transformation.sourceField)
            : item;
          return sum + (typeof value === 'number' ? value : 0);
        }, 0);
        return sum / data.length;

      case 'count':
        return data.length;

      case 'max':
        return Math.max(
          ...data.map((item) => {
            const value = transformation.sourceField
              ? this.getNestedValue(item, transformation.sourceField)
              : item;
            return typeof value === 'number' ? value : -Infinity;
          }),
        );

      case 'min':
        return Math.min(
          ...data.map((item) => {
            const value = transformation.sourceField
              ? this.getNestedValue(item, transformation.sourceField)
              : item;
            return typeof value === 'number' ? value : Infinity;
          }),
        );

      default:
        throw new Error(
          `Unsupported aggregation operation: ${transformation.operation}`,
        );
    }
  }

  private formatData(data: any, transformation: DataTransformation): any {
    const result = { ...data };
    const value = transformation.sourceField
      ? this.getNestedValue(data, transformation.sourceField)
      : data;

    let formattedValue: any;

    switch (transformation.operation) {
      case 'uppercase':
        formattedValue =
          typeof value === 'string' ? value.toUpperCase() : value;
        break;

      case 'lowercase':
        formattedValue =
          typeof value === 'string' ? value.toLowerCase() : value;
        break;

      case 'trim':
        formattedValue = typeof value === 'string' ? value.trim() : value;
        break;

      case 'title_case':
        formattedValue =
          typeof value === 'string'
            ? value.replace(
                /\w\S*/g,
                (txt) =>
                  txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase(),
              )
            : value;
        break;

      case 'date':
        formattedValue = new Date(value).toISOString();
        break;

      case 'number':
      case 'parse_number':
        formattedValue = Number(value);
        break;

      case 'string':
      case 'to_string':
        formattedValue = String(value);
        break;

      case 'boolean':
      case 'parse_boolean':
        if (typeof value === 'boolean') {
          formattedValue = value;
        } else if (typeof value === 'string') {
          formattedValue = value.toLowerCase() === 'true' || value === '1';
        } else {
          formattedValue = Boolean(value);
        }
        break;

      case 'json':
        formattedValue = JSON.stringify(value);
        break;

      case 'parse_json':
        try {
          formattedValue =
            typeof value === 'string' ? JSON.parse(value) : value;
        } catch {
          formattedValue = value;
        }
        break;

      case 'multiply':
        formattedValue =
          typeof value === 'number' && typeof transformation.value === 'number'
            ? value * transformation.value
            : value;
        break;

      case 'divide':
        formattedValue =
          typeof value === 'number' &&
          typeof transformation.value === 'number' &&
          transformation.value !== 0
            ? value / transformation.value
            : value;
        break;

      case 'add':
        formattedValue =
          typeof value === 'number' && typeof transformation.value === 'number'
            ? value + transformation.value
            : value;
        break;

      case 'subtract':
        formattedValue =
          typeof value === 'number' && typeof transformation.value === 'number'
            ? value - transformation.value
            : value;
        break;

      default:
        throw new Error(
          `Unsupported format operation: ${transformation.operation}`,
        );
    }

    // Set the formatted value in the result
    if (transformation.targetField) {
      this.setNestedValue(result, transformation.targetField, formattedValue);
    } else if (transformation.sourceField) {
      this.setNestedValue(result, transformation.sourceField, formattedValue);
    } else {
      return formattedValue;
    }

    return result;
  }

  private extractData(data: any, transformation: DataTransformation): any {
    if (!transformation.sourceField) {
      throw new Error('Extract transformation requires sourceField');
    }

    const result = { ...data };
    const extractedValue = this.getNestedValue(
      data,
      transformation.sourceField,
    );

    if (transformation.targetField) {
      this.setNestedValue(result, transformation.targetField, extractedValue);
      return result;
    }

    return extractedValue;
  }

  private combineData(data: any, transformation: DataTransformation): any {
    // Combine multiple fields into one
    if (!transformation.value || !Array.isArray(transformation.value)) {
      throw new Error(
        'Combine transformation requires array of field names in value',
      );
    }

    const values = transformation.value
      .map((field) => this.getNestedValue(data, field))
      .filter((val) => val !== undefined);

    switch (transformation.operation) {
      case 'concat':
        return values.join('');

      case 'array':
        return values;

      case 'object':
        const result: Record<string, any> = {};
        transformation.value.forEach((field, index) => {
          result[field] = values[index];
        });
        return result;

      default:
        return values;
    }
  }

  private validateData(data: any, transformation: DataTransformation): any {
    if (!transformation.schema) {
      throw new Error('Validate transformation requires schema');
    }

    try {
      transformation.schema.parse(data);
      return data;
    } catch (error) {
      throw new Error(
        `Data validation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private enrichData(data: any, transformation: DataTransformation): any {
    // Add additional context or computed fields
    const result = { ...data };

    switch (transformation.operation) {
      case 'timestamp':
        result[transformation.targetField || 'timestamp'] =
          new Date().toISOString();
        break;

      case 'uuid':
        result[transformation.targetField || 'id'] =
          `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        break;

      case 'computed':
        if (
          transformation.value &&
          typeof transformation.value === 'function'
        ) {
          result[transformation.targetField || 'computed'] =
            transformation.value(data);
        }
        break;

      default:
        if (transformation.targetField && transformation.value !== undefined) {
          result[transformation.targetField] = transformation.value;
        }
    }

    return result;
  }

  private conditionalTransform(
    data: any,
    transformation: DataTransformation,
  ): any {
    if (!transformation.condition) {
      throw new Error('Conditional transformation requires condition');
    }

    try {
      const conditionMet = this.evaluateCondition(data, transformation);

      if (conditionMet && transformation.trueTransformation) {
        return this.transform(data, transformation.trueTransformation);
      } else if (!conditionMet && transformation.falseTransformation) {
        return this.transform(data, transformation.falseTransformation);
      }

      return data; // No transformation applied
    } catch (error) {
      this.logger.error('Conditional transformation failed:', error);
      return data;
    }
  }

  private async loopTransform(
    data: any,
    transformation: DataTransformation,
  ): Promise<any> {
    if (!Array.isArray(data)) {
      throw new Error('Loop transformation requires array data');
    }

    if (
      !transformation.itemTransformations ||
      transformation.itemTransformations.length === 0
    ) {
      return data;
    }

    const batchSize = transformation.batchSize || 100;
    const parallel = transformation.parallel !== false; // Default to true

    try {
      if (parallel) {
        // Process all items in parallel
        const transformedItems = await Promise.all(
          data.map(async (item) => {
            let result = item;
            for (const itemTransformation of transformation.itemTransformations!) {
              result = await this.transform(result, itemTransformation);
            }
            return result;
          }),
        );
        return transformedItems;
      } else {
        // Process items sequentially in batches
        const result = [];
        for (let i = 0; i < data.length; i += batchSize) {
          const batch = data.slice(i, i + batchSize);

          for (const item of batch) {
            let transformedItem = item;
            for (const itemTransformation of transformation.itemTransformations!) {
              transformedItem = await this.transform(
                transformedItem,
                itemTransformation,
              );
            }
            result.push(transformedItem);
          }
        }
        return result;
      }
    } catch (error) {
      this.logger.error('Loop transformation failed:', error);
      throw error;
    }
  }

  private sortData(data: any, transformation: DataTransformation): any {
    if (!Array.isArray(data)) {
      return data;
    }

    const sortField = transformation.sourceField;
    const sortOrder = transformation.operation || 'asc'; // 'asc' or 'desc'

    try {
      return [...data].sort((a, b) => {
        let valueA = sortField ? this.getNestedValue(a, sortField) : a;
        let valueB = sortField ? this.getNestedValue(b, sortField) : b;

        // Handle different data types
        if (typeof valueA === 'string' && typeof valueB === 'string') {
          valueA = valueA.toLowerCase();
          valueB = valueB.toLowerCase();
        }

        if (valueA < valueB) {
          return sortOrder === 'asc' ? -1 : 1;
        }
        if (valueA > valueB) {
          return sortOrder === 'asc' ? 1 : -1;
        }
        return 0;
      });
    } catch (error) {
      this.logger.error('Sort transformation failed:', error);
      return data;
    }
  }

  /**
   * Utility methods for nested object access
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
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

  private deleteNestedValue(obj: any, path: string): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      return current && current[key] ? current[key] : {};
    }, obj);
    delete target[lastKey];
  }

  private deepMerge(...objects: any[]): any {
    const result: any = {};

    for (const obj of objects) {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          if (
            result[key] &&
            typeof result[key] === 'object' &&
            typeof obj[key] === 'object'
          ) {
            result[key] = this.deepMerge(result[key], obj[key]);
          } else {
            result[key] = obj[key];
          }
        }
      }
    }

    return result;
  }
}
