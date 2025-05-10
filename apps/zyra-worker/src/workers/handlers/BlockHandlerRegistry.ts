import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { MetricsBlockHandler } from './MetricsBlockHandler';
import { EmailBlockHandler } from './EmailBlockHandler';
import { DatabaseBlockHandler } from './DatabaseBlockHandler';
import { WebhookBlockHandler } from './WebhookBlockHandler';
import { LLMPromptBlockHandler } from './LLMPromptBlockHandler';
import { PriceMonitorBlockHandler } from './PriceMonitorBlockHandler';
import { ScheduleBlockHandler } from './ScheduleBlockHandler';
import { WalletBlockHandler } from './WalletBlockHandler';
import { NotificationBlockHandler } from './NotificationBlockHandler';
import { TransactionBlockHandler } from './blockchain/TransactionBlockHandler';
import { AiBlockchain } from './AIBlockchain';
import { DiscordBlockHandler } from './DiscordBlockHandler';
import { CircuitBreaker } from '../../lib/blockchain/CircuitBreaker';
import { CircuitBreakerDbService } from '../../lib/blockchain/CircuitBreakerDbService';
import { WalletService } from './blockchain/WalletService';
import { PortfolioBalanceHandler } from './PortfolioBalanceHandler';
import { ProtocolService } from '../../services/protocol.service';
import { DefaultProtocolProvider } from '../../services/providers/protocol-provider';
import { PortfolioService } from '../../services/portfolio.service';
import { YieldMonitorHandler } from './YieldMonitorHandler';
import { RebalanceCalculatorHandler } from './RebalanceCalculatorHandler';
import { SwapExecutorHandler } from './SwapExecutorHandler';
import { GasOptimizerHandler } from './GasOptimizerHandler';
import { ProtocolMonitorHandler } from './ProtocolMonitorHandler';
import { YieldStrategyHandler } from './YieldStrategyHandler';
import { LiquidityProviderHandler } from './LiquidityProviderHandler';
import { PositionManagerHandler } from './PositionManagerHandler';
import * as vm from 'vm';
import { BlockType, BlockHandler } from '@zyra/types';

/**
 * Central registry for all block handlers.
 */
@Injectable()
export class BlockHandlerRegistry {
  // Using string keys to avoid type issues with BlockType enum
  private handlers: Record<string, BlockHandler>;

  // Maximum execution time for JavaScript blocks in milliseconds
  private readonly MAX_EXECUTION_TIME = 30000; // 30 seconds

