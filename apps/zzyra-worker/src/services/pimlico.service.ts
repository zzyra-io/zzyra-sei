// /* eslint-disable @typescript-eslint/ban-ts-comment */
// /* eslint-disable @typescript-eslint/no-explicit-any */
// /// <reference path="./pimlico.d.ts" />
// import { Injectable, Logger } from '@nestjs/common';
// import {
//   Address,
//   createPublicClient,
//   encodeFunctionData,
//   http,
//   parseEther,
//   parseUnits,
// } from 'viem';
// import { entryPoint07Address } from 'viem/account-abstraction';
// import { privateKeyToAccount } from 'viem/accounts';
// import { base, baseSepolia, seiTestnet, sepolia } from 'viem/chains';
// import { IAccountAbstractionService } from './blockchain/base/IBlockchainService';
// import {
//   TransactionRequest as BlockchainTransactionRequest,
//   TransactionResult as BlockchainTransactionResult,
//   ChainConfig,
//   GasEstimate,
// } from './blockchain/types/blockchain.types';

// // Dynamic imports to avoid TypeScript compilation issues
// let createSmartAccountClient: any;
// let toKernelSmartAccount: any;
// let createPimlicoClient: any;

// // Initialize imports asynchronously
// const initPermissionlessImports = async () => {
//   if (!createSmartAccountClient) {
//     const permissionless = await import('permissionless');
//     const accounts = await import('permissionless/accounts');
//     const pimlico = await import('permissionless/clients/pimlico');

//     createSmartAccountClient = permissionless.createSmartAccountClient;
//     toKernelSmartAccount = accounts.toKernelSmartAccount;
//     createPimlicoClient = pimlico.createPimlicoClient;
//   }
// };

// interface PimlicoAccountConfig {
//   ownerPrivateKey: string;
//   chainId: number;
//   delegationMode?: 'immediate' | 'delegated' | 'hybrid';
// }

// interface SessionKeyConfig {
//   sessionPrivateKey: string;
//   smartWalletAddress: string;
//   chainId: number;
//   permissions: {
//     operations: string[];
//     maxAmountPerTx: string;
//     maxDailyAmount: string;
//     validUntil: Date;
//   };
// }

// interface TransactionRequest {
//   to: string;
//   value: string;
//   data?: string;
//   chainId: number;
// }

// @Injectable()
// export class PimlicoService implements IAccountAbstractionService {
//   private readonly logger = new Logger(PimlicoService.name);
//   private readonly pimlicoApiKey: string;
//   private readonly supportedChains = [seiTestnet, sepolia, base, baseSepolia];

//   constructor() {
//     this.pimlicoApiKey = process.env.PIMLICO_API_KEY || '';

//     if (!this.pimlicoApiKey) {
//       this.logger.warn(
//         'PIMLICO_API_KEY not configured - Account Abstraction features will be limited',
//       );
//     }
//   }

//   /**
//    * Get chain configuration by chain ID
//    */
//   private getChainConfig(chainId: number) {
//     const chain = this.supportedChains.find((c) => c.id === chainId);
//     if (!chain) {
//       throw new Error(`Unsupported chain ID: ${chainId}`);
//     }
//     return chain;
//   }

//   /**
//    * Create clients for blockchain operations
//    */
//   private createClients(chainId: number) {
//     const chain = this.getChainConfig(chainId);
//     const bundlerUrl = `https://api.pimlico.io/v2/${chainId}/rpc?apikey=${this.pimlicoApiKey}`;
//     const paymasterUrl = `https://api.pimlico.io/v2/${chainId}/rpc?apikey=${this.pimlicoApiKey}`;

//     const publicClient = createPublicClient({
//       transport: http(chain.rpcUrls.default.http[0]),
//       chain,
//     });

//     return {
//       publicClient,
//       chain,
//       bundlerUrl,
//       paymasterUrl,
//     };
//   }

//   /**
//    * Create a smart account using Pimlico SDK
//    */
//   async createSmartAccount(config: PimlicoAccountConfig): Promise<{
//     smartAccountAddress: string;
//     ownerAddress: string;
//     chainId: number;
//     delegationMode: string;
//     deploymentRequired: boolean;
//     smartAccountClient?: any;
//   }> {
//     try {
//       // Initialize permissionless imports
//       await initPermissionlessImports();

//       const { publicClient, chain, bundlerUrl, paymasterUrl } =
//         this.createClients(config.chainId);

