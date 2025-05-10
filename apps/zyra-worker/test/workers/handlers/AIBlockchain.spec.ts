import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { AiBlockchain } from '../../../src/workers/handlers/AIBlockchain';
import { TestBlockExecutionContext } from '../../utils/test-types';

import { Logger } from '@nestjs/common';
import { createMockSupabaseClient } from '../../utils/mocks';
import * as serviceClient from '../../../src/lib/supabase/serviceClient';
import * as fs from 'fs';
import * as path from 'path';



// Mock the createServiceClient function
jest.mock('../../../src/lib/supabase/serviceClient', () => ({
  createServiceClient: jest.fn(),
}));

// Mock the fs module
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined as any),
    writeFile: jest.fn().mockResolvedValue(undefined as any),
    readFile: jest.fn().mockResolvedValue(JSON.stringify({ address: '0x123456789', privateKey: 'test-private-key' })),
    access: jest.fn().mockImplementation((path: string, mode: number) => {
      if (path.includes('existing')) {
        return Promise.resolve();
      }
      return Promise.reject(new Error('File not found'));
    }),
    existsSync: jest.fn().mockImplementation((path: string) => {
      if (path.includes('existing')) {
        return true;
      }
      return false;
    }),
  },
  existsSync: jest.fn().mockReturnValue(true),
}));

// Mock the path module
jest.mock('path', () => ({
  join: jest.fn().mockImplementation((...args) => args.join('/')),
  dirname: jest.fn().mockReturnValue('/mock/dir'),
}));

// Mock the ethers library
jest.mock('ethers', () => {
  const mockProvider = {
    getBalance: jest.fn().mockResolvedValue({ toString: () => '1000000000000000000' } as any),
    getGasPrice: jest.fn().mockResolvedValue({ toString: () => '20000000000' } as any),
    getTransactionCount: jest.fn().mockResolvedValue(5 as any),
    estimateGas: jest.fn().mockResolvedValue({ toString: () => '21000' } as any),
    getNetwork: jest.fn().mockResolvedValue({ name: 'testnet', chainId: 1 } as any),
    getBlock: jest.fn().mockResolvedValue({ number: 12345 }),
  };
  
  const mockWallet = {
    address: '0x123456789',
    privateKey: 'test-private-key',
    connect: jest.fn().mockReturnValue({
      provider: mockProvider,
      getAddress: jest.fn().mockReturnValue('0x123456789'),
      sendTransaction: jest.fn().mockResolvedValue({
        hash: '0xabcdef1234567890',
        wait: jest.fn().mockResolvedValue({ status: 1 }),
      }),
    }),
  };
  
  return {
    providers: {
      JsonRpcProvider: jest.fn().mockReturnValue(mockProvider),
    },
    Wallet: jest.fn().mockReturnValue(mockWallet),
    utils: {
      parseEther: jest.fn().mockImplementation((value) => ({ toString: () => value + '000000000000000000' })),
      formatEther: jest.fn().mockImplementation((value) => value.toString().replace('000000000000000000', '')),
      isAddress: jest.fn().mockImplementation((address) => address.startsWith('0x')),
    },
  };
});

// Mock the OpenAI API
jest.mock('openai', () => {
  const mockCompletion = {
    choices: [
      {
        message: {
          content: 'This is a mock AI response',
        },
      },
    ],
  };
  
  return {
    OpenAI: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue(mockCompletion),
        },
      },
    })),
  };
});

