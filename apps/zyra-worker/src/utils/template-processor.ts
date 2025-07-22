import { Injectable } from '@nestjs/common';
import { TemplateProcessor } from '@zyra/types';

@Injectable()
export class ZyraTemplateProcessor implements TemplateProcessor {
  /**
   * Process template variables in a string
   * Supports various template syntaxes:
   * - {{json.field}} - Access data from current item
   * - {{json.nested.field}} - Access nested data
   * - {{json.array[0]}} - Access array elements
   * - {{$now}} - Current timestamp
   * - {{$uuid}} - Generate UUID
   * - {{$randomInt(1,100)}} - Generate random integer
   */
  process(template: string, data: any, context?: any): string {
    if (typeof template !== 'string') {
      return String(template);
    }

    let result = template;

    // Process {{json.field}} expressions
    result = result.replace(/\{\{json\.([^}]+)\}\}/g, (match, path) => {
      const value = this.getNestedValue(data, path);
      return this.formatValue(value);
    });

    // Process {{field}} expressions (legacy support)
    result = result.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      // Skip if it's already processed as json.field
      if (path.startsWith('json.')) return match;

      const value = this.getNestedValue(data, path);
      return this.formatValue(value);
    });

    // Process {{$now}} for current timestamp
    result = result.replace(/\{\{\$now\}\}/g, () => {
      return new Date().toISOString();
    });

    // Process {{$uuid}} for UUID generation
    result = result.replace(/\{\{\$uuid\}\}/g, () => {
      return this.generateUUID();
    });

    // Process {{$randomInt(min,max)}} for random integers
    result = result.replace(
      /\{\{\$randomInt\((\d+),(\d+)\)\}\}/g,
      (match, min, max) => {
        const minVal = parseInt(min, 10);
        const maxVal = parseInt(max, 10);
        return String(
          Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal,
        );
      },
    );

    // Process {{$randomFloat(min,max)}} for random floats
    result = result.replace(
      /\{\{\$randomFloat\(([^,]+),([^)]+)\)\}\}/g,
      (match, min, max) => {
        const minVal = parseFloat(min);
        const maxVal = parseFloat(max);
        return String((Math.random() * (maxVal - minVal) + minVal).toFixed(2));
      },
    );

    // Process {{$randomString(length)}} for random strings
    result = result.replace(
      /\{\{\$randomString\((\d+)\)\}\}/g,
      (match, length) => {
        return this.generateRandomString(parseInt(length, 10));
      },
    );

    // Process {{$formatDate(json.field, format)}} for date formatting
    result = result.replace(
      /\{\{\$formatDate\(([^,]+),\s*"([^"]+)"\)\}\}/g,
      (match, valuePath, format) => {
        const value = valuePath.startsWith('json.')
          ? this.getNestedValue(data, valuePath.substring(5))
          : valuePath;

        return this.formatDate(value, format);
      },
    );

    // Process {{$formatNumber(json.field, decimals)}} for number formatting
    result = result.replace(
      /\{\{\$formatNumber\(([^,]+),\s*(\d+)\)\}\}/g,
      (match, valuePath, decimals) => {
        const value = valuePath.startsWith('json.')
          ? this.getNestedValue(data, valuePath.substring(5))
          : parseFloat(valuePath);

        return this.formatNumber(value, parseInt(decimals, 10));
      },
    );

    // Process {{$formatCurrency(json.field, currency)}} for currency formatting
    result = result.replace(
      /\{\{\$formatCurrency\(([^,]+),\s*"([^"]+)"\)\}\}/g,
      (match, valuePath, currency) => {
        const value = valuePath.startsWith('json.')
          ? this.getNestedValue(data, valuePath.substring(5))
          : parseFloat(valuePath);

        return this.formatCurrency(value, currency);
      },
    );

    // Process {{$uppercase(json.field)}} for uppercase conversion
    result = result.replace(
      /\{\{\$uppercase\(([^)]+)\)\}\}/g,
      (match, valuePath) => {
        const value = valuePath.startsWith('json.')
          ? this.getNestedValue(data, valuePath.substring(5))
          : valuePath;

        return String(value).toUpperCase();
      },
    );

    // Process {{$lowercase(json.field)}} for lowercase conversion
    result = result.replace(
      /\{\{\$lowercase\(([^)]+)\)\}\}/g,
      (match, valuePath) => {
        const value = valuePath.startsWith('json.')
          ? this.getNestedValue(data, valuePath.substring(5))
          : valuePath;

        return String(value).toLowerCase();
      },
    );

    // Process {{$substring(json.field, start, end)}} for substring extraction
    result = result.replace(
      /\{\{\$substring\(([^,]+),\s*(\d+),\s*(\d+)\)\}\}/g,
      (match, valuePath, start, end) => {
        const value = valuePath.startsWith('json.')
          ? this.getNestedValue(data, valuePath.substring(5))
          : valuePath;

        return String(value).substring(parseInt(start, 10), parseInt(end, 10));
      },
    );

    // Process context variables if provided
    if (context) {
      result = result.replace(/\{\{ctx\.([^}]+)\}\}/g, (match, path) => {
        const value = this.getNestedValue(context, path);
        return this.formatValue(value);
      });
    }

    return result;
  }

  /**
   * Get nested value from object using dot notation with array support
   */
  private getNestedValue(obj: any, path: string): any {
    if (!obj || typeof obj !== 'object') return undefined;

    return path.split('.').reduce((current, key) => {
      if (current && typeof current === 'object') {
        // Handle array access like "array[0]"
        const arrayMatch = key.match(/^(\w+)\[(\d+)\]$/);
        if (arrayMatch) {
          const [, arrayKey, index] = arrayMatch;
          const array = current[arrayKey];
          if (Array.isArray(array)) {
            return array[parseInt(index, 10)];
          }
          return undefined;
        }
        return current[key];
      }
      return undefined;
    }, obj);
  }

  /**
   * Format value for template output
   */
  private formatValue(value: any): string {
    if (value === undefined || value === null) {
      return '';
    }

    if (typeof value === 'number') {
      return value.toString();
    }

    if (typeof value === 'boolean') {
      return value.toString();
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }

  /**
   * Validate if a template string is valid
   */
  validate(template: string): boolean {
    try {
      // Check for balanced braces
      const openBraces = (template.match(/\{\{/g) || []).length;
      const closeBraces = (template.match(/\}\}/g) || []).length;

      if (openBraces !== closeBraces) {
        return false;
      }

      // Check for invalid expressions
      const expressions = template.match(/\{\{([^}]+)\}\}/g) || [];

      for (const expr of expressions) {
        const content = expr.slice(2, -2).trim();

        // Check for valid expression patterns
        if (!this.isValidExpression(content)) {
          return false;
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if an expression is valid
   */
  private isValidExpression(expr: string): boolean {
    // Valid patterns
    const validPatterns = [
      /^json\.[a-zA-Z0-9_.\[\]]+$/, // json.field or json.array[0]
      /^[a-zA-Z0-9_.\[\]]+$/, // field or array[0]
      /^\$now$/, // $now
      /^\$uuid$/, // $uuid
      /^\$randomInt\(\d+,\d+\)$/, // $randomInt(1,100)
      /^\$randomFloat\([^,]+,[^)]+\)$/, // $randomFloat(1.0,100.0)
      /^\$randomString\(\d+\)$/, // $randomString(10)
      /^\$formatDate\([^,]+,"[^"]+"\)$/, // $formatDate(field,"YYYY-MM-DD")
      /^\$formatNumber\([^,]+,\d+\)$/, // $formatNumber(field,2)
      /^\$formatCurrency\([^,]+,"[^"]+"\)$/, // $formatCurrency(field,"USD")
      /^\$uppercase\([^)]+\)$/, // $uppercase(field)
      /^\$lowercase\([^)]+\)$/, // $lowercase(field)
      /^\$substring\([^,]+,\d+,\d+\)$/, // $substring(field,0,10)
      /^ctx\.[a-zA-Z0-9_.]+$/, // ctx.field
    ];

    return validPatterns.some((pattern) => pattern.test(expr));
  }

  /**
   * Extract all variables from a template string
   */
  getVariables(template: string): string[] {
    const variables: string[] = [];
    const expressions = template.match(/\{\{([^}]+)\}\}/g) || [];

    for (const expr of expressions) {
      const content = expr.slice(2, -2).trim();

      // Extract json.field variables
      if (content.startsWith('json.')) {
        variables.push(content);
      }

      // Extract context variables
      if (content.startsWith('ctx.')) {
        variables.push(content);
      }

      // Extract simple field variables (legacy)
      if (
        !content.startsWith('$') &&
        !content.startsWith('json.') &&
        !content.startsWith('ctx.')
      ) {
        variables.push(content);
      }
    }

    return [...new Set(variables)]; // Remove duplicates
  }

  /**
   * Generate UUID
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      },
    );
  }

  /**
   * Generate random string
   */
  private generateRandomString(length: number): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Format date
   */
  private formatDate(value: any, format: string): string {
    try {
      const date = new Date(value);
      if (isNaN(date.getTime())) return '';

      // Simple date formatting
      switch (format) {
        case 'YYYY-MM-DD':
          return date.toISOString().split('T')[0];
        case 'MM/DD/YYYY':
          return date.toLocaleDateString('en-US');
        case 'DD/MM/YYYY':
          return date.toLocaleDateString('en-GB');
        default:
          return date.toISOString();
      }
    } catch {
      return '';
    }
  }

  /**
   * Format number
   */
  private formatNumber(value: any, decimals: number): string {
    try {
      const num = parseFloat(value);
      if (isNaN(num)) return '';
      return num.toFixed(decimals);
    } catch {
      return '';
    }
  }

  /**
   * Format currency
   */
  private formatCurrency(value: any, currency: string): string {
    try {
      const num = parseFloat(value);
      if (isNaN(num)) return '';

      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'USD',
      }).format(num);
    } catch {
      return '';
    }
  }
}