  constructor(
    private readonly logger: Logger,
    private readonly configService?: ConfigService,
    private readonly portfolioService?: PortfolioService,
    private readonly protocolService?: ProtocolService,
  ) {
    // Initialize services
    const walletService = new WalletService();

    // Create circuit breaker for blockchain operations
    const circuitBreaker = new CircuitBreaker();
    const circuitBreakerDbService = new CircuitBreakerDbService(circuitBreaker);

    this.handlers = {
      // Action blocks
      [BlockType.EMAIL]: new MetricsBlockHandler(
        BlockType.EMAIL,
        new EmailBlockHandler(this.logger),
      ),
      [BlockType.DATABASE]: new MetricsBlockHandler(
        BlockType.DATABASE,
        new DatabaseBlockHandler(),
      ),
      [BlockType.WEBHOOK]: new MetricsBlockHandler(
        BlockType.WEBHOOK,
        new WebhookBlockHandler(),
      ),
      [BlockType.NOTIFICATION]: new MetricsBlockHandler(
        BlockType.NOTIFICATION,
        new NotificationBlockHandler(),
      ),
      [BlockType.DISCORD]: new MetricsBlockHandler(
        BlockType.DISCORD,
        new DiscordBlockHandler(),
      ),

      // Trigger blocks
      [BlockType.PRICE_MONITOR]: new MetricsBlockHandler(
        BlockType.PRICE_MONITOR,
        new PriceMonitorBlockHandler(),
      ),
      [BlockType.SCHEDULE]: new MetricsBlockHandler(
        BlockType.SCHEDULE,
        new ScheduleBlockHandler(),
      ),

      // Finance blocks
      [BlockType.WALLET]: new MetricsBlockHandler(
        BlockType.WALLET,
        new WalletBlockHandler(),
      ),
      [BlockType.TRANSACTION]: new MetricsBlockHandler(
        BlockType.TRANSACTION,
        new TransactionBlockHandler(
          circuitBreaker,
          circuitBreakerDbService,
          this.configService || new ConfigService(),
        ),
      ),
      [BlockType.AI_BLOCKCHAIN]: new MetricsBlockHandler(
        BlockType.AI_BLOCKCHAIN,
        new AiBlockchain(
          this.configService || new ConfigService(),
          walletService,
        ),
      ),

      // DeFi blocks with dedicated handlers
      [BlockType.DEFI_PRICE_MONITOR]: new MetricsBlockHandler(
        BlockType.DEFI_PRICE_MONITOR,
        new PriceMonitorBlockHandler(),
      ),
      [BlockType.DEFI_PORTFOLIO]: new MetricsBlockHandler(
        BlockType.DEFI_PORTFOLIO,
        new PortfolioBalanceHandler(
          this.portfolioService || new PortfolioService(null),
        ),
      ),
      // DeFi blocks with proper handlers
      [BlockType.DEFI_YIELD_MONITOR]: new MetricsBlockHandler(
        BlockType.DEFI_YIELD_MONITOR,
        new YieldMonitorHandler(
          this.protocolService ||
            new ProtocolService(new DefaultProtocolProvider(this.logger)),
        ),
      ),
      [BlockType.DEFI_REBALANCE]: new MetricsBlockHandler(
        BlockType.DEFI_REBALANCE,
        new LLMPromptBlockHandler(),
      ),
      [BlockType.DEFI_SWAP]: new MetricsBlockHandler(
        BlockType.DEFI_SWAP,
        new LLMPromptBlockHandler(),
      ),
      [BlockType.DEFI_GAS]: new MetricsBlockHandler(
        BlockType.DEFI_GAS,
        new LLMPromptBlockHandler(),
      ),
      [BlockType.DEFI_PROTOCOL]: new MetricsBlockHandler(
        BlockType.DEFI_PROTOCOL,
        new ProtocolMonitorHandler(
          this.protocolService ||
            new ProtocolService(new DefaultProtocolProvider(this.logger)),
        ),
      ),
      [BlockType.DEFI_YIELD_STRATEGY]: new MetricsBlockHandler(
        BlockType.DEFI_YIELD_STRATEGY,
        new LLMPromptBlockHandler(),
      ),
      [BlockType.DEFI_LIQUIDITY]: new MetricsBlockHandler(
        BlockType.DEFI_LIQUIDITY,
        new LLMPromptBlockHandler(),
      ),
      [BlockType.DEFI_POSITION]: new MetricsBlockHandler(
        BlockType.DEFI_POSITION,
        new LLMPromptBlockHandler(),
      ),

      // AI blocks
      [BlockType.LLM_PROMPT]: new MetricsBlockHandler(
        BlockType.LLM_PROMPT,
        new LLMPromptBlockHandler(),
      ),
      [BlockType.CUSTOM]: new MetricsBlockHandler(
        BlockType.CUSTOM,
        new LLMPromptBlockHandler(),
      ),

      // Logic blocks with dedicated handlers
      [BlockType.CONDITION]: new MetricsBlockHandler(
        BlockType.CONDITION,
        new LLMPromptBlockHandler(),
      ),
      [BlockType.DELAY]: new MetricsBlockHandler(
        BlockType.DELAY,
        new ScheduleBlockHandler(),
      ),
      [BlockType.TRANSFORM]: new MetricsBlockHandler(
        BlockType.TRANSFORM,
        new LLMPromptBlockHandler(),
      ),
      [BlockType.UNKNOWN]: new MetricsBlockHandler(
        BlockType.UNKNOWN,
        new LLMPromptBlockHandler(),
      ),
      [BlockType.PROTOCOL_MONITOR]: new MetricsBlockHandler(
        BlockType.PROTOCOL_MONITOR,
        new ProtocolMonitorHandler(
          this.protocolService ||
            new ProtocolService(new DefaultProtocolProvider(this.logger)),
        ),
      ),
      [BlockType.YIELD_MONITOR]: new MetricsBlockHandler(
        BlockType.YIELD_MONITOR,
        new YieldMonitorHandler(
          this.protocolService ||
            new ProtocolService(new DefaultProtocolProvider(this.logger)),
        ),
      ),
      [BlockType.REBALANCE_CALCULATOR]: new MetricsBlockHandler(
        BlockType.REBALANCE_CALCULATOR,
        new RebalanceCalculatorHandler(
          this.portfolioService || new PortfolioService(null),
        ),
      ),
      [BlockType.SWAP_EXECUTOR]: new MetricsBlockHandler(
        BlockType.SWAP_EXECUTOR,
        new SwapExecutorHandler(
          this.protocolService ||
            new ProtocolService(new DefaultProtocolProvider(this.logger)),
          walletService,
        ),
      ),
      [BlockType.GAS_OPTIMIZER]: new MetricsBlockHandler(
        BlockType.GAS_OPTIMIZER,
        new GasOptimizerHandler(),
      ),
      [BlockType.LIQUIDITY_PROVIDER]: new MetricsBlockHandler(
        BlockType.LIQUIDITY_PROVIDER,
        new LiquidityProviderHandler(
          this.protocolService ||
            new ProtocolService(new DefaultProtocolProvider(this.logger)),
          walletService,
        ),
      ),
      [BlockType.POSITION_MANAGER]: new MetricsBlockHandler(
        BlockType.POSITION_MANAGER,
        new PositionManagerHandler(
          this.protocolService ||
            new ProtocolService(new DefaultProtocolProvider(this.logger)),
          walletService,
        ),
      ),
      [BlockType.YIELD_STRATEGY]: new MetricsBlockHandler(
        BlockType.YIELD_STRATEGY,
        new YieldStrategyHandler(
          this.protocolService ||
            new ProtocolService(new DefaultProtocolProvider(this.logger)),
        ),
      ),
    };
  }

