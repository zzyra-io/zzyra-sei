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
  useRef,
} from "react";
import { useAccount, useConfig, WagmiProvider } from "wagmi";

import { WalletContext } from "../contexts/WalletContext";
import { WalletService } from "../services/wallet.service";
import {
  Wallet as CoreWallet,
  WalletType,
  ChainType,
  WalletContextState,
} from "../core/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

interface WalletProviderProps extends PropsWithChildren {
  wagmiConfig: any;
  queryClient: QueryClient;
  initialUserId?: string; // For explicitly setting user ID, overrides external auth
  externalUserId?: string | null; // User ID from an external auth system
  isExternalAuthLoading?: boolean;
}

export const WalletProvider = ({
  children,
  wagmiConfig,
  queryClient,
  initialUserId,
  externalUserId,
  isExternalAuthLoading,
}: WalletProviderProps) => {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <WalletProviderLocal
          initialUserId={initialUserId}
          externalUserId={externalUserId}
          isExternalAuthLoading={isExternalAuthLoading}>
          {children}
        </WalletProviderLocal>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

interface WalletProviderLocalProps extends PropsWithChildren {
  initialUserId?: string;
  externalUserId?: string | null;
  isExternalAuthLoading?: boolean;
}

export const WalletProviderLocal: React.FC<WalletProviderLocalProps> = ({
  children,
  initialUserId,
  externalUserId,
  isExternalAuthLoading,
}) => {
  console.log("WalletProviderLocal props:", {
    initialUserId,
    externalUserId,
    isExternalAuthLoading,
  });
  useConfig(); // Ensure config is available, used by useAccount

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
  const appUserIdRef = useRef(appUserId);

  useEffect(() => {
    appUserIdRef.current = appUserId;
  }, [appUserId]);

  useEffect(() => {
    console.log(
      "WalletProviderLocal mounted. Initial appUserId state:",
      initialUserId
    );
  }, [initialUserId]);

  useEffect(() => {
    const service = new WalletService();
    setWalletService(service);
  }, []);

  useEffect(() => {
    if (initialUserId) {
      if (appUserIdRef.current !== initialUserId) {
        setAppUserId(initialUserId);
        console.log("AppUserId set from initialUserId prop:", initialUserId);
      }
      return; // initialUserId takes precedence
    }

    // If no initialUserId, use externalUserId
    if (!isExternalAuthLoading) {
      if (externalUserId) {
        if (appUserIdRef.current !== externalUserId) {
          setAppUserId(externalUserId);
          console.log("AppUserId set from externalUserId:", externalUserId);
        }
      } else {
        // External user logged out or ID not available, and no initialUserId provided
        if (appUserIdRef.current !== undefined) {
          setAppUserId(undefined);
          console.log(
            "AppUserId cleared (no initialUserId, externalUserId is null/undefined)."
          );
        }
      }
    }
  }, [initialUserId, externalUserId, isExternalAuthLoading]);

  const accountData = useAccount();
  console.log("accountData from useAccount:", accountData);
  const { address, isConnected, chain, connector } = accountData;

  const memoizedConnectorId = useMemo(() => connector?.id, [connector?.id]);
  const memoizedChainId = useMemo(() => chain?.id, [chain?.id]);

  const getWalletTypeFromConnectorId = useCallback(
    (id?: string): WalletType => {
      if (!id) return WalletType.METAMASK;
      switch (id.toLowerCase()) {
        case "magic":
        case "magiclink":
          return WalletType.MAGIC;
        case "metamask":
        case "injected":
          return WalletType.METAMASK;
        case "walletconnect":
          return WalletType.WALLET_CONNECT;
        case "coinbasewallet":
          return WalletType.COINBASE;
        default:
          console.warn(`Unknown connector ID: ${id}`);
          return WalletType.METAMASK;
      }
    },
    []
  );

  const getChainTypeFromChainId = useCallback((id?: number): ChainType => {
    if (id === undefined) return ChainType.ETHEREUM;
    switch (id) {
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
      default:
        console.warn(`Unknown chain ID: ${id}`);
        return ChainType.ETHEREUM;
    }
  }, []);

  const clearPersistedWalletState = useCallback(() => {
    setPersistedWallet(null);
    setPersistedWallets([]);
    setAppError(null);
    console.log("Cleared persisted wallet state.");
  }, []);

  const syncWalletWithDb = useCallback(
    async (walletData: {
      address: string;
      chainId: number;
      connectorId?: string;
    }) => {
      if (!walletService) {
        setAppError(new Error("WalletService not ready."));
        return;
      }
      if (!appUserId) {
        setAppError(new Error("User ID not set for DB sync."));
        setPersistedWallet(null);
        return;
      }

      setIsLoadingPersistedWallet(true);
      setAppError(null);
      try {
        const walletType = getWalletTypeFromConnectorId(walletData.connectorId);
        const chainType = getChainTypeFromChainId(walletData.chainId);
        const dbWallet = await walletService.saveOrUpdateWallet(
          appUserId,
          walletData.address,
          walletData.chainId,
          walletType,
          chainType
        );
        setPersistedWallet(dbWallet);
        const allUserWallets =
          await walletService.getUserPersistedWallets(appUserId);
        setPersistedWallets(allUserWallets);
        console.log("Wallet synced with DB:", dbWallet);
      } catch (e: any) {
        console.error("Error syncing wallet with DB:", e);
        setAppError(e instanceof Error ? e : new Error(String(e.message || e)));
        setPersistedWallet(null);
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

  useEffect(() => {
    if (isConnected && address && memoizedChainId !== undefined) {
      console.log(
        "Attempting to sync wallet with DB due to connection change.",
        { address, memoizedChainId, memoizedConnectorId }
      );
      syncWalletWithDb({
        address,
        chainId: memoizedChainId,
        connectorId: memoizedConnectorId,
      });
    } else {
      console.log(
        "Clearing persisted wallet state due to disconnection or missing data."
      );
      clearPersistedWalletState();
    }
  }, [
    isConnected,
    address,
    memoizedChainId,
    memoizedConnectorId,
    syncWalletWithDb,
    clearPersistedWalletState,
  ]);

  const fetchUserPersistedWallets = useCallback(
    async (userIdToFetch: string): Promise<CoreWallet[]> => {
      if (!walletService) {
        setAppError(new Error("WalletService not available for fetch."));
        return [];
      }
      setIsLoadingPersistedWallet(true);
      try {
        const wallets =
          await walletService.getUserPersistedWallets(userIdToFetch);
        setPersistedWallets(wallets);
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

  const contextValue = useMemo(
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
        // Warn if initialUserId was set and context tries to override, though current flow doesn't set initialUserId from ZyraProviders
        if (initialUserId) {
          console.warn(
            "Context setAppUserId called when initialUserId was provided."
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
