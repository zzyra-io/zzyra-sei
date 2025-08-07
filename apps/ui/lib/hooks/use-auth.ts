import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import useAuthStore, { type User } from "@/lib/store/auth-store";
import api from "@/lib/services/api";

interface LoginCredentials {
  email: string;
}

interface BackendAuthResponse {
  success: boolean;
  user: User;
  session: {
    accessToken: string;
    refreshToken: string;
    expiresAt: string | Date;
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
      console.log("Cannot authenticate with backend - missing required data:", {
        isLoggedIn,
        hasUser: !!dynamicContext.user,
        hasWallet: !!dynamicContext.primaryWallet,
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log("Starting backend authentication...");

      // Step 1: Get Dynamic auth token if available
      console.log("🔑 Getting Dynamic auth token for backend auth...");

      const user = dynamicContext.user;
      const wallet = dynamicContext.primaryWallet;
      let authToken: string | null = null;

      // Try to get a JWT token, but don't fail if we can't
      try {
        // Method 1: Try wallet authentication methods
        if (wallet) {
          const walletAuth = wallet as unknown as {
            signIn?: () => Promise<{ token: string }>;
            authenticate?: () => Promise<string>;
            getAuthToken?: () => Promise<string>;
          };

          if (walletAuth.signIn) {
            const result = await walletAuth.signIn();
            authToken = result.token;
          } else if (walletAuth.authenticate) {
            authToken = await walletAuth.authenticate();
          } else if (walletAuth.getAuthToken) {
            authToken = await walletAuth.getAuthToken();
          }
        }

        // Method 2: Try Dynamic context methods
        if (!authToken) {
          const contextAuth = dynamicContext as unknown as {
            getAuthToken?: () => Promise<string>;
            authToken?: string;
            user?: { getAuthToken?: () => Promise<string> };
          };

          if (contextAuth.getAuthToken) {
            authToken = await contextAuth.getAuthToken();
          } else if (contextAuth.authToken) {
            authToken = contextAuth.authToken;
          } else if (contextAuth.user?.getAuthToken) {
            authToken = await contextAuth.user.getAuthToken();
          }
        }

        // Method 3: Try embedded wallet methods
        if (!authToken && user) {
          const embeddedAuth = user as unknown as {
            generateAuthToken?: () => Promise<string>;
            getJWT?: () => Promise<string>;
            accessToken?: string;
          };

          if (embeddedAuth.generateAuthToken) {
            authToken = await embeddedAuth.generateAuthToken();
          } else if (embeddedAuth.getJWT) {
            authToken = await embeddedAuth.getJWT();
          } else if (embeddedAuth.accessToken) {
            authToken = embeddedAuth.accessToken;
          }
        }
      } catch (error) {
        console.log("⚠️ Failed to get Dynamic auth token:", error);
      }

      if (authToken) {
        console.log("✅ Got Dynamic auth token");
      } else {
        console.log("ℹ️ No Dynamic auth token available, proceeding anyway");
      }

      if (!authToken) {
        console.log(
          "ℹ️ No auth token available, proceeding with backend auth anyway"
        );
        // Don't throw error - let the backend handle authentication
      } else {
        console.log("✅ Got auth token for backend auth");
      }

      // Step 2: User and wallet info already available from above

      // Step 3: Authenticate with backend
      const payload: {
        email: string;
        publicAddress: string;
        authToken?: string;
      } = {
        email: user.email || "",
        publicAddress: wallet.address,
      };

      if (authToken) {
        payload.authToken = authToken;
      }

      const response = await api.post<BackendAuthResponse>(
        "/auth/login",
        payload
      );

      if (!response.data.success) {
        throw new Error("Authentication failed");
      }

      console.log("Backend authentication successful");

      // Step 4: Update auth store and set auth cookie for middleware
      const { accessToken, refreshToken, expiresAt } = response.data.session;

      const authStore = useAuthStore.getState();
      authStore.executeLogin(response.data.user, { accessToken, refreshToken });

      // Best-effort: set a cookie that Next.js middleware can read
      try {
        let maxAge = 3600; // default 1 hour
        if (expiresAt) {
          const expiryMs =
            new Date(expiresAt as unknown as string).getTime() - Date.now();
          if (Number.isFinite(expiryMs) && expiryMs > 0) {
            maxAge = Math.floor(expiryMs / 1000);
          }
        }
        document.cookie = `token=${accessToken}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
      } catch (cookieErr) {
        console.warn("Failed to set auth cookie:", cookieErr);
      }

      // Step 5: Redirect
      router.push("/dashboard");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Backend authentication failed";
      console.error("Backend authentication error:", err);
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

      // Clear auth cookie used by middleware
      try {
        document.cookie = "token=; Path=/; Max-Age=0; SameSite=Lax";
      } catch (err) {
        console.warn("Failed to clear auth cookie:", err);
      }

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
