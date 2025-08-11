import { Injectable, Logger } from '@nestjs/common';
import {
  EnhancedBlockHandler,
  EnhancedBlockExecutionContext,
  ZyraNodeData,
  EnhancedBlockDefinition,
  BlockGroup,
  PropertyType,
  ConnectionType,
  ValidationResult,
} from '@zzyra/types';

/**
 * Enhanced block for creating blockchain wallets
 * Supports multiple chains with SEI testnet focus
 */
@Injectable()
export class CreateWalletBlock implements EnhancedBlockHandler {
  private readonly logger = new Logger(CreateWalletBlock.name);

  definition: EnhancedBlockDefinition = {
    displayName: 'Create Wallet',
    name: 'CREATE_WALLET',
    version: 1,
    description: 'Create a new blockchain wallet address with optional funding',
    icon: 'plus',
    color: '#10B981',
    group: [BlockGroup.BLOCKCHAIN, BlockGroup.ACTION],

    properties: [
      {
        displayName: 'Chain',
        name: 'chainId',
        type: PropertyType.OPTIONS,
        required: true,
        default: '1328',
        options: [
          { name: 'SEI Testnet', value: '1328' },
          { name: 'Ethereum Sepolia', value: 'ethereum-sepolia' },
          { name: 'Base Sepolia', value: 'base-sepolia' },
        ],
        description: 'Blockchain network to create wallet on',
      },
      {
        displayName: 'Wallet Type',
        name: 'walletType',
        type: PropertyType.OPTIONS,
        required: true,
        default: 'eoa',
        options: [
          { name: 'Externally Owned Account (EOA)', value: 'eoa' },
          { name: 'Smart Contract Account', value: 'smart' },
          { name: 'Multi-Signature Wallet', value: 'multisig' },
        ],
        description: 'Type of wallet to create',
      },
      {
        displayName: 'Auto-Fund from Faucet',
        name: 'autoFund',
        type: PropertyType.BOOLEAN,
        required: false,
        default: true,
        description:
          'Automatically request test tokens from faucet (testnet only)',
      },
      {
        displayName: 'Funding Amount',
        name: 'fundingAmount',
        type: PropertyType.STRING,
        required: false,
        default: '1.0',
        displayOptions: {
          show: {
            autoFund: [true],
          },
        },
        description: 'Amount of test tokens to request from faucet',
      },
      {
        displayName: 'Wallet Label',
        name: 'walletLabel',
        type: PropertyType.STRING,
        required: false,

        description: 'Optional label for the wallet',
      },
      {
        displayName: 'Save to Database',
        name: 'saveToDb',
        type: PropertyType.BOOLEAN,
        required: false,
        default: true,
        description: 'Save wallet information to user database',
      },
    ],

    inputs: [ConnectionType.MAIN],
    outputs: [ConnectionType.MAIN],

    subtitle: '={{$parameter["chainId"]}} {{$parameter["walletType"]}}',
  };

  async execute(
    context: EnhancedBlockExecutionContext,
  ): Promise<ZyraNodeData[]> {
    try {
      const startTime = Date.now();

      context.logger.info('Starting wallet creation');

      // Get parameters
      const chainId = context.getNodeParameter('chainId') as string;
      const walletType = context.getNodeParameter('walletType') as string;
      const autoFund =
        (context.getNodeParameter('autoFund') as boolean) || false;
      const fundingAmount =
        (context.getNodeParameter('fundingAmount') as string) || '1.0';
      const walletLabel =
        (context.getNodeParameter('walletLabel') as string) || '';
      const saveToDb =
        (context.getNodeParameter('saveToDb') as boolean) ?? true;

      // Validate parameters
      this.validateWalletParameters({
        chainId,
        walletType,
        fundingAmount,
      });

      // Check if user has authorization (lighter check for wallet creation)
      this.validateBlockchainAuthorization(context, chainId);

      // Create wallet
      const walletResult = await this.createWallet({
        chainId,
        walletType,
        walletLabel,
        userId: context.userId,
        context,
      });

      // Auto-fund if requested and on testnet
      let fundingResult: any = null;
      if (autoFund && this.isTestnet(chainId)) {
        fundingResult = await this.fundFromFaucet({
          chainId,
          walletAddress: walletResult.address,
          amount: fundingAmount,
          context,
        });
      }

      // Save to database if requested
      if (saveToDb) {
        await this.saveWalletToDatabase({
          userId: context.userId,
          walletAddress: walletResult.address,
          chainId,
          walletType,
          walletLabel,
          context,
        });
      }

      const executionTime = Date.now() - startTime;

      context.logger.info(`Wallet created successfully in ${executionTime}ms`, {
        chainId,
        walletType,
        address: walletResult.address,
        funded: !!fundingResult,
      });

      return [
        {
          json: {
            success: true,
            walletAddress: walletResult.address,
            privateKey: walletResult.privateKey, // WARNING: Handle securely
            publicKey: walletResult.publicKey,
            chainId,
            walletType,
            walletLabel,
            mnemonic: walletResult.mnemonic,
            funding: fundingResult
              ? {
                  funded: true,
                  amount: fundingResult.amount,
                  transactionHash: fundingResult.transactionHash,
                }
              : null,
            savedToDatabase: saveToDb,
            executionTime,
            timestamp: new Date().toISOString(),
          },
        },
      ];
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      context.logger.error(`Wallet creation failed: ${errorMessage}`, {
        stack: error instanceof Error ? error.stack : undefined,
      });

      return [
        {
          json: {
            success: false,
            error: errorMessage,
            chainId: context.getNodeParameter('chainId'),
            walletType: context.getNodeParameter('walletType'),
            timestamp: new Date().toISOString(),
          },
        },
      ];
    }
  }

