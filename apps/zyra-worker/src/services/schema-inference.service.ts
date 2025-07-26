import { Injectable, Logger } from '@nestjs/common';

export interface SchemaDefinition {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null' | 'unknown';
  properties?: Record<string, SchemaProperty>;
  items?: SchemaDefinition;
  confidence: number;
  examples?: any[];
  nullable?: boolean;
  pattern?: string;
  minimum?: number;
  maximum?: number;
}

export interface SchemaProperty {
  type: string;
  required: boolean;
  schema?: SchemaDefinition;
  format?: string;
  pattern?: string;
  minimum?: number;
  maximum?: number;
}

export interface CompatibilityResult {
  score: number;
  issues: CompatibilityIssue[];
  suggestions: TransformationSuggestion[];
  autoFixable: boolean;
}

export interface CompatibilityIssue {
  type: 'missing_field' | 'type_mismatch' | 'format_mismatch' | 'validation_error';
  field: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  sourceType?: string;
  targetType?: string;
}

export interface TransformationSuggestion {
  id: string;
  type: 'field_mapping' | 'type_conversion' | 'format_transformation';
  confidence: number;
  description: string;
  transformation: any;
}

@Injectable()
export class SchemaInferenceService {
  private readonly logger = new Logger(SchemaInferenceService.name);

  inferSchema(data: any, samples: any[] = []): SchemaDefinition {
    const allSamples = [data, ...samples].filter(s => s !== undefined && s !== null);
    
    if (allSamples.length === 0) {
      return { type: 'null', confidence: 1.0 };
    }

    // Determine the primary type
    const types = allSamples.map(sample => this.getValueType(sample));
    const primaryType = this.getMostCommonType(types);

    switch (primaryType) {
      case 'array':
        return this.inferArraySchema(allSamples.filter(s => Array.isArray(s)));
      case 'object':
        return this.inferObjectSchema(allSamples.filter(s => this.isPlainObject(s)));
      default:
        return this.inferPrimitiveSchema(allSamples, primaryType);
    }
  }

  async analyzeCompatibility(
    sourceSchema: SchemaDefinition,
    targetSchema: SchemaDefinition
  ): Promise<CompatibilityResult> {
    const issues: CompatibilityIssue[] = [];
    const suggestions: TransformationSuggestion[] = [];
    let score = 1.0;

    try {
      // Compare schemas recursively
      const analysis = this.compareSchemas(sourceSchema, targetSchema, '');
      issues.push(...analysis.issues);
      suggestions.push(...analysis.suggestions);
      score = analysis.score;

      return {
        score: Math.max(0, Math.min(1, score)),
        issues,
        suggestions,
        autoFixable: suggestions.length > 0
      };

    } catch (error) {
      this.logger.error('Compatibility analysis failed:', error);
      return {
        score: 0,
        issues: [{
          type: 'validation_error',
          field: 'root',
          severity: 'error',
          message: 'Compatibility analysis failed'
        }],
        suggestions: [],
        autoFixable: false
      };
    }
  }

  private inferArraySchema(arrays: any[]): SchemaDefinition {
    if (arrays.length === 0) {
      return { type: 'array', confidence: 0.5 };
    }

    // Analyze all items in all arrays
    const allItems = arrays.flat();
    const itemSchema: SchemaDefinition = allItems.length > 0 
      ? this.inferSchema(allItems[0], allItems.slice(1))
      : { type: 'unknown' as const, confidence: 0.5 };

    return {
      type: 'array',
      items: itemSchema,
      confidence: this.calculateConfidence(arrays),
      examples: arrays.slice(0, 3)
    };
  }

  private inferObjectSchema(objects: any[]): SchemaDefinition {
    if (objects.length === 0) {
      return { type: 'object', confidence: 0.5, properties: {} };
    }

    const properties: Record<string, SchemaProperty> = {};
    const allKeys = new Set<string>();

    // Collect all possible keys
    objects.forEach(obj => {
      Object.keys(obj).forEach(key => allKeys.add(key));
    });

    // Analyze each property
    for (const key of allKeys) {
      const values = objects.map(obj => obj[key]).filter(v => v !== undefined);
      const requiredCount = values.length;
      const totalCount = objects.length;
      
      properties[key] = {
        type: this.getMostCommonType(values.map(v => this.getValueType(v))),
        required: requiredCount / totalCount > 0.8, // Consider required if present in 80%+ of samples
        schema: values.length > 0 ? this.inferSchema(values[0], values.slice(1)) : undefined,
        format: this.inferFormat(values)
      };
    }

    return {
      type: 'object',
      properties,
      confidence: this.calculateConfidence(objects),
      examples: objects.slice(0, 3)
    };
  }

