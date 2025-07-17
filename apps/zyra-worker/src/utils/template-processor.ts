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

    // Process {{$now}} for current timestamp
    result = result.replace(/\{\{\$now\}\}/g, () => {
      return new Date().toISOString();
    });

    // Process {{$uuid}} for UUID generation
    result = result.replace(/\{\{\$uuid\}\}/g, () => {
      return this.generateUUID();
    });

    // Process {{$randomInt(min,max)}} for random integers
    result = result.replace(/\{\{\$randomInt\((\d+),(\d+)\)\}\}/g, (match, min, max) => {
      const minVal = parseInt(min, 10);
      const maxVal = parseInt(max, 10);
      return String(Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal);
    });

    // Process {{$randomFloat(min,max)}} for random floats
    result = result.replace(/\{\{\$randomFloat\(([^,]+),([^)]+)\)\}\}/g, (match, min, max) => {
      const minVal = parseFloat(min);
      const maxVal = parseFloat(max);
      return String((Math.random() * (maxVal - minVal) + minVal).toFixed(2));
    });

    // Process {{$randomString(length)}} for random strings
    result = result.replace(/\{\{\$randomString\((\d+)\)\}\}/g, (match, length) => {
      return this.generateRandomString(parseInt(length, 10));
    });

    // Process {{$formatDate(json.field, format)}} for date formatting
    result = result.replace(/\{\{\$formatDate\(([^,]+),\s*"([^"]+)"\)\}\}/g, (match, valuePath, format) => {
      const value = valuePath.startsWith('json.') 
        ? this.getNestedValue(data, valuePath.substring(5))
        : valuePath;
      
      return this.formatDate(value, format);
    });

    // Process {{$formatNumber(json.field, decimals)}} for number formatting
    result = result.replace(/\{\{\$formatNumber\(([^,]+),\s*(\d+)\)\}\}/g, (match, valuePath, decimals) => {
      const value = valuePath.startsWith('json.') 
        ? this.getNestedValue(data, valuePath.substring(5))
        : parseFloat(valuePath);
      
      return this.formatNumber(value, parseInt(decimals, 10));
    });

    // Process {{$formatCurrency(json.field, currency)}} for currency formatting
    result = result.replace(/\{\{\$formatCurrency\(([^,]+),\s*"([^"]+)"\)\}\}/g, (match, valuePath, currency) => {
      const value = valuePath.startsWith('json.') 
        ? this.getNestedValue(data, valuePath.substring(5))
        : parseFloat(valuePath);
      
      return this.formatCurrency(value, currency);
    });

    // Process {{$uppercase(json.field)}} for uppercase conversion
    result = result.replace(/\{\{\$uppercase\(([^)]+)\)\}\}/g, (match, valuePath) => {
      const value = valuePath.startsWith('json.') 
        ? this.getNestedValue(data, valuePath.substring(5))
        : valuePath;
      
      return String(value).toUpperCase();
    });

    // Process {{$lowercase(json.field)}} for lowercase conversion
    result = result.replace(/\{\{\$lowercase\(([^)]+)\)\}\}/g, (match, valuePath) => {
      const value = valuePath.startsWith('json.') 
        ? this.getNestedValue(data, valuePath.substring(5))
        : valuePath;
      
      return String(value).toLowerCase();
    });

    // Process {{$substring(json.field, start, end)}} for substring extraction
    result = result.replace(/\{\{\$substring\(([^,]+),\s*(\d+),\s*(\d+)\)\}\}/g, (match, valuePath, start, end) => {
      const value = valuePath.startsWith('json.') 
        ? this.getNestedValue(data, valuePath.substring(5))
        : valuePath;
      
      return String(value).substring(parseInt(start, 10), parseInt(end, 10));
    });

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
    }
    
    return [...new Set(variables)]; // Remove duplicates
  }

  private isValidExpression(expr: string): boolean {
    // Valid patterns
    const patterns = [
      /^json\.[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*(\[\d+\])*$/, // json.field or json.field[0]
      /^ctx\.[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*$/, // ctx.field
      /^\$now$/, // $now
      /^\$uuid$/, // $uuid
      /^\$randomInt\(\d+,\d+\)$/, // $randomInt(1,100)
      /^\$randomFloat\([^,]+,[^)]+\)$/, // $randomFloat(1.0,100.0)
      /^\$randomString\(\d+\)$/, // $randomString(10)
      /^\$formatDate\([^,]+,\s*"[^"]+"\)$/, // $formatDate(json.field, "YYYY-MM-DD")
      /^\$formatNumber\([^,]+,\s*\d+\)$/, // $formatNumber(json.field, 2)
      /^\$formatCurrency\([^,]+,\s*"[^"]+"\)$/, // $formatCurrency(json.field, "USD")
      /^\$uppercase\([^)]+\)$/, // $uppercase(json.field)
      /^\$lowercase\([^)]+\)$/, // $lowercase(json.field)
      /^\$substring\([^,]+,\s*\d+,\s*\d+\)$/ // $substring(json.field, 0, 10)
    ];

    return patterns.some(pattern => pattern.test(expr));
  }

  private getNestedValue(obj: any, path: string): any {
    if (!obj || typeof obj !== 'object') {
      return undefined;
    }

    // Handle array access like field[0]
    if (path.includes('[')) {
      const arrayMatch = path.match(/^([^[]+)\[(\d+)\](.*)$/);
      if (arrayMatch) {
        const [, arrayPath, index, remainingPath] = arrayMatch;
        const arrayValue = this.getNestedValue(obj, arrayPath);
        if (Array.isArray(arrayValue)) {
          const item = arrayValue[parseInt(index, 10)];
          return remainingPath ? this.getNestedValue(item, remainingPath.substring(1)) : item;
        }
        return undefined;
      }
    }

    // Handle dot notation
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  private formatValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    return String(value);
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  private formatDate(value: any, format: string): string {
    try {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return String(value);
      }

      // Simple date formatting
      switch (format) {
        case 'YYYY-MM-DD':
          return date.toISOString().split('T')[0];
        case 'DD/MM/YYYY':
          return date.toLocaleDateString('en-GB');
        case 'MM/DD/YYYY':
          return date.toLocaleDateString('en-US');
        case 'YYYY-MM-DD HH:mm:ss':
          return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
        default:
          return date.toISOString();
      }
    } catch (error) {
      return String(value);
    }
  }

  private formatNumber(value: any, decimals: number): string {
    try {
      const num = parseFloat(value);
      if (isNaN(num)) {
        return String(value);
      }
      return num.toFixed(decimals);
    } catch (error) {
      return String(value);
    }
  }

  private formatCurrency(value: any, currency: string): string {
    try {
      const num = parseFloat(value);
      if (isNaN(num)) {
        return String(value);
      }
      
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.toUpperCase()
      }).format(num);
    } catch (error) {
      return String(value);
    }
  }
}