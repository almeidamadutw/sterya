import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lookupClinicorpProcedures } from '../supabase/functions/cpe-clinicorp-lookup/procedures.ts';

const credentials = { username: 'reader-fixture', token: 'dummy-token', subscriberId: 'salto-fixture' };
const now = new Date('2026-11-28T01:30:00Z'); // 22h30 on November 27 in São Paulo.
const appointment = { ItemType: 'APPOINTMENT', Clinic_BusinessId: '42', Patient_PersonId: '6500' };

function api(handlers: Record<string, (url: URL, request?: RequestInit) => Response>) {
  const calls: URL[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    calls.push(url);
    assert.equal(url.origin, 'https://api.clinicorp.com');
    assert.equal(url.searchParams.get('subscriber_id'), credentials.subscriberId);
    assert.equal(new Headers(init?.headers).get('Authorization'), 'Basic ' + btoa('reader-fixture:dummy-token'));
    assert.equal(init?.cache, 'no-store');
    assert.equal(init?.redirect, 'error');
    const route = url.pathname.replace('/rest/v1/', '');
    assert.ok(handlers[route], 'Unexpected request: ' + route);
    return handlers[route](url, init);
  };
  return { calls, fetcher };
}

test('filters appointments by exact patient and branch and prefers the documented UTC instant', async () => {
  const { calls, fetcher } = api({
    'business/list': () => Response.json([
      { id: 42, BusinessName: 'Casal Odonto - Salto' },
      { id: 43, Name: 'Salto de Pirapora' },
    ]),
    'appointment/list': url => {
      assert.equal(url.searchParams.get('businessId'), '42');
      assert.equal(url.searchParams.get('patientId'), '6500');
      assert.equal(url.searchParams.get('from'), '2026-11-20');
      assert.equal(url.searchParams.get('to'), '2027-11-27');
      assert.equal(url.searchParams.has('includeCanceled'), false);
      return Response.json([
        { ...appointment, id: 800, Clinic_BusinessId: 43, date: '2026-11-28T02:00:00Z', ProcedureName: 'Onlay' },
        { ...appointment, id: 801, Patient_PersonId: '6501', date: '2026-11-28T02:00:00Z', ProcedureName: 'Onlay' },
        { ...appointment, id: 802, date: '2026-11-28T02:05:00Z', Canceled: 'X', ProcedureName: 'Onlay' },
        { ...appointment, id: 803, date: '2026-11-28T02:10:00Z', Deleted: true, ProcedureName: 'Onlay' },
        { ...appointment, id: 804, date: '2026-11-28T02:15:00Z', StatusDescription: 'Paciente faltou', ProcedureName: 'Onlay' },
        { ...appointment, id: 805, date: '2026-11-28T02:20:00Z', StatusDescription: 'Finalizado', ProcedureName: 'Avaliação' },
        { ...appointment, id: 806, date: '2026-11-28T02:30:00Z', AtomicDate: 20261128, fromTime: '18:45', CategoryDescription: 'Avaliação', Notes: 'Onlay' },
        { ...appointment, id: 807, AtomicDate: 20261129, fromTime: '09:15', SelectedProceduresList: [
          { OperationDescription: 'PPF posterior', Dentes: [36], Notes: 'Somente laboratório confirmado', Amount: 500 },
        ] },
      ]);
    },
  });

  assert.deepEqual(await lookupClinicorpProcedures('0006500', 'Salto', credentials, { fetcher, now }), {
    nextAppointment: '2026-11-28T02:30:00.000Z',
    procedures: [{
      id: 'agenda:807:0', label: 'PPF posterior', type: 'ppf_lente', teeth: ['36'], arch: null,
      source: 'agenda', date: '2026-11-29',
    }],
  });
  assert.equal(calls.length, 2);
});

