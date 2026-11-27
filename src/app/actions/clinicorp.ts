'use server';

import { getProfile } from '@/lib/auth';
import { clinicorpCredentialsForUnit, lookupClinicorpPatients, parseClinicorpLookup, type ClinicorpLookupResult } from '@/lib/clinicorp-lookup';
import { createClient } from '@/lib/supabase/server';

export async function searchClinicorpPatient(unitId: string, term: string): Promise<ClinicorpLookupResult> {
  const profile = await getProfile();
  if (!profile || !['suporte', 'gestor', 'equipe'].includes(profile.role)) return { error: 'denied' };

  if (typeof unitId !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(unitId)
    || typeof term !== 'string' || term.length > 160) return { error: 'invalid' };
  const lookup = parseClinicorpLookup(term);
  if (!lookup) return { error: 'invalid' };

  const supabase = await createClient();
  const { data, error } = await supabase.from('units').select('id')
    .eq('id', unitId).eq('tenant_id', profile.tenant_id).maybeSingle();
  if (error) return { error: 'unavailable' };
  if (!data) return { error: 'denied' };

  const credentials = clinicorpCredentialsForUnit(process.env.CLINICORP_UNIT_CONFIG, data.id);
  if (!credentials) return { error: 'not_configured' };
  return lookupClinicorpPatients(lookup, credentials);
}
