"use client";

import { useCallback, useState } from "react";
import { useDynamicContext, useIsLoggedIn } from "@dynamic-labs/sdk-react-core";
import { useToast } from "@/components/ui/use-toast";

interface SmartWalletDelegation {
  smartWalletAddress: string;
  ownerAddress: string;
  chainId: string;
  permissions: {
    operations: string[];
    maxAmountPerTx: string;
    maxDailyAmount: string;
    validUntil: Date;
  };
  delegationSignature: string;
}

interface AATransactionRequest {
  to: string;
  value: string;
  data?: string;
  chainId: string;
}

export function useAccountAbstraction() {
  const { toast } = useToast();
  const dynamicContext = useDynamicContext();
  const isLoggedIn = useIsLoggedIn();
  const [isCreatingDelegation, setIsCreatingDelegation] = useState(false);
  const [isExecutingTransaction, setIsExecutingTransaction] = useState(false);

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
        if (!isLoggedIn || !dynamicContext.primaryWallet) {
          throw new Error("Wallet not connected");
        }

        const ownerAddress = dynamicContext.primaryWallet.address;
        if (!ownerAddress) {
          throw new Error("No wallet address found");
        }

        const validUntil = new Date(
          Date.now() + params.duration * 60 * 60 * 1000
        );

        // Create delegation message for signing
        const delegationMessage = {
          ownerAddress,
          chainId: params.chainId,
          operations: params.operations,
          maxAmountPerTx: params.maxAmountPerTx,
          maxDailyAmount: params.maxDailyAmount,
          validUntil: validUntil.toISOString(),
          timestamp: new Date().toISOString(),
        };

        const messageToSign = JSON.stringify(delegationMessage);

        // Sign the delegation message with user's wallet
        const signature =
          await dynamicContext.primaryWallet.signMessage(messageToSign);

        // Create ZeroDev smart wallet through Dynamic integration
        // Dynamic automatically creates smart wallets when configured with ZeroDev
        const walletClient =
          await dynamicContext.primaryWallet.getWalletClient();

        // Get smart wallet address from Dynamic context
        // Dynamic manages the smart wallet creation through ZeroDev
        let smartWalletAddress = ownerAddress; // Default to EOA address

        try {
          // If Dynamic has smart wallet enabled, it will provide the smart wallet address
          // through the wallet client or context
          if (dynamicContext.primaryWallet.connector?.name === "smart-wallet") {
            smartWalletAddress = dynamicContext.primaryWallet.address;
          } else {
            // For now, generate deterministic smart wallet address
            // In production, this would be provided by Dynamic/ZeroDev
            const hash = await window.crypto.subtle.digest(
              "SHA-256",
              new TextEncoder().encode(ownerAddress + params.chainId)
            );
            const hashArray = Array.from(new Uint8Array(hash));
            smartWalletAddress =
              "0x" +
              hashArray
                .slice(0, 20)
                .map((b) => b.toString(16).padStart(2, "0"))
                .join("");
          }
        } catch (error) {
          console.warn("Could not determine smart wallet address:", error);
        }

        const delegation: SmartWalletDelegation = {
          smartWalletAddress,
          ownerAddress,
          chainId: params.chainId,
          permissions: {
            operations: params.operations,
            maxAmountPerTx: params.maxAmountPerTx,
            maxDailyAmount: params.maxDailyAmount,
            validUntil,
          },
          delegationSignature: signature,
        };

        toast({
          title: "Smart Wallet Created",
          description: `Smart wallet delegation created successfully`,
        });

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
    [isLoggedIn, dynamicContext.primaryWallet, toast]
  );

  const executeTransaction = useCallback(
    async (
      params: AATransactionRequest & { delegation: SmartWalletDelegation }
    ) => {
      setIsExecutingTransaction(true);
      try {
        const { delegation, ...txParams } = params;

        if (new Date() > delegation.permissions.validUntil) {
          throw new Error("Delegation has expired");
        }

        const amount = parseFloat(txParams.value);
        const maxPerTx = parseFloat(delegation.permissions.maxAmountPerTx);
        if (amount > maxPerTx) {
          throw new Error(
            `Amount ${amount} exceeds per-transaction limit ${maxPerTx}`
          );
        }

        // For production, this would:
        // 1. Construct a UserOperation for the smart wallet
        // 2. Submit it to the ZeroDev bundler
        // 3. Wait for confirmation
        // 4. Return transaction hash

        // Mock transaction execution
        const mockTxHash = `0x${Math.random().toString(16).slice(2, 66)}`;

        toast({
          title: "Transaction Executed",
          description: `Transaction sent: ${mockTxHash}`,
        });

        return {
          hash: mockTxHash,
          status: "success" as const,
          smartWalletAddress: delegation.smartWalletAddress,
        };
      } catch (error) {
        console.error("Failed to execute AA transaction:", error);
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
    [toast]
  );

  const revokeDelegation = useCallback(
    async (delegation: SmartWalletDelegation) => {
      try {
        // For production, this would revoke the delegation on the smart wallet

        toast({
          title: "Delegation Revoked",
          description: "Smart wallet delegation has been revoked",
        });
      } catch (error) {
        console.error("Failed to revoke delegation:", error);
        toast({
          title: "Revocation Failed",
          description:
            error instanceof Error
              ? error.message
              : "Failed to revoke delegation",
          variant: "destructive",
        });
        throw error;
      }
    },
    [toast]
  );

  return {
    createSmartWalletDelegation,
    executeTransaction,
    revokeDelegation,
    isCreatingDelegation,
    isExecutingTransaction,
  };
}
