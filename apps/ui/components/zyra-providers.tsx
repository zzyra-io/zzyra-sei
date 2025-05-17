"use client";

import { MagicAuthProvider, useMagicAuth } from "@/hooks/useMagicAuth";
import { QueryClientProvider } from "@tanstack/react-query";
import { WalletProvider, createWagmiConfig, queryClient } from "@zyra/wallet";
// import { ConnectKitProvider } from "connectkit"; // ConnectKitProvider not used in this snippet
import { useEffect, useState, useMemo, PropsWithChildren } from "react";
// import { WagmiProvider } from "wagmi"; // WagmiProvider is used within WalletProvider from @zyra/wallet

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
  // Track if we're in the browser
  const [mounted, setMounted] = useState(false);
  const magicApiKey = process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY;
  const prefersDarkMode = false;
  const [wagmiConfig, setWagmiConfig] = useState<WagmiConfigType | null>(null);
  const { user, isLoading: isAuthLoading } = useMagicAuth();

  // externalUserId is now a string or null, derived directly from user.issuer
  const externalUserId = useMemo(() => user?.issuer ?? null, [user?.issuer]);

  // Initialize config only once on client-side
  useEffect(() => {
    if (mounted && !wagmiConfig && magicApiKey) {
      // Ensure magicApiKey is present
      const config = createWagmiConfig(magicApiKey, prefersDarkMode);
      setWagmiConfig(config);
    }
  }, [mounted, wagmiConfig, magicApiKey, prefersDarkMode]);

  // Only run on client-side
  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR, just render children without any providers
  if (!mounted || !wagmiConfig) {
    return <>{children}</>;
  }

  // On client-side, use the ClientOnlyProviders
  return (
    <WalletProvider
      wagmiConfig={wagmiConfig}
      queryClient={queryClient}
      // initialUserId is not passed, so WalletProviderLocal will rely on externalUserId
      externalUserId={externalUserId} // Pass the string ID
      isExternalAuthLoading={isAuthLoading}>
      <MagicAuthProvider>{children}</MagicAuthProvider>
    </WalletProvider>
  );
}
