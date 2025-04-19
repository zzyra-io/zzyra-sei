"use server"

import { createClient } from "@/lib/supabase/server"

export async function setupDatabase() {
  try {
    const supabase = createClient()

    // SQL to create all required tables and set up RLS
    const sql = `
    -- Create the workflows table
    CREATE TABLE IF NOT EXISTS public.workflows (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
      edges JSONB NOT NULL DEFAULT '[]'::jsonb,
      is_public BOOLEAN NOT NULL DEFAULT false,
      tags TEXT[] NOT NULL DEFAULT '{}'::text[],
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );

    -- Create an index on user_id for faster queries
    CREATE INDEX IF NOT EXISTS workflows_user_id_idx ON public.workflows(user_id);

    -- Set up Row Level Security (RLS)
    ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

    -- Create policies for row level security
    -- Users can view their own workflows or public workflows
    CREATE POLICY IF NOT EXISTS "Users can view their own workflows or public ones" 
      ON public.workflows 
      FOR SELECT 
      USING (auth.uid() = user_id OR is_public = true);

    -- Users can insert their own workflows
    CREATE POLICY IF NOT EXISTS "Users can insert their own workflows" 
      ON public.workflows 
      FOR INSERT 
      WITH CHECK (auth.uid() = user_id);

    -- Users can update their own workflows
    CREATE POLICY IF NOT EXISTS "Users can update their own workflows" 
      ON public.workflows 
      FOR UPDATE 
      USING (auth.uid() = user_id);

    -- Users can delete their own workflows
    CREATE POLICY IF NOT EXISTS "Users can delete their own workflows" 
      ON public.workflows 
      FOR DELETE 
      USING (auth.uid() = user_id);

    -- Create the workflow_executions table
    CREATE TABLE IF NOT EXISTS public.workflow_executions (
      id UUID PRIMARY KEY,
      workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
      started_at TIMESTAMP WITH TIME ZONE NOT NULL,
      completed_at TIMESTAMP WITH TIME ZONE,
      logs JSONB NOT NULL DEFAULT '[]'::jsonb,
      results JSONB NOT NULL DEFAULT '{}'::jsonb,
      error TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );

    -- Create indexes for faster queries
    CREATE INDEX IF NOT EXISTS workflow_executions_workflow_id_idx ON public.workflow_executions(workflow_id);
    CREATE INDEX IF NOT EXISTS workflow_executions_user_id_idx ON public.workflow_executions(user_id);
    CREATE INDEX IF NOT EXISTS workflow_executions_status_idx ON public.workflow_executions(status);

    -- Set up Row Level Security (RLS)
    ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;

    -- Create policies for row level security
    -- Users can view their own execution logs
    CREATE POLICY IF NOT EXISTS "Users can view their own execution logs" 
      ON public.workflow_executions 
      FOR SELECT 
      USING (auth.uid() = user_id);

    -- Users can insert their own execution logs
    CREATE POLICY IF NOT EXISTS "Users can insert their own execution logs" 
      ON public.workflow_executions 
      FOR INSERT 
      WITH CHECK (auth.uid() = user_id);

    -- Users can update their own execution logs
    CREATE POLICY IF NOT EXISTS "Users can update their own execution logs" 
      ON public.workflow_executions 
      FOR UPDATE 
      USING (auth.uid() = user_id);

    -- Create the profiles table for user settings
    CREATE TABLE IF NOT EXISTS public.profiles (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      full_name TEXT,
      avatar_url TEXT,
      email_notifications BOOLEAN NOT NULL DEFAULT true,
      telegram_handle TEXT,
      discord_webhook TEXT,
      subscription_tier TEXT DEFAULT 'free',
      subscription_status TEXT DEFAULT 'active',
      subscription_expires_at TIMESTAMP WITH TIME ZONE,
      monthly_execution_quota INTEGER DEFAULT 100,
      monthly_executions_used INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );

    -- Create index for faster queries
    CREATE INDEX IF NOT EXISTS profiles_subscription_status_idx ON public.profiles(subscription_status);

    -- Set up Row Level Security (RLS)
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

    -- Create policies for row level security
    -- Users can view their own profile
    CREATE POLICY IF NOT EXISTS "Users can view their own profile" 
      ON public.profiles 
      FOR SELECT 
      USING (auth.uid() = id);

    -- Users can update their own profile
    CREATE POLICY IF NOT EXISTS "Users can update their own profile" 
      ON public.profiles 
      FOR UPDATE 
      USING (auth.uid() = id);

    -- Create a trigger to create a profile when a user signs up
    CREATE OR REPLACE FUNCTION public.create_profile_for_user()
    RETURNS TRIGGER AS $
    BEGIN
      INSERT INTO public.profiles (id)
      VALUES (NEW.id);
      RETURN NEW;
    END;
    $ LANGUAGE plpgsql SECURITY DEFINER;

    -- Create the trigger
    DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;
    CREATE TRIGGER create_profile_on_signup
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.create_profile_for_user();

    -- Create the workflow_templates table
    CREATE TABLE IF NOT EXISTS public.workflow_templates (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
      edges JSONB NOT NULL DEFAULT '[]'::jsonb,
      tags TEXT[] NOT NULL DEFAULT '{}'::text[],
      is_premium BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );

    -- Create index for faster queries
    CREATE INDEX IF NOT EXISTS workflow_templates_category_idx ON public.workflow_templates(category);
    CREATE INDEX IF NOT EXISTS workflow_templates_is_premium_idx ON public.workflow_templates(is_premium);

    -- Set up Row Level Security (RLS)
    ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;

    -- Create policies for row level security
    -- Everyone can view templates
    CREATE POLICY IF NOT EXISTS "Everyone can view templates" 
      ON public.workflow_templates 
      FOR SELECT 
      USING (true);

    -- Create a function to update the updated_at column
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $ LANGUAGE plpgsql;

    -- Create a trigger to automatically update the updated_at column for workflows
    DROP TRIGGER IF EXISTS update_workflows_updated_at ON public.workflows;
    CREATE TRIGGER update_workflows_updated_at
    BEFORE UPDATE ON public.workflows
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

    -- Create a trigger to automatically update the updated_at column for profiles
    DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
    CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

    -- Create a trigger to automatically update the updated_at column for workflow_templates
    DROP TRIGGER IF EXISTS update_workflow_templates_updated_at ON public.workflow_templates;
    CREATE TRIGGER update_workflow_templates_updated_at
    BEFORE UPDATE ON public.workflow_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
    `

    // Execute the SQL
    const { error } = await supabase.rpc("pgql", { query: sql })

    if (error) {
      console.error("Error setting up database:", error)
      throw new Error(`Failed to set up database: ${error.message}`)
    }

    // Insert some default workflow templates
    await insertDefaultTemplates(supabase)

    return { success: true }
  } catch (error) {
    console.error("Error in setupDatabase:", error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

async function insertDefaultTemplates(supabase: any) {
  try {
    // Check if templates already exist
    const { data: existingTemplates } = await supabase.from("workflow_templates").select("id").limit(1)

    if (existingTemplates && existingTemplates.length > 0) {
      // Templates already exist, no need to insert defaults
      return
    }

    // Define default templates
    const templates = [
      {
        id: "550e8400-e29b-41d4-a716-446655440000",
        name: "ETH Balance Monitor",
        description: "Monitor an Ethereum wallet balance and receive notifications when it falls below a threshold",
        category: "monitoring",
        nodes: [
          {
            id: "node-1",
            type: "custom",
            position: { x: 100, y: 100 },
            data: {
              label: "Wallet Monitor",
              icon: "wallet",
              blockType: "wallet",
              description: "Monitor wallet balance",
              isEnabled: true,
              config: {
                address: "",
                network: "ethereum",
              },
            },
          },
          {
            id: "node-2",
            type: "custom",
            position: { x: 350, y: 100 },
            data: {
              label: "Balance Check",
              icon: "code",
              blockType: "code",
              description: "Check if balance < threshold",
              isEnabled: true,
              config: {
                code: "// Check if balance is below threshold\nconst threshold = 1.0; // ETH\nreturn { result: balance < threshold };",
              },
            },
          },
          {
            id: "node-3",
            type: "custom",
            position: { x: 600, y: 100 },
            data: {
              label: "Send Notification",
              icon: "notification",
              blockType: "notification",
              description: "Send low balance alert",
              isEnabled: true,
              config: {
                channel: "email",
                message: "Low balance alert: Your ETH balance is below the threshold!",
              },
            },
          },
        ],
        edges: [
          {
            id: "edge-1-2",
            source: "node-1",
            target: "node-2",
            type: "default",
          },
          {
            id: "edge-2-3",
            source: "node-2",
            target: "node-3",
            type: "default",
          },
        ],
        tags: ["ethereum", "monitoring", "notification"],
        is_premium: false,
      },
      {
        id: "550e8400-e29b-41d4-a716-446655440001",
        name: "Token Price Alert",
        description: "Monitor token price and execute actions when price conditions are met",
        category: "defi",
        nodes: [
          {
            id: "node-1",
            type: "custom",
            position: { x: 100, y: 100 },
            data: {
              label: "Token Monitor",
              icon: "token",
              blockType: "token",
              description: "Monitor token price",
              isEnabled: true,
              config: {
                token: "ETH",
                interval: "5m",
              },
            },
          },
          {
            id: "node-2",
            type: "custom",
            position: { x: 350, y: 100 },
            data: {
              label: "Price Analysis",
              icon: "code",
              blockType: "code",
              description: "Check price conditions",
              isEnabled: true,
              config: {
                code: "// Check if price increased by 5%\nconst threshold = 0.05;\nconst priceChange = (currentPrice - previousPrice) / previousPrice;\nreturn { increased: priceChange > threshold, decreased: priceChange < -threshold };",
              },
            },
          },
          {
            id: "node-3",
            type: "custom",
            position: { x: 600, y: 50 },
            data: {
              label: "Buy Token",
              icon: "transaction",
              blockType: "transaction",
              description: "Execute buy transaction",
              isEnabled: true,
              config: {
                to: "",
                value: "0.1",
              },
            },
          },
          {
            id: "node-4",
            type: "custom",
            position: { x: 600, y: 150 },
            data: {
              label: "Send Alert",
              icon: "notification",
              blockType: "notification",
              description: "Send price alert",
              isEnabled: true,
              config: {
                channel: "email",
                message: "Token price alert: Significant price movement detected!",
              },
            },
          },
        ],
        edges: [
          {
            id: "edge-1-2",
            source: "node-1",
            target: "node-2",
            type: "default",
          },
          {
            id: "edge-2-3",
            source: "node-2",
            target: "node-3",
            type: "default",
          },
          {
            id: "edge-2-4",
            source: "node-2",
            target: "node-4",
            type: "default",
          },
        ],
        tags: ["defi", "trading", "price-alert"],
        is_premium: true,
      },
      {
        id: "550e8400-e29b-41d4-a716-446655440002",
        name: "NFT Floor Price Monitor",
        description: "Track NFT collection floor price and receive alerts on significant changes",
        category: "nft",
        nodes: [
          {
            id: "node-1",
            type: "custom",
            position: { x: 100, y: 100 },
            data: {
              label: "NFT Monitor",
              icon: "database",
              blockType: "database",
              description: "Monitor NFT floor price",
              isEnabled: true,
              config: {
                collection: "",
                interval: "1h",
              },
            },
          },
          {
            id: "node-2",
            type: "custom",
            position: { x: 350, y: 100 },
            data: {
              label: "Price Analysis",
              icon: "code",
              blockType: "code",
              description: "Analyze floor price changes",
              isEnabled: true,
              config: {
                code: "// Check for significant floor price changes\nconst threshold = 0.1; // 10%\nconst priceChange = (currentFloorPrice - previousFloorPrice) / previousFloorPrice;\nreturn { significant: Math.abs(priceChange) > threshold, increased: priceChange > 0 };",
              },
            },
          },
          {
            id: "node-3",
            type: "custom",
            position: { x: 600, y: 100 },
            data: {
              label: "Send Notification",
              icon: "notification",
              blockType: "notification",
              description: "Send floor price alert",
              isEnabled: true,
              config: {
                channel: "email",
                message: "NFT Floor Price Alert: Significant change detected in collection floor price!",
              },
            },
          },
        ],
        edges: [
          {
            id: "edge-1-2",
            source: "node-1",
            target: "node-2",
            type: "default",
          },
          {
            id: "edge-2-3",
            source: "node-2",
            target: "node-3",
            type: "default",
          },
        ],
        tags: ["nft", "monitoring", "price-alert"],
        is_premium: false,
      },
    ]

    // Insert templates
    const { error } = await supabase.from("workflow_templates").insert(templates)

    if (error) {
      console.error("Error inserting default templates:", error)
    }
  } catch (error) {
    console.error("Error in insertDefaultTemplates:", error)
  }
}
