import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  classifyPieceProcedure,
  parsePieceArch,
  parsePieceTeeth,
  suggestPieceLaboratory,
} from '../supabase/functions/cpe-clinicorp-lookup/piece-procedure.ts';

const labs = [
  { id: 'alexandra', name: 'Laboratório Alexandra - Carla', active: true },
  { id: 'emerson', name: 'Laboratório Emerson', active: true },
  { id: 'design', name: 'Laboratório Design - Renan', active: true },
  { id: 'daiane', name: 'Laboratório Daiane Mota', active: true },
  { id: 'eder', name: 'Laboratório Eder', active: true },
];

test('recognizes explicit prosthetic procedure names from treatment and lab descriptions', () => {
  assert.equal(classifyPieceProcedure('Moldagem para PPF anterior'), 'ppf_lente');
  assert.equal(classifyPieceProcedure('Prótese parcial fixa em zircônia'), 'ppf_lente');
  assert.equal(classifyPieceProcedure('Lente anterior'), 'ppf_lente');
  assert.equal(classifyPieceProcedure('Confecção de coroa E.Max'), 'ppf_lente');
  assert.equal(classifyPieceProcedure('ONLAY cerâmica'), 'onlay');
  assert.equal(classifyPieceProcedure('PSI – coroa em zircônia'), 'psi');
  assert.equal(classifyPieceProcedure('Prótese sobre implante'), 'psi');
  assert.equal(classifyPieceProcedure('Prótese total definitiva'), 'pt');
  assert.equal(classifyPieceProcedure('Prótese total tipo protocolo'), 'protocolo');
  assert.equal(classifyPieceProcedure('Protocolo inferior de carga imediata'), 'protocolo');
  assert.equal(classifyPieceProcedure('Barra para protocolo'), 'protocolo');
  assert.equal(classifyPieceProcedure('Armação para prótese parcial removível'), 'ppr');
  assert.equal(classifyPieceProcedure('Contenção 3x3 simples higiênica'), 'contencao');
});

test('does not turn surgical stages or conflicting descriptions into a piece', () => {
  for (const label of [
    'Implante unitário',
    'Cirurgia de protocolo',
    'Reabertura de implantes',
    'Protocolo de clareamento',
    'Aumento de coroa clínica',
    'Coroa metalocerâmica sobre implante',
    'Remoção de contenção',
    'PPR e PT',
  ]) {
    assert.equal(classifyPieceProcedure(label), null, label);
  }
});

test('routes fixed types and distinguishes PPR infrastructure', () => {
  assert.equal(suggestPieceLaboratory('psi', 'PSI', [], labs), 'design');
  assert.equal(suggestPieceLaboratory('pt', 'PT', [], labs), 'alexandra');
  assert.equal(suggestPieceLaboratory('protocolo', 'Protocolo', [], labs), 'alexandra');
  assert.equal(suggestPieceLaboratory('ppr', 'PPR definitiva', [], labs), 'alexandra');
  assert.equal(suggestPieceLaboratory('ppr', 'Infraestrutura de PPR', [], labs), 'eder');
  assert.equal(suggestPieceLaboratory('ppr', 'Armação para PPR', [], labs), 'eder');
  assert.equal(suggestPieceLaboratory('ppr', 'PPR sem armação', [], labs), 'alexandra');
  assert.equal(suggestPieceLaboratory('contencao', 'Contenção', [], labs), 'daiane');
  assert.equal(suggestPieceLaboratory('onlay', 'Onlay posterior', ['16'], labs), null);
});

test('PPF or lens routing needs a consistent explicit region or FDI teeth', () => {
  assert.equal(suggestPieceLaboratory('ppf_lente', 'PPF anterior', [], labs), 'design');
  assert.equal(suggestPieceLaboratory('ppf_lente', 'PPF posterior', [], labs), 'emerson');
  assert.equal(suggestPieceLaboratory('ppf_lente', 'PPF', ['13', '21', '32'], labs), 'design');
  assert.equal(suggestPieceLaboratory('ppf_lente', 'Coroa', ['14', '27', '48'], labs), 'emerson');
  assert.equal(suggestPieceLaboratory('ppf_lente', 'Lente', [], labs), null);
  assert.equal(suggestPieceLaboratory('ppf_lente', 'PPF', ['11', '16'], labs), null);
  assert.equal(suggestPieceLaboratory('ppf_lente', 'PPF anterior', ['17'], labs), null);
  assert.equal(suggestPieceLaboratory('ppf_lente', 'PPF anterior e posterior', ['11'], labs), null);
  assert.equal(suggestPieceLaboratory('ppf_lente', 'PPF', ['19'], labs), null);
});

test('routing never chooses an inactive or ambiguous laboratory record', () => {
  assert.equal(suggestPieceLaboratory('pt', '', [], labs.map(lab => ({ ...lab, active: false }))), null);
  assert.equal(suggestPieceLaboratory('psi', '', [], [
    ...labs,
    { id: 'duplicate', name: 'Laboratorio Design-Renan', active: true },
  ]), null);
});

test('keeps only explicitly formatted tooth and arch metadata', () => {
  assert.deepEqual(parsePieceTeeth([11, '21', 11, '54']), ['11', '21', '54']);
  assert.deepEqual(parsePieceTeeth('14, 26 / 47'), ['14', '26', '47']);
  assert.deepEqual(parsePieceTeeth('11-13'), []);
  assert.deepEqual(parsePieceTeeth([11, 'dose 16']), []);
  assert.deepEqual(parsePieceTeeth([{ id: 11 }]), []);
  assert.equal(parsePieceArch('Prótese total superior'), 'superior');
  assert.equal(parsePieceArch('Mandíbula'), 'inferior');
  assert.equal(parsePieceArch('PT Sup./Inf.'), 'ambas');
  assert.equal(parsePieceArch('Ambas'), 'ambas');
  assert.equal(parsePieceArch('PT'), null);
});
