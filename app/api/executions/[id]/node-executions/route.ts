import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const executionId = params.id;
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
      .select('id, node_id, status, output_data, error, started_at, completed_at')
      .eq('execution_id', executionId);
    if (nodeExecError) {
      return NextResponse.json({ error: nodeExecError.message }, { status: 500 });
    }
    const nodeExecMap = new Map(
      (nodeExecs || []).map((ne: any) => [ne.node_id, ne])
    );

    // 4. Merge: For each workflow node, attach execution status or default to pending
    const mergedNodes = workflowNodes.map((node: any) => {
      const exec = nodeExecMap.get(node.id);
      return {
        node_id: node.id,
        node_type: node.data?.nodeType || node.type || null,
        config: node.data?.config || null,
        status: exec?.status || 'pending',
        started_at: exec?.started_at || null,
        completed_at: exec?.completed_at || null,
        output_data: exec?.output_data || null,
        error: exec?.error || null,
      };
    });

    return NextResponse.json({ nodes: mergedNodes });
  } catch (err: any) {
    console.error('Unexpected error in node-executions route:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

