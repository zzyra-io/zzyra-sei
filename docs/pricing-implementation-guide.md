# Zzyra Pricing Implementation Guide

## Step-by-Step Migration to New Pricing Structure

**Version**: 1.0  
**Date**: January 2025  
**Owner**: Engineering & Product Teams

## Overview

This guide provides step-by-step instructions for implementing Zzyra's new 5-tier pricing structure, migrating existing users, and updating all related systems.

## Database Changes Applied

### 1. Updated Pricing Tiers ✅

**File**: `apps/ui/supabase/migrations/20250501182912_insert_default_pricing_tiers.sql`

**Changes**:

- Replaced 3-tier structure with 5-tier structure
- Updated pricing from undervalued $29/month to market-aligned $79/month for Pro
- Added Community (Free), Starter, Business, Protocol, Enterprise tiers
- Enhanced feature lists with Web3-specific capabilities

**New Pricing Structure**:

```sql
-- Community: $0/month (5 workflows, 1K executions)
-- Starter: $19/month (25 workflows, 5K executions)
-- Pro: $79/month (100 workflows, 25K executions)
-- Business: $199/month (500 workflows, 100K executions)
-- Protocol: $499/month (unlimited workflows, 500K executions)
-- Enterprise: $1,499/month+ (unlimited everything)
```

### 2. Added Usage-Based Add-Ons ✅

**File**: `apps/ui/supabase/migrations/20250120000000_add_pricing_addons.sql`

**New Features**:

- Execution volume packs ($15-999/month)
- Premium features (Voice Assistant Pro, Advanced AI, etc.)
- Professional services (Custom blocks, integrations)
- Per-user team member pricing

## Implementation Checklist

### Phase 1: Database & Backend (Week 1)

#### ✅ Database Schema Updates

- [x] Update pricing_tiers table with new structure
- [x] Create pricing_addons table for usage-based features
- [x] Add indexes for performance optimization
- [x] Test migration scripts in development

#### 🔄 Backend Service Updates

- [ ] Update subscription service to handle new tiers
- [ ] Implement usage tracking for execution limits
- [ ] Add billing logic for add-ons
- [ ] Update webhook handlers for Stripe integration

#### 🔄 API Updates

- [ ] Update pricing endpoints to return new tiers
- [ ] Add add-on management endpoints
- [ ] Implement usage monitoring APIs
- [ ] Add tier-specific feature flags

### Phase 2: Frontend Updates (Week 2)

#### 🔄 Pricing Page Redesign

**File**: `apps/ui/app/pricing/page.tsx`

**Status**: Partially updated, needs TypeScript fixes

**Remaining Tasks**:

- [ ] Fix TypeScript interface compatibility
- [ ] Add add-on selection interface
- [ ] Implement tier comparison table
- [ ] Add FAQ section for new pricing

#### 🔄 Dashboard Updates

- [ ] Update billing dashboard with new tiers
- [ ] Add usage tracking widgets
- [ ] Implement tier-specific feature access
- [ ] Add upgrade/downgrade flows

#### 🔄 Onboarding Flow

- [ ] Update signup flow with tier selection
- [ ] Add segment-specific onboarding paths
- [ ] Implement tier-appropriate feature introductions
- [ ] Create upgrade prompts based on usage

### Phase 3: Business Logic (Week 3)

#### 🔄 Feature Gating

- [ ] Implement workflow limits per tier
- [ ] Add execution limit enforcement
- [ ] Gate premium features by tier
- [ ] Add team collaboration controls

#### 🔄 Usage Monitoring

- [ ] Track workflow creations per user
- [ ] Monitor execution counts by tier
- [ ] Implement usage alerts and notifications
- [ ] Add overage billing logic

#### 🔄 Billing Integration

- [ ] Update Stripe product catalog
- [ ] Implement proration for tier changes
- [ ] Add add-on billing workflows
- [ ] Test payment flows end-to-end

### Phase 4: User Migration (Week 4)

#### 🔄 Existing User Migration

- [ ] Map existing users to equivalent new tiers
- [ ] Grandfather existing pricing for transition period
- [ ] Send migration notification emails
- [ ] Implement opt-in upgrade flows

#### 🔄 Communication Strategy

