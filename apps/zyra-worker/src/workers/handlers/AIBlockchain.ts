import { Injectable, Logger } from '@nestjs/common';
import { Address } from 'viem';

import { privateKeyToAccount } from 'viem/accounts';
import { DatabaseService } from '../../services/database.service';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { WalletService } from './blockchain/WalletService';
import { BlockExecutionContext, BlockHandler } from '@zyra/types';

// Lazy import types to avoid ES module issues
type AgentKitType = any;
type SmartWalletProviderType = any;
type AiBlockchainTools = { [key: string]: any };

// Define types for AI step results
type StepResult = {
  index?: number;
  step?: number;
  toolCalls?: any[];
  toolResults?: any[];
};

/**
 * User wallet data stored in database
 */
interface WalletData {
  smartWalletAddress: Address;
  networkId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

const system = `You are a helpful agent that can interact onchain using the Coinbase Developer Platform AgentKit. You are
empowered to interact onchain using your tools. If you ever need funds, you can request them from the
faucet if you are on network ID 'base-sepolia'. If not, you can provide your wallet details and request
funds from the user. Before executing your first action, get the wallet details to see what network
you're on. If there is a 5XX (internal) HTTP error code, ask the user to try again later. If someone
asks you to do something you can't do with your currently available tools, you must say so, and
encourage them to implement it themselves using the CDP SDK + Agentkit, recommend they go to
docs.cdp.coinbase.com for more information. Be concise and helpful with your responses. Refrain from
restating your tools' descriptions unless it is explicitly requested.`;

/**
 * Error types for AI Blockchain operations
 */
export enum AIBlockchainErrorType {
  CONFIGURATION = 'configuration_error',
  WALLET_ACCESS = 'wallet_access_error',
  EXECUTION = 'execution_error',
  VALIDATION = 'validation_error',
  TIMEOUT = 'timeout_error',
  UNKNOWN = 'unknown_error',
}

/**
 * Custom error class for AI Blockchain operations
 */
export class AIBlockchainError extends Error {
  type: AIBlockchainErrorType;
  context: Record<string, any>;

  constructor(
    message: string,
    type: AIBlockchainErrorType,
    context: Record<string, any> = {},
  ) {
    super(message);
    this.name = 'AIBlockchainError';
    this.type = type;
    this.context = context;
  }
}

@Injectable()
export class AiBlockchain implements BlockHandler {
  private readonly logger = new Logger(AiBlockchain.name);
  private readonly maxExecutionTime = 60000; // 1 minute timeout

  constructor(
    private readonly databaseService: DatabaseService,
    private configService: ConfigService,
    private walletService?: WalletService,
  ) {}

  /**
   * Validate required environment variables
   */
  private validateConfig(): void {
    const requiredVars = [
      'ETHEREUM_PRIVATE_KEY',
      'NETWORK_ID',
      'CDP_API_KEY_NAME',
      'CDP_API_KEY_PRIVATE_KEY',
      'OPENROUTER_API_KEY',
    ];

    const missing = requiredVars.filter((varName) => !process.env[varName]);
    if (missing.length > 0) {
      throw new AIBlockchainError(
        `Missing required environment variables: ${missing.join(', ')}`,
        AIBlockchainErrorType.CONFIGURATION,
      );
    }
  }

  /**
   * Retrieve wallet data from encrypted database storage
   */
  private async getWalletData(
    userId: string,
    networkId: string,
  ): Promise<WalletData | null> {
    try {
      // Query user wallet from database
      const userWallet = await this.databaseService.prisma.userWallet.findFirst(
        {
          where: {
            userId: userId,
            chainId: networkId,
          },
        },
      );

      if (!userWallet) return null;

      return {
        smartWalletAddress: userWallet.walletAddress as Address,
        networkId: userWallet.chainId,
        userId: userWallet.userId,
        createdAt: userWallet.createdAt?.toISOString() || '',
        updatedAt: userWallet.updatedAt?.toISOString() || '',
      };
    } catch (error) {
      if (error instanceof AIBlockchainError) throw error;

      throw new AIBlockchainError(
        `Failed to get wallet data: ${(error as Error).message}`,
        AIBlockchainErrorType.WALLET_ACCESS,
        { userId, networkId },
      );
    }
  }

