'use server';

import { FunctionsHttpError } from '@supabase/supabase-js';
import { getProfile } from '@/lib/auth';
import { clinicorpCredentialsForUnit, lookupClinicorpPatients, parseClinicorpLookup, type ClinicorpLookupResult } from '@/lib/clinicorp-lookup';
import type { ClinicorpProcedureResult } from '@/lib/piece-routing';
import { createClient } from '@/lib/supabase/server';

type UnitClient = { supabase: Awaited<ReturnType<typeof createClient>>; unitId: string }
  | { error: 'denied' | 'invalid' | 'unavailable' };

async function clinicorpUnitClient(unitId: string): Promise<UnitClient> {
  const profile = await getProfile();
  if (!profile || !['suporte', 'gestor', 'equipe'].includes(profile.role)) return { error: 'denied' } as const;
  if (typeof unitId !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(unitId)) {
    return { error: 'invalid' } as const;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from('units').select('id')
    .eq('id', unitId).eq('tenant_id', profile.tenant_id).maybeSingle();
  if (error) return { error: 'unavailable' } as const;
  if (!data) return { error: 'denied' } as const;
  return { supabase, unitId: data.id as string };
}

function responseError(error: unknown) {
  if (error instanceof FunctionsHttpError) {
    if ([401, 403].includes(error.context.status)) return { error: 'denied' } as const;
    if (error.context.status === 400) return { error: 'invalid' } as const;
  }
  return { error: 'unavailable' } as const;
}

export async function searchClinicorpPatient(unitId: string, term: string): Promise<ClinicorpLookupResult> {
  if (typeof term !== 'string' || term.length > 160) return { error: 'invalid' };
  const lookup = parseClinicorpLookup(term);
  if (!lookup) return { error: 'invalid' };
  const client = await clinicorpUnitClient(unitId);
  if ('error' in client) return { error: client.error };

  const { data: result, error } = await client.supabase.functions.invoke<ClinicorpLookupResult>('cpe-clinicorp-lookup', {
    body: { unitId: client.unitId, term },
  });
  if (result && 'error' in result && result.error === 'not_configured') {
    const fallback = clinicorpCredentialsForUnit(process.env.CLINICORP_UNIT_CONFIG, client.unitId);
    if (fallback) return lookupClinicorpPatients(lookup, fallback);
  }
  return result ?? responseError(error);
}

export async function getClinicorpPieceProcedures(unitId: string, patientId: string): Promise<ClinicorpProcedureResult> {
  if (typeof patientId !== 'string' || !/^[0-9]{1,32}$/.test(patientId)) return { error: 'invalid' };
  const client = await clinicorpUnitClient(unitId);
  if ('error' in client) return { error: client.error };

  const { data, error } = await client.supabase.functions.invoke<ClinicorpProcedureResult>('cpe-clinicorp-lookup', {
    body: { unitId: client.unitId, mode: 'procedures', patientId },
  });
  return data ?? responseError(error);
}
