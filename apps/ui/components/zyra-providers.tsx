"use client";

import { WalletProvider, createWagmiConfig, queryClient } from "@zyra/wallet";
import { QueryClientProvider } from "@tanstack/react-query";
import { PropsWithChildren, useEffect, useMemo, useState } from "react";
import type { MagicUserMetadata } from "magic-sdk";
import { useTheme } from "next-themes";
// Use any for Magic type due to compatibility issues with the Magic SDK types
// The Magic SDK types don't perfectly match the runtime objects

type ZyraProvidersProps = PropsWithChildren;

/**
 * Type definitions for the ZyraProviders component
 */
type WagmiConfigType = ReturnType<typeof createWagmiConfig>;

/**
 * Single shared queryClient instance to prevent duplication
 * We import this from @zyra/wallet to ensure we don't create multiple instances
 */

// This wrapper ensures we only render the web3 providers on the client
export function ZyraProviders({ children }: ZyraProvidersProps) {
  const [mounted, setMounted] = useState(false);
  const magicApiKey = process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY;
  const { systemTheme } = useTheme();
  const prefersDarkMode = systemTheme === "dark";
  const [wagmiConfig, setWagmiConfig] = useState<WagmiConfigType | null>(null);

  // Avoid using auth store during SSR or initial render
  const [authState] = useState<{
    user: MagicUserMetadata | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    initialized: boolean; // Track if we've successfully initialized auth
  }>({
    user: null,
    isLoading: false, // Default to not loading to avoid flickering
    isAuthenticated: false, // Default to not authenticated on SSR
    initialized: true, // Initialize as true since we're not using auth state management here
  });

  // externalUserId is now a string or null, derived directly from user.issuer
  const externalUserId = useMemo(
    () => authState.user?.issuer ?? null,
    [authState.user?.issuer]
  );

  useEffect(() => {
    setMounted(true); // Set mounted after first render on client

    if (magicApiKey) {
      try {
        const config = createWagmiConfig(magicApiKey, prefersDarkMode);
        setWagmiConfig(config);
      } catch (error) {
        console.error("Error initializing Wagmi config:", error);
      }
    } else {
      console.warn(
        "NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY is not set. Wallet functionality may be limited."
      );
    }
  }, [magicApiKey, prefersDarkMode]); // Dependencies for wagmiConfig initialization

  // If not mounted, render a minimal tree with QueryClientProvider to avoid content flash
  // or errors before client-side effects run and wagmiConfig is ready.
  if (!mounted) {
    return (
      <QueryClientProvider client={queryClient}>
        {null} {/* Or a global loading spinner if appropriate */}
      </QueryClientProvider>
    );
  }

  // Now mounted. Render WalletProvider, passing wagmiConfig (which might still be null initially).
  // WalletProvider will need to handle the null wagmiConfig case gracefully.
  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider
        wagmiConfig={wagmiConfig} // This can be null initially
        // queryClient prop for WalletProvider is kept for now, can be removed if WalletProvider no longer uses it directly
        queryClient={queryClient} 
        externalUserId={externalUserId}
        isExternalAuthLoading={authState.isLoading}>
        {children}
      </WalletProvider>
    </QueryClientProvider>
  );

}
