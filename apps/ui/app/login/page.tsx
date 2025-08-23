/**
 * Login Page
 *
 * This page provides authentication options using Dynamic Wallet.
 */
"use client";

import { DynamicLoadingState } from "@/components/auth/dynamic-loading-state";
import { Logo } from "@/components/logo";
import { ModeToggle } from "@/components/mode-toggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDynamicAuth } from "@/lib/hooks/use-dynamic-auth";
import { DynamicEmbeddedWidget } from "@dynamic-labs/sdk-react-core";
import { AlertCircle, ArrowRight, CheckCircle2, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Login Page Component
 */
export default function LoginPage() {
  const router = useRouter();
  const {
    isLoggedIn,
    isLoading,
    error,
    isAuthenticating,
    backendAuthSuccess,
    sdkHasLoaded,
  } = useDynamicAuth();

  // Redirect to dashboard if already logged in and backend auth completed
  useEffect(() => {
    // Only redirect if fully authenticated to prevent loops
    if (isLoggedIn && backendAuthSuccess && !isLoading && !isAuthenticating) {
      console.log(
        "🔄 Login page: Redirecting to dashboard - user fully authenticated"
      );
      router.push("/dashboard");
    }
  }, [isLoggedIn, backendAuthSuccess, isLoading, isAuthenticating, router]);

  return (
    <div className='min-h-screen bg-background'>
      {/* Header */}
      <header className='absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-6'>
        <Logo />
        <ModeToggle />
      </header>

      {/* Main Content */}
      <div className='min-h-screen flex'>
        {/* Left Side - Welcome/Onboarding */}
        <div className='hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/10 via-primary/5 to-background relative overflow-hidden'>
          {/* Background Pattern */}
          <div className='absolute inset-0 bg-grid-white/[0.02] bg-grid-16' />

          <div className='relative z-10 flex items-center justify-center p-12'>
            <Card className='w-full max-w-md bg-card/80 backdrop-blur-sm border-border/50'>
              <CardHeader className='text-center pb-6'>
                {/* Step Indicator */}
                <div className='flex items-center justify-center gap-2 mb-6'>
                  <div className='h-2 w-8 bg-primary rounded-full' />
                  <div className='h-2 w-8 bg-muted rounded-full' />
                  <div className='h-2 w-8 bg-muted rounded-full' />
                </div>
                <div className='text-sm text-muted-foreground mb-4'>1 of 3</div>

                {/* Logo Icon */}
                <div className='w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6'>
                  <Zap className='w-8 h-8 text-primary' />
                </div>

                <CardTitle className='text-2xl font-semibold mb-2'>
                  Welcome to Zzyra
                </CardTitle>
                <CardDescription className='text-base text-muted-foreground'>
                  Your all-in-one platform for building powerful Web3 automation
                  workflows with no-code required.
                </CardDescription>
              </CardHeader>

              <CardContent className='pt-0'>
                <button className='w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors'>
                  Next
                  <ArrowRight className='w-4 h-4' />
                </button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Side - Authentication */}
        <div className='w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12'>
          <div className='w-full max-w-md space-y-8'>
            {/* Mobile Logo - Only show on small screens */}
            <div className='lg:hidden text-center'>
              <div className='w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4'>
                <Zap className='w-6 h-6 text-primary' />
              </div>
            </div>

            {/* Welcome Back Section */}
            <div className='text-center space-y-2'>
              <h1 className='text-3xl font-semibold tracking-tight'>
                Welcome back
              </h1>
              <p className='text-muted-foreground'>
                Sign in to your account to continue building workflows
              </p>
            </div>

            {/* Authentication Card */}
            <Card className='border-border/50'>
              <CardHeader className='pb-4'>
                <CardTitle className='text-xl'>Connect Your Wallet</CardTitle>
                <CardDescription>
                  Secure, passwordless authentication with your wallet
                </CardDescription>
              </CardHeader>

              <CardContent className='space-y-6'>
                {/* Error Display */}
                {error && (
                  <div className='flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive'>
                    <AlertCircle className='h-4 w-4 flex-shrink-0' />
                    <span>{error}</span>
                  </div>
                )}

                {/* Dynamic Loading State */}
                <DynamicLoadingState
                  fallback={
                    <div className='space-y-4'>
                      <div className='bg-muted/30 rounded-lg p-6'>
                        <DynamicEmbeddedWidget />
                      </div>
                    </div>
                  }>
                  {/* Authenticated State */}
                  <div className='text-center space-y-4'>
                    <div className='w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto'>
                      <CheckCircle2 className='w-6 h-6 text-green-600 dark:text-green-400' />
                    </div>
                    <div>
                      <h3 className='font-medium'>Authentication Complete</h3>
                      <p className='text-sm text-muted-foreground'>
                        Redirecting to dashboard...
                      </p>
                    </div>
                    <div className='flex items-center justify-center'>
                      <div className='animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent'></div>
                    </div>
                  </div>
                </DynamicLoadingState>

                {/* Terms and Privacy */}
                <div className='text-center text-xs text-muted-foreground'>
                  By continuing, you agree to our{" "}
                  <Link
                    href='/terms'
                    className='underline underline-offset-4 hover:text-primary transition-colors'>
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    href='/privacy'
                    className='underline underline-offset-4 hover:text-primary transition-colors'>
                    Privacy Policy
                  </Link>
                  .
                </div>
              </CardContent>
            </Card>

            {/* Additional Features - Mobile Only */}
            <div className='lg:hidden space-y-3 text-center'>
              <div className='text-sm text-muted-foreground'>
                ✨ Build AI-powered workflows
              </div>
              <div className='text-sm text-muted-foreground'>
                🔗 Connect with blockchain networks
              </div>
              <div className='text-sm text-muted-foreground'>
                ⚡ Automate complex tasks
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
