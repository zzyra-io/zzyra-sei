import { useToast } from "@/components/ui/use-toast";
import api from "@/lib/services/api";
import {
  useDynamicContext,
  useIsLoggedIn,
  useSignInWithPasskey,
} from "@dynamic-labs/sdk-react-core";
import { useCallback, useState } from "react";
import { useWalletClient } from "wagmi";

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
 */
export function useSmartWalletDelegation() {
  const { toast } = useToast();
  const { primaryWallet, user } = useDynamicContext();
  const isLoggedIn = useIsLoggedIn();
  const signInWithPasskey = useSignInWithPasskey();
  const [isCreating, setIsCreating] = useState(false);
  const { data: walletClient } = useWalletClient();

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
      userSignature: string
    ) => {
      return {
        walletAddress: primaryWallet!.address,
        chainId,
        securityLevel: permissions.securityLevel?.toLowerCase() || "basic",
        validUntil: permissions.validUntil.toISOString(),
        permissions: createPermissionConfigs(permissions),
        smartWalletOwner: primaryWallet!.address,
        userSignature,
      };
    },
    [primaryWallet, createPermissionConfigs]
  );

  const signMessageWithPasskey = useCallback(
    async (message: string): Promise<string> => {
      try {
        console.log(
          "🔐 Attempting passkey authentication for message signing",
          {
            walletType: primaryWallet?.connector?.name,
            hasPrimaryWallet: !!primaryWallet,
            hasWalletClient: !!walletClient,
          }
        );

        // Method 1: Try Dynamic Labs embedded wallet signing (passkey-enabled)
        if (
          primaryWallet?.connector?.name?.includes("Embedded") ||
          primaryWallet?.connector?.name?.includes("Dynamic")
        ) {
          console.log(
            "✅ Using Dynamic Labs embedded wallet with passkey authentication"
          );

          // Try to get the embedded wallet's signMessage method
          const embeddedWallet = primaryWallet as {
            signMessage?: (message: string) => Promise<string>;
            wallet?: { signMessage?: (message: string) => Promise<string> };
            connector?: { signMessage?: (message: string) => Promise<string> };
          };

          if (embeddedWallet.signMessage) {
            console.log("🔑 Using embeddedWallet.signMessage");
            return await embeddedWallet.signMessage(message);
          }

          // Try alternative signing methods for embedded wallets
          if (embeddedWallet.wallet?.signMessage) {
            console.log("🔑 Using embeddedWallet.wallet.signMessage");
            return await embeddedWallet.wallet.signMessage(message);
          }

          if (embeddedWallet.connector?.signMessage) {
            console.log("🔑 Using embeddedWallet.connector.signMessage");
            return await embeddedWallet.connector.signMessage(message);
          }

          console.log(
            "⚠️ No direct signing method found on embedded wallet, trying passkey authentication"
          );
        }

        // Method 2: Try to trigger passkey authentication flow
        if (signInWithPasskey) {
          console.log(
            "🔐 Attempting to trigger Dynamic Labs passkey authentication flow"
          );
          try {
            // This will prompt for passkey/biometric authentication
            await signInWithPasskey();
            console.log(
              "✅ Passkey authentication successful, retrying signing"
            );

            // After successful authentication, try signing again with the wallet
            if (primaryWallet?.signMessage) {
              return await primaryWallet.signMessage(message);
            }

            // Try embedded wallet methods again after authentication
            const embeddedWallet = primaryWallet as {
              signMessage?: (message: string) => Promise<string>;
              wallet?: { signMessage?: (message: string) => Promise<string> };
              connector?: {
                signMessage?: (message: string) => Promise<string>;
              };
            };

            if (embeddedWallet.wallet?.signMessage) {
              return await embeddedWallet.wallet.signMessage(message);
            }

            if (embeddedWallet.connector?.signMessage) {
              return await embeddedWallet.connector.signMessage(message);
            }
          } catch (passkeyError) {
            console.log(
              "⚠️ Passkey authentication failed, falling back to traditional signing:",
              passkeyError
            );
          }
        }

        // Method 3: Fallback to traditional wallet signing
        if (walletClient && primaryWallet?.address) {
          console.log("🔄 Falling back to traditional wallet signing");
          return await walletClient.signMessage({
            message,
            account: primaryWallet.address as `0x${string}`,
          });
        }

        console.error("❌ No signing method available");
        throw new Error(
          "No signing method available - please ensure passkey authentication is enabled"
        );
      } catch (error) {
        console.error("❌ Error in passkey signing:", error);
        throw new Error(
          `Failed to sign message: ${error instanceof Error ? error.message : "Unknown signing error"}`
        );
      }
    },
    [primaryWallet, walletClient, signInWithPasskey]
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

        console.log("Creating delegation for chain:", chainId);

        // Create a simple delegation message for signing
        const delegationMessage = createDelegationMessage(
          permissions,
          chainId,
          primaryWallet.address
        );

        console.log("delegationMessage", delegationMessage);
        const messageToSign = JSON.stringify(delegationMessage, null, 2);

        console.log("Signing message with passkey authentication:", {
          messageToSign,
          walletAddress: primaryWallet.address,
          chainId,
          walletType: primaryWallet.connector?.name,
        });

        let userSignature: string;
        try {
          // Use passkey authentication for signing
          userSignature = await signMessageWithPasskey(messageToSign);

          console.log("User signature received via passkey:", {
            signatureLength: userSignature?.length || 0,
            signaturePreview:
              userSignature?.slice(0, 10) + "..." || "undefined",
          });
        } catch (signError) {
          console.error("Error signing message with passkey:", signError);
          throw new Error(
            `Failed to sign delegation message: ${signError instanceof Error ? signError.message : "Unknown signing error"}`
          );
        }

        if (!userSignature) {
          throw new Error("User signature required for delegation");
        }

        const endpoint = "/session-keys";
        const requestData = prepareRequestData(
          permissions,
          chainId,
          userSignature
        );

        console.log("Sending delegation request:", {
          endpoint,
          chainId,
          requestDataKeys: Object.keys(requestData),
        });

        const response = await api.post(endpoint, requestData);

        console.log("API response received:", {
          status: response.status,
          hasData: !!response.data,
          responseKeys: response.data ? Object.keys(response.data) : [],
        });

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

        // Extract deployment information if available
        const deploymentHash = response.data?.data?.deploymentHash;
        const smartAccountAddress = response.data?.data?.smartAccountAddress;

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
      signMessageWithPasskey,
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
