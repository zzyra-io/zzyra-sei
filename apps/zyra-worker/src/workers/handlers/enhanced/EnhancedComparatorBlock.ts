import {
  EnhancedBlockHandler,
  EnhancedBlockDefinition,
  EnhancedBlockExecutionContext,
  ZyraNodeData,
  BlockType,
  BlockGroup,
  ConnectionType,
  PropertyType,
  ValidationResult,
  getBlockType,
  getBlockMetadata,
} from '@zzyra/types';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EnhancedComparatorBlock implements EnhancedBlockHandler {
  private readonly logger = new Logger(EnhancedComparatorBlock.name);

  definition: EnhancedBlockDefinition = {
    displayName: 'Comparator',
    name: BlockType.CONDITION,
    version: 1,
    description:
      'Compare two values and return a boolean result for conditional logic',
    icon: 'compare-arrows',
    color: '#10B981',
    group: [BlockGroup.CONDITION],
    inputs: [ConnectionType.MAIN],
    outputs: [ConnectionType.MAIN],

    properties: [
      {
        displayName: 'Left Value',
        name: 'leftValue',
        type: PropertyType.STRING,
        required: true,
        description:
          'The left operand for comparison. Supports template variables like {{json.field}}',
        default: '',
      },
      {
        displayName: 'Operator',
        name: 'operator',
        type: PropertyType.OPTIONS,
        required: true,
        description: 'The comparison operator to use',
        default: 'equals',
        options: [
          { name: 'Equals', value: 'equals' },
          { name: 'Not Equals', value: 'notEquals' },
          { name: 'Greater Than', value: 'greaterThan' },
          { name: 'Greater Than or Equal', value: 'greaterThanOrEqual' },
          { name: 'Less Than', value: 'lessThan' },
          { name: 'Less Than or Equal', value: 'lessThanOrEqual' },
          { name: 'Contains', value: 'contains' },
          { name: 'Not Contains', value: 'notContains' },
          { name: 'Starts With', value: 'startsWith' },
          { name: 'Ends With', value: 'endsWith' },
          { name: 'Is Empty', value: 'isEmpty' },
          { name: 'Is Not Empty', value: 'isNotEmpty' },
          { name: 'Regex Match', value: 'regex' },
        ],
      },
      {
        displayName: 'Right Value',
        name: 'rightValue',
        type: PropertyType.STRING,
        description:
          'The right operand for comparison. Supports template variables like {{json.field}}',
        default: '',
        displayOptions: {
          hide: {
            operator: ['isEmpty', 'isNotEmpty'],
          },
        },
      },
      {
        displayName: 'Data Type',
        name: 'dataType',
        type: PropertyType.OPTIONS,
        description: 'How to interpret the values for comparison',
        default: 'string',
        options: [
          { name: 'String', value: 'string' },
          { name: 'Number', value: 'number' },
          { name: 'Boolean', value: 'boolean' },
          { name: 'Date', value: 'date' },
          { name: 'Auto Detect', value: 'auto' },
        ],
      },
      {
        displayName: 'Case Sensitive',
        name: 'caseSensitive',
        type: PropertyType.BOOLEAN,
        description: 'Whether string comparisons should be case sensitive',
        default: true,
        displayOptions: {
          show: {
            operator: [
              'equals',
              'notEquals',
              'contains',
              'notContains',
              'startsWith',
              'endsWith',
              'regex',
            ],
          },
        },
      },
      {
        displayName: 'Continue on False',
        name: 'continueOnFalse',
        type: PropertyType.BOOLEAN,
        description:
          'Whether to continue workflow execution when condition is false',
        default: false,
      },
      {
        displayName: 'Output Mode',
        name: 'outputMode',
        type: PropertyType.OPTIONS,
        description: 'What to output when condition is evaluated',
        default: 'onlyTrue',
        options: [
          { name: 'Only True Results', value: 'onlyTrue' },
          { name: 'Only False Results', value: 'onlyFalse' },
          { name: 'All Results', value: 'all' },
          { name: 'Pass Through Original', value: 'passThrough' },
        ],
      },
    ],

    documentation: {
      examples: [
        {
          name: 'Number Comparison',
          description: 'Check if a price is below a threshold',
          workflow: {
            nodes: [
              {
                parameters: {
                  leftValue: '{{json.price}}',
                  operator: 'lessThan',
                  rightValue: '2000',
                  dataType: 'number',
                },
              },
            ],
          },
        },
        {
          name: 'String Contains',
          description: 'Check if a message contains specific text',
          workflow: {
            nodes: [
              {
                parameters: {
                  leftValue: '{{json.message}}',
                  operator: 'contains',
                  rightValue: 'error',
                  dataType: 'string',
                  caseSensitive: false,
                },
              },
            ],
          },
        },
      ],
      resources: [
        {
          url: 'https://docs.zzyra.com/blocks/comparator',
          text: 'Comparator Block Documentation',
        },
      ],
    },
  };

  async execute(
    context: EnhancedBlockExecutionContext,
  ): Promise<ZyraNodeData[]> {
    const inputData = context.getInputData();
    const returnData: ZyraNodeData[] = [];

    // If no input data, create a single empty item
    const items = inputData.length > 0 ? inputData : [{ json: {} }];

    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      const item = items[itemIndex];

      try {
        // Get node parameters
        const leftValue = context.getNodeParameter(
          'leftValue',
          itemIndex,
        ) as string;
        const operator = context.getNodeParameter(
          'operator',
          itemIndex,
        ) as string;
        const rightValue = context.getNodeParameter(
          'rightValue',
          itemIndex,
        ) as string;
        const dataType = context.getNodeParameter(
          'dataType',
          itemIndex,
        ) as string;
        const caseSensitive = context.getNodeParameter(
          'caseSensitive',
          itemIndex,
        ) as boolean;
        const continueOnFalse = context.getNodeParameter(
          'continueOnFalse',
          itemIndex,
        ) as boolean;
        const outputMode = context.getNodeParameter(
          'outputMode',
          itemIndex,
        ) as string;

        // Process template variables
        const processedLeftValue = context.helpers.processTemplate(
          leftValue,
          item.json,
        );
        const processedRightValue = rightValue
          ? context.helpers.processTemplate(rightValue, item.json)
          : '';

        // Convert values to appropriate types
        const [leftVal, rightVal] = this.convertValues(
          processedLeftValue,
          processedRightValue,
          dataType,
        );

        // Perform comparison
        const result = this.compare(leftVal, rightVal, operator, caseSensitive);

        // Create output based on result and output mode
        const outputData: ZyraNodeData = {
          json: {
            result,
            leftValue: leftVal,
            rightValue: rightVal,
            operator,
            dataType,
            caseSensitive,
            timestamp: new Date().toISOString(),
            evaluation: this.getEvaluationDescription(
              leftVal,
              rightVal,
              operator,
              result,
            ),
          },
        };

        // Add original data for pass-through mode
        if (outputMode === 'passThrough') {
          outputData.json = { ...item.json, ...outputData.json };
        }

        // Filter output based on mode
        const shouldInclude = this.shouldIncludeOutput(result, outputMode);

        if (shouldInclude) {
          returnData.push(outputData);
        } else if (continueOnFalse && !result) {
          // Include item with false result if continue on false is enabled
          returnData.push(outputData);
        }

        this.logger.debug(
          `Comparison result for item ${itemIndex}: ${result}`,
          {
            leftValue: leftVal,
            rightValue: rightVal,
            operator,
            result,
            executionId: context.executionId,
          },
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const errorName = error instanceof Error ? error.name : 'UnknownError';

        this.logger.error(`Comparison failed for item ${itemIndex}`, {
          error: errorMessage,
          executionId: context.executionId,
        });

        // Create error output
        const errorOutput: ZyraNodeData = {
          json: {
            result: false,
            error: errorMessage,
            timestamp: new Date().toISOString(),
          },
          error: {
            message: errorMessage,
            name: errorName,
            timestamp: new Date().toISOString(),
            context: { itemIndex },
          },
        };

        returnData.push(errorOutput);
      }
    }

    return returnData;
  }

  private convertValues(
    leftValue: any,
    rightValue: any,
    dataType: string,
  ): [any, any] {
    if (dataType === 'auto') {
      // Auto-detect data type
      dataType = this.detectDataType(leftValue);
    }

    switch (dataType) {
      case 'number':
        return [this.toNumber(leftValue), this.toNumber(rightValue)];

      case 'boolean':
        return [this.toBoolean(leftValue), this.toBoolean(rightValue)];

      case 'date':
        return [this.toDate(leftValue), this.toDate(rightValue)];

      case 'string':
      default:
        return [String(leftValue), String(rightValue)];
    }
  }

  private detectDataType(value: any): string {
    if (
      typeof value === 'number' ||
      (!isNaN(Number(value)) && !isNaN(parseFloat(value)))
    ) {
      return 'number';
    }

    if (typeof value === 'boolean' || value === 'true' || value === 'false') {
      return 'boolean';
    }

    if (value instanceof Date || !isNaN(Date.parse(value))) {
      return 'date';
    }

    return 'string';
  }

  private toNumber(value: any): number {
    if (typeof value === 'number') return value;
    const num = Number(value);
    if (isNaN(num)) throw new Error(`Cannot convert "${value}" to number`);
    return num;
  }

  private toBoolean(value: any): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  }

  private toDate(value: any): Date {
    if (value instanceof Date) return value;
    const date = new Date(value);
    if (isNaN(date.getTime()))
      throw new Error(`Cannot convert "${value}" to date`);
    return date;
  }

  private compare(
    leftValue: any,
    rightValue: any,
    operator: string,
    caseSensitive: boolean,
  ): boolean {
    // Handle string case sensitivity
    if (
      typeof leftValue === 'string' &&
      typeof rightValue === 'string' &&
      !caseSensitive
    ) {
      leftValue = leftValue.toLowerCase();
      rightValue = rightValue.toLowerCase();
    }

    switch (operator) {
      case 'equals':
        return leftValue === rightValue;

      case 'notEquals':
        return leftValue !== rightValue;

      case 'greaterThan':
        return leftValue > rightValue;

      case 'greaterThanOrEqual':
        return leftValue >= rightValue;

      case 'lessThan':
        return leftValue < rightValue;

      case 'lessThanOrEqual':
        return leftValue <= rightValue;

      case 'contains':
        return String(leftValue).includes(String(rightValue));

      case 'notContains':
        return !String(leftValue).includes(String(rightValue));

      case 'startsWith':
        return String(leftValue).startsWith(String(rightValue));

      case 'endsWith':
        return String(leftValue).endsWith(String(rightValue));

      case 'isEmpty':
        return (
          leftValue == null ||
          leftValue === '' ||
          (Array.isArray(leftValue) && leftValue.length === 0)
        );

      case 'isNotEmpty':
        return !(
          leftValue == null ||
          leftValue === '' ||
          (Array.isArray(leftValue) && leftValue.length === 0)
        );

      case 'regex':
        try {
          const regex = new RegExp(
            String(rightValue),
            caseSensitive ? 'g' : 'gi',
          );
          return regex.test(String(leftValue));
        } catch (error) {
          throw new Error(`Invalid regex pattern: ${rightValue}`);
        }

      default:
        throw new Error(`Unsupported operator: ${operator}`);
    }
  }

  private shouldIncludeOutput(result: boolean, outputMode: string): boolean {
    switch (outputMode) {
      case 'onlyTrue':
        return result === true;

      case 'onlyFalse':
        return result === false;

      case 'all':
      case 'passThrough':
        return true;

      default:
        return result === true;
    }
  }

  private getEvaluationDescription(
    leftValue: any,
    rightValue: any,
    operator: string,
    result: boolean,
  ): string {
    const operatorSymbols = {
      equals: '==',
      notEquals: '!=',
      greaterThan: '>',
      greaterThanOrEqual: '>=',
      lessThan: '<',
      lessThanOrEqual: '<=',
      contains: 'contains',
      notContains: 'not contains',
      startsWith: 'starts with',
      endsWith: 'ends with',
      isEmpty: 'is empty',
      isNotEmpty: 'is not empty',
      regex: 'matches regex',
    };

    const symbol = operatorSymbols[operator] || operator;

    if (operator === 'isEmpty' || operator === 'isNotEmpty') {
      return `"${leftValue}" ${symbol} = ${result}`;
    }

    return `"${leftValue}" ${symbol} "${rightValue}" = ${result}`;
  }

  async validate(config: Record<string, any>): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required fields
    if (!config.leftValue) {
      errors.push('Left value is required');
    }

    if (!config.operator) {
      errors.push('Operator is required');
    }

    // Validate right value for operators that need it
    const operatorsRequiringRightValue = [
      'equals',
      'notEquals',
      'greaterThan',
      'greaterThanOrEqual',
      'lessThan',
      'lessThanOrEqual',
      'contains',
      'notContains',
      'startsWith',
      'endsWith',
      'regex',
    ];

    if (
      operatorsRequiringRightValue.includes(config.operator) &&
      !config.rightValue
    ) {
      errors.push('Right value is required for this operator');
    }

    // Validate regex pattern
    if (config.operator === 'regex' && config.rightValue) {
      try {
        new RegExp(config.rightValue);
      } catch (error) {
        errors.push('Invalid regex pattern in right value');
      }
    }

    // Warnings
    if (config.dataType === 'auto') {
      warnings.push('Auto data type detection may not always be accurate');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
