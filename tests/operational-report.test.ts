import test from 'node:test';
import assert from 'node:assert/strict';
import { readReportRows } from '../src/lib/operational-report.ts';
import { operationalPdf } from '../src/lib/operational-pdf.ts';

test('reads the complete result even when the provider caps each response below the requested range', async () => {
  const data = Array.from({ length: 235 }, (_, i) => 'Teste ' + i);
  const records = await readReportRows(async (from, to) => ({
    data: data.slice(from, Math.min(from + 25, to + 1)), count: data.length, error: null,
  }));
  assert.deepEqual(records, data);
});

test('fails rather than returning a partial PDF dataset on an interrupted or changed query', async () => {
  for (const second of [{ data: [] as number[], count: 2, error: null }, { data: [2], count: 3, error: null },
    { data: null, count: null, error: 'indisponível' }]) {
    await assert.rejects(readReportRows(async from => from ? second : { data: [1], count: 2, error: null }));
  }
});

test('returns PDF bytes for an empty list and a multipage list of fictitious records', async () => {
  for (const rows of [[], Array.from({ length: 205 }, (_, i) => ['Peça ' + i, 'Clínica fictícia'])]) {
    const pdf = Buffer.from(await operationalPdf({ title: 'Peças', scope: 'Teste · Unidades', count: rows.length + ' peças',
      headers: ['Descrição', 'Unidade'], widths: ['60%', '40%'], rows }));
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
    const pages = (pdf.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length;
    assert.ok(rows.length ? pages > 1 : pages === 1);
  }
});
