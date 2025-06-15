import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // const supabase = await createClient();
  // const { data: { session } } = await supabase.auth.getSession();

  // if (!session?.user) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }

  // Include query parameters for filtering
  const url = new URL(request.url);
  const isPublic = url.searchParams.get("is_public");
  const category = url.searchParams.get("category");

  // let query = supabase
  //   .from('custom_blocks')
  //   .select('*')

  // // If is_public=true, fetch all public blocks, otherwise fetch only user's blocks
  // if (isPublic === 'true') {
  //   query = query.eq('is_public', true);
  // } else {
  //   query = query.eq('user_id', session.user.id);
  // }

  // // Filter by category if specified
  // if (category) {
  //   query = query.eq('category', category);
  // }

  // // Order by created_at
  // query = query.order('created_at', { ascending: false });

  // const { data, error } = await query;

  // if (error) {
  //   console.error('Error fetching custom blocks:', error);
  //   return NextResponse.json({ error: 'Failed to fetch custom blocks' }, { status: 500 });
  // }

  // return NextResponse.json(data);
}

export async function POST(request: Request) {
  // const supabase = await createClient();
  // const { data: { session } } = await supabase.auth.getSession();
  // if (!session?.user) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }
  // try {
  //   const block = await request.json();
  //   // Validate required fields
  //   if (!block.name || !block.category) {
  //     return NextResponse.json({
  //       error: 'Missing required fields: name and category are required'
  //     }, { status: 400 });
  //   }
  //   // Prepare block_data for storage
  //   let blockData = block.block_data;
  //   // If block_data was not provided directly but we have inputs/outputs/code
  //   if (!blockData && (block.inputs || block.outputs || block.code)) {
  //     blockData = {
  //       name: block.name,
  //       description: block.description,
  //       category: block.category,
  //       inputs: block.inputs || [],
  //       outputs: block.outputs || [],
  //       configFields: block.configFields || [],
  //       code: block.code || ''
  //     };
  //   }
  //   // Add timestamps and user_id
  //   const blockToInsert = {
  //     name: block.name,
  //     description: block.description || '',
  //     block_type: block.block_type || 'custom',
  //     category: block.category,
  //     is_public: block.is_public || false,
  //     tags: block.tags || [],
  //     block_data: blockData,
  //     user_id: session.user.id,
  //     created_at: new Date().toISOString(),
  //     updated_at: new Date().toISOString(),
  //     version: block.version || '1.0.0'
  //   };
  //   const { data, error } = await supabase
  //     .from('custom_blocks')
  //     .insert([blockToInsert])
  //     .select()
  //     .single();
  //   if (error) {
  //     console.error('Error creating custom block:', error);
  //     return NextResponse.json({ error: 'Failed to create custom block: ' + error.message }, { status: 500 });
  //   }
  //   return NextResponse.json(data);
  // } catch (err) {
  //   console.error('Error processing request:', err);
  //   return NextResponse.json({ error: 'Invalid request format' }, { status: 400 });
  // }
}
