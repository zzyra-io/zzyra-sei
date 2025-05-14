"use client";

import type React from "react";

import { useSupabase } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { ChainType, ZyraWallet } from "@zyra/wallet";
import { ArrowRight, ExternalLink, Loader2, Mail, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const { supabase } = useSupabase();
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || isLoading) return;

    setIsLoading(true);

    try {
      // Use signInWithOtp instead of signInWithMagicLink
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          // Don't include redirectTo in the options to avoid the hash fragment issue
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        throw error;
      }

      setIsSent(true);
      toast({
        title: "Magic link sent",
        description: "Check your email for the login link",
      });
    } catch (error) {
      toast({
        title: "Login failed",
        description: "Failed to send magic link. Please try again.",
        variant: "destructive",
      });
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWalletLogin = async () => {
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email to connect a wallet",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Get Magic publishable key from environment
      const magicPublishableKey = process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY;

      if (!magicPublishableKey) {
        throw new Error("Magic publishable key not configured");
      }

      // Create a ZyraWallet instance with the existing Supabase client
      const wallet = new ZyraWallet(magicPublishableKey, {
        supabaseClient: supabase,
      });

      // Initialize the wallet
      await wallet.initialize();

      // Connect using Magic Link
      await wallet.connect(email, "84532"); // Base Sepolia chain ID

      // Generate DID token for Supabase authentication
      const didToken = await wallet.generateDIDToken();

      // Sign in to Supabase with the token
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "magic",
        token: didToken,
      });

      if (error) {
        throw error;
      }

      setIsSent(true);
      toast({
        title: "Magic link sent",
        description:
          "Check your email for the login link - after login your wallet will be automatically created",
      });

      // Note: The actual wallet creation happens during the connect process
    } catch (error) {
      console.error("Wallet connection error:", error);
      toast({
        title: "Connection failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to connect wallet. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Google OAuth login
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      if (data?.url) {
        router.push(data.url);
      }
    } catch (error: any) {
      toast({
        title: "Google login failed",
        description: error.message,
        variant: "destructive",
      });
      console.error("Google login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Tabs defaultValue='email' className='w-full'>
      <TabsList className='grid w-full grid-cols-3'>
        <TabsTrigger value='email' className='flex items-center gap-2'>
          <Mail className='h-4 w-4' />
          <span>Email</span>
        </TabsTrigger>
        <TabsTrigger value='wallet' className='flex items-center gap-2'>
          <Wallet className='h-4 w-4' />
          <span>Wallet</span>
        </TabsTrigger>
        <TabsTrigger value='google'>Google</TabsTrigger>
      </TabsList>

      <TabsContent value='email'>
        {isSent ? (
          <div className='space-y-4 text-center p-6'>
            <div className='mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10'>
              <Mail className='h-6 w-6 text-primary' />
            </div>
            <div className='space-y-2'>
              <h3 className='text-lg font-medium'>Check your email</h3>
              <p className='text-sm text-muted-foreground'>
                We've sent a magic link to {email}
              </p>
            </div>
            <Button
              variant='outline'
              className='mt-4 w-full'
              onClick={() => setIsSent(false)}>
              Use a different email
            </Button>
          </div>
        ) : (
          <form onSubmit={handleMagicLinkLogin} className='space-y-4 p-6'>
            <div className='space-y-2'>
              <Input
                type='email'
                placeholder='name@example.com'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
                className='h-11'
              />
            </div>
            <Button type='submit' className='w-full h-11' disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Sending magic link...
                </>
              ) : (
                <>
                  Sign in with Email
                  <ArrowRight className='ml-2 h-4 w-4' />
                </>
              )}
            </Button>
          </form>
        )}
      </TabsContent>

      <TabsContent value='wallet'>
        <div className='space-y-4 p-6'>
          <p className='text-sm text-muted-foreground'>
            Connect your wallet to sign in securely without passwords using
            blockchain technology with Magic Link.
          </p>

          <div className='space-y-2'>
            <Input
              type='email'
              placeholder='name@example.com'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
              className='h-11'
            />
            <p className='text-xs text-muted-foreground'>
              Your email is used to create and connect to your wallet securely
            </p>
          </div>

          <Button
            onClick={handleWalletLogin}
            className='w-full h-11'
            disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Connecting wallet...
              </>
            ) : (
              <>
                Connect Magic Wallet
                <Wallet className='ml-2 h-4 w-4' />
              </>
            )}
          </Button>

          <div className='pt-2'>
            <a
              href='https://magic.link/'
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center text-xs text-primary hover:underline'>
              Learn more about Magic Link
              <ExternalLink className='ml-1 h-3 w-3' />
            </a>
          </div>
        </div>
      </TabsContent>

      <TabsContent value='google'>
        <div className='space-y-4 p-6'>
          <Button
            onClick={handleGoogleLogin}
            className='w-full h-11 flex items-center justify-center gap-2'
            variant='outline'
            disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Signing in with Google...
              </>
            ) : (
              <>
                <svg className='h-4 w-4' viewBox='0 0 24 24'>
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
              </>
            )}
          </Button>
        </div>
      </TabsContent>
    </Tabs>
  );
}
