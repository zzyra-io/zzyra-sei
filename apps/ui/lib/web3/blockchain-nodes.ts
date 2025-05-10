import { ethers } from "ethers";
import { BlockType, NodeCategory, BlockMetadata } from "@/types/workflow";
import { getGoatClient } from "./goat-client";
import { getContract, ERC20_ABI } from "./contracts";

// Enhanced blockchain node types
export enum BlockchainNodeType {
  // Transaction operations
  TRANSACTION_MONITOR = "transaction-monitor",
  TRANSACTION_VERIFY = "transaction-verify",
  TRANSACTION_HISTORY = "transaction-history",
  
  // Token operations
  TOKEN_TRANSFER = "token-transfer",
  TOKEN_APPROVAL = "token-approval",
  TOKEN_BALANCE = "token-balance",
  
  // Smart contract operations
  CONTRACT_INTERACTION = "contract-interaction",
  CONTRACT_DEPLOY = "contract-deploy",
  CONTRACT_VERIFY = "contract-verify",
  
  // DeFi operations
  DEFI_SWAP = "defi-swap",
  DEFI_LIQUIDITY = "defi-liquidity",
  DEFI_YIELD = "defi-yield",
  
  // NFT operations
  NFT_MINT = "nft-mint",
  NFT_TRANSFER = "nft-transfer",
  NFT_MARKETPLACE = "nft-marketplace",
  
  // Chain operations
  CHAIN_MONITOR = "chain-monitor",
  CHAIN_SWITCH = "chain-switch",
  GAS_OPTIMIZER = "gas-optimizer",
}

// Blockchain node execution functions

/**
 * Monitor transactions for a given address
 */
export const monitorTransactions = async (
  address: string,
  chainId: number,
  options: {
    startBlock?: number;
    confirmations?: number;
    interval?: number;
    callback?: (tx: any) => void;
  }
) => {
  try {
    const client = getGoatClient();
    const provider = new ethers.providers.JsonRpcProvider(
      getChainRpcUrl(chainId)
    );
    
    // Initial fetch of recent transactions
    const transactions = await client.account.getTransactions({
      address,
      chainId,
      limit: 10,
    });
    
    // Setup monitoring interval
    const intervalId = setInterval(async () => {
      try {
        const newTransactions = await client.account.getTransactions({
          address,
          chainId,
          limit: 5,
        });
        
        // Compare with previous transactions to find new ones
        const latestTxHash = transactions[0]?.hash;
        const newTxs = newTransactions.filter(tx => tx.hash !== latestTxHash);
        
        if (newTxs.length > 0) {
          // Update our transaction cache
          transactions.unshift(...newTxs);
          transactions.splice(20); // Keep only last 20
          
          // Notify via callback
          if (options.callback) {
            newTxs.forEach(tx => options.callback!(tx));
          }
        }
      } catch (error) {
        console.error("Error monitoring transactions:", error);
      }
    }, options.interval || 15000); // Default 15 seconds
    
    // Return cleanup function
    return () => clearInterval(intervalId);
  } catch (error) {
    console.error("Failed to setup transaction monitoring:", error);
    throw error;
  }
};

/**
 * Verify a transaction by hash
 */
