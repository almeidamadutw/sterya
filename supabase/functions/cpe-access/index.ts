import { createClient } from 'npm:@supabase/supabase-js@2.119.2';

const url = Deno.env.get('SUPABASE_URL')!;
const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const normalize = (v: unknown) => String(v ?? '').trim().toLowerCase().replace(/@(?:cpe\.ceoclub|ceoclubcpe)$/, '');
async function digest(value: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))).map(b => b.toString(16).padStart(2, '0')).join('');
}
class AccessError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return response({ error: 'Método não permitido.' }, 405);
  let claimed: { hash: string; lease: string } | null = null;
  try {
    if (Number(req.headers.get('content-length') ?? 0) > 16000) throw new AccessError('Solicitação inválida.');
    const raw = await req.text();
    if (raw.length > 16000) throw new AccessError('Solicitação inválida.');
    const body = JSON.parse(raw);
    const action = body.action;

    if (action === 'issue') {
      // Gateway JWT verification is disabled only because activation/reset are
      // intentionally unauthenticated. Every admin operation verifies a JWT here.
      const authorization = req.headers.get('authorization') ?? '';
      const token = authorization.replace(/^Bearer\s+/i, '');
      if (!token) throw new AccessError('Entre novamente para continuar.', 401);
      const { data: identity, error: identityError } = await admin.auth.getUser(token);
      if (identityError || !identity.user) throw new AccessError('Entre novamente para continuar.', 401);
      // Query through the caller's JWT so RLS also checks the live session,
      // active profile and password-reset cutoff before the privileged RPC.
      const caller = createClient(url, secret, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
      const { data: profile } = await caller.from('profiles').select('id,role').eq('id', identity.user.id).maybeSingle();
      if (!profile || !['suporte', 'gestor'].includes(profile.role)) throw new AccessError('Você não tem permissão para gerar códigos.', 403);
      const username = normalize(body.username);
      if (!/^[a-z0-9][a-z0-9._-]{2,39}$/.test(username)) throw new AccessError('Informe um usuário válido (3 a 40 caracteres).');
      if (!['activate', 'reset'].includes(body.kind)) throw new AccessError('Tipo de código inválido.');
      const code = Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
      const { data, error } = await admin.rpc('issue_access_code', { p_actor: profile.id, p_hash: await digest(code), p_payload: { kind: body.kind, username, full_name: String(body.full_name ?? '').trim(), role: body.role, laboratory_id: body.laboratory_id || null } });
      if (error) {
        const known = ['Usuário indisponível', 'Conta indisponível', 'Selecione um laboratório válido', 'Dados inválidos', 'Acesso negado'];
        throw new AccessError(known.find(m => error.message.includes(m)) ?? 'Não foi possível gerar o código.');
      }
      return response({ ...data, code: code.match(/.{1,4}/g)!.join('-') });
    }

    if (!['activate', 'reset'].includes(action)) throw new AccessError('Solicitação inválida.');
    const username = normalize(body.username);
    const code = String(body.code ?? '').replace(/[\s-]/g, '').toUpperCase();
    const password = String(body.password ?? '');
    if (!/^[a-z0-9][a-z0-9._-]{2,39}$/.test(username) || !/^[A-F0-9]{32}$/.test(code)) throw new AccessError('Usuário ou código inválido.');
    if (password.length < 8 || password.length > 128 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) throw new AccessError('Use uma senha de 8 a 128 caracteres com letras e números.');
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const { data: allowed, error: rateError } = await admin.rpc('take_access_attempt', { p_key: await digest(`access:${ip}`) });
    if (rateError) throw new AccessError('Serviço temporariamente indisponível.', 503);
    if (!allowed) throw new AccessError('Muitas tentativas. Aguarde 15 minutos e tente novamente.', 429);
    const hash = await digest(code);
    const { data: invitation, error: claimError } = await admin.rpc('claim_access_code', { p_hash: hash, p_kind: action });
    if (claimError) throw new AccessError('Serviço temporariamente indisponível.', 503);
    if (!invitation) throw new AccessError('Código inválido, expirado ou já utilizado.');
    claimed = { hash, lease: invitation.lease };
    if (username !== invitation.username) throw new AccessError('Usuário ou código inválido.');
    let userId: string;
    if (action === 'activate') {
      const email = `${username}@acesso.sterya.app`;
      const { data: existing, error: lookupError } = await admin.rpc('lookup_access_user', { p_email: email });
      if (lookupError) throw new AccessError('Não foi possível ativar sua conta.', 503);
      if (existing) {
        const { data: active, error: profileError } = await admin.from('profiles').select('id').eq('id', existing).maybeSingle();
        if (profileError || active) throw new AccessError('Essa conta já foi ativada. Use a recuperação de acesso.');
        // Recover an Auth-only orphan after a previous interrupted activation.
        const { error } = await admin.auth.admin.updateUserById(existing, { password, email_confirm: true });
        if (error) throw new AccessError('Não foi possível definir a senha. Tente outra senha.');
        userId = existing;
      } else {
        const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
        if (error || !data.user) throw new AccessError('Não foi possível ativar sua conta. Tente outra senha.');
        userId = data.user.id;
      }
    } else {
      userId = invitation.target_user_id;
      const { data: active, error: profileError } = await admin.from('profiles').select('id').eq('id', userId).eq('active', true).eq('tenant_id', invitation.tenant_id).maybeSingle();
      if (profileError || !active) throw new AccessError('Conta indisponível. Procure o suporte.');
      const { error } = await admin.auth.admin.updateUserById(userId, { password });
      if (error) throw new AccessError('Não foi possível definir a senha. Tente outra senha.');
    }
    const { error: finishError } = await admin.rpc('finish_access_code', { p_hash: hash, p_lease: invitation.lease, p_user_id: userId });
    if (finishError) throw new AccessError('Não foi possível concluir. Tente novamente ou entre com a senha escolhida.', 503);
    claimed = null;
    return response({ ok: true });
  } catch (error) {
    if (claimed) await admin.rpc('release_access_code', { p_hash: claimed.hash, p_lease: claimed.lease });
    if (error instanceof AccessError) return response({ error: error.message }, error.status);
    return response({ error: 'Não foi possível concluir a solicitação.' }, 400);
  }
});
