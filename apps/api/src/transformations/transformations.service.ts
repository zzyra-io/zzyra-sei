import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TransformationsService {
  private readonly logger = new Logger(TransformationsService.name);

  async previewTransformations(data: any, transformations: any[]) {
    try {
      // Apply transformations step by step
      let result = { ...data };
      const steps = [];

      for (let i = 0; i < transformations.length; i++) {
        const transformation = transformations[i];
        const stepResult = this.applyTransformation(result, transformation);
        
        steps.push({
          step: i + 1,
          transformation,
          input: { ...result },
          output: stepResult,
          success: true
        });
        
        result = stepResult;
      }

      return {
        success: true,
        data: result,
        originalData: data,
        steps,
        transformationCount: transformations.length
      };
    } catch (error) {
      this.logger.error('Preview transformations failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        data: data,
        originalData: data,
        steps: [],
        transformationCount: 0
      };
    }
  }

  async validateTransformations(transformations: any[]) {
    const errors = [];
    const warnings = [];

    for (let i = 0; i < transformations.length; i++) {
      const transformation = transformations[i];
      const validation = this.validateTransformation(transformation);
      
      if (validation.errors.length > 0) {
        errors.push({
          step: i + 1,
          transformation,
          errors: validation.errors
        });
      }
      
      if (validation.warnings.length > 0) {
        warnings.push({
          step: i + 1,
          transformation,
          warnings: validation.warnings
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      totalTransformations: transformations.length
    };
  }

  private applyTransformation(data: any, transformation: any): any {
    switch (transformation.type) {
      case 'map':
        return this.applyMapTransformation(data, transformation);
      case 'filter':
        return this.applyFilterTransformation(data, transformation);
      case 'format':
        return this.applyFormatTransformation(data, transformation);
      case 'extract':
        return this.applyExtractTransformation(data, transformation);
      case 'aggregate':
        return this.applyAggregateTransformation(data, transformation);
      case 'combine':
        return this.applyCombineTransformation(data, transformation);
      case 'conditional':
        return this.applyConditionalTransformation(data, transformation);
      case 'loop':
        return this.applyLoopTransformation(data, transformation);
      case 'sort':
        return this.applySortTransformation(data, transformation);
      default:
        throw new Error(`Unsupported transformation type: ${transformation.type}`);
    }
  }

  private applyMapTransformation(data: any, transformation: any): any {
    if (!transformation.field || !transformation.outputField) {
      return data;
    }

    const result = { ...data };
    const value = this.getNestedValue(data, transformation.field);
    
    if (value !== undefined) {
      this.setNestedValue(result, transformation.outputField, value);
    }

    return result;
  }

  private applyFilterTransformation(data: any, transformation: any): any {
    if (!transformation.condition && !transformation.operation) {
      return data;
    }

    // Handle array filtering
    if (Array.isArray(data)) {
      return data.filter(item => this.evaluateCondition(item, transformation));
    }

    // Handle single item filtering
    const shouldKeep = this.evaluateCondition(data, transformation);
    return shouldKeep ? data : null;
  }

  private applyFormatTransformation(data: any, transformation: any): any {
    const result = { ...data };
    const field = transformation.field || transformation.outputField;
    const value = this.getNestedValue(data, field);

    if (value === undefined) {
      return result;
    }

    let formattedValue: any;

    switch (transformation.operation) {
      case 'uppercase':
        formattedValue = typeof value === 'string' ? value.toUpperCase() : value;
        break;
      case 'lowercase':
        formattedValue = typeof value === 'string' ? value.toLowerCase() : value;
        break;
      case 'trim':
        formattedValue = typeof value === 'string' ? value.trim() : value;
        break;
      case 'title_case':
        formattedValue = typeof value === 'string' 
          ? value.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase())
          : value;
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
      case 'multiply':
        formattedValue = typeof value === 'number' && typeof transformation.value === 'number'
          ? value * transformation.value
          : value;
        break;
      default:
        formattedValue = value;
    }

    const outputField = transformation.outputField || transformation.field;
    this.setNestedValue(result, outputField, formattedValue);

    return result;
  }

  private applyExtractTransformation(data: any, transformation: any): any {
    if (!transformation.field) {
      return data;
    }

    const result = { ...data };
    const extractedValue = this.getNestedValue(data, transformation.field);
    
    if (transformation.outputField) {
      this.setNestedValue(result, transformation.outputField, extractedValue);
    }

    return result;
  }

  private applyAggregateTransformation(data: any, transformation: any): any {
    if (!Array.isArray(data)) {
      return data;
    }

    switch (transformation.operation) {
      case 'sum':
        return data.reduce((sum, item) => {
          const value = transformation.field 
            ? this.getNestedValue(item, transformation.field)
            : item;
          return sum + (typeof value === 'number' ? value : 0);
        }, 0);
      case 'avg':
        const sum = data.reduce((sum, item) => {
          const value = transformation.field 
            ? this.getNestedValue(item, transformation.field)
            : item;
          return sum + (typeof value === 'number' ? value : 0);
        }, 0);
        return sum / data.length;
      case 'count':
        return data.length;
      case 'max':
        return Math.max(...data.map(item => {
          const value = transformation.field 
            ? this.getNestedValue(item, transformation.field)
            : item;
          return typeof value === 'number' ? value : -Infinity;
        }));
      case 'min':
        return Math.min(...data.map(item => {
          const value = transformation.field 
            ? this.getNestedValue(item, transformation.field)
            : item;
          return typeof value === 'number' ? value : Infinity;
        }));
      default:
        return data;
    }
  }

  private applyCombineTransformation(data: any, transformation: any): any {
    if (!transformation.value || !Array.isArray(transformation.value)) {
      return data;
    }

    const result = { ...data };
    const values = transformation.value.map((field: string) => 
      this.getNestedValue(data, field)
    ).filter((val: any) => val !== undefined);

    let combinedValue: any;

    switch (transformation.operation) {
      case 'concat':
        combinedValue = values.join('');
        break;
      case 'array':
        combinedValue = values;
        break;
      case 'object':
        combinedValue = {};
        transformation.value.forEach((field: string, index: number) => {
          combinedValue[field] = values[index];
        });
        break;
      default:
        combinedValue = values;
    }

    if (transformation.outputField) {
      this.setNestedValue(result, transformation.outputField, combinedValue);
    }

    return result;
  }

  private applyConditionalTransformation(data: any, transformation: any): any {
    if (!transformation.condition) {
      return data;
    }

    try {
      const conditionMet = this.evaluateCondition(data, transformation);
      
      if (conditionMet && transformation.trueTransformation) {
        return this.applyTransformation(data, transformation.trueTransformation);
      } else if (!conditionMet && transformation.falseTransformation) {
        return this.applyTransformation(data, transformation.falseTransformation);
      }
      
      return data;
    } catch (error) {
      return data;
    }
  }

  private applyLoopTransformation(data: any, transformation: any): any {
    if (!Array.isArray(data)) {
      return data;
    }

    if (!transformation.itemTransformations || transformation.itemTransformations.length === 0) {
      return data;
    }

    try {
      return data.map(item => {
        let result = item;
        for (const itemTransformation of transformation.itemTransformations) {
          result = this.applyTransformation(result, itemTransformation);
        }
        return result;
      });
    } catch (error) {
      return data;
    }
  }

  private applySortTransformation(data: any, transformation: any): any {
    if (!Array.isArray(data)) {
      return data;
    }

    const sortField = transformation.field;
    const sortOrder = transformation.operation || 'asc';

    try {
      return [...data].sort((a, b) => {
        let valueA = sortField ? this.getNestedValue(a, sortField) : a;
        let valueB = sortField ? this.getNestedValue(b, sortField) : b;

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
      return data;
    }
  }

  private evaluateCondition(data: any, transformation: any): boolean {
    if (transformation.condition) {
      try {
        // Simple condition evaluation
        const condition = transformation.condition.replace(/\b(\w+)\b/g, (match: string) => {
          const value = this.getNestedValue(data, match);
          if (typeof value === 'string') {
            return `"${value}"`;
          }
          return value !== undefined ? String(value) : 'undefined';
        });
        
        const conditionFunc = new Function('return ' + condition);
        return conditionFunc();
      } catch {
        return false;
      }
    }

    if (transformation.operation && transformation.field) {
      const value = this.getNestedValue(data, transformation.field);
      
      switch (transformation.operation) {
        case 'exists':
          return value !== undefined && value !== null;
        case 'equals':
          return value === transformation.value;
        case 'not_equals':
          return value !== transformation.value;
        case 'greater_than':
          return typeof value === 'number' && value > transformation.value;
        case 'less_than':
          return typeof value === 'number' && value < transformation.value;
        case 'contains':
          return typeof value === 'string' && value.includes(transformation.value);
        default:
          return true;
      }
    }

    return true;
  }

  private validateTransformation(transformation: any) {
    const errors = [];
    const warnings = [];

    if (!transformation.type) {
      errors.push('Transformation type is required');
    }

    switch (transformation.type) {
      case 'map':
        if (!transformation.field) {
          errors.push('Source field is required for map transformation');
        }
        if (!transformation.outputField) {
          errors.push('Output field is required for map transformation');
        }
        break;
      case 'filter':
        if (!transformation.condition && !transformation.operation) {
          errors.push('Condition or operation is required for filter transformation');
        }
        break;
      case 'format':
        if (!transformation.operation) {
          errors.push('Operation is required for format transformation');
        }
        if (!transformation.field && !transformation.outputField) {
          warnings.push('No field specified for format transformation');
        }
        break;
      case 'extract':
        if (!transformation.field) {
          errors.push('Source field is required for extract transformation');
        }
        break;
      case 'aggregate':
        if (!transformation.operation) {
          errors.push('Operation is required for aggregate transformation');
        }
        break;
      case 'combine':
        if (!transformation.value || !Array.isArray(transformation.value)) {
          errors.push('Array of field names is required for combine transformation');
        }
        break;
      case 'conditional':
        if (!transformation.condition) {
          errors.push('Condition is required for conditional transformation');
        }
        break;
      case 'loop':
        if (!transformation.itemTransformations || !Array.isArray(transformation.itemTransformations)) {
          errors.push('Item transformations array is required for loop transformation');
        }
        break;
      case 'sort':
        if (!transformation.operation) {
          warnings.push('Sort order not specified, defaulting to ascending');
        }
        break;
    }

    return { errors, warnings };
  }

  async inferSchema(data: any, samples: any[] = []): Promise<any> {
    try {
      // Simple schema inference implementation
      const allSamples = [data, ...samples].filter(s => s !== undefined && s !== null);
      
      if (allSamples.length === 0) {
        return { type: 'null', confidence: 1.0 };
      }

      const primaryType = this.inferType(allSamples[0]);
      
      if (primaryType === 'object') {
        const properties: Record<string, any> = {};
        const allKeys = new Set<string>();
        
        // Collect all keys from all samples
        allSamples.forEach((sample: any) => {
          if (typeof sample === 'object' && sample !== null) {
            Object.keys(sample).forEach(key => allKeys.add(key));
          }
        });

        // Analyze each property
        for (const key of allKeys) {
          const values = allSamples
            .map((sample: any) => sample[key])
            .filter(v => v !== undefined);
          
          properties[key] = {
            type: values.length > 0 ? this.inferType(values[0]) : 'unknown',
            required: values.length / allSamples.length > 0.8,
            examples: values.slice(0, 3)
          };
        }

        return {
          type: 'object',
          properties,
          confidence: this.calculateSchemaConfidence(allSamples)
        };
      } else if (primaryType === 'array') {
        const arrays = allSamples.filter(s => Array.isArray(s));
        const allItems = arrays.flat();
        
        return {
          type: 'array',
          items: allItems.length > 0 ? this.inferSchema(allItems[0], allItems.slice(1)) : { type: 'unknown' },
          confidence: this.calculateSchemaConfidence(allSamples)
        };
      } else {
        return {
          type: primaryType,
          confidence: this.calculateSchemaConfidence(allSamples),
          examples: allSamples.slice(0, 3)
        };
      }
    } catch (error) {
      this.logger.error('Schema inference failed:', error);
      return { type: 'unknown', confidence: 0 };
    }
  }

  async analyzeCompatibility(sourceSchema: any, targetSchema: any) {
    try {
      const issues = [];
      const suggestions = [];
      let score = 1.0;

      // Basic type compatibility
      if (sourceSchema.type !== targetSchema.type) {
        const convertible = this.isTypeConvertible(sourceSchema.type, targetSchema.type);
        
        if (convertible) {
          score -= 0.2;
          issues.push({
            type: 'type_mismatch',
            severity: 'warning',
            message: `Type conversion needed: ${sourceSchema.type} -> ${targetSchema.type}`
          });

          suggestions.push({
            id: 'type-conversion',
            type: 'transformation',
            confidence: 0.8,
            description: `Convert ${sourceSchema.type} to ${targetSchema.type}`,
            transformation: {
              type: 'format',
              operation: this.getTypeConversionOperation(sourceSchema.type, targetSchema.type)
            }
          });
        } else {
          score -= 0.5;
          issues.push({
            type: 'type_mismatch',
            severity: 'error',
            message: `Incompatible types: ${sourceSchema.type} -> ${targetSchema.type}`
          });
        }
      }

      // Object property compatibility
      if (sourceSchema.type === 'object' && targetSchema.type === 'object') {
        const sourceProps = sourceSchema.properties || {};
        const targetProps = targetSchema.properties || {};

        for (const [targetProp, targetSpec] of Object.entries(targetProps)) {
          if (!sourceProps[targetProp]) {
            if ((targetSpec as any).required) {
              score -= 0.3;
              issues.push({
                type: 'missing_field',
                severity: 'error',
                message: `Required field '${targetProp}' is missing`
              });
            } else {
              score -= 0.1;
              issues.push({
                type: 'missing_field',
                severity: 'warning',
                message: `Optional field '${targetProp}' is missing`
              });
            }
          }
        }
      }

      return {
        compatible: score > 0.5,
        score: Math.max(0, score),
        issues,
        suggestions,
        autoFixable: suggestions.length > 0
      };

    } catch (error) {
      this.logger.error('Compatibility analysis failed:', error);
      return {
        compatible: false,
        score: 0,
        issues: [{ type: 'error', severity: 'error', message: 'Analysis failed' }],
        suggestions: [],
        autoFixable: false
      };
    }
  }

  private inferType(value: any): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (value instanceof Date) return 'string';
    return typeof value;
  }

  private calculateSchemaConfidence(samples: any[]): number {
    if (samples.length === 0) return 0;
    if (samples.length === 1) return 0.7;
    if (samples.length < 5) return 0.8;
    return 0.95;
  }

  private isTypeConvertible(sourceType: string, targetType: string): boolean {
    const conversions: Record<string, string[]> = {
      'string': ['number', 'boolean', 'object'],
      'number': ['string', 'boolean'],
      'boolean': ['string', 'number'],
      'object': ['string']
    };

    return conversions[sourceType]?.includes(targetType) || false;
  }

  private getTypeConversionOperation(sourceType: string, targetType: string): string {
    const operations: Record<string, string> = {
      'string->number': 'parse_number',
      'string->boolean': 'parse_boolean',
      'string->object': 'parse_json',
      'number->string': 'to_string',
      'number->boolean': 'to_boolean',
      'boolean->string': 'to_string',
      'boolean->number': 'to_number',
      'object->string': 'json_stringify'
    };

    return operations[`${sourceType}->${targetType}`] || 'identity';
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