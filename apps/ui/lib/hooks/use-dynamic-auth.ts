"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { useDynamicContext, useIsLoggedIn } from "@dynamic-labs/sdk-react-core";
import { useAuth } from "./use-auth";

/**
 * Hook for authentication using Dynamic SDK
 *
 * This hook provides a clean interface for Dynamic authentication
 * and integrates with the backend authentication system
 */
export const useDynamicAuth = () => {
  const dynamicContext = useDynamicContext();
  const isLoggedIn = useIsLoggedIn();
  const { authenticateWithBackend, isLoading, error } = useAuth();

  // Get SDK loading state from Dynamic context
  const { sdkHasLoaded } = dynamicContext;

  // Track if we've already attempted backend authentication
  const [hasAttemptedBackendAuth, setHasAttemptedBackendAuth] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const authAttemptRef = useRef(false);

  // Automatically authenticate with backend when Dynamic auth completes
  useEffect(() => {
    // Check if we have all required data
    if (
      !sdkHasLoaded ||
      !isLoggedIn ||
      !dynamicContext.user ||
      !dynamicContext.primaryWallet ||
      hasAttemptedBackendAuth ||
      isAuthenticating ||
      authAttemptRef.current
    ) {
      return;
    }

    console.log("🔍 Checking auth conditions:", {
      sdkHasLoaded,
      isLoggedIn,
      hasUser: !!dynamicContext.user,
      hasWallet: !!dynamicContext.primaryWallet,
      hasAttemptedBackendAuth,
      isAuthenticating,
    });

    console.log("✅ All conditions met, attempting backend auth");

    // Mark that we're attempting authentication
    authAttemptRef.current = true;
    setIsAuthenticating(true);
    setHasAttemptedBackendAuth(true);

    const performAuth = async () => {
      try {
        await authenticateWithBackend();
        console.log("✅ Backend authentication completed");
      } catch (error) {
        console.error("❌ Backend authentication failed:", error);
      } finally {
        setIsAuthenticating(false);
      }
    };

    void performAuth();
  }, [sdkHasLoaded, isLoggedIn, hasAttemptedBackendAuth, isAuthenticating]);

  // Reset backend auth attempt when user logs out
  useEffect(() => {
    if (!isLoggedIn) {
      setHasAttemptedBackendAuth(false);
      setIsAuthenticating(false);
      authAttemptRef.current = false;
    }
  }, [isLoggedIn]);

  /**
   * Trigger Dynamic authentication flow
   */
  const login = useCallback(() => {
    try {
      dynamicContext.setShowAuthFlow(true);
    } catch (error) {
      console.error("Failed to show Dynamic auth flow:", error);
    }
  }, [dynamicContext]);

  /**
   * Logout from Dynamic and backend
   */
  const logout = useCallback(async () => {
    try {
      if (isLoggedIn && dynamicContext.handleLogOut) {
        await dynamicContext.handleLogOut();
      }
    } catch (error) {
      console.error("Failed to logout from Dynamic:", error);
    }
  }, [isLoggedIn, dynamicContext]);

  /**
   * Get current user information from Dynamic
   */
  const getCurrentUser = useCallback(() => {
    if (!isLoggedIn || !dynamicContext.user) {
      return null;
    }

    return {
      userId: dynamicContext.user.userId,
      email: dynamicContext.user.email,
      walletAddress: dynamicContext.primaryWallet?.address,
      chain: dynamicContext.primaryWallet?.chain,
      walletProvider: dynamicContext.primaryWallet?.connector?.name,
    };
  }, [isLoggedIn, dynamicContext.user, dynamicContext.primaryWallet]);

  return {
    // Dynamic state
    isLoggedIn,
    sdkHasLoaded,
    user: dynamicContext.user,
    primaryWallet: dynamicContext.primaryWallet,

    // Backend auth state
    hasAttemptedBackendAuth,
    isAuthenticating,
    isLoading,
    error,

    // Actions
    login,
    logout,
    getCurrentUser,
  };
};
