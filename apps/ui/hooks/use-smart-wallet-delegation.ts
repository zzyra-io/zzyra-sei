import { useToast } from "@/components/ui/use-toast";
import api from "@/lib/services/api";
import { useDynamicContext, useIsLoggedIn } from "@dynamic-labs/sdk-react-core";
import { createSmartAccountClient as createPermissionlessSmartAccountClient } from "permissionless";
import { toSimpleSmartAccount } from "permissionless/accounts";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { useCallback, useState } from "react";
import { createPublicClient, type PublicClient } from "viem";
import { entryPoint07Address } from "viem/account-abstraction";
import { Chain } from "viem/chains";
import { http, useChains, useWalletClient } from "wagmi";
const SUPPORTED_CHAINS = {
  SEI_TESTNET: 1328,
  BASE: 8453,
  BASE_SEPOLIA: 84532,
} as const;

const PIMLICO_CHAINS = [
  SUPPORTED_CHAINS.SEI_TESTNET,
  SUPPORTED_CHAINS.BASE,
  SUPPORTED_CHAINS.BASE_SEPOLIA,
] as const;

const DEFAULT_CHAIN_ID = SUPPORTED_CHAINS.SEI_TESTNET.toString();

export interface DelegationPermissions {
  operations: string[];
  maxAmountPerTx: string;
  maxDailyAmount: string;
  validUntil: Date;
  chainId?: string;
  securityLevel?: string;
}

