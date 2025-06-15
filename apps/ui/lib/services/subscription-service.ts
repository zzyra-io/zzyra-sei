import type { Database } from "@/types/supabase";

type Tables = Database["public"]["Tables"];

/** Represents a subscription with its associated pricing tier */
type SubscriptionWithTier = Tables["subscriptions"]["Row"] & {
  pricing_tiers: Tables["pricing_tiers"]["Row"];
};

/** Represents a pricing tier with its features and limits */
type PricingTier = Tables["pricing_tiers"]["Row"];

/** Valid resource types for usage tracking */
type ResourceType = "workflow_execution" | "workflow";

/** Valid billing intervals */
type BillingInterval = "month" | "year";

/** Service for managing subscriptions, usage tracking, and billing operations */
class SubscriptionService {
  constructor() {}

  /**
   * Get the current active subscription for the user
   * @returns The active subscription with its pricing tier, or null if none exists
   */
  async getCurrentSubscription() {
    return null;
    // const { data: subscription, error } = await this.supabase
    //   .from('subscriptions')
    //   .select('*, pricing_tiers(*)')
    //   .eq('status', 'active')
    //   .single()
    // if (error || !subscription) {
    //   console.error('Error fetching subscription:', error)
    //   return null
    // }
    // return subscription as SubscriptionWithTier
  }

  /**
   * Get all available pricing tiers
   * @returns Array of pricing tiers sorted by monthly price
   */
  async getPricingTiers() {
    return [];
    // const { data: tiers, error } = await this.supabase
    //   .from('pricing_tiers')
    //   .select('*')
    //   .order('price_monthly')
    // if (error || !tiers) {
    //   console.error('Error fetching pricing tiers:', error)
    //   return []
    // }
    // return tiers
  }

  /**
   * Create a Stripe checkout session for subscription purchase
   * @param tierId - ID of the pricing tier to subscribe to
   * @param interval - Billing interval (month/year)
   * @returns Checkout session URL or null if creation fails
   */
  async createCheckoutSession(tierId: string, interval: BillingInterval) {
    // const response = await fetch('/api/billing/checkout', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ tierId, interval })
    // })
    // if (!response.ok) {
    //   const error = await response.json()
    //   throw new Error(error.message)
    // }
    // return response.json()
  }

  /**
   * Cancel the current subscription
   * @throws Error if cancellation fails
   */
  async cancelSubscription(): Promise<void> {
    // const response = await fetch("/api/billing/cancel", {
    //   method: "POST",
    // });
    // if (!response.ok) {
    //   const error = await response.json();
    //   throw new Error(error.message);
    // }
  }

  /**
   * Get the current usage metrics for workflows and executions
   * @returns Object containing workflow and execution counts
   */
  async getUsage(): Promise<{ workflows: number; executions: number }> {
    return { workflows: 0, executions: 0 };
    //   const subscription = await this.getCurrentSubscription();
    // if (!subscription) return { workflows: 0, executions: 0 }

    // const { data: usage, error } = await this.supabase
    //   .from('usage_logs')
    //   .select('resource_type, quantity')
    //   .eq('subscription_id', subscription.id)
    //   .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    // if (error || !usage) {
    //   console.error('Error fetching usage:', error)
    //   return { workflows: 0, executions: 0 }
    // }

    // const executions = usage
    //   .filter(u => u.resource_type === 'workflow_execution')
    //   .reduce((acc, u) => acc + (u.quantity || 0), 0)

    // const workflows = usage
    //   .filter(u => u.resource_type === 'workflow')
    //   .reduce((acc, u) => acc + (u.quantity || 0), 0)

    // return { workflows, executions }
  }

  /**
   * Check if the user has exceeded their usage limit
   * @param type - Type of resource to check (execution/workflow)
   * @returns True if under limit, false if exceeded
   */
  private async checkLimit(type: "execution" | "workflow") {
    // const subscription = await this.getCurrentSubscription();
    // if (!subscription?.pricing_tiers) return false;
    // const { executions, workflows } = await this.getUsage();
    // return type === "execution"
    //   ? executions < subscription.pricing_tiers.execution_limit
    //   : workflows < subscription.pricing_tiers.workflow_limit;
  }

  /**
   * Check if the user can execute another workflow
   * @returns True if execution is allowed, false if limit reached
   */
  async canExecuteWorkflow(): Promise<boolean> {
    // return this.checkLimit("execution");
    return true;
  }

  /**
   * Check if the user can create another workflow
   * @returns True if creation is allowed, false if limit reached
   */
  async canCreateWorkflow(): Promise<boolean> {
    return true;
  }

  /**
   * Increment usage count for a specific resource type
   * @param type - Type of resource (workflow_execution/workflow)
   * @throws Error if increment fails
   */
  private async incrementUsage(type: ResourceType): Promise<void> {
    const subscription = await this.getCurrentSubscription();
    // if (!subscription) {
    //   console.error("No active subscription found");
    //   return;
    // }

    // const { error } = await this.supabase.from("usage_logs").insert({
    //   subscription_id: subscription.id,
    //   resource_type: type,
    //   quantity: 1,
    // });

    // if (error) {
    //   console.error(`Error incrementing ${type} count:`, error);
    //   throw error;
    // }
  }

  /**
   * Increment the workflow execution count
   * @throws Error if increment fails
   */
  async incrementExecutionCount(): Promise<void> {
    return this.incrementUsage("workflow_execution");
  }

  /**
   * Increment the workflow count
   * @throws Error if increment fails
   */
  async incrementWorkflowCount(): Promise<void> {
    return this.incrementUsage("workflow");
  }
}

export const subscriptionService = new SubscriptionService();
