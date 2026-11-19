export type DemoRole = 'equipe' | 'gestor' | 'laboratorio';
export type DemoStatus = 'aguardando_envio' | 'no_laboratorio' | 'recebida' | 'entregue' | 'revisao';
export type DemoPiece = { id: string; patient: string; procedure: string; laboratory: string; unit: string; reference: string; status: DemoStatus; history: string[] };
export const demoLabs = ['Laboratório Demo A', 'Laboratório Demo B'];
export function initialDemoPieces(): DemoPiece[] {
  return [
    { id: 'demo-1', patient: 'Paciente demo 01', procedure: 'ppf_lente', laboratory: demoLabs[0], unit: 'Sorocaba', reference: 'DEMO-001', status: 'aguardando_envio', history: ['Peça de demonstração cadastrada.'] },
    { id: 'demo-2', patient: 'Paciente demo 02', procedure: 'pt', laboratory: demoLabs[1], unit: 'Salto', reference: 'DEMO-002', status: 'no_laboratorio', history: ['Peça de demonstração enviada ao laboratório.'] },
    { id: 'demo-3', patient: 'Paciente demo 03', procedure: 'protocolo', laboratory: demoLabs[0], unit: 'Sorocaba', reference: 'DEMO-003', status: 'recebida', history: ['Peça recebida. Localização de exemplo: armário A, caixa 03.'] },
    { id: 'demo-4', patient: 'Paciente demo 04', procedure: 'ppr', laboratory: demoLabs[1], unit: 'Salto', reference: 'DEMO-004', status: 'revisao', history: ['Revisão de demonstração: ajuste solicitado pelo dentista.'] },
    { id: 'demo-5', patient: 'Paciente demo 05', procedure: 'onlay', laboratory: demoLabs[0], unit: 'Sorocaba', reference: 'DEMO-005', status: 'entregue', history: ['Peça de demonstração entregue ao paciente.'] },
    { id: 'demo-6', patient: 'Paciente demo 01', procedure: 'psi', laboratory: demoLabs[0], unit: 'Sorocaba', reference: 'DEMO-006', status: 'no_laboratorio', history: ['Outra peça do mesmo paciente, com acompanhamento independente.'] }
  ];
}
const transitions: Record<DemoStatus, DemoStatus[]> = {
  aguardando_envio: ['no_laboratorio'], no_laboratorio: ['recebida'], recebida: ['entregue', 'revisao'], entregue: [], revisao: ['no_laboratorio']
};
export function moveDemoPiece(pieces: DemoPiece[], id: string, next: DemoStatus, role: DemoRole, note = '') {
  if (role === 'laboratorio') throw new Error('O perfil laboratório acompanha suas próprias peças.');
  const piece = pieces.find(p => p.id === id);
  if (!piece || !transitions[piece.status].includes(next)) throw new Error('Essa mudança não está disponível nesta etapa.');
  if (next === 'revisao' && note.trim().length < 5) throw new Error('Descreva o motivo da revisão com pelo menos 5 caracteres.');
  const event: Record<DemoStatus, string> = { aguardando_envio: 'Peça cadastrada.', no_laboratorio: 'Envio ao laboratório registrado.', recebida: 'Recebimento físico na clínica confirmado.', entregue: 'Entrega desta peça ao paciente confirmada.', revisao: `Revisão solicitada: ${note.trim()}` };
  return pieces.map(p => p.id === id ? { ...p, status: next, history: [...p.history, event[next]] } : p);
}
export function visibleDemoPieces(pieces: DemoPiece[], role: DemoRole) { return role === 'laboratorio' ? pieces.filter(p => p.laboratory === demoLabs[0]) : pieces; }
