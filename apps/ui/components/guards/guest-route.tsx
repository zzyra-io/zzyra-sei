"use client";

import type React from "react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import useAuthStore from "@/lib/store/auth-store";

interface GuestRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectPath?: string;
}

export function GuestRoute({
  children,
  fallback = null,
  redirectPath = "/dashboard",
}: GuestRouteProps) {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Handle authenticated users with redirect
  useEffect(() => {
    if (isClient && isAuthenticated && !isLoading) {
      try {
        // Don't redirect if we're already on the dashboard
        if (window.location.pathname === redirectPath) {
          return;
        }

        router.push(redirectPath);
      } catch (err) {
        console.error("Navigation error:", err);
        router.push(redirectPath);
      }
    }
  }, [isClient, isAuthenticated, isLoading, router, redirectPath]);

  if (!isClient || isLoading) {
    return fallback;
  }

  if (error) {
    return <div>Authentication Error: {error}</div>;
  }

  return !isAuthenticated ? children : null;
}
