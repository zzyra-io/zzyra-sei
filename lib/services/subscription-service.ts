import { createClient } from "@/lib/supabase/client"

export type SubscriptionTier = "free" | "pro" | "enterprise"
export type SubscriptionStatus = "active" | "canceled" | "past_due" | "trialing"

export interface SubscriptionDetails {
  tier: SubscriptionTier
  status: SubscriptionStatus
  expiresAt: string | null
  monthlyExecutionQuota: number
  monthlyExecutionsUsed: number
  features: {
    premiumTemplates: boolean
    customCode: boolean
    prioritySupport: boolean
    apiAccess: boolean
    teamMembers: number
    executionsPerMonth: number
    historyRetentionDays: number
  }
}

export class SubscriptionService {
  private supabase = createClient()

  async getUserSubscription(): Promise<SubscriptionDetails> {
    try {
      const user = (await this.supabase.auth.getUser()).data.user

      if (!user) {
        throw new Error("User not authenticated")
      }

      const { data: profile, error } = await this.supabase
        .from("profiles")
        .select(
          "subscription_tier, subscription_status, subscription_expires_at, monthly_execution_quota, monthly_executions_used",
        )
        .eq("id", user.id)
        .single()

      if (error) {
        console.error("Error fetching user subscription:", error)
        throw error
      }

      return this.getSubscriptionDetails(
        profile.subscription_tier as SubscriptionTier,
        profile.subscription_status as SubscriptionStatus,
        profile.subscription_expires_at,
        profile.monthly_execution_quota,
        profile.monthly_executions_used,
      )
    } catch (error) {
      console.error("Error in getUserSubscription:", error)
      throw error
    }
  }

  async updateSubscription(tier: SubscriptionTier): Promise<SubscriptionDetails> {
    try {
      const user = (await this.supabase.auth.getUser()).data.user

      if (!user) {
        throw new Error("User not authenticated")
      }

      // In a real implementation, this would integrate with a payment provider
      // For now, we'll just update the user's subscription tier
      const expiresAt = new Date()
      expiresAt.setMonth(expiresAt.getMonth() + 1)

      const { data: profile, error } = await this.supabase
        .from("profiles")
        .update({
          subscription_tier: tier,
          subscription_status: "active",
          subscription_expires_at: expiresAt.toISOString(),
          monthly_execution_quota: tier === "free" ? 100 : tier === "pro" ? 1000 : 10000,
        })
        .eq("id", user.id)
        .select(
          "subscription_tier, subscription_status, subscription_expires_at, monthly_execution_quota, monthly_executions_used",
        )
        .single()

      if (error) {
        console.error("Error updating subscription:", error)
        throw error
      }

      return this.getSubscriptionDetails(
        profile.subscription_tier as SubscriptionTier,
        profile.subscription_status as SubscriptionStatus,
        profile.subscription_expires_at,
        profile.monthly_execution_quota,
        profile.monthly_executions_used,
      )
    } catch (error) {
      console.error("Error in updateSubscription:", error)
      throw error
    }
  }

  async incrementExecutionCount(): Promise<void> {
    try {
      const user = (await this.supabase.auth.getUser()).data.user

      if (!user) {
        throw new Error("User not authenticated")
      }

      const { error } = await this.supabase.rpc("increment_execution_count", {
        user_id: user.id,
      })

      if (error) {
        console.error("Error incrementing execution count:", error)
        throw error
      }
    } catch (error) {
      console.error("Error in incrementExecutionCount:", error)
      throw error
    }
  }

  async canExecuteWorkflow(): Promise<boolean> {
    try {
      const subscription = await this.getUserSubscription()
      return subscription.monthlyExecutionsUsed < subscription.monthlyExecutionQuota
    } catch (error) {
      console.error("Error in canExecuteWorkflow:", error)
      return false
    }
  }

  private getSubscriptionDetails(
    tier: SubscriptionTier,
    status: SubscriptionStatus,
    expiresAt: string | null,
    quota: number,
    used: number,
  ): SubscriptionDetails {
    // Define features based on tier
    const features = {
      free: {
        premiumTemplates: false,
        customCode: false,
        prioritySupport: false,
        apiAccess: false,
        teamMembers: 1,
        executionsPerMonth: 100,
        historyRetentionDays: 7,
      },
      pro: {
        premiumTemplates: true,
        customCode: true,
        prioritySupport: false,
        apiAccess: true,
        teamMembers: 3,
        executionsPerMonth: 1000,
        historyRetentionDays: 30,
      },
      enterprise: {
        premiumTemplates: true,
        customCode: true,
        prioritySupport: true,
        apiAccess: true,
        teamMembers: 10,
        executionsPerMonth: 10000,
        historyRetentionDays: 90,
      },
    }

    return {
      tier,
      status,
      expiresAt,
      monthlyExecutionQuota: quota,
      monthlyExecutionsUsed: used,
      features: {
        premiumTemplates: tier !== "free",
        customCode: tier !== "free",
        prioritySupport: tier === "enterprise",
        apiAccess: tier !== "free",
        teamMembers: features[tier].teamMembers,
        executionsPerMonth: features[tier].executionsPerMonth,
        historyRetentionDays: features[tier].historyRetentionDays,
      },
    }
  }
}

export const subscriptionService = new SubscriptionService()
