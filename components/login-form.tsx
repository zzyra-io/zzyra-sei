"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Mail, Wallet, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { useSupabase } from "@/components/auth-provider"

export function LoginForm() {
  const { supabase } = useSupabase()
  const router = useRouter()
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSent, setIsSent] = useState(false)

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || isLoading) return

    setIsLoading(true)

    try {
      // Use signInWithOtp instead of signInWithMagicLink
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          // Don't include redirectTo in the options to avoid the hash fragment issue
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        throw error
      }

      setIsSent(true)
      toast({
        title: "Magic link sent",
        description: "Check your email for the login link",
      })
    } catch (error) {
      toast({
        title: "Login failed",
        description: "Failed to send magic link. Please try again.",
        variant: "destructive",
      })
      console.error("Login error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleWalletLogin = async () => {
    setIsLoading(true)

    try {
      // In a real implementation, this would connect to an actual wallet
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        title: "Wallet connected",
        description: "Successfully connected to your wallet",
      })

      // Redirect to dashboard after successful connection
      router.push("/dashboard")
    } catch (error) {
      toast({
        title: "Connection failed",
        description: "Failed to connect wallet. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Tabs defaultValue="email" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="email" className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          <span>Email</span>
        </TabsTrigger>
        <TabsTrigger value="wallet" className="flex items-center gap-2">
          <Wallet className="h-4 w-4" />
          <span>Wallet</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="email">
        {isSent ? (
          <div className="space-y-4 text-center p-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Check your email</h3>
              <p className="text-sm text-muted-foreground">We've sent a magic link to {email}</p>
            </div>
            <Button variant="outline" className="mt-4 w-full" onClick={() => setIsSent(false)}>
              Use a different email
            </Button>
          </div>
        ) : (
          <form onSubmit={handleMagicLinkLogin} className="space-y-4 p-6">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
                className="h-11"
              />
            </div>
            <Button type="submit" className="w-full h-11" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending magic link...
                </>
              ) : (
                <>
                  Sign in with Email
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        )}
      </TabsContent>

      <TabsContent value="wallet">
        <div className="space-y-4 p-6">
          <p className="text-sm text-muted-foreground">
            Connect your wallet to sign in securely without passwords using blockchain technology.
          </p>
          <Button onClick={handleWalletLogin} className="w-full h-11" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                Connect Wallet
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </TabsContent>
    </Tabs>
  )
}
