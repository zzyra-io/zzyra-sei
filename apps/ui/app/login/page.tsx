/**
 * Login Page
 *
 * This page provides authentication options using Dynamic Wallet.
 */

"use client";

import { DynamicEmbeddedWidget } from "@dynamic-labs/sdk-react-core";
import { Logo } from "@/components/logo";
import { ModeToggle } from "@/components/mode-toggle";
import { useDynamicAuth } from "@/lib/hooks/use-dynamic-auth";
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Zap, Layers, Wallet, CheckCircle2 } from "lucide-react";

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
      <main className='flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0'>
        {/* Left side - Features */}
        <div className='hidden lg:flex flex-col justify-center items-center bg-gradient-to-br from-primary/5 via-primary/3 to-transparent p-12'>
          <div className='max-w-md space-y-8'>
            <div className='text-center mb-8'>
              <Zap className='h-16 w-16 text-primary mx-auto mb-4' />
              <h2 className='text-3xl font-bold'>Welcome to Zzyra</h2>
              <p className='text-lg text-muted-foreground mt-2'>
                Build powerful Web3 automation workflows
              </p>
            </div>

            <div className='space-y-6'>
              <div className='flex items-start gap-4'>
                <div className='p-2 rounded-lg bg-primary/10'>
                  <Layers className='h-6 w-6 text-primary' />
                </div>
                <div>
                  <h3 className='font-semibold'>No-Code Workflows</h3>
                  <p className='text-sm text-muted-foreground'>
                    Drag and drop to create powerful automation
                  </p>
                </div>
              </div>

              <div className='flex items-start gap-4'>
                <div className='p-2 rounded-lg bg-primary/10'>
                  <Wallet className='h-6 w-6 text-primary' />
                </div>
                <div>
                  <h3 className='font-semibold'>Smart Wallet Integration</h3>
                  <p className='text-sm text-muted-foreground'>
                    Account abstraction with session keys
                  </p>
                </div>
              </div>

              <div className='flex items-start gap-4'>
                <div className='p-2 rounded-lg bg-primary/10'>
                  <CheckCircle2 className='h-6 w-6 text-primary' />
                </div>
                <div>
                  <h3 className='font-semibold'>Secure & Reliable</h3>
                  <p className='text-sm text-muted-foreground'>
                    Enterprise-grade security and monitoring
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login */}
        <div className='flex flex-col justify-center items-center p-8 lg:p-12'>
          <Card className='w-full max-w-md'>
            <CardHeader className='text-center'>
              <CardTitle className='text-2xl'>Welcome back</CardTitle>
              <CardDescription>
                Connect your wallet to continue building workflows
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              {/* Dynamic Wallet Widget - Optimized for performance */}
              <div className='w-full'>
                <DynamicEmbeddedWidget />
              </div>

              {error && (
                <div className='rounded-md bg-destructive/15 p-3'>
                  <div className='text-sm text-destructive'>
                    Authentication error: {error}. Please try again.
                  </div>
                </div>
              )}

              <div className='text-center text-xs text-muted-foreground'>
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
              </div>
            </CardContent>
          </Card>

          {/* Show mobile features below on small screens */}
          <div className='lg:hidden mt-8 max-w-md space-y-4'>
            <div className='flex items-center gap-3 text-sm'>
              <Layers className='h-5 w-5 text-primary' />
              <span>No-code workflow builder</span>
            </div>
            <div className='flex items-center gap-3 text-sm'>
              <Wallet className='h-5 w-5 text-primary' />
              <span>Smart wallet & account abstraction</span>
            </div>
            <div className='flex items-center gap-3 text-sm'>
              <CheckCircle2 className='h-5 w-5 text-primary' />
              <span>Secure automation platform</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
