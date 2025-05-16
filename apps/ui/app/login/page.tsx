/**
 * Login Page
 *
 * This page provides authentication options including Magic Link login.
 */

"use client";

import { MagicLoginForm } from "@/components/auth/MagicLoginForm";
import { Logo } from "@/components/logo";
import { ModeToggle } from "@/components/mode-toggle";
import { WelcomeSteps } from "@/components/onboarding/welcome-steps";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useMagicAuth } from "@/hooks/useMagicAuth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Login Page Component
 */
export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading, error: authError } = useMagicAuth();
  // Add a local timer state to handle stuck loading
  const [isLoadingTimedOut, setIsLoadingTimedOut] = useState(false);

  // Handle potential stuck loading state with a timeout
  useEffect(() => {
    // If loading takes more than 6 seconds, consider it stuck
    const timeoutId = setTimeout(() => {
      if (isAuthLoading) {
        console.warn("Authentication check timed out, showing login form anyway");
        setIsLoadingTimedOut(true);
      }
    }, 6000);

    return () => clearTimeout(timeoutId);
  }, [isAuthLoading]);

  // Redirect if already authenticated
  useEffect(() => {
    // Add detailed logging to understand the auth state
    console.log("Login page auth state:", { isAuthenticated, isAuthLoading, authError });
    
    if (isAuthenticated && !isAuthLoading) {
      console.log("Redirecting to dashboard - user is authenticated");
      router.push("/dashboard");
    }
  }, [isAuthenticated, isAuthLoading, authError, router]);

  const handleLoginSuccess = () => {
    router.push("/dashboard");
  };
  
  // Force showing the login form if loading timed out or there's an error
  const showLoginForm = !isAuthLoading || isLoadingTimedOut || authError;

  return (
    <div className='flex min-h-screen flex-col'>
      <header className='flex h-14 items-center px-4 lg:px-6 border-b'>
        <Link href='/' className='flex items-center'>
          <Logo className='h-6 w-6' />
          <span className='ml-2 text-xl font-bold'>Zyra</span>
        </Link>
        <div className='ml-auto flex items-center'>
          <ModeToggle />
        </div>
      </header>
      <main className='flex-1 grid grid-cols-1 md:grid-cols-2 gap-0'>
        <div className='hidden md:flex flex-col justify-center items-center bg-muted/50 p-8'>
          <WelcomeSteps />
        </div>
        <div className='flex flex-col justify-center items-center p-8'>
          <div className='mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]'>
            <div className='flex flex-col space-y-2 text-center'>
              <h1 className='text-2xl font-semibold tracking-tight'>
                Welcome back
              </h1>
              <p className='text-sm text-muted-foreground'>
                Sign in to your account to continue building workflows
              </p>
            </div>

            {!showLoginForm ? (
              <div className='flex flex-col justify-center items-center py-8 space-y-4'>
                <div className='animate-spin h-12 w-12 border-4 border-primary rounded-full border-t-transparent'></div>
                <p className="text-sm text-muted-foreground">Checking authentication status...</p>
                <Button 
                  variant="link" 
                  onClick={() => setIsLoadingTimedOut(true)}
                  className="text-xs text-muted-foreground hover:text-primary"
                >
                  Skip check and log in
                </Button>
              </div>
            ) : (
              <>
                {authError && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertDescription>
                      Authentication error: {authError.message}. Please log in again.
                    </AlertDescription>
                  </Alert>
                )}
                <MagicLoginForm onSuccess={handleLoginSuccess} />
              </>
            )}

            <p className='px-8 text-center text-sm text-muted-foreground'>
              By continuing, you agree to our{" "}
              <Link
                href='/terms'
                className='underline underline-offset-4 hover:text-primary'>
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href='/privacy'
                className='underline underline-offset-4 hover:text-primary'>
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