test('falls back to recent approved budget items and converts a validated Brazilian appointment clock', async () => {
  const { calls, fetcher } = api({
    'appointment/list': () => Response.json({ list: [
      { ...appointment, id: 808, AtomicDate: 20261128, fromTime: '9:20', CategoryDescription: 'Avaliação', Notes: 'Contenção não é procedimento escolhido' },
      { ...appointment, id: 809, AtomicDate: 20261128, fromTime: '8:00', ItemType: 'EVENT' },
      { ...appointment, id: 810, AtomicDate: 20261128, fromTime: '8:00', NoShow: 'X' },
      { ...appointment, id: 811, AtomicDate: 20261128, fromTime: '8:00', Completed: 'X' },
    ] }),
    'estimates/list': url => {
      assert.equal(url.searchParams.get('clinic_id'), '42');
      assert.equal(url.searchParams.get('status'), 'APPROVED');
      assert.equal(url.searchParams.get('from'), '2026-10-28');
      assert.equal(url.searchParams.get('to'), '2026-11-27');
      const estimate = {
        BusinessId: 42, PatientId: 6500, TreatmentId: 881, Status: 'APPROVED', ApprovedDate: '2026-11-26T19:00:00Z',
        ProcedureList: [{ OperationDescription: 'Prótese total superior' }],
      };
      return Response.json([
        { ...estimate, BusinessId: 43, ProcedureList: [{ OperationDescription: 'Onlay' }] },
        { ...estimate, PatientId: 6501, ProcedureList: [{ OperationDescription: 'Onlay' }] },
        { ...estimate, Status: 'OPEN', ProcedureList: [{ OperationDescription: 'Onlay' }] },
        { ...estimate, ProcedureList: [
          ...estimate.ProcedureList,
          { OperationDescription: 'Onlay', NotApproved: 'X' },
          { OperationDescription: 'Onlay', Deleted: true },
          { OperationDescription: 'Onlay', Executed: 'X' },
        ] },
      ]);
    },
  });

  assert.deepEqual(await lookupClinicorpProcedures('6500', 'Salto', credentials, { businessId: '42', fetcher, now }), {
    nextAppointment: '2026-11-28T12:20:00.000Z',
    procedures: [{
      id: 'orcamento:881:0', label: 'Prótese total superior', type: 'pt', teeth: [], arch: 'superior',
      source: 'orcamento', date: '2026-11-26',
    }],
  });
  assert.equal(calls.length, 2);
});

test('keeps a verified appointment when budget lookup fails and rejects dates or times that do not exist', async () => {
  const { fetcher } = api({
    'appointment/list': () => Response.json([
      { ...appointment, id: 812, date: '2026-11-31T00:01:00Z' },
      { ...appointment, id: 813, AtomicDate: 20261128, fromTime: '25:00' },
      { ...appointment, id: 814, AtomicDate: 20261127, fromTime: '22:30' }, // Now, not future.
      { ...appointment, id: 815, date: '2026-12-03T09:45:00-03:00' },
    ]),
    'estimates/list': () => new Response(null, { status: 429 }),
  });
  assert.deepEqual(await lookupClinicorpProcedures('6500', 'Salto', credentials, { businessId: '42', fetcher, now }), {
    nextAppointment: '2026-12-03T12:45:00.000Z', procedures: [],
  });
});

test('does not fetch patient procedures with ambiguous branches, rejected credentials or malformed upstream data', async () => {
  const cases = [
    { response: () => Response.json([{ id: 42, Name: 'Salto' }, { id: 43, BusinessName: 'Unidade Salto' }]), error: 'unit_unmapped' },
    { response: () => Response.json([{ id: 43, Name: 'Sorocaba' }]), error: 'unit_unmapped' },
    { response: () => Response.json({ error: 'assinante inválido' }), error: 'unavailable' },
    { response: () => new Response(null, { status: 401 }), error: 'credentials_rejected' },
    { response: () => new Response(null, { status: 429 }), error: 'busy' },
  ];
  for (const example of cases) {
    const { calls, fetcher } = api({ 'business/list': example.response });
    assert.deepEqual(await lookupClinicorpProcedures('6500', 'Salto', credentials, { fetcher, now }), { error: example.error });
    assert.equal(calls.length, 1);
  }
});
