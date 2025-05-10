
import {
  AgentKit,
  cdpApiActionProvider,
  SmartWalletProvider,
  walletActionProvider,
} from '@coinbase/agentkit';
import { getVercelAITools } from '@coinbase/agentkit-vercel-ai-sdk';
import { Injectable, Logger } from '@nestjs/common';
import { generateText } from 'ai';
import { Address } from 'viem';

import { privateKeyToAccount } from 'viem/accounts';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createServiceClient } from '../../lib/supabase/serviceClient';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { WalletService } from './blockchain/WalletService';
import { BlockExecutionContext, BlockHandler } from '@zyra/types';


// Define types for AI step results
type StepResult = {
  index?: number;
  step?: number;
  toolCalls?: any[];
  toolResults?: any[];
};

// Define custom types for our new tables
type UserWallet = {
  id: string;
  user_id: string;
  network_id: string;
  smart_wallet_address: string;
  created_at: string;
  updated_at: string;
};

type AIBlockchainOperation = {
  id: string;
  user_id: string;
  node_id: string;
  execution_id: string;
  operation_type: string;
  prompt: string;
  blockchain: string;
  result: any;
  status: string;
  error: string | null;
  created_at: string;
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

// Use CoreTool for type safety; fallback to Record<string, any> if unavailable
export type AiBlockchainTools = { [key: string]: any };

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
      const supabase = createServiceClient();

      // Use casting to handle tables not in Supabase type definitions yet
      const response = (await supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', userId)
        .eq('network_id', networkId)
        .maybeSingle()) as { data: UserWallet | null; error: any };

      const { data, error } = response;

      if (error) {
        throw new AIBlockchainError(
          `Error retrieving wallet data: ${error.message}`,
          AIBlockchainErrorType.WALLET_ACCESS,
          { userId, networkId },
        );
      }

      if (!data) return null;

      return {
        smartWalletAddress: data.smart_wallet_address as Address,
        networkId: data.network_id,
        userId: data.user_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
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
      const supabase = createServiceClient();

      // Use casting to handle tables not in Supabase type definitions yet
      const selectResponse = (await supabase
        .from('user_wallets')
        .select('id')
        .eq('user_id', userId)
        .eq('network_id', networkId)
        .maybeSingle()) as { data: Pick<UserWallet, 'id'> | null; error: any };

      const { data: existingWallet, error: selectError } = selectResponse;

      if (selectError) {
        throw new Error(selectError.message);
      }

      if (existingWallet) {
        // Update existing wallet
        const updateResponse = (await supabase
          .from('user_wallets')
          .update({
            smart_wallet_address: smartWalletAddress.toString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingWallet.id)) as { error: any };

        if (updateResponse.error) {
          throw new Error(updateResponse.error.message);
        }
      } else {
        // Create new wallet
        const insertResponse = (await supabase.from('user_wallets').insert({
          id: randomUUID(),
          user_id: userId,
          network_id: networkId,
          smart_wallet_address: smartWalletAddress.toString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })) as { error: any };

        if (insertResponse.error) {
          throw new Error(insertResponse.error.message);
        }
      }
    } catch (error) {
      throw new AIBlockchainError(
        `Failed to save wallet data: ${(error as Error).message}`,
        AIBlockchainErrorType.WALLET_ACCESS,
        {
          userId,
          networkId,
          smartWalletAddress: smartWalletAddress.toString(),
        },
      );
    }
  }

  /**
   * Record AI blockchain operation for auditing purposes
   */
  private async logOperation(
    userId: string,
    nodeId: string,
    executionId: string,
    data: Record<string, any>,
  ): Promise<void> {
    try {
      const supabase = createServiceClient();

      // Use casting to handle tables not in Supabase type definitions yet
      const response = (await supabase.from('ai_blockchain_operations').insert({
        id: randomUUID(),
        user_id: userId,
        node_id: nodeId,
        execution_id: executionId,
        operation_type: data.operation || 'query',
        prompt: data.prompt || '',
        blockchain: data.blockchain || '',
        result: data.result || null,
        status: data.status || 'completed',
        error: data.error || null,
        created_at: new Date().toISOString(),
      })) as { error: any };

      if (response.error) {
        throw new Error(response.error.message);
      }
    } catch (error) {
      // Log but don't fail the operation if logging fails
      this.logger.error(
        `Failed to log AI blockchain operation: ${(error as Error).message}`,
        {
          userId,
          nodeId,
          executionId,
          error,
        },
      );
    }
  }
  /**
   * Execute an AI blockchain operation
   */
  async execute(node: any, ctx: BlockExecutionContext) {
    const startTime = Date.now();
    const operationId = randomUUID();

    try {
      // Validate environment configuration
      this.validateConfig();

      // Extract and validate input parameters
      const { prompt, operation, blockchain, timeout } =
        node.data?.config || {};

      if (!prompt) {
        throw new AIBlockchainError(
          'Missing required parameter: prompt',
          AIBlockchainErrorType.VALIDATION,
          { nodeId: node.id },
        );
      }

      // Get userId from context
      const userId = ctx.userId || 'unknown_user';
      const networkId = process.env.NETWORK_ID || 'base-sepolia';

      ctx.logger.log(
        `Starting AI blockchain operation: ${operation || 'query'}`,
        {
          userId,
          nodeId: node.id,
          operationId,
          networkId,
        },
      );

      // Initialize signer from private key
      const privateKey = process.env.ETHEREUM_PRIVATE_KEY;
      if (!privateKey) {
        throw new AIBlockchainError(
          'Missing Ethereum private key',
          AIBlockchainErrorType.CONFIGURATION,
        );
      }

      // Ensure the private key has the correct format
      const formattedPrivateKey: `0x${string}` = privateKey.startsWith('0x')
        ? (privateKey as `0x${string}`)
        : (`0x${privateKey}` as `0x${string}`);

      const signer = privateKeyToAccount(formattedPrivateKey);

      // Get wallet data from secure storage
      let walletData = await this.getWalletData(userId, networkId);

      // Configure Smart Wallet Provider
      const walletProvider = await SmartWalletProvider.configureWithWallet({
        networkId: networkId,
        signer: signer,
        smartWalletAddress: walletData?.smartWalletAddress,
        paymasterUrl: process.env.PAYMASTER_URL, // Optional: Sponsor transactions
      });

      // Save/update wallet data securely
      const smartWalletAddress = walletProvider.getAddress();
      // Convert the address to 0x hex string format expected by TypeScript
      await this.saveWalletData(
        userId,
        networkId,
        smartWalletAddress as `0x${string}`,
      );

      // Configure Agent Kit
      const cdpApiKeyName = process.env.CDP_API_KEY_NAME;
      const cdpApiKeyPrivateKey = process.env.CDP_API_KEY_PRIVATE_KEY;

      if (!cdpApiKeyName || !cdpApiKeyPrivateKey) {
        throw new AIBlockchainError(
          'Missing CDP API credentials',
          AIBlockchainErrorType.CONFIGURATION,
        );
      }

      const agentKit = await AgentKit.from({
        walletProvider,
        actionProviders: [
          walletActionProvider(),
          cdpApiActionProvider({
            apiKeyName: cdpApiKeyName,
            apiKeyPrivateKey: cdpApiKeyPrivateKey,
          }),
        ],
      });

      // Configure AI tools
      const tools = getVercelAITools(agentKit);
      const openRouterApiKey = process.env.OPENROUTER_API_KEY;

      if (!openRouterApiKey) {
        throw new AIBlockchainError(
          'Missing OpenRouter API key',
          AIBlockchainErrorType.CONFIGURATION,
        );
      }

      const openrouter = createOpenRouter({
        apiKey: openRouterApiKey,
      });

      // Prepare and enhance prompt
      const mergedPrompt = `${prompt} ${operation ? `(Operation: ${operation})` : ''} ${blockchain ? `(Blockchain: ${blockchain})` : ''}`;

      ctx.logger.log(`Sending AI prompt: ${mergedPrompt.substring(0, 100)}...`);

      // Create promise with timeout
      const operationTimeoutMs = timeout
        ? Math.min(Number(timeout), this.maxExecutionTime)
        : this.maxExecutionTime;

      // Main execution with timeout protection
      const executionPromise = generateText({
        model: openrouter('openai/gpt-4o-mini'),
        system,
        tools,
        prompt: mergedPrompt,
        maxSteps: 10, // Maximum number of tool invocations per request
        onStepFinish: (event: StepResult) => {
          // Log each step for debugging and auditing
          ctx.logger.log(`AI step: ${event.index || event.step || 0}`, {
            hasToolCalls: !!event.toolCalls?.length,
            hasToolResults: !!event.toolResults?.length,
          });

          // Check if execution timeout is reached
          if (Date.now() - startTime > operationTimeoutMs) {
            throw new AIBlockchainError(
              `Operation timed out after ${operationTimeoutMs}ms`,
              AIBlockchainErrorType.TIMEOUT,
              { operationId },
            );
          }
        },
      });

      // Add timeout protection
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(
            new AIBlockchainError(
              `Operation timed out after ${operationTimeoutMs}ms`,
              AIBlockchainErrorType.TIMEOUT,
              { operationId },
            ),
          );
        }, operationTimeoutMs);
      });

      // Race between execution and timeout
      const result = (await Promise.race([
        executionPromise,
        timeoutPromise,
      ])) as any;

      ctx.logger.log('AI operation completed', {
        responseLength: result?.text?.length || 0,
        steps: result?.steps?.length || 0,
        executionTime: Date.now() - startTime,
      });

      // Structure the output in a way that can be properly logged
      const structuredOutput = {
        aiResponse: result.text,
        metadata: {
          operation: operation,
          blockchain: blockchain,
          walletAddress: smartWalletAddress,
          timestamp: new Date().toISOString(),
          executionTime: Date.now() - startTime,
          operationId,
        },
        toolCalls: result.steps?.flatMap((step) => step.toolCalls || []) || [],
        toolResults:
          result.steps?.flatMap((step) => step.toolResults || []) || [],
      };

      // Log the operation for auditing
      await this.logOperation(userId, node.id, ctx.executionId, {
        operation,
        prompt,
        blockchain,
        result: structuredOutput,
        status: 'completed',
      });

      return structuredOutput;
    } catch (error) {
      // Handle and categorize errors
      let errorType = AIBlockchainErrorType.UNKNOWN;
      let errorMessage = 'Unknown error occurred';

      if (error instanceof AIBlockchainError) {
        errorType = error.type;
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
        // Categorize common errors
        if (errorMessage.includes('timeout')) {
          errorType = AIBlockchainErrorType.TIMEOUT;
        } else if (errorMessage.includes('configuration')) {
          errorType = AIBlockchainErrorType.CONFIGURATION;
        }
      }

      const errorResponse = {
        error: errorMessage,
        errorType,
        metadata: {
          nodeId: node.id,
          executionId: ctx.executionId,
          operationId,
          timestamp: new Date().toISOString(),
          executionTime: Date.now() - startTime,
        },
      };

      // Log the error for debugging and monitoring
      this.logger.error(
        `AI blockchain operation failed: ${errorMessage}`,
        errorResponse,
      );
      ctx.logger.error(
        `AI blockchain operation failed: ${errorMessage}`,
        errorResponse,
      );

      // Log the failed operation for auditing
      await this.logOperation(
        ctx.userId || 'unknown_user',
        node.id,
        ctx.executionId,
        {
          operation: node.data?.config?.operation || 'unknown',
          prompt: node.data?.config?.prompt || '',
          blockchain: node.data?.config?.blockchain || '',
          error: errorMessage,
          status: 'failed',
        },
      );

      throw error;
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
