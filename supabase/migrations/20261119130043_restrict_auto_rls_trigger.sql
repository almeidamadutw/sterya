-- Supabase's automatic-RLS event trigger runs internally. It is not an API.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