export const verifyTransaction = async (
  txHash: string,
  chainId: number,
  options: {
    confirmations?: number;
    timeout?: number;
    expectedValue?: string;
    expectedTo?: string;
  }
) => {
  try {
    const provider = new ethers.providers.JsonRpcProvider(
      getChainRpcUrl(chainId)
    );
    
    // Wait for transaction receipt
    const receipt = await provider.waitForTransaction(
      txHash,
      options.confirmations || 1,
      options.timeout || 60000
    );
    
    // Verify transaction success
    if (!receipt.status) {
      throw new Error("Transaction failed");
    }
    
    // Get transaction details
    const tx = await provider.getTransaction(txHash);
    
    // Verify recipient if specified
    if (options.expectedTo && tx.to?.toLowerCase() !== options.expectedTo.toLowerCase()) {
      throw new Error(`Transaction recipient mismatch. Expected: ${options.expectedTo}, Got: ${tx.to}`);
    }
    
    // Verify value if specified
    if (options.expectedValue && !tx.value.eq(ethers.utils.parseEther(options.expectedValue))) {
      throw new Error(`Transaction value mismatch. Expected: ${options.expectedValue}, Got: ${ethers.utils.formatEther(tx.value)}`);
    }
    
    return {
      verified: true,
      receipt,
      transaction: tx,
      confirmations: receipt.confirmations,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
    };
  } catch (error) {
    console.error("Transaction verification failed:", error);
    throw error;
  }
};

/**
 * Get transaction history with filtering options
 */
export const getTransactionHistory = async (
  address: string,
  chainId: number,
  options: {
    startBlock?: number;
    endBlock?: number;
    limit?: number;
    type?: "sent" | "received" | "all";
    tokenAddress?: string;
  }
) => {
  try {
    const client = getGoatClient();
    
    // Get transactions from Goat client
    const transactions = await client.account.getTransactions({
      address,
      chainId,
      limit: options.limit || 50,
    });
    
    // Apply filters
    let filteredTxs = transactions;
    
    // Filter by transaction type
    if (options.type && options.type !== "all") {
      filteredTxs = filteredTxs.filter(tx => {
        if (options.type === "sent") {
          return tx.from.toLowerCase() === address.toLowerCase();
        } else if (options.type === "received") {
          return tx.to.toLowerCase() === address.toLowerCase();
        }
        return true;
      });
    }
    
    // Filter by token address if specified
    if (options.tokenAddress) {
      filteredTxs = filteredTxs.filter(tx => 
        tx.to.toLowerCase() === options.tokenAddress?.toLowerCase() || 
        (tx.tokenTransfers && tx.tokenTransfers.some(tt => 
          tt.tokenAddress.toLowerCase() === options.tokenAddress?.toLowerCase()
        ))
      );
    }
    
    // Enhance transaction data with additional metadata
    const enhancedTxs = await Promise.all(filteredTxs.map(async tx => {
      // Get token transfers if available
      const tokenTransfers = tx.tokenTransfers || [];
      
      // Get transaction receipt for gas used and status
      try {
        const provider = new ethers.providers.JsonRpcProvider(getChainRpcUrl(chainId));
        const receipt = await provider.getTransactionReceipt(tx.hash);
        
        return {
          ...tx,
          tokenTransfers,
          status: receipt ? (receipt.status ? "success" : "failed") : "pending",
          gasUsed: receipt ? receipt.gasUsed.toString() : "0",
          effectiveGasPrice: receipt ? receipt.effectiveGasPrice.toString() : "0",
        };
      } catch (error) {
        console.error(`Error fetching receipt for tx ${tx.hash}:`, error);
        return {
          ...tx,
          tokenTransfers,
          status: "unknown",
          gasUsed: "0",
          effectiveGasPrice: "0",
        };
      }
    }));
    
    return enhancedTxs;
  } catch (error) {
    console.error("Failed to get transaction history:", error);
    throw error;
  }
};

/**
 * Interact with a smart contract
 */