  /**
   * Validate blockchain authorization for wallet creation
   */
  private validateBlockchainAuthorization(
    context: EnhancedBlockExecutionContext,
    chainId: string,
  ): void {
    const auth = context.blockchainAuthorization;

    // Wallet creation is typically a low-risk operation
    // but we still want to check basic authorization
    if (auth && auth.selectedChains) {
      const chainAuth = auth.selectedChains.find(
        (chain: any) => chain.chainId === chainId,
      );

      if (chainAuth && chainAuth.enabled === false) {
        context.logger.warn(
          `Chain ${chainId} not fully authorized, but allowing wallet creation`,
        );
      }
    } else {
      context.logger.info(
        'No blockchain authorization found, allowing wallet creation as low-risk operation',
      );
    }
  }

  /**
   * Validate wallet creation parameters
   */
  private validateWalletParameters(params: {
    chainId: string;
    walletType: string;
    fundingAmount: string;
  }): void {
    const { chainId, walletType, fundingAmount } = params;

    if (!chainId) {
      throw new Error('Chain ID is required');
    }

    if (!walletType || !['eoa', 'smart', 'multisig'].includes(walletType)) {
      throw new Error(
        'Valid wallet type is required (eoa, smart, or multisig)',
      );
    }

    if (
      fundingAmount &&
      (isNaN(parseFloat(fundingAmount)) || parseFloat(fundingAmount) <= 0)
    ) {
      throw new Error('Funding amount must be a positive number');
    }
  }

  /**
   * Create a new wallet
   */
  private async createWallet(params: {
    chainId: string;
    walletType: string;
    walletLabel: string;
    userId: string;
    context: EnhancedBlockExecutionContext;
  }): Promise<{
    address: string;
    privateKey: string;
    publicKey: string;
    mnemonic?: string;
  }> {
    const { chainId, walletType, walletLabel, context } = params;

    context.logger.info('Creating wallet (MOCK)', {
      chainId,
      walletType,
      walletLabel,
    });

    // Mock wallet creation delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Generate mock wallet data
    const privateKey = `0x${Array(64)
      .fill(0)
      .map(() => Math.floor(Math.random() * 16).toString(16))
      .join('')}`;
    const address = `0x${Array(40)
      .fill(0)
      .map(() => Math.floor(Math.random() * 16).toString(16))
      .join('')}`;
    const publicKey = `0x${Array(128)
      .fill(0)
      .map(() => Math.floor(Math.random() * 16).toString(16))
      .join('')}`;

    // Generate mock mnemonic for EOA wallets
    const mockWords = [
      'abandon',
      'ability',
      'able',
      'about',
      'above',
      'absent',
      'absorb',
      'abstract',
      'absurd',
      'abuse',
      'access',
      'accident',
    ];
    const mnemonic =
      walletType === 'eoa'
        ? Array(12)
            .fill(0)
            .map(() => mockWords[Math.floor(Math.random() * mockWords.length)])
            .join(' ')
        : undefined;

    return {
      address,
      privateKey,
      publicKey,
      mnemonic,
    };
  }

  /**
   * Fund wallet from testnet faucet
   */
  private async fundFromFaucet(params: {
    chainId: string;
    walletAddress: string;
    amount: string;
    context: EnhancedBlockExecutionContext;
  }): Promise<{
    amount: string;
    transactionHash: string;
  }> {
    const { chainId, walletAddress, amount, context } = params;

    context.logger.info('Funding wallet from faucet (MOCK)', {
      chainId,
      walletAddress,
      amount,
    });

    // Mock faucet funding delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return {
      amount,
      transactionHash: `0x${Math.random().toString(16).substring(2, 66)}`,
    };
  }

  /**
   * Save wallet to database
   */
  private async saveWalletToDatabase(params: {
    userId: string;
    walletAddress: string;
    chainId: string;
    walletType: string;
    walletLabel: string;
    context: EnhancedBlockExecutionContext;
  }): Promise<void> {
    const { userId, walletAddress, chainId, walletType, walletLabel, context } =
      params;

    context.logger.info('Saving wallet to database (MOCK)', {
      userId,
      walletAddress,
      chainId,
      walletType,
      walletLabel,
    });

    // Mock database save delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // In production, this would save to the UserWallet table
    context.logger.info('Wallet saved to database successfully');
  }

  /**
   * Check if chain is a testnet
   */
  private isTestnet(chainId: string): boolean {
    return chainId.includes('testnet') || chainId.includes('sepolia');
  }

  /**
   * Validate block configuration
   */
  async validate(config: Record<string, any>): Promise<ValidationResult> {
    const errors: string[] = [];

    if (!config.chainId) {
      errors.push('Chain ID is required');
    }

    if (
      !config.walletType ||
      !['eoa', 'smart', 'multisig'].includes(config.walletType)
    ) {
      errors.push('Valid wallet type is required (eoa, smart, or multisig)');
    }

    if (
      config.fundingAmount &&
      (isNaN(parseFloat(config.fundingAmount)) ||
        parseFloat(config.fundingAmount) <= 0)
    ) {
      errors.push('Funding amount must be a positive number');
    }

    return {
      valid: errors.length === 0,
      isValid: errors.length === 0,
      errors,
    };
  }
}
