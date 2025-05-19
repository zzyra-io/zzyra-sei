"use client";

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
  useContext,
} from "react";
import { useAccount, useConfig, WagmiProvider } from "wagmi";

import { WalletContext } from "../contexts/WalletContext";
import { WalletService } from "../services/wallet.service";
import {
  Wallet as CoreWallet,
  WalletType,
  ChainType,
  MagicInstance,
  WalletContextState,
} from "../core/types";
import { QueryClient } from "@tanstack/react-query";
import { Magic } from "magic-sdk";
import { OAuthExtension } from "@magic-ext/oauth2";
import { getChainId, getNetworkUrl } from "../utils";

interface WalletProviderProps extends PropsWithChildren {
  wagmiConfig: any;
  queryClient: QueryClient;
  initialUserId?: string; // For explicitly setting user ID, overrides external auth
  externalUserId?: string | null; // User ID from an external auth system
  isExternalAuthLoading?: boolean;
  connectionUI?: React.ReactNode;
}

export const WalletProvider = ({
  children,
  wagmiConfig,
  // queryClient, // No longer needed as prop if QCP is ancestor
  initialUserId,
  externalUserId,
  isExternalAuthLoading,
}: WalletProviderProps) => {
  // If wagmiConfig is not yet available (e.g., during initial render from ZyraProviders),
  // render WalletProviderLocal directly without WagmiProvider.
  // WalletProviderLocal and its children (like useMagicAuth) should still function
  // as QueryClientProvider is now an ancestor from ZyraProviders.
  // Hooks from wagmi itself might not work until wagmiConfig is ready.
  if (!wagmiConfig) {
    return (
      <WalletProviderLocal
        initialUserId={initialUserId}
        externalUserId={externalUserId}
        isExternalAuthLoading={isExternalAuthLoading}>
        {children}
      </WalletProviderLocal>
    );
  }

  return (
    <WagmiProvider config={wagmiConfig}>
      <WalletProviderLocal
        initialUserId={initialUserId}
        externalUserId={externalUserId}
        isExternalAuthLoading={isExternalAuthLoading}>
        {children}
      </WalletProviderLocal>
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
  const [magicInstance, setMagicInstance] = useState<MagicInstance | null>(
    null
  );

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY && !magicInstance) {
      const instance = new Magic(
        process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY as string,
        {
          network: {
            rpcUrl: getNetworkUrl(),
            chainId: getChainId(),
          },
          extensions: [new OAuthExtension()],
        }
      );
      console.log("Magic instance created:", instance);

      setMagicInstance(instance as MagicInstance);
    }
  }, [magicInstance]);

  useEffect(() => {
    appUserIdRef.current = appUserId;
  }, [appUserId]);

  useEffect(() => {
    const service = new WalletService();
    setWalletService(service);
  }, []);

  useEffect(() => {
    if (initialUserId) {
      if (appUserIdRef.current !== initialUserId) {
        setAppUserId(initialUserId);
      }
      return; // initialUserId takes precedence
    }

    // If no initialUserId, use externalUserId
    if (!isExternalAuthLoading) {
      if (externalUserId) {
        if (appUserIdRef.current !== externalUserId) {
          setAppUserId(externalUserId);
        }
      } else {
        // External user logged out or ID not available, and no initialUserId provided
        if (appUserIdRef.current !== undefined) {
          setAppUserId(undefined);
        }
      }
    }
  }, [initialUserId, externalUserId, isExternalAuthLoading]);

  const accountData = useAccount();

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
        const allUserWallets = await walletService.getUserPersistedWallets(
          appUserId
        );
        setPersistedWallets(allUserWallets);
      } catch (e: any) {
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
      syncWalletWithDb({
        address,
        chainId: memoizedChainId,
        connectorId: memoizedConnectorId,
      });
    } else {
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
        const wallets = await walletService.getUserPersistedWallets(
          userIdToFetch
        );
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
      magicInstance,
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
      magicInstance,
    ]
  );

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWalletContext = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWalletContext must be used within a WalletProvider");
  }
  return context as WalletContextState;
};
