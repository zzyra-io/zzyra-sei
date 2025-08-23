"use client";

import { useDynamicAuth } from "@/lib/hooks/use-dynamic-auth";
import useAuthStore from "@/lib/store/auth-store";
import { useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectPath?: string;
}

export function ProtectedRoute({
  children,
  fallback = null,
  redirectPath = "/login",
}: ProtectedRouteProps) {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get Dynamic auth state for more comprehensive auth checking
  const dynamicAuth = useDynamicAuth();

  // Client-side auth store access
  useEffect(() => {
    setIsClient(true);
    const authStore = useAuthStore.getState();
    setIsAuthenticated(authStore.isAuthenticated);
    setIsLoading(authStore.isLoading);
    setError(authStore.error);
  }, []);

  // Subscribe to auth store changes
  useEffect(() => {
    if (!isClient) return;

    const unsubscribe = useAuthStore.subscribe((state) => {
      setIsAuthenticated(state.isAuthenticated);
      setIsLoading(state.isLoading);
      setError(state.error);
    });

    return unsubscribe;
  }, [isClient]);

  // Handle unauthenticated users with redirect
  useEffect(() => {
    if (!isClient) return;

    // Don't redirect if Dynamic auth is still loading or authenticating
    if (
      dynamicAuth.isAuthenticating ||
      (!dynamicAuth.sdkHasLoaded && isLoading)
    ) {
      console.log("⏳ Auth still in progress, waiting...", {
        isAuthenticating: dynamicAuth.isAuthenticating,
        sdkHasLoaded: dynamicAuth.sdkHasLoaded,
        isLoading,
      });
      return;
    }

    // Don't redirect if backend auth is successful but store hasn't updated yet
    if (dynamicAuth.backendAuthSuccess && !isAuthenticated) {
      console.log("⏳ Backend auth successful, waiting for store sync...");
      return;
    }

    // Only redirect if definitely not authenticated and not in auth flow
    const shouldRedirect =
      !isAuthenticated &&
      !isLoading &&
      !dynamicAuth.isLoggedIn &&
      !dynamicAuth.isAuthenticating;

    if (shouldRedirect) {
      try {
        // Don't redirect if we're already on the login page
        if (window.location.pathname === redirectPath) {
          return;
        }

        console.log("🔄 Redirecting to login - user not authenticated");

        // Store current path for post-login redirect
        const currentPath = window.location.pathname;
        const query =
          currentPath !== redirectPath
            ? `?redirect=${encodeURIComponent(currentPath)}`
            : "";
        router.push(`${redirectPath}${query}`);
      } catch (err) {
        console.error("Navigation error:", err);
        router.push(redirectPath);
      }
    }
  }, [
    isClient,
    isAuthenticated,
    isLoading,
    router,
    redirectPath,
    dynamicAuth.isAuthenticating,
    dynamicAuth.sdkHasLoaded,
    dynamicAuth.backendAuthSuccess,
    dynamicAuth.isLoggedIn,
  ]);

  // Show loading state during various auth phases
  if (
    !isClient ||
    isLoading ||
    dynamicAuth.isAuthenticating ||
    (!dynamicAuth.sdkHasLoaded && !error)
  ) {
    return fallback;
  }

  // Show loading if backend auth succeeded but store isn't updated yet
  if (dynamicAuth.backendAuthSuccess && !isAuthenticated && !error) {
    console.log("⏳ Waiting for auth store sync...");
    return fallback;
  }

  if (error) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <h2 className='text-lg font-semibold text-destructive mb-2'>
            Authentication Error
          </h2>
          <p className='text-sm text-muted-foreground'>{error}</p>
        </div>
      </div>
    );
  }

  // Render content if authenticated through either Dynamic login + backend success OR store authenticated
  const isFullyAuthenticated =
    isAuthenticated ||
    (dynamicAuth.isLoggedIn && dynamicAuth.backendAuthSuccess);

  return isFullyAuthenticated ? children : null;
}
