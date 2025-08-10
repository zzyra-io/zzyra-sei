import { Injectable, Logger } from '@nestjs/common';

export interface UserSubscription {
  userId: string;
  plan: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'expired' | 'cancelled';
  features: string[];
  expiresAt?: Date;
}

export interface FeatureAccess {
  feature: string;
  allowed: boolean;
  reason?: string;
}

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  // In-memory storage for demo purposes
  private subscriptions = new Map<string, UserSubscription>();

  constructor() {
    this.initializeDemoSubscriptions();
  }

  private initializeDemoSubscriptions(): void {
    // Demo user with pro subscription
    this.subscriptions.set('demo-user', {
      userId: 'demo-user',
      plan: 'pro',
      status: 'active',
      features: [
        'basic_ai',
        'advanced_thinking',
        'multi_step_reasoning',
        'tool_integration',
        'mcp_access',
        'blockchain_operations',
        'collaborative_thinking',
        'deliberate_thinking',
      ],
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    });

    // Free user example
    this.subscriptions.set('free-user', {
      userId: 'free-user',
      plan: 'free',
      status: 'active',
      features: ['basic_ai', 'simple_thinking'],
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });
  }

  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    return this.subscriptions.get(userId) || null;
  }

  async checkFeatureAccess(
    userId: string,
    feature: string,
  ): Promise<FeatureAccess> {
    const subscription = await this.getUserSubscription(userId);

    if (!subscription) {
      return {
        feature,
        allowed: false,
        reason: 'No subscription found',
      };
    }

    if (subscription.status !== 'active') {
      return {
        feature,
        allowed: false,
        reason: `Subscription is ${subscription.status}`,
      };
    }

    if (subscription.expiresAt && subscription.expiresAt < new Date()) {
      return {
        feature,
        allowed: false,
        reason: 'Subscription has expired',
      };
    }

    const hasFeature = subscription.features.includes(feature);

    return {
      feature,
      allowed: hasFeature,
      reason: hasFeature
        ? undefined
        : `Feature '${feature}' not included in ${subscription.plan} plan`,
    };
  }

  async canUseAdvancedThinking(userId: string): Promise<boolean> {
    const access = await this.checkFeatureAccess(userId, 'advanced_thinking');
    return access.allowed;
  }

  async canUseCollaborativeThinking(userId: string): Promise<boolean> {
    const access = await this.checkFeatureAccess(
      userId,
      'collaborative_thinking',
    );
    return access.allowed;
  }

  async canUseDeliberateThinking(userId: string): Promise<boolean> {
    const access = await this.checkFeatureAccess(userId, 'deliberate_thinking');
    return access.allowed;
  }

  async getAvailableThinkingModes(userId: string): Promise<string[]> {
    const subscription = await this.getUserSubscription(userId);

    if (!subscription || subscription.status !== 'active') {
      return ['fast']; // Only fast thinking for free users
    }

    const modes = ['fast']; // Fast thinking is always available

    if (subscription.features.includes('advanced_thinking')) {
      modes.push('deliberate');
    }

    if (subscription.features.includes('collaborative_thinking')) {
      modes.push('collaborative');
    }

    return modes;
  }

  async upgradeSubscription(
    userId: string,
    plan: 'pro' | 'enterprise',
  ): Promise<void> {
    const currentSubscription = await this.getUserSubscription(userId);

    const newFeatures =
      plan === 'pro'
        ? [
            'basic_ai',
            'advanced_thinking',
            'multi_step_reasoning',
            'tool_integration',
            'mcp_access',
            'blockchain_operations',
            'deliberate_thinking',
          ]
        : [
            'basic_ai',
            'advanced_thinking',
            'multi_step_reasoning',
            'tool_integration',
            'mcp_access',
            'blockchain_operations',
            'collaborative_thinking',
            'deliberate_thinking',
            'enterprise_features',
          ];

    const subscription: UserSubscription = {
      userId,
      plan,
      status: 'active',
      features: newFeatures,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    };

    this.subscriptions.set(userId, subscription);
    this.logger.log(`Upgraded user ${userId} to ${plan} plan`);
  }
}
