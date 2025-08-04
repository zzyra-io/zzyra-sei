import { useState, useEffect, useCallback } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSwitchChain,
  useConfig,
} from "wagmi";
import { useMagicAuth } from "@/lib/hooks/use-magic-auth";
import { useUserWallets, CreateWalletInput } from "./useUserWallets";
import { toast } from "@/hooks/use-toast";
import {
  getDefaultNetwork,
  ACTIVE_NETWORKS,
  getNetworkName,
  isActiveNetwork,
} from "@/lib/utils/network";

// Convert active networks to the format expected by the component
const SUPPORTED_NETWORKS = ACTIVE_NETWORKS.map((chain) => ({
  id: chain.id,
  name: chain.name,
  symbol:
    chain.id === 1328
      ? "SEI"
      : chain.name.toLowerCase().includes("polygon")
        ? "MATIC"
        : "ETH",
}));

/**
 * Hook to integrate wallet functionality with Magic Link and wagmi
 */
export const useWalletIntegration = () => {
  // Magic Auth
  const { user, isAuthenticated, magicInstance } = useMagicAuth();

  // Wagmi hooks
  const { address, isConnected, connector, chainId } = useAccount();
  const {
    connect,
    connectors,
    error: connectError,
    isPending: isConnecting,
  } = useConnect();
  const { disconnect, isPending: isDisconnecting } = useDisconnect();
  const { chains, switchChain } = useSwitchChain();
  const config = useConfig();

  // Get current chain from config
  const chain = chainId
    ? config.chains.find((c) => c.id === chainId)
    : undefined;

  // User wallets from database
  const {
    wallets,
    isLoading: isLoadingWallets,
    saveWallet,
    deleteWallet,
  } = useUserWallets();

  // Local state
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedNetwork, setSelectedNetwork] = useState<number | undefined>(
    chainId
  );

  // Auto-switch to default network when wallet connects with wrong network
  useEffect(() => {
    const handleNetworkSwitch = async () => {
      if (isConnected && chainId && switchChain) {
        const defaultNetworkId = getDefaultNetwork().id;

        // If not on an active network, switch to default
        if (!isActiveNetwork(chainId)) {
          console.log(
            `Switching from unsupported network ${chainId} to default network ${defaultNetworkId}`
          );
          try {
            await switchChain({ chainId: defaultNetworkId });
          } catch (error: unknown) {
            console.warn("Failed to auto-switch to default network:", error);
            toast({
              title: "Network Switch Required",
              description: `Please switch to ${getDefaultNetwork().name} to use this app.`,
              variant: "destructive",
            });
          }
        }
      }
    };

    handleNetworkSwitch();
  }, [isConnected, chainId, switchChain]);

  // Set selected network when chain changes
  useEffect(() => {
    if (chainId) {
      setSelectedNetwork(chainId);
    }
  }, [chainId]);

  // Format address for display
  const formatAddress = useCallback((address?: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, []);

  // Copy address to clipboard
  const copyAddress = useCallback(async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
      toast({
        title: "Address copied",
        description: "Wallet address copied to clipboard",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Failed to copy address to clipboard",
        variant: "destructive",
      });
    }
  }, [address, toast]);

  // Save wallet to database when connected
  useEffect(() => {
    const saveConnectedWallet = async () => {
      if (isConnected && address && isAuthenticated && user?.email) {
        // Check if wallet is already saved
        const existingWallet = wallets?.find(
          (w) => w.walletAddress.toLowerCase() === address.toLowerCase()
        );

        if (!existingWallet) {
          const walletData: CreateWalletInput = {
            walletAddress: address,
            chainId: chainId?.toString() || getDefaultNetwork().id.toString(),
            walletType: connector?.name || "Unknown",
            chainType: "evm",
            metadata: {
              name: `${connector?.name || "Unknown"} Wallet`,
              description: `Connected via ${connector?.name || "Unknown"} connector`,
              network: getNetworkName(chainId),
              chainId: chainId || getDefaultNetwork().id,
              connectedAt: new Date().toISOString(),
            },
          };

          try {
            await saveWallet.mutateAsync(walletData);

            // Dispatch custom event for wallet connection
            const event = new CustomEvent("wallet-connected", {
              detail: { address, chainId },
            });
            window.dispatchEvent(event);

            toast({
              title: "Wallet saved",
              description: "Your wallet has been added to your account.",
            });
          } catch (error) {
            console.error("Error saving wallet:", error);
            // Don't show error toast as this is not critical
          }
        }
      }
    };

    saveConnectedWallet();
  }, [
    isConnected,
    address,
    isAuthenticated,
    user?.email,
    connector?.name,
    chainId,
    wallets,
    saveWallet,
    toast,
  ]);

  // Connect with Magic Link
  const connectWithMagic = useCallback(async () => {
    if (!magicInstance || !isAuthenticated || !user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to connect with Magic Link.",
        variant: "destructive",
      });
      return false;
    }

    try {
      // Get Magic wallet info - simplified approach
      const magicAddress = user.publicAddress;

      if (magicAddress) {
        // Save Magic wallet
        const walletData: CreateWalletInput = {
          walletAddress: magicAddress,
          chainId: chainId?.toString() || getDefaultNetwork().id.toString(),
          walletType: "magic",
          chainType: "evm",
          metadata: {
            name: "Magic Wallet",
            description: "Magic Link wallet",
            network: getNetworkName(chainId),
            chainId: chainId || getDefaultNetwork().id,
            connectedAt: new Date().toISOString(),
          },
        };

        // Check if already exists
        const existingWallet = wallets?.find(
          (w) => w.walletAddress.toLowerCase() === magicAddress.toLowerCase()
        );

        if (!existingWallet) {
          await saveWallet.mutateAsync(walletData);

          // Dispatch custom event
          const event = new CustomEvent("wallet-connected", {
            detail: { address: magicAddress, chainId },
          });
          window.dispatchEvent(event);

          toast({
            title: "Magic wallet connected",
            description: "Your Magic wallet has been connected.",
          });
        }

        return true;
      }
    } catch (error) {
      console.error("Error connecting Magic wallet:", error);
      toast({
        title: "Magic connection failed",
        description: "Failed to connect Magic wallet.",
        variant: "destructive",
      });
    }

    return false;
  }, [
    magicInstance,
    isAuthenticated,
    user,
    chainId,
    saveWallet,
    wallets,
    toast,
  ]);

  // Switch network
  const handleSwitchNetwork = useCallback(
    async (networkId: number) => {
      if (!switchChain) {
        toast({
          title: "Network switching unavailable",
          description: "Network switching is not supported by your wallet.",
          variant: "destructive",
        });
        return false;
      }

      try {
        await switchChain({ chainId: networkId });
        setSelectedNetwork(networkId);

        const networkName = getNetworkName(networkId);
        toast({
          title: "Network switched",
          description: `Switched to ${networkName}`,
        });
        return true;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error("Error switching network:", error);
        toast({
          title: "Network switch failed",
          description: errorMessage || "Failed to switch network",
          variant: "destructive",
        });
        return false;
      }
    },
    [switchChain, toast]
  );

  // Get network details by ID
  const getNetworkById = useCallback((networkId?: number) => {
    if (!networkId) return null;
    return SUPPORTED_NETWORKS.find((n) => n.id === networkId) || null;
  }, []);

  // Remove wallet from database
  const removeWallet = useCallback(
    async (walletId: string) => {
      try {
        await deleteWallet.mutateAsync(walletId);
        toast({
          title: "Wallet removed",
          description: "The wallet has been removed from your account.",
        });
      } catch (error) {
        console.error("Error removing wallet:", error);
        toast({
          title: "Removal failed",
          description: "Failed to remove wallet.",
          variant: "destructive",
        });
      }
    },
    [deleteWallet, toast]
  );

  return {
    // Authentication state
    isAuthenticated,
    user,

    // Wallet connection state
    address,
    isConnected,
    connector,
    chain,
    chains,

    // Database wallets
    wallets,
    isLoadingWallets,

    // Connection operations
    connect,
    connectors,
    connectError,
    isConnecting,
    disconnect,
    isDisconnecting,
    connectWithMagic,

    // Network operations
    selectedNetwork,
    setSelectedNetwork,
    switchNetwork: handleSwitchNetwork,
    getNetworkById,
    supportedNetworks: SUPPORTED_NETWORKS,

    // Utility functions
    formatAddress,
    copyAddress,
    copiedAddress,
    removeWallet,

    // UI state
    balanceVisible,
    setBalanceVisible,
    autoRefresh,
    setAutoRefresh,
  };
};
