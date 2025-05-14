/**
 * Magic Login Form Component
 *
 * A form component for Magic Link authentication with email, SMS, or OAuth providers.
 */

import { useState } from "react";
import { useMagicAuth } from "@/hooks/useMagicAuth";
import { OAuthProvider } from "@zyra/wallet";
import { POLYGON_MUMBAI } from "@zyra/wallet";
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
  redirectAfterLogin?: string;
}

/**
 * Magic Login Form Component
 */
export function MagicLoginForm({
  defaultChainId = POLYGON_MUMBAI.toString(),
  onSuccess,
}: MagicLoginFormProps) {
  // Login method state
  const [activeTab, setActiveTab] = useState("email");

  // Form states
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Auth context
  const { loginWithEmail, loginWithSMS, loginWithOAuth, isLoading } =
    useMagicAuth();

  // Handle email login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);

    try {
      // Magic will handle the UI for checking email
      await loginWithEmail(email, defaultChainId);
      if (onSuccess) onSuccess();
    } catch (err) {
      // Only handle actual errors, not the pending state
      // which is managed by Magic's UI
      setError(err instanceof Error ? err : new Error("Login failed"));
    } finally {
      setLoading(false);
    }
  };

  // Handle SMS login
  const handleSMSLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) return;

    try {
      await loginWithSMS(phoneNumber, defaultChainId);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("SMS login failed:", error);
    }
  };

  // Handle OAuth login
  const handleOAuthLogin = async (provider: OAuthProvider) => {
    try {
      await loginWithOAuth(provider, defaultChainId);
      // Note: Success callback happens after redirect
    } catch (error) {
      console.error(`${provider} login failed:`, error);
    }
  };

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
                    disabled={loading}
                    required
                  />
                </div>

                <Button
                  type='submit'
                  className='w-full'
                  disabled={loading || !email}>
                  {loading ? "Sending Magic Link..." : "Login with Email"}
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
                    required
                  />
                </div>

                <Button
                  type='submit'
                  className='w-full'
                  disabled={isLoading || !phoneNumber}>
                  {isLoading ? "Sending Code..." : "Login with SMS"}
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
                <svg className='mr-2 h-4 w-4' viewBox='0 0 24 24'>
                  <path
                    d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
                    fill='#4285F4'
                  />
                  <path
                    d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
                    fill='#34A853'
                  />
                  <path
                    d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
                    fill='#FBBC05'
                  />
                  <path
                    d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
                    fill='#EA4335'
                  />
                </svg>
                Continue with Google
              </Button>

              <Button
                type='button'
                className='w-full'
                variant='outline'
                onClick={() => handleOAuthLogin(OAuthProvider.APPLE)}
                disabled={isLoading}>
                <svg className='mr-2 h-4 w-4' viewBox='0 0 24 24'>
                  <path
                    d='M16.2 0H7.8C3.49 0 0 3.49 0 7.8v8.4C0 20.51 3.49 24 7.8 24h8.4c4.31 0 7.8-3.49 7.8-7.8V7.8C24 3.49 20.51 0 16.2 0zm3.12 16.74c-.17.43-.44.82-.79 1.13-.33.3-.7.54-1.13.71-.42.17-.87.26-1.33.26-.87 0-1.66-.36-2.22-.94-.56.58-1.35.94-2.22.94-.46 0-.91-.09-1.33-.26-.43-.17-.8-.42-1.13-.71-.35-.31-.62-.7-.79-1.13-.18-.43-.27-.89-.27-1.37 0-.84.34-1.68.94-2.29 1.24-1.24 3.09-1.21 4.3-.11.53-.49 1.2-.76 1.9-.76.52 0 1.02.16 1.44.43.42.27.77.65 1.02 1.1.25.46.38.97.38 1.5 0 .48-.09.94-.27 1.37z'
                    fill='#000'
                  />
                </svg>
                Continue with Apple
              </Button>

              <Button
                type='button'
                className='w-full'
                variant='outline'
                onClick={() => handleOAuthLogin(OAuthProvider.GITHUB)}
                disabled={isLoading}>
                <svg className='mr-2 h-4 w-4' viewBox='0 0 24 24'>
                  <path
                    d='M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12'
                    fill='#24292e'
                  />
                </svg>
                Continue with GitHub
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Error display */}
        {error && (
          <Alert variant='destructive' className='mt-4'>
            <AlertDescription>{error.message}</AlertDescription>
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
