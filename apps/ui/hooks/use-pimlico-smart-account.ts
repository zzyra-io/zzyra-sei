"use client";

import { useCallback, useState, useEffect } from "react";
import { useDynamicContext, useIsLoggedIn } from "@dynamic-labs/sdk-react-core";
import { useWalletClient, usePublicClient } from "wagmi";
import { useToast } from "@/components/ui/use-toast";
import { createSmartAccountClient } from "permissionless";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { toSimpleSmartAccount } from "permissionless/accounts";
// EntryPoint v0.6 address (standard for ERC-4337) - Consistent with backend
const ENTRYPOINT_ADDRESS_V06 =
  "0x5FF137D4b0FDCD49DcAc67c9C32e3e73876e1aD5" as const;
import { createPublicClient, http, Address } from "viem";

// SEI Testnet Configuration
const seiTestnet = {
  id: 1328,
  name: "SEI Testnet",
  nativeCurrency: { decimals: 18, name: "SEI", symbol: "SEI" },
  rpcUrls: { default: { http: ["https://evm-rpc.sei-apis.com"] } },
  blockExplorers: {
    default: { name: "Seitrace", url: "https://seitrace.com" },
  },
} as const;

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
  delegationSignature: string;
}

export interface SmartWalletDelegationResult {
  success: boolean;
  delegation?: SmartWalletDelegation;
  error?: {
    type:
      | "DEPLOYMENT_REQUIRED"
      | "DEPLOYMENT_FAILED"
      | "WALLET_NOT_CONNECTED"
      | "OTHER";
    message: string;
    userGuidance: string;
    technicalDetails: string;
    canRetry: boolean;
    requiresManualAction: boolean;
  };
}

