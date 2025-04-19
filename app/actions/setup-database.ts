"use server"

import { createClient } from "@/lib/supabase/server"

export async function setupDatabase() {
  const supabase = createClient()

  console.log("Starting database setup...")

  try {
    // Create workflows table
    console.log("Creating workflows table...")
    const { error: workflowsError } = await supabase.query(`
      CREATE TABLE IF NOT EXISTS public.workflows (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        nodes JSONB DEFAULT '[]'::jsonb,
        edges JSONB DEFAULT '[]'::jsonb,
        is_public BOOLEAN DEFAULT false,
        tags TEXT[] DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS workflows_user_id_idx ON public.workflows(user_id);
      CREATE INDEX IF NOT EXISTS workflows_is_public_idx ON public.workflows(is_public);
    `)

    if (workflowsError) {
      console.error("Error creating workflows table:", workflowsError)
      return { error: `Error creating workflows table: ${workflowsError.message}` }
    }

    // Create workflow_executions table
    console.log("Creating workflow_executions table...")
    const { error: executionsError } = await supabase.query(`
      CREATE TABLE IF NOT EXISTS public.workflow_executions (
        id UUID PRIMARY KEY,
        workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL,
        started_at TIMESTAMP WITH TIME ZONE NOT NULL,
        completed_at TIMESTAMP WITH TIME ZONE,
        result JSONB,
        logs JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS workflow_executions_workflow_id_idx ON public.workflow_executions(workflow_id);
      CREATE INDEX IF NOT EXISTS workflow_executions_status_idx ON public.workflow_executions(status);
    `)

    if (executionsError) {
      console.error("Error creating workflow_executions table:", executionsError)
      return { error: `Error creating workflow_executions table: ${executionsError.message}` }
    }

    console.log("Database setup completed successfully")

    // Insert some default workflow templates
    // await insertDefaultTemplates(supabase)

    return { success: true }
  } catch (error: any) {
    console.error("Error setting up database:", error)
    return { error: `Error setting up database: ${error.message}` }
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
