import { http } from "viem";
import { type Config, createConfig } from "wagmi";
import { baseSepolia, mainnet, polygonAmoy } from "wagmi/chains";
import { QueryClient } from "@tanstack/react-query";
import { dedicatedWalletConnector } from "@magiclabs/wagmi-connector";
import { injected } from "wagmi/connectors";
import { getChainId, getNetworkUrl } from "./network";
import { getDefaultConfig } from "connectkit";

// Create a new query client for React Query
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 60 * 1000, // 1 hour
    },
    mutations: {
      onError(error, variables, context) {
        console.error("Mutation error:", error);
      },
    },
    dehydrate: {
      shouldDehydrateQuery: () => true,
    },
    hydrate: {
      deserializeData(data) {
        return data;
      },
    },
  },
});

// Create wagmi config with Magic connector
export function createWagmiConfig(
  apiKey: string | undefined,
  isDarkMode = false
): Config {
  const chains = [mainnet, polygonAmoy, baseSepolia] as const;

  const activeConnectors = [];

  // Add Magic connector only if API key is provided
  if (typeof window !== "undefined" && apiKey && apiKey.trim() !== "") {
    activeConnectors.push(
      dedicatedWalletConnector({
        chains,
        options: {
          apiKey,
          isDarkMode,
          magicSdkConfiguration: {
            network: {
              rpcUrl: getNetworkUrl(),
              chainId: getChainId(),
            },
          },
        },
      })
    );
  }

  // Always add injected connector
  activeConnectors.push(injected());

  return createConfig(
    getDefaultConfig({
      appName: "Zzyra",
      walletConnectProjectId: "",
      syncConnectedChain: true,
      chains,
      transports: {
        [mainnet.id]: http(),
        [polygonAmoy.id]: http(),
        [baseSepolia.id]: http(),
      },
      connectors: activeConnectors, // use the conditionally populated list
    })
  );
}
