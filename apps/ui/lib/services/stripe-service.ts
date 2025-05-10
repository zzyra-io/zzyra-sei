import { createClient } from "@/lib/supabase/client"
import type { SubscriptionTier } from "./subscription-service"

// Price IDs from your Stripe dashboard
const PRICE_IDS = {
  free: null, // Free tier doesn't have a price ID
  pro: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || "price_pro",
  enterprise: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID || "price_enterprise",
}

export class StripeService {
  private supabase = createClient()

  async createCheckoutSession(tier: Exclude<SubscriptionTier, "free">) {
    try {
      const user = (await this.supabase.auth.getUser()).data.user

      if (!user) {
        throw new Error("User not authenticated")
      }

      const { data, error } = await this.supabase.functions.invoke("create-checkout-session", {
        body: {
          priceId: PRICE_IDS[tier],
          userId: user.id,
          customerEmail: user.email,
        },
      })

      if (error) {
        throw error
      }

      return data.url
    } catch (error) {
      console.error("Error creating checkout session:", error)
      throw error
    }
  }

  async createCustomerPortalSession() {
    try {
      const user = (await this.supabase.auth.getUser()).data.user

      if (!user) {
        throw new Error("User not authenticated")
      }

      const { data, error } = await this.supabase.functions.invoke("create-customer-portal", {
        body: {
          userId: user.id,
        },
      })

      if (error) {
        throw error
      }

      return data.url
    } catch (error) {
      console.error("Error creating customer portal session:", error)
      throw error
    }
  }

  async cancelSubscription() {
    try {
      const user = (await this.supabase.auth.getUser()).data.user

      if (!user) {
        throw new Error("User not authenticated")
      }

      const { error } = await this.supabase.functions.invoke("cancel-subscription", {
        body: {
          userId: user.id,
        },
      })

      if (error) {
        throw error
      }

      return { success: true }
    } catch (error) {
      console.error("Error canceling subscription:", error)
      throw error
    }
  }
}

export const stripeService = new StripeService()
