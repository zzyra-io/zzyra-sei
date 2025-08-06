"use client";

import { QueryClientProvider } from "@tanstack/react-query";
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
          theme='soft'>
          {children}
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
