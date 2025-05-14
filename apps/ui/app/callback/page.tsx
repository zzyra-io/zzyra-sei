/**
 * Magic Link OAuth Callback Page
 *
 * This page handles redirects from Magic Link OAuth providers (Google, Apple, GitHub, etc.)
 * It completes the authentication flow and sends the user to the dashboard.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMagicAuth } from "@/hooks/useMagicAuth";
import { OAuthProvider } from "@zyra/wallet";

// Default OAuth provider to use if none is detected
const DEFAULT_PROVIDER = OAuthProvider.GOOGLE;

/**
 * OAuth Callback Handler
 */
export default function OAuthCallbackPage() {
  const router = useRouter();
  const { handleOAuthCallback, isLoading, error: authError, isAuthenticated } = useMagicAuth();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    async function completeOAuthFlow() {
      try {
        setIsProcessing(true);
        
        // Detect which provider was used from URL or localStorage
        // (Provider info might be stored in localStorage during the login initiation)
        let provider = DEFAULT_PROVIDER;
        
        // Check if we have the provider stored in localStorage
        const storedProvider = localStorage.getItem('oauthProvider');
        if (storedProvider) {
          // No need for try/catch when just assigning a value
          provider = storedProvider as OAuthProvider;
          console.log('Using provider from localStorage:', provider);
        }
        
        // Use our updated handleOAuthCallback method which properly integrates 
        // Magic Link with Supabase
        await handleOAuthCallback(provider);
        
        // Clear any stored provider
        localStorage.removeItem('oauthProvider');
        
        // The useMagicAuth hook will update the authentication state
        setIsProcessing(false);
        
        // Redirect to dashboard on success
        router.push("/dashboard");
      } catch (err) {
        console.error("Failed to complete OAuth flow:", err);
        setError("Authentication failed. Please try again.");
        setIsProcessing(false);

        // Redirect to login page after a delay
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      }
    }

    completeOAuthFlow();
  }, [router, handleOAuthCallback]);

  return (
    <div className='min-h-screen flex items-center justify-center'>
      <div className='bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center'>
        {error || authError ? (
          <div className='text-red-500 mb-4'>
            <h2 className='text-xl font-bold mb-2'>Authentication Error</h2>
            <p>{error || (authError instanceof Error ? authError.message : 'Authentication failed')}</p>
            <p className='mt-4 text-sm'>Redirecting to login page...</p>
          </div>
        ) : isProcessing || isLoading ? (
          <div>
            <div className='flex justify-center mb-4'>
              <div className='animate-spin h-12 w-12 border-4 border-blue-500 rounded-full border-t-transparent'></div>
            </div>
            <h2 className='text-xl font-bold mb-2'>
              Completing Authentication
            </h2>
            <p>Please wait while we complete your login...</p>
          </div>
        ) : isAuthenticated ? (
          <div className='text-green-500'>
            <h2 className='text-xl font-bold mb-2'>Authentication Complete</h2>
            <p>Successfully authenticated. Redirecting to dashboard...</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
