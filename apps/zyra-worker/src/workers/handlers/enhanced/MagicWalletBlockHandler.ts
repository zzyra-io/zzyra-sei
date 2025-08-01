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
export class MagicWalletBlockHandler implements EnhancedBlockHandler {
  private readonly logger = new Logger(MagicWalletBlockHandler.name);

  definition: EnhancedBlockDefinition = {
    displayName: 'Magic Wallet',
    name: 'MAGIC_WALLET' as BlockType,
    version: 1,
    description: 'Interact with Magic wallet for blockchain operations',
    icon: 'wallet',
    color: '#8B5CF6',
    group: [BlockGroup.ACTION],
    inputs: [ConnectionType.MAIN],
    outputs: [ConnectionType.MAIN],

    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: PropertyType.OPTIONS,
        required: true,
        description: 'The wallet operation to perform',
        default: 'get_balance',
        options: [
          { name: 'Get Balance', value: 'get_balance' },
          { name: 'Prepare Transaction', value: 'prepare_transaction' },
          { name: 'Send Transaction', value: 'send_transaction' },
          { name: 'Get Address', value: 'get_address' },
        ],
      },
      {
        displayName: 'User ID',
        name: 'userId',
        type: PropertyType.STRING,
        description: 'Magic wallet user ID. Supports template variables',
        default: '{{userId}}',
        displayOptions: {
          show: {
            operation: [
              'get_balance',
              'prepare_transaction',
              'send_transaction',
            ],
          },
        },
      },
      {
        displayName: 'Asset',
        name: 'asset',
        type: PropertyType.STRING,
        description: 'The asset symbol (e.g., ETH, BTC)',
        default: 'ETH',
        displayOptions: {
          show: {
            operation: [
              'get_balance',
              'prepare_transaction',
              'send_transaction',
            ],
          },
        },
      },
      {
        displayName: 'Chain ID',
        name: 'chainId',
        type: PropertyType.NUMBER,
        description: 'Blockchain network chain ID',
        default: 1,
        displayOptions: {
          show: {
            operation: [
              'get_balance',
              'prepare_transaction',
              'send_transaction',
            ],
          },
        },
      },
      {
        displayName: 'To Address',
        name: 'to',
        type: PropertyType.STRING,
        description: 'Recipient address for transaction',
        default: '',
        displayOptions: {
          show: {
            operation: ['prepare_transaction', 'send_transaction'],
          },
        },
      },
      {
        displayName: 'Value',
        name: 'value',
        type: PropertyType.STRING,
        description: 'Amount to send. Supports template variables',
        default: '0',
        displayOptions: {
          show: {
            operation: ['prepare_transaction', 'send_transaction'],
          },
        },
      },
      {
        displayName: 'Data',
        name: 'data',
        type: PropertyType.STRING,
        description: 'Transaction data (hex string)',
        default: '0x',
        displayOptions: {
          show: {
            operation: ['prepare_transaction', 'send_transaction'],
          },
        },
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

        let result: any;

        switch (operation) {
          case 'get_balance':
            result = await this.getBalance(context, item, itemIndex);
            break;
          case 'prepare_transaction':
            result = await this.prepareTransaction(context, item, itemIndex);
            break;
          case 'send_transaction':
            result = await this.sendTransaction(context, item, itemIndex);
            break;
          case 'get_address':
            result = await this.getAddress(context, item, itemIndex);
            break;
          default:
            throw new Error(`Unsupported operation: ${operation}`);
        }

        const outputData: ZyraNodeData = {
          json: {
            ...result,
            operation,
            timestamp: new Date().toISOString(),
          },
          pairedItem: { item: itemIndex },
        };

        returnData.push(outputData);

        this.logger.debug(
          `Magic wallet operation ${operation} completed for item ${itemIndex}`,
          {
            operation,
            result,
            executionId: context.executionId,
          },
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        this.logger.error(
          `Magic wallet operation failed for item ${itemIndex}`,
          {
            error: errorMessage,
            executionId: context.executionId,
          },
        );

        const errorOutput: ZyraNodeData = {
          json: {
            success: false,
            error: errorMessage,
            timestamp: new Date().toISOString(),
          },
          pairedItem: { item: itemIndex },
          error: {
            message: errorMessage,
            name: error instanceof Error ? error.name : 'MagicWalletError',
            timestamp: new Date().toISOString(),
            context: { itemIndex },
          },
        };

        returnData.push(errorOutput);
      }
    }

