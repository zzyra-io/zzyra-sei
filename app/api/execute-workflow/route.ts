import { NextResponse } from "next/server";
import type { Database } from "@/types/supabase";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies as getCookies } from "next/headers";

export const runtime = "nodejs";
// Default edge runtime; queue logic is dynamically loaded

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient<Database>({
      cookies: getCookies,
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workflowId } = await request.json();

    const { data, error: execError } = await supabase
      .rpc("start_workflow_execution", { wf_id: workflowId })
      .single();

    if (execError || !data) {
      console.error("Error starting execution:", execError);
      return NextResponse.json(
        { error: "Failed to start workflow execution" },
        { status: 500 }
      );
    }

    const executionId = (data as any).id;

    const { addExecutionJob } = await import(
      "@/lib/queue/executionQueue.server"
    );
    await addExecutionJob(executionId, workflowId);

    return NextResponse.json({ executionId });
  } catch (error) {
    console.error("Unexpected error in execute-workflow route:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
