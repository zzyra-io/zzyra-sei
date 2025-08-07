"use client";

import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { ZeroDevSmartWalletConnectors } from "@dynamic-labs/ethereum-aa";
import {
  DynamicContextProvider,
  DynamicWidget,
  IsBrowser,
} from "@dynamic-labs/sdk-react-core";
import { DynamicWagmiConnector } from "@dynamic-labs/wagmi-connector";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { http } from "viem";
import { WagmiProvider, createConfig } from "wagmi";

// SEI Network Configuration (EVM-compatible Layer 1)
const seiNetwork = {
  id: 1329, // SEI Pacific-1 mainnet chain ID
  name: "Sei Network",
  nativeCurrency: {
    decimals: 18,
    name: "SEI",
    symbol: "SEI",
  },
  rpcUrls: {
    default: {
      http: ["https://evm-rpc.sei-apis.com"],
    },
  },
  blockExplorers: {
    default: { name: "Seitrace", url: "https://seitrace.com" },
  },
} as const;

// Wagmi configuration for SEI Network
const wagmiConfig = createConfig({
  chains: [seiNetwork],
  transports: {
    [seiNetwork.id]: http(),
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
 * Uses IsBrowser to prevent hydration mismatches
 */
export function DynamicProvider({ children }: DynamicProviderProps) {
  const environmentId =
    process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID ||
    "4610f76b-ca5b-4e06-b048-d70f669055c2";

  return (
    <QueryClientProvider client={queryClient}>
      <IsBrowser>
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
      </IsBrowser>
    </QueryClientProvider>
  );
}

/**
 * Simple Dynamic widget component
 */
export function DynamicLoginWidget() {
  return (
    <IsBrowser>
      <DynamicWidget />
    </IsBrowser>
  );
}

export default DynamicProvider;
