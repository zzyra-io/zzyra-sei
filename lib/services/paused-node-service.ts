// Service to fetch paused input snapshot for a node execution
import { createClient } from "@/lib/supabase/client";

export async function getPausedNodeSnapshot(executionId: string, nodeId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("workflow_pauses")
    .select("id, context")
    .eq("execution_id", executionId)
    .eq("node_id", nodeId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (error || !data) return null;
  // context is JSON string: { inputData, previous }
  try {
    return { id: data.id, ...JSON.parse(data.context) };
  } catch {
    return { id: data.id, inputData: null };
  }
}
