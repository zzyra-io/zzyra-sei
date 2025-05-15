import { http } from "viem";
import { type Config, createConfig } from "wagmi";
import { mainnet } from "wagmi/chains";
import { QueryClient } from "@tanstack/react-query";
import { dedicatedWalletConnector } from "@magiclabs/wagmi-connector";

// Create a new query client for React Query
export const queryClient = new QueryClient();

// Create wagmi config with Magic connector
export function createWagmiConfig(apiKey: string, isDarkMode = false): Config {
  const chain = mainnet;
  const chains = [chain] as const;

  return createConfig({
    chains,
    transports: {
      [chain.id]: http(),
    },
    connectors: [
      dedicatedWalletConnector({
        chains,
        options: {
          apiKey,
          isDarkMode,
          magicSdkConfiguration: {
            network: {
              rpcUrl: chain.rpcUrls.default.http[0],
              chainId: chain.id,
            },
          },
        },
      }),
    ],
  });
}
