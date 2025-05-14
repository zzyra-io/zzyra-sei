/**
 * Magic Link + Supabase Authentication Hook
 *
 * Provides a React hook for using Magic Link authentication with Supabase
 */

import {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode,
} from "react";
import { MagicLinkAuth, createMagicAuth } from "@/lib/supabase/magic-auth";
import { WalletInfo, OAuthProvider, ChainType } from "@zyra/wallet";
import { useRouter } from "next/navigation";

// Define Supabase user type
interface SupabaseUser {
  id: string;
  app_metadata: Record<string, any>;
  user_metadata: {
    wallets?: Record<
      string,
      {
        chain_type: string;
        chain_id: string | number;
      }
    >;
    [key: string]: any;
  };
  aud: string;
  [key: string]: any;
}

// Auth context state
interface MagicAuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  wallet: WalletInfo | null;
  user: SupabaseUser | null; // Supabase user
  error: Error | null;
}

// Auth context methods
interface MagicAuthMethods {
  loginWithEmail: (email: string, chainId?: number | string) => Promise<void>;
  loginWithSMS: (
    phoneNumber: string,
    chainId?: number | string
  ) => Promise<void>;
  loginWithOAuth: (
    provider: OAuthProvider,
    chainId?: number | string
  ) => Promise<void>;
  handleOAuthCallback: (chainId?: number | string) => Promise<void>;
  logout: () => Promise<void>;
  getMagicAuth: () => MagicLinkAuth;
}

// Combined context type
type MagicAuthContextType = MagicAuthState & MagicAuthMethods;

// Default context value
const defaultContext: MagicAuthContextType = {
  isLoading: true,
  isAuthenticated: false,
  wallet: null,
  user: null,
  error: null,
  loginWithEmail: async () => {},
  loginWithSMS: async () => {},
  loginWithOAuth: async () => {},
  handleOAuthCallback: async () => {},
  logout: async () => {},
  getMagicAuth: () => {
    throw new Error("Called outside provider");
  },
};

// Create the context
const MagicAuthContext = createContext<MagicAuthContextType>(defaultContext);

// Provider props
interface MagicAuthProviderProps {
  children: ReactNode;
  redirectTo?: string;
}

/**
 * Magic Auth Provider component
 *
 * Wraps the application with Magic Link + Supabase authentication context
 */
