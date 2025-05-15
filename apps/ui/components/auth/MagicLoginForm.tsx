/**
 * Magic Login Form Component
 *
 * A form component for Magic Link authentication with email, SMS, or OAuth providers.
 */

import { useState } from "react";
// import { useAuthStore } from "@/lib/store/auth-store"; // Old store
import { useMagicAuth } from "@/hooks/useMagicAuth"; // New hook
import { OAuthProvider } from "@/lib/magic-auth-types"; // Corrected import
import { CHAIN_IDS } from "@zyra/wallet"; // Corrected import for chain constants
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Magic Login Form Props
 */
interface MagicLoginFormProps {
  defaultChainId?: number | string;
  onSuccess?: () => void;
  redirectAfterLogin?: string; // This prop might not be needed if redirection is handled by the page
}

/**
 * Magic Login Form Component
 */
export function MagicLoginForm({
  defaultChainId = CHAIN_IDS.MUMBAI.toString(),
  onSuccess,
}: MagicLoginFormProps) {
  // Login method state
  const [activeTab, setActiveTab] = useState("email");

  // Form states
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  // Local loading and error state for the form itself
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<Error | null>(null);

  // Auth hook
  const {
    loginWithEmail,
    loginWithSMS,
    loginWithOAuth,
    isLoading: isAuthLoading, // isLoading from useMagicAuth indicates ongoing auth process
    error: authError, // error from useMagicAuth
  } = useMagicAuth();

  // Handle email login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setFormLoading(true);
    setFormError(null);

    try {
      await loginWithEmail(email, String(defaultChainId));
      // onSuccess callback is still useful for page-level actions like navigation
      if (onSuccess) onSuccess();
    } catch (err) {
      setFormError(
        err instanceof Error ? err : new Error("Email login failed")
      );
    } finally {
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
      await loginWithOAuth(provider, String(defaultChainId));
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
      // setFormLoading(false); // Might not be needed if page redirects
    }
  };

  // Determine combined loading state
  const isLoading = formLoading || isAuthLoading;

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

                <Button
                  type='submit'
                  className='w-full'
                  disabled={isLoading || !email}>
                  {isLoading && activeTab === "email"
                    ? "Sending Magic Link..."
                    : "Login with Email"}
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
                  disabled={isLoading || !phoneNumber}>
                  {isLoading && activeTab === "sms"
                    ? "Sending Code..."
                    : "Login with SMS"}
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
                {isLoading && activeTab === "social"
                  ? "Connecting..."
                  : "Continue with Google"}
              </Button>

              <Button
                type='button'
                className='w-full'
                variant='outline'
                onClick={() => handleOAuthLogin(OAuthProvider.APPLE)}
                disabled={isLoading}>
                {isLoading && activeTab === "social"
                  ? "Connecting..."
                  : "Continue with Apple"}
              </Button>

              <Button
                type='button'
                className='w-full'
                variant='outline'
                onClick={() => handleOAuthLogin(OAuthProvider.GITHUB)}
                disabled={isLoading}>
                {isLoading && activeTab === "social"
                  ? "Connecting..."
                  : "Continue with GitHub"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Error display */}
        {displayError && (
          <Alert variant='destructive' className='mt-4'>
            <AlertDescription>{displayError.message}</AlertDescription>
          </Alert>
        )}
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
