"use client";

import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { ZeroDevSmartWalletConnectorsWithConfig } from "@dynamic-labs/ethereum-aa";
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

  const zerodevProjectId =
    process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID ||
    "8e6f4057-e935-485f-9b6d-f14696e92654";

  // ZeroDev configuration for SEI Network (Chain ID 1328)
  const bundlerRpc =
    process.env.NEXT_PUBLIC_ZERODEV_BUNDLER_RPC ||
    `https://rpc.zerodev.app/api/v2/bundler/${zerodevProjectId}`;

  const paymasterRpc =
    process.env.NEXT_PUBLIC_ZERODEV_PAYMASTER_RPC ||
    `https://rpc.zerodev.app/api/v2/paymaster/${zerodevProjectId}`;

  return (
    <QueryClientProvider client={queryClient}>
      <IsBrowser>
        <DynamicContextProvider
          settings={{
            environmentId,
            walletConnectors: [
              EthereumWalletConnectors,
              ZeroDevSmartWalletConnectorsWithConfig({
                bundlerRpc,
                paymasterRpc,
              }),
            ],
            detectNewWalletsForLinking: true,
            // Event handlers for authentication lifecycle
            events: {
              onAuthSuccess: () => {
                console.log("Dynamic: Authentication successful");
              },
              onAuthFailure: () => {
                console.log("Dynamic: Authentication failed");
              },
            },
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
