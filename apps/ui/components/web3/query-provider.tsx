"use client";

import type { FC, PropsWithChildren } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { createWagmiConfig, queryClient } from "@zyra/wallet";
import { ConnectKitProvider } from "connectkit";

// Create a basic config without Magic for non-auth pages
const config = createWagmiConfig(undefined, false);

const QueryProvider: FC<PropsWithChildren> = ({ children }) => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider>{children}</ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default QueryProvider;
