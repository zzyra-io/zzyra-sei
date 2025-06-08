import { BlockExecutionContext, BlockHandler } from '@zyra/types';
import { Logger } from '@nestjs/common';

/**
 * Calculator Handler
 * Performs arithmetic operations on input values
 * Supports basic math operations, percentages, and complex calculations
 */
export class CalculatorHandler implements BlockHandler {
  private readonly logger = new Logger(CalculatorHandler.name);

  async execute(node: any, ctx: BlockExecutionContext): Promise<any> {
    const cfg = (node.data as any).config;
    const { operation, inputs: calculatorInputs, formula, precision = 8 } = cfg;

    this.logger.log(
      `Executing Calculator operation: ${operation || 'formula'}`,
    );

    try {
      let result: number;

      if (formula) {
        // Custom formula execution
        result = this.executeFormula(formula, ctx.inputs || {});
      } else if (operation) {
        // Predefined operation
        result = this.executeOperation(
          operation,
          calculatorInputs,
          ctx.inputs || {},
        );
      } else {
        throw new Error('Either operation or formula must be specified');
      }

      // Apply precision
      const finalResult = Number(result.toFixed(precision));

      return {
        result: finalResult,
        formatted: this.formatNumber(finalResult),
        operation: operation || 'formula',
        inputs: ctx.inputs,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `Calculator operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Execute predefined operations
   */
  private executeOperation(
    operation: string,
    calculatorInputs: any,
    contextInputs: Record<string, any>,
  ): number {
    const resolvedInputs = this.resolveInputs(calculatorInputs, contextInputs);

    switch (operation) {
      case 'add':
        return this.add(resolvedInputs);
      case 'subtract':
        return this.subtract(resolvedInputs);
      case 'multiply':
        return this.multiply(resolvedInputs);
      case 'divide':
        return this.divide(resolvedInputs);
      case 'percentage':
        return this.percentage(resolvedInputs);
      case 'percentageOf':
        return this.percentageOf(resolvedInputs);
      case 'average':
        return this.average(resolvedInputs);
      case 'min':
        return this.min(resolvedInputs);
      case 'max':
        return this.max(resolvedInputs);
      case 'sum':
        return this.sum(resolvedInputs);
      case 'round':
        return this.round(resolvedInputs);
      case 'floor':
        return this.floor(resolvedInputs);
      case 'ceil':
        return this.ceil(resolvedInputs);
      case 'abs':
        return this.abs(resolvedInputs);
      case 'sqrt':
        return this.sqrt(resolvedInputs);
      case 'power':
        return this.power(resolvedInputs);
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  /**
   * Execute custom formula with template variables
   */
  private executeFormula(
    formula: string,
    contextInputs: Record<string, any>,
  ): number {
    // Replace template variables in formula
    const processedFormula = this.processTemplate(formula, contextInputs);

    // Validate formula for safety (only allow numbers, operators, and Math functions)
    if (!this.isValidFormula(processedFormula)) {
      throw new Error('Invalid formula: contains unsafe characters');
    }

    try {
      // Create safe math context
      const mathContext = {
        Math,
        abs: Math.abs,
        sqrt: Math.sqrt,
        pow: Math.pow,
        min: Math.min,
        max: Math.max,
        round: Math.round,
        floor: Math.floor,
        ceil: Math.ceil,
        sin: Math.sin,
        cos: Math.cos,
        tan: Math.tan,
        log: Math.log,
        exp: Math.exp,
      };

      // Evaluate formula safely
      const result = Function(
        ...Object.keys(mathContext),
        `return ${processedFormula}`,
      )(...Object.values(mathContext));

      if (typeof result !== 'number' || isNaN(result)) {
        throw new Error('Formula did not return a valid number');
      }

      return result;
    } catch (error) {
      throw new Error(
        `Formula evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Resolve input references to actual values
   */
  private resolveInputs(
    calculatorInputs: any,
    contextInputs: Record<string, any>,
  ): Record<string, number> {
    const resolved: Record<string, number> = {};

    for (const [key, value] of Object.entries(calculatorInputs)) {
      if (
        typeof value === 'string' &&
        value.startsWith('{{') &&
        value.endsWith('}}')
      ) {
        // Template variable reference
        const path = value.slice(2, -2).trim();
        const resolvedValue = this.getNestedValue(contextInputs, path);
        resolved[key] = this.toNumber(resolvedValue, path);
      } else {
        // Direct value
        resolved[key] = this.toNumber(value, key);
      }
    }

    return resolved;
  }

  /**
   * Convert value to number with error handling
   */
  private toNumber(value: any, context: string): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      if (isNaN(parsed)) {
        throw new Error(`Cannot convert '${value}' to number for ${context}`);
      }
      return parsed;
    }
    throw new Error(`Invalid number value for ${context}: ${value}`);
  }

  // Basic arithmetic operations
  private add(inputs: Record<string, number>): number {
    const values = Object.values(inputs);
    return values.reduce((sum, val) => sum + val, 0);
  }

  private subtract(inputs: Record<string, number>): number {
    const values = Object.values(inputs);
    if (values.length < 2)
      throw new Error('Subtract requires at least 2 values');
    return values.reduce((result, val, index) =>
      index === 0 ? val : result - val,
    );
  }

  private multiply(inputs: Record<string, number>): number {
    const values = Object.values(inputs);
    return values.reduce((product, val) => product * val, 1);
  }

  private divide(inputs: Record<string, number>): number {
    const values = Object.values(inputs);
    if (values.length < 2) throw new Error('Divide requires at least 2 values');
    return values.reduce((result, val, index) => {
      if (index === 0) return val;
      if (val === 0) throw new Error('Division by zero');
      return result / val;
    });
  }

  private percentage(inputs: Record<string, number>): number {
    const { value, percentage } = inputs;
    if (value === undefined || percentage === undefined) {
      throw new Error('Percentage requires value and percentage inputs');
    }
    return (value * percentage) / 100;
  }

  private percentageOf(inputs: Record<string, number>): number {
    const { part, whole } = inputs;
    if (part === undefined || whole === undefined) {
      throw new Error('PercentageOf requires part and whole inputs');
    }
    if (whole === 0) throw new Error('Cannot calculate percentage of zero');
    return (part / whole) * 100;
  }

  // Statistical operations
  private average(inputs: Record<string, number>): number {
    const values = Object.values(inputs);
    if (values.length === 0)
      throw new Error('Average requires at least 1 value');
    return this.sum(inputs) / values.length;
  }

  private min(inputs: Record<string, number>): number {
    const values = Object.values(inputs);
    if (values.length === 0) throw new Error('Min requires at least 1 value');
    return Math.min(...values);
  }

  private max(inputs: Record<string, number>): number {
    const values = Object.values(inputs);
    if (values.length === 0) throw new Error('Max requires at least 1 value');
    return Math.max(...values);
  }

  private sum(inputs: Record<string, number>): number {
    return Object.values(inputs).reduce((sum, val) => sum + val, 0);
  }

  // Math functions
  private round(inputs: Record<string, number>): number {
    const { value, decimals = 0 } = inputs;
    if (value === undefined) throw new Error('Round requires value input');
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  }

  private floor(inputs: Record<string, number>): number {
    const { value } = inputs;
    if (value === undefined) throw new Error('Floor requires value input');
    return Math.floor(value);
  }

  private ceil(inputs: Record<string, number>): number {
    const { value } = inputs;
    if (value === undefined) throw new Error('Ceil requires value input');
    return Math.ceil(value);
  }

  private abs(inputs: Record<string, number>): number {
    const { value } = inputs;
    if (value === undefined) throw new Error('Abs requires value input');
    return Math.abs(value);
  }

  private sqrt(inputs: Record<string, number>): number {
    const { value } = inputs;
    if (value === undefined) throw new Error('Sqrt requires value input');
    if (value < 0)
      throw new Error('Cannot take square root of negative number');
    return Math.sqrt(value);
  }

  private power(inputs: Record<string, number>): number {
    const { base, exponent } = inputs;
    if (base === undefined || exponent === undefined) {
      throw new Error('Power requires base and exponent inputs');
    }
    return Math.pow(base, exponent);
  }

  /**
   * Helper methods
   */
  private processTemplate(
    template: string,
    inputs: Record<string, any>,
  ): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      const value = this.getNestedValue(inputs, path);
      return value !== undefined ? String(value) : match;
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && typeof current === 'object' ? current[key] : undefined;
    }, obj);
  }

  private isValidFormula(formula: string): boolean {
    // Allow numbers, operators, parentheses, Math functions, and dots
    const validPattern = /^[0-9+\-*/.() \w]*$/;
    return (
      validPattern.test(formula) &&
      !formula.includes('eval') &&
      !formula.includes('function')
    );
  }

  private formatNumber(num: number): string {
    if (Number.isInteger(num)) {
      return num.toLocaleString();
    }

    // For decimal numbers, use appropriate precision
    if (Math.abs(num) >= 1) {
      return num.toLocaleString(undefined, { maximumFractionDigits: 8 });
    } else {
      // For small numbers, show significant digits
      return num.toPrecision(6);
    }
  }
}