  private inferPrimitiveSchema(values: any[], type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null' | 'unknown'): SchemaDefinition {
    const schema: SchemaDefinition = {
      type: type,
      confidence: this.calculateConfidence(values),
      examples: values.slice(0, 3)
    };

    // Add type-specific metadata
    if (type === 'string') {
      schema.pattern = this.inferPattern(values.filter(v => typeof v === 'string'));
    } else if (type === 'number') {
      const numbers = values.filter(v => typeof v === 'number');
      if (numbers.length > 0) {
        schema.minimum = Math.min(...numbers);
        schema.maximum = Math.max(...numbers);
      }
    }

    return schema;
  }

  private compareSchemas(
    source: SchemaDefinition,
    target: SchemaDefinition,
    path: string
  ): { score: number; issues: CompatibilityIssue[]; suggestions: TransformationSuggestion[] } {
    const issues: CompatibilityIssue[] = [];
    const suggestions: TransformationSuggestion[] = [];
    let score = 1.0;

    // Type compatibility
    if (source.type !== target.type) {
      const conversionPossible = this.isConversionPossible(source.type, target.type);
      
      if (conversionPossible) {
        score -= 0.2;
        issues.push({
          type: 'type_mismatch',
          field: path || 'root',
          severity: 'warning',
          message: `Type mismatch: ${source.type} -> ${target.type}`,
          sourceType: source.type,
          targetType: target.type
        });

        suggestions.push({
          id: `convert-${path || 'root'}`,
          type: 'type_conversion',
          confidence: 0.8,
          description: `Convert ${source.type} to ${target.type}`,
          transformation: {
            type: 'format',
            operation: this.getConversionOperation(source.type, target.type)
          }
        });
      } else {
        score -= 0.5;
        issues.push({
          type: 'type_mismatch',
          field: path || 'root',
          severity: 'error',
          message: `Incompatible types: ${source.type} -> ${target.type}`,
          sourceType: source.type,
          targetType: target.type
        });
      }
    }

    // Object property compatibility
    if (source.type === 'object' && target.type === 'object') {
      const analysis = this.compareObjectProperties(source, target, path);
      issues.push(...analysis.issues);
      suggestions.push(...analysis.suggestions);
      score = Math.min(score, analysis.score);
    }

    // Array item compatibility
    if (source.type === 'array' && target.type === 'array' && source.items && target.items) {
      const itemPath = path ? `${path}[]` : '[]';
      const itemAnalysis = this.compareSchemas(source.items, target.items, itemPath);
      issues.push(...itemAnalysis.issues);
      suggestions.push(...itemAnalysis.suggestions);
      score = Math.min(score, itemAnalysis.score);
    }

    return { score, issues, suggestions };
  }

  private compareObjectProperties(
    source: SchemaDefinition,
    target: SchemaDefinition,
    basePath: string
  ): { score: number; issues: CompatibilityIssue[]; suggestions: TransformationSuggestion[] } {
    const issues: CompatibilityIssue[] = [];
    const suggestions: TransformationSuggestion[] = [];
    let score = 1.0;

    const sourceProps = source.properties || {};
    const targetProps = target.properties || {};

    // Check each target property
    for (const [targetProp, targetSpec] of Object.entries(targetProps)) {
      const path = basePath ? `${basePath}.${targetProp}` : targetProp;
      
      // Find matching source property (exact match first, then fuzzy)
      const sourceProp = this.findMatchingProperty(sourceProps, targetProp);

      if (!sourceProp) {
        if (targetSpec.required) {
          score -= 0.3;
          issues.push({
            type: 'missing_field',
            field: path,
            severity: 'error',
            message: `Required field '${targetProp}' is missing`
          });
        } else {
          score -= 0.1;
          issues.push({
            type: 'missing_field',
            field: path,
            severity: 'warning',
            message: `Optional field '${targetProp}' is missing`
          });
        }
      } else {
        // Compare property schemas recursively
        const sourceSpec = sourceProps[sourceProp];
        if (sourceSpec.schema && targetSpec.schema) {
          const propAnalysis = this.compareSchemas(sourceSpec.schema, targetSpec.schema, path);
          issues.push(...propAnalysis.issues);
          suggestions.push(...propAnalysis.suggestions);
          score = Math.min(score, propAnalysis.score);
        }

        // Suggest field mapping if names don't match
        if (sourceProp !== targetProp) {
          suggestions.push({
            id: `map-${sourceProp}-to-${targetProp}`,
            type: 'field_mapping',
            confidence: 0.9,
            description: `Map '${sourceProp}' to '${targetProp}'`,
            transformation: {
              type: 'map',
              sourceField: sourceProp,
              targetField: targetProp
            }
          });
        }
      }
    }

    return { score, issues, suggestions };
  }