export function usePimlicoSmartAccount() {
  const { primaryWallet, user } = useDynamicContext();
  const isLoggedIn = useIsLoggedIn();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { toast } = useToast();

  const [smartAccountAddress, setSmartAccountAddress] = useState<string | null>(
    null
  );
  const [isDeploying, setIsDeploying] = useState(false);
  const [isCreatingDelegation, setIsCreatingDelegation] = useState(false);

  // Pimlico configuration
  const pimlicoApiKey = process.env.NEXT_PUBLIC_PIMLICO_API_KEY;
  const bundlerUrl = `https://api.pimlico.io/v2/1328/rpc?apikey=${pimlicoApiKey}`;

  /**
   * Create Pimlico smart account client
   */
  const createPimlicoSmartAccount = useCallback(async () => {
    if (!walletClient || !publicClient || !isLoggedIn) {
      throw new Error("Wallet not connected");
    }

    try {
      console.log("Creating Pimlico smart account...", {
        walletClient: !!walletClient,
        publicClient: !!publicClient,
        chainId: walletClient.chain?.id,
      });

      // Create SEI testnet public client
      const seiPublicClient = createPublicClient({
        chain: seiTestnet,
        transport: http("https://evm-rpc.sei-apis.com"),
      });

      // Create simple smart account
      const simpleSmartAccount = await toSimpleSmartAccount({
        client: seiPublicClient,
        entryPoint: {
          address: ENTRYPOINT_ADDRESS_V06,
          version: "0.6",
        },
        owner: walletClient.account,
        factoryAddress: "0x9406Cc6185a346906296840746125a0E44976454", // SimpleAccountFactory
      });

      console.log("Smart account created:", {
        address: simpleSmartAccount.address,
        entryPoint: {
          address: ENTRYPOINT_ADDRESS_V06,
          version: "0.6",
        },
      });

      setSmartAccountAddress(simpleSmartAccount.address);

      // Create Pimlico client for bundler and paymaster operations
      const pimlicoClient = createPimlicoClient({
        transport: http(bundlerUrl),
        entryPoint: {
          address: ENTRYPOINT_ADDRESS_V06,
          version: "0.6",
        },
      });

      // Create smart account client
      const smartAccountClient = createSmartAccountClient({
        account: simpleSmartAccount,
        chain: seiTestnet,
        bundlerTransport: http(bundlerUrl),
        paymaster: pimlicoClient,
        userOperation: {
          estimateFeesPerGas: async () => {
            return (await pimlicoClient.getUserOperationGasPrice()).fast;
          },
        },
      });

      return {
        smartAccount: simpleSmartAccount,
        smartAccountClient,
        publicClient: seiPublicClient,
      };
    } catch (error) {
      console.error("Failed to create Pimlico smart account:", error);
      throw error;
    }
  }, [walletClient, publicClient, isLoggedIn, pimlicoApiKey, bundlerUrl]);

  /**
   * Check if smart account is deployed
   */
  const checkDeploymentStatus = useCallback(
    async (address: string) => {
      if (!publicClient) return false;

      try {
        const seiPublicClient = createPublicClient({
          chain: seiTestnet,
          transport: http("https://evm-rpc.sei-apis.com"),
        });

        const code = await seiPublicClient.getBytecode({
          address: address as Address,
        });

        const isDeployed = code && code !== "0x";
        console.log("Smart account deployment status:", {
          address,
          isDeployed,
          codeLength: code?.length || 0,
        });

        return isDeployed;
      } catch (error) {
        console.error("Failed to check deployment status:", error);
        return false;
      }
    },
    [publicClient]
  );

  /**
   * Deploy smart account if needed
   */
  const deploySmartAccountIfNeeded = useCallback(async () => {
    setIsDeploying(true);

    try {
      const { smartAccount, smartAccountClient } =
        await createPimlicoSmartAccount();

      // Check if already deployed
      const isDeployed = await checkDeploymentStatus(smartAccount.address);

      if (isDeployed) {
        console.log("Smart account already deployed");
        return { deployed: true, address: smartAccount.address };
      }

      console.log("Deploying smart account via first transaction...");

      // Deploy by sending a minimal user operation (self-transfer of 0 ETH)
      const userOpHash = await smartAccountClient.sendUserOperation({
        calls: [
          {
            to: smartAccount.address,
            value: 0n,
            data: "0x",
          },
        ],
      });

      console.log("Smart account deployment user operation sent:", userOpHash);

      // Create Pimlico client to wait for receipt
      const pimlicoClient = createPimlicoClient({
        transport: http(bundlerUrl),
        entryPoint: {
          address: ENTRYPOINT_ADDRESS_V06,
          version: "0.6",
        },
      });

      // Wait for deployment confirmation
      const receipt = await pimlicoClient.waitForUserOperationReceipt({
        hash: userOpHash,
      });

      console.log("Smart account deployed successfully:", {
        transactionHash: receipt.receipt?.transactionHash,
        receipt: receipt.success,
      });

      return {
        deployed: true,
        address: smartAccount.address,
        deploymentHash: receipt.receipt?.transactionHash,
      };
    } catch (error) {
      console.error("Failed to deploy smart account:", error);
      throw error;
    } finally {
      setIsDeploying(false);
    }
  }, [createPimlicoSmartAccount, checkDeploymentStatus]);

  /**
   * Create smart wallet delegation for session keys
   */
  const createSmartWalletDelegation = useCallback(
    async (permissions: {
      operations: string[];
      maxAmountPerTx: string;
      maxDailyAmount: string;
      validUntil: Date;
    }): Promise<SmartWalletDelegationResult> => {
      if (!isLoggedIn || !primaryWallet || !user) {
        return {
          success: false,
          error: {
            type: "WALLET_NOT_CONNECTED",
            message: "Wallet not connected",
            userGuidance: "Please connect your wallet first",
            technicalDetails: "No active wallet connection found",
            canRetry: true,
            requiresManualAction: true,
          },
        };
      }

      setIsCreatingDelegation(true);

      try {
        console.log("Creating smart wallet delegation...", {
          permissions,
          primaryWallet: primaryWallet.address,
        });

        // Create or get smart account
        const { smartAccount, smartAccountClient } =
          await createPimlicoSmartAccount();

        // Deploy if needed
        const deploymentResult = await deploySmartAccountIfNeeded();
        if (!deploymentResult.deployed) {
          throw new Error("Failed to deploy smart account");
        }

        // Create delegation message for user to sign
        const delegationMessage = {
          smartWalletAddress: smartAccount.address,
          userAddress: primaryWallet.address,
          chainId: seiTestnet.id.toString(),
          operations: permissions.operations,
          maxAmountPerTx: permissions.maxAmountPerTx,
          maxDailyAmount: permissions.maxDailyAmount,
          validUntil: permissions.validUntil.toISOString(),
          timestamp: new Date().toISOString(),
          purpose: "zyra_workflow_automation",
          securityLevel: "MEDIUM",
        };

        // Get user signature for delegation
        const messageToSign = JSON.stringify(delegationMessage, null, 2);
        const userSignature = await primaryWallet.signMessage(messageToSign);
        
        if (!userSignature) {
          throw new Error("User signature required for session key creation");
        }

        console.log("User signed delegation message", {
          messageLength: messageToSign.length,
          signatureLength: userSignature.length,
        });

        // Generate session key with REAL user signature
        const sessionKeyResponse = await fetch("/api/session-keys", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress: primaryWallet.address,
            smartWalletOwner: smartAccount.address,
            chainId: seiTestnet.id,
            securityLevel: "MEDIUM",
            validUntil: permissions.validUntil.toISOString(),
            permissions,
            userSignature: userSignature, // REAL signature from user
          }),
        });

        if (!sessionKeyResponse.ok) {
          throw new Error("Failed to create session key");
        }

        const sessionData = await sessionKeyResponse.json();

        const delegation: SmartWalletDelegation = {
          smartWalletAddress: smartAccount.address,
          ownerAddress: primaryWallet.address,
          signerAddress: sessionData.data.sessionKey.address,
          chainId: seiTestnet.id.toString(),
          permissions,
          delegationSignature: sessionData.data.delegationMessage || "0x",
        };

        console.log(
          "Smart wallet delegation created successfully:",
          delegation
        );

        toast({
          title: "Smart Wallet Ready",
          description:
            "Your smart wallet has been set up for automated transactions",
        });

        return { success: true, delegation };
      } catch (error) {
        console.error("Failed to create smart wallet delegation:", error);

        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        toast({
          title: "Smart Wallet Setup Failed",
          description: errorMessage,
          variant: "destructive",
        });

        return {
          success: false,
          error: {
            type: "OTHER",
            message: errorMessage,
            userGuidance:
              "Please try again or contact support if the issue persists",
            technicalDetails: String(error),
            canRetry: true,
            requiresManualAction: false,
          },
        };
      } finally {
        setIsCreatingDelegation(false);
      }
    },
    [
      isLoggedIn,
      primaryWallet,
      user,
      createPimlicoSmartAccount,
      deploySmartAccountIfNeeded,
      toast,
    ]
  );

  // Auto-create smart account when wallet connects
  useEffect(() => {
    if (isLoggedIn && walletClient && !smartAccountAddress && !isDeploying) {
      createPimlicoSmartAccount()
        .then(({ smartAccount }) => {
          setSmartAccountAddress(smartAccount.address);
        })
        .catch(console.error);
    }
  }, [
    isLoggedIn,
    walletClient,
    smartAccountAddress,
    isDeploying,
    createPimlicoSmartAccount,
  ]);

  return {
    smartAccountAddress,
    isDeploying,
    isCreatingDelegation,
    createSmartWalletDelegation,
    deploySmartAccountIfNeeded,
    checkDeploymentStatus,
  };
}
