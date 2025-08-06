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
  const { theme } = useTheme();

  // Use Dynamic environment ID instead of Magic API key
  const dynamicEnvironmentId =
    process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID ||
    "4610f76b-ca5b-4e06-b048-d70f669055c2";

  return (
    <WagmiProvider
      config={createWagmiConfig(dynamicEnvironmentId, theme === "dark")}>
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