export interface DelegationResult {
  success: boolean;
  sessionKeyId?: string;
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
 * Simplified hook for creating smart wallet delegations
 * Uses Dynamic Labs built-in smart wallet + backend API
 */
export function useSmartWalletDelegation() {
  const { toast } = useToast();
  const { primaryWallet, user } = useDynamicContext();
  const isLoggedIn = useIsLoggedIn();
  const [isCreating, setIsCreating] = useState(false);
  const chains = useChains();
  const { data: walletClient } = useWalletClient();

  const isPimlicoChain = useCallback((chainId: string): boolean => {
    const chainIdNum = parseInt(chainId);
    return PIMLICO_CHAINS.includes(
      chainIdNum as (typeof PIMLICO_CHAINS)[number]
    );
  }, []);

  const createPublicClientForChain = useCallback(
    (chainId: string): PublicClient => {
      const chainIdNum = parseInt(chainId);
      const chain = chains.find((chain) => chain.id === chainIdNum);

      if (!chain) {
        throw new Error(`Chain with ID ${chainId} not found`);
      }

      return createPublicClient({
        chain,
        transport: http(chain.rpcUrls.default.http[0]),
      });
    },
    [chains]
  );

  const createPimlicoClientForChain = useCallback(
    (chainId: string, chain: Chain) => {
      const pimlicoUrl = `https://api.pimlico.io/v2/${chainId}/rpc?apikey=${process.env.NEXT_PUBLIC_PIMLICO_API_KEY}`;
      console.log("pimlicoUrl", { pimlicoUrl, chainId, chain });

      return createPimlicoClient({
        chain,
        transport: http(pimlicoUrl),
        entryPoint: {
          address: entryPoint07Address,
          version: "0.7",
        },
      });
    },
    []
  );

  const createSmartAccount = useCallback(
    async (chainId: string) => {
      if (!walletClient) {
        throw new Error("Wallet client not available");
      }

      const publicClient = createPublicClientForChain(chainId);

      return await toSimpleSmartAccount<"0.7">({
        owner: walletClient,
        client: publicClient,
        entryPoint: {
          address: entryPoint07Address,
          version: "0.7",
        },
      });
    },
    [walletClient, createPublicClientForChain]
  );

  const createSmartAccountClient = useCallback(
    async (chainId: string) => {
      const chainIdNum = parseInt(chainId);
      const chain = chains.find((chain) => chain.id === chainIdNum);

      if (!chain) {
        throw new Error(`Chain with ID ${chainId} not found`);
      }

      const pimlicoUrl = `https://api.pimlico.io/v2/${chainId}/rpc?apikey=${process.env.NEXT_PUBLIC_PIMLICO_API_KEY}`;
      const pimlicoClient = createPimlicoClientForChain(chainId, chain);
      const simpleSmartAccount = await createSmartAccount(chainId);

      return {
        client: createPermissionlessSmartAccountClient({
          account: simpleSmartAccount,
          chain,
          bundlerTransport: http(pimlicoUrl),
          paymaster: pimlicoClient,
          userOperation: {
            estimateFeesPerGas: async () => {
              return (await pimlicoClient.getUserOperationGasPrice()).fast;
            },
          },
        }),
        account: simpleSmartAccount,
      };
    },
    [chains, createPimlicoClientForChain, createSmartAccount]
  );

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
        provider: isPimlicoChain(chainId) ? "pimlico" : "zerodev",
      };
    },
    [primaryWallet, isPimlicoChain]
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
      isPimlico: boolean,
      smartAccountAddress: string
    ) => {
      const baseData = {
        walletAddress: primaryWallet!.address,
        chainId,
        securityLevel: permissions.securityLevel?.toLowerCase() || "basic",
        validUntil: permissions.validUntil.toISOString(),
        permissions: createPermissionConfigs(permissions),
      };

      if (isPimlico) {
        return {
          ...baseData,
          userSignature,
          smartAccountAddress,
        };
      }

      return {
        ...baseData,
        smartWalletOwner: primaryWallet!.address,
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
        const isPimlico = isPimlicoChain(chainId);

        console.log(
          "Creating delegation for chain:",
          chainId,
          "using provider:",
          isPimlico ? "pimlico" : "zerodev"
        );

        const { client: smartAccountClient, account: simpleSmartAccount } =
          await createSmartAccountClient(chainId);

        const delegationMessage = createDelegationMessage(
          permissions,
          chainId,
          simpleSmartAccount.address
        );
        console.log("delegationMessage", delegationMessage);
        const messageToSign = JSON.stringify(delegationMessage, null, 2);

        console.log("Signing message with smart account:", {
          messageToSign,
          smartAccountAddress: simpleSmartAccount.address,
          chainId,
        });

        let userSignature: string;
        try {
          // Add timeout to prevent hanging
          const signPromise = primaryWallet.signMessage(messageToSign);

          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(
              () =>
                reject(new Error("Message signing timed out after 30 seconds")),
              30000
            );
          });

          userSignature = await Promise.race([signPromise, timeoutPromise]);

          console.log("User signature received:", {
            signatureLength: userSignature?.length || 0,
            signaturePreview:
              userSignature?.slice(0, 10) + "..." || "undefined",
          });
        } catch (signError) {
          console.error("Error signing message:", signError);
          throw new Error(
            `Failed to sign delegation message: ${signError instanceof Error ? signError.message : "Unknown signing error"}`
          );
        }

        if (!userSignature) {
          throw new Error("User signature required for delegation");
        }

        const endpoint = isPimlico ? "/session-keys/pimlico" : "/session-keys";
        const requestData = prepareRequestData(
          permissions,
          chainId,
          userSignature,
          isPimlico,
          simpleSmartAccount.address
        );

        console.log("Sending delegation request:", {
          endpoint,
          chainId,
          isPimlico,
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

        toast({
          title: "Delegation Created",
          description: "Smart wallet delegation created successfully!",
        });

        return { success: true, sessionKeyId };
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
      isPimlicoChain,
      createSmartAccountClient,
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

    const hasSmartWallet =
      primaryWallet.connector?.name?.includes("Smart") ||
      primaryWallet.connector?.name?.includes("ZeroDev") ||
      isLoggedIn;

    return {
      connected: true,
      hasSmartWallet,
      walletType: primaryWallet.connector?.name || "Unknown",
      address: primaryWallet.address,
      message: hasSmartWallet
        ? "Ready for delegation"
        : "Please complete login",
    };
  }, [primaryWallet, isLoggedIn]);

  return {
    createDelegation,
    isCreating,
    getWalletStatus,
    isWalletReady: !!(isLoggedIn && primaryWallet),
  };
}
