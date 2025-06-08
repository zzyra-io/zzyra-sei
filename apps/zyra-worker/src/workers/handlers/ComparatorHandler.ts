import { BlockExecutionContext, BlockHandler } from '@zyra/types';
import { Logger } from '@nestjs/common';

/**
 * Comparator Handler
 * Performs comparison operations between values
 * Supports all standard comparison operators and advanced conditions
 */
export class ComparatorHandler implements BlockHandler {
  private readonly logger = new Logger(ComparatorHandler.name);

  async execute(node: any, ctx: BlockExecutionContext): Promise<any> {
    const cfg = (node.data as any).config;
    const { operation, inputs: comparatorInputs, conditions, condition } = cfg;

    this.logger.log(
      `Executing Comparator operation: ${operation || 'legacy_condition'}`,
    );

    try {
      let result: boolean;

      if (condition && typeof condition === 'string') {
        // Legacy condition format: "price > targetPrice"
        result = this.evaluateLegacyCondition(condition, ctx.inputs || {});
      } else if (conditions && Array.isArray(conditions)) {
        // Multiple conditions with logical operators
        result = this.evaluateConditions(conditions, ctx.inputs || {});
      } else if (operation && comparatorInputs) {
        // Single operation
        result = this.executeComparison(
          operation,
          comparatorInputs,
          ctx.inputs || {},
        );
      } else {
        throw new Error(
          'Either operation, conditions, or condition must be specified',
        );
      }

      return {
        result,
        passed: result,
        operation: operation || 'conditions',
        inputs: ctx.inputs,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `Comparator operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Execute single comparison operation
   */
  private executeComparison(
    operation: string,
    comparatorInputs: any,
    contextInputs: Record<string, any>,
  ): boolean {
    const resolvedInputs = this.resolveInputs(comparatorInputs, contextInputs);

    switch (operation) {
      case 'equals':
      case 'eq':
        return this.equals(resolvedInputs);
      case 'not_equals':
      case 'neq':
        return this.notEquals(resolvedInputs);
      case 'greater_than':
      case 'gt':
        return this.greaterThan(resolvedInputs);
      case 'greater_than_or_equal':
      case 'gte':
        return this.greaterThanOrEqual(resolvedInputs);
      case 'less_than':
      case 'lt':
        return this.lessThan(resolvedInputs);
      case 'less_than_or_equal':
      case 'lte':
        return this.lessThanOrEqual(resolvedInputs);
      case 'between':
        return this.between(resolvedInputs);
      case 'not_between':
        return this.notBetween(resolvedInputs);
      case 'in':
        return this.inArray(resolvedInputs);
      case 'not_in':
        return this.notInArray(resolvedInputs);
      case 'contains':
        return this.contains(resolvedInputs);
      case 'not_contains':
        return this.notContains(resolvedInputs);
      case 'starts_with':
        return this.startsWith(resolvedInputs);
      case 'ends_with':
        return this.endsWith(resolvedInputs);
      case 'is_null':
        return this.isNull(resolvedInputs);
      case 'is_not_null':
        return this.isNotNull(resolvedInputs);
      case 'is_empty':
        return this.isEmpty(resolvedInputs);
      case 'is_not_empty':
        return this.isNotEmpty(resolvedInputs);
      case 'regex_match':
        return this.regexMatch(resolvedInputs);
      default:
        throw new Error(`Unknown comparison operation: ${operation}`);
    }
  }

  /**
   * Evaluate legacy condition format like "price > targetPrice"
   */
  private evaluateLegacyCondition(
    condition: string,
    contextInputs: Record<string, any>,
  ): boolean {
    // Parse simple expressions like "price > targetPrice"
    const operators = ['>=', '<=', '>', '<', '==', '!=', '='];
    let operator = '';
    let left = '';
    let right = '';

    // Find the operator
    for (const op of operators) {
      if (condition.includes(op)) {
        operator = op;
        const parts = condition.split(op);
        if (parts.length === 2) {
          left = parts[0].trim();
          right = parts[1].trim();
          break;
        }
      }
    }

    if (!operator || !left || !right) {
      throw new Error(`Unable to parse condition: ${condition}`);
    }

    // Resolve values from context
    const leftValue = this.resolveLegacyValue(left, contextInputs);
    const rightValue = this.resolveLegacyValue(right, contextInputs);

    // Perform comparison
    switch (operator) {
      case '>':
        return this.compareValues(leftValue, rightValue) > 0;
      case '>=':
        return this.compareValues(leftValue, rightValue) >= 0;
      case '<':
        return this.compareValues(leftValue, rightValue) < 0;
      case '<=':
        return this.compareValues(leftValue, rightValue) <= 0;
      case '=':
      case '==':
        return this.compareValues(leftValue, rightValue) === 0;
      case '!=':
        return this.compareValues(leftValue, rightValue) !== 0;
      default:
        throw new Error(`Unsupported operator: ${operator}`);
    }
  }

  /**
   * Resolve a value from legacy condition expression
   */
  private resolveLegacyValue(
    value: string,
    contextInputs: Record<string, any>,
  ): any {
    // Check if it's a number
    if (!isNaN(Number(value))) {
      return Number(value);
    }

    // Check if it's a quoted string
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      return value.slice(1, -1);
    }

    // Otherwise, treat as a variable reference
    // Look for it in the context inputs
    return this.findValueInContext(value, contextInputs);
  }

  /**
   * Find a value in the context inputs by variable name
   */
  private findValueInContext(
    variableName: string,
    contextInputs: Record<string, any>,
  ): any {
    // First check direct property names
    for (const [nodeId, nodeOutputs] of Object.entries(contextInputs)) {
      if (typeof nodeOutputs === 'object' && nodeOutputs !== null) {
        // Check for the variable name as a property
        if (variableName in nodeOutputs) {
          return nodeOutputs[variableName];
        }
        // Check for common price-related properties
        if (variableName === 'price' && 'currentPrice' in nodeOutputs) {
          return nodeOutputs.currentPrice;
        }
        if (variableName === 'targetPrice' && 'targetPrice' in nodeOutputs) {
          return nodeOutputs.targetPrice;
        }
      }
    }

    // If not found, return the variable name as-is (might be a literal)
    this.logger.warn(
      `Variable '${variableName}' not found in context, using as literal`,
    );
    return variableName;
  }

  /**
   * Evaluate multiple conditions with logical operators
   */
  private evaluateConditions(
    conditions: any[],
    contextInputs: Record<string, any>,
  ): boolean {
    if (conditions.length === 0) return true;
    if (conditions.length === 1) {
      const condition = conditions[0];
      return this.executeComparison(
        condition.operation,
        condition.inputs,
        contextInputs,
      );
    }

    // Handle logical operators between conditions
    let result = this.executeComparison(
      conditions[0].operation,
      conditions[0].inputs,
      contextInputs,
    );

    for (let i = 1; i < conditions.length; i++) {
      const condition = conditions[i];
      const conditionResult = this.executeComparison(
        condition.operation,
        condition.inputs,
        contextInputs,
      );
      const logicalOperator = conditions[i - 1].logicalOperator || 'and';

      switch (logicalOperator.toLowerCase()) {
        case 'and':
        case '&&':
          result = result && conditionResult;
          break;
        case 'or':
        case '||':
          result = result || conditionResult;
          break;
        default:
          throw new Error(`Unknown logical operator: ${logicalOperator}`);
      }
    }

    return result;
  }

  /**
   * Resolve input references to actual values
   */
  private resolveInputs(
    comparatorInputs: any,
    contextInputs: Record<string, any>,
  ): Record<string, any> {
    const resolved: Record<string, any> = {};

    for (const [key, value] of Object.entries(comparatorInputs)) {
      if (
        typeof value === 'string' &&
        value.startsWith('{{') &&
        value.endsWith('}}')
      ) {
        // Template variable reference
        const path = value.slice(2, -2).trim();
        resolved[key] = this.getNestedValue(contextInputs, path);
      } else {
        // Direct value
        resolved[key] = value;
      }
    }

    return resolved;
  }

  // Comparison operations
  private equals(inputs: Record<string, any>): boolean {
    const { left, right } = inputs;
    if (left === undefined || right === undefined) {
      throw new Error('Equals requires left and right inputs');
    }
    return this.compareValues(left, right) === 0;
  }

  private notEquals(inputs: Record<string, any>): boolean {
    return !this.equals(inputs);
  }

  private greaterThan(inputs: Record<string, any>): boolean {
    const { left, right } = inputs;
    if (left === undefined || right === undefined) {
      throw new Error('GreaterThan requires left and right inputs');
    }
    return this.compareValues(left, right) > 0;
  }

  private greaterThanOrEqual(inputs: Record<string, any>): boolean {
    const { left, right } = inputs;
    if (left === undefined || right === undefined) {
      throw new Error('GreaterThanOrEqual requires left and right inputs');
    }
    return this.compareValues(left, right) >= 0;
  }

  private lessThan(inputs: Record<string, any>): boolean {
    const { left, right } = inputs;
    if (left === undefined || right === undefined) {
      throw new Error('LessThan requires left and right inputs');
    }
    return this.compareValues(left, right) < 0;
  }

  private lessThanOrEqual(inputs: Record<string, any>): boolean {
    const { left, right } = inputs;
    if (left === undefined || right === undefined) {
      throw new Error('LessThanOrEqual requires left and right inputs');
    }
    return this.compareValues(left, right) <= 0;
  }

  private between(inputs: Record<string, any>): boolean {
    const { value, min, max } = inputs;
    if (value === undefined || min === undefined || max === undefined) {
      throw new Error('Between requires value, min, and max inputs');
    }
    const numValue = this.toNumber(value);
    const numMin = this.toNumber(min);
    const numMax = this.toNumber(max);
    return numValue >= numMin && numValue <= numMax;
  }

  private notBetween(inputs: Record<string, any>): boolean {
    return !this.between(inputs);
  }

  private inArray(inputs: Record<string, any>): boolean {
    const { value, array } = inputs;
    if (value === undefined || !Array.isArray(array)) {
      throw new Error('In requires value and array inputs');
    }
    return array.includes(value);
  }

  private notInArray(inputs: Record<string, any>): boolean {
    return !this.inArray(inputs);
  }

  private contains(inputs: Record<string, any>): boolean {
    const { text, substring } = inputs;
    if (text === undefined || substring === undefined) {
      throw new Error('Contains requires text and substring inputs');
    }
    return String(text).includes(String(substring));
  }

  private notContains(inputs: Record<string, any>): boolean {
    return !this.contains(inputs);
  }

  private startsWith(inputs: Record<string, any>): boolean {
    const { text, prefix } = inputs;
    if (text === undefined || prefix === undefined) {
      throw new Error('StartsWith requires text and prefix inputs');
    }
    return String(text).startsWith(String(prefix));
  }

  private endsWith(inputs: Record<string, any>): boolean {
    const { text, suffix } = inputs;
    if (text === undefined || suffix === undefined) {
      throw new Error('EndsWith requires text and suffix inputs');
    }
    return String(text).endsWith(String(suffix));
  }

  private isNull(inputs: Record<string, any>): boolean {
    const { value } = inputs;
    return value === null || value === undefined;
  }

  private isNotNull(inputs: Record<string, any>): boolean {
    return !this.isNull(inputs);
  }

  private isEmpty(inputs: Record<string, any>): boolean {
    const { value } = inputs;
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  }

  private isNotEmpty(inputs: Record<string, any>): boolean {
    return !this.isEmpty(inputs);
  }

  private regexMatch(inputs: Record<string, any>): boolean {
    const { text, pattern, flags = '' } = inputs;
    if (text === undefined || pattern === undefined) {
      throw new Error('RegexMatch requires text and pattern inputs');
    }
    try {
      const regex = new RegExp(String(pattern), String(flags));
      return regex.test(String(text));
    } catch (error) {
      throw new Error(`Invalid regex pattern: ${pattern}`);
    }
  }

  /**
   * Helper methods
   */
  private compareValues(left: any, right: any): number {
    // Handle null/undefined
    if (left === null || left === undefined) {
      if (right === null || right === undefined) return 0;
      return -1;
    }
    if (right === null || right === undefined) return 1;

    // Both numbers
    if (typeof left === 'number' && typeof right === 'number') {
      return left - right;
    }

    // Try to convert to numbers if possible
    const leftNum = Number(left);
    const rightNum = Number(right);
    if (!isNaN(leftNum) && !isNaN(rightNum)) {
      return leftNum - rightNum;
    }

    // String comparison
    const leftStr = String(left);
    const rightStr = String(right);
    if (leftStr < rightStr) return -1;
    if (leftStr > rightStr) return 1;
    return 0;
  }

  private toNumber(value: any): number {
    if (typeof value === 'number') return value;
    const parsed = Number(value);
    if (isNaN(parsed)) {
      throw new Error(`Cannot convert '${value}' to number`);
    }
    return parsed;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && typeof current === 'object' ? current[key] : undefined;
    }, obj);
  }
}
