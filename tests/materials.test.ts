import { test } from 'node:test';
import assert from 'node:assert/strict';
import { materialSearch, catalogPage } from '../src/lib/materials.ts';
import { formatApprovedPurchase, getIFoodMarketLink } from '../src/lib/assisted-purchase.ts';

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

test('approved shopping list preserves each item variant, measure and decimal quantity', () => {
  const list = formatApprovedPurchase([
    { material_name: 'Fio retrator', material_variant: '000', quantity: 2, measure: 'caixa' },
    { material_name: 'Sabão líquido', material_variant: null, quantity: 1.5, measure: 'L' },
  ]);
  assert.equal(list, '• Fio retrator - 000 — 2 caixa\n• Sabão líquido — 1,5 L');
});

test('market shortcut accepts HTTPS iFood links and rejects lookalike destinations', () => {
  assert.equal(getIFoodMarketLink(' https://www.ifood.com.br/delivery/loja '), 'https://www.ifood.com.br/delivery/loja');
  assert.equal(getIFoodMarketLink('https://i.ifood.com.br/abc'), 'https://i.ifood.com.br/abc');
  for (const url of ['javascript:alert(1)', 'http://ifood.com.br', 'https://ifood.com.br.example.org',
    'https://ifood.com.br@other.example', 'https://name@ifood.com.br', 'https://ifood.com.br:1234']) {
    assert.equal(getIFoodMarketLink(url), null);
  }
});
