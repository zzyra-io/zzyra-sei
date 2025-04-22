"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";

export type ExecutionStatus = "pending" | "running" | "completed" | "failed";

export async function startExecution(workflowId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  try {
    // Create a new execution record
    const executionId = uuidv4();
    const { error } = await supabase.from("workflow_executions").insert({
      id: executionId,
      workflow_id: workflowId,
      status: "pending",
      triggered_by: user.id,
    });

    if (error) {
      return { error: error.message };
    }

    // Log the start of execution
    await supabase.from("execution_logs").insert({
      execution_id: executionId,
      node_id: "start",
      level: "info",
      message: "Execution started",
      timestamp: new Date().toISOString(),
    });

    // Simulate starting the execution process
    // In a real app, this would trigger a background job or webhook
    setTimeout(async () => {
      await simulateExecution(executionId, workflowId);
    }, 100);

    revalidatePath(`/builder/${workflowId}`);
    return { success: true, executionId };
  } catch (error: any) {
    return { error: error.message };
  }
}

// This function simulates the execution of a workflow
// In a real app, this would be handled by a background job or webhook
async function simulateExecution(executionId: string, workflowId: string) {
  const supabase = await createClient();

  try {
    // Update status to running
    await supabase
      .from("workflow_executions")
      .update({ status: "running" })
      .eq("id", executionId);

    // Log execution progress
    await supabase.from("execution_logs").insert({
      execution_id: executionId,
      node_id: "process",
      level: "info",
      message: "Processing workflow nodes",
      timestamp: new Date().toISOString(),
    });

    // Get workflow data
    const { data: workflow } = await supabase
      .from("workflows")
      .select("flow_data")
      .eq("id", workflowId)
      .single();

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Log node executions (simulated)
    if (workflow?.flow_data?.nodes) {
      for (const node of workflow.flow_data.nodes) {
        await supabase.from("execution_logs").insert({
          execution_id: executionId,
          node_id: node.id || "unknown",
          level: "info",
          message: `Executed node: ${node.type || "unknown"}`,
          data: { nodeId: node.id, nodeType: node.type },
          timestamp: new Date().toISOString(),
        });

        // Simulate node processing time
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Randomly succeed or fail (for demo purposes)
    const success = Math.random() > 0.2; // 80% success rate

    if (success) {
      // Complete successfully
      await supabase
        .from("workflow_executions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          result: { success: true, message: "Workflow executed successfully" },
        })
        .eq("id", executionId);

      await supabase.from("execution_logs").insert({
        execution_id: executionId,
        node_id: "end",
        level: "info",
        message: "Execution completed successfully",
        timestamp: new Date().toISOString(),
      });
    } else {
      // Fail with error
      await supabase
        .from("workflow_executions")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          result: { success: false, message: "Workflow execution failed" },
        })
        .eq("id", executionId);

      await supabase.from("execution_logs").insert({
        execution_id: executionId,
        node_id: "error",
        level: "error",
        message: "Execution failed: Simulated error occurred",
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Error in simulated execution:", error);

    // Mark as failed if there's an error
    await supabase
      .from("workflow_executions")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        result: { success: false, message: "Internal error occurred" },
      })
      .eq("id", executionId);
  }
}

export async function getExecutionDetails(executionId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { execution: null, logs: [], error: "Not authenticated" };
  }

  try {
    // Get execution details
    const { data: execution, error: executionError } = await supabase
      .from("workflow_executions")
      .select("*, workflows(name)")
      .eq("id", executionId)
      .single();

    if (executionError) {
      return { execution: null, logs: [], error: executionError.message };
    }

    // Get execution logs
    const { data: logs, error: logsError } = await supabase
      .from("execution_logs")
      .select("*")
      .eq("execution_id", executionId)
      .order("timestamp", { ascending: true });

    if (logsError) {
      return { execution, logs: [], error: logsError.message };
    }

    return { execution, logs, error: null };
  } catch (error: any) {
    return { execution: null, logs: [], error: error.message };
  }
}

export async function getWorkflowExecutions(workflowId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { executions: [], error: "Not authenticated" };
  }

  try {
    // Get recent executions
    const { data: executions, error } = await supabase
      .from("workflow_executions")
      .select("*")
      .eq("workflow_id", workflowId)
      .order("started_at", { ascending: false })
      .limit(10);

    if (error) {
      return { executions: [], error: error.message };
    }

    return { executions, error: null };
  } catch (error: any) {
    return { executions: [], error: error.message };
  }
}

// Resume a paused workflow execution
export async function resumeExecution(executionId: string, resumeData: any = {}) {
  // Call the resume API
  const res = await fetch(`/api/executions/${executionId}/resume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeData }),
  });
  if (!res.ok) {
    const err = await res.json();
    return { error: err.error || 'Failed to resume execution' };
  }
  return await res.json();
}
