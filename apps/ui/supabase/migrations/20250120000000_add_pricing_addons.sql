-- Create pricing add-ons table for usage-based features
CREATE TABLE IF NOT EXISTS pricing_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL, -- 'execution_pack', 'premium_feature', 'professional_service'
  price_monthly INTEGER NOT NULL, -- Price in cents
  price_yearly INTEGER, -- Optional yearly price
  unit_type VARCHAR(50), -- 'per_month', 'one_time', 'per_execution', 'per_user'
  unit_value INTEGER, -- Number of units (e.g., 10000 executions, 1 user)
  available_tiers TEXT[], -- Array of tier names this addon is available for
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert usage-based add-ons
INSERT INTO pricing_addons (name, description, category, price_monthly, price_yearly, unit_type, unit_value, available_tiers, features) VALUES

-- Execution Volume Packs
('Execution Pack Small', 'Additional 10,000 executions per month', 'execution_pack', 1500, NULL, 'per_month', 10000, 
 ARRAY['Starter', 'Pro', 'Business'], 
 '["10,000 additional executions", "No expiration", "Auto-scales with usage"]'::jsonb),

('Execution Pack Medium', 'Additional 50,000 executions per month', 'execution_pack', 6500, NULL, 'per_month', 50000,
 ARRAY['Pro', 'Business', 'Protocol'], 
 '["50,000 additional executions", "Better value per execution", "Priority processing"]'::jsonb),

('Execution Pack Large', 'Additional 250,000 executions per month', 'execution_pack', 27500, NULL, 'per_month', 250000,
 ARRAY['Business', 'Protocol', 'Enterprise'], 
 '["250,000 additional executions", "Best value per execution", "Dedicated processing"]'::jsonb),

('Execution Pack Enterprise', 'Additional 1,000,000 executions per month', 'execution_pack', 99900, NULL, 'per_month', 1000000,
 ARRAY['Protocol', 'Enterprise'], 
 '["1,000,000 additional executions", "Enterprise-grade processing", "Custom SLA"]'::jsonb),

-- Premium Features
('Voice Assistant Pro', 'Human-like AI voice calls with advanced capabilities', 'premium_feature', 2900, 30450, 'per_month', 1,
 ARRAY['Pro', 'Business', 'Protocol', 'Enterprise'],
 '["Human-like voice synthesis", "Multi-language support", "Call recording", "Advanced voice commands", "Portfolio management via voice"]'::jsonb),

('Advanced AI Models', 'Access to GPT-4, Claude-3, and other premium AI models', 'premium_feature', 4900, 51450, 'per_month', 1,
 ARRAY['Pro', 'Business', 'Protocol', 'Enterprise'],
 '["GPT-4 and Claude-3 access", "Enhanced workflow generation", "Better natural language understanding", "Advanced trading strategies"]'::jsonb),

('Priority Execution', 'Get 2x faster workflow processing and execution', 'premium_feature', 9900, 103950, 'per_month', 1,
 ARRAY['Business', 'Protocol', 'Enterprise'],
 '["2x faster processing", "Priority queue access", "Guaranteed execution times", "Real-time monitoring"]'::jsonb),

('Advanced Analytics', 'ML-powered insights and performance analytics', 'premium_feature', 7900, 82950, 'per_month', 1,
 ARRAY['Business', 'Protocol', 'Enterprise'],
 '["ML-powered insights", "Predictive analytics", "Custom dashboards", "Performance optimization", "ROI tracking"]'::jsonb),

('Additional Team Members', 'Add more team members to your workspace', 'premium_feature', 2500, 26250, 'per_user', 1,
 ARRAY['Business', 'Protocol', 'Enterprise'],
 '["Per additional user", "Full team permissions", "Shared workflows", "Collaborative editing"]'::jsonb),

-- Professional Services
('Custom Block Development', 'Get a custom automation block built for your specific needs', 'professional_service', 19900, NULL, 'one_time', 1,
 ARRAY['Business', 'Protocol', 'Enterprise'],
 '["Custom block development", "Full source code", "Documentation", "Integration support", "30-day warranty"]'::jsonb),

('Setup & Training', 'Professional onboarding and team training', 'professional_service', 50000, NULL, 'one_time', 1,
 ARRAY['Business', 'Protocol', 'Enterprise'],
 '["Professional setup", "Team training sessions", "Best practices guide", "Custom workflows", "30 days support"]'::jsonb),

('Custom Integration', 'Custom API integration with your existing systems', 'professional_service', 100000, NULL, 'one_time', 1,
 ARRAY['Protocol', 'Enterprise'],
 '["Custom API integration", "Full documentation", "Testing & validation", "90 days support", "Maintenance included"]'::jsonb),

('Dedicated Support', 'Get dedicated support with guaranteed response times', 'professional_service', 50000, 525000, 'per_month', 1,
 ARRAY['Protocol', 'Enterprise'],
 '["Dedicated support agent", "2-hour response time", "Phone support", "Weekly check-ins", "Priority bug fixes"]'::jsonb);

-- Create indexes for better performance
CREATE INDEX idx_pricing_addons_category ON pricing_addons(category);
CREATE INDEX idx_pricing_addons_available_tiers ON pricing_addons USING GIN(available_tiers);
CREATE INDEX idx_pricing_addons_active ON pricing_addons(is_active);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_pricing_addons_updated_at BEFORE UPDATE ON pricing_addons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 