import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useMagic } from "../magic-provider";

export type LoginResponse = {
  success: boolean;
  user?: any;
  error?: string;
};

/**
 * Hook for authentication using Magic SDK
 *
 * This hook provides authentication methods that integrate with
 * both Magic SDK and your backend authentication system
 */
export const useMagicAuth = () => {
  const { magic: magicInstance } = useMagic();
  const queryClient = useQueryClient();

  // Login with email - complete flow including backend authentication
  const loginWithEmail = useMutation({
    mutationKey: ["loginWithEmail"],

    mutationFn: async (email: string): Promise<LoginResponse> => {
      if (!magicInstance) {
        throw new Error("Magic SDK not initialized");
      }

      // Step 1: Authenticate with Magic
      await magicInstance.auth.loginWithMagicLink({
        email,
        showUI: true,
      });

      // Step 2: Generate a DID token for backend auth
      const didToken = await magicInstance.user.generateIdToken();

      // Step 3: Authenticate with backend
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, didToken }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to authenticate with backend"
        );
      }

      // Step 4: Get user metadata
      const userMetadata = await magicInstance.user.getInfo();

      queryClient.setQueryData(["user"], userMetadata);

      return { success: true, user: userMetadata };
    },
  });

  // Logout - handles both Magic and backend logout
  const logout = useMutation({
    mutationKey: ["logout"],
    mutationFn: async (): Promise<void> => {
      if (!magicInstance) {
        throw new Error("Magic SDK not initialized");
      }

      try {
        // Step 1: Log out from Magic
        await magicInstance.user.logout();

        // Step 2: Log out from backend
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        throw error instanceof Error ? error : new Error("Logout failed");
      }
    },
  });

  // Return all auth-related functions and state with enhanced properties
  // Derive authentication state from mutation results

  const error = loginWithEmail.error;

  return useMemo(
    () => ({
      magicInstance,
      isInitialized: !!magicInstance,
      error,
      loginWithEmail,
      logout,
    }),
    [magicInstance, loginWithEmail, logout, error]
  );
};
