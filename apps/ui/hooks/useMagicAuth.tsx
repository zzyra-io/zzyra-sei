/**
 * Magic Link Authentication Hook
 *
 * Provides a React hook for using Magic Link authentication
 */

import {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode,
} from "react";
import { MagicAuth, createMagicAuth } from "@/lib/magic-auth";
import { OAuthProvider } from "@/lib/magic-auth-types";
import { ChainType } from "@zyra/wallet";
import { type MagicUserMetadata } from "magic-sdk";
import { useRouter } from "next/navigation";

// Define WalletInfo interface locally
interface WalletInfo {
  address: string;
  provider: string;
  chainType: ChainType;
  chainId: string | number | null;
}

// Auth context state
interface MagicAuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  wallet: WalletInfo | null;
  user: MagicUserMetadata | null; // Use MagicUserMetadata instead of SupabaseUser
  error: Error | null;
}

// Auth context methods
interface MagicAuthMethods {
  loginWithEmail: (email: string, chainId?: number | string) => Promise<void>;
  loginWithSMS: (
    phoneNumber: string,
    chainId?: number | string
  ) => Promise<void>;
  loginWithOAuth: (provider: OAuthProvider) => Promise<void>;
  handleOAuthCallback: () => Promise<void>; // Remove provider parameter as it's not used
  logout: () => Promise<void>;
  getMagicAuth: () => MagicAuth;
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
 * Wraps the application with Magic Link authentication context
 */
export function MagicAuthProvider({
  children,
  redirectTo = "/login",
}: MagicAuthProviderProps) {
  // State
  const [magicAuth, setMagicAuth] = useState<MagicAuth | null>(null);
  const [state, setState] = useState<MagicAuthState>({
    isLoading: true,
    isAuthenticated: false,
    wallet: null,
    user: null,
    error: null,
  });

  const router = useRouter();

  // Initialize Magic Auth - with improved error handling and timeouts
  useEffect(() => {
    const isMounted = true; // For cleanup in case component unmounts during initialization

    // Add a timeout to prevent infinite loading state
    const loadingTimeout = setTimeout(() => {
      if (isMounted) {
        console.warn("Magic auth initialization timed out");
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: new Error("Authentication initialization timed out"),
        }));
      }
    }, 10000); // 10 second timeout

    async function initialize() {
      try {
        console.log("Initializing Magic auth...");
        // Create Magic auth instance
        const auth = createMagicAuth();
        if (!isMounted) return;
        setMagicAuth(auth);

        // Check if user is already logged in
        console.log("Checking if user is logged in...");
        const isLoggedIn = await auth.isLoggedIn();

        if (isLoggedIn && isMounted) {
          console.log("User is logged in, fetching metadata...");
          // Get user metadata directly from Magic
          const userMetadata = await auth.getUserMetadata();

          // Create wallet info object if we have user data
          let walletInfo: WalletInfo | null = null;
          if (userMetadata?.publicAddress) {
            walletInfo = {
              address: userMetadata.publicAddress,
              provider: "magic",
              chainType: ChainType.ETHEREUM,
              chainId: null,
            };
          }

          if (!isMounted) return;

          setState({
            isLoading: false,
            isAuthenticated: true,
            wallet: walletInfo,
            user: userMetadata,
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
        if (isMounted) {
          setState({
            isLoading: false,
            isAuthenticated: false,
            wallet: null,
            user: null,
            error: error instanceof Error ? error : new Error("Unknown error"),
          });
        }
      }
    }

    initialize();

    // Cleanup function to prevent state updates after unmount
    return () => {
      clearTimeout(loadingTimeout);
    };
  }, []);

  // Auth methods
  const loginWithEmail = async (email: string, chainId?: number | string) => {
    setState({ ...state, isLoading: true, error: null });

    try {
      if (!magicAuth) throw new Error("Magic auth not initialized");

      // Get DID token from Magic
      await magicAuth.loginWithMagicLink(email);

      // Get user metadata directly from Magic
      const userMetadata = await magicAuth.getUserMetadata();

      // Create wallet info object
      let walletInfo: WalletInfo | null = null;
      if (userMetadata?.publicAddress) {
        walletInfo = {
          address: userMetadata.publicAddress,
          provider: "magic",
          chainType: ChainType.ETHEREUM,
          chainId: chainId || null,
        };
      }

      // Update state after successful authentication
      setState({
        isLoading: false,
        isAuthenticated: true,
        wallet: walletInfo,
        user: userMetadata,
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
      await magicAuth.loginWithSMS(phoneNumber);

      // Get user metadata directly from Magic
      const userMetadata = await magicAuth.getUserMetadata();

      // Create wallet info object
      let walletInfo: WalletInfo | null = null;
      if (userMetadata?.publicAddress) {
        walletInfo = {
          address: userMetadata.publicAddress,
          provider: "magic",
          chainType: ChainType.ETHEREUM,
          chainId: chainId || null,
        };
      }

      // Update state
      setState({
        isLoading: false,
        isAuthenticated: true,
        wallet: walletInfo,
        user: userMetadata,
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

  const loginWithOAuth = async (provider: OAuthProvider) => {
    setState({ ...state, isLoading: true, error: null });

    try {
      if (!magicAuth) throw new Error("Magic auth not initialized");

      // Start OAuth flow - this will redirect the user
      await magicAuth.loginWithOAuth(provider);

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

  const handleOAuthCallback = async () => {
    // Remove provider parameter
    setState({ ...state, isLoading: true, error: null });

    try {
      if (!magicAuth) throw new Error("Magic auth not initialized");

      // Complete OAuth flow
      const result = await magicAuth.handleOAuthCallback();

      // Get user metadata from result or directly from Magic
      const userMetadata =
        result.magic.userMetadata || (await magicAuth.getUserMetadata());

      // Create wallet info object
      let walletInfo: WalletInfo | null = null;
      if (userMetadata?.publicAddress) {
        walletInfo = {
          address: userMetadata.publicAddress,
          provider: "magic",
          chainType: ChainType.ETHEREUM,
          chainId: null, // This can be customized if needed
        };
      }

      // Update state
      setState({
        isLoading: false,
        isAuthenticated: true,
        wallet: walletInfo,
        user: userMetadata,
        error: null,
      });
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
 * Custom hook to use Magic Link authentication
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
