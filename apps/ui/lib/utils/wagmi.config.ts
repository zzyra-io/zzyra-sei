import { dedicatedWalletConnector } from "@magiclabs/wagmi-connector";
import { QueryClient } from "@tanstack/react-query";
import { getDefaultConfig } from "connectkit";
import { http } from "viem";
import { type Config, createConfig } from "wagmi";
import {
  getActiveNetworkConfigs,
  getChainId,
  getNetworkUrl,
  supportedNetworks,
} from "./network";

// Create a new query client for React Query
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 60 * 1000, // 1 hour
    },
    mutations: {
      onError(error) {
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
  const chains = supportedNetworks;
  console.log("Wagmi config - chains:", chains);
  console.log("Wagmi config - seiTestnet:", chains[0]);
  const activeConnectors = [];

  // Add Magic connector only if API key is provided
  if (typeof window !== "undefined" && apiKey && apiKey.trim() !== "") {
    activeConnectors.push(
      dedicatedWalletConnector({
        chains,
        options: {
          apiKey,
          isDarkMode,
          networks: getActiveNetworkConfigs(),
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
  // activeConnectors.push(injected());

  const transports = Object.fromEntries(
    chains.map((chain) => [chain.id, http()])
  );

  return createConfig(
    getDefaultConfig({
      appName: "Zzyra",
      walletConnectProjectId: "",
      syncConnectedChain: true,
      chains,
      transports,
      connectors: activeConnectors,
    })
  );
}
