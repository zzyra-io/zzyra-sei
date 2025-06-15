"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import useAuthStore from "@/lib/store/auth-store";

interface GuestRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function GuestRoute({ children, fallback = null }: GuestRouteProps) {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const { isAuthenticated, isLoading, error } = useAuthStore();

  // Set client-side flag
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Handle authenticated users by redirecting to dashboard
  useEffect(() => {
    if (isClient && isAuthenticated && !isLoading) {
      try {
        // Don't redirect if we're already on the login page
        if (window.location.pathname === "/login") {
          return;
        }

        // Attempt to go back to previous page if available
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push("/dashboard");
        }
      } catch (err) {
        console.error("Navigation error:", err);
        router.push("/dashboard");
      }
    }
  }, [isClient, isAuthenticated, isLoading, router]);

  if (!isClient || isLoading) {
    return fallback;
  }

  if (error) {
    return <div>Authentication Error: {error}</div>;
  }

  return !isAuthenticated ? children : null;
}
