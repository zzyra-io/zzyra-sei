/**
 * Magic Login Form
 *
 * A form component for Magic Link authentication with email, SMS, or OAuth providers.
 * Uses the unified auth system with Zustand store.
 */

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
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
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/use-auth";

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
  const [email, setEmail] = useState("");
  const [activeTab, setActiveTab] = useState<string>("email");
  const { isAuthenticated, isLoading, error, executeLogin, clearError } =
    useAuth();

  // Handle authentication success
  useEffect(() => {
    if (isAuthenticated && onSuccess) {
      console.log("Authentication successful, redirecting...");
      onSuccess();
    }
  }, [isAuthenticated, onSuccess]);

  // Handle email login with Magic Link
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isLoading) return;

    clearError();

    try {
      // Validate email format
      if (!email.includes("@") || !email.includes(".")) {
        throw new Error("Please enter a valid email address");
      }

      console.log("MagicLoginForm: Starting Magic Link login for", email);
      await executeLogin({ email });
    } catch (err) {
      console.error("MagicLoginForm: Email login failed:", err);
    }
  };

  // Show loading state when authenticating
  if (isLoading) {
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
              Processing authentication...
            </p>
            <p className='mt-1 text-xs text-muted-foreground'>
              This may take a moment. Please wait.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show success state if already authenticated
  if (isAuthenticated) {
    return (
      <Card className='w-full max-w-md mx-auto'>
        <CardHeader>
          <CardTitle>Authentication Successful</CardTitle>
          <CardDescription>You are now logged in</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex flex-col items-center justify-center p-4'>
            <p className='mt-2 text-sm text-muted-foreground'>
              Redirecting to dashboard...
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

      {error && (
        <Alert variant='destructive' className='mx-6 mb-4'>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className='grid w-full grid-cols-1'>
            <TabsTrigger value='email'>Email</TabsTrigger>
          </TabsList>

          <TabsContent value='email' className='space-y-4'>
            <form onSubmit={handleEmailLogin} className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='email'>Email</Label>
                <Input
                  id='email'
                  type='email'
                  placeholder='Enter your email'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
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
                  "Send Magic Link"
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
