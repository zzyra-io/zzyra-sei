import { useToast } from "@/components/ui/use-toast";
import api from "@/lib/services/api";
import { isEthereumWallet } from "@dynamic-labs/ethereum";

import { useDynamicContext, useIsLoggedIn } from "@dynamic-labs/sdk-react-core";
import { useCallback, useState } from "react";
// No longer need wagmi hooks since Dynamic handles ZeroDev integration

const SUPPORTED_CHAINS = {
  SEI_TESTNET: 1328,
  BASE: 8453,
  BASE_SEPOLIA: 84532,
} as const;

const DEFAULT_CHAIN_ID = SUPPORTED_CHAINS.SEI_TESTNET.toString();

export interface DelegationPermissions {
  operations: string[];
  maxAmountPerTx: string;
  maxDailyAmount: string;
  validUntil: Date;
  chainId?: string;
  securityLevel?: string;
  // Enhanced features
  recurringSchedule?: {
    type: "daily" | "weekly" | "monthly";
    dayOfWeek?: number; // 0-6 for weekly (0 = Sunday)
    dayOfMonth?: number; // 1-31 for monthly
    time?: string; // HH:MM format
    timezone?: string; // IANA timezone
  };
  gasPayment?: {
    method: "sponsor" | "native" | "erc20";
    erc20Token?: {
      address: string;
      symbol: string;
      decimals: number;
    };
  };
}

export interface DelegationResult {
  success: boolean;
  sessionKeyId?: string;
  deploymentHash?: string;
  smartAccountAddress?: string;
  error?: string;
}

export interface WalletStatus {
  connected: boolean;
  hasSmartWallet: boolean;
  walletType: string | null;
  message: string;
  address: string | null;
}

interface DelegationMessage {
  smartWalletAddress: string;
  userAddress: string;
  operations: string[];
  maxAmountPerTx: string;
  maxDailyAmount: string;
  validUntil: string;
  timestamp: string;
  purpose: string;
  chainId: string;
  provider: string;
}

interface PermissionConfig {
  operation: string;
  maxAmountPerTx: string;
  maxDailyAmount: string;
  allowedContracts: string[];
  requireConfirmation: boolean;
  emergencyStop: boolean;
}

/**
 * Enhanced hook for creating smart wallet delegations using passkey authentication
 * Uses Dynamic Labs passkey system for secure signing regardless of wallet type
 * Dynamic Labs automatically creates and deploys smart wallets for embedded wallets
 */