export const interactWithContract = async (
  contractAddress: string,
  abi: any,
  method: string,
  params: any[],
  chainId: number,
  options: {
    value?: string;
    gasLimit?: number;
    signer?: ethers.Signer;
  }
) => {
  try {
    // Get provider or signer
    const provider = options.signer || 
      new ethers.providers.JsonRpcProvider(getChainRpcUrl(chainId));
    
    // Get contract instance
    const contract = new ethers.Contract(contractAddress, abi, provider);
    
    // Check if method is read-only or requires transaction
    const fragment = contract.interface.getFunction(method);
    const isReadOnly = fragment.constant || fragment.stateMutability === "view" || fragment.stateMutability === "pure";
    
    if (isReadOnly) {
      // Call read-only method
      const result = await contract[method](...params);
      return { result, transaction: null };
    } else {
      // Ensure we have a signer for transactions
      if (!options.signer) {
        throw new Error("Signer required for transaction methods");
      }
      
      // Prepare transaction options
      const txOptions: any = {};
      if (options.value) {
        txOptions.value = ethers.utils.parseEther(options.value);
      }
      if (options.gasLimit) {
        txOptions.gasLimit = options.gasLimit;
      }
      
      // Send transaction
      const tx = await contract[method](...params, txOptions);
      const receipt = await tx.wait();
      
      return { 
        transaction: tx, 
        receipt,
        hash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      };
    }
  } catch (error) {
    console.error(`Contract interaction failed for ${contractAddress}.${method}:`, error);
    throw error;
  }
};

/**
 * Get chain RPC URL by chain ID
 */
export const getChainRpcUrl = (chainId: number): string => {
  const chainMap: Record<number, string> = {
    1: "https://eth.llamarpc.com", // Ethereum
    10: "https://mainnet.optimism.io", // Optimism
    56: "https://bsc-dataseed.binance.org", // BSC
    137: "https://polygon-rpc.com", // Polygon
    42161: "https://arb1.arbitrum.io/rpc", // Arbitrum
    8453: "https://mainnet.base.org", // Base
  };
  
  return chainMap[chainId] || `https://rpc.ankr.com/eth/${chainId}`;
};

/**
 * Get gas price recommendations
 */
export const getGasPrice = async (chainId: number) => {
  try {
    const provider = new ethers.providers.JsonRpcProvider(
      getChainRpcUrl(chainId)
    );
    
    // Get current gas price
    const gasPrice = await provider.getGasPrice();
    
    // Calculate recommended gas prices
    const slow = gasPrice.mul(80).div(100); // 80% of current
    const standard = gasPrice;
    const fast = gasPrice.mul(120).div(100); // 120% of current
    const rapid = gasPrice.mul(150).div(100); // 150% of current
    
    return {
      slow: {
        wei: slow.toString(),
        gwei: ethers.utils.formatUnits(slow, "gwei"),
      },
      standard: {
        wei: standard.toString(),
        gwei: ethers.utils.formatUnits(standard, "gwei"),
      },
      fast: {
        wei: fast.toString(),
        gwei: ethers.utils.formatUnits(fast, "gwei"),
      },
      rapid: {
        wei: rapid.toString(),
        gwei: ethers.utils.formatUnits(rapid, "gwei"),
      },
    };
  } catch (error) {
    console.error("Failed to get gas price:", error);
    throw error;
  }
};

/**
 * Estimate gas for a transaction
 */
export const estimateGas = async (
  from: string,
  to: string,
  data: string,
  value: string,
  chainId: number
) => {
  try {
    const provider = new ethers.providers.JsonRpcProvider(
      getChainRpcUrl(chainId)
    );
    
    // Estimate gas
    const gasEstimate = await provider.estimateGas({
      from,
      to,
      data,
      value: ethers.utils.parseEther(value),
    });
    
    // Get gas price
    const gasPrice = await provider.getGasPrice();
    
    // Calculate gas cost
    const gasCost = gasEstimate.mul(gasPrice);
    
    return {
      gasEstimate: gasEstimate.toString(),
      gasPrice: {
        wei: gasPrice.toString(),
        gwei: ethers.utils.formatUnits(gasPrice, "gwei"),
      },
      gasCost: {
        wei: gasCost.toString(),
        ether: ethers.utils.formatEther(gasCost),
      },
    };
  } catch (error) {
    console.error("Gas estimation failed:", error);
    throw error;
  }
};

/**
 * Execute token swap
 */
