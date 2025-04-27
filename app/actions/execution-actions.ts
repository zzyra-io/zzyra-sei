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
      started_at: new Date().toISOString(),
    });

    if (error) {
      return { error: error.message };
    }

    // Log the start of execution
    await supabase.from("execution_logs").insert({
      execution_id: executionId,
      node_id: "system",
      level: "info",
      message: "Execution queued",
      timestamp: new Date().toISOString(),
    });

    // Queue the job for the worker to process
    try {
      // Log attempt to insert into queue
      await supabase.from("execution_logs").insert({
        execution_id: executionId,
        node_id: "system",
        level: "info",
        message: "Attempting to insert job into execution_queue",
        timestamp: new Date().toISOString(),
      });

      // Try a different approach using a direct SQL query to insert into the queue
      // This bypasses potential RLS issues and ensures the insert happens with the right types
      const { data: insertResult, error: queueError } = await supabase.rpc(
        'insert_execution_queue_job',
        {
          p_execution_id: executionId,
          p_workflow_id: workflowId,
          p_user_id: user.id,
          p_status: "pending",
          p_priority: 0,
          p_payload: JSON.stringify({ triggered_by: user.id }),
          p_scheduled_for: new Date().toISOString()
        }
      );
      
      // If the RPC doesn't exist, fall back to direct insert
      if (queueError && queueError.message.includes("function does not exist")) {
        console.log("RPC function not found, falling back to direct insert");
        const { error: directError } = await supabase
          .from("execution_queue")
          .insert({
            execution_id: executionId,
            workflow_id: workflowId,
            user_id: user.id,
            status: "pending",
            priority: 0,
            payload: { triggered_by: user.id },
            scheduled_for: new Date().toISOString()
          });
          
        if (directError) {
          console.error("Direct insert also failed:", directError);
          // Try one more approach - raw SQL
          const { error: rawError } = await supabase.rpc(
            'execute_sql',
            {
              sql: `INSERT INTO execution_queue (execution_id, workflow_id, user_id, status, priority, payload, scheduled_for) 
                   VALUES ('${executionId}', '${workflowId}', '${user.id}', 'pending', 0, '{"triggered_by":"${user.id}"}', '${new Date().toISOString()}')`
            }
          );
          
          if (rawError) {
            console.error("Raw SQL insert also failed:", rawError);
            return { error: `All queue insertion methods failed: ${rawError.message}` };
          }
        }
      }

      if (queueError) {
        console.error('Failed to queue execution job:', queueError);
        
        // Log the error details
        await supabase.from("execution_logs").insert({
          execution_id: executionId,
          node_id: "system",
          level: "error",
          message: `Failed to queue execution: ${queueError.message}`,
          data: { error: queueError, details: queueError.details },
          timestamp: new Date().toISOString(),
        });
        
        // Update execution status to failed if we couldn't queue it
        await supabase
          .from("workflow_executions")
          .update({ 
            status: "failed", 
            error: `Failed to queue execution: ${queueError.message}`,
            completed_at: new Date().toISOString()
          })
          .eq("id", executionId);
          
        return { error: `Failed to queue execution: ${queueError.message}` };
      }
      
      // Log successful queue insertion
      await supabase.from("execution_logs").insert({
        execution_id: executionId,
        node_id: "system",
        level: "info",
        message: "Job successfully inserted into execution_queue",
        timestamp: new Date().toISOString(),
      });
    } catch (queueInsertError) {
      console.error('Exception during queue insertion:', queueInsertError);
      
      // Log the exception
      await supabase.from("execution_logs").insert({
        execution_id: executionId,
        node_id: "system",
        level: "error",
        message: `Exception during queue insertion: ${queueInsertError instanceof Error ? queueInsertError.message : String(queueInsertError)}`,
        timestamp: new Date().toISOString(),
      });
      
      // Update execution status to failed
      await supabase
        .from("workflow_executions")
        .update({ 
          status: "failed", 
          error: "Exception during queue insertion",
          completed_at: new Date().toISOString()
        })
        .eq("id", executionId);
        
      return { error: "Exception during queue insertion" };
    }
    
    revalidatePath(`/builder/${workflowId}`);
    return { success: true, executionId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return { error: errorMessage };
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
export async function resumeExecution(executionId: string, resumeData: Record<string, unknown> = {}) {
  try {
    const supabase = await createClient();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Not authenticated" };
    }
    
    // Get workflow ID from execution
    const { data: execution, error: execError } = await supabase
      .from("workflow_executions")
      .select("workflow_id, status")
      .eq("id", executionId)
      .single();
    
    if (execError) {
      return { error: execError.message };
    }
    
    if (!execution) {
      return { error: "Execution not found" };
    }
    
    if (execution.status !== "paused") {
      return { error: `Cannot resume execution with status: ${execution.status}` };
    }
    
    // Update execution status to running
    const { error: updateError } = await supabase
      .from("workflow_executions")
      .update({ status: "running" })
      .eq("id", executionId);
    
    if (updateError) {
      return { error: updateError.message };
    }
    
    // Log the resume action
    await supabase.from("execution_logs").insert({
      execution_id: executionId,
      node_id: "system",
      level: "info",
      message: "Execution resumed by user",
      timestamp: new Date().toISOString(),
    });
    
    // Add to execution queue with resumeData
    const { error: queueError } = await supabase
      .from("execution_queue")
      .insert({
        execution_id: executionId,
        workflow_id: execution.workflow_id,
        user_id: user.id,
        status: "pending",
        priority: 2, // Highest priority for resumed jobs
        payload: { resumed: true, resumed_at: new Date().toISOString(), resumeData },
        scheduled_for: new Date().toISOString()
      });
    
    if (queueError) {
      console.error("Failed to queue resume job:", queueError);
      // Continue anyway since we've already updated the execution record
    }
    
    revalidatePath(`/builder/${execution.workflow_id}`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return { error: errorMessage };
  }
}

// Pause a running workflow execution
export async function pauseExecution(executionId: string) {
  try {
    const supabase = await createClient();
    
    // Get workflow ID from execution
    const { data: execution, error: execError } = await supabase
      .from("workflow_executions")
      .select("workflow_id, status")
      .eq("id", executionId)
      .single();
    
    if (execError) {
      return { error: execError.message };
    }
    
    if (!execution) {
      return { error: "Execution not found" };
    }
    
    if (execution.status !== "running") {
      return { error: `Cannot pause execution with status: ${execution.status}` };
    }
    
    // Update the execution status to paused
    const { error } = await supabase
      .from("workflow_executions")
      .update({ status: "paused" })
      .eq("id", executionId);
    
    if (error) {
      return { error: error.message };
    }
    
    // Update any queue entries for this execution to paused
    await supabase
      .from("execution_queue")
      .update({ status: "paused" })
      .eq("execution_id", executionId)
      .eq("status", "pending");
    
    // Log the pause action
    await supabase.from("execution_logs").insert({
      execution_id: executionId,
      node_id: "system",
      level: "info",
      message: "Execution paused by user",
      timestamp: new Date().toISOString(),
    });
    
    revalidatePath(`/builder/${execution.workflow_id}`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return { error: errorMessage };
  }
}

// Retry a failed workflow execution
export async function retryExecution(executionId: string, workflowId: string) {
  try {
    const supabase = await createClient();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Not authenticated" };
    }
    
    // Update the execution status to running
    const { error } = await supabase
      .from("workflow_executions")
      .update({ 
        status: "running",
        started_at: new Date().toISOString(),
        completed_at: null,
        result: null
      })
      .eq("id", executionId);
    
    if (error) {
      return { error: error.message };
    }
    
    // Log the retry action
    await supabase.from("execution_logs").insert({
      execution_id: executionId,
      node_id: "system",
      level: "info",
      message: "Execution retry initiated by user",
      timestamp: new Date().toISOString(),
    });
    
    // Add to execution queue for worker processing
    const { error: queueError } = await supabase
      .from("execution_queue")
      .insert({
        execution_id: executionId,
        workflow_id: workflowId,
        user_id: user.id,
        status: "pending",
        priority: 1, // Higher priority for retries
        payload: { retried: true, retried_at: new Date().toISOString() },
        scheduled_for: new Date().toISOString()
      });
    
    if (queueError) {
      console.error("Failed to queue retry job:", queueError);
      // Continue anyway since we've already updated the execution record
    }
    
    revalidatePath(`/builder/${workflowId}`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return { error: errorMessage };
  }
}
