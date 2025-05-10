import { ethers } from "ethers";
import {
  BlockchainNodeType,
  getGasPrice,
  getTransactionHistory,
  interactWithContract,
  monitorTransactions,
  verifyTransaction,
} from "./blockchain-nodes";
import { getTokenBalance, sendTokens } from "./contracts";

/**
 * Execute a blockchain node operation based on node type and configuration
 * This is used by the workflow execution engine to process blockchain nodes
 */
export const executeBlockchainNode = async (
  nodeType: BlockchainNodeType,
  config: any,
  context: any = {},
  callbacks: {
    onStart?: () => void;
    onSuccess?: (result: any) => void;
    onError?: (error: any) => void;
    onProgress?: (progress: any) => void;
  } = {}
) => {
  try {
    // Notify execution start
    if (callbacks.onStart) {
      callbacks.onStart();
    }

    // Get provider or signer based on context
    const provider = getProviderFromContext(context);
    const signer = getSignerFromContext(context);

    // Execute the appropriate operation based on node type
    let result;

    switch (nodeType) {
      case BlockchainNodeType.TRANSACTION_MONITOR:
        result = await executeTransactionMonitor(config, provider, callbacks);
        break;

      case BlockchainNodeType.TRANSACTION_VERIFY:
        result = await executeTransactionVerify(config, provider);
        break;

      case BlockchainNodeType.TRANSACTION_HISTORY:
        result = await executeTransactionHistory(config, provider);
        break;

      case BlockchainNodeType.TOKEN_TRANSFER:
        result = await executeTokenTransfer(config, signer);
        break;

      case BlockchainNodeType.TOKEN_BALANCE:
        result = await executeTokenBalance(config, provider);
        break;

      case BlockchainNodeType.CONTRACT_INTERACTION:
        result = await executeContractInteraction(config, signer || provider);
        break;

      case BlockchainNodeType.GAS_OPTIMIZER:
        result = await executeGasOptimizer(config, provider);
        break;

      case BlockchainNodeType.DEFI_SWAP:
        result = await executeDefiSwap(config, signer);
        break;

      default:
        throw new Error(`Unsupported blockchain node type: ${nodeType}`);
    }

    // Notify execution success
    if (callbacks.onSuccess) {
      callbacks.onSuccess(result);
    }

    return result;
  } catch (error) {
    console.error(`Blockchain node execution failed for ${nodeType}:`, error);

    // Notify execution error
    if (callbacks.onError) {
      callbacks.onError(error);
    }

    throw error;
  }
};

/**
 * Execute transaction monitoring
 */
const executeTransactionMonitor = async (
  config: any,
  provider: ethers.providers.Provider,
  callbacks: any
) => {
  const { address, chainId, confirmations = 1, interval = 15 } = config;

  // Set up transaction monitor
  const cleanup = await monitorTransactions(address, Number(chainId), {
    confirmations,
    interval: interval * 1000, // Convert to milliseconds
    callback: (tx) => {
      // Notify about new transaction
      if (callbacks.onProgress) {
        callbacks.onProgress({
          type: "new_transaction",
          transaction: tx,
        });
      }
    },
  });

  // Return cleanup function to stop monitoring when workflow ends
  return {
    status: "monitoring",
    address,
    chainId,
    cleanup,
  };
};

/**
 * Execute transaction verification
 */
const executeTransactionVerify = async (
  config: any,
  provider: ethers.providers.Provider
) => {
  const {
    txHash,
    chainId,
    confirmations = 1,
    expectedTo,
    expectedValue,
  } = config;

  // Verify transaction
  const result = await verifyTransaction(txHash, Number(chainId), {
    confirmations,
    expectedTo,
    expectedValue,
  });

  return {
    verified: result.verified,
    transaction: result.transaction,
    receipt: result.receipt,
    confirmations: result.confirmations,
  };
};

/**
 * Execute transaction history retrieval
 */
const executeTransactionHistory = async (
  config: any,
  provider: ethers.providers.Provider
) => {
  const { address, chainId, limit = 50, type = "all", tokenAddress } = config;

  // Get transaction history
  const transactions = await getTransactionHistory(address, Number(chainId), {
    limit,
    type,
    tokenAddress,
  });

  return {
    transactions,
    count: transactions.length,
    address,
    chainId,
  };
};

/**
 * Execute token transfer
 */
const executeTokenTransfer = async (config: any, signer: ethers.Signer) => {
  if (!signer) {
    throw new Error("Signer is required for token transfers");
  }

  const { tokenType, tokenAddress, recipient, amount, chainId } = config;

  // Determine token symbol or address
  let tokenSymbol = tokenType;
  let actualTokenAddress = tokenAddress;

  if (tokenType === "CUSTOM" && tokenAddress) {
    // Use custom token address
    tokenSymbol = "CUSTOM";
    actualTokenAddress = tokenAddress;
  } else if (tokenType === "ETH") {
    // Native ETH transfer
    const tx = await signer.sendTransaction({
      to: recipient,
      value: ethers.utils.parseEther(amount),
    });

    const receipt = await tx.wait();

    return {
      success: true,
      transaction: tx,
      receipt,
      hash: tx.hash,
      from: await signer.getAddress(),
      to: recipient,
      amount,
      token: "ETH",
    };
  }

  // ERC-20 token transfer
  const result = await sendTokens(
    tokenSymbol,
    chainId.toString(),
    recipient,
    amount,
    signer
  );

  return {
    success: true,
    transaction: result.hash,
    receipt: result,
    hash: result.transactionHash,
    from: await signer.getAddress(),
    to: recipient,
    amount,
    token: tokenSymbol === "CUSTOM" ? actualTokenAddress : tokenSymbol,
  };
};

