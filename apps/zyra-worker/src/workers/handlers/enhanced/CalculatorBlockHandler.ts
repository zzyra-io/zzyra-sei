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
} from '@zyra/types';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CalculatorBlockHandler implements EnhancedBlockHandler {
  private readonly logger = new Logger(CalculatorBlockHandler.name);

  definition: EnhancedBlockDefinition = {
    displayName: 'Calculator',
    name: 'CALCULATOR' as BlockType,
    version: 1,
    description: 'Perform mathematical operations on numeric values',
    icon: 'calculate',
    color: '#3B82F6',
    group: [BlockGroup.UTILITY],
    inputs: [ConnectionType.MAIN],
    outputs: [ConnectionType.MAIN],

    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: PropertyType.OPTIONS,
        required: true,
        description: 'The mathematical operation to perform',
        default: 'add',
        options: [
          { name: 'Add', value: 'add' },
          { name: 'Subtract', value: 'subtract' },
          { name: 'Multiply', value: 'multiply' },
          { name: 'Divide', value: 'divide' },
          { name: 'Power', value: 'power' },
          { name: 'Modulo', value: 'modulo' },
          { name: 'Absolute', value: 'absolute' },
          { name: 'Round', value: 'round' },
          { name: 'Floor', value: 'floor' },
          { name: 'Ceiling', value: 'ceiling' },
        ],
      },
      {
        displayName: 'Value A',
        name: 'a',
        type: PropertyType.STRING,
        required: true,
        description:
          'First operand. Supports template variables like {{json.field}}',
        default: '0',
      },
      {
        displayName: 'Value B',
        name: 'b',
        type: PropertyType.STRING,
        description:
          'Second operand. Supports template variables like {{json.field}}',
        default: '0',
        displayOptions: {
          hide: {
            operation: ['absolute', 'round', 'floor', 'ceiling'],
          },
        },
      },
      {
        displayName: 'Precision',
        name: 'precision',
        type: PropertyType.NUMBER,
        description: 'Number of decimal places for the result',
        default: 6,
      },
    ],
  };

  async execute(
    context: EnhancedBlockExecutionContext,
  ): Promise<ZyraNodeData[]> {
    const inputData = context.getInputData();
    const returnData: ZyraNodeData[] = [];

    const items = inputData.length > 0 ? inputData : [{ json: {} }];

    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      const item = items[itemIndex];

      try {
        const operation = context.getNodeParameter(
          'operation',
          itemIndex,
        ) as string;
        const valueAStr = context.getNodeParameter('a', itemIndex) as string;
        const valueBStr = context.getNodeParameter('b', itemIndex) as string;
        const precision = context.getNodeParameter(
          'precision',
          itemIndex,
        ) as number;

        const processedValueA = context.helpers.processTemplate(
          valueAStr,
          item.json,
        );
        const processedValueB = valueBStr
          ? context.helpers.processTemplate(valueBStr, item.json)
          : '0';

        const valueA = this.parseNumber(processedValueA);
        const valueB = this.parseNumber(processedValueB);

        const result = this.performCalculation(
          operation,
          valueA,
          valueB,
          precision,
        );

        const outputData: ZyraNodeData = {
          json: {
            result,
            operation,
            valueA,
            valueB,
            precision,
            timestamp: new Date().toISOString(),
          },
          pairedItem: { item: itemIndex },
        };

        returnData.push(outputData);

        this.logger.debug(
          `Calculator operation ${operation} completed for item ${itemIndex}`,
          {
            operation,
            valueA,
            valueB,
            result,
            executionId: context.executionId,
          },
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        this.logger.error(`Calculator operation failed for item ${itemIndex}`, {
          error: errorMessage,
          executionId: context.executionId,
        });

        const errorOutput: ZyraNodeData = {
          json: {
            result: 0,
            error: errorMessage,
            timestamp: new Date().toISOString(),
          },
          pairedItem: { item: itemIndex },
          error: {
            message: errorMessage,
            name: error instanceof Error ? error.name : 'CalculatorError',
            timestamp: new Date().toISOString(),
            context: { itemIndex },
          },
        };

        returnData.push(errorOutput);
      }
    }

    return returnData;
  }

  private parseNumber(value: any): number {
    if (typeof value === 'number') {
      return value;
    }

    const parsed = parseFloat(String(value));
    if (isNaN(parsed)) {
      throw new Error(`Cannot convert "${value}" to number`);
    }

    return parsed;
  }

  private performCalculation(
    operation: string,
    valueA: number,
    valueB: number,
    precision: number,
  ): number {
    let result: number;

    switch (operation) {
      case 'add':
        result = valueA + valueB;
        break;
      case 'subtract':
        result = valueA - valueB;
        break;
      case 'multiply':
        result = valueA * valueB;
        break;
      case 'divide':
        if (valueB === 0) {
          throw new Error('Division by zero is not allowed');
        }
        result = valueA / valueB;
        break;
      case 'power':
        result = Math.pow(valueA, valueB);
        break;
      case 'modulo':
        if (valueB === 0) {
          throw new Error('Modulo by zero is not allowed');
        }
        result = valueA % valueB;
        break;
      case 'absolute':
        result = Math.abs(valueA);
        break;
      case 'round':
        result = Math.round(valueA);
        break;
      case 'floor':
        result = Math.floor(valueA);
        break;
      case 'ceiling':
        result = Math.ceil(valueA);
        break;
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }

    return Number(result.toFixed(precision));
  }

  async validate(config: Record<string, any>): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config.operation) {
      errors.push('Operation is required');
    }

    if (!config.a && config.a !== 0) {
      errors.push('Value A is required');
    }

    const singleValueOperations = ['absolute', 'round', 'floor', 'ceiling'];
    if (
      !singleValueOperations.includes(config.operation) &&
      !config.b &&
      config.b !== 0
    ) {
      errors.push('Value B is required for this operation');
    }

    if (config.precision && (config.precision < 0 || config.precision > 20)) {
      warnings.push('Precision should be between 0 and 20 decimal places');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
