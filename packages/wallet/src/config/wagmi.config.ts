import { http } from "viem";
import { type Config, createConfig } from "wagmi";
import { baseSepolia, mainnet, polygonAmoy } from "wagmi/chains";
import { QueryClient } from "@tanstack/react-query";
import { dedicatedWalletConnector } from "@magiclabs/wagmi-connector";
import { injected } from "wagmi/connectors";

// Create a new query client for React Query
export const queryClient = new QueryClient();

// Create wagmi config with Magic connector
export function createWagmiConfig(
  apiKey: string | undefined,
  isDarkMode = false
): Config {
  const chains = [mainnet, polygonAmoy, baseSepolia] as const;

  const activeConnectors = [];

  // Add Magic connector only if API key is provided
  if (apiKey && apiKey.trim() !== "") {
    activeConnectors.push(
      dedicatedWalletConnector({
        chains,
        options: {
          apiKey,
          isDarkMode,
          magicSdkConfiguration: {
            network: {
              rpcUrl: mainnet.rpcUrls.default.http[0],
              chainId: mainnet.id,
            },
          },
        },
      })
    );
  }

  // Always add injected connector
  activeConnectors.push(injected());

  return createConfig({
    chains,
    transports: {
      [mainnet.id]: http(),
      [polygonAmoy.id]: http(),
      [baseSepolia.id]: http(),
    },
    connectors: activeConnectors, // use the conditionally populated list
  });
}