export function MagicAuthProvider({
  children,
  redirectTo = "/login",
}: MagicAuthProviderProps) {
  // State
  const [magicAuth, setMagicAuth] = useState<MagicLinkAuth | null>(null);
  const [state, setState] = useState<MagicAuthState>({
    isLoading: true,
    isAuthenticated: false,
    wallet: null,
    user: null,
    error: null,
  });

  const router = useRouter();

  // Initialize Magic Auth
  useEffect(() => {
    async function initialize() {
      try {
        // Create and initialize Magic auth
        const auth = createMagicAuth();
        await auth.initialize();
        setMagicAuth(auth);

        // Check if user is already logged in
        const isLoggedIn = await auth.isLoggedIn();

        if (isLoggedIn) {
          // Get Supabase user data
          const {
            data: { user },
          } = await auth.getSupabase().auth.getUser();

          // Get wallet info
          const wallet = await auth.getWallet().getAddress();

          // Safely access user metadata - use string indexing for safety
          const walletEntry = user?.user_metadata?.wallets
            ? user.user_metadata.wallets[wallet as string]
            : undefined;

          const chainType = walletEntry?.chain_type || ChainType.EVM;
          const chainId = walletEntry?.chain_id || null;

          setState({
            isLoading: false,
            isAuthenticated: true,
            wallet: wallet
              ? ({
                  address: wallet,
                  provider: "magic",
                  chainType,
                  chainId,
                } as WalletInfo)
              : null,
            user,
            error: null,
          });
        } else {
          setState({
            isLoading: false,
            isAuthenticated: false,
            wallet: null,
            user: null,
            error: null,
          });
        }
      } catch (error) {
        console.error("Failed to initialize Magic auth:", error);
        setState({
          isLoading: false,
          isAuthenticated: false,
          wallet: null,
          user: null,
          error: error instanceof Error ? error : new Error("Unknown error"),
        });
      }
    }

    initialize();
  }, []);

  // Auth methods
  const loginWithEmail = async (email: string, chainId?: number | string) => {
    setState({ ...state, isLoading: true, error: null });

    try {
      if (!magicAuth) throw new Error("Magic auth not initialized");

      // Login with email
      const walletInfo = await magicAuth.loginWithMagicLink(email, chainId);

      // Get user data from Supabase
      const {
        data: { user },
      } = await magicAuth.getSupabase().auth.getUser();

      // Update state
      setState({
        isLoading: false,
        isAuthenticated: true,
        wallet: walletInfo,
        user,
        error: null,
      });
    } catch (error) {
      console.error("Login with email failed:", error);
      setState({
        ...state,
        isLoading: false,
        error: error instanceof Error ? error : new Error("Login failed"),
      });
    }
  };

  const loginWithSMS = async (
    phoneNumber: string,
    chainId?: number | string
  ) => {
    setState({ ...state, isLoading: true, error: null });

    try {
      if (!magicAuth) throw new Error("Magic auth not initialized");

      // Login with SMS
      const walletInfo = await magicAuth.loginWithSMS(phoneNumber, chainId);

      // Get user data from Supabase
      const {
        data: { user },
      } = await magicAuth.getSupabase().auth.getUser();

      // Update state
      setState({
        isLoading: false,
        isAuthenticated: true,
        wallet: walletInfo,
        user,
        error: null,
      });
    } catch (error) {
      console.error("Login with SMS failed:", error);
      setState({
        ...state,
        isLoading: false,
        error: error instanceof Error ? error : new Error("Login failed"),
      });
    }
  };

  const loginWithOAuth = async (
    provider: OAuthProvider,
    chainId?: number | string
  ) => {
    setState({ ...state, isLoading: true, error: null });

    try {
      if (!magicAuth) throw new Error("Magic auth not initialized");

      // Start OAuth flow - this will redirect the user
      await magicAuth.loginWithOAuth(provider.toString(), chainId);

      // Note: State update happens in handleOAuthCallback after redirect
    } catch (error) {
      console.error("OAuth login failed:", error);
      setState({
        ...state,
        isLoading: false,
        error: error instanceof Error ? error : new Error("OAuth login failed"),
      });
    }
  };

  const handleOAuthCallback = async (chainId?: number | string) => {
    setState({ ...state, isLoading: true, error: null });

    try {
      if (!magicAuth) throw new Error("Magic auth not initialized");

      // Complete OAuth flow
      const walletInfo = await magicAuth.handleOAuthCallback(chainId);

      // Get user data from Supabase
      const {
        data: { user },
      } = await magicAuth.getSupabase().auth.getUser();

      // Update state
      setState({
        isLoading: false,
        isAuthenticated: true,
        wallet: walletInfo,
        user,
        error: null,
      });

      // No need to return walletInfo to match the type declaration
    } catch (error) {
      console.error("OAuth callback handling failed:", error);
      setState({
        ...state,
        isLoading: false,
        error:
          error instanceof Error ? error : new Error("OAuth callback failed"),
      });
      throw error;
    }
  };

  const logout = async () => {
    setState({ ...state, isLoading: true, error: null });

    try {
      if (!magicAuth) throw new Error("Magic auth not initialized");

      // Logout from both Magic and Supabase
      await magicAuth.logout();

      // Update state
      setState({
        isLoading: false,
        isAuthenticated: false,
        wallet: null,
        user: null,
        error: null,
      });

      // Redirect to login page
      router.push(redirectTo);
    } catch (error) {
      console.error("Logout failed:", error);
      setState({
        ...state,
        isLoading: false,
        error: error instanceof Error ? error : new Error("Logout failed"),
      });
    }
  };

  // Get Magic auth instance
  const getMagicAuth = () => {
    if (!magicAuth) throw new Error("Magic auth not initialized");
    return magicAuth;
  };

  // Context value
  const value: MagicAuthContextType = {
    ...state,
    loginWithEmail,
    loginWithSMS,
    loginWithOAuth,
    handleOAuthCallback,
    logout,
    getMagicAuth,
  };

  return (
    <MagicAuthContext.Provider value={value}>
      {children}
    </MagicAuthContext.Provider>
  );
}

/**
 * Custom hook to use Magic Link + Supabase authentication
 *
 * @returns MagicAuthContextType with auth state and methods
 */
export function useMagicAuth() {
  const context = useContext(MagicAuthContext);

  if (context === undefined) {
    throw new Error("useMagicAuth must be used within a MagicAuthProvider");
  }

  return context;
}