//       // Create owner account from private key
//       const owner = privateKeyToAccount(
//         config.ownerPrivateKey as `0x${string}`,
//       );

//       // Create Pimlico paymaster client
//       // @ts-nocheck
//       const pimlicoClient = (createPimlicoClient as any)({
//         transport: http(paymasterUrl),
//         entryPoint: {
//           address: entryPoint07Address,
//           version: '0.7',
//         },
//       });

//       // Create Kernel smart account
//       // @ts-nocheck
//       const kernelAccount = await (toKernelSmartAccount as any)({
//         client: publicClient,
//         owners: [owner],
//         entryPoint: {
//           address: entryPoint07Address,
//           version: '0.7',
//         },
//       });

//       // Check if account needs deployment
//       const code = await publicClient.getBytecode({
//         address: kernelAccount.address,
//       });
//       const deploymentRequired = !code || code === '0x';

//       this.logger.log('Pimlico Kernel account created', {
//         smartAccountAddress: kernelAccount.address,
//         ownerAddress: owner.address,
//         deploymentRequired,
//         chainId: config.chainId,
//         entryPoint: entryPoint07Address,
//       });

//       return {
//         smartAccountAddress: kernelAccount.address,
//         ownerAddress: owner.address,
//         chainId: config.chainId,
//         delegationMode: config.delegationMode || 'immediate',
//         deploymentRequired,
//         smartAccountClient: kernelAccount,
//       };
//     } catch (error) {
//       this.logger.error('Failed to create Pimlico smart account', {
//         chainId: config.chainId,
//         error: error instanceof Error ? error.message : 'Unknown error',
//       });
//       throw new Error(
//         `Failed to create smart account: ${error instanceof Error ? error.message : 'Unknown error'}`,
//       );
//     }
//   }

//   /**
//    * Execute transaction using Zzyra session key data format (compatibility method)
//    */
//   async executeWithZyraSessionKey(
//     sessionKeyData: any,
//     decryptedSessionPrivateKey: string,
//     ownerPrivateKey: string,
//     transaction: TransactionRequest,
//   ): Promise<BlockchainTransactionResult> {
//     try {
//       const sessionConfig = {
//         sessionPrivateKey: decryptedSessionPrivateKey,
//         smartWalletAddress:
//           sessionKeyData.smartWalletOwner || sessionKeyData.walletAddress,
//         chainId: transaction.chainId,
//         permissions: {
//           operations: ['send', 'transfer', 'approve', 'eth_transfer'],
//           maxAmountPerTx: '10.0',
//           maxDailyAmount: '100.0',
//           validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
//         },
//       };

//       this.logger.log('Executing transaction with Zzyra session key format', {
//         sessionKeyId: sessionKeyData.id,
//         smartWalletAddress: sessionConfig.smartWalletAddress,
//         chainId: sessionConfig.chainId,
//       });

//       return await this.executeWithSessionKey(sessionConfig, transaction);
//     } catch (error) {
//       this.logger.error('Failed to execute with Zzyra session key format', {
//         error: error instanceof Error ? error.message : String(error),
//         sessionKeyId: sessionKeyData.id,
//       });
//       throw error;
//     }
//   }

//   /**
//    * Execute transaction using Pimlico SDK with session key
//    */
//   async executeWithSessionKey(
//     sessionConfig: SessionKeyConfig,
//     transaction: TransactionRequest,
//   ): Promise<BlockchainTransactionResult> {
//     try {
//       // Initialize permissionless imports
//       await initPermissionlessImports();

//       const { publicClient, chain, bundlerUrl, paymasterUrl } =
//         this.createClients(transaction.chainId);

//       // Create session key signer
//       const sessionKeySigner = privateKeyToAccount(
//         sessionConfig.sessionPrivateKey as `0x${string}`,
//       );

//       // Create Pimlico paymaster client
//       // @ts-nocheck
//       const pimlicoClient = (createPimlicoClient as any)({
//         transport: http(paymasterUrl),
//         entryPoint: {
//           address: entryPoint07Address,
//           version: '0.7',
//         },
//       });

//       // Create Kernel smart account with session key as owner
//       // @ts-nocheck
//       const kernelAccount = await (toKernelSmartAccount as any)({
//         client: publicClient,
//         owners: [sessionKeySigner],
//         entryPoint: {
//           address: entryPoint07Address,
//           version: '0.7',
//         },
//         address: sessionConfig.smartWalletAddress as `0x${string}`,
//       });

