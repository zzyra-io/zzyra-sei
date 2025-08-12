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
import { ReactNode, Component } from "react";
import { http } from "viem";
import { WagmiProvider, createConfig } from "wagmi";
import { baseSepolia } from "viem/chains";
import { PermissionlessProvider } from "@permissionless/wagmi";

// Error boundary for Dynamic Labs
class DynamicErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    console.error("Dynamic Labs Error:", error);
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className='p-4 border border-red-200 rounded-lg bg-red-50'>
          <h3 className='text-lg font-semibold text-red-800 mb-2'>
            Wallet Connection Error
          </h3>
          <p className='text-red-600 mb-2'>
            There was an issue initializing the wallet connection.
          </p>
          <details className='text-sm text-red-500'>
            <summary>Error Details</summary>
            <pre className='mt-2 whitespace-pre-wrap'>
              {this.state.error?.message}
            </pre>
          </details>
          <button
            onClick={() => this.setState({ hasError: false })}
            className='mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700'>
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// SEI Testnet Configuration (viem format)
const seiTestnet = {
  id: 1328,
  name: "SEI Testnet",
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
  testnet: true,
} as const;

// Multi-chain Wagmi configuration
const wagmiConfig = createConfig({
  chains: [baseSepolia, seiTestnet],
  multiInjectedProviderDiscovery: false,
  transports: {
    [baseSepolia.id]: http(),
    [seiTestnet.id]: http(),
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

  if (!environmentId) {
    console.error("Dynamic Labs: Missing NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID");
    return <div>Dynamic Labs configuration error</div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <IsBrowser>
        <DynamicErrorBoundary>
          <DynamicContextProvider
            settings={{
              environmentId,
              walletConnectors: [
                EthereumWalletConnectors,
                // ZeroDevSmartWalletConnectors,
              ],
              // Enable passkey authentication for embedded wallets
              // Add custom chains for Dynamic to recognize
              overrides: {
                evmNetworks: [
                  // SEI Testnet (Base Sepolia is already known by Dynamic)
                  {
                    blockExplorerUrls: ["https://seitrace.com"],
                    chainId: seiTestnet.id,
                    chainName: seiTestnet.name,
                    iconUrls: [],
                    name: seiTestnet.name,
                    nativeCurrency: seiTestnet.nativeCurrency,
                    networkId: seiTestnet.id,
                    rpcUrls: ["https://evm-rpc.sei-apis.com"],
                    vanityName: "SEI Testnet",
                  },
                ],
              },
              // Remove event handlers to prevent setState during render issues
            }}>
            <WagmiProvider config={wagmiConfig}>
              <PermissionlessProvider
                capabilities={{
                  smartWallet: {
                    create: true,
                    delegate: true,
                  },
                }}>
                <DynamicWagmiConnector>{children}</DynamicWagmiConnector>
              </PermissionlessProvider>
            </WagmiProvider>
          </DynamicContextProvider>
        </DynamicErrorBoundary>
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
