import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Validate UUID format to prevent 400 Bad Request errors
    const executionId = params.id;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(executionId)) {
      return NextResponse.json(
        { error: 'Invalid execution ID format. Expected a valid UUID.' }, 
        { status: 400 }
      );
    }
    
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // 1. Fetch execution record to get workflow_id
    const { data: execRec, error: execError } = await supabase
      .from('workflow_executions')
      .select('workflow_id')
      .eq('id', executionId)
      .single();
    if (execError || !execRec) {
      return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
    }
    const workflowId = execRec.workflow_id;

    // 2. Fetch workflow definition (nodes)
    const { data: workflowRec, error: wfError } = await supabase
      .from('workflows')
      .select('nodes')
      .eq('id', workflowId)
      .single();
    if (wfError || !workflowRec) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }
    const workflowNodes = workflowRec.nodes || [];

    // 3. Fetch all node_executions for this execution
    const { data: nodeExecs, error: nodeExecError } = await supabase
      .from('node_executions')
      .select('id, node_id, status, output, error, started_at, finished_at, logs')
      .eq('execution_id', executionId);
    if (nodeExecError) {
      return NextResponse.json({ error: nodeExecError.message }, { status: 500 });
    }
    
    interface NodeExecution {
      id: string;
      node_id: string;
      status: string;
      output: Record<string, unknown> | null;
      error: string | null;
      started_at: string | null;
      finished_at: string | null;
      logs: Array<Record<string, unknown>> | null;
    }
    
    const nodeExecMap = new Map<string, NodeExecution>(
      (nodeExecs || []).map((ne) => [ne.node_id, ne as NodeExecution])
    );

    // Define interface for workflow nodes
    interface WorkflowNode {
      id: string;
      data?: {
        nodeType?: string;
        config?: Record<string, unknown>;
      };
      type?: string;
    }
    
    // 4. Merge: For each workflow node, attach execution status or default to pending
    const mergedNodes = workflowNodes.map((node: WorkflowNode) => {
      const exec = nodeExecMap.get(node.id);
      return {
        node_id: node.id,
        node_type: node.data?.nodeType || node.type || null,
        config: node.data?.config || null,
        status: exec?.status || 'pending',
        started_at: exec?.started_at || null,
        completed_at: exec?.finished_at || null,
        output_data: exec?.output || null,
        error: exec?.error || null,
        logs: exec?.logs || [],
      };
    });

    return NextResponse.json({ nodes: mergedNodes });
  } catch (err: unknown) {
    console.error('Unexpected error in node-executions route:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Error details: ${errorMessage}`);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