//       // Create smart account client
//       // @ts-nocheck
//       const smartAccountClient = (createSmartAccountClient as any)({
//         account: kernelAccount,
//         chain,
//         bundlerTransport: http(bundlerUrl),
//         paymaster: pimlicoClient,
//         userOperation: {
//           estimateFeesPerGas: async () => {
//             // @ts-nocheck
//             const gasPrice = await (
//               pimlicoClient as any
//             ).getUserOperationGasPrice();
//             return gasPrice.fast;
//           },
//         },
//       });

//       this.logger.log('Executing transaction with Pimlico Kernel SDK', {
//         to: transaction.to,
//         value: transaction.value,
//         smartAccount: kernelAccount.address,
//         sessionKey: sessionKeySigner.address,
//       });

//       // Execute transaction
//       // @ts-nocheck
//       const txHash = await (smartAccountClient as any).sendTransaction({
//         to: transaction.to as `0x${string}`,
//         value: parseEther(transaction.value || '0'),
//         data: (transaction.data as `0x${string}`) || '0x',
//       });

//       this.logger.log('Pimlico Kernel SDK transaction successful', {
//         transactionHash: txHash,
//         chainId: transaction.chainId,
//         smartAccount: kernelAccount.address,
//       });

//       return {
//         hash: txHash,
//         success: true,
//         status: 'success',
//         explorerUrl: this.getExplorerUrl(transaction.chainId, txHash),
//       };
//     } catch (error) {
//       this.logger.error('Pimlico Kernel SDK execution failed', {
//         error: error instanceof Error ? error.message : String(error),
//         smartWalletAddress: sessionConfig.smartWalletAddress,
//       });

//       return {
//         hash: '',
//         success: false,
//         status: 'failed',
//         error: error instanceof Error ? error.message : 'Unknown error',
//       };
//     }
//   }

//   /**
//    * Deploy smart wallet if needed
//    */
//   async deploySmartWalletIfNeeded(
//     smartWalletAddress: string,
//     ownerPrivateKey: string,
//     chainId: number,
//   ): Promise<{
//     deployed: boolean;
//     deploymentHash?: string;
//     error?: string;
//   }> {
//     try {
//       const { publicClient } = this.createClients(chainId);

//       // Check if account has code
//       const code = await publicClient.getBytecode({
//         address: smartWalletAddress as Address,
//       });

//       if (code && code !== '0x') {
//         this.logger.log('Smart wallet already deployed', {
//           smartWalletAddress,
//           chainId,
//         });
//         return { deployed: true };
//       }

//       this.logger.log('Smart wallet deployment needed', {
//         smartWalletAddress,
//         chainId,
//       });

//       return {
//         deployed: false, // Will be deployed on first transaction
//       };
//     } catch (error) {
//       this.logger.error('Failed to check wallet deployment', {
//         smartWalletAddress,
//         chainId,
//         error: error instanceof Error ? error.message : 'Unknown error',
//       });

//       return {
//         deployed: false,
//         error: error instanceof Error ? error.message : 'Unknown error',
//       };
//     }
//   }

//   /**
//    * Execute ERC20 token transfer using AA
//    */
//   async executeERC20Transfer(
//     sessionConfig: SessionKeyConfig,
//     tokenAddress: string,
//     toAddress: string,
//     amount: string,
//     decimals: number = 18,
//   ): Promise<BlockchainTransactionResult> {
//     try {
//       // Validate and normalize amount
//       const normalizedAmount = this.validateAndNormalizeValue(amount);

//       // Encode ERC20 transfer data
//       const transferData = encodeFunctionData({
//         abi: [
//           {
//             inputs: [
//               { name: '_to', type: 'address' },
//               { name: '_value', type: 'uint256' },
//             ],
//             name: 'transfer',
//             outputs: [{ name: '', type: 'bool' }],
//             stateMutability: 'nonpayable',
//             type: 'function',
//           },
//         ],
//         functionName: 'transfer',
//         args: [toAddress as Address, parseUnits(normalizedAmount, decimals)],
//       });

//       // Execute as contract interaction using AA
//       return await this.executeWithSessionKey(sessionConfig, {
//         to: tokenAddress,
//         value: '0',
//         data: transferData,
//         chainId: sessionConfig.chainId,
//       });
//     } catch (error) {
//       this.logger.error('Failed to execute ERC20 transfer', { error });
//       return {
//         hash: '',
//         success: false,
//         status: 'failed',
//         error: error instanceof Error ? error.message : 'Unknown error',
//       };
//     }
//   }

