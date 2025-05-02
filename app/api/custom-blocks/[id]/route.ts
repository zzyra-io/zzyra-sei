import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { id } = params;
  
  const { data, error } = await supabase
    .from('custom_blocks')
    .select('*')
    .eq('id', id)
    .eq('user_id', session.user.id)
    .single();
    
  if (error) {
    console.error('Error fetching custom block:', error);
    return NextResponse.json({ error: 'Failed to fetch custom block' }, { status: 500 });
  }
  
  return NextResponse.json(data);
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { id } = params;
  const block = await request.json();
  
  // Update timestamp
  const blockToUpdate = {
    ...block,
    updated_at: new Date().toISOString()
  };
  
  // Remove id from the update payload
  delete blockToUpdate.id;
  
  const { data, error } = await supabase
    .from('custom_blocks')
    .update(blockToUpdate)
    .eq('id', id)
    .eq('user_id', session.user.id)
    .select()
    .single();
    
  if (error) {
    console.error('Error updating custom block:', error);
    return NextResponse.json({ error: 'Failed to update custom block' }, { status: 500 });
  }
  
  return NextResponse.json(data);
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { id } = params;
  
  const { error } = await supabase
    .from('custom_blocks')
    .delete()
    .eq('id', id)
    .eq('user_id', session.user.id);
    
  if (error) {
    console.error('Error deleting custom block:', error);
    return NextResponse.json({ error: 'Failed to delete custom block' }, { status: 500 });
  }
  
  return NextResponse.json({ success: true });
}
