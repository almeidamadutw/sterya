import Link from 'next/link';
import { requireProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { procedureNames, statusNames } from '@/lib/validation';
import { EmptyState } from '@/components/empty-state';
import { ClinicorpPiecePatient } from '@/components/clinicorp-piece-patient';
import { createPiece } from '@/app/actions/pieces';

export const metadata = { title: 'Peças | STERYA' };

const displayAppointment = (date: string | null) => date
  ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(date))
  : 'Não informada';

export default async function Pieces({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const actor = await requireProfile();
  const isLab = actor.role === 'laboratorio';
  const supabase = await createClient();
  const [pieceResult, labResult, unitResult] = await Promise.all([
    supabase.from('pieces').select('id,patient_name,procedure_type,teeth,arch,reference,status,laboratory_id,priority,next_appointment_at,expected_at').order('priority', { ascending: false }).order('next_appointment_at', { ascending: true, nullsFirst: false }).limit(200),
    supabase.from('laboratories').select('id,name,active').order('name'),
    isLab ? Promise.resolve({data: [] as { id: string, name: string }[]}) : supabase.from('units').select('id,name').order('name')
  ]);
  const labs = labResult.data ?? [];
  const units = unitResult.data ?? [];
  const labById = new Map(labs.map(l => [l.id, l.name]));
  const params = await searchParams;
  return <>
    <div className="page-heading"><div><span className="eyebrow">CONTROLE PROTÉTICO</span><h1>Peças<span className="heading-dot">.</span></h1><p>Uma peça por registro, com histórico individual e recebimento confirmado.</p></div></div>
    {params.erro && <p className="notice error" role="alert">Não foi possível concluir a operação. Confira os dados e suas permissões.</p>}
    {!isLab && <details className="panel operations-create">
      <summary className="operations-summary">+ Cadastrar nova peça</summary>
      <p className="operations-muted">Busque um paciente no Clinicorp ou preencha o nome manualmente.</p>
      {labs.length === 0 || units.length === 0
        ? <div className="notice error">Cadastre uma unidade e pelo menos um laboratório antes de criar peças.</div>
        : <form action={createPiece} className="operations-form">
          <ClinicorpPiecePatient units={units} />
          <div className="field"><label htmlFor="procedure_type">Procedimento *</label><select id="procedure_type" name="procedure_type" required>{Object.entries(procedureNames).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></div>
          <div className="field"><label htmlFor="laboratory_id">Laboratório *</label><select name="laboratory_id" id="laboratory_id" required><option value="">Selecione</option>{labs.filter(l=>l.active).map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
          <div className="field"><label htmlFor="teeth">Dente(s) ou região</label><input id="teeth" name="teeth" maxLength={120} placeholder="11, 12, 21" /><small>Separe os dentes por vírgula. Cada peça deve ter seu próprio registro.</small></div>
          <div className="field"><label htmlFor="arch">Arcada</label><select name="arch" id="arch"><option value="">Não se aplica</option><option value="superior">Superior</option><option value="inferior">Inferior</option><option value="ambas">Ambas</option></select></div>
          <div className="field"><label htmlFor="expected_at">Prazo esperado para a peça</label><input id="expected_at" name="expected_at" type="date" /></div>
          <div className="field"><label htmlFor="next_appointment_at">Próxima consulta</label><input id="next_appointment_at" name="next_appointment_at" type="datetime-local" /></div>
          <div className="field"><label htmlFor="notes">Observações</label><input id="notes" name="notes" maxLength={1000} placeholder="Instruções para o laboratório" /></div>
          <label className="operations-checkbox"><input type="checkbox" name="priority"/> Peça prioritária</label>
          <div className="operations-actions"><button type="submit" className="button primary">Salvar peça no banco</button></div>
        </form>}
    </details>}
    <section className="panel">
      <div className="section-title"><div><h2>{isLab ? 'Peças atribuídas ao seu laboratório' : 'Acompanhamento das peças'}</h2><p>Prioridades primeiro, depois a próxima consulta.</p></div><span className="badge">{pieceResult.data?.length ?? 0} registros</span></div>
      {pieceResult.error
        ? <p className="notice error" role="alert">Erro ao consultar as peças. Tente novamente.</p>
        : pieceResult.data?.length
          ? <div className="table-scroll"><table><thead><tr><th>Paciente</th><th>Peça / dente</th><th>Laboratório</th><th>Próxima consulta</th><th>Situação</th><th></th></tr></thead>
            <tbody>{pieceResult.data.map(piece=><tr key={piece.id}><td><b>{piece.patient_name}</b>{piece.priority && <span className="badge operations-priority">Prioridade</span>}<div className="operations-muted">{piece.reference}</div></td><td>{procedureNames[piece.procedure_type] ?? piece.procedure_type}<div className="operations-muted">{piece.teeth?.join(', ') || piece.arch || 'Sem região'}</div></td><td>{labById.get(piece.laboratory_id ?? '') ?? 'Não atribuído'}</td><td>{displayAppointment(piece.next_appointment_at)}</td><td><span className="badge">{statusNames[piece.status] ?? piece.status}</span></td><td><Link href={`/painel/pecas/${piece.id}`} className="button secondary">Abrir</Link></td></tr>)}</tbody>
          </table></div>
          : <EmptyState title="Nenhuma peça cadastrada ainda." text={isLab ? 'As peças atribuídas a este laboratório aparecerão aqui.' : 'Comece cadastrando uma peça para acompanhar cada movimentação em tempo real.'}/>}
    </section>
  </>;
}