//   /**
//    * Get ERC20 token balance
//    */
//   async getERC20Balance(
//     tokenAddress: string,
//     walletAddress: string,
//     chainId: number,
//   ): Promise<string> {
//     try {
//       const { publicClient } = this.createClients(chainId);

//       const balance = await publicClient.readContract({
//         address: tokenAddress as Address,
//         abi: [
//           {
//             inputs: [{ name: '_owner', type: 'address' }],
//             name: 'balanceOf',
//             outputs: [{ name: 'balance', type: 'uint256' }],
//             stateMutability: 'view',
//             type: 'function',
//           },
//         ],
//         functionName: 'balanceOf',
//         args: [walletAddress as Address],
//       });

//       return balance.toString();
//     } catch (error) {
//       this.logger.error('Failed to get ERC20 balance', { error });
//       return '0';
//     }
//   }

//   /**
//    * Validate and normalize transaction value
//    */
//   private validateAndNormalizeValue(value: string): string {
//     if (!value && value !== '0') {
//       throw new Error('Transaction value is required');
//     }

//     if (value === '' || value === null || value === undefined) {
//       return '0';
//     }

//     const valueStr = String(value).trim();
//     if (valueStr === '') {
//       return '0';
//     }

//     const numValue = parseFloat(valueStr);
//     if (isNaN(numValue)) {
//       throw new Error(
//         `Invalid transaction value: ${valueStr}. Must be a valid number.`,
//       );
//     }

//     if (numValue < 0) {
//       throw new Error(
//         `Invalid transaction value: ${valueStr}. Cannot be negative.`,
//       );
//     }

//     return numValue.toString();
//   }

//   // =============================================================================
//   // IBlockchainService Interface Implementation
//   // =============================================================================

//   /**
//    * Get supported chain configurations
//    */
//   getSupportedChains(): ChainConfig[] {
//     return this.supportedChains.map((chain) => ({
//       id: chain.id,
//       name: chain.name,
//       rpcUrl: chain.rpcUrls.default.http[0],
//       explorerUrl: chain.blockExplorers?.default?.url || '',
//       nativeCurrency: chain.nativeCurrency,
//       testnet: 'testnet' in chain ? chain.testnet : false,
//     }));
//   }

//   /**
//    * Check if a chain is supported by this service
//    */
//   isChainSupported(chainId: number): boolean {
//     return this.supportedChains.some((chain) => chain.id === chainId);
//   }

//   /**
//    * Execute a standard blockchain transaction (delegates to executeWithSessionKey)
//    */
//   async executeTransaction(
//     transaction: BlockchainTransactionRequest,
//     walletConfig: { privateKey: string; address: string },
//   ): Promise<BlockchainTransactionResult> {
//     // Convert wallet config to session config for AA execution
//     const sessionConfig = {
//       sessionPrivateKey: walletConfig.privateKey,
//       smartWalletAddress: walletConfig.address,
//       chainId: transaction.chainId,
//       permissions: {
//         operations: ['eth_transfer', 'erc20_transfer', 'contract_interaction'],
//         maxAmountPerTx: '1000000', // High limit for general use
//         maxDailyAmount: '10000000', // High limit for general use
//         validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
//       },
//     };

//     return await this.executeWithSessionKey(sessionConfig, transaction);
//   }

//   /**
//    * Estimate gas for a transaction
//    */
//   async estimateGas(
//     transaction: BlockchainTransactionRequest,
//   ): Promise<GasEstimate> {
//     try {
//       const { publicClient } = this.createClients(transaction.chainId);

//       // Use simple gas estimation from public client
//       const gasPrice = await publicClient.getGasPrice();
//       const gasEstimate = await publicClient.estimateGas({
//         to: transaction.to as `0x${string}`,
//         value: parseEther(transaction.value || '0'),
//         data: (transaction.data as `0x${string}`) || '0x',
//       });

//       return {
//         callGasLimit: gasEstimate.toString(),
//         verificationGasLimit: '600000',
//         preVerificationGas: '100000',
//         maxFeePerGas: gasPrice.toString(),
//         maxPriorityFeePerGas: (gasPrice / 10n).toString(),
//       };
//     } catch (error) {
//       this.logger.warn('Gas estimation failed, using defaults', { error });
//       return {
//         callGasLimit: '500000',
//         verificationGasLimit: '600000',
//         preVerificationGas: '100000',
//         maxFeePerGas: '2000000000',
//         maxPriorityFeePerGas: '1000000000',
//       };
//     }
//   }

