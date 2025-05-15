"use client";

import { ReactNode } from "react";
import { createConfig } from "wagmi";
import { mainnet, polygon, optimism, arbitrum } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { http } from "viem";
import { dedicatedWalletConnector } from "@magiclabs/wagmi-connector";

const config = createConfig({
  chains: [mainnet, polygon, optimism, arbitrum],
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [optimism.id]: http(),
    [arbitrum.id]: http(),
  },
  connectors: [
    dedicatedWalletConnector({
      /* If using OAuth, make sure to enable OAuth options from magic dashboard */

      chains: [mainnet, polygon, optimism, arbitrum],
      options: {
        apiKey: process.env.NEXT_PUBLIC_MAGIC_API_KEY || "",
      },
    }),
  ],
});

const queryClient = new QueryClient();

export function WagmiConfigProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
