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

/**
 * OAuth Callback Handler
 */
export default function OAuthCallbackPage() {
  const router = useRouter();
  const {
    handleOAuthCallback,
    isLoading,
    error: authError,
    isAuthenticated,
  } = useMagicAuth();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    async function completeOAuthFlow() {
      try {
        setIsProcessing(true);
        
        // Check if this is a popup window
        const isPopup = window.opener && window.opener !== window;
        console.log("OAuth Callback: Is popup window?", isPopup);
        
        if (isPopup) {
          console.log("OAuth Callback: Handling popup flow");
          // For popup flow, we want to close this window after handling the callback
          // The parent window will handle the rest of the authentication flow
          
          try {
            // Let Magic Link handle the OAuth callback
            const result = await handleOAuthCallback();
            
            // Notify the parent window of successful authentication
            if (window.opener && typeof window.opener.postMessage === 'function') {
              console.log("Sending successful OAuth message to parent window");
              window.opener.postMessage({ 
                type: 'MAGIC_OAUTH_SUCCESS',
                provider: new URLSearchParams(window.location.search).get('provider') || 'unknown'
              }, '*');
            }
            
            // Clean up
            sessionStorage.removeItem("MAGIC_OAUTH_PROVIDER");
            
            // Close the popup window
            console.log("Authentication successful. Closing popup window...");
            setTimeout(() => window.close(), 500); // Short delay to ensure message is sent
          } catch (popupErr) {
            console.error("Failed to complete popup OAuth flow:", popupErr);
            // Try to notify the parent window about the error, if possible
            if (window.opener && typeof window.opener.postMessage === 'function') {
              window.opener.postMessage({ type: 'MAGIC_OAUTH_ERROR', error: 'Authentication failed' }, '*');
            }
            setError("Authentication failed in popup. Please try again.");
            setTimeout(() => window.close(), 3000); // Close after showing error
          }
        } else {
          console.log("OAuth Callback: Handling redirect flow");
          // Standard redirect flow
          await handleOAuthCallback();
          
          // Clean up
          sessionStorage.removeItem("MAGIC_OAUTH_PROVIDER");
          setIsProcessing(false);
          
          // Redirect to dashboard on success
          router.push("/dashboard");
        }
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
            <p>
              {error ||
                (authError instanceof Error
                  ? authError.message
                  : "Authentication failed")}
            </p>
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