/**
 * Execute token balance check
 */
const executeTokenBalance = async (
  config: any,
  provider: ethers.providers.Provider
) => {
  const { tokenType, tokenAddress, address, chainId } = config;

  // Determine token symbol or address
  let tokenSymbol = tokenType;

  if (tokenType === "CUSTOM" && tokenAddress) {
    // Use custom token address for balance check
    const contract = new ethers.Contract(
      tokenAddress,
      [
        "function balanceOf(address) view returns (uint256)",
        "function decimals() view returns (uint8)",
        "function symbol() view returns (string)",
        "function name() view returns (string)",
      ],
      provider
    );

    const balance = await contract.balanceOf(address);
    const decimals = await contract.decimals();
    let symbol, name;

    try {
      symbol = await contract.symbol();
      name = await contract.name();
    } catch (error) {
      symbol = "UNKNOWN";
      name = "Unknown Token";
    }

    return {
      balance: ethers.utils.formatUnits(balance, decimals),
      rawBalance: balance.toString(),
      decimals,
      symbol,
      name,
      address: tokenAddress,
      walletAddress: address,
      chainId,
    };
  } else if (tokenType === "ETH") {
    // Native ETH balance
    const balance = await provider.getBalance(address);

    return {
      balance: ethers.utils.formatEther(balance),
      rawBalance: balance.toString(),
      decimals: 18,
      symbol: "ETH",
      name: "Ethereum",
      walletAddress: address,
      chainId,
    };
  }

  // ERC-20 token balance
  const balance = await getTokenBalance(
    tokenSymbol,
    chainId.toString(),
    address,
    provider
  );

  return {
    balance,
    symbol: tokenSymbol,
    walletAddress: address,
    chainId,
  };
};

/**
 * Execute contract interaction
 */
const executeContractInteraction = async (
  config: any,
  providerOrSigner: ethers.providers.Provider | ethers.Signer
) => {
  const { contractAddress, method, params, chainId, value = "0" } = config;

  // Parse params if they're a string
  let parsedParams = params;
  if (typeof params === "string") {
    try {
      parsedParams = JSON.parse(params);
    } catch (error) {
      parsedParams = [];
    }
  }

  if (!Array.isArray(parsedParams)) {
    parsedParams = [];
  }

  // Interact with contract
  return await interactWithContract(
    contractAddress,
    ["function " + method],
    method,
    parsedParams,
    Number(chainId),
    {
      value,
      signer:
        providerOrSigner instanceof ethers.Signer
          ? providerOrSigner
          : undefined,
    }
  );
};

/**
 * Execute gas optimizer
 */
const executeGasOptimizer = async (
  config: any,
  provider: ethers.providers.Provider
) => {
  const { chainId, strategy = "standard", maxGasPrice } = config;

  // Get gas price recommendations
  const gasPrices = await getGasPrice(Number(chainId));

  // Select gas price based on strategy
  let selectedGasPrice = gasPrices.standard;

  switch (strategy) {
    case "slow":
      selectedGasPrice = gasPrices.slow;
      break;
    case "standard":
      selectedGasPrice = gasPrices.standard;
      break;
    case "fast":
      selectedGasPrice = gasPrices.fast;
      break;
    case "rapid":
      selectedGasPrice = gasPrices.rapid;
      break;
  }

  // Check if selected gas price exceeds max gas price
  if (maxGasPrice && Number(selectedGasPrice.gwei) > Number(maxGasPrice)) {
    selectedGasPrice = {
      wei: ethers.utils.parseUnits(maxGasPrice, "gwei").toString(),
      gwei: maxGasPrice,
    };
  }

  return {
    strategy,
    selectedGasPrice,
    allPrices: gasPrices,
    chainId,
    maxGasPrice: maxGasPrice || "unlimited",
  };
};

/**
 * Execute DeFi swap (placeholder - would need DEX integration)
 */
const executeDefiSwap = async (config: any, signer: ethers.Signer) => {
  if (!signer) {
    throw new Error("Signer is required for token swaps");
  }

  const { fromToken, toToken, amount, slippage, chainId } = config;

  // This is a placeholder - in a real implementation, you would integrate with a DEX
  throw new Error("DeFi swap implementation requires DEX integration");
};

/**
 * Get provider from execution context
 */
const getProviderFromContext = (context: any): ethers.providers.Provider => {
  // Use provider from context if available
  if (
    context.provider &&
    context.provider instanceof ethers.providers.Provider
  ) {
    return context.provider;
  }

  // Create a default provider
  const chainId = context.chainId || 1;
  const rpcUrl =
    context.rpcUrl ||
    process.env.NEXT_PUBLIC_RPC_URL ||
    "https://eth.llamarpc.com";

  return new ethers.providers.JsonRpcProvider(rpcUrl);
};

/**
 * Get signer from execution context
 */
const getSignerFromContext = (context: any): ethers.Signer | undefined => {
  // Use signer from context if available
  if (context.signer && context.signer instanceof ethers.Signer) {
    return context.signer;
  }

  // No signer available
  return undefined;
};
