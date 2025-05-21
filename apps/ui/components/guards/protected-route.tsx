"use client";

import type React from "react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useMagic } from "@/lib/magic-provider";

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectPath?: string;
}



export function ProtectedRoute({ 
  children, 
  fallback = null, 
  redirectPath = "/login" 
}: ProtectedRouteProps) {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated,isInitializing } = useMagic();

  // Set client-side flag and handle authentication check
  useEffect(() => {
    try {
      setIsClient(true);
      setIsLoading(isInitializing);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    }
  }, [isInitializing]);

  // Handle unauthenticated users with redirect
  useEffect(() => {
    if (isClient && !isAuthenticated && !isInitializing) {
      try {
        // Store current path for post-login redirect
        if (typeof window !== "undefined") {
          const currentPath = window.location.pathname;
          const query = currentPath !== redirectPath 
            ? `?redirect=${encodeURIComponent(currentPath)}`
            : "";
          router.push(`${redirectPath}${query}`);
        }
      } catch (err) {
        console.error("Navigation error:", err);
        router.push(redirectPath); // Fallback to redirectPath on error
      }
    }
  }, [isClient, isAuthenticated, isInitializing, router, redirectPath]);

  if (!isClient || isLoading) {
    return fallback;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return isAuthenticated ? children : null;
}