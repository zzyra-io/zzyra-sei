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
  authStatus: string; // Status message for UI feedback during authentication
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

// Initial state for auth context
const initialState: MagicAuthState = {
  isLoading: false,
  isAuthenticated: false,
  wallet: null,
  user: null,
  error: null,
  authStatus: "",
};

// Default context value
const defaultContext: MagicAuthContextType = {
  ...initialState,
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
    authStatus: "",
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
          authStatus: "",
        }));
      }
    }, 10000); // 10 second timeout

    async function initialize() {
      try {
        console.log("Initializing Magic auth...");
        // Create Magic auth instance
        const auth = createMagicAuth();
        console.log("auth", auth);
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
            authStatus: "",
          });
        } else {
          setState({
            isLoading: false,
            isAuthenticated: false,
            wallet: null,
            user: null,
            error: null,
            authStatus: "",
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
            authStatus: "",
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
    setState({
      ...state,
      isLoading: true,
      error: null,
      authStatus: "Preparing authentication...",
    });

    try {
      // Step 0: Ensure Magic SDK is initialized
      if (!magicAuth) {
        const error = new Error("Magic auth not initialized");
        setState({ ...state, error, isLoading: false, authStatus: "" });
        throw error;
      }

      // Step 1: Authenticate with Magic Link (sends the magic link email)
      // This will trigger Magic's UI and wait for user to click the link
      console.log(`Starting Magic Link login flow for email: ${email}`);
      setState({
        ...state,
        isLoading: true,
        authStatus: "Sending magic link email...",
      });
      await magicAuth.loginWithEmail(email);
      console.log("User authenticated with Magic Link");

      // Step 2: Generate a DID token for authentication with backend
      console.log("Generating DID token for backend authentication");
      setState({
        ...state,
        isLoading: true,
        authStatus: "Generating secure token...",
      });
      const didToken = await magicAuth.generateDIDToken();
      if (!didToken) {
        const error = new Error("Failed to generate authentication token");
        setState({ ...state, error, isLoading: false, authStatus: "" });
        throw error;
      }

      // Step 3: Authenticate with Prisma backend API
      console.log("Authenticating with backend API");
      setState({
        ...state,
        isLoading: true,
        authStatus: "Completing authentication...",
      });
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, didToken }),
      });

      // Handle API error responses with user-friendly messages
      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage =
          errorData.error || "Failed to authenticate with backend";
        const error = new Error(errorMessage);
        setState({ ...state, error, isLoading: false, authStatus: "" });
        throw error;
      }

      // Step 4: Parse API response to get user data from backend
      const authResult = await response.json();
      console.log("Backend authentication successful:", {
        userId: authResult.user?.id,
        authenticated: !!authResult.user,
      });

      // Step 5: Get user metadata directly from Magic
      // This includes blockchain wallet info that might not be in our DB yet
      console.log("Retrieving user metadata from Magic");
      setState({
        ...state,
        isLoading: true,
        authStatus: "Retrieving user information...",
      });
      const userMetadata = await magicAuth.getUserMetadata();

      // Step 6: Create wallet info object
      let walletInfo: WalletInfo | null = null;
      if (userMetadata?.publicAddress) {
        walletInfo = {
          address: userMetadata.publicAddress,
          provider: "magic",
          chainType: ChainType.ETHEREUM,
          chainId: chainId || null,
        };
      }

      // Step 7: Update state after successful authentication
      setState({
        isLoading: false,
        isAuthenticated: true,
        wallet: walletInfo,
        user: userMetadata,
        error: null,
        authStatus: "",
      });

      console.log("Email authentication complete, user is authenticated");
    } catch (error) {
      console.error("Login with email failed:", error);
      setState({
        ...state,
        isLoading: false,
        error: error instanceof Error ? error : new Error("Login failed"),
        authStatus: "",
      });
    }
  };

  const loginWithSMS = async (
    phoneNumber: string,
    chainId?: number | string
  ) => {
    setState({ ...state, isLoading: true, error: null, authStatus: "" });

    try {
      if (!magicAuth) throw new Error("Magic auth not initialized");

      // Step 1: Authenticate with Magic via SMS
      console.log(`Starting SMS login flow for phone: ${phoneNumber}`);
      await magicAuth.loginWithSMS(phoneNumber);
      console.log("User authenticated with SMS");

      // Step 2: Generate a DID token for authentication with backend
      console.log("Generating DID token for backend authentication");
      const didToken = await magicAuth.generateDIDToken();
      if (!didToken) {
        throw new Error("Failed to generate authentication token");
      }

      // Step 3: Get user metadata to retrieve email or identifier
      console.log("Retrieving user metadata from Magic");
      const userMetadata = await magicAuth.getUserMetadata();

      if (!userMetadata) {
        throw new Error("Failed to retrieve user metadata from Magic");
      }

      // Step 4: Authenticate with Prisma backend API
      console.log("Authenticating with backend API");
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber,
          email: userMetadata?.email, // Include email if available
          didToken,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to authenticate with backend"
        );
      }

      // Step 5: Parse API response
      const authResult = await response.json();
      console.log("Backend authentication successful:", {
        userId: authResult.user?.id,
        authenticated: !!authResult.user,
      });

      // Step 6: Create wallet info object
      let walletInfo: WalletInfo | null = null;
      if (userMetadata?.publicAddress) {
        walletInfo = {
          address: userMetadata.publicAddress,
          provider: "magic",
          chainType: ChainType.ETHEREUM,
          chainId: chainId || null,
        };
      }

      // Step 7: Update state
      setState({
        isLoading: false,
        isAuthenticated: true,
        wallet: walletInfo,
        user: userMetadata,
        error: null,
        authStatus: "",
      });

      console.log("SMS authentication complete, user is authenticated");
    } catch (error) {
      console.error("Login with SMS failed:", error);
      setState({
        ...state,
        isLoading: false,
        error: error instanceof Error ? error : new Error("SMS login failed"),
        authStatus: "",
      });
    }
  };

  const loginWithOAuth = async (provider: OAuthProvider) => {
    setState({
      ...state,
      isLoading: true,
      error: null,
      authStatus: "Preparing OAuth login...",
    });

    try {
      if (!magicAuth) throw new Error("Magic auth not initialized");
      console.log(`Starting OAuth login with provider: ${provider}`);
      
      // Store the provider in session storage for the callback page
      sessionStorage.setItem("MAGIC_OAUTH_PROVIDER", provider);
      
      // Setup message listener for popup completion
      const handleAuthMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'MAGIC_OAUTH_SUCCESS') {
          console.log('Received OAuth success message from popup');
          window.removeEventListener('message', handleAuthMessage);
          // We'll handle authentication completion in the main flow
        } else if (event.data && event.data.type === 'MAGIC_OAUTH_ERROR') {
          console.error('Received OAuth error message from popup:', event.data.error);
          setState({
            ...state,
            isLoading: false,
            error: new Error(event.data.error || 'OAuth authentication failed'),
            authStatus: '',
          });
          window.removeEventListener('message', handleAuthMessage);
        }
      };
      
      window.addEventListener('message', handleAuthMessage);
      
      // Start OAuth flow
      await magicAuth.loginWithOAuth(provider);
      
      // The flow will continue in handleOAuthCallback once redirected
      // or when the popup is closed successfully
    } catch (error) {
      console.error("OAuth Login Error:", error);
      setState({
        ...state,
        isLoading: false,
        error: error instanceof Error ? error : new Error("OAuth login failed"),
        authStatus: "",
      });
    }
  };

  const handleOAuthCallback = async () => {
    setState({
      ...state,
      isLoading: true,
      error: null,
      authStatus: "Processing OAuth login...",
    });

    try {
      if (!magicAuth) throw new Error("Magic auth not initialized");

      // Complete the OAuth flow
      console.log("Handling OAuth callback...");
      
      // Check if this is a popup flow
      const isInPopup = window.opener && window.opener !== window;
      console.log("Is in popup window:", isInPopup);
      
      // Handle OAuth callback based on window type
      let result;
      try {
        result = await magicAuth.handleOAuthCallback();
        console.log("OAuth callback result:", result);
      } catch (callbackErr) {
        // If in popup, we might need to handle errors differently
        console.error("Error in OAuth callback:", callbackErr);
        if (isInPopup) {
          // In popup, we'll let the parent window handle this
          throw callbackErr;
        } else {
          // Main window, we need to handle this error
          throw new Error(`OAuth callback failed: ${callbackErr.message || 'Unknown error'}`);
        }
      }
      
      // Get provider information from the OAuth result
      // Note: The structure might vary based on the provider and Magic version
      const provider = result?.oauth?.provider || 
                      new URLSearchParams(window.location.search).get('provider') || 
                      "unknown";
      
      // UserInfo will contain provider-specific user data
      const userInfo = result?.oauth?.userInfo;
      
      console.log(`OAuth authentication completed with provider: ${provider}`);
      
      // Get user metadata - this should include OAuth data now
      const userMetadata = await magicAuth.getUserMetadata();
      if (!userMetadata || !userMetadata.email) {
        throw new Error("Could not retrieve user metadata from Magic");
      }
      console.log("Got metadata from Magic:", userMetadata);

      // Generate DID token for authentication with backend
      const didToken = await magicAuth.generateDIDToken();
      if (!didToken) {
        throw new Error("Failed to generate DID token");
      }

      // Authenticate with backend
      setState({ ...state, authStatus: "Verifying authentication..." });
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userMetadata.email,
          didToken,
          isOAuth: true,
          oauthProvider: provider,
          oauthUserInfo: userInfo,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to authenticate with backend"
        );
      }

      // Get user data from backend
      await response.json(); // We don't need to use this directly as we have metadata from Magic

      // Create wallet info object
      let walletInfo: WalletInfo | null = null;
      if (userMetadata?.publicAddress) {
        walletInfo = {
          address: userMetadata.publicAddress,
          provider: "magic",
          chainType: ChainType.ETHEREUM,
          chainId: null, // OAuth flow doesn't specify a chain ID
        };
      }

      // Update state
      setState({
        isLoading: false,
        isAuthenticated: true,
        wallet: walletInfo,
        user: userMetadata,
        error: null,
        authStatus: "",
      });

      console.log("OAuth authentication complete, user is authenticated");
    } catch (error) {
      console.error("OAuth callback handling failed:", error);
      setState({
        ...state,
        isLoading: false,
        error:
          error instanceof Error ? error : new Error("OAuth callback failed"),
        authStatus: "",
      });
    }
  };

  const logout = async () => {
    setState({
      ...state,
      isLoading: true,
      error: null,
      authStatus: "Logging out...",
    });

    try {
      if (!magicAuth) throw new Error("Magic auth not initialized");

      // Logout from Magic SDK
      await magicAuth.logout();

      // Call our API to clear server-side session
      console.log("Logging out from backend API...");
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      // Update state
      setState({
        isLoading: false,
        isAuthenticated: false,
        wallet: null,
        user: null,
        error: null,
        authStatus: "",
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
  // Expose auth context
  const contextValue = {
    ...state,

    // Auth methods
    loginWithEmail,
    loginWithSMS,
    loginWithOAuth,
    handleOAuthCallback,
    logout,
    getMagicAuth,
  };

  return (
    <MagicAuthContext.Provider value={contextValue}>
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
