"use client"; // This must be a Client Component

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"; // Added for wagmi v2

// Your application's primary authentication (e.g., Magic + Supabase now, Prisma-backed later)
// Adjust this import path based on your actual file structure in apps/ui
import { MagicAuthProvider, useMagicAuth } from "@/hooks/useMagicAuth";

// Wagmi imports
import { WagmiProvider, createConfig, http } from "wagmi"; // Updated for v2
import { mainnet, goerli } from "wagmi/chains"; // Add all chains you support
// publicProvider is removed in v2, use http transport instead
import { DedicatedWalletConnector } from "@magiclabs/wagmi-connector";

// Imports from your @zyra/wallet package
// Ensure your build system resolves "@zyra/wallet" correctly (e.g. via pnpm workspace, or published package)
import { WalletProvider as ZyraWalletProvider } from "@zyra/wallet";

// --- Wagmi Configuration ---
// Define chains (no longer using configureChains)
const chains = [mainnet, goerli] as const; // Use 'as const' for better type inference with wagmi v2

const wagmiConfigInstance = createConfig({
  chains: chains, // Pass chains array directly
  connectors: [
    new DedicatedWalletConnector({
      chains, // Pass the same chains array to the connector
      options: {
        apiKey: process.env.NEXT_PUBLIC_MAGIC_API_KEY!,
        // Ensure NEXT_PUBLIC_MAGIC_API_KEY is defined in your .env files for apps/ui
        // Example of other Magic SDK options:
        // magicSdkConfiguration: {
        //   network: { rpcUrl: 'YOUR_RPC_URL', chainId: YOUR_CHAIN_ID } // Example for specific RPC
        // },
        // oauthOptions: { providers: ['google', 'github'], callbackUrl: '/callback' },
      },
    }),
    // Add other connectors like MetaMask, WalletConnect if needed:
    // import { injected } from 'wagmi/connectors';
    // injected(), // for MetaMask
  ],
  transports: {
    // Define http transport for each chain
    [mainnet.id]: http(), // Uses default public RPC for mainnet
    [goerli.id]: http(), // Uses default public RPC for goerli
    // Example with specific RPC URL:
    // [mainnet.id]: http(process.env.NEXT_PUBLIC_MAINNET_RPC_URL || undefined),
    // [goerli.id]: http(process.env.NEXT_PUBLIC_GOERLI_RPC_URL || undefined),
  },
  // ssr: true, // Add if using SSR/SSG, helps with hydration
  // autoConnect is not a direct parameter for createConfig in wagmi/react v2.
  // Reconnection is often handled by WagmiProvider's reconnectOnMount (true by default)
  // or by using the useReconnect hook.
});

// Create a QueryClient instance for @tanstack/react-query
const queryClient = new QueryClient();

// --- Component to Bridge App Auth with Zyra's WalletProvider ---
// This component will consume useMagicAuth and pass necessary props to ZyraWalletProvider
function AppSpecificWalletSetup({ children }: { children: React.ReactNode }) {
  // Assuming useMagicAuth() provides the primary authenticated user state for your application
  const { user: appUserFromMagicAuth, isLoading: isAppAuthLoading } =
    useMagicAuth();

  return (
    <ZyraWalletProvider
      externalUser={appUserFromMagicAuth}
      isExternalAuthLoading={isAppAuthLoading}>
      {children}
    </ZyraWalletProvider>
  );
}

// --- The Root Providers Component ---
// This is the component you'll import and use in your app's main layout.
export function AppRootProviders({ children }: { children: React.ReactNode }) {
  return (
    <MagicAuthProvider>
      {" "}
      {/* 1. Your app's primary auth (Magic+Supabase currently) */}
      <WagmiProvider config={wagmiConfigInstance}>
        {" "}
        {/* 2. Wagmi for blockchain interaction, changed from WagmiConfig */}
        <QueryClientProvider client={queryClient}>
          {" "}
          {/* Added for wagmi v2 */}
          <AppSpecificWalletSetup>
            {" "}
            {/* 3. Your @zyra/wallet package, aware of app user */}
            {children}
          </AppSpecificWalletSetup>
        </QueryClientProvider>
      </WagmiProvider>
    </MagicAuthProvider>
  );
}
