-- Enable RLS and deny all access by default for sensitive public tables

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No access" ON public.audit_logs FOR ALL USING (false);

ALTER TABLE public.transaction_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No access" ON public.transaction_attempts FOR ALL USING (false);

ALTER TABLE public.workflow_pauses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No access" ON public.workflow_pauses FOR ALL USING (false);

ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No access" ON public.workflow_templates FOR ALL USING (false);