  private findMatchingProperty(properties: Record<string, SchemaProperty>, targetProp: string): string | null {
    // Exact match
    if (properties[targetProp]) {
      return targetProp;
    }

    // Case-insensitive match
    const caseInsensitiveMatch = Object.keys(properties).find(
      key => key.toLowerCase() === targetProp.toLowerCase()
    );
    if (caseInsensitiveMatch) {
      return caseInsensitiveMatch;
    }

    // Partial match (contains or is contained)
    const partialMatch = Object.keys(properties).find(
      key => key.includes(targetProp) || targetProp.includes(key)
    );
    if (partialMatch) {
      return partialMatch;
    }

    return null;
  }

  private getValueType(value: any): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (value instanceof Date) return 'string'; // Treat dates as strings
    return typeof value;
  }

  private getMostCommonType(types: string[]): 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null' | 'unknown' {
    const counts = types.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostCommon = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    
    // Ensure we return a valid type from the union
    switch (mostCommon) {
      case 'object':
      case 'array':
      case 'string':
      case 'number':
      case 'boolean':
      case 'null':
        return mostCommon;
      default:
        return 'unknown';
    }
  }

  private isPlainObject(value: any): boolean {
    return value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);
  }

  private calculateConfidence(samples: any[]): number {
    if (samples.length === 0) return 0;
    if (samples.length === 1) return 0.7;
    if (samples.length < 5) return 0.8;
    return 0.95;
  }

  private inferFormat(values: any[]): string | undefined {
    const strings = values.filter(v => typeof v === 'string');
    if (strings.length === 0) return undefined;

    // Check common formats
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const urlRegex = /^https?:\/\/.+/;
    const dateRegex = /^\d{4}-\d{2}-\d{2}/;

    if (strings.every(s => emailRegex.test(s))) return 'email';
    if (strings.every(s => urlRegex.test(s))) return 'url';
    if (strings.every(s => dateRegex.test(s))) return 'date';

    return undefined;
  }

  private inferPattern(strings: string[]): string | undefined {
    if (strings.length === 0) return undefined;

    // Simple pattern inference - could be enhanced
    const lengths = strings.map(s => s.length);
    const uniqueLengths = new Set(lengths);
    
    if (uniqueLengths.size === 1) {
      return `^.{${lengths[0]}}$`; // Fixed length
    }

    return undefined;
  }

  private isConversionPossible(sourceType: string, targetType: string): boolean {
    const conversions = {
      'string': ['number', 'boolean', 'object'],
      'number': ['string', 'boolean'],
      'boolean': ['string', 'number'],
      'object': ['string'],
      'array': ['string']
    };

    return conversions[sourceType]?.includes(targetType) || false;
  }

  private getConversionOperation(sourceType: string, targetType: string): string {
    const operations = {
      'string->number': 'parse_number',
      'string->boolean': 'parse_boolean',
      'string->object': 'parse_json',
      'number->string': 'to_string',
      'number->boolean': 'to_boolean',
      'boolean->string': 'to_string',
      'boolean->number': 'to_number',
      'object->string': 'json_stringify',
      'array->string': 'json_stringify'
    };

    return operations[`${sourceType}->${targetType}`] || 'identity';
  }
}