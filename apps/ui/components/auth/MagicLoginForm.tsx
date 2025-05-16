/**
 * Magic Login Form
 * 
 * A form component for Magic Link authentication with email, SMS, or OAuth providers.
 */

import { useState } from "react";
// import { useAuthStore } from "@/lib/store/auth-store"; // Old store
import { useMagicAuth } from "@/hooks/useMagicAuth"; // New hook
import { OAuthProvider } from "@/lib/magic-auth-types"; // Corrected import
import { CHAIN_IDS } from "@zyra/wallet"; // Corrected import for chain constants
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from 'lucide-react';
import { AlertCircle } from 'lucide-react';

/**
 * Magic Login Form Props
 */
interface MagicLoginFormProps {
  onSuccess?: () => void;
}

/**
 * Magic Login Form Component
 */
export function MagicLoginForm({ onSuccess }: MagicLoginFormProps) {
  // Initialize state for form
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [activeTab, setActiveTab] = useState<string>('email');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<Error | null>(null);

  // No longer need the isMounted state since we're using direct form loading state

  // Auth hook
  const {
    loginWithEmail,
    loginWithSMS,
    loginWithOAuth,
    // We're not using isAuthLoading anymore to prevent button disabling issues
    error: authError,
  } = useMagicAuth();
  
  // Use the first chainId from wallet constants as default
  const defaultChainId = CHAIN_IDS.ETH_GOERLI;
  
  // Handle email login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setFormLoading(true);
    setFormError(null);

    // Add timeout protection to prevent indefinite loading state
    const loginTimeout = setTimeout(() => {
      setFormLoading(false);
      setFormError(new Error("Login request timed out. Please try again."));
    }, 10000); // 10 second timeout

    try {
      console.log("MagicLoginForm: Starting email login for", email);
      await loginWithEmail(email, String(defaultChainId));
      // onSuccess callback is still useful for page-level actions like navigation
      clearTimeout(loginTimeout);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("MagicLoginForm: Email login failed:", err);
      setFormError(
        err instanceof Error ? err : new Error("Email login failed. Please check your connection and try again.")
      );
    } finally {
      clearTimeout(loginTimeout);
      setFormLoading(false);
    }
  };
  
  // Handle SMS login
  const handleSMSLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) return;

    setFormLoading(true);
    setFormError(null);

    try {
      await loginWithSMS(phoneNumber, String(defaultChainId));
      if (onSuccess) onSuccess();
    } catch (err) {
      setFormError(err instanceof Error ? err : new Error("SMS login failed"));
      console.error("SMS login failed:", err);
    } finally {
      setFormLoading(false);
    }
  };

  // Handle OAuth login
  const handleOAuthLogin = async (provider: OAuthProvider) => {
    setFormLoading(true);
    setFormError(null);
    try {
      await loginWithOAuth(provider);
      // OAuth typically involves a redirect, so onSuccess might be called
      // on the redirect callback page or based on auth state change.
      // If onSuccess is provided, it can be called, but navigation might be tricky here.
      if (onSuccess) onSuccess();
    } catch (err) {
      setFormError(
        err instanceof Error ? err : new Error(`${provider} login failed`)
      );
      console.error(`${provider} login failed:`, err);
    } finally {
      // For OAuth, loading might persist until redirect or failure
      setFormLoading(false); // Added to ensure loading state is reset
    }
  };

  // Determine combined loading state - only use formLoading to control button state
  // This prevents buttons from being disabled due to background auth checks
  const isLoading = formLoading;

  // Determine combined error state
  const displayError = formError || authError;

  return (
    <Card className='w-full max-w-md mx-auto'>
      <CardHeader>
        <CardTitle>Login with Magic Link</CardTitle>
        <CardDescription>
          Secure, passwordless authentication with your wallet
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs
          defaultValue='email'
          value={activeTab}
          onValueChange={setActiveTab}>
          <TabsList className='grid w-full grid-cols-3'>
            <TabsTrigger value='email'>Email</TabsTrigger>
            <TabsTrigger value='sms'>SMS</TabsTrigger>
            <TabsTrigger value='social'>Social</TabsTrigger>
          </TabsList>

          {/* Email Login */}
          <TabsContent value='email'>
            <form onSubmit={handleEmailLogin}>
              <div className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='email'>Email</Label>
                  <Input
                    id='email'
                    type='email'
                    placeholder='your@email.com'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>

                {formLoading ? (
                  <Button disabled className="w-full">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Magic Link...
                  </Button>
                ) : (
                  <Button
                    type='submit'
                    className='w-full'
                    disabled={!email}>
                    Login with Email
                  </Button>
                )}
              </div>
            </form>
          </TabsContent>

          {/* SMS Login */}
          <TabsContent value='sms'>
            <form onSubmit={handleSMSLogin}>
              <div className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='phone'>Phone Number</Label>
                  <Input
                    id='phone'
                    type='tel'
                    placeholder='+1 (555) 123-4567'
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>

                {formLoading ? (
                  <Button disabled className="w-full">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending SMS...
                  </Button>
                ) : (
                  <Button
                    type='submit'
                    className='w-full'
                    disabled={!phoneNumber}>
                    Login with SMS
                  </Button>
                )}
              </div>
            </form>
          </TabsContent>

          {/* Social Login */}
          <TabsContent value='social'>
            <div className='space-y-4'>
              {formLoading ? (
                <Button disabled className="w-full">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </Button>
              ) : (
                <>
                  <Button
                    type='button'
                    className='w-full'
                    variant='outline'
                    onClick={() => handleOAuthLogin(OAuthProvider.GOOGLE)}>
                    Continue with Google
                  </Button>

                  <Button
                    type='button'
                    className='w-full'
                    variant='outline'
                    onClick={() => handleOAuthLogin(OAuthProvider.APPLE)}>
                    Continue with Apple
                  </Button>

                  <Button
                    type='button'
                    className='w-full'
                    variant='outline'
                    onClick={() => handleOAuthLogin(OAuthProvider.GITHUB)}>
                    Continue with GitHub
                  </Button>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Error display */}
        {displayError ? (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Authentication Error</AlertTitle>
            <AlertDescription>{displayError.message}</AlertDescription>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2" 
              onClick={() => {
                setFormError(null);
                setEmail(""); // Clear email field to encourage trying again
              }}
            >
              Try Again
            </Button>
          </Alert>
        ) : null}
      </CardContent>

      <CardFooter className='flex flex-col space-y-2'>
        <div className='text-xs text-gray-500 text-center'>
          By logging in, you agree to our Terms of Service and Privacy Policy. A
          blockchain wallet will be created for you automatically.
        </div>
      </CardFooter>
    </Card>
  );
}