- [ ] Create migration announcement
- [ ] Update website with new pricing
- [ ] Prepare customer support documentation
- [ ] Train support team on new structure

## Detailed Implementation Steps

### 1. Backend Service Updates

#### Subscription Service Changes

```typescript
// Update getPricingTiers() to return new structure
interface PricingTier {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  workflow_limit: number;
  execution_limit: number;
  features: string[];
  available_addons?: PricingAddon[];
}

// Add usage tracking
interface UsageMetrics {
  workflows_created: number;
  executions_this_month: number;
  tier_limits: TierLimits;
  overages: OverageCharges[];
}
```

#### Feature Gating Implementation

```typescript
// Middleware for tier-based access control
export function requireTier(minTier: TierLevel) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userTier = req.user.subscription.tier;
    if (userTier.level < minTier) {
      return res.status(403).json({
        error: "Upgrade required",
        required_tier: minTier,
        current_tier: userTier.name,
      });
    }
    next();
  };
}
```

### 2. Frontend Updates

#### Pricing Page Components

```typescript
// Enhanced pricing card component
function PricingCard({ tier, isPopular, currentTier }) {
  return (
    <Card className={isPopular ? 'border-primary' : ''}>
      <CardHeader>
        <div className="flex items-center gap-2">
          {getTierIcon(tier.name)}
          <CardTitle>{tier.name}</CardTitle>
        </div>
        <CardDescription>{tier.description}</CardDescription>
        <PricingDisplay
          monthly={tier.price_monthly}
          yearly={tier.price_yearly}
        />
        <LimitsDisplay
          workflows={tier.workflow_limit}
          executions={tier.execution_limit}
        />
      </CardHeader>
      <CardContent>
        <FeatureList features={tier.features} />
      </CardContent>
      <CardFooter>
        <SubscribeButton
          tier={tier}
          currentTier={currentTier}
        />
      </CardFooter>
    </Card>
  );
}
```

#### Usage Dashboard Widget

```typescript
// Usage tracking component
function UsageDashboard({ usage, limits }) {
  const workflowUsage = usage.workflows / limits.workflows;
  const executionUsage = usage.executions / limits.executions;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage This Month</CardTitle>
      </CardHeader>
      <CardContent>
        <UsageBar
          label="Workflows"
          current={usage.workflows}
          limit={limits.workflows}
          percentage={workflowUsage}
        />
        <UsageBar
          label="Executions"
          current={usage.executions}
          limit={limits.executions}
          percentage={executionUsage}
        />
        {(workflowUsage > 0.8 || executionUsage > 0.8) && (
          <UpgradePrompt currentTier={user.tier} />
        )}
      </CardContent>
    </Card>
  );
}
```

### 3. Migration Scripts

#### User Tier Migration

```sql
-- Map existing users to new tiers
UPDATE users SET
  pricing_tier_id = (
    CASE current_tier
      WHEN 'Free' THEN (SELECT id FROM pricing_tiers WHERE name = 'Community')
      WHEN 'Pro' THEN (SELECT id FROM pricing_tiers WHERE name = 'Pro')
      WHEN 'Enterprise' THEN (SELECT id FROM pricing_tiers WHERE name = 'Business')
      ELSE (SELECT id FROM pricing_tiers WHERE name = 'Community')
    END
  ),
  migration_date = NOW(),
  grandfathered_pricing = true
WHERE pricing_tier_id IS NOT NULL;
```

#### Stripe Product Sync

```typescript
// Sync new products to Stripe
async function syncStripeProducts() {
  const tiers = await getPricingTiers();

  for (const tier of tiers) {
    // Create or update Stripe product
    const product = await stripe.products.create({
      name: `Zzyra ${tier.name}`,
      description: tier.description,
      metadata: {
        tier_id: tier.id,
        workflow_limit: tier.workflow_limit,
        execution_limit: tier.execution_limit,
      },
    });

    // Create price objects
    await stripe.prices.create({
      product: product.id,
      currency: "usd",
      unit_amount: tier.price_monthly,
      recurring: { interval: "month" },
    });

    await stripe.prices.create({
      product: product.id,
      currency: "usd",
      unit_amount: tier.price_yearly,
      recurring: { interval: "year" },
    });
  }
}
```

