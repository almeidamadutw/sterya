import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
export type Profile = { id: string; tenant_id: string; username: string; full_name: string; role: string; laboratory_id: string | null; active: boolean };
export const getProfile = cache(async () => {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const { data, error: profileError } = await supabase.from('profiles').select('id,tenant_id,username,full_name,role,laboratory_id,active').eq('id', user.id).eq('active', true).maybeSingle();
  if (profileError || !data) return null;
  return data as Profile;
});
export async function requireProfile() {
  const profile = await getProfile();
  if (!profile) redirect('/login');
  return profile;
}
export async function requireManager() {
  const profile = await requireProfile();
  if (!['suporte', 'gestor'].includes(profile.role)) redirect('/painel');
  return profile;
}
