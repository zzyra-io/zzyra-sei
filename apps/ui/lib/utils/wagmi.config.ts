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

// Create wagmi config with standard connectors (Dynamic handles wallet connections)
export function createWagmiConfig(
  environmentId: string | undefined,
  isDarkMode = false
): Config {
  const chains = supportedNetworks;
  console.log("Wagmi config - chains:", chains);
  console.log("Wagmi config - Dynamic environment:", environmentId);
  
  // Use standard connectors since Dynamic handles wallet connections through its own provider
  const activeConnectors = [];

  // Add injected connector for standard wallet connections
  // activeConnectors.push(injected());

  const transports = Object.fromEntries(
    chains.map((chain) => [chain.id, http()])
  );

  return createConfig(
    getDefaultConfig({
      appName: "Zyra",
      walletConnectProjectId: "",
      syncConnectedChain: true,
      chains,
      transports,
      connectors: activeConnectors,
    })
  );
}