describe('AiBlockchain', () => {
  let aiBlockchainHandler: AiBlockchain;
  let mockLogger: jest.Mocked<Logger>;
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(async () => {
    // Create mocks
    mockSupabase = createMockSupabaseClient();
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as unknown as jest.Mocked<Logger>;
    
    // Mock the createServiceClient function to return our mock Supabase client
    (serviceClient.createServiceClient as jest.Mock).mockReturnValue(mockSupabase.client);
    
    // Set up environment variables for testing
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.WALLET_STORAGE_PATH = '/tmp/wallets';
    process.env.ETHEREUM_RPC_URL = 'https://eth-testnet.example.com';
    
    // Create the testing module
    const moduleRef = await Test.createTestingModule({
      providers: [
        {
          provide: AiBlockchain,
          useFactory: () => new AiBlockchain(mockLogger)
        },
      ],
    }).compile();
    
    // Get the service instance
    aiBlockchainHandler = moduleRef.get<AiBlockchain>(AiBlockchain);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clean up environment variables
    delete process.env.OPENAI_API_KEY;
    delete process.env.WALLET_STORAGE_PATH;
    delete process.env.ETHEREUM_RPC_URL;
  });

  describe('execute', () => {
    it('should execute an AI query operation successfully', async () => {
      // Create a mock execution context for AI query
      const context: TestBlockExecutionContext = {
        executionId: 'test-execution-id',
        nodeId: 'test-node-id',
        userId: 'test-user-id',
        blockData: {
          operation: 'query',
          parameters: {
            prompt: 'What is the current price of Ethereum?',
          },
          config: {
            timeout: 30000,
            retries: 3,
          },
        },
        inputs: {},
      };
      
      // Execute the block
      const result = await aiBlockchainHandler.execute(context, context);
      
      // Verify that the AI query was successful
      expect(result.aiResponse).toBeTruthy();
      expect(result.metadata).toBeTruthy();
      expect(result.toolResults).toBeTruthy();
      // Verify expected data
      expect(result.metadata).toMatchObject({
        response: 'This is a mock AI response',
      });
      
      // Verify that OpenAI was called with the correct parameters
      const OpenAI = require('openai').OpenAI;
      const openaiInstance = new OpenAI();
      expect(openaiInstance.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('What is the current price of Ethereum?'),
            }),
          ]),
        })
      );
    });
    
    it('should execute a wallet creation operation successfully', async () => {
      // Create a mock execution context for wallet creation
      const context: TestBlockExecutionContext = {
        executionId: 'test-execution-id',
        nodeId: 'test-node-id',
        userId: 'test-user-id',
        blockData: {
          operation: 'create_wallet',
          parameters: {
            walletName: 'test-wallet',
          },
          config: {
            timeout: 30000,
            retries: 3,
          },
        },
        inputs: {},
      };
      
      // Execute the block
      const result = await aiBlockchainHandler.execute(context, context);
      
      // Verify that the wallet creation was successful
      expect(result.aiResponse).toBeTruthy();
      expect(result.metadata).toBeTruthy();
      expect(result.toolResults).toBeTruthy();
      // Verify expected data
      expect(result.metadata).toMatchObject({
        walletAddress: '0x123456789',
        walletName: 'test-wallet',
      });
      
      // Verify that the wallet was created and saved
      expect(fs.promises.mkdir).toHaveBeenCalled();
      expect(fs.promises.writeFile).toHaveBeenCalled();
    });
    
    it('should execute a wallet balance check operation successfully', async () => {
      // Create a mock execution context for balance check
      const context: TestBlockExecutionContext = {
        executionId: 'test-execution-id',
        nodeId: 'test-node-id',
        userId: 'test-user-id',
        blockData: {
          operation: 'check_balance',
          parameters: {
            walletName: 'existing-wallet',
          },
          config: {
            timeout: 30000,
            retries: 3,
          },
        },
        inputs: {},
      };
      
      // Execute the block
      const result = await aiBlockchainHandler.execute(context, context);
      
      // Verify that the balance check was successful
      expect(result.aiResponse).toBeTruthy();
      expect(result.metadata).toBeTruthy();
      expect(result.toolResults).toBeTruthy();
      // Verify expected data
      expect(result.metadata).toMatchObject({
        balance: '1',
        walletAddress: '0x123456789',
        walletName: 'existing-wallet',
      });
      
      // Verify that the wallet was loaded and the balance was checked
      expect(fs.promises.readFile).toHaveBeenCalled();
      const ethers = require('ethers');
      const provider = new ethers.providers.JsonRpcProvider();
      expect(provider.getBalance).toHaveBeenCalled();
    });
    
    it('should execute a transaction operation successfully', async () => {
      // Create a mock execution context for transaction
      const context: TestBlockExecutionContext = {
        executionId: 'test-execution-id',
        nodeId: 'test-node-id',
        userId: 'test-user-id',
        blockData: {
          operation: 'send_transaction',
          parameters: {
            walletName: 'existing-wallet',
            toAddress: '0x987654321',
            amount: '0.1',
          },
          config: {
            timeout: 30000,
            retries: 3,
          },
        },
        inputs: {},
      };
      
      // Execute the block
      const result = await aiBlockchainHandler.execute(context, context);
      
      // Verify that the transaction was successful
      expect(result.aiResponse).toBeTruthy();
      expect(result.metadata).toBeTruthy();
      expect(result.toolResults).toBeTruthy();
      // Verify expected data
      expect(result.metadata).toMatchObject({
        transactionHash: '0xabcdef1234567890',
        fromAddress: '0x123456789',
        toAddress: '0x987654321',
        amount: '0.1',
        status: 'confirmed',
      });
      
      // Verify that the wallet was loaded and the transaction was sent
      expect(fs.promises.readFile).toHaveBeenCalled();
      const ethers = require('ethers');
      const wallet = new ethers.Wallet();
      const connectedWallet = wallet.connect();
      expect(connectedWallet.sendTransaction).toHaveBeenCalled();
    });
    
    it('should handle missing OpenAI API key', async () => {
      // Clear the OpenAI API key
      delete process.env.OPENAI_API_KEY;
      
      // Create a mock execution context for AI query
      const context: TestBlockExecutionContext = {
        executionId: 'test-execution-id',
        nodeId: 'test-node-id',
        userId: 'test-user-id',
        blockData: {
          operation: 'query',
          parameters: {
            prompt: 'What is the current price of Ethereum?',
          },
          config: {
            timeout: 30000,
            retries: 3,
          },
        },
        inputs: {},
      };
      
      // Execute the block and expect it to throw
      await expect(aiBlockchainHandler.execute(context, context)).rejects.toThrow('OpenAI API key is not configured');
    });
    
    it('should handle missing Ethereum RPC URL', async () => {
      // Clear the Ethereum RPC URL
      delete process.env.ETHEREUM_RPC_URL;
      
      // Create a mock execution context for balance check
      const context: TestBlockExecutionContext = {
        executionId: 'test-execution-id',
        nodeId: 'test-node-id',
        userId: 'test-user-id',
        blockData: {
          operation: 'check_balance',
          parameters: {
            walletName: 'existing-wallet',
          },
          config: {
            timeout: 30000,
            retries: 3,
          },
        },
        inputs: {},
      };
      
      // Execute the block and expect it to throw
      await expect(aiBlockchainHandler.execute(context, context)).rejects.toThrow('Ethereum RPC URL is not configured');
    });
    
    it('should handle wallet not found', async () => {
      // Create a mock execution context for a non-existent wallet
      const context: TestBlockExecutionContext = {
        executionId: 'test-execution-id',
        nodeId: 'test-node-id',
        userId: 'test-user-id',
        blockData: {
          operation: 'check_balance',
          parameters: {
            walletName: 'non-existent-wallet',
          },
          config: {
            timeout: 30000,
            retries: 3,
          },
        },
        inputs: {},
      };
      
      // Mock fs.access to throw for non-existent wallet
      fs.promises.access = jest.fn().mockRejectedValue(new Error('File not found'));
      
      // Execute the block and expect it to throw
      await expect(aiBlockchainHandler.execute(context, context)).rejects.toThrow('Wallet not found');
    });
    
    it('should handle transaction failures', async () => {
      // Create a mock execution context for transaction
      const context: TestBlockExecutionContext = {
        executionId: 'test-execution-id',
        nodeId: 'test-node-id',
        userId: 'test-user-id',
        blockData: {
          operation: 'send_transaction',
          parameters: {
            walletName: 'existing-wallet',
            toAddress: '0x987654321',
            amount: '0.1',
          },
          config: {
            timeout: 30000,
            retries: 3,
          },
        },
        inputs: {},
      };
      
      // Mock the sendTransaction method to throw an error
      const ethers = require('ethers');
      const wallet = new ethers.Wallet();
      const connectedWallet = wallet.connect();
      connectedWallet.sendTransaction.mockRejectedValueOnce(new Error('Transaction failed'));
      
      // Execute the block and expect it to throw
      await expect(aiBlockchainHandler.execute(context, context)).rejects.toThrow('Transaction failed');
    });
    
    it('should handle invalid wallet names', async () => {
      // Create a mock execution context with an invalid wallet name
      const context: TestBlockExecutionContext = {
        executionId: 'test-execution-id',
        nodeId: 'test-node-id',
        userId: 'test-user-id',
        blockData: {
          operation: 'create_wallet',
          parameters: {
            walletName: '../invalid/wallet',
          },
          config: {
            timeout: 30000,
            retries: 3,
          },
        },
        inputs: {},
      };
      
      // Execute the block and expect it to throw
      await expect(aiBlockchainHandler.execute(context, context)).rejects.toThrow('Invalid wallet name');
    });
    
    it('should handle invalid addresses', async () => {
      // Create a mock execution context with an invalid address
      const context: TestBlockExecutionContext = {
        executionId: 'test-execution-id',
        nodeId: 'test-node-id',
        userId: 'test-user-id',
        blockData: {
          operation: 'send_transaction',
          parameters: {
            walletName: 'existing-wallet',
            toAddress: 'invalid-address',
            amount: '0.1',
          },
          config: {
            timeout: 30000,
            retries: 3,
          },
        },
        inputs: {},
      };
      
      // Mock the isAddress method to return false for invalid addresses
      const ethers = require('ethers');
      ethers.utils.isAddress.mockReturnValueOnce(false);
      
      // Execute the block and expect it to throw
      await expect(aiBlockchainHandler.execute(context, context)).rejects.toThrow('Invalid Ethereum address');
    });
    
    it('should handle invalid amounts', async () => {
      // Create a mock execution context with an invalid amount
      const context: TestBlockExecutionContext = {
        executionId: 'test-execution-id',
        nodeId: 'test-node-id',
        userId: 'test-user-id',
        blockData: {
          operation: 'send_transaction',
          parameters: {
            walletName: 'existing-wallet',
            toAddress: '0x987654321',
            amount: 'invalid-amount',
          },
          config: {
            timeout: 30000,
            retries: 3,
          },
        },
        inputs: {},
      };
      
      // Mock the parseEther method to throw for invalid amounts
      const ethers = require('ethers');
      ethers.utils.parseEther.mockImplementationOnce(() => {
        throw new Error('Invalid amount');
      });
      
      // Execute the block and expect it to throw
      await expect(aiBlockchainHandler.execute(context, context)).rejects.toThrow('Invalid amount');
    });
    
    it('should handle insufficient funds', async () => {
      // Create a mock execution context for transaction
      const context: TestBlockExecutionContext = {
        executionId: 'test-execution-id',
        nodeId: 'test-node-id',
        userId: 'test-user-id',
        blockData: {
          operation: 'send_transaction',
          parameters: {
            walletName: 'existing-wallet',
            toAddress: '0x987654321',
            amount: '100', // Large amount
          },
          config: {
            timeout: 30000,
            retries: 3,
          },
        },
        inputs: {},
      };
      
      // Mock the getBalance method to return a small balance
      const ethers = require('ethers');
      const provider = new ethers.providers.JsonRpcProvider();
      provider.getBalance.mockResolvedValueOnce({ toString: () => '100000000000000' }); // Small balance
      
      // Execute the block and expect it to throw
      await expect(aiBlockchainHandler.execute(context, context)).rejects.toThrow('Insufficient funds');
    });
  });

  describe('validate', () => {
    it('should validate valid AI query data', () => {
      // Create valid AI query data
      const data = {
        operation: 'query',
        parameters: {
          prompt: 'What is the current price of Ethereum?',
        },
      };
      
      // Validate the data
      const result = (aiBlockchainHandler as any).validate(data);
      
      // Verify that the validation passed
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });
    
    it('should validate valid wallet creation data', () => {
      // Create valid wallet creation data
      const data = {
        operation: 'create_wallet',
        parameters: {
          walletName: 'test-wallet',
        },
      };
      
      // Validate the data
      const result = (aiBlockchainHandler as any).validate(data);
      
      // Verify that the validation passed
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });
    
    it('should validate valid balance check data', () => {
      // Create valid balance check data
      const data = {
        operation: 'check_balance',
        parameters: {
          walletName: 'test-wallet',
        },
      };
      
      // Validate the data
      const result = (aiBlockchainHandler as any).validate(data);
      
      // Verify that the validation passed
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });
    
    it('should validate valid transaction data', () => {
      // Create valid transaction data
      const data = {
        operation: 'send_transaction',
        parameters: {
          walletName: 'test-wallet',
          toAddress: '0x987654321',
          amount: '0.1',
        },
      };
      
      // Validate the data
      const result = (aiBlockchainHandler as any).validate(data);
      
      // Verify that the validation passed
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });
    
    it('should invalidate missing operation', () => {
      // Create data with missing operation
      const data = {
        parameters: {
          prompt: 'What is the current price of Ethereum?',
        },
      };
      
      // Validate the data
      const result = (aiBlockchainHandler as any).validate(data);
      
      // Verify that the validation failed
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Operation is required');
    });
    
    it('should invalidate unknown operation', () => {
      // Create data with an unknown operation
      const data = {
        operation: 'unknown_operation',
        parameters: {},
      };
      
      // Validate the data
      const result = (aiBlockchainHandler as any).validate(data);
      
      // Verify that the validation failed
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Unknown operation: unknown_operation');
    });
    
    it('should invalidate missing prompt for query operation', () => {
      // Create data with missing prompt
      const data = {
        operation: 'query',
        parameters: {},
      };
      
      // Validate the data
      const result = (aiBlockchainHandler as any).validate(data);
      
      // Verify that the validation failed
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Prompt is required for query operation');
    });
    
    it('should invalidate missing wallet name for wallet operations', () => {
      // Create data with missing wallet name
      const data = {
        operation: 'create_wallet',
        parameters: {},
      };
      
      // Validate the data
      const result = (aiBlockchainHandler as any).validate(data);
      
      // Verify that the validation failed
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Wallet name is required');
    });
    
    it('should invalidate missing parameters for transaction', () => {
      // Create data with missing transaction parameters
      const data = {
        operation: 'send_transaction',
        parameters: {
          walletName: 'test-wallet',
          // Missing toAddress and amount
        },
      };
      
      // Validate the data
      const result = (aiBlockchainHandler as any).validate(data);
      
      // Verify that the validation failed
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('To address is required for transaction');
      expect(result.errors).toContain('Amount is required for transaction');
    });
  });
});
