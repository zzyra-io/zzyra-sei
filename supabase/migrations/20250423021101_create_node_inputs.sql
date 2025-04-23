CREATE TABLE IF NOT EXISTS public.node_inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL,
  node_id TEXT NOT NULL,
  input_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
