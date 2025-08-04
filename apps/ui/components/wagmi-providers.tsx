"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PropsWithChildren } from "react";
import { useTheme } from "next-themes";
import { WagmiProvider } from "wagmi";
import { createWagmiConfig, queryClient } from "@/lib/utils/wagmi.config";
import { ConnectKitProvider } from "connectkit";

type ZyraProvidersProps = PropsWithChildren;

/**
 * Type definitions for the ZyraProviders component
 */

/**
 * Single shared queryClient instance to prevent duplication
 * We import this from @zyra/wallet to ensure we don't create multiple instances
 */

// This wrapper ensures we only render the web3 providers on the client
export function WagmiProviders({ children }: ZyraProvidersProps) {
  const magicApiKey = process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY;
  const { theme } = useTheme();

  // Now mounted. Render WalletProvider, passing wagmiConfig (which might still be null initially).
  // WalletProvider will need to handle the null wagmiConfig case gracefully.
  return (
    <WagmiProvider config={createWagmiConfig(magicApiKey, theme === "dark")}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider
          mode={theme === "dark" ? "dark" : "light"}
          theme='soft'
          customChains={[
            {
              id: 1328,
              name: "Sei Testnet",
              network: "sei-testnet",
              nativeCurrency: {
                name: "SEI",
                symbol: "SEI",
                decimals: 18,
              },
              rpcUrls: {
                default: {
                  http: ["https://evm-rpc-testnet.sei-apis.com"],
                },
                public: {
                  http: ["https://evm-rpc-testnet.sei-apis.com"],
                },
              },
              blockExplorers: {
                default: {
                  name: "Sei Testnet Explorer",
                  url: "https://testnet.seistream.app",
                },
              },
            },
          ]}>
          {children}
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
