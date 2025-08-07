import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import useAuthStore, { type User } from "@/lib/store/auth-store";
import api from "@/lib/services/api";

interface LoginCredentials {
  email: string;
}

interface LoginResponse {
  success: boolean;
  user: User;
  token: {
    accessToken: string;
    refreshToken: string;
  };
  callbackUrl?: string;
}

interface AuthHook {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  executeLogin: (credentials: LoginCredentials) => Promise<void>;
  executeLogout: () => Promise<void>;
  clearError: () => void;
  authenticateWithBackend: () => Promise<void>;
}

export const useAuth = (): AuthHook => {
  const dynamicContext = useDynamicContext();
  const isLoggedIn = !!dynamicContext.user && !!dynamicContext.primaryWallet;
  const router = useRouter();

  // Client-side state to prevent SSR issues
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Client-side auth store access
  useEffect(() => {
    const authStore = useAuthStore.getState();
    setUser(authStore.user);
    setIsAuthenticated(authStore.isAuthenticated);
    setIsLoading(authStore.isLoading);
    setError(authStore.error);
  }, []);

  // Subscribe to auth store changes
  useEffect(() => {
    const unsubscribe = useAuthStore.subscribe((state) => {
      setUser(state.user);
      setIsAuthenticated(state.isAuthenticated);
      setIsLoading(state.isLoading);
      setError(state.error);
    });

    return unsubscribe;
  }, []);

  const executeLogin = useCallback(
    async ({ email }: LoginCredentials): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        // Step 1: Trigger Dynamic auth flow
        dynamicContext.setShowAuthFlow(true);

        // Wait for Dynamic authentication to complete
        // This will be handled by the DynamicWidget UI flow
        // Once user connects, we need to get the auth token and authenticate with backend

        // Note: This approach assumes the actual backend authentication
        // will be handled in a useEffect or callback when Dynamic auth completes
        // For now, we'll show the auth flow and let the user connect

        console.log("Dynamic auth flow triggered for email:", email);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Login failed";
        setError(errorMessage);
        setIsLoading(false);
      }
    },
    [dynamicContext]
  );

  // Helper function to authenticate with backend once Dynamic auth is complete
  const authenticateWithBackend = useCallback(async () => {
    if (!isLoggedIn || !dynamicContext.user || !dynamicContext.primaryWallet) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Get Dynamic auth token
      const contextWithToken = dynamicContext as unknown as {
        getAuthToken?: () => Promise<string> | string;
      };
      const authToken = await contextWithToken.getAuthToken?.();
      if (!authToken) {
        throw new Error("No Dynamic auth token available");
      }

      // Step 2: Get user and wallet info
      const user = dynamicContext.user;
      const wallet = dynamicContext.primaryWallet;

      // Step 3: Authenticate with backend
      const response = await api.post<LoginResponse>("/auth/login", {
        email: user.email || "",
        authToken,
        publicAddress: wallet.address,
      });

      if (!response.data.success) {
        throw new Error("Authentication failed");
      }

      // Step 4: Update auth store
      const authStore = useAuthStore.getState();
      authStore.executeLogin(response.data.user, response.data.token || "");

      // Step 5: Redirect
      router.push("/dashboard");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Backend authentication failed";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn, dynamicContext, router]);

  const executeLogout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Clear auth store first
      const authStore = useAuthStore.getState();
      authStore.executeLogout();

      // Logout from backend
      try {
        await api.post("/auth/logout");
      } catch (err) {
        console.warn("Backend logout failed:", err);
      }

      // Logout from Dynamic
      if (isLoggedIn && dynamicContext.handleLogOut) {
        try {
          await dynamicContext.handleLogOut();
        } catch (err) {
          console.warn("Dynamic logout failed:", err);
        }
      }

      // Clear loading state and redirect
      setIsLoading(false);
      router.push("/login");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Logout failed";
      setError(errorMessage);
      setIsLoading(false);
    }
  }, [isLoggedIn, dynamicContext, router]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    executeLogin,
    executeLogout,
    clearError,
    authenticateWithBackend, // Expose this for use in components
  };
};
