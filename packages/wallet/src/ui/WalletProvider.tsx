/**
 * Wallet Provider
 *
 * React context provider for wallet functionality
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  PropsWithChildren,
} from "react";
import { useAccount, useConnect } from "wagmi"; // Import wagmi hooks

import { WalletContext } from "../contexts/WalletContext";
import { WalletService } from "../services/wallet.service";
import {
  Wallet as CoreWallet, // CoreWallet is our DB model representation
  WalletType,
  ChainType,
  WalletContextState,
} from "../core/types";

/**
 * Custom errors for wallet operations
 */
class NotConnectedError extends Error {
  constructor() {
    super("Wallet not connected");
    this.name = "NotConnectedError";
  }
}

class TransactionError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "TransactionError";
    this.code = code;
  }
}

// Define a minimal type for the user object expected from an auth provider (like useMagicAuth)
interface AppUser {
  id: string;
  [key: string]: any; // Allow other properties
}

/**
 * Props for WalletProvider component
 */
interface WalletProviderProps extends PropsWithChildren {
  // magicApiKey is no longer directly used by WalletProvider if WalletService doesn't need it
  // and wagmi's DedicatedWalletConnector is configured at WagmiConfig level.
  // magicApiKey: string;
  initialUserId?: string;
  externalUser?: AppUser | null; // User object from an external auth system (e.g., useMagicAuth().user)
  isExternalAuthLoading?: boolean; // Loading state of the external auth system
}

/**
 * Wallet Provider Component
 *
 * This component provides the wallet service to all child components.
 * It integrates with Magic Link for wallet connections and transactions.
 */
