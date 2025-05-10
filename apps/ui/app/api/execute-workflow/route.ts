import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch active subscription with execution limit
    // const { data: subs, error: subsError } = await supabase
    //   .from('subscriptions')
    //   .select('id, pricing_tiers(execution_limit)')
    //   .eq('user_id', user.id)
    //   .eq('status', 'active')
    //   .single();
    // if (subsError || !subs) {
    //   return NextResponse.json({ error: 'No active subscription' }, { status: 403 });
    // }
    // const execLimit = Array.isArray(subs.pricing_tiers) ? subs.pricing_tiers[0]?.execution_limit ?? 0 : 0;

    // // Sum existing execution usage
    // const { data: logs, error: logsError } = await supabase
    //   .from('usage_logs')
    //   .select('quantity')
    //   .eq('subscription_id', subs.id)
    //   .eq('resource_type', 'workflow_execution');
    // if (logsError) console.error('Error fetching usage logs', logsError);
    // const used = logs?.reduce((sum, l) => sum + l.quantity, 0) ?? 0;
    // if (used >= execLimit) {
    //   return NextResponse.json({ error: 'Execution limit reached' }, { status: 403 });
    // }

    const { workflowId } = await request.json();

    const { data, error: insertError } = await supabase
      .from("workflow_executions")
      .insert({
        workflow_id: workflowId,
        status: "pending",
        triggered_by: user.id,
        user_id: user.id,
      })
      .select("id")
      .single();

    if (insertError || !data) {
      console.error("Error starting execution:", insertError);
      return NextResponse.json(
        { error: "Failed to start workflow execution" },
        { status: 500 }
      );
    }

    // Track execution usage
    // const { error: logError } = await supabase.from("usage_logs").insert({
    //   subscription_id: subs.id,
    //   resource_type: "workflow_execution",
    //   quantity: 1,
    // });
    // if (logError) console.error("Error logging execution usage", logError);

    const executionId = data.id;

    const { addExecutionJob } = await import(
      "@/lib/queue/executionQueue.server"
    );
    await addExecutionJob(executionId, workflowId, user.id);

    return NextResponse.json({ executionId });
  } catch (error) {
    console.error("Unexpected error in execute-workflow route:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
