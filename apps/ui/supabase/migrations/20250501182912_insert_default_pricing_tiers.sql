-- Insert default pricing tiers with new strategic pricing structure
-- Clear existing tiers first
DELETE FROM pricing_tiers;

-- Insert new pricing tiers based on 2025 pricing strategy
INSERT INTO pricing_tiers (name, description, price_monthly, price_yearly, workflow_limit, execution_limit, features) VALUES

-- Free tier (Community Plan)
('Community', 'For individuals just getting started with Web3 automation', 0, 0, 5, 1000, '[
  "Basic workflow builder",
  "Core automation blocks", 
  "3-day execution history",
  "Email notifications",
  "Community support",
  "1 connected wallet",
  "3 AI generations/day"
]'::jsonb),

-- Starter tier
('Starter', 'For non-technical users and airdrop hunters', 1900, 19800, 25, 5000, '[
  "Everything in Community",
  "Standard DeFi automation blocks",
  "Airdrop monitoring", 
  "Basic NFT tracking",
  "7-day execution history",
  "2 connected wallets",
  "5 AI workflow generations/day"
]'::jsonb),

-- Pro tier  
('Pro', 'For DeFi power users and NFT collectors', 7900, 82740, 100, 25000, '[
  "Everything in Starter",
  "Advanced DeFi blocks (yield farming, liquidity)",
  "NFT automation (floor alerts, auto-bidding)",
  "Multi-chain support (5 chains)",
  "Voice assistant integration (Beta)",
  "Slack/Discord notifications",
  "Priority support",
  "30-day execution history",
  "Gas optimization tools",
  "10 connected wallets",
  "20 AI generations/day"
]'::jsonb),

-- Business tier
('Business', 'For portfolio managers and trading teams', 19900, 208290, 500, 100000, '[
  "Everything in Pro",
  "Team collaboration (10 users)",
  "Custom block creation",
  "Advanced analytics & reporting",
  "Multi-portfolio management", 
  "All chain support",
  "API access (10,000 calls/month)",
  "Voice assistant (full features)",
  "90-day execution history",
  "Custom integrations",
  "25 connected wallets",
  "Unlimited AI generations"
]'::jsonb),

-- Protocol tier
('Protocol', 'For DAOs, protocols, and institutional users', 49900, 522390, -1, 500000, '[
  "Everything in Business",
  "Team management (50 users)",
  "Treasury automation blocks",
  "Multi-sig workflow automation",
  "Governance automation",
  "Custom protocol integrations",
  "Dedicated account manager",
  "Advanced security features",
  "White-label options",
  "1-year execution history",
  "API access (100,000 calls/month)",
  "100 connected wallets"
]'::jsonb),

-- Enterprise tier
('Enterprise', 'For large protocols, institutions, and hedge funds', 149900, 1559000, -1, -1, '[
  "Everything in Protocol",
  "On-premise deployment options",
  "Custom AI model training", 
  "Dedicated infrastructure",
  "24/7 phone support",
  "Custom SLA (99.9% uptime)",
  "Professional services included",
  "Custom feature development",
  "Unlimited API access",
  "Advanced compliance features",
  "Unlimited wallets and users"
]'::jsonb);

-- Price values are in cents (e.g., 1900 = $19.00)
-- -1 indicates unlimited for workflow_limit and execution_limit
-- Yearly prices include ~15% discount for annual commitment