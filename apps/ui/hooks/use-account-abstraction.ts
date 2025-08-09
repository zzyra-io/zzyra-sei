"use client";

import { useCallback, useState, useEffect } from "react";
import { useDynamicContext, useIsLoggedIn } from "@dynamic-labs/sdk-react-core";
import { isZeroDevConnector } from "@dynamic-labs/ethereum-aa";
import { useToast } from "@/components/ui/use-toast";
import { parseEther } from "viem";

interface SmartWalletDelegation {
  smartWalletAddress: string;
  ownerAddress: string;
  signerAddress: string;
  chainId: string;
  permissions: {
    operations: string[];
    maxAmountPerTx: string;
    maxDailyAmount: string;
    validUntil: Date;
  };
  kernelClient: KernelClient; // ZeroDv kernel client instance
  delegationSignature: string;
}

interface AATransactionRequest {
  to: string;
  value: string;
  data?: string;
  chainId: string;
}

// Dynamic Labs kernel client - generic type to avoid conflicts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type KernelClient = any;

export function useAccountAbstraction() {
  const { toast } = useToast();
  const { primaryWallet } = useDynamicContext();
  const isLoggedIn = useIsLoggedIn();
  const [isCreatingDelegation, setIsCreatingDelegation] = useState(false);
  const [isExecutingTransaction, setIsExecutingTransaction] = useState(false);
  const [kernelClient, setKernelClient] = useState<KernelClient>(null);

  /**
   * Initialize kernel client when primary wallet changes
   * Following Dynamic Labs documentation pattern
   */
  useEffect(() => {
    const initializeKernelClient = async () => {
      if (!primaryWallet?.connector) {
        setKernelClient(null);
        return;
      }

      // Check if this is a ZeroDev connector
      if (!isZeroDevConnector(primaryWallet.connector)) {
        console.log("Primary wallet is not a ZeroDev smart wallet");
        setKernelClient(null);
        return;
      }

      try {
        // Ensure that the kernel client has been loaded successfully
        await primaryWallet.connector.getNetwork();

        // Get the kernel client with gas sponsorship enabled
        const client = primaryWallet.connector.getAccountAbstractionProvider({
          withSponsorship: true,
        });

        setKernelClient(client);
        console.log("Kernel client initialized successfully");
      } catch (error) {
        console.error("Failed to initialize kernel client:", error);
        setKernelClient(null);
      }
    };

    initializeKernelClient();
  }, [primaryWallet]);

  /**
   * Create a smart wallet delegation using Dynamic Labs + ZeroDev integration
   * This leverages Dynamic's built-in smart wallet management
   */
  const createSmartWalletDelegation = useCallback(
    async (params: {
      chainId: string;
      operations: string[];
      maxAmountPerTx: string;
      maxDailyAmount: string;
      duration: number; // hours
    }): Promise<SmartWalletDelegation> => {
      setIsCreatingDelegation(true);
      try {
        if (!isLoggedIn || !primaryWallet) {
          throw new Error("Wallet not connected");
        }

        // Get detailed wallet status for better error messages
        const walletStatus = getWalletStatus();
        console.log("Wallet Status:", walletStatus);

        if (!walletStatus.hasSmartWallet) {
          const helpfulMessage = walletStatus.isEmbedded
            ? "Embedded wallet detected but smart wallet not available. This might be a configuration issue or the smart wallet is still being created."
            : "Smart wallets only work with embedded wallets (Email/SMS login). Please disconnect your current wallet and login with Email or SMS to create an embedded wallet with Account Abstraction.";

          throw new Error(
            `Smart wallet required for Account Abstraction. ${helpfulMessage}\n\n` +
              `Current wallet: ${walletStatus.walletType}\n` +
              `Status: ${walletStatus.message}`
          );
        }

        const smartWalletAddress = primaryWallet.address;
        if (!smartWalletAddress) {
          throw new Error("No smart wallet address found");
        }

        // Get the signer (EOA) address
        const signerConnector = primaryWallet.connector.eoaConnector;
        if (!signerConnector) {
          throw new Error("No signer connector found");
        }

        const signerAddress = await signerConnector.getAddress();
        if (!signerAddress) {
          throw new Error("No signer address found");
        }

        console.log("Creating smart wallet delegation", {
          smartWallet: smartWalletAddress,
          signer: signerAddress,
          operations: params.operations,
        });

        const validUntil = new Date(
          Date.now() + params.duration * 60 * 60 * 1000
        );

        // Create delegation message that matches backend expectations
        // Create delegation message for automated workflow execution
        // This allows zyra-worker to execute transactions on behalf of the user
        const delegationMessage = {
          owner: signerAddress, // EOA signer address (for verification)
          smartWallet: smartWalletAddress, // Smart wallet address (for execution)
          chainId: params.chainId,
          operations: params.operations, // Allowed operations (eth_transfer, erc20_transfer, etc.)
          maxAmountPerTx: params.maxAmountPerTx, // Per-transaction spending limit
          maxDailyAmount: params.maxDailyAmount, // Daily spending limit
          validUntil: validUntil.toISOString(), // Delegation expiry
          timestamp: new Date().toISOString(),
          nonce: Date.now(),
          // Workflow automation specific fields
          purpose: "workflow_automation",
          platform: "zyra",
          automatedExecution: true,
        };

        const messageToSign = JSON.stringify(delegationMessage, null, 2);

        // Sign the delegation message with the EOA signer
        const signature = await primaryWallet.signMessage(messageToSign);
        if (!signature) {
          throw new Error("Failed to sign delegation message");
        }

        console.log("Delegation signature created successfully");

        const delegation: SmartWalletDelegation = {
          smartWalletAddress,
          ownerAddress: signerAddress,
          signerAddress,
          chainId: params.chainId,
          permissions: {
            operations: params.operations,
            maxAmountPerTx: params.maxAmountPerTx,
            maxDailyAmount: params.maxDailyAmount,
            validUntil,
          },
          kernelClient,
          delegationSignature: messageToSign, // Store the original message, not the signature
        };

        toast({
          title: "Smart Wallet Ready",
          description: `Smart wallet configured for ${smartWalletAddress.substring(0, 10)}...`,
        });

        console.log(
          "Smart wallet delegation created successfully:",
          delegation
        );
        return delegation;
      } catch (error) {
        console.error("Failed to create smart wallet delegation:", error);
        toast({
          title: "Delegation Failed",
          description:
            error instanceof Error
              ? error.message
              : "Failed to create delegation",
          variant: "destructive",
        });
        throw error;
      } finally {
        setIsCreatingDelegation(false);
      }
    },
    [primaryWallet, isLoggedIn, kernelClient, toast]
  );

  /**
   * Execute a transaction directly via frontend kernel client
   * This is used for immediate/interactive transactions, not automated workflows
   * For automated workflow execution, the backend handles AA transactions using the delegation
   */
  const executeTransaction = useCallback(
    async (
      delegation: SmartWalletDelegation,
      transactionRequest: AATransactionRequest
    ): Promise<string> => {
      setIsExecutingTransaction(true);
      try {
        if (!kernelClient) {
          throw new Error("Kernel client not available");
        }

        console.log(
          "Executing immediate AA transaction via kernel client:",
          transactionRequest
        );

        // Validate transaction against delegation permissions
        const txValue = parseEther(transactionRequest.value);
        const maxTxValue = parseEther(delegation.permissions.maxAmountPerTx);

        if (txValue > maxTxValue) {
          throw new Error(
            `Transaction value exceeds maximum allowed: ${delegation.permissions.maxAmountPerTx}`
          );
        }

        if (new Date() > delegation.permissions.validUntil) {
          throw new Error("Delegation has expired");
        }

        // Use kernel client to encode and send the transaction
        const callData = await kernelClient.account.encodeCalls([
          {
            to: transactionRequest.to as `0x${string}`,
            value: parseEther(transactionRequest.value),
            data: (transactionRequest.data || "0x") as `0x${string}`,
          },
        ]);

        console.log("Sending immediate user operation via kernel client");

        // Send the user operation - ZeroDev handles bundling, gas estimation, etc.
        const userOpHash = await kernelClient.sendUserOperation({
          callData,
        });

        console.log("UserOperation submitted successfully:", userOpHash);

        toast({
          title: "Transaction Sent",
          description: `Immediate transaction submitted with hash: ${userOpHash.substring(0, 20)}...`,
        });

        return userOpHash;
      } catch (error) {
        console.error("Failed to execute immediate AA transaction:", error);
        toast({
          title: "Transaction Failed",
          description:
            error instanceof Error
              ? error.message
              : "Failed to execute transaction",
          variant: "destructive",
        });
        throw error;
      } finally {
        setIsExecutingTransaction(false);
      }
    },
    [kernelClient, toast]
  );

  /**
   * Simulate transaction before execution
   * This could use kernel client simulation features in the future
   */
  const simulateTransaction = useCallback(
    async (
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _delegation: SmartWalletDelegation,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _transactionRequest: AATransactionRequest
    ): Promise<{ success: boolean; gasEstimate?: string; error?: string }> => {
      try {
        if (!kernelClient) {
          return {
            success: false,
            error: "Kernel client not available",
          };
        }

        // For now, return success if kernel client is available
        // In the future, this could use actual simulation features
        return {
          success: true,
          gasEstimate: "Sponsored", // Gas is sponsored via Dynamic/ZeroDev
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Simulation failed",
        };
      }
    },
    [kernelClient]
  );

  /**
   * Check if current wallet is a smart wallet
   */
  const isSmartWallet = useCallback(() => {
    return !!(
      primaryWallet?.connector && isZeroDevConnector(primaryWallet.connector)
    );
  }, [primaryWallet]);

  /**
   * Get detailed wallet status for debugging
   */
  const getWalletStatus = useCallback(() => {
    if (!primaryWallet) {
      return {
        connected: false,
        hasSmartWallet: false,
        walletType: null,
        message: "No wallet connected",
      };
    }

    const isEmbedded =
      primaryWallet.connector.name?.includes("embedded") ||
      primaryWallet.connector.name?.includes("Email") ||
      primaryWallet.connector.name?.includes("SMS");

    const hasSmartWallet = isZeroDevConnector(primaryWallet.connector);

    return {
      connected: true,
      hasSmartWallet,
      walletType: primaryWallet.connector.name,
      isEmbedded,
      address: primaryWallet.address,
      message: hasSmartWallet
        ? "Smart wallet ready for Account Abstraction"
        : isEmbedded
          ? "Embedded wallet detected - smart wallet should be available"
          : "External wallet detected - smart wallets only work with embedded wallets",
    };
  }, [primaryWallet]);

  /**
   * Get delegation info for automated workflow execution
   * This explains how the delegation enables background execution by zyra-worker
   */
  const getDelegationInfo = useCallback((delegation: SmartWalletDelegation) => {
    return {
      // Smart wallet that will execute transactions
      smartWallet: delegation.smartWalletAddress,

      // EOA that signed the delegation (for verification)
      signer: delegation.signerAddress,

      // Execution permissions
      permissions: {
        operations: delegation.permissions.operations,
        maxPerTransaction: delegation.permissions.maxAmountPerTx,
        dailyLimit: delegation.permissions.maxDailyAmount,
        expiresAt: delegation.permissions.validUntil,
      },

      // How it works for automated workflows
      executionFlow: {
        immediate: "Frontend kernel client executes transactions directly",
        automated:
          "Backend zyra-worker executes transactions using this delegation when workflows run",
        gasSponsorship: "ZeroDev paymaster sponsors gas costs",
        security: "Spending limits and operation restrictions enforced",
      },
    };
  }, []);

  /**
   * Get smart wallet and signer addresses
   */
  const getAddresses = useCallback(async () => {
    if (
      !primaryWallet?.connector ||
      !isZeroDevConnector(primaryWallet.connector)
    ) {
      return null;
    }

    const smartWalletAddress = primaryWallet.address;
    const signerConnector = primaryWallet.connector.eoaConnector;
    const signerAddress = await signerConnector?.getAddress();

    return {
      smartWalletAddress,
      signerAddress,
    };
  }, [primaryWallet]);

  return {
    // State
    isCreatingDelegation,
    isExecutingTransaction,
    kernelClient: !!kernelClient,

    // Actions
    createSmartWalletDelegation,
    executeTransaction,
    simulateTransaction,

    // Utilities
    isSmartWallet,
    getWalletStatus,
    getAddresses,
    getDelegationInfo,
  };
}
