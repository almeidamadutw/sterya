import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialDemoPieces, moveDemoPiece, visibleDemoPieces } from '../src/lib/demo.ts';
test('demo delivers one piece while keeping the other piece of that patient pending', () => {
  let pieces = initialDemoPieces();
  pieces = moveDemoPiece(pieces, 'demo-1', 'no_laboratorio', 'equipe');
  pieces = moveDemoPiece(pieces, 'demo-1', 'recebida', 'equipe');
  pieces = moveDemoPiece(pieces, 'demo-1', 'entregue', 'equipe');
  assert.equal(pieces.find(p => p.id === 'demo-1')?.status, 'entregue');
  assert.equal(pieces.find(p => p.id === 'demo-6')?.status, 'no_laboratorio');
  assert.equal(pieces.find(p => p.id === 'demo-1')?.history.length, 4);
});
test('demo requires physical receipt before delivery and a reason for revision', () => {
  assert.throws(() => moveDemoPiece(initialDemoPieces(), 'demo-2', 'entregue', 'equipe'));
  assert.throws(() => moveDemoPiece(initialDemoPieces(), 'demo-3', 'revisao', 'gestor', ''));
  assert.equal(moveDemoPiece(initialDemoPieces(), 'demo-3', 'revisao', 'gestor', 'Ajuste na prova')[2].status, 'revisao');
});
test('lab demo shows assigned pieces and cannot record clinic or patient delivery', () => {
  assert.equal(visibleDemoPieces(initialDemoPieces(), 'laboratorio').length, 4);
  assert.throws(() => moveDemoPiece(initialDemoPieces(), 'demo-2', 'recebida', 'laboratorio'));
});
