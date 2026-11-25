import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUsername, normalizeCode, passwordError } from '../src/lib/validation.ts';
test('username supports the product alias without accepting arbitrary email domains', () => {
  assert.equal(normalizeUsername('  Ana.Silva@ceoclubcpe  '), 'ana.silva');
  assert.equal(normalizeUsername('  Suporte@CPE.CEOCLUB  '), 'suporte');
  for (const name of ['ab', 'ana@example.com', '../admin', 'ana@ceoclubcpe.evil', 'suporte@cpe.ceoclub.evil', 'a'.repeat(41), 'ana silva']) assert.equal(normalizeUsername(name), null);
});
test('paste-friendly codes keep full 128-bit entropy', () => {
  assert.equal(normalizeCode('abcd-1234-ABCD-1234-abcd-1234-abcd-1234'), 'ABCD1234ABCD1234ABCD1234ABCD1234');
  for (const code of ['', '123456', 'G'.repeat(32), 'A'.repeat(31), 'A'.repeat(33)]) assert.equal(normalizeCode(code), null);
});
test('password boundary prevents short and unbounded payloads', () => {
  assert.ok(passwordError('Abc1234'));
  assert.equal(passwordError('Abc12345'), null);
  assert.equal(passwordError('Abc123456'), null);
  assert.ok(passwordError('abc123'));
  assert.ok(passwordError('a'.repeat(15)));
  assert.ok(passwordError('1'.repeat(15)));
  assert.ok(passwordError('a1'.repeat(65)));
  assert.equal(passwordError('MeuAcesso2026!'), null);
});
