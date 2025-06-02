"use client";

import type React from "react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useMagic } from "@/lib/magic-provider";
import { useNextAuthSession } from "@/hooks/useNextAuthSession";

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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get authentication state from both Magic Link and NextAuth.js
  const {
    isAuthenticated: isMagicAuthenticated,
    isInitializing: isMagicInitializing,
  } = useMagic();
  const {
    isAuthenticated: isNextAuthAuthenticated,
    isLoading: isNextAuthLoading,
  } = useNextAuthSession();

  // Combined authentication state - simplified to prevent loops
  // We prioritize Magic authentication since that's your primary system
  const isAuthenticated = isMagicAuthenticated;
  const isAuthLoading = isMagicInitializing;

  // Set client-side flag and handle authentication check
  useEffect(() => {
    try {
      setIsClient(true);
      setIsLoading(isAuthLoading);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    }
  }, [isAuthLoading]);

  // Handle unauthenticated users with redirect
  useEffect(() => {
    if (isClient && !isAuthenticated && !isAuthLoading) {
      try {
        // Don't redirect if we're already on the login page
        if (window.location.pathname === "/login") {
          return;
        }

        // Store current path for post-login redirect
        if (typeof window !== "undefined") {
          const currentPath = window.location.pathname;
          const query =
            currentPath !== redirectPath
              ? `?redirect=${encodeURIComponent(currentPath)}`
              : "";
          router.push(`${redirectPath}${query}`);
        }
      } catch (err) {
        console.error("Navigation error:", err);
        router.push(redirectPath); // Fallback to redirectPath on error
      }
    }
  }, [isClient, isAuthenticated, isAuthLoading, router, redirectPath]);

  console.log("ProtectedRoute auth state:", {
    isClient,
    isMagicAuthenticated,
    isNextAuthAuthenticated,
    isAuthenticated,
    isMagicInitializing,
    isNextAuthLoading,
    isAuthLoading,
  });

  if (!isClient || isLoading) {
    return fallback;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return isAuthenticated ? children : null;
}
