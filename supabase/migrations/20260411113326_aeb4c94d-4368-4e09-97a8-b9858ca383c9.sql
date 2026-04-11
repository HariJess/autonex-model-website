
DROP POLICY "Anyone can create leads" ON public.leads;
CREATE POLICY "Anyone can create leads with info" ON public.leads FOR INSERT WITH CHECK (
  visitor_name IS NOT NULL OR visitor_email IS NOT NULL
);
