"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useMagic } from "@/lib/magic-provider";

interface GuestRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function GuestRoute({ children, fallback = null }: GuestRouteProps) {

  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, isInitializing} = useMagic();

  // Set client-side flag and handle authentication check
  useEffect(() => {
    try {
      setIsClient(true);
      setIsLoading(isInitializing);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    }
  }, [isInitializing]);

  // Handle authenticated users by redirecting to previous page or home
  useEffect(() => {
    if (isClient && isAuthenticated && !isInitializing) {
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
  }, [isClient, isAuthenticated, isInitializing, router]);
    
    console.log("isAuthenticated", {
        isClient,
        isAuthenticated,
        isInitializing,
    });

  if (!isClient || isLoading) {
    return fallback;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return !isAuthenticated ? children : null;
}