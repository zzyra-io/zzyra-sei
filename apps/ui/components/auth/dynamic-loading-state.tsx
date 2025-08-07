"use client";

import { useDynamicContext, useIsLoggedIn } from "@dynamic-labs/sdk-react-core";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface DynamicLoadingStateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Component to handle Dynamic SDK loading states
 *
 * Based on Dynamic documentation:
 * - sdkHasLoaded: Check if SDK has loaded
 * - useIsLoggedIn: Check if user has finished onboarding
 * - userWithMissingInfo: Check if user is authenticated but hasn't finished onboarding
 */
export function DynamicLoadingState({
  children,
  fallback,
}: DynamicLoadingStateProps) {
  const { sdkHasLoaded, userWithMissingInfo } = useDynamicContext();
  const isLoggedIn = useIsLoggedIn();

  // SDK is still loading
  if (!sdkHasLoaded) {
    return (
      <Card className='w-full max-w-md mx-auto'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Loader2 className='h-5 w-5 animate-spin' />
            Loading Dynamic SDK
          </CardTitle>
          <CardDescription>
            Initializing wallet connection and authentication...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex items-center justify-center py-8'>
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
          </div>
        </CardContent>
      </Card>
    );
  }

  // User is authenticated but hasn't finished onboarding
  if (userWithMissingInfo) {
    return (
      <Card className='w-full max-w-md mx-auto'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <AlertCircle className='h-5 w-5 text-yellow-500' />
            Complete Your Profile
          </CardTitle>
          <CardDescription>
            Please complete the onboarding process to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <p className='text-sm text-muted-foreground'>
              You've successfully connected your wallet, but we need some
              additional information to complete your account setup.
            </p>
            <div className='flex items-center gap-2 text-sm'>
              <CheckCircle2 className='h-4 w-4 text-green-500' />
              <span>Wallet connected successfully</span>
            </div>
            <div className='flex items-center gap-2 text-sm'>
              <AlertCircle className='h-4 w-4 text-yellow-500' />
              <span>Profile information required</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // User is fully authenticated
  if (isLoggedIn) {
    return (
      <Card className='w-full max-w-md mx-auto'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <CheckCircle2 className='h-5 w-5 text-green-500' />
            Authentication Complete
          </CardTitle>
          <CardDescription>
            You're successfully logged in and ready to use the application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <div className='flex items-center gap-2 text-sm'>
              <CheckCircle2 className='h-4 w-4 text-green-500' />
              <span>Wallet connected</span>
            </div>
            <div className='flex items-center gap-2 text-sm'>
              <CheckCircle2 className='h-4 w-4 text-green-500' />
              <span>Profile completed</span>
            </div>
            <div className='flex items-center gap-2 text-sm'>
              <CheckCircle2 className='h-4 w-4 text-green-500' />
              <span>Ready to proceed</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show fallback or children when not authenticated
  return fallback || children;
}

/**
 * Hook to get Dynamic authentication state
 */
export function useDynamicAuthState() {
  const { sdkHasLoaded, userWithMissingInfo } = useDynamicContext();
  const isLoggedIn = useIsLoggedIn();

  return {
    sdkHasLoaded,
    isLoggedIn,
    hasMissingInfo: Boolean(userWithMissingInfo),
    authState: (() => {
      if (!sdkHasLoaded) return "loading";
      if (userWithMissingInfo) return "incomplete_onboarding";
      if (isLoggedIn) return "authenticated";
      return "not_authenticated";
    })(),
  };
}
