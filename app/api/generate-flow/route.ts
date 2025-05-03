import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateFlowWithAI } from "@/lib/ai";
import type { Node, Edge } from "@/components/flow-canvas";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    // Create authenticated Supabase client
    const supabase = await createClient();
    // Auth
    // const {
    //   data: { session },
    // } = await supabase.auth.getSession();
    // if (!session) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }
    // const userId = session.user.id;

    // // Enforce workflow creation limit
    // const { data: subs, error: subsError } = await supabase
    //   .from("subscriptions")
    //   .select("id, pricing_tiers(workflow_limit)")
    //   .eq("user_id", userId)
    //   .eq("status", "active")
    //   .single();
    // if (subsError || !subs) {
    //   return NextResponse.json(
    //     { error: "No active subscription" },
    //     { status: 403 }
    //   );
    // }
    // const wfLimit = Array.isArray(subs.pricing_tiers)
    //   ? subs.pricing_tiers[0]?.workflow_limit ?? 0
    //   : 0;

    // // Count usage this month
    // const { data: logs, error: logsError } = await supabase
    //   .from("usage_logs")
    //   .select("quantity")
    //   .eq("subscription_id", subs.id)
    //   .eq("resource_type", "workflow")
    //   .gte(
    //     "created_at",
    //     new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    //   );
    // if (logsError)
    //   console.error("Error fetching workflow usage logs", logsError);
    // const created =
    //   logs?.reduce(
    //     (sum: number, l: { quantity: number }) => sum + l.quantity,
    //     0
    //   ) ?? 0;
    // if (created >= wfLimit) {
    //   return NextResponse.json(
    //     { error: "Workflow creation limit reached" },
    //     { status: 403 }
    //   );
    // }

    // Parse prompt and context
    const { prompt, nodes, edges } = await request.json();
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Invalid prompt" }, { status: 400 });
    }

    // Validate nodes and edges (basic check)
    if (!Array.isArray(nodes) || !Array.isArray(edges)) {
      return NextResponse.json(
        { error: "Invalid workflow context" },
        { status: 400 }
      );
    }

    // Track workflow creation
    // const { error: logError } = await supabase.from("usage_logs").insert({
    //   subscription_id: subs.id,
    //   resource_type: "workflow",
    //   quantity: 1,
    // });
    // if (logError) console.error("Error logging workflow usage", logError);

    // Generate flow with context
    const flowData = await generateFlowWithAI(
      prompt,
      "", // userId - Assuming generateFlowWithAI will handle auth or it's not needed here
      nodes as Node[], // Pass nodes context
      edges as Edge[] // Pass edges context
    );
    return NextResponse.json(flowData);
  } catch (err) {
    console.error("Error generating flow:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Failed to generate flow", details: msg },
      { status: 500 }
    );
  }
}
