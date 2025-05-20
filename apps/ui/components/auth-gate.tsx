"use client";

import type React from "react";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
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
    getUserMetadata,
  } = useMagicAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const authCheckInitiated = useRef(false);
  const redirectInitiated = useRef(false);
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const isLoginPage = currentPath === '/login';

  // Set client-side flag once
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Run auth check only once when component mounts
  useEffect(() => {
    if (isClient && !authCheckInitiated.current) {
      console.log('Initiating auth check');
      authCheckInitiated.current = true;
      checkAuth.mutate();
    }
  }, [isClient, checkAuth]);

  // Get user metadata only when authenticated and not already loading
  useEffect(() => {
    if (isClient && isAuthenticated && !isAuthLoading && getUserMetadata.status !== 'pending') {
      console.log('Getting user metadata');
      getUserMetadata.mutate();
    }
  }, [isClient, isAuthenticated, isAuthLoading, getUserMetadata]);

  // Handle redirects only once per auth state change
  useEffect(() => {
    if (!isClient || isAuthLoading) return;

    // Only handle redirects if we haven't already initiated one for this auth state
    if (!redirectInitiated.current) {
      if (!isAuthenticated && !isLoginPage) {
        console.log('Redirecting to login page');
        redirectInitiated.current = true;
        router.push('/login');
      } else if (error) {
        console.error('Auth error:', error);
        redirectInitiated.current = true;
        router.push('/login?error=auth_failed');
      }
    }

    // Reset redirect flag when auth state changes
    return () => {
      redirectInitiated.current = false;
    };
  }, [isAuthenticated, isAuthLoading, error, router, isClient, isLoginPage]);

  // Show loading state
  if (isAuthLoading || !isClient) {
    return (
      <div className='flex h-screen w-full items-center justify-center'>
        <Loader2 className='h-8 w-8 animate-spin text-primary' />
      </div>
    );
  }

  // Only render children if authenticated or on login page
  if (isAuthenticated || isLoginPage) {
    return <>{children}</>;
  }

  // This is a fallback that should rarely be seen
  return null;
}
