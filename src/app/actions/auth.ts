'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireManager } from '@/lib/auth';
import { authEmail, normalizeUsername, normalizeCode, passwordError, type ActionState } from '@/lib/validation';

export async function signIn(_previous: ActionState, form: FormData): Promise<ActionState> {
  const username = normalizeUsername(String(form.get('username') ?? ''));
  const password = String(form.get('password') ?? '');
  if (!username || !password || password.length > 128) return { error: 'Confira seu usuário e sua senha.' };
  const supabase = await createClient();
  const { error, data } = await supabase.auth.signInWithPassword({ email: authEmail(username), password });
  if (error || !data.user) return { error: 'Não foi possível entrar. Confira seu usuário e sua senha.' };
  const { data: profile } = await supabase.from('profiles').select('id').eq('id', data.user.id).eq('active', true).maybeSingle();
  if (!profile) { await supabase.auth.signOut({ scope: 'local' }); return { error: 'Seu acesso não está disponível. Procure o suporte.' }; }
  redirect('/painel');
}
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: 'local' });
  redirect('/login');
}
async function accessRequest(body: Record<string, unknown>, token?: string): Promise<ActionState> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/cpe-access`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body), cache: 'no-store', signal: AbortSignal.timeout(25000)
    });
    const result = await res.json();
    return res.ok ? result : { error: result.error ?? 'Não foi possível concluir. Tente novamente.' };
  } catch { return { error: 'Não conseguimos conectar agora. Tente novamente em instantes.' }; }
}
async function redeem(kind: 'activate' | 'reset', form: FormData): Promise<ActionState> {
  const username = normalizeUsername(String(form.get('username') ?? ''));
  const code = normalizeCode(String(form.get('code') ?? ''));
  const password = String(form.get('password') ?? '');
  if (!username) return { error: 'Informe o usuário que recebeu do suporte.' };
  if (!code) return { error: 'Confira o código completo que recebeu do suporte.' };
  const error = passwordError(password);
  if (error) return { error };
  if (password !== form.get('confirmation')) return { error: 'As senhas precisam ser iguais.' };
  const result = await accessRequest({ action: kind, username, code, password });
  if (result.error) return result;
  redirect(`/login?status=${kind === 'activate' ? 'activated' : 'reset'}`);
}
export async function activate(_previous: ActionState, form: FormData) { return redeem('activate', form); }
export async function recover(_previous: ActionState, form: FormData) { return redeem('reset', form); }
export async function issueCode(_previous: ActionState, form: FormData): Promise<ActionState> {
  await requireManager();
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: 'Entre novamente para continuar.' };
  return accessRequest({ action: 'issue', kind: form.get('kind'), username: form.get('username'), full_name: form.get('full_name'), role: form.get('role'), laboratory_id: form.get('laboratory_id') }, session.access_token);
}