//   /**
//    * Get current gas prices for the network
//    */
//   async getCurrentGasPrices(chainId: number): Promise<{
//     maxFeePerGas: string;
//     maxPriorityFeePerGas: string;
//   }> {
//     try {
//       const { publicClient } = this.createClients(chainId);

//       const gasPrice = await publicClient.getGasPrice();
//       const maxFeePerGas = (gasPrice * 110n) / 100n; // 110% of current gas price
//       const maxPriorityFeePerGas = gasPrice / 10n; // 10% tip

//       return {
//         maxFeePerGas: maxFeePerGas.toString(),
//         maxPriorityFeePerGas: maxPriorityFeePerGas.toString(),
//       };
//     } catch (error) {
//       this.logger.warn('Failed to get gas prices, using defaults', { error });
//       return {
//         maxFeePerGas: '2000000000', // 2 gwei
//         maxPriorityFeePerGas: '1000000000', // 1 gwei
//       };
//     }
//   }

//   /**
//    * Get native token balance for an address
//    */
//   async getNativeBalance(address: string, chainId: number): Promise<string> {
//     try {
//       const { publicClient } = this.createClients(chainId);
//       const balance = await publicClient.getBalance({
//         address: address as Address,
//       });

//       return (Number(balance) / 1e18).toString(); // Convert wei to ether
//     } catch (error) {
//       this.logger.error('Failed to get native balance', {
//         error,
//         address,
//         chainId,
//       });
//       return '0';
//     }
//   }

//   /**
//    * Get ERC20 token balance for an address (already implemented)
//    */
//   async getTokenBalance(
//     tokenAddress: string,
//     walletAddress: string,
//     chainId: number,
//   ): Promise<string> {
//     return await this.getERC20Balance(tokenAddress, walletAddress, chainId);
//   }

//   /**
//    * Validate a transaction before execution
//    */
//   async validateTransaction(
//     transaction: BlockchainTransactionRequest,
//   ): Promise<{
//     valid: boolean;
//     errors: string[];
//   }> {
//     const errors: string[] = [];

//     // Validate chain support
//     if (!this.isChainSupported(transaction.chainId)) {
//       errors.push(`Unsupported chain ID: ${transaction.chainId}`);
//     }

//     // Validate recipient address
//     if (!this.isValidAddress(transaction.to)) {
//       errors.push(`Invalid recipient address: ${transaction.to}`);
//     }

//     // Validate amount
//     if (!this.isValidAmount(transaction.value)) {
//       errors.push(`Invalid amount: ${transaction.value}`);
//     }

//     return {
//       valid: errors.length === 0,
//       errors,
//     };
//   }

//   /**
//    * Health check for the service (already implemented)
//    */
//   async healthCheck(chainId?: number): Promise<{
//     healthy: boolean;
//     latency?: number;
//     blockNumber?: number;
//     error?: string;
//   }> {
//     try {
//       const targetChainId = chainId || seiTestnet.id;
//       const startTime = Date.now();

//       const { publicClient } = this.createClients(targetChainId);
//       const blockNumber = await publicClient.getBlockNumber();
//       const latency = Date.now() - startTime;

//       return {
//         healthy: true,
//         latency,
//         blockNumber: Number(blockNumber),
//       };
//     } catch (error) {
//       return {
//         healthy: false,
//         error: error instanceof Error ? error.message : String(error),
//       };
//     }
//   }

//   // =============================================================================
//   // Helper Methods for Interface Implementation
//   // =============================================================================

//   /**
//    * Check if an address is valid
//    */
//   private isValidAddress(address: string): boolean {
//     if (!address || typeof address !== 'string') {
//       return false;
//     }

//     // Basic Ethereum address validation
//     const addressRegex = /^0x[a-fA-F0-9]{40}$/;
//     return addressRegex.test(address);
//   }

//   /**
//    * Check if an amount is valid
//    */
//   private isValidAmount(amount: string): boolean {
//     if (!amount && amount !== '0') {
//       return false;
//     }

//     const numValue = parseFloat(amount);
//     return !isNaN(numValue) && numValue >= 0;
//   }

//   /**
//    * Get explorer URL for a transaction
//    */
//   private getExplorerUrl(chainId: number, transactionHash: string): string {
//     const chain = this.supportedChains.find((c) => c.id === chainId);
//     const baseUrl = chain?.blockExplorers?.default?.url;

//     if (!baseUrl) {
//       return '';
//     }

//     return `${baseUrl}/tx/${transactionHash}`;
//   }
// }
