"use client"

import { useEffect, useState } from "react"
import { AuthGate } from "@/components/auth-gate"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { subscriptionService } from "@/lib/services/subscription-service"
import { Check } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

type BillingInterval = 'month' | 'year'

interface PricingTier {
  id: string
  name: string
  description: string
  price_monthly: number
  price_yearly: number
  features: string[]
}

interface Subscription {
  pricing_tiers: PricingTier
}

function formatPrice(price: number, interval: BillingInterval): string {
  const amount = price / 100
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount) + (interval === 'month' ? '/mo' : '/yr')
}

export default function PricingPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTier, setSelectedTier] = useState<string | null>(null)
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([])
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null)
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('month')
  const { toast } = useToast()

  useEffect(() => {
    async function loadData() {
      try {
        const [tiers, subscription] = await Promise.all([
          subscriptionService.getPricingTiers(),
          subscriptionService.getCurrentSubscription()
        ])
        setPricingTiers(tiers)
        setCurrentSubscription(subscription)
        if (subscription) {
          setSelectedTier(subscription.pricing_tiers.id)
        }
      } catch (error) {
        console.error('Error loading pricing data:', error)
        toast({
          title: 'Error loading pricing data',
          description: 'Please refresh the page to try again.',
          variant: 'destructive'
        })
      }
    }
    loadData()
  }, [toast])

  const handleSubscribe = async (tierId: string) => {
    if (isLoading) return
    setIsLoading(true)
    try {
      const { url } = await subscriptionService.createCheckoutSession(tierId, billingInterval) || {}
      if (url) {
        window.location.href = url
      } else {
        throw new Error('No checkout URL received')
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      toast({
        title: 'Error creating checkout session',
        description: 'Please try again later.',
        variant: 'destructive'
      })
      setIsLoading(false)
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
              
              <div className="mt-8 flex items-center justify-center gap-4">
                <Label htmlFor="billing-interval">Monthly</Label>
                <Switch
                  id="billing-interval"
                  checked={billingInterval === 'year'}
                  onCheckedChange={(checked) => setBillingInterval(checked ? 'year' : 'month')}
                />
                <Label htmlFor="billing-interval" className="flex items-center gap-2">
                  Yearly
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                    Save 20%
                  </span>
                </Label>
              </div>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {pricingTiers.map((tier) => (
                <Card 
                  key={tier.id} 
                  className={`flex flex-col ${tier.name === 'Pro' ? 'border-primary' : ''}`}
                >
                  <CardHeader>
                    {tier.name === 'Pro' && (
                      <div className="mb-2 w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        Most Popular
                      </div>
                    )}
                    <CardTitle>{tier.name}</CardTitle>
                    <CardDescription>{tier.description}</CardDescription>
                    <div className="mt-4">
                      <span className="text-3xl font-bold">
                        {formatPrice(
                          billingInterval === 'month' ? tier.price_monthly : tier.price_yearly,
                          billingInterval
                        )}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ul className="space-y-2">
                      {tier.features.map((feature, index) => (
                        <li key={index} className="flex items-center">
                          <Check className="mr-2 h-4 w-4 text-green-500" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button
                      onClick={() => handleSubscribe(tier.id)}
                      disabled={isLoading}
                      variant={tier.name === 'Pro' ? 'default' : 'outline'}
                      className="w-full"
                    >
                      {isLoading && selectedTier === tier.id
                        ? 'Processing...'
                        : currentSubscription?.pricing_tiers.id === tier.id
                        ? 'Current Plan'
                        : 'Subscribe'}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>
    </AuthGate>
  )
}
