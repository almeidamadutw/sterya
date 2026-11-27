import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clinicorpCredentialsForUnit, lookupClinicorpPatients, parseClinicorpLookup } from '../src/lib/clinicorp-lookup.ts';
import { clinicorpEdgeCredentials } from '../supabase/functions/cpe-clinicorp-lookup/config.ts';

const credentials = { username: 'reader-fixture', token: 'dummy-token', subscriberId: 'casal-fixture' };

test('chooses the correct Clinicorp query field and keeps a numeric ID as text', () => {
  assert.deepEqual(parseClinicorpLookup('  Joana  D’Ávila  '), { field: 'Name', value: 'Joana D’Ávila' });
  assert.deepEqual(parseClinicorpLookup('00012345678901234567'), { field: 'PatientId', value: '12345678901234567' });
  assert.equal(parseClinicorpLookup('00'), null);
  assert.equal(parseClinicorpLookup('ab'), null);
  assert.equal(parseClinicorpLookup('a&subscriber_id=other'), null);
});

test('requires explicit credentials for the selected CPE unit', () => {
  const config = JSON.stringify({ 'unit-a': credentials, 'unit-b': { ...credentials, token: '' } });
  assert.deepEqual(clinicorpCredentialsForUnit(config, 'unit-a'), credentials);
  assert.equal(clinicorpCredentialsForUnit(config, 'unit-b'), null);
  assert.equal(clinicorpCredentialsForUnit(config, 'unit-other-tenant'), null);
  assert.equal(clinicorpCredentialsForUnit('broken json', 'unit-a'), null);
});

test('returns only the verified ID and name, and skips deleted and unrelated records', async () => {
  const result = await lookupClinicorpPatients({ field: 'Name', value: 'Joana Davila' }, credentials, async (input, options) => {
    const url = new URL(String(input));
    assert.equal(url.origin, 'https://api.clinicorp.com');
    assert.equal(url.pathname, '/rest/v1/patient/get');
    assert.equal(url.searchParams.get('Name'), 'Joana Davila');
    assert.equal(url.searchParams.get('subscriber_id'), credentials.subscriberId);
    assert.equal(new Headers(options?.headers).get('Authorization'), 'Basic ' + Buffer.from('reader-fixture:dummy-token').toString('base64'));
    assert.equal(options?.cache, 'no-store');
    assert.equal(options?.redirect, 'error');
    return Response.json({ patients: [
      { PatientId: '188103', Name: 'Joana Dávila Fixture', Phone: 'fictício', OtherDocumentId: 'fictício', Status: 'ACTIVE' },
      { PatientId: '188104', Name: 'Joana Dávila Desativada', Status: 'DELETED' },
      { PatientId: '188105', Name: 'Paciente Diferente' },
      { PatientId: '188103', Name: 'Joana Dávila Fixture' },
    ] });
  });
  assert.deepEqual(result, { patients: [{ id: '188103', name: 'Joana Dávila Fixture' }] });
});

test('distinguishes missing records from connection failures and honors exact ID matching', async () => {
  const lookup = { field: 'PatientId', value: '7701' } as const;
  const result = await lookupClinicorpPatients(lookup, credentials, async (input) => {
    const url = new URL(String(input));
    assert.equal(url.searchParams.get('Name'), null);
    assert.equal(url.searchParams.get('PatientId'), '7701');
    return Response.json({ data: { PatientId: 7701, Name: 'Paciente Fictício' } });
  });
  assert.deepEqual(result, { patients: [{ id: '7701', name: 'Paciente Fictício' }] });
  for (const [status, expected] of [[404, { patients: [] }], [429, { error: 'busy' }], [401, { error: 'credentials_rejected' }]] as const) {
    assert.deepEqual(await lookupClinicorpPatients(lookup, credentials, async () => new Response(null, { status })), expected);
  }
  assert.deepEqual(await lookupClinicorpPatients(lookup, credentials,
    async () => Response.json({ PatientId: 7702, Name: 'Outro Paciente Fictício' })), { patients: [] });
});

test('reads existing Supabase secrets for Salto without enabling another clinic or unit', () => {
  const secrets: Record<string, string> = {
    CLINICORP_SALTO_API_USERNAME: 'salto-reader',
    CLINICORP_SALTO_API_TOKEN: 'salto-fixture',
    CLINICORP_SALTO_SUBSCRIBER_ID: 'salto-account',
    CLINICORP_API_USERNAME: 'legacy-reader',
    CLINICORP_API_TOKEN: 'legacy-fixture',
    CLINICORP_SUBSCRIBER_ID: 'legacy-account',
  };
  const env = (key: string) => secrets[key];
  const salto = { id: 'unit-a', name: 'Salto', tenantSlug: 'casal-odonto' };
  const sorocaba = { ...salto, id: 'unit-b', name: 'Sorocaba' };
  assert.equal(clinicorpEdgeCredentials(salto, env)?.subscriberId, 'salto-account');
  assert.equal(clinicorpEdgeCredentials(sorocaba, env), null);
  assert.equal(clinicorpEdgeCredentials({ ...salto, tenantSlug: 'other-tenant' }, env), null);
  delete secrets.CLINICORP_SALTO_API_TOKEN;
  assert.equal(clinicorpEdgeCredentials(salto, env), null);
  delete secrets.CLINICORP_SALTO_API_USERNAME;
  delete secrets.CLINICORP_SALTO_SUBSCRIBER_ID;
  assert.equal(clinicorpEdgeCredentials(salto, env)?.subscriberId, 'legacy-account');
  secrets.CLINICORP_UNIT = 'Sorocaba';
  assert.equal(clinicorpEdgeCredentials(salto, env), null);
});