  /**
   * Retrieve a handler for the given block type.
   */
  getHandler(type: BlockType | string): BlockHandler {
    return this.handlers[type] || this.handlers[BlockType.UNKNOWN];
  }

  /**
   * Get the full map of handlers (used for initialization).
   */
  getAllHandlers(): Record<string, BlockHandler> {
    return this.handlers;
  }

  /**
   * Register a handler for a specific block type.
   * @param blockType The type of block to register a handler for
   * @param handler The handler to use for this block type
   */
  registerHandler(blockType: BlockType | string, handler: BlockHandler): void {
    this.handlers[blockType] = handler;
  }

  private async executeJavaScript(
    blockDefinition: any,
    inputs: Record<string, any>,
    nodeId: string,
    executionId: string,
  ): Promise<any> {
    const sandbox = {
      inputs,
      console: {
        log: (...args: any[]) => {
          this.logger.log(`[Block ${blockDefinition.id}] ${args.join(' ')}`);
          this.logToDatabase(executionId, nodeId, 'info', args.join(' '));
        },
        error: (...args: any[]) => {
          this.logger.error(`[Block ${blockDefinition.id}] ${args.join(' ')}`);
          this.logToDatabase(executionId, nodeId, 'error', args.join(' '));
        },
      },
      // Safe utilities
      JSON: { parse: JSON.parse, stringify: JSON.stringify },
      Math,
      Date,
    };

    const context = vm.createContext(sandbox);
    const script = new vm.Script(`
      (async () => {
        ${blockDefinition.logic}
      })();
    `);

    const result = await Promise.race([
      script.runInContext(context, {
        timeout: this.MAX_EXECUTION_TIME,
        displayErrors: true,
      }),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Execution timeout')),
          this.MAX_EXECUTION_TIME,
        ),
      ),
    ]);

    return this.validateOutputs(blockDefinition.outputs, result);
  }

  private validateInputs(
    schema: any[],
    inputs: Record<string, any>,
  ): Record<string, any> {
    const validatedInputs: Record<string, any> = {};

    for (const input of schema) {
      const value = inputs[input.name];

      if (input.required && value === undefined) {
        throw new Error(`Required input '${input.name}' is missing`);
      }

      if (value !== undefined) {
        this.validateDataType(value, input.dataType, input.name, 'input');
        validatedInputs[input.name] = value;
      } else if (input.defaultValue !== undefined) {
        validatedInputs[input.name] = input.defaultValue;
      }
    }

    return validatedInputs;
  }

  private validateOutputs(schema: any[], outputs: any): Record<string, any> {
    const validatedOutputs: Record<string, any> = {};

    for (const output of schema) {
      const value = outputs[output.name];

      if (output.required && value === undefined) {
        throw new Error(`Required output '${output.name}' is missing`);
      }

      if (value !== undefined) {
        this.validateDataType(value, output.dataType, output.name, 'output');
        validatedOutputs[output.name] = value;
      }
    }

    return validatedOutputs;
  }

  private validateDataType(
    value: any,
    type: string,
    name: string,
    context: 'input' | 'output',
  ): void {
    switch (type) {
      case 'number':
        if (typeof value !== 'number')
          throw new Error(`${context} '${name}' must be a number`);
        break;
      case 'string':
        if (typeof value !== 'string')
          throw new Error(`${context} '${name}' must be a string`);
        break;
      case 'boolean':
        if (typeof value !== 'boolean')
          throw new Error(`${context} '${name}' must be a boolean`);
        break;
      case 'object':
        if (typeof value !== 'object')
          throw new Error(`${context} '${name}' must be an object`);
        break;
      case 'array':
        if (!Array.isArray(value))
          throw new Error(`${context} '${name}' must be an array`);
        break;
    }
  }
  private async executeBlockLogic(
    blockDefinition: any,
    inputs: Record<string, any>,
    nodeId: string,
    executionId: string,
  ): Promise<any> {
    const validatedInputs = this.validateInputs(blockDefinition.inputs, inputs);

    switch (blockDefinition.logic_type?.toLowerCase()) {
      case 'javascript':
        return this.executeJavaScript(
          blockDefinition,
          validatedInputs,
          nodeId,
          executionId,
        );
      default:
        throw new Error(
          `Unsupported logic type: ${blockDefinition.logic_type}`,
        );
    }
  }

  /**
   * Helper method to log to database
   */
  private async logToDatabase(
    executionId: string,
    nodeId: string,
    level: 'info' | 'error' | 'warn' | 'debug',
    message: string,
  ): Promise<void> {
    try {
      // Implementation would use a database service to log the message
      this.logger.log(`[${level.toUpperCase()}] [${nodeId}] ${message}`);
    } catch (error) {
      this.logger.error(`Failed to log message to database: ${error}`);
    }
  }
}
