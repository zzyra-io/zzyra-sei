"use client";

import { DashboardHeader } from "@/components/dashboard-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Check, Crown, Shield, Star, Zap } from "lucide-react";
import { useEffect, useState } from "react";

type BillingInterval = "month" | "year";

interface PricingTier {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  workflow_limit: number;
  execution_limit: number;
  features: any;
}

interface Subscription {
  pricing_tiers: PricingTier;
}

function formatPrice(price: number, interval: BillingInterval): string {
  const amount = price / 100;
  return (
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + (interval === "month" ? "/mo" : "/yr")
  );
}

function formatLimit(limit: number): string {
  if (limit === -1) return "Unlimited";
  if (limit >= 1000000) return `${(limit / 1000000).toFixed(0)}M`;
  if (limit >= 1000) return `${(limit / 1000).toFixed(0)}K`;
  return limit.toString();
}

function getTierIcon(tierName: string) {
  switch (tierName.toLowerCase()) {
    case "community":
      return null;
    case "starter":
      return <Star className='h-4 w-4 text-blue-500' />;
    case "pro":
      return <Zap className='h-4 w-4 text-purple-500' />;
    case "business":
      return <Shield className='h-4 w-4 text-green-500' />;
    case "protocol":
      return <Crown className='h-4 w-4 text-yellow-500' />;
    case "enterprise":
      return <Crown className='h-4 w-4 text-red-500' />;
    default:
      return null;
  }
}

function getTierVariant(tierName: string): "default" | "outline" | "secondary" {
  switch (tierName.toLowerCase()) {
    case "pro":
      return "default";
    case "business":
      return "secondary";
    default:
      return "outline";
  }
}

function isPopularTier(tierName: string): boolean {
  return tierName.toLowerCase() === "pro";
}

function getYearlySavings(monthly: number, yearly: number): number {
  if (monthly === 0 || yearly === 0) return 0;
  const monthlyAnnual = monthly * 12;
  return Math.round(((monthlyAnnual - yearly) / monthlyAnnual) * 100);
}

