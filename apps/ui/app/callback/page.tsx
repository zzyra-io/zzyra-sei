/**
 * Magic Link OAuth Callback Page
 *
 * This page handles redirects from Magic Link OAuth providers (Google, Apple, GitHub, etc.)
 * It completes the authentication flow and sends the user to the dashboard.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/components/auth-provider";
import { ZyraWallet } from "@zyra/wallet";

// Use polygon mumbai chain ID as a constant
const POLYGON_MUMBAI_ID = 80001;

/**
 * OAuth Callback Handler
 */
export default function OAuthCallbackPage() {
  const router = useRouter();
  const { supabase } = useSupabase();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function completeOAuthFlow() {
      try {
        // Get Magic publishable key from environment
        const magicPublishableKey =
          process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY;

        if (!magicPublishableKey) {
          throw new Error("Magic publishable key not configured");
        }

        // Create and initialize a ZyraWallet instance with configuration
        const wallet = new ZyraWallet(magicPublishableKey, {
          supabaseClient: supabase,
        });
        await wallet.initialize();

        // Complete the OAuth flow
        await wallet.handleOAuthCallback(POLYGON_MUMBAI_ID);

        // Generate DID token for Supabase auth
        const didToken = await wallet.generateDIDToken();

        // Sign in to Supabase with the token
        const { error } = await supabase.auth.signInWithIdToken({
          provider: "magic",
          token: didToken,
        });

        if (error) {
          throw error;
        }

        // Redirect to dashboard on success
        router.push("/dashboard");
      } catch (err) {
        console.error("Failed to complete OAuth flow:", err);
        setError("Authentication failed. Please try again.");

        // Redirect to login page after a delay
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      }
    }

    completeOAuthFlow();
  }, [router, supabase.auth]);

  return (
    <div className='min-h-screen flex items-center justify-center'>
      <div className='bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center'>
        {error ? (
          <div className='text-red-500 mb-4'>
            <h2 className='text-xl font-bold mb-2'>Authentication Error</h2>
            <p>{error}</p>
            <p className='mt-4 text-sm'>Redirecting to login page...</p>
          </div>
        ) : (
          <div>
            <div className='flex justify-center mb-4'>
              <div className='animate-spin h-12 w-12 border-4 border-blue-500 rounded-full border-t-transparent'></div>
            </div>
            <h2 className='text-xl font-bold mb-2'>
              Completing Authentication
            </h2>
            <p>Please wait while we complete your login...</p>
          </div>
        )}
      </div>
    </div>
  );
}
