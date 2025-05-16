"use client";

import { useMagicAuth } from "@/hooks/useMagicAuth";
import { QueryClientProvider } from "@tanstack/react-query";
import { WalletProvider, createWagmiConfig, queryClient } from "@zyra/wallet";
import { ConnectKitProvider } from "connectkit";
import { ReactNode, useEffect, useState, useMemo } from "react";
import { WagmiProvider } from "wagmi";

type ZyraProvidersProps = {
  children: ReactNode;
};

/**
 * Type definitions for the ZyraProviders component
 */
type WagmiConfigType = ReturnType<typeof createWagmiConfig>;

/**
 * Single shared queryClient instance to prevent duplication
 * We import this from @zyra/wallet to ensure we don't create multiple instances
 */

/**
 * Client component for ZyraProviders that wraps the application with all necessary providers:
 * - WagmiProvider for Web3 connections
 * - QueryClientProvider for data fetching
 * - ConnectKitProvider for wallet connections UI
 * - WalletProvider for Zyra-specific wallet functionality
 */
// Create a client-only component to strictly ensure no server-side rendering of web3 components
function ClientOnlyProviders({ children }: ZyraProvidersProps) {
  // Store the Magic API key
  const magicApiKey = process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY;
  // Store the theme preference
  const prefersDarkMode = false; // This could be made dynamic based on theme context
  // Store the Wagmi config
  const [wagmiConfig, setWagmiConfig] = useState<WagmiConfigType | null>(null);
  // Get auth state from Magic
  const { user, isLoading: isAuthLoading } = useMagicAuth();
  
  // Memoize the externalUser to avoid dependency array issues
  const externalUser = useMemo(() => {
    return user?.issuer ? { id: user.issuer, ...user } : null;
  }, [user]);

  // Initialize when component mounts (client-side only)
  useEffect(() => {    
    try {
      console.log("ClientOnlyProviders mounted");
      console.log("Magic API key available:", !!magicApiKey);
      console.log("External user available:", !!externalUser);
      
      // Create configuration with proper API key
      if (magicApiKey) {
        const config = createWagmiConfig(magicApiKey, prefersDarkMode);
        console.log("✅ WAGMI config created with Magic integration");
        setWagmiConfig(config);
      } else {
        console.warn("⚠️ Magic API key is missing - wallet functionality will be limited");
        const config = createWagmiConfig(undefined, prefersDarkMode);
        setWagmiConfig(config);
      }
    } catch (error) {
      console.error("Error creating Wagmi config:", error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount

  // Don't render anything until Wagmi config is ready
  if (!wagmiConfig) {
    console.log("Waiting for Wagmi config initialization...");
    return <>{children}</>;
  }

  // All web3 providers with proper configuration
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider>
          <WalletProvider
            externalUser={externalUser}
            isExternalAuthLoading={isAuthLoading}
          >
            {children}
          </WalletProvider>
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

// This wrapper ensures we only render the web3 providers on the client
export function ZyraProviders({ children }: ZyraProvidersProps) {
  // Track if we're in the browser
  const [mounted, setMounted] = useState(false);

  // Only run on client-side
  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR, just render children without any providers
  if (!mounted) {
    return <>{children}</>;
  }

  // On client-side, use the ClientOnlyProviders
  return <ClientOnlyProviders>{children}</ClientOnlyProviders>;
}
