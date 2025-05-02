import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { data, error } = await supabase
    .from('custom_blocks')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching custom blocks:', error);
    return NextResponse.json({ error: 'Failed to fetch custom blocks' }, { status: 500 });
  }
  
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const block = await request.json();
  
  // Add timestamps and user_id
  const blockToInsert = {
    ...block,
    user_id: session.user.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('custom_blocks')
    .insert([blockToInsert])
    .select()
    .single();
    
  if (error) {
    console.error('Error creating custom block:', error);
    return NextResponse.json({ error: 'Failed to create custom block' }, { status: 500 });
  }
  
  return NextResponse.json(data);
}
