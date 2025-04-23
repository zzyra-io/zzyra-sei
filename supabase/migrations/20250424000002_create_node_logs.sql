CREATE TABLE IF NOT EXISTS public.node_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id UUID REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  level TEXT CHECK (level IN ('info','warning','error')),
  message TEXT NOT NULL,
  data JSONB
);

ALTER TABLE node_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow reads" ON node_logs FOR SELECT USING (true);

  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
