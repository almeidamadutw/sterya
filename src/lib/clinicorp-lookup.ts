export type ClinicorpPatient = { id: string; name: string };

export type ClinicorpLookupResult =
  | { patients: ClinicorpPatient[] }
  | { error: 'invalid' | 'denied' | 'not_configured' | 'busy' | 'unavailable' };

type ClinicorpCredentials = { username: string; token: string; subscriberId: string };
type Lookup = { field: 'Name' | 'PatientId'; value: string };

const idPattern = /^[0-9]{1,32}$/;
const normalizeName = (name: string) => name.normalize('NFD').replace(/\p{Diacritic}/gu, '')
  .toLocaleLowerCase('pt-BR').replace(/\s+/gu, ' ').trim();
const canonicalId = (value: string) => value.replace(/^0+(?=\d)/, '');

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

export function parseClinicorpLookup(term: string): Lookup | null {
  const value = term.trim().replace(/\s+/gu, ' ');
  if (idPattern.test(value) && canonicalId(value) !== '0') return { field: 'PatientId', value: canonicalId(value) };
  if (value.length < 3 || value.length > 160 || !/^[\p{L}\p{M}\p{N} .’'-]+$/u.test(value) || !/\p{L}/u.test(value)) return null;
  return { field: 'Name', value };
}

export function clinicorpCredentialsForUnit(config: string | undefined, unitId: string): ClinicorpCredentials | null {
  if (!config) return null;
  try {
    const units = asRecord(JSON.parse(config));
    const unit = units && Object.hasOwn(units, unitId) ? asRecord(units[unitId]) : null;
    if (!unit || typeof unit.username !== 'string' || typeof unit.token !== 'string' || typeof unit.subscriberId !== 'string') return null;
    if (!unit.username.trim() || !unit.token.trim() || !unit.subscriberId.trim()) return null;
    return { username: unit.username.trim(), token: unit.token.trim(), subscriberId: unit.subscriberId.trim() };
  } catch {
    return null;
  }
}

function getCandidates(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const data = asRecord(payload);
  if (!data) return [];
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.patients)) return data.patients;
  return [asRecord(data.data) ?? asRecord(data.patient) ?? data];
}

function matchingPatients(payload: unknown, lookup: Lookup): ClinicorpPatient[] {
  const patients = new Map<string, ClinicorpPatient>();
  for (const raw of getCandidates(payload)) {
    const patient = asRecord(raw);
    if (!patient) continue;
    const rawId = patient.PatientId;
    const id = typeof rawId === 'string' ? rawId.trim() : Number.isSafeInteger(rawId) ? String(rawId) : '';
    const name = typeof patient.Name === 'string' ? patient.Name.trim() : '';
    const status = typeof patient.Status === 'string' ? patient.Status.trim().toUpperCase() : '';
    if (!idPattern.test(id) || canonicalId(id) === '0' || name.length < 2 || name.length > 160 || status === 'DELETED') continue;
    const matches = lookup.field === 'PatientId'
      ? canonicalId(id) === lookup.value
      : normalizeName(name).includes(normalizeName(lookup.value));
    if (matches) patients.set(id, { id, name });
    if (patients.size === 12) break;
  }
  return Array.from(patients.values());
}

export async function lookupClinicorpPatients(
  lookup: Lookup,
  credentials: ClinicorpCredentials,
  fetcher: typeof fetch = fetch,
): Promise<ClinicorpLookupResult> {
  const url = new URL('https://api.clinicorp.com/rest/v1/patient/get');
  url.searchParams.set('subscriber_id', credentials.subscriberId);
  url.searchParams.set(lookup.field, lookup.value);
  try {
    const authorization = Buffer.from(credentials.username + ':' + credentials.token).toString('base64');
    const response = await fetcher(url, {
      headers: { Accept: 'application/json', Authorization: 'Basic ' + authorization },
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(9000),
    });
    if (response.status === 404 || response.status === 204) return { patients: [] };
    if (response.status === 429) return { error: 'busy' };
    if (!response.ok) return { error: 'unavailable' };
    return { patients: matchingPatients(await response.json(), lookup) };
  } catch {
    return { error: 'unavailable' };
  }
}