    return returnData;
  }

  private async getBalance(
    context: EnhancedBlockExecutionContext,
    item: ZyraNodeData,
    itemIndex: number,
  ): Promise<any> {
    const userIdStr = context.getNodeParameter('userId', itemIndex) as string;
    const asset = context.getNodeParameter('asset', itemIndex) as string;
    const chainId = context.getNodeParameter('chainId', itemIndex) as number;

    const processedUserId = context.helpers.processTemplate(
      userIdStr,
      item.json,
    );

    this.logger.debug('Getting wallet balance (mock)', {
      userId: processedUserId,
      asset,
      chainId,
    });

    // Mock balance data for now
    const mockBalance =
      asset === 'ETH' ? '1.5' : asset === 'SEI' ? '100.0' : '0.0';

    return {
      success: true,
      balance: mockBalance,
      asset,
      chainId,
      userId: processedUserId,
    };
  }

  private async prepareTransaction(
    context: EnhancedBlockExecutionContext,
    item: ZyraNodeData,
    itemIndex: number,
  ): Promise<any> {
    const userIdStr = context.getNodeParameter('userId', itemIndex) as string;
    const asset = context.getNodeParameter('asset', itemIndex) as string;
    const chainId = context.getNodeParameter('chainId', itemIndex) as number;
    const to = context.getNodeParameter('to', itemIndex) as string;
    const valueStr = context.getNodeParameter('value', itemIndex) as string;
    const data = context.getNodeParameter('data', itemIndex) as string;

    const processedUserId = context.helpers.processTemplate(
      userIdStr,
      item.json,
    );
    const processedValue = context.helpers.processTemplate(valueStr, item.json);

    this.logger.debug('Preparing transaction (mock)', {
      userId: processedUserId,
      asset,
      chainId,
      to,
      value: processedValue,
      data,
    });

    // Mock transaction preparation
    return {
      success: true,
      transactionHash: `0x${Date.now().toString(16)}${'0'.repeat(56)}`,
      prepared: true,
      asset,
      chainId,
      to,
      value: processedValue,
      data,
      userId: processedUserId,
    };
  }

  private async sendTransaction(
    context: EnhancedBlockExecutionContext,
    item: ZyraNodeData,
    itemIndex: number,
  ): Promise<any> {
    const userIdStr = context.getNodeParameter('userId', itemIndex) as string;
    const asset = context.getNodeParameter('asset', itemIndex) as string;
    const chainId = context.getNodeParameter('chainId', itemIndex) as number;
    const to = context.getNodeParameter('to', itemIndex) as string;
    const valueStr = context.getNodeParameter('value', itemIndex) as string;

    const processedUserId = context.helpers.processTemplate(
      userIdStr,
      item.json,
    );
    const processedValue = context.helpers.processTemplate(valueStr, item.json);

    this.logger.debug('Sending transaction (mock)', {
      userId: processedUserId,
      asset,
      chainId,
      to,
      value: processedValue,
    });

    // Mock transaction send
    return {
      success: true,
      transactionHash: `0x${Date.now().toString(16)}${'1'.repeat(56)}`,
      sent: true,
      asset,
      chainId,
      to,
      value: processedValue,
      userId: processedUserId,
    };
  }

  private async getAddress(
    context: EnhancedBlockExecutionContext,
    item: ZyraNodeData,
    itemIndex: number,
  ): Promise<any> {
    this.logger.debug('Getting wallet address (mock)');

    // Mock wallet address
    return {
      success: true,
      address: '0x742d35Cc6634C0532925a3b8b4C3dd8e4B1c0000',
    };
  }

  async validate(config: Record<string, any>): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config.operation) {
      errors.push('Operation is required');
    }

    const transactionOperations = ['prepare_transaction', 'send_transaction'];
    if (transactionOperations.includes(config.operation)) {
      if (!config.to) {
        errors.push('To address is required for transaction operations');
      }
      if (!config.value && config.value !== 0) {
        errors.push('Value is required for transaction operations');
      }
    }

    warnings.push('Magic Wallet integration is currently in mock mode');

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
