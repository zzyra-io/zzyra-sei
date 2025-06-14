import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { OAuthProvider } from "@magic-ext/oauth2";
import { useMagic } from "../magic-provider";
import api from "../services/api";

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

      try {
        // Step 1: Authenticate with Magic
        await magicInstance.auth.loginWithMagicLink({
          email,
          showUI: true,
        });

        // Step 2: Generate a DID token for backend auth
        const didToken = await magicInstance.user.generateIdToken();

        // Step 3: Authenticate with backend using axios
        const response = await api.post("/auth/login", {
          email,
          didToken,
        });

        // Step 4: Get user metadata
        const userMetadata = await magicInstance.user.getInfo();

        queryClient.setQueryData(["user"], userMetadata);

        return { success: true, user: userMetadata, ...response.data };
      } catch (error) {
        console.error("Login error:", error);
        throw error;
      }
    },
  });

  // Login with SMS - complete flow including backend authentication
  const loginWithSMS = useMutation({
    mutationKey: ["loginWithSMS"],
    mutationFn: async ({
      phoneNumber,
    }: {
      phoneNumber: string;
    }): Promise<LoginResponse> => {
      if (!magicInstance) {
        throw new Error("Magic SDK not initialized");
      }

      try {
        // Timeout promise for SMS login
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("SMS login timed out")), 60000);
        });

        // Step 1: Authenticate with Magic
        const didToken = await Promise.race([
          magicInstance.auth.loginWithSMS({ phoneNumber, showUI: true }),
          timeoutPromise,
        ]);

        // Step 2: Get user metadata
        const userMetadata = await magicInstance.user.getInfo();

        // Step 3: Authenticate with backend using axios
        const response = await api.post("/auth/login", {
          phoneNumber,
          email: userMetadata?.email,
          didToken,
        });

        return { success: true, user: userMetadata };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "SMS authentication failed",
        };
      }
    },
  });

  // Login with OAuth - initiates the OAuth flow
  const loginWithOAuth = useMutation({
    mutationKey: ["loginWithOAuth"],
    mutationFn: async ({
      provider,
    }: {
      provider: OAuthProvider;
    }): Promise<void> => {
      if (!magicInstance) {
        throw new Error("Magic SDK not initialized");
      }

      // Save the provider for use during callback handling
      if (typeof window !== "undefined") {
        sessionStorage.setItem("MAGIC_OAUTH_PROVIDER", provider);
      }

      // Redirect to OAuth provider
      await magicInstance.oauth.loginWithRedirect({
        provider,
        redirectURI:
          "https://auth.magic.link/v1/oauth2/2RZJeTIaH2Q7lLWycJ3PZ5WjAM53Q4rL7VZlfxSxlRo=/callback",
        loginHint: "",
      });
    },
  });

  // Handle OAuth callback
  const handleOAuthCallback = useMutation({
    mutationKey: ["handleOAuthCallback"],
    mutationFn: async (): Promise<{
      success: boolean;
      userMetadata: any;
    }> => {
      if (!magicInstance) {
        throw new Error("Magic SDK not initialized");
      }

      try {
        // Step 1: Handle the callback from the OAuth provider
        const result = await magicInstance.oauth.getRedirectResult({});

        // Step 2: Get provider and user info
        const provider =
          result?.oauth?.provider ||
          (typeof window !== "undefined"
            ? sessionStorage.getItem("MAGIC_OAUTH_PROVIDER")
            : null) ||
          "unknown";
        const userInfo = result?.oauth?.userInfo;

        // Step 3: Get user metadata
        const userMetadata = await magicInstance.user.getInfo();
        if (!userMetadata || !userMetadata.email) {
          throw new Error("Could not retrieve user metadata");
        }

        // Step 4: Generate DID token for backend auth
        const didToken = await magicInstance.user.generateIdToken();
        if (!didToken) {
          throw new Error("Failed to generate DID token");
        }

        // Step 5: Authenticate with backend using axios
        const response = await api.post("/auth/login", {
          email: userMetadata.email,
          didToken,
          isOAuth: true,
          oauthProvider: provider,
          oauthUserInfo: userInfo,
        });

        return { success: true, userMetadata };
      } catch (error) {
        throw error instanceof Error
          ? error
          : new Error("OAuth callback failed");
      }
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

        // Step 2: Log out from backend using axios
        await api.post("/auth/logout");
      } catch (error) {
        throw error instanceof Error ? error : new Error("Logout failed");
      }
    },
  });

  // Check if user is logged in - simplified to avoid infinite loops
  const checkAuth = useMutation({
    mutationKey: ["checkAuth"],
    mutationFn: async (): Promise<boolean> => {
      if (!magicInstance) {
        console.log("checkAuth: Magic instance not available");
        return false;
      }

      try {
        // Use a static flag to prevent multiple checks in the same session
        // This helps avoid infinite loops during development
        const STORAGE_KEY = "MAGIC_AUTH_CHECKED";
        const hasChecked = sessionStorage.getItem(STORAGE_KEY);
        const cachedState = sessionStorage.getItem("MAGIC_AUTH_STATE");

        if (hasChecked && cachedState) {
          console.log(
            "Using cached auth state from session storage:",
            cachedState
          );
          return cachedState === "true";
        }

        // Otherwise check with Magic SDK
        console.log("Performing fresh auth check with Magic SDK");
        const isLoggedIn = await magicInstance.user.isLoggedIn();

        // Store the result in session storage
        sessionStorage.setItem(STORAGE_KEY, "true");
        sessionStorage.setItem("MAGIC_AUTH_STATE", isLoggedIn.toString());

        console.log("Fresh auth check result:", isLoggedIn);
        return isLoggedIn;
      } catch (error) {
        console.error("Error checking login status:", error);
        return false;
      }
    },
  });

  // Get user metadata
  const getUserMetadata = useMutation({
    mutationKey: ["getUserMetadata"],
    mutationFn: async () => {
      if (!magicInstance) {
        throw new Error("Magic SDK not initialized");
      }

      if (await magicInstance.user.isLoggedIn()) {
        return await magicInstance.user.getInfo();
      }
      return null;
    },
  });

  // Add a function to check authentication status
  const checkAuthStatus = useMutation({
    mutationKey: ["checkAuthStatus"],
    mutationFn: async () => {
      if (!magicInstance) {
        return { isLoggedIn: false, metadata: null };
      }

      try {
        const isLoggedIn = await magicInstance.user.isLoggedIn();
        const metadata = isLoggedIn ? await magicInstance.user.getInfo() : null;
        return { isLoggedIn, metadata };
      } catch (error) {
        console.error("Error checking auth status:", error);
        return { isLoggedIn: false, metadata: null, error };
      }
    },
  });

  // Return all auth-related functions and state with enhanced properties
  // Derive authentication state from mutation results
  const isLoading =
    loginWithEmail.status === "pending" ||
    loginWithSMS.status === "pending" ||
    loginWithOAuth.status === "pending" ||
    checkAuth.status === "pending" ||
    getUserMetadata.status === "pending" ||
    checkAuthStatus.status === "pending";

  // Get authentication state from session storage first, then from mutation result
  // This is more reliable than using React Query cache during development
  const cachedAuthState =
    typeof window !== "undefined"
      ? sessionStorage.getItem("MAGIC_AUTH_STATE") === "true"
      : false;
  const isAuthenticated = cachedAuthState || checkAuth.data === true;

  const user = getUserMetadata.data;

  const error =
    loginWithEmail.error ||
    loginWithSMS.error ||
    loginWithOAuth.error ||
    checkAuth.error ||
    getUserMetadata.error ||
    checkAuthStatus.error;

  return useMemo(
    () => ({
      magicInstance,
      isInitialized: !!magicInstance,
      isLoading,
      isAuthenticated,
      user,
      error,
      loginWithEmail,
      loginWithOAuth,
      handleOAuthCallback,
      logout,
      checkAuth,
      getUserMetadata,
      loginWithSMS,
      checkAuthStatus,
    }),
    [
      magicInstance,
      loginWithEmail,
      loginWithOAuth,
      handleOAuthCallback,
      logout,
      checkAuth,
      getUserMetadata,
      loginWithSMS,
      checkAuthStatus,
      error,
      isAuthenticated,
      isLoading,
      user,
    ]
  );
};