export const executeTokenSwap = async (
  fromToken: string,
  toToken: string,
  amount: string,
  slippage: number,
  signer: ethers.Signer,
  chainId: number
) => {
  // This is a placeholder for actual DEX integration
  // In a real implementation, you would integrate with a DEX like Uniswap, 1inch, etc.
  throw new Error("Token swap implementation requires DEX integration");
};

/**
 * Get blockchain node metadata
 */
export const getBlockchainNodeMetadata = (nodeType: BlockchainNodeType): BlockMetadata => {
  const metadataMap: Record<BlockchainNodeType, BlockMetadata> = {
    [BlockchainNodeType.TRANSACTION_MONITOR]: {
      type: BlockType.CUSTOM,
      label: "Transaction Monitor",
      description: "Monitor blockchain transactions for an address",
      category: NodeCategory.FINANCE,
      icon: "transaction",
      defaultConfig: {
        address: "",
        chainId: 1,
        confirmations: 1,
        interval: 15,
      },
    },
    [BlockchainNodeType.TRANSACTION_VERIFY]: {
      type: BlockType.CUSTOM,
      label: "Transaction Verification",
      description: "Verify transaction details and status",
      category: NodeCategory.FINANCE,
      icon: "check-circle",
      defaultConfig: {
        txHash: "",
        chainId: 1,
        confirmations: 1,
        expectedTo: "",
        expectedValue: "",
      },
    },
    [BlockchainNodeType.TRANSACTION_HISTORY]: {
      type: BlockType.CUSTOM,
      label: "Transaction History",
      description: "Retrieve and analyze transaction history",
      category: NodeCategory.FINANCE,
      icon: "history",
      defaultConfig: {
        address: "",
        chainId: 1,
        limit: 50,
        type: "all",
      },
    },
    [BlockchainNodeType.TOKEN_TRANSFER]: {
      type: BlockType.CUSTOM,
      label: "Token Transfer",
      description: "Transfer tokens to another address",
      category: NodeCategory.FINANCE,
      icon: "send",
      defaultConfig: {
        tokenAddress: "",
        recipient: "",
        amount: "0",
        chainId: 1,
      },
    },
    [BlockchainNodeType.TOKEN_APPROVAL]: {
      type: BlockType.CUSTOM,
      label: "Token Approval",
      description: "Approve tokens for a smart contract",
      category: NodeCategory.FINANCE,
      icon: "check",
      defaultConfig: {
        tokenAddress: "",
        spender: "",
        amount: "0",
        chainId: 1,
      },
    },
    [BlockchainNodeType.TOKEN_BALANCE]: {
      type: BlockType.CUSTOM,
      label: "Token Balance",
      description: "Check token balance for an address",
      category: NodeCategory.FINANCE,
      icon: "wallet",
      defaultConfig: {
        tokenAddress: "",
        address: "",
        chainId: 1,
      },
    },
    [BlockchainNodeType.CONTRACT_INTERACTION]: {
      type: BlockType.CUSTOM,
      label: "Contract Interaction",
      description: "Interact with smart contract functions",
      category: NodeCategory.FINANCE,
      icon: "code",
      defaultConfig: {
        contractAddress: "",
        method: "",
        params: "[]",
        chainId: 1,
        value: "0",
      },
    },
    [BlockchainNodeType.CONTRACT_DEPLOY]: {
      type: BlockType.CUSTOM,
      label: "Contract Deployment",
      description: "Deploy a new smart contract",
      category: NodeCategory.FINANCE,
      icon: "upload",
      defaultConfig: {
        bytecode: "",
        abi: "[]",
        constructorArgs: "[]",
        chainId: 1,
      },
    },
    [BlockchainNodeType.CONTRACT_VERIFY]: {
      type: BlockType.CUSTOM,
      label: "Contract Verification",
      description: "Verify smart contract source code",
      category: NodeCategory.FINANCE,
      icon: "shield",
      defaultConfig: {
        contractAddress: "",
        chainId: 1,
        compilerVersion: "",
        sourceCode: "",
      },
    },
    [BlockchainNodeType.DEFI_SWAP]: {
      type: BlockType.CUSTOM,
      label: "DeFi Token Swap",
      description: "Swap tokens using decentralized exchanges",
      category: NodeCategory.FINANCE,
      icon: "refresh",
      defaultConfig: {
        fromToken: "ETH",
        toToken: "USDC",
        amount: "0.1",
        slippage: 0.5,
        chainId: 1,
      },
    },
    [BlockchainNodeType.DEFI_LIQUIDITY]: {
      type: BlockType.CUSTOM,
      label: "DeFi Liquidity",
      description: "Add or remove liquidity from pools",
      category: NodeCategory.FINANCE,
      icon: "droplet",
      defaultConfig: {
        pool: "",
        tokenA: "ETH",
        tokenB: "USDC",
        amountA: "0.1",
        amountB: "100",
        chainId: 1,
      },
    },
    [BlockchainNodeType.DEFI_YIELD]: {
      type: BlockType.CUSTOM,
      label: "DeFi Yield",
      description: "Deposit or withdraw from yield protocols",
      category: NodeCategory.FINANCE,
      icon: "trending-up",
      defaultConfig: {
        protocol: "aave",
        action: "deposit",
        asset: "USDC",
        amount: "100",
        chainId: 1,
      },
    },
    [BlockchainNodeType.NFT_MINT]: {
      type: BlockType.CUSTOM,
      label: "NFT Mint",
      description: "Mint a new NFT",
      category: NodeCategory.FINANCE,
      icon: "image",
      defaultConfig: {
        contractAddress: "",
        tokenURI: "",
        recipient: "",
        chainId: 1,
      },
    },
    [BlockchainNodeType.NFT_TRANSFER]: {
      type: BlockType.CUSTOM,
      label: "NFT Transfer",
      description: "Transfer an NFT to another address",
      category: NodeCategory.FINANCE,
      icon: "send",
      defaultConfig: {
        contractAddress: "",
        tokenId: "",
        from: "",
        to: "",
        chainId: 1,
      },
    },
    [BlockchainNodeType.NFT_MARKETPLACE]: {
      type: BlockType.CUSTOM,
      label: "NFT Marketplace",
      description: "List or buy NFTs on marketplaces",
      category: NodeCategory.FINANCE,
      icon: "shopping-cart",
      defaultConfig: {
        marketplace: "opensea",
        action: "list",
        contractAddress: "",
        tokenId: "",
        price: "0.1",
        chainId: 1,
      },
    },
    [BlockchainNodeType.CHAIN_MONITOR]: {
      type: BlockType.CUSTOM,
      label: "Chain Monitor",
      description: "Monitor blockchain metrics and events",
      category: NodeCategory.FINANCE,
      icon: "activity",
      defaultConfig: {
        chainId: 1,
        metrics: ["gasPrice", "blockTime", "transactions"],
        interval: 60,
      },
    },
    [BlockchainNodeType.CHAIN_SWITCH]: {
      type: BlockType.CUSTOM,
      label: "Chain Switch",
      description: "Switch between different blockchains",
      category: NodeCategory.FINANCE,
      icon: "git-branch",
      defaultConfig: {
        fromChainId: 1,
        toChainId: 137,
      },
    },
    [BlockchainNodeType.GAS_OPTIMIZER]: {
      type: BlockType.CUSTOM,
      label: "Gas Optimizer",
      description: "Optimize gas costs for transactions",
      category: NodeCategory.FINANCE,
      icon: "zap",
      defaultConfig: {
        chainId: 1,
        strategy: "standard", // slow, standard, fast, rapid
        maxGasPrice: "100", // in gwei
      },
    },
  };
  
  return metadataMap[nodeType];
};
