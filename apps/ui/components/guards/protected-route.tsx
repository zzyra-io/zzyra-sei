"use client";

import type React from "react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import useAuthStore from "@/lib/store/auth-store";

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
  const { isAuthenticated, isLoading, error } = useAuthStore();

  // Set client-side flag
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Handle unauthenticated users with redirect
  useEffect(() => {
    if (isClient && !isAuthenticated && !isLoading) {
      try {
        // Don't redirect if we're already on the login page
        if (window.location.pathname === redirectPath) {
          return;
        }

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
  }, [isClient, isAuthenticated, isLoading, router, redirectPath]);

  if (!isClient || isLoading) {
    return fallback;
  }

  if (error) {
    return <div>Authentication Error: {error}</div>;
  }

  return isAuthenticated ? children : null;
}
