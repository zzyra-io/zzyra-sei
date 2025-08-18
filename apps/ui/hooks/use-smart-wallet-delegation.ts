import { useToast } from "@/components/ui/use-toast";
import api from "@/lib/services/api";
import {
  createSessionKey,
  deploySmartAccount,
  isSmartAccountDeployed,
  verifySmartAccountSetup,
} from "@/lib/simple-smart-account";
import { isEthereumWallet } from "@dynamic-labs/ethereum";
import { isZeroDevConnector } from "@dynamic-labs/ethereum-aa";

import { useDynamicContext, useIsLoggedIn } from "@dynamic-labs/sdk-react-core";
import { useCallback, useState } from "react";
// Dynamic provides addresses, but we need to verify/deploy contracts ourselves

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

  const isZeroDev = isZeroDevConnector(primaryWallet?.connector);
  console.log("isZeroDev", isZeroDev);

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
        console.log(
          "Creating delegation for chain:",
          chainId,
          "type:",
          typeof chainId
        );

        // Validate and parse chain ID
        const numericChainId =
          typeof chainId === "string" ? parseInt(chainId) : chainId;
        if (isNaN(numericChainId)) {
          throw new Error(
            `Invalid chain ID: ${chainId}. Must be a valid number.`
          );
        }

        console.log("Parsed chain ID:", numericChainId);

        // Check if it's an Ethereum wallet
        if (!isEthereumWallet(primaryWallet)) {
          throw new Error("Only Ethereum wallets are supported for delegation");
        }

        // STEP 1: Get Dynamic's ZeroDv kernel client using official integration
        console.log("Getting ZeroDv kernel client from Dynamic Labs...");
        const { connector } = primaryWallet;

        if (!isZeroDevConnector(connector)) {
          throw new Error("Wallet connector is not a ZeroDv connector");
        }

        toast({
          title: "Preparing Smart Account",
          description: "Setting up ZeroDv kernel client...",
        });

        // Ensure kernel client is loaded according to Dynamic docs
        console.log("🔄 Ensuring kernel client is initialized...");
        await connector.getNetwork();

        // Get the kernel client using Dynamic's official method
        const kernelClient = connector.getAccountAbstractionProvider({
          withSponsorship: true, // Enable gas sponsorship if available
        });

        if (!kernelClient) {
          throw new Error("Failed to get ZeroDv kernel client from Dynamic");
        }

        console.log("✅ ZeroDv kernel client obtained successfully");

        // STEP 2: Verify smart account setup using kernel client
        const setupStatus = await verifySmartAccountSetup(
          kernelClient,
          numericChainId
        );

        if (!setupStatus.isReady) {
          throw new Error(`Smart account setup failed: ${setupStatus.error}`);
        }

        console.log("Smart account setup status:", setupStatus);
        const smartWalletAddress = setupStatus.address;

        // STEP 3: Deploy smart contract if needed using kernel client
        if (setupStatus.needsDeployment) {
          toast({
            title: "Deploying Smart Account",
            description: "Creating your smart account on-chain...",
          });

          console.log("🚀 Smart account needs deployment, deploying now...");

          const deploymentResult = await deploySmartAccount(
            kernelClient,
            numericChainId
          );

          if (!deploymentResult.success) {
            throw new Error(
              `Failed to deploy smart account: ${deploymentResult.error}`
            );
          }

          console.log(
            "✅ Smart account deployment completed:",
            deploymentResult
          );

          toast({
            title: "Smart Account Ready",
            description: "Smart account successfully prepared for use!",
          });
        } else {
          console.log(
            "✅ Smart account already deployed, proceeding with existing contract"
          );
        }

        // STEP 3: Final verification before session key creation
        console.log(
          "🔍 Final verification of smart account before session key creation..."
        );
        const finalCheck = await isSmartAccountDeployed(
          smartWalletAddress,
          numericChainId
        );

        if (!finalCheck) {
          console.log("🚀 Smart account not fully deployed, deploying now...");

          toast({
            title: "Deploying Smart Account",
            description:
              "Ensuring smart account is deployed before session key installation...",
          });

          // Force deployment by sending a minimal transaction
          const deploymentResult = await deploySmartAccount(
            kernelClient,
            numericChainId
          );

          if (!deploymentResult.success) {
            throw new Error(
              `Failed to deploy smart account: ${deploymentResult.error}`
            );
          }

          console.log("✅ Smart account deployment completed successfully");

          // Re-verify deployment
          const reCheckDeployment = await isSmartAccountDeployed(
            smartWalletAddress,
            numericChainId
          );

          if (!reCheckDeployment) {
            throw new Error(
              "Smart account deployment verification failed - account still not deployed"
            );
          }

          toast({
            title: "Smart Account Deployed",
            description:
              "Smart account is now ready for session key installation",
          });
        }

        // STEP 4: Create delegation message with verified smart wallet address
        console.log(
          "📝 Creating delegation message with smart account:",
          smartWalletAddress
        );
        const delegationMessage = createDelegationMessage(
          permissions,
          numericChainId.toString(),
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

        // STEP 4.5: ✅ CRITICAL FIX - Install session key validator on smart account
        console.log("🔧 Installing session key validator on smart account...");

        toast({
          title: "Installing Session Key Validator",
          description: "Authorizing session key for automated execution...",
        });

        const sessionKeyResult = await createSessionKey(
          kernelClient,
          {
            validUntil: Math.floor(permissions.validUntil.getTime() / 1000),
            validAfter: Math.floor(Date.now() / 1000),
            spendingLimits: {
              perTransaction: permissions.maxAmountPerTx,
              dailyLimit: permissions.maxDailyAmount,
            },
            operations: permissions.operations,
          },
          smartWalletAddress // ⭐ CRITICAL: Pass the verified deployed address
        );

        if (!sessionKeyResult.success) {
          throw new Error(
            `Session key validator installation failed: ${sessionKeyResult.error}`
          );
        }

        console.log("✅ Session key validator installed successfully", {
          validatorAddress: sessionKeyResult.validatorAddress,
          sessionKeyAddress: sessionKeyResult.sessionKeyAddress,
          smartWalletAddressUsed: smartWalletAddress, // ⭐ DEBUG: What address we're using
        });

        // STEP 5: Create session key in database WITH validator authorization data
        console.log(
          "🔐 Storing authorized session key for smart account:",
          smartWalletAddress
        );
        const endpoint = "/session-keys";
        const requestData = {
          ...prepareRequestData(
            permissions,
            numericChainId.toString(),
            userSignature,
            smartWalletAddress
          ),
          // ✅ CRITICAL: Include serialized session key validator data
          serializedSessionParams: sessionKeyResult.serializedSessionParams,
        };

        // ⭐ DEBUG: Log what we're sending to the API
        console.log("🔍 DEBUG: Sending to API:", {
          smartWalletOwner: requestData.smartWalletOwner,
          walletAddress: requestData.walletAddress,
          sessionKeyAddress: sessionKeyResult.sessionKeyAddress,
          smartWalletAddressUsed: smartWalletAddress,
        });

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

        // Provide proper deployment information based on our verification
        const deploymentHash = setupStatus.isDeployed
          ? "already_deployed"
          : "prepared_for_deployment";

        console.log("✅ Session key created successfully:", {
          sessionKeyId,
          smartAccountAddress: smartWalletAddress,
          deploymentStatus: setupStatus.isDeployed ? "deployed" : "prepared",
          chainId: numericChainId,
        });

        toast({
          title: "Delegation Created",
          description: setupStatus.isDeployed
            ? "Smart wallet delegation created successfully!"
            : "Smart wallet delegation created! Account will deploy on first use.",
        });

        return {
          success: true,
          sessionKeyId,
          deploymentHash,
          smartAccountAddress: smartWalletAddress,
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
