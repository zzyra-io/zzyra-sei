/**
 * Login Page
 *
 * This page provides authentication options using Dynamic Wallet.
 */

"use client";

import { DynamicWidget } from "@dynamic-labs/sdk-react-core";
import { Logo } from "@/components/logo";
import { ModeToggle } from "@/components/mode-toggle";
import { WelcomeSteps } from "@/components/onboarding/welcome-steps";
import { useDynamicAuth } from "@/lib/hooks/use-dynamic-auth";
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * Login Page Component
 */
export default function LoginPage() {
  const router = useRouter();
  const { isLoggedIn, isLoading, error } = useDynamicAuth();

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (isLoggedIn && !isLoading) {
      router.push("/dashboard");
    }
  }, [isLoggedIn, isLoading, router]);

  return (
    <div className='flex min-h-screen flex-col'>
      <header className='flex h-14 items-center px-4 lg:px-6 border-b'>
        <Link href='/' className='flex items-center'>
          <Logo className='h-8 w-auto' variant='full' />
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
                Connect your wallet to continue building workflows
              </p>
            </div>
            
            {/* Dynamic Wallet Widget */}
            <div className='flex justify-center'>
              <DynamicWidget />
            </div>

            {error && (
              <div className='rounded-md bg-destructive/15 p-3'>
                <div className='text-sm text-destructive'>
                  Authentication error: {error}. Please try again.
                </div>
              </div>
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
