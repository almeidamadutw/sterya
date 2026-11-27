import { createClient } from 'npm:@supabase/supabase-js@2.119.2';
import { clinicorpEdgeCredentials } from './config.ts';
import { lookupClinicorpPatients, parseClinicorpLookup, type ClinicorpLookupResult } from './lookup.ts';

const unitIdPattern = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;

function respond(body: ClinicorpLookupResult, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function handleClinicorpRequest(request: Request): Promise<Response> {
  if (request.method !== 'POST') return respond({ error: 'invalid' }, 405);
  const authHeader = request.headers.get('Authorization') ?? '';
  const token = /^Bearer (\S+)$/i.exec(authHeader)?.[1];
  if (!token) return respond({ error: 'denied' }, 401);

  try {
    const url = Deno.env.get('SUPABASE_URL');
    const publicKey = Deno.env.get('SUPABASE_ANON_KEY')
      || JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') || '{}').default;
    if (!url || typeof publicKey !== 'string' || !publicKey) return respond({ error: 'unavailable' }, 503);

    const caller = createClient(url, publicKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: auth, error: authError } = await caller.auth.getUser(token);
    if (authError || !auth.user) return respond({ error: 'denied' }, 401);

    const body = await request.json().catch(() => null);
    const unitId = body?.unitId;
    const term = body?.term;
    if (typeof unitId !== 'string' || !unitIdPattern.test(unitId)
      || typeof term !== 'string' || term.length > 160) return respond({ error: 'invalid' }, 400);
    const lookup = parseClinicorpLookup(term);
    if (!lookup) return respond({ error: 'invalid' }, 400);

    // The caller's JWT is used for these reads so revoked sessions and tenant RLS still apply.
    const { data: profile, error: profileError } = await caller.from('profiles').select('tenant_id,role')
      .eq('id', auth.user.id).eq('active', true).maybeSingle();
    if (profileError) return respond({ error: 'unavailable' }, 503);
    if (!profile || !['suporte', 'gestor', 'equipe'].includes(profile.role)) return respond({ error: 'denied' }, 403);

    const [unit, tenant] = await Promise.all([
      caller.from('units').select('id,name').eq('id', unitId).eq('tenant_id', profile.tenant_id).maybeSingle(),
      caller.from('tenants').select('slug').eq('id', profile.tenant_id).maybeSingle(),
    ]);
    if (unit.error || tenant.error) return respond({ error: 'unavailable' }, 503);
    if (!unit.data || !tenant.data) return respond({ error: 'denied' }, 403);

    const credentials = clinicorpEdgeCredentials({ ...unit.data, tenantSlug: tenant.data.slug }, key => Deno.env.get(key));
    if (!credentials) return respond({ error: 'not_configured' });
    return respond(await lookupClinicorpPatients(lookup, credentials));
  } catch {
    return respond({ error: 'unavailable' }, 503);
  }
}

if (import.meta.main) Deno.serve(handleClinicorpRequest);
