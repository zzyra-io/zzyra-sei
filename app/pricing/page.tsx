"use client"

import { useState } from "react"
import { AuthGate } from "@/components/auth-gate"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { subscriptionService } from "@/lib/services/subscription-service"
import type { SubscriptionTier } from "@/lib/services/subscription-service"
import { Check, X } from "lucide-react"

export default function PricingPage() {
  const [isLoading, setIsLoading] = useState<SubscriptionTier | null>(null)
  const { toast } = useToast()

  const handleSubscribe = async (tier: SubscriptionTier) => {
    setIsLoading(tier)
    try {
      await subscriptionService.updateSubscription(tier)
      toast({
        title: "Subscription updated",
        description: `You are now subscribed to the ${tier.charAt(0).toUpperCase() + tier.slice(1)} plan.`,
      })
    } catch (error) {
      toast({
        title: "Error updating subscription",
        description: "Failed to update subscription. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(null)
    }
  }

  return (
    <AuthGate>
      <div className="flex min-h-screen flex-col">
        <DashboardHeader />
        <main className="flex-1 bg-muted/30 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Pricing Plans</h1>
              <p className="mt-4 text-lg text-muted-foreground">Choose the perfect plan for your automation needs</p>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {/* Free Plan */}
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle>Free</CardTitle>
                  <CardDescription>For individuals just getting started</CardDescription>
                  <div className="mt-4">
                    <span className="text-3xl font-bold">$0</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-2">
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-green-500" />
                      <span>100 workflow executions/month</span>
                    </li>
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-green-500" />
                      <span>Basic workflow templates</span>
                    </li>
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-green-500" />
                      <span>7-day execution history</span>
                    </li>
                    <li className="flex items-center">
                      <X className="mr-2 h-4 w-4 text-red-500" />
                      <span className="text-muted-foreground">Premium templates</span>
                    </li>
                    <li className="flex items-center">
                      <X className="mr-2 h-4 w-4 text-red-500" />
                      <span className="text-muted-foreground">Custom code blocks</span>
                    </li>
                    <li className="flex items-center">
                      <X className="mr-2 h-4 w-4 text-red-500" />
                      <span className="text-muted-foreground">API access</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={() => handleSubscribe("free")}
                    disabled={isLoading !== null}
                    variant="outline"
                    className="w-full"
                  >
                    {isLoading === "free" ? "Updating..." : "Current Plan"}
                  </Button>
                </CardFooter>
              </Card>

              {/* Pro Plan */}
              <Card className="flex flex-col border-primary">
                <CardHeader>
                  <div className="mb-2 w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    Popular
                  </div>
                  <CardTitle>Pro</CardTitle>
                  <CardDescription>For power users and small teams</CardDescription>
                  <div className="mt-4">
                    <span className="text-3xl font-bold">$29</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-2">
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-green-500" />
                      <span>1,000 workflow executions/month</span>
                    </li>
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-green-500" />
                      <span>All workflow templates</span>
                    </li>
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-green-500" />
                      <span>30-day execution history</span>
                    </li>
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-green-500" />
                      <span>Custom code blocks</span>
                    </li>
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-green-500" />
                      <span>API access</span>
                    </li>
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-green-500" />
                      <span>Up to 3 team members</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button onClick={() => handleSubscribe("pro")} disabled={isLoading !== null} className="w-full">
                    {isLoading === "pro" ? "Updating..." : "Subscribe to Pro"}
                  </Button>
                </CardFooter>
              </Card>

              {/* Enterprise Plan */}
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle>Enterprise</CardTitle>
                  <CardDescription>For organizations with advanced needs</CardDescription>
                  <div className="mt-4">
                    <span className="text-3xl font-bold">$99</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-2">
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-green-500" />
                      <span>10,000 workflow executions/month</span>
                    </li>
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-green-500" />
                      <span>All workflow templates</span>
                    </li>
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-green-500" />
                      <span>90-day execution history</span>
                    </li>
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-green-500" />
                      <span>Custom code blocks</span>
                    </li>
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-green-500" />
                      <span>API access</span>
                    </li>
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-green-500" />
                      <span>Up to 10 team members</span>
                    </li>
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-green-500" />
                      <span>Priority support</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={() => handleSubscribe("enterprise")}
                    disabled={isLoading !== null}
                    variant="outline"
                    className="w-full"
                  >
                    {isLoading === "enterprise" ? "Updating..." : "Subscribe to Enterprise"}
                  </Button>
                </CardFooter>
              </Card>
            </div>

            <div className="mt-12 rounded-lg border bg-card p-6">
              <h2 className="text-xl font-semibold">Need a custom plan?</h2>
              <p className="mt-2 text-muted-foreground">
                Contact us for custom pricing and features tailored to your organization's specific requirements.
              </p>
              <Button className="mt-4" variant="outline">
                Contact Sales
              </Button>
            </div>
          </div>
        </main>
      </div>
    </AuthGate>
  )
}