export function useSmartWalletDelegation() {
  const { toast } = useToast();
  const { primaryWallet, user } = useDynamicContext();

  const isLoggedIn = useIsLoggedIn();
  const [isCreating, setIsCreating] = useState(false);
  // Note: walletClient and chains no longer needed since we use Dynamic's pre-created ZeroDev addresses

  const createDelegationMessage = useCallback(
    (
      permissions: DelegationPermissions,
      chainId: string,
      smartAccountAddress: string
    ): DelegationMessage => {
      return {
        smartWalletAddress: smartAccountAddress,
        userAddress: primaryWallet!.address,
        operations: permissions.operations,
        maxAmountPerTx: permissions.maxAmountPerTx,
        maxDailyAmount: permissions.maxDailyAmount,
        validUntil: permissions.validUntil.toISOString(),
        timestamp: new Date().toISOString(),
        purpose: "zyra_workflow_automation",
        chainId,
        provider: "zerodev",
      };
    },
    [primaryWallet]
  );

  const createPermissionConfigs = useCallback(
    (permissions: DelegationPermissions): PermissionConfig[] => {
      return permissions.operations.map((operation) => ({
        operation,
        maxAmountPerTx: permissions.maxAmountPerTx,
        maxDailyAmount: permissions.maxDailyAmount,
        allowedContracts: [],
        requireConfirmation: false,
        emergencyStop: false,
      }));
    },
    []
  );

  const prepareRequestData = useCallback(
    (
      permissions: DelegationPermissions,
      chainId: string,
      userSignature: string,
      smartWalletAddress: string
    ) => {
      return {
        walletAddress: primaryWallet!.address,
        chainId,
        securityLevel: permissions.securityLevel?.toLowerCase() || "basic",
        validUntil: permissions.validUntil.toISOString(),
        permissions: createPermissionConfigs(permissions),
        smartWalletOwner: smartWalletAddress, // Use the smart wallet address, not the EOA
        userSignature,
      };
    },
    [primaryWallet, createPermissionConfigs]
  );

  const createDelegation = useCallback(
    async (permissions: DelegationPermissions): Promise<DelegationResult> => {
      if (!isLoggedIn || !primaryWallet || !user) {
        return {
          success: false,
          error: "Wallet not connected. Please connect your wallet first.",
        };
      }

      setIsCreating(true);

      try {
        const chainId = permissions.chainId || DEFAULT_CHAIN_ID;
        // Note: We no longer need to create ZeroDev accounts manually
        // Dynamic Labs automatically creates them during user signup

        console.log("Creating delegation for chain:", chainId);

        const smartWalletAddress = primaryWallet?.address;

        // Create delegation message with smart wallet address
        const delegationMessage = createDelegationMessage(
          permissions,
          chainId,
          smartWalletAddress
        );

        const messageToSign = JSON.stringify(delegationMessage, null, 2);

        // Sign the delegation message using WalletClient approach
        let userSignature: string;
        try {
          // Check if it's an Ethereum wallet and use WalletClient
          if (!isEthereumWallet(primaryWallet)) {
            throw new Error(
              "Only Ethereum wallets are supported for delegation"
            );
          }

          // Use WalletClient signMessage method which handles embedded wallets better
          userSignature = await primaryWallet.signMessage(messageToSign);
        } catch (signError) {
          console.error("Error signing message with wallet client:", signError);

          // Check for common Dynamic Labs issues
          if (
            signError instanceof Error &&
            (signError.message.includes("User rejected") ||
              signError.message.includes("cancelled") ||
              signError.message.includes("User denied"))
          ) {
            throw new Error(
              "Passkey authentication was cancelled. Please try again."
            );
          }

          throw new Error(
            `Failed to sign delegation message: ${signError instanceof Error ? signError.message : "Unknown signing error"}`
          );
        }

        if (!userSignature) {
          throw new Error("User signature required for delegation");
        }

        // Create session key with smart wallet address
        const endpoint = "/session-keys";
        const requestData = prepareRequestData(
          permissions,
          chainId,
          userSignature,
          smartWalletAddress
        );

        const response = await api.post(endpoint, requestData);

        if (!response.data || response.data.error) {
          throw new Error(
            `Failed to create delegation: ${response.data?.error || "Unknown error"}`
          );
        }

        const sessionKeyId = response.data?.data?.sessionKey?.id;
        if (!sessionKeyId) {
          console.error("Missing session key ID in response:", response.data);
          throw new Error(
            "Failed to create session key - missing ID in response"
          );
        }

        // Dynamic Labs handles deployment automatically, so we can assume it's deployed
        const deploymentHash = "deployed_via_dynamic_labs";
        const smartAccountAddress = smartWalletAddress;

        toast({
          title: "Delegation Created",
          description:
            "Smart wallet delegation created successfully using passkey authentication!",
        });

        return {
          success: true,
          sessionKeyId,
          deploymentHash,
          smartAccountAddress,
        };
      } catch (error) {
        console.error("Error creating delegation", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";

        toast({
          title: "Delegation Failed",
          description: errorMessage,
          variant: "destructive",
        });

        return { success: false, error: errorMessage };
      } finally {
        setIsCreating(false);
      }
    },
    [
      isLoggedIn,
      primaryWallet,
      user,
      toast,
      createDelegationMessage,
      prepareRequestData,
    ]
  );

  const getWalletStatus = useCallback((): WalletStatus => {
    if (!primaryWallet) {
      return {
        connected: false,
        hasSmartWallet: false,
        walletType: null,
        message: "No wallet connected",
        address: null,
      };
    }

    const walletType = primaryWallet.connector?.name || "Unknown";
    const hasSmartWallet =
      walletType.includes("Smart") ||
      walletType.includes("ZeroDev") ||
      walletType.includes("Embedded") ||
      isLoggedIn;

    const supportsPasskey =
      walletType.includes("Embedded") ||
      walletType.includes("Dynamic") ||
      walletType.includes("Smart");

    let message: string;
    if (hasSmartWallet) {
      if (supportsPasskey) {
        message = "Ready for delegation with passkey authentication";
      } else {
        message = "Ready for delegation";
      }
    } else {
      message = "Please complete login";
    }

    return {
      connected: true,
      hasSmartWallet,
      walletType,
      address: primaryWallet.address,
      message,
    };
  }, [primaryWallet, isLoggedIn]);

  const isPasskeySupported = useCallback((): boolean => {
    if (!primaryWallet) return false;

    const walletType = primaryWallet.connector?.name || "";
    return (
      walletType.includes("Embedded") ||
      walletType.includes("Dynamic") ||
      walletType.includes("Smart")
    );
  }, [primaryWallet]);

  return {
    createDelegation,
    isCreating,
    getWalletStatus,
    isWalletReady: !!(isLoggedIn && primaryWallet),
    isPasskeySupported: isPasskeySupported(),
  };
}
