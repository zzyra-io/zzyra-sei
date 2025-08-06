"use client";

import { useCallback, useEffect } from "react";
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

  // Automatically authenticate with backend when Dynamic auth completes
  useEffect(() => {
    if (isLoggedIn && dynamicContext.user && dynamicContext.primaryWallet) {
      authenticateWithBackend();
    }
  }, [
    isLoggedIn,
    dynamicContext.user,
    dynamicContext.primaryWallet,
    authenticateWithBackend,
  ]);

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

  /**
   * Get Dynamic auth token (JWT)
   */
  const getAuthToken = useCallback(async (): Promise<string | null> => {
    if (!isLoggedIn || !dynamicContext.user) {
      return null;
    }

    try {
      // Try multiple approaches to get the auth token
      const contextWithToken = dynamicContext as any;

      if (contextWithToken.getAuthToken) {
        return await contextWithToken.getAuthToken();
      }

      if (contextWithToken.authToken) {
        return contextWithToken.authToken;
      }

      // Check user object for access token
      if (
        "accessToken" in dynamicContext.user &&
        dynamicContext.user.accessToken
      ) {
        return dynamicContext.user.accessToken as string;
      }

      console.warn("No auth token method found in Dynamic context");
      return null;
    } catch (error) {
      console.error("Failed to get Dynamic auth token:", error);
      return null;
    }
  }, [isLoggedIn, dynamicContext]);

  /**
   * Check if user has a wallet connected
   */
  const hasWallet = useCallback(() => {
    return Boolean(dynamicContext.primaryWallet?.address);
  }, [dynamicContext.primaryWallet]);

  return {
    // State
    isLoggedIn,
    isLoading,
    error,
    user: getCurrentUser(),
    hasWallet: hasWallet(),

    // Actions
    login,
    logout,
    getAuthToken,
    getCurrentUser,

    // Dynamic context (for advanced usage)
    dynamicContext,
  };
};

export default useDynamicAuth;
