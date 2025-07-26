"use client";

import { useEffect } from "react";
import { useAccount, useConnect } from "wagmi";
import { useMagic } from "@/lib/magic-provider";
import useAuthStore from "@/lib/store/auth-store";

export function useAutoWalletConnect() {
  const { isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { magic, isAuthenticated } = useMagic();
  const { isAuthenticated: storeIsAuthenticated } = useAuthStore();

  useEffect(() => {
    console.log("Auto wallet connect hook state:", {
      isAuthenticated,
      storeIsAuthenticated,
      isConnected,
      magic: !!magic,
      connectorsCount: connectors.length,
    });

    // Only attempt auto-connect if:
    // 1. User is authenticated (both Magic and store)
    // 2. Wallet is not already connected
    // 3. Magic is available
    // 4. We have connectors available
    if (
      isAuthenticated &&
      storeIsAuthenticated &&
      !isConnected &&
      magic &&
      connectors.length > 0
    ) {
      console.log("Auto-connecting wallet after authentication");

      // Find the Magic connector
      const magicConnector = connectors.find((connector) =>
        connector.name.toLowerCase().includes("magic")
      );

      console.log(
        "Available connectors:",
        connectors.map((c) => c.name)
      );
      console.log("Magic connector found:", magicConnector);

      if (magicConnector) {
        connect({ connector: magicConnector });
      } else {
        console.warn("Magic connector not found in available connectors");
      }
    }
  }, [
    isAuthenticated,
    storeIsAuthenticated,
    isConnected,
    magic,
    connectors,
    connect,
  ]);
}
