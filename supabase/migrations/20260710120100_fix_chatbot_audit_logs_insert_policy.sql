-- ============================================================================
-- Fix chatbot_audit_logs INSERT policy
-- ----------------------------------------------------------------------------
-- The original policy (20241115_create_chatbot_audit_logs.sql) is named
-- "Service role can insert" but has WITH CHECK (true) and no role restriction.
-- The chatbot-proxy edge function inserts using the CALLER's JWT, so this policy
-- governs normal users: any authenticated user could insert audit rows with an
-- arbitrary user_id / message_preview, forging or polluting the compliance trail.
--
-- Fix: require the row to belong to the caller. (If the edge function is later
-- switched to a service_role client, service_role bypasses RLS anyway.)
-- ============================================================================

drop policy if exists "Service role can insert chatbot audit logs" on public.chatbot_audit_logs;

create policy "Users can insert own chatbot audit logs"
  on public.chatbot_audit_logs
  for insert
  to authenticated
  with check (auth.uid() = user_id);
