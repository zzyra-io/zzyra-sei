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
    console.log('Node Executions API called for executionId:', executionId);
    const { data, error } = await (supabase as any)
      .from('node_executions')
      .select('id, node_id, status, output_data, error, started_at, completed_at')
      .eq('execution_id', executionId)
      .order('started_at', { ascending: true });

    console.log('Node Executions fetched:', data);
    if (error) {
      console.error('Error fetching node executions:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ nodes: data });
  } catch (err: any) {
    console.error('Unexpected error in node-executions route:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
