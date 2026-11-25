import { test } from 'node:test';
import assert from 'node:assert/strict';
import { materialSearch, catalogPage } from '../src/lib/materials.ts';

test('catalog search finds accented names and preserves zero-padded variants', () => {
  assert.equal(materialSearch('  ÁCIDO   Vermelho  '), 'acido vermelho');
  assert.equal(materialSearch('Fio retrator 000'), 'fio retrator 000');
  assert.equal(materialSearch('Resina A3,5'), 'resina a3,5');
});
test('catalog search treats percent and underscore as literal characters', () => {
  assert.equal(materialSearch('70%'), '70\\%');
  assert.equal(materialSearch('MAT_01'), 'mat\\_01');
  assert.equal(materialSearch('A'.repeat(121)).length, 120);
});
test('catalog pagination rejects malformed or unbounded inputs', () => {
  for (const value of [undefined, '', '0', '-1', '2.4', 'NaN', '1000000']) assert.equal(catalogPage(value), 1);
  assert.equal(catalogPage('3'), 3);
});
