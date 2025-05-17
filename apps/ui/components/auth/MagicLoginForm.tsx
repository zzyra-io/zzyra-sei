/**
 * Magic Login Form
 *
 * A form component for Magic Link authentication with email, SMS, or OAuth providers.
 * Integrates with @zyra/wallet for Magic Link authentication.
 */

import { useState, useEffect } from "react";
import { useMagicAuth } from "@/hooks/useMagicAuth";
import { OAuthProvider } from "@/lib/magic-auth-types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { EmailPendingView } from "./EmailPendingView";

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
  const [showEmailPending, setShowEmailPending] = useState(false);

  // Magic auth hook for direct authentication
  const {
    loginWithEmail,
    loginWithSMS,
    loginWithOAuth,
    isLoading: isMagicAuthLoading,
    isAuthenticated,
    error: authError,
  } = useMagicAuth();

  // Check for authentication success
  useEffect(() => {
    if (isAuthenticated && onSuccess) {
      onSuccess();
    }
  }, [isAuthenticated, onSuccess]);

  // Handle email login with Magic Link
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || formLoading) return;

    setFormLoading(true);
    setFormError(null);

    try {
      console.log("MagicLoginForm: Starting Magic Link login for", email);

      // Use Magic Auth directly
      await loginWithEmail(email);

      // If the login is successful, show the pending email screen
      setShowEmailPending(true);
      console.log("Magic Link email sent successfully");
    } catch (err) {
      console.error("MagicLoginForm: Email login failed:", err);
      setFormError(
        err instanceof Error
          ? err
          : new Error(
              "Email login failed. Please check your connection and try again."
            )
      );
      setShowEmailPending(false);
    } finally {
      // Keep loading state active while email is pending
      if (!showEmailPending) {
        setFormLoading(false);
      }
    }
  };

  // Handle SMS login
  const handleSMSLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || formLoading) return;

    setFormLoading(true);
    setFormError(null);

    try {
      console.log("MagicLoginForm: Starting SMS login for", phoneNumber);

      // Use Magic Auth directly
      await loginWithSMS(phoneNumber);
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
      console.log(`MagicLoginForm: Starting OAuth login with ${provider}`);

      // Save provider in localStorage for OAuth callback handling
      localStorage.setItem("oauthProvider", provider);

      // Use the OAuth provider from Magic Auth
      await loginWithOAuth(provider);
    } catch (err) {
      setFormError(
        err instanceof Error ? err : new Error(`${provider} login failed`)
      );
      console.error(`${provider} login failed:`, err);
    } finally {
      setFormLoading(false);
    }
  };

  // Handle Magic Link email resend
  const handleResendEmail = () => {
    // Re-trigger the login process
    if (email) {
      handleEmailLogin({ preventDefault: () => {} } as React.FormEvent);
    }
  };

  // Handle cancellation of email login
  const handleCancelEmailLogin = () => {
    setShowEmailPending(false);
    setFormLoading(false);
  };

  // Determine loading state
  const isLoading = formLoading || isMagicAuthLoading;

  // Determine error state
  const displayError = formError || authError;

  // If showing the email pending view
  if (showEmailPending) {
    return (
      <Card className='w-full max-w-md mx-auto'>
        <CardHeader>
          <CardTitle>Check Your Email</CardTitle>
          <CardDescription>
            We&apos;ve sent a magic link to your email
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmailPendingView email={email} onCancel={handleCancelEmailLogin} />
          <div className='mt-4 text-center'>
            <Button
              variant='outline'
              size='sm'
              onClick={handleResendEmail}
              disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Sending...
                </>
              ) : (
                "Resend Magic Link"
              )}
            </Button>
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
                    disabled={isLoading}
                    required
                  />
                </div>

                <Button
                  type='submit'
                  className='w-full'
                  disabled={!email || isLoading}>
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

                <Button
                  type='submit'
                  className='w-full'
                  disabled={!phoneNumber || isLoading}>
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
                onClick={() => handleOAuthLogin(OAuthProvider.GOOGLE)}
                disabled={isLoading}>
                {isLoading ? (
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
                onClick={() => handleOAuthLogin(OAuthProvider.APPLE)}
                disabled={isLoading}>
                {isLoading ? (
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
                onClick={() => handleOAuthLogin(OAuthProvider.GITHUB)}
                disabled={isLoading}>
                {isLoading ? (
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
