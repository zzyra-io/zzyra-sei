-- Insert default pricing tiers
INSERT INTO pricing_tiers (name, description, price_monthly, price_yearly, workflow_limit, execution_limit, features) VALUES
-- Free tier
('Free', 'For individuals just getting started', 0, 0, 3, 100, '["Basic workflow templates", "7-day execution history"]'::jsonb),

-- Pro tier
('Pro', 'For power users and small teams', 2900, 29000, 10, 1000, '["All workflow templates", "30-day execution history", "Custom code blocks", "API access", "Up to 3 team members"]'::jsonb),

-- Enterprise tier
('Enterprise', 'For organizations with advanced needs', 9900, 99000, 100, 10000, '["All workflow templates", "90-day execution history", "Custom code blocks", "API access", "Up to 10 team members", "Priority support"]'::jsonb);


-- Price values are in cents (e.g., 1999 = $19.99)