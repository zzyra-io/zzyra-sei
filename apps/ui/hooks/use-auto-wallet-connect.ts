"use client";

import { useEffect } from "react";
import { useDynamicAuth } from "@/lib/hooks/use-dynamic-auth";
import useAuthStore from "@/lib/store/auth-store";

export function useAutoWalletConnect() {
  const { isLoggedIn, user, primaryWallet } = useDynamicAuth();
  const { isAuthenticated: storeIsAuthenticated } = useAuthStore();

  useEffect(() => {
    console.log("Auto wallet connect hook state:", {
      isLoggedIn,
      storeIsAuthenticated,
      hasDynamicUser: !!user,
      hasWallet: !!primaryWallet,
    });

    // With Dynamic, wallet connection is handled automatically through the Dynamic provider
    // We don't need to manually connect wagmi connectors since Dynamic manages the wallet connection
    // This hook mainly provides debugging information and can trigger additional actions if needed

    if (isLoggedIn && storeIsAuthenticated) {
      console.log(
        "User authenticated with Dynamic, wallet should be auto-connected"
      );
    }
  }, [isLoggedIn, storeIsAuthenticated, user, primaryWallet]);
}
