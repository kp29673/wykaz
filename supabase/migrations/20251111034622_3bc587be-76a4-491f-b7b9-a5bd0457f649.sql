-- Allow service role to update journals_master for enrichment
CREATE POLICY "Service role can update journals_master"
ON public.journals_master
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Grant update permission to service role
GRANT UPDATE ON public.journals_master TO service_role;