export default function PricingPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);
  const [currentSubscription, setCurrentSubscription] =
    useState<Subscription | null>(null);
  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>("month");
  const { toast } = useToast();

  useEffect(() => {
    async function loadData() {
      try {
        const [tiers, subscription] = await Promise.all([
          Promise.resolve([]),
          Promise.resolve(null),
        ]);
        setPricingTiers(tiers);
        setCurrentSubscription(subscription);
        if (subscription) {
          setSelectedTier(subscription.pricing_tiers.id);
        }
      } catch (error) {
        console.error("Error loading pricing data:", error);
        toast({
          title: "Error loading pricing data",
          description: "Please refresh the page to try again.",
          variant: "destructive",
        });
      }
    }
    loadData();
  }, [toast]);

  const handleSubscribe = async (tierId: string) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const { url } = (await Promise.resolve(null)) || {};
      if (url) {
        window.location.href = url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
      toast({
        title: "Error creating checkout session",
        description: "Please try again later.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className='flex min-h-screen flex-col'>
        <DashboardHeader />
        <main className='flex-1 bg-muted/30 px-4 py-6 sm:px-6 lg:px-8'>
          <div className='mx-auto max-w-7xl'>
            {/* Header Section */}
            <div className='mb-12 text-center'>
              <h1 className='text-4xl font-bold tracking-tight sm:text-5xl mb-4'>
                Pricing Plans
              </h1>
              <p className='text-xl text-muted-foreground mb-2'>
                Choose the perfect plan for your Web3 automation needs
              </p>
              <p className='text-sm text-muted-foreground mb-8'>
                From individual users to enterprise protocols - we have a plan
                that scales with you
              </p>

              {/* Billing Toggle */}
              <div className='flex items-center justify-center gap-4 mb-8'>
                <Label
                  htmlFor='billing-interval'
                  className='text-sm font-medium'>
                  Monthly
                </Label>
                <Switch
                  id='billing-interval'
                  checked={billingInterval === "year"}
                  onCheckedChange={(checked) =>
                    setBillingInterval(checked ? "year" : "month")
                  }
                />
                <Label
                  htmlFor='billing-interval'
                  className='flex items-center gap-2 text-sm font-medium'>
                  Yearly
                  <Badge variant='secondary' className='text-xs px-2 py-1'>
                    Save up to 15%
                  </Badge>
                </Label>
              </div>

              {/* Value Propositions */}
              <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 text-sm text-muted-foreground'>
                <div className='flex items-center justify-center gap-2'>
                  <Check className='h-4 w-4 text-green-500' />
                  <span>30-day money-back guarantee</span>
                </div>
                <div className='flex items-center justify-center gap-2'>
                  <Check className='h-4 w-4 text-green-500' />
                  <span>Cancel anytime</span>
                </div>
                <div className='flex items-center justify-center gap-2'>
                  <Check className='h-4 w-4 text-green-500' />
                  <span>Upgrade or downgrade instantly</span>
                </div>
              </div>
            </div>

            {/* Pricing Cards */}
            <div className='grid gap-8 lg:grid-cols-3 xl:grid-cols-5'>
              {pricingTiers.map((tier) => {
                const price =
                  billingInterval === "month"
                    ? tier.price_monthly
                    : tier.price_yearly;
                const savings = getYearlySavings(
                  tier.price_monthly,
                  tier.price_yearly
                );
                const isPopular = isPopularTier(tier.name);
                const isCurrent =
                  currentSubscription?.pricing_tiers.id === tier.id;

                return (
                  <Card
                    key={tier.id}
                    className={`relative flex flex-col ${isPopular ? "border-primary border-2 shadow-lg" : ""} ${isCurrent ? "ring-2 ring-primary/50" : ""}`}>
                    {isPopular && (
                      <div className='absolute -top-3 left-1/2 transform -translate-x-1/2'>
                        <Badge className='bg-primary text-primary-foreground px-3 py-1'>
                          Most Popular
                        </Badge>
                      </div>
                    )}

                    <CardHeader className='pb-4'>
                      <div className='flex items-center gap-2 mb-2'>
                        {getTierIcon(tier.name)}
                        <CardTitle className='text-lg'>{tier.name}</CardTitle>
                      </div>
                      <CardDescription className='text-sm leading-relaxed'>
                        {tier.description}
                      </CardDescription>

                      {/* Pricing */}
                      <div className='mt-4'>
                        <div className='flex items-baseline'>
                          <span className='text-3xl font-bold'>
                            {formatPrice(price, billingInterval)}
                          </span>
                        </div>
                        {billingInterval === "year" && savings > 0 && (
                          <div className='text-xs text-green-600 font-medium mt-1'>
                            Save {savings}% with yearly billing
                          </div>
                        )}
                      </div>

                      {/* Key Limits */}
                      <div className='mt-4 space-y-1 text-xs text-muted-foreground'>
                        <div>
                          <span className='font-medium'>
                            {formatLimit(tier.workflow_limit)}
                          </span>{" "}
                          workflows
                        </div>
                        <div>
                          <span className='font-medium'>
                            {formatLimit(tier.execution_limit)}
                          </span>{" "}
                          executions/month
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className='flex-1 pt-0'>
                      <ul className='space-y-2'>
                        {tier.features.slice(0, 6).map((feature, index) => (
                          <li key={index} className='flex items-start text-sm'>
                            <Check className='mr-2 h-3 w-3 text-green-500 mt-0.5 flex-shrink-0' />
                            <span className='leading-relaxed'>{feature}</span>
                          </li>
                        ))}
                        {tier.features.length > 6 && (
                          <li className='text-xs text-muted-foreground'>
                            + {tier.features.length - 6} more features
                          </li>
                        )}
                      </ul>
                    </CardContent>

                    <CardFooter className='pt-4'>
                      <Button
                        onClick={() => handleSubscribe(tier.id)}
                        disabled={isLoading || isCurrent}
                        variant={getTierVariant(tier.name)}
                        className='w-full'
                        size='sm'>
                        {isLoading && selectedTier === tier.id
                          ? "Processing..."
                          : isCurrent
                            ? "Current Plan"
                            : tier.price_monthly === 0
                              ? "Get Started Free"
                              : "Subscribe"}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>

            {/* Additional Information */}
            <div className='mt-16 text-center'>
              <h2 className='text-2xl font-bold mb-4'>
                Need something custom?
              </h2>
              <p className='text-muted-foreground mb-6'>
                Contact our sales team for custom pricing, additional features,
                or enterprise deployments.
              </p>
              <Button variant='outline' size='lg'>
                Contact Sales
              </Button>
            </div>

            {/* FAQ Section */}
            <div className='mt-16'>
              <h2 className='text-2xl font-bold text-center mb-8'>
                Frequently Asked Questions
              </h2>
              <div className='grid gap-6 md:grid-cols-2'>
                <div>
                  <h3 className='font-semibold mb-2'>
                    Can I upgrade or downgrade anytime?
                  </h3>
                  <p className='text-sm text-muted-foreground'>
                    Yes, you can change your plan at any time. Upgrades take
                    effect immediately, while downgrades take effect at the end
                    of your current billing cycle.
                  </p>
                </div>
                <div>
                  <h3 className='font-semibold mb-2'>
                    What happens if I exceed my limits?
                  </h3>
                  <p className='text-sm text-muted-foreground'>
                    You can purchase additional execution packs or upgrade to a
                    higher tier. We&apos;ll notify you before you reach your
                    limits.
                  </p>
                </div>
                <div>
                  <h3 className='font-semibold mb-2'>Do you offer refunds?</h3>
                  <p className='text-sm text-muted-foreground'>
                    Yes, we offer a 30-day money-back guarantee for all paid
                    plans. Contact support for assistance.
                  </p>
                </div>
                <div>
                  <h3 className='font-semibold mb-2'>Is there a free trial?</h3>
                  <p className='text-sm text-muted-foreground'>
                    Our Community plan is free forever. You can also try any
                    paid plan with our 30-day money-back guarantee.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