  /**
   * Save wallet data to encrypted database storage
   */
  private async saveWalletData(
    userId: string,
    networkId: string,
    smartWalletAddress: Address,
  ): Promise<void> {
    // Use WalletService if available
    if (this.walletService) {
      return this.walletService.saveWalletData(
        userId,
        parseInt(networkId, 10),
        smartWalletAddress,
      );
    }

    // Otherwise use the built-in implementation
    try {
      // First check if wallet exists for this user and chain
      const existingWallet =
        await this.databaseService.prisma.userWallet.findFirst({
          where: {
            userId: userId,
            chainId: networkId,
          },
        });

      if (existingWallet) {
        // Update existing wallet
        await this.databaseService.prisma.userWallet.update({
          where: { id: existingWallet.id },
          data: {
            walletAddress: smartWalletAddress,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new wallet
        await this.databaseService.prisma.userWallet.create({
          data: {
            userId: userId,
            chainId: networkId,
            walletAddress: smartWalletAddress,
            walletType: 'smart_wallet',
            chainType: 'evm',
          },
        });
      }
    } catch (error) {
      throw new AIBlockchainError(
        `Failed to save wallet data: ${(error as Error).message}`,
        AIBlockchainErrorType.WALLET_ACCESS,
        { userId, networkId, smartWalletAddress },
      );
    }
  }

  /**
   * Log AI blockchain operation to database
   */
  private async logOperation(
    userId: string,
    nodeId: string,
    executionId: string,
    data: Record<string, any>,
  ): Promise<void> {
    try {
      await this.databaseService.prisma.aiBlockchainOperation.create({
        data: {
          userId: userId,
          nodeId: nodeId,
          executionId: executionId,
          operationType: data.operationType || 'unknown',
          prompt: data.prompt || '',
          blockchain: data.blockchain || 'ethereum',
          result: data.result ? JSON.stringify(data.result) : null,
          status: data.status || 'pending',
          error: data.error || null,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to log AI blockchain operation: ${(error as Error).message}`,
      );
      // Don't throw here as logging failure shouldn't stop execution
    }
  }

  async execute(node: any, ctx: BlockExecutionContext) {
    try {
      this.logger.log(`Starting AI Blockchain execution for node: ${node.id}`);

      // Validate configuration first
      this.validateConfig();

      // Check if this is production environment and warn about experimental feature
      if (process.env.NODE_ENV === 'production') {
        this.logger.warn(
          'AI Blockchain handler is experimental and not recommended for production',
        );
      }

      // Try to dynamically import required modules
      let AgentKit: any,
        SmartWalletProvider: any,
        walletActionProvider: any,
        cdpApiActionProvider: any,
        getVercelAITools: any,
        createOpenRouter: any,
        generateText: any;

      try {
        // Dynamic imports to avoid ES module issues
        const agentKitModule = await import('@coinbase/agentkit');
        AgentKit = agentKitModule.AgentKit;
        SmartWalletProvider = agentKitModule.SmartWalletProvider;
        walletActionProvider = agentKitModule.walletActionProvider;
        cdpApiActionProvider = agentKitModule.cdpApiActionProvider;

        const vercelModule = await import('@coinbase/agentkit-vercel-ai-sdk');
        getVercelAITools = vercelModule.getVercelAITools;

        const openRouterModule = await import('@openrouter/ai-sdk-provider');
        createOpenRouter = openRouterModule.createOpenRouter;

        const aiModule = await import('ai');
        generateText = aiModule.generateText;
      } catch (importError) {
        throw new AIBlockchainError(
          `Failed to load required blockchain modules: ${importError instanceof Error ? importError.message : String(importError)}`,
          AIBlockchainErrorType.CONFIGURATION,
          { nodeId: node.id, importError },
        );
      }

      const startTime = Date.now();
      const executionId = ctx.executionId;
      const userId = ctx.userId;
      const nodeId = node.id;

      const inputData = node.data || {};
      const { prompt, blockchain = 'base-sepolia' } = inputData;

      if (!prompt) {
        throw new AIBlockchainError(
          'AI Blockchain prompt is required',
          AIBlockchainErrorType.VALIDATION,
          { nodeId },
        );
      }

      // Create account from private key
      const account = privateKeyToAccount(
        this.configService.get<string>('ETHEREUM_PRIVATE_KEY') as `0x${string}`,
      );

      // Get or create user wallet
      const networkId = this.configService.get<string>(
        'NETWORK_ID',
        blockchain,
      );
      const walletData = await this.getWalletData(userId, networkId);

      if (!walletData) {
        this.logger.log(
          `Creating new wallet for user ${userId} on network ${networkId}`,
        );
      }

      // Initialize SmartWalletProvider
      const walletProvider = new SmartWalletProvider({
        account,
        walletData: walletData
          ? {
              walletId: walletData.smartWalletAddress,
              networkId: walletData.networkId,
            }
          : undefined,
      });

      // Initialize AgentKit
      const agentKit = new AgentKit({
        wallet: walletProvider,
        actions: [walletActionProvider, cdpApiActionProvider],
      });

      // Save wallet data if this is a new wallet
      if (!walletData) {
        const smartWalletAddress = await agentKit.wallet.getAddress();
        await this.saveWalletData(userId, networkId, smartWalletAddress);
        this.logger.log(
          `Saved new wallet ${smartWalletAddress} for user ${userId}`,
        );
      }

      // Get available tools
      const tools = getVercelAITools(agentKit);

      // Initialize OpenRouter
      const openrouter = createOpenRouter({
        apiKey: this.configService.get<string>('OPENROUTER_API_KEY'),
      });

      this.logger.log(`Executing AI prompt: "${prompt.substring(0, 100)}..."`);

      // Execute AI generation with timeout
      const executionPromise = generateText({
        model: openrouter('anthropic/claude-3.5-sonnet'),
        tools,
        system,
        prompt,
        maxSteps: 10,
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(
              new AIBlockchainError(
                'AI execution timeout',
                AIBlockchainErrorType.TIMEOUT,
                { nodeId, prompt: prompt.substring(0, 100) },
              ),
            ),
          this.maxExecutionTime,
        ),
      );

      const result = await Promise.race([executionPromise, timeoutPromise]);

      const executionTime = Date.now() - startTime;

      // Log successful operation
      await this.logOperation(userId, nodeId, executionId, {
        prompt,
        blockchain,
        result: result.text,
        execution_time_ms: executionTime,
        status: 'completed',
      });

      this.logger.log(
        `AI Blockchain execution completed in ${executionTime}ms for node: ${nodeId}`,
      );

      return {
        success: true,
        result: result.text,
        steps: result.steps?.map((step: StepResult, index: number) => ({
          step: index + 1,
          toolCalls: step.toolCalls || [],
          toolResults: step.toolResults || [],
        })),
        walletAddress: await agentKit.wallet.getAddress(),
        networkId,
        executionTime,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorType =
        error instanceof AIBlockchainError
          ? error.type
          : AIBlockchainErrorType.UNKNOWN;

      this.logger.error(
        `AI Blockchain execution failed: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );

      // Log failed operation
      await this.logOperation(ctx.userId, node.id, ctx.executionId, {
        prompt: node.data?.prompt,
        blockchain: node.data?.blockchain,
        error: errorMessage,
        status: 'failed',
      });

      return {
        success: false,
        error: errorMessage,
        errorType,
        nodeId: node.id,
      };
    }
  }

  /**
   * Verify a blockchain transaction before execution
   * @param transaction The transaction to verify
   * @returns Whether the transaction is safe to execute
   */
  private verifyTransaction(transaction: any): boolean {
    // Implement transaction verification logic here
    // Check for suspicious patterns, high-risk operations, etc.
    return true;
  }
}
