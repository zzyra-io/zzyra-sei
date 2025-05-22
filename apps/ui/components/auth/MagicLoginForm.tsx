/**
 * Magic Login Form
 *
 * A form component for Magic Link authentication with email, SMS, or OAuth providers.
 * Integrates with @zyra/wallet for Magic Link authentication.
 */

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react"; // Added for loading indicator
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OAuthProvider } from "@/lib/magic-auth-types";
import { useEffect, useState } from "react";
import { useMagicAuth } from "@/lib/hooks/use-magic-auth";
import { useMagic } from "@/lib/magic-provider";

/**
 * Magic Login Form Props
 */
interface MagicLoginFormProps {
  onSuccess?: () => void;
}

/**
 * Magic Login Form Component that uses direct Magic Auth
 * This doesn't depend on Wagmi so it works even if WagmiProvider is missing
 */
export function MagicLoginForm({ onSuccess }: MagicLoginFormProps) {
  // Initialize state for form
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [activeTab, setActiveTab] = useState<string>("email");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<Error | null>(null);

  // Magic auth hook for direct authentication
  const {
    loginWithEmail,
    // isLoading and isAuthenticated are now primarily from useMagic()
    error: authError, // This is error from loginWithEmail mutation
  } = useMagicAuth();
  const { magic, isAuthenticated, isInitializing } = useMagic(); // Get auth state from provider

  // Check for authentication success
  useEffect(() => {
    if (isAuthenticated && onSuccess) {
      console.log("Authentication successful, redirecting...");
      onSuccess();
    }
  }, [isAuthenticated, onSuccess]);

  // Handle email login with Magic Link
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || loginWithEmail.isPending) return; // Use mutation's pending state

    // setFormLoading(true); // Mutation's isPending can be used directly for UI
    setFormError(null);

    try {
      console.log("MagicLoginForm: Starting Magic Link login for", email);

      // Validate email format
      if (!email.includes("@") || !email.includes(".")) {
        throw new Error("Please enter a valid email address");
      }

      // Use Magic Auth directly with more detailed logging
      console.log("Calling loginWithEmail.mutateAsync with email:", email);
      const result = await loginWithEmail.mutateAsync(email);
      console.log("Login result:", result);

      // If we get here, the login was successful
      console.log("Magic Link login successful");
    } catch (err) {
      console.error("MagicLoginForm: Email login failed:", err);
      setFormError(
        err instanceof Error
          ? err
          : new Error(
              "Email login failed. Please check your connection and try again."
            )
      );
    } finally {
      // setFormLoading(false); // isPending will update automatically
    }
  };

  // Handle SMS login
  // const handleSMSLogin = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   if (!phoneNumber || formLoading) return;

  //   setFormLoading(true);
  //   setFormError(null);

  //   try {
  //     console.log("MagicLoginForm: Starting SMS login for", phoneNumber);

  //     // Use Magic Auth directly
  //     await loginWithSMS.mutateAsync({ phoneNumber });
  //   } catch (err) {
  //     setFormError(err instanceof Error ? err : new Error("SMS login failed"));
  //     console.error("SMS login failed:", err);
  //   } finally {
  //     setFormLoading(false);
  //   }
  // };

  // Handle OAuth login
  // const handleOAuthLogin = async (provider: OAuthProvider) => {
  //   setFormLoading(true);
  //   setFormError(null);

  //   try {
  //     console.log(`MagicLoginForm: Starting OAuth login with ${provider}`);

  //     // Save provider in sessionStorage for OAuth callback handling
  //     // Using sessionStorage for consistency with magic-auth.ts implementation
  //     sessionStorage.setItem("MAGIC_OAUTH_PROVIDER", provider);

  //     // Use the OAuth provider from Magic Auth
  //     await loginWithOAuth.mutateAsync({ provider });
  //   } catch (err) {
  //     setFormError(
  //       err instanceof Error ? err : new Error(`${provider} login failed`)
  //     );
  //     console.error(`${provider} login failed:`, err);
  //   } finally {
  //     setFormLoading(false);
  //   }
  // };

  // Determine loading state
  const isLoading = formLoading || isInitializing;

  // Determine error state
  const displayError = formError || authError;

  // Show a more detailed loading state
  if (!magic) {
    return (
      <Card className='w-full max-w-md mx-auto'>
        <CardHeader>
          <CardTitle>Login with Magic Link</CardTitle>
          <CardDescription>Secure, passwordless authentication</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex flex-col items-center justify-center p-4'>
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
            <p className='mt-2 text-sm text-muted-foreground'>
              Initializing authentication...
            </p>
            <p className='mt-1 text-xs text-muted-foreground'>
              This may take a moment. Please wait.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className='w-full max-w-md mx-auto'>
      <CardHeader>
        <CardTitle>Login with Magic Link</CardTitle>
        <CardDescription>
          Secure, passwordless authentication with your wallet
        </CardDescription>
      </CardHeader>

      {displayError && (
        <Alert variant='destructive' className='mx-6 mb-4'>
          <AlertDescription>{displayError.message}</AlertDescription>
        </Alert>
      )}

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
                    disabled={loginWithEmail.isPending || isInitializing}
                    required
                  />
                </div>

                <Button
                  type='submit'
                  className='w-full'
                  disabled={
                    !email ||
                    loginWithEmail.isPending ||
                    isInitializing ||
                    !magic
                  }>
                  {isLoading ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      Sending Magic Link...
                    </>
                  ) : (
                    "Login with Email"
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>

          {/* SMS Login */}
          <TabsContent value='sms'>
            <form
              onSubmit={() => {
                console.log("handleSMSLogin not implemented");
              }}>
              <div className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='phone'>Phone Number</Label>
                  <Input
                    id='phone'
                    type='tel'
                    placeholder='+1 (555) 123-4567'
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    disabled={isInitializing} // Assuming SMS login would have its own mutation.isPending
                    required
                  />
                </div>

                <Button
                  type='submit'
                  className='w-full'
                  disabled={!phoneNumber || isInitializing || !magic}>
                  {isLoading ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      Sending SMS...
                    </>
                  ) : (
                    "Login with SMS"
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>

          {/* Social Login */}
          <TabsContent value='social'>
            <div className='space-y-4'>
              <Button
                type='button'
                className='w-full'
                variant='outline'
                onClick={() => {
                  console.log("handleOAuthLogin not implemented");
                }}
                disabled={isInitializing || !magic}>
                {isInitializing ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Connecting...
                  </>
                ) : (
                  "Continue with Google"
                )}
              </Button>

              <Button
                type='button'
                className='w-full'
                variant='outline'
                onClick={() => {
                  console.log("handleOAuthLogin not implemented");
                }}
                disabled={isInitializing || !magic}>
                {isInitializing ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Connecting...
                  </>
                ) : (
                  "Continue with Apple"
                )}
              </Button>

              <Button
                type='button'
                className='w-full'
                variant='outline'
                onClick={() => {
                  console.log("handleOAuthLogin not implemented");
                }}
                disabled={isInitializing}>
                {isInitializing ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Connecting...
                  </>
                ) : (
                  "Continue with GitHub"
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
