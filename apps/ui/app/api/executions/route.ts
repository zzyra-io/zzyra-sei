// Force Node runtime for RabbitMQ
export const runtime = "nodejs";

export async function POST(request: Request) {
  // Initialize Supabase client
  // Get user from session
  // console.log("[API] user", user);
  // if (authError || !user) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // }
  // // Read workflowId from body
  // const { workflowId } = await request.json();
  // console.log("[API] POST /api/executions", { workflowId, userId: user.id });
  // const executionId = uuidv4();
  // // Create execution with "pending" status so worker can find it
  // const { error: insertError } = await supabase
  //   .from("workflow_executions")
  //   .insert([
  //     {
  //       id: executionId,
  //       workflow_id: workflowId,
  //       status: "pending",
  //       triggered_by: user.id,
  //       user_id: user.id,
  //       started_at: new Date().toISOString(),
  //     },
  //   ]);
  // if (insertError) {
  //   console.error("Error inserting workflow_executions:", insertError);
  //   return NextResponse.json({ error: insertError.message }, { status: 500 });
  // }
  // console.log("[API] Inserted workflow_executions id=", executionId);
  // // Enqueue worker with user.id - this publishes to RabbitMQ
  // await addExecutionJob(executionId, workflowId, user.id);
  // console.log("[API] Enqueued execution job:", executionId, workflowId);
  // return NextResponse.json({ executionId });
}
