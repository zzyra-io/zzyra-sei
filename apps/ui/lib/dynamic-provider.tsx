"use client";

import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { ZeroDevSmartWalletConnectors } from "@dynamic-labs/ethereum-aa";
import {
  DynamicContextProvider,
  DynamicWidget,
} from "@dynamic-labs/sdk-react-core";
import { DynamicWagmiConnector } from "@dynamic-labs/wagmi-connector";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { http } from "viem";
import { mainnet, sepolia } from "viem/chains";
import { WagmiProvider, createConfig } from "wagmi";

// Wagmi configuration with commonly used chains for faster initialization
const wagmiConfig = createConfig({
  chains: [mainnet, sepolia],
  multiInjectedProviderDiscovery: false,
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000,
      retry: 3,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

interface DynamicProviderProps {
  children: ReactNode;
}

/**
 * Clean Dynamic wallet provider following the recommended pattern
 * Enables account abstraction with smart wallet features
 */
export function DynamicProvider({ children }: DynamicProviderProps) {
  const environmentId =
    process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID ||
    "4610f76b-ca5b-4e06-b048-d70f669055c2";

  return (
    <QueryClientProvider client={queryClient}>
      <DynamicContextProvider
        settings={{
          environmentId,
          walletConnectors: [
            EthereumWalletConnectors,
            ZeroDevSmartWalletConnectors,
          ],
          detectNewWalletsForLinking: true,
        }}>
        <WagmiProvider config={wagmiConfig}>
          <DynamicWagmiConnector>{children}</DynamicWagmiConnector>
        </WagmiProvider>
      </DynamicContextProvider>
    </QueryClientProvider>
  );
}

/**
 * Simple Dynamic widget component
 */
export function DynamicLoginWidget() {
  return <DynamicWidget />;
}

export default DynamicProvider;
