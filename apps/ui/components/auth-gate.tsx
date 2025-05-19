"use client";

import type React from "react";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useMagicAuth } from "@/lib/hooks/use-magic-auth";

interface AuthGateProps {
  children: React.ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const { 
    isLoading: isAuthLoading, 
    isAuthenticated,
    error,
    checkAuth,
    getUserMetadata
  } = useMagicAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Initialize authentication check when component mounts
  useEffect(() => {
    if (isClient) {
      // Call checkAuth and getUserMetadata when component mounts
      checkAuth.mutate();
      
      if (isAuthenticated) {
        getUserMetadata.mutate();
      }
    }
  }, [isClient, checkAuth, getUserMetadata, isAuthenticated]);

  // Handle authentication state changes
  useEffect(() => {
    if (isClient && !isAuthLoading) {
      if (!isAuthenticated) {
        router.push("/login");
      } else if (error) {
        // Handle authentication errors
        console.error("Auth error:", error);
        router.push("/login?error=auth_failed");
      }
    }
  }, [isAuthenticated, isAuthLoading, error, router, isClient]);

  // Show different loading states based on what's happening
  if (isAuthLoading || !isClient) {
    return (
      <div className='flex h-screen w-full items-center justify-center'>
        <Loader2 className='h-8 w-8 animate-spin text-primary' />
      </div>
    );
  }

  // Only render children if authenticated
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // This is a fallback that should rarely be seen
  // as the useEffect should redirect unauthenticated users
  return null;
}
