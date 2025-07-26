import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMagic } from "@/lib/magic-provider";
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
}

export const useAuth = (): AuthHook => {
  const { magic } = useMagic();
  const router = useRouter();
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    setIsLoading,
    setError,
    executeLogin: storeLogin,
    executeLogout: storeLogout,
    clearError,
  } = useAuthStore();

  const executeLogin = useCallback(
    async ({ email }: LoginCredentials): Promise<void> => {
      if (!magic) {
        setError("Magic Link not initialized");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Step 1: Authenticate with Magic Link
        await magic.auth.loginWithMagicLink({
          email,
          showUI: true,
        });

        // Step 2: Generate DID token for backend authentication
        const didToken = await magic.user.generateIdToken();

        // Step 3: Authenticate with backend
        const response = await api.post<LoginResponse>("/auth/login", {
          email,
          didToken,
        });

        if (!response.data.success) {
          throw new Error("Authentication failed");
        }

        // Step 4: Update auth store
        storeLogin(response.data.user, response.data.token);

        // Step 5: Redirect if callback URL provided
        if (response.data.callbackUrl) {
          router.push(response.data.callbackUrl);
        } else {
          router.push("/dashboard");
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Login failed";
        setError(errorMessage);
        setIsLoading(false);
      }
    },
    [magic, setIsLoading, setError, storeLogin, router]
  );

  const executeLogout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Clear auth store first
      storeLogout();

      // Logout from backend
      try {
        await api.post("/auth/logout");
      } catch (err) {
        console.warn("Backend logout failed:", err);
      }

      // Logout from Magic if available
      if (magic) {
        try {
          const isLoggedIn = await magic.user.isLoggedIn();
          if (isLoggedIn) {
            await magic.user.logout();
          }
        } catch (err) {
          console.warn("Magic logout failed:", err);
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
  }, [magic, setError, setIsLoading, storeLogout, router]);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    executeLogin,
    executeLogout,
    clearError,
  };
};