## Testing Strategy

### 1. Database Testing

- [ ] Test migration scripts in staging
- [ ] Verify data integrity after migration
- [ ] Test rollback procedures
- [ ] Performance test with production-like data

### 2. API Testing

- [ ] Test all pricing endpoints
- [ ] Verify feature gating logic
- [ ] Test usage tracking accuracy
- [ ] Load test subscription changes

### 3. Frontend Testing

- [ ] Test pricing page rendering
- [ ] Verify tier selection flows
- [ ] Test responsive design
- [ ] Cross-browser compatibility

### 4. Integration Testing

- [ ] End-to-end subscription flows
- [ ] Stripe webhook processing
- [ ] Email notification delivery
- [ ] Usage limit enforcement

## Rollout Plan

### Week 1: Internal Testing

- Deploy to staging environment
- Internal team testing
- Fix critical bugs
- Performance optimization

### Week 2: Beta Testing

- Limited beta user group (50 users)
- Gather feedback on new pricing
- Refine onboarding experience
- Adjust pricing if needed

### Week 3: Soft Launch

- 50% traffic to new pricing page
- Monitor conversion rates
- A/B test messaging and positioning
- Prepare support documentation

### Week 4: Full Launch

- 100% traffic to new pricing
- Launch marketing campaigns
- Monitor metrics closely
- Support team ready for questions

## Monitoring & Analytics

### Key Metrics to Track

- **Conversion Rate**: Free → Paid by tier
- **Upgrade Rate**: Tier upgrades per month
- **Churn Rate**: By tier and time period
- **ARPU**: Average revenue per user by tier
- **Usage Patterns**: Feature adoption by tier

### Alerts to Configure

- Unusual churn rate increases
- Conversion rate drops
- Payment processing errors
- Usage limit breaches
- Support ticket volume spikes

### Dashboard Setup

- Real-time pricing metrics
- Cohort analysis by tier
- Revenue tracking by segment
- Usage analytics by feature
- Customer feedback monitoring

## Support Documentation

### Customer-Facing Materials

- [ ] Pricing FAQ updates
- [ ] Migration guide for existing users
- [ ] Feature comparison chart
- [ ] Billing and payment help docs

### Internal Documentation

- [ ] Support team training materials
- [ ] Escalation procedures for pricing issues
- [ ] Technical troubleshooting guides
- [ ] Sales team positioning materials

## Risk Mitigation

### Technical Risks

- **Database Migration Failure**: Tested rollback procedures
- **Payment Processing Issues**: Stripe sandbox testing
- **Performance Degradation**: Load testing completed
- **Feature Gating Bugs**: Comprehensive testing suite

### Business Risks

- **Customer Backlash**: Grandfathering existing pricing
- **Conversion Rate Drop**: A/B testing and optimization
- **Support Overwhelm**: Comprehensive documentation
- **Competitive Response**: Monitor and adjust quickly

## Success Criteria

### Technical Success

- [ ] Zero-downtime deployment
- [ ] <1% payment processing errors
- [ ] Page load times <2 seconds
- [ ] 99.9% uptime during rollout

### Business Success

- [ ] Maintain >90% of existing customers
- [ ] Achieve 15% free-to-paid conversion
- [ ] 25% Starter-to-Pro upgrade rate
- [ ] <5% monthly churn on paid tiers

## Timeline Summary

| Week | Focus              | Deliverables                        |
| ---- | ------------------ | ----------------------------------- |
| 1    | Backend & Database | Migration scripts, API updates      |
| 2    | Frontend Updates   | New pricing page, dashboard updates |
| 3    | Business Logic     | Feature gating, usage tracking      |
| 4    | Migration & Launch | User migration, full rollout        |

## Next Steps

1. **Immediate** (This week):

   - Fix TypeScript errors in pricing page
   - Complete backend service updates
   - Test database migrations

2. **Short-term** (Next 2 weeks):

   - Complete frontend updates
   - Implement usage tracking
   - Prepare migration communications

3. **Launch** (Month end):
   - Execute migration plan
   - Monitor metrics closely
   - Iterate based on feedback

---

**Status**: In Progress  
**Next Review**: Weekly during implementation  
**Success Metrics**: $2M+ ARR target for Year 1
