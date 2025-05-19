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
import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * Login Page Component
 */
export default function LoginPage() {
  const router = useRouter();
  

  const handleLoginSuccess = () => {
    router.push("/dashboard");
  };

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

            <MagicLoginForm onSuccess={handleLoginSuccess} />

            {/* {error && (
              <Alert variant='destructive' className='mb-4'>
                <AlertDescription>
                  Authentication error: {error.message}. Please log in again.
                </AlertDescription>
              </Alert>
            )} */}

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