export const WalletProvider: React.FC<WalletProviderProps> = ({
  children,
  // magicApiKey, // Removed
  initialUserId,
  externalUser,
  isExternalAuthLoading,
}) => {
  const [walletService, setWalletService] = useState<WalletService | null>(
    null
  );
  const [persistedWallet, setPersistedWallet] = useState<CoreWallet | null>(
    null
  );
  const [persistedWallets, setPersistedWallets] = useState<CoreWallet[]>([]);
  const [isLoadingPersistedWallet, setIsLoadingPersistedWallet] =
    useState<boolean>(false);
  const [appError, setAppError] = useState<Error | null>(null);
  const [appUserId, setAppUserId] = useState<string | undefined>(initialUserId);

  // Initialize WalletService once
  useEffect(() => {
    const service = new WalletService();
    setWalletService(service);
  }, []);

  // Effect to set appUserId from externalUser (e.g., from useMagicAuth)
  useEffect(() => {
    if (!isExternalAuthLoading && externalUser?.id) {
      if (appUserId !== externalUser.id) {
        // Set only if different or not set
        setAppUserId(externalUser.id);
        console.log(
          "ZyraWalletProvider: appUserId set from externalUser:",
          externalUser.id
        );
      }
    } else if (!isExternalAuthLoading && !externalUser && !initialUserId) {
      // External user logged out, and no initialUserId was overriding
      if (appUserId) {
        setAppUserId(undefined);
        console.log(
          "ZyraWalletProvider: appUserId cleared due to externalUser logout."
        );
      }
    }
  }, [externalUser, isExternalAuthLoading, appUserId, initialUserId]);

  // Wagmi account state
  const { address, isConnected, chain, connector } = useAccount();

  // Helper to derive WalletType from wagmi connector ID
  const getWalletTypeFromConnectorId = (connectorId?: string): WalletType => {
    if (!connectorId) return WalletType.METAMASK; // Default or throw error
    switch (connectorId.toLowerCase()) {
      case "magic":
      case "magiclink": // Common variations
        return WalletType.MAGIC;
      case "metamask":
      case "injected": // MetaMask is often an injected provider
        return WalletType.METAMASK;
      case "walletconnect":
        return WalletType.WALLET_CONNECT;
      case "coinbasewallet":
        return WalletType.COINBASE;
      default:
        console.warn(
          `Unknown connector ID: ${connectorId}, defaulting WalletType.`
        );
        // Fallback to a generic type or handle as an error based on requirements
        return WalletType.METAMASK; // Or a new WalletType.OTHER
    }
  };

  // Helper to derive ChainType from wagmi chain ID
  const getChainTypeFromChainId = (wagmiChainId?: number): ChainType => {
    if (wagmiChainId === undefined) return ChainType.ETHEREUM; // Default or throw
    switch (wagmiChainId) {
      case 1:
        return ChainType.ETHEREUM;
      case 5:
        return ChainType.GOERLI;
      case 137:
        return ChainType.POLYGON;
      case 80001:
        return ChainType.MUMBAI;
      case 10:
        return ChainType.OPTIMISM;
      case 42161:
        return ChainType.ARBITRUM;
      // Add more mappings as needed
      default:
        console.warn(
          `Unknown chain ID: ${wagmiChainId}, defaulting ChainType.`
        );
        return ChainType.ETHEREUM; // Or handle as an error
    }
  };

  const setUserIdForApp = useCallback((id: string) => {
    setAppUserId(id);
  }, []);

  const clearPersistedWalletState = useCallback(() => {
    setPersistedWallet(null);
    setPersistedWallets([]); // Clear list of all wallets for user too
    setAppError(null);
    // Should not clear appUserId unless intended
  }, []);

  // Sync with DB when wagmi connection status changes or appUserId is set
  const syncWalletWithDb = useCallback(
    async (wagmiWallet: {
      address: string;
      chainId: number;
      connectorId?: string;
    }) => {
      if (!walletService) {
        setAppError(new Error("WalletService not ready for sync."));
        return;
      }
      if (!appUserId) {
        setAppError(new Error("User ID not set. Cannot sync wallet with DB."));
        // Potentially clear persistedWallet if user disconnects or logs out
        setPersistedWallet(null);
        return;
      }

      setIsLoadingPersistedWallet(true);
      setAppError(null);
      try {
        // Determine WalletType and ChainType based on wagmi connection
        const walletType = getWalletTypeFromConnectorId(
          wagmiWallet.connectorId
        );
        const chainType = getChainTypeFromChainId(wagmiWallet.chainId);

        const dbWallet = await walletService.saveOrUpdateWallet(
          appUserId,
          wagmiWallet.address,
          wagmiWallet.chainId,
          walletType,
          chainType
        );
        setPersistedWallet(dbWallet);
        // Optionally fetch all wallets for the user now
        const allUserWallets =
          await walletService.getUserPersistedWallets(appUserId);
        setPersistedWallets(allUserWallets);
      } catch (e: any) {
        console.error("Error syncing wallet with DB:", e);
        setAppError(e instanceof Error ? e : new Error(String(e.message || e)));
        setPersistedWallet(null); // Clear if sync fails
      } finally {
        setIsLoadingPersistedWallet(false);
      }
    },
    [
      walletService,
      appUserId,
      getWalletTypeFromConnectorId,
      getChainTypeFromChainId,
    ]
  );

  // Effect to react to wagmi connection changes
  useEffect(() => {
    if (isConnected && address && chain) {
      syncWalletWithDb({
        address,
        chainId: chain.id,
        connectorId: connector?.id,
      });
    } else {
      // Wagmi disconnected or address/chain not available
      clearPersistedWalletState();
    }
  }, [
    isConnected,
    address,
    chain,
    connector?.id,
    syncWalletWithDb,
    clearPersistedWalletState,
  ]); // Added connector for connectorId

  const fetchUserPersistedWallets = useCallback(
    async (userIdToFetch: string): Promise<CoreWallet[]> => {
      if (!walletService) {
        setAppError(new Error("WalletService not available."));
        return [];
      }
      setIsLoadingPersistedWallet(true);
      try {
        const wallets =
          await walletService.getUserPersistedWallets(userIdToFetch);
        setPersistedWallets(wallets);
        // If the current appUserId matches, and a primary/current persistedWallet isn't set, set it from this list?
        // Or this is purely to populate the list.
        return wallets;
      } catch (e: any) {
        setAppError(e instanceof Error ? e : new Error(String(e.message || e)));
        return [];
      } finally {
        setIsLoadingPersistedWallet(false);
      }
    },
    [walletService]
  );

  const contextValue = useMemo<WalletContextState>(
    () => ({
      walletService,
      persistedWallet,
      persistedWallets,
      isLoadingPersistedWallet,
      appError,
      syncWalletWithDb,
      clearPersistedWallet: clearPersistedWalletState,
      fetchUserPersistedWallets,
      userId: appUserId,
      setAppUserId: (id: string) => {
        if (initialUserId) {
          console.warn(
            "ZyraWalletProvider: initialUserId was provided, setAppUserId call might be overridden or unexpected."
          );
        }
        setAppUserId(id);
      },
    }),
    [
      walletService,
      persistedWallet,
      persistedWallets,
      isLoadingPersistedWallet,
      appError,
      syncWalletWithDb,
      clearPersistedWalletState,
      fetchUserPersistedWallets,
      appUserId,
      initialUserId,
    ]
  );

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
};
