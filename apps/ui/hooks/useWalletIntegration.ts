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
import { baseSepolia, mainnet, polygonAmoy } from "wagmi/chains";

// Use wagmi chains for supported networks
const SUPPORTED_NETWORKS = [
  { id: mainnet.id, name: mainnet.name, symbol: "ETH" },
  { id: polygonAmoy.id, name: polygonAmoy.name, symbol: "MATIC" },
  { id: baseSepolia.id, name: baseSepolia.name, symbol: "ETH" },
  // Add additional networks from the network utility
  { id: 11155111, name: "Ethereum Sepolia", symbol: "ETH" },
  { id: 80002, name: "Polygon Amoy", symbol: "MATIC" },
  { id: 324, name: "zkSync", symbol: "ETH" },
  { id: 300, name: "zkSync Sepolia", symbol: "ETH" },
];

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

  // Set selected network when chain changes
  useEffect(() => {
    if (chainId) {
      setSelectedNetwork(chainId);
    }
  }, [chainId]);

  // Save wallet to database when connected
  useEffect(() => {
    const saveWalletToDatabase = async () => {
      console.log('Checking conditions for auto wallet save:', {
        isAuthenticated,
        isConnected,
        address,
        chainId,
        hasChain: !!chain
      });
      
      if (isAuthenticated && isConnected && address && chainId && chain) {
        console.log('Auto-saving connected wallet to database');
        
        try {
          const walletData: CreateWalletInput = {
            walletAddress: address,
            chainId: chainId.toString(),
            walletType: connector?.name || "unknown",
            chainType: "evm",
            metadata: {
              chainName: chain.name,
              chainId: chainId,
              connectorId: connector?.id,
              connectorName: connector?.name,
              connected: true,
              connectedAt: new Date().toISOString(),
              autoSaved: true
            },
          };

          console.log('Saving wallet data:', walletData);
          const savedWallet = await saveWallet.mutateAsync(walletData);
          console.log('Wallet auto-saved successfully:', savedWallet);
          
          toast({
            title: "Wallet Connected",
            description: `${connector?.name || 'Wallet'} has been connected and saved.`,
          });
        } catch (error) {
          console.error("Error saving wallet to database:", error);
          toast({
            title: "Wallet Connection Issue",
            description: "Connected but couldn't save wallet information.",
            variant: "destructive",
          });
        }
      }
    };

    saveWalletToDatabase();
  }, [
    isAuthenticated,
    isConnected,
    address,
    chainId,
    chain,
    connector,
    saveWallet,
    // toast is not needed in the dependency array as it's imported and doesn't change
  ]);

  // Format address for display
  const formatAddress = useCallback((addr: string) => {
    if (!addr) return "";
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  }, []);

  // Copy address to clipboard
  const copyAddress = useCallback(async (addr: string) => {
    if (!addr) return;

    try {
      await navigator.clipboard.writeText(addr);
      setCopiedAddress(true);
      toast({
        title: "Address copied!",
        description: "Wallet address has been copied to clipboard.",
      });
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch (error) {
      console.error("Failed to copy address:", error);
      toast({
        title: "Copy failed",
        description: "Failed to copy address to clipboard.",
        variant: "destructive",
      });
    }
  }, []);

  // Connect wallet with Magic Link
  const connectWithMagic = useCallback(async () => {
    if (!magicInstance || !isAuthenticated || !user?.email) {
      console.error('Cannot connect Magic wallet: Missing dependencies', { 
        hasMagicInstance: !!magicInstance, 
        isAuthenticated, 
        userEmail: user?.email,
        userId: user?.issuer
      });
      toast({
        title: "Authentication required",
        description: "Please log in to connect your wallet.",
        variant: "destructive",
      });
      return null;
    }
    
    // Get current network info
    const currentChainId = chainId || 1; // Default to Ethereum Mainnet if not connected

    try {
      console.log('Attempting to connect Magic wallet for user:', user.email);
      
      // Get the Magic wallet info
      // Magic SDK types may have issues, but we handle it through our validation
      let walletInfo;
      let retryCount = 0;
      const maxRetries = 3;
      
      // Implement retry logic for more reliable Magic wallet connection
      while (retryCount < maxRetries) {
        try {
          console.log(`Magic wallet connection attempt ${retryCount + 1}/${maxRetries}`);
          // @ts-expect-error - Magic SDK types issue
          walletInfo = await magicInstance.wallet.getInfo();
          if (walletInfo && walletInfo.publicAddress) {
            break;
          }
          retryCount++;
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (retryError) {
          console.error(`Magic wallet connection retry ${retryCount + 1} failed:`, retryError);
          retryCount++;
          if (retryCount >= maxRetries) throw retryError;
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      console.log('Magic wallet info received:', walletInfo);

      if (!walletInfo || !walletInfo.publicAddress) {
        console.error('Failed to get valid wallet info from Magic after retries');
        toast({
          title: "Wallet error",
          description: "Failed to connect Magic wallet. Please try again.",
          variant: "destructive",
        });
        return null;
      }

      // Save the Magic wallet to the database with enhanced metadata
      const walletData: CreateWalletInput = {
        walletAddress: walletInfo.publicAddress,
        chainId: currentChainId?.toString() || "1",
        walletType: "magic",
        chainType: "evm",
        metadata: {
          email: user.email,
          issuer: user.issuer,
          userId: user.issuer, // Make sure we explicitly include the user ID
          magicUserMetadata: user,
          connected: true,
          connectedAt: new Date().toISOString(),
          provider: "magic",
          lastSyncTime: new Date().toISOString(),
          walletSource: "magic-link",
          chainId: currentChainId?.toString() || "1",
          deviceInfo: {
            userAgent: navigator.userAgent,
            language: navigator.language,
          }
        },
      };

      console.log('Saving Magic wallet to database:', {
        address: walletData.walletAddress,
        chainId: walletData.chainId,
        walletType: walletData.walletType,
        email: user.email,
      });
      
      try {
        console.log('Attempting to save Magic wallet with data:', {
          address: walletData.walletAddress,
          chainId: walletData.chainId,
          userId: user.issuer,
          email: user.email
        });
        
        const savedWallet = await saveWallet.mutateAsync(walletData);
        console.log('Magic wallet saved successfully:', savedWallet);
        
        toast({
          title: "Magic wallet connected",
          description: "Your Magic wallet has been connected successfully.",
        });
        
        // Force refresh wallet list
        setTimeout(() => {
          console.log('Forcing wallet list refresh...');
          saveWallet.reset();
          window.dispatchEvent(new CustomEvent('wallet-connected', { detail: walletInfo.publicAddress }));
        }, 500);
        
        return walletInfo.publicAddress;
      } catch (saveError) {
        console.error('Failed to save Magic wallet to database:', saveError);
        
        // Check if this is a conflict error (wallet already exists for another user)
        const errorMessage = saveError instanceof Error ? saveError.message : String(saveError);
        
        // Define a type for API error responses
        interface ApiErrorResponse {
          response?: {
            data?: {
              message?: string;
              error?: string;
              walletAddress?: string;
            };
            status?: number;
          };
        }
        
        // Cast the error with proper typing
        const apiError = saveError as (Error & ApiErrorResponse);
        const errorObj = apiError.response?.data;
        
        // Detect the 409 conflict error or specific error message
        if (errorMessage.includes('already connected') || 
            errorMessage.includes('409') || 
            (errorObj && errorObj.error === 'WALLET_ALREADY_CONNECTED')) {
          console.error('Wallet conflict error:', errorObj || errorMessage);
          toast({
            title: "Wallet already in use",
            description: "This wallet address is already connected to another account. Each wallet can only be used by one user.",
            variant: "destructive",
          });
          return null;
        }
        
        // Wallet info is valid but saving failed - we can still use the wallet but warn the user
        toast({
          title: "Wallet connected",
          description: "Wallet connected but there was an issue saving it. Some features may be limited.",
          variant: "default",
        });
        
        return walletInfo.publicAddress;
      }
    } catch (error) {
      console.error("Error connecting Magic wallet:", error);
      toast({
        title: "Connection failed",
        description: "Failed to connect Magic wallet.",
        variant: "destructive",
      });
      return null;
    }
  }, [magicInstance, isAuthenticated, user, chainId, saveWallet]);

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

        const network = SUPPORTED_NETWORKS.find(
          (n) => n.id === networkId
        )?.name;
        if (network) {
          toast({
            title: "Network switched",
            description: `Switched to ${network}`,
          });
        }
        return true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Error switching network:", error);
        toast({
          title: "Network switch failed",
          description: errorMessage || "Failed to switch network",
          variant: "destructive",
        });
        return false;
      }
    },
    [switchChain]
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
    [deleteWallet]
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
