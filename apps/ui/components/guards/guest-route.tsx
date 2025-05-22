"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useMagic } from "@/lib/magic-provider";
import { useNextAuthSession } from "@/hooks/useNextAuthSession";

interface GuestRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function GuestRoute({ children, fallback = null }: GuestRouteProps) {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get authentication state from both Magic Link and NextAuth.js
  const { isAuthenticated: isMagicAuthenticated, isInitializing: isMagicInitializing } = useMagic();
  const { isAuthenticated: isNextAuthAuthenticated, isLoading: isNextAuthLoading } = useNextAuthSession();

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
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    }
  }, [isAuthLoading]);

  // Handle authenticated users by redirecting to previous page or home
  useEffect(() => {
    if (isClient && isAuthenticated && !isAuthLoading) {
      try {
        // Attempt to go back to previous page if available
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push("/dashboard");
        }
      } catch (err) {
        console.error("Navigation error:", err);
        router.push("/dashboard"); // Fallback to home on error
      }
    }
  }, [isClient, isAuthenticated, isAuthLoading, router]);
    
  console.log("GuestRoute auth state:", {
    isClient,
    isMagicAuthenticated,
    isNextAuthAuthenticated,
    isAuthenticated,
    isMagicInitializing,
    isNextAuthLoading,
    isAuthLoading
  });

  if (!isClient || isLoading) {
    return fallback;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return !isAuthenticated ? children : null;
}