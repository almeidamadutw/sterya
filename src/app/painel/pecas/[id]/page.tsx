import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { procedureNames, statusNames } from '@/lib/validation';
import { movePiece, changePiecePriority } from '@/app/actions/pieces';

export const metadata = { title: 'Detalhe da peça | STERYA' };

const dateTime = (value: string | null | undefined) => value
  ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(value))
  : 'Não registrado';
const dateOnly = (value: string | null | undefined) => value
  ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'UTC' }).format(new Date(value + 'T12:00:00Z'))
  : 'Não informado';
const actionLabel: Record<string,string> = {
  criar: 'Peça cadastrada', enviar: 'Enviar ao laboratório', reenviar: 'Reenviar ao laboratório',
  receber_laboratorio: 'Confirmar recebimento no laboratório', iniciar_producao: 'Iniciar produção',
  despachar: 'Despachar para a clínica', receber_clinica: 'Confirmar chegada física à clínica',
  entregar_paciente: 'Registrar entrega ao paciente', solicitar_revisao: 'Solicitar revisão',
  cancelar: 'Cancelar peça', marcar_prioridade: 'Prioridade adicionada',
  retirar_prioridade: 'Prioridade retirada'
};
const clinicSteps: Record<string,string[]> = {
  aguardando_envio: ['enviar','cancelar'], no_laboratorio: ['receber_clinica','cancelar'],
  recebido_laboratorio: ['receber_clinica','cancelar'], em_producao: ['receber_clinica','cancelar'],
  despachada: ['receber_clinica','cancelar'], recebida: ['entregar_paciente','solicitar_revisao'],
  entregue: ['solicitar_revisao'], revisao: ['reenviar','cancelar']
};
const labSteps: Record<string,string[]> = {
  no_laboratorio: ['receber_laboratorio'],
  recebido_laboratorio: ['iniciar_producao','despachar'],
  em_producao: ['despachar']
};
export default async function PieceDetail({
  params, searchParams
}: { params: Promise<{ id: string }>, searchParams: Promise<{ erro?: string, sucesso?: string, criada?: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const actor = await requireProfile();
  const supabase = await createClient();
  const { data: piece, error } = await supabase.from('pieces')
    .select('id,tenant_id,unit_id,patient_name,clinicorp_patient_id,procedure_type,teeth,arch,laboratory_id,laboratory_reference,reference,status,priority,priority_reason,notes,next_appointment_at,expected_at,sent_at,lab_received_at,lab_dispatched_at,received_at,delivered_at,location,created_at,created_by,updated_by,received_by,delivered_by')
    .eq('id',id).maybeSingle();
  if (error || !piece) notFound();
  const isLab = actor.role === 'laboratorio';
  const [{ data: history }, { data: labs }, { data: units }, { data: profiles }] = await Promise.all([
    supabase.from('piece_events').select('id,actor_id,actor_role,action,old_status,new_status,note,created_at').eq('piece_id',id).order('created_at',{ascending:false}).limit(100),
    supabase.from('laboratories').select('id,name'),
    isLab ? Promise.resolve({data: [] as {id:string,name:string}[]}) : supabase.from('units').select('id,name'),
    isLab ? Promise.resolve({data: [] as {id:string,full_name:string}[]}) : supabase.from('profiles').select('id,full_name')
  ]);
  const names = new Map((profiles ?? []).map(p=>[p.id,p.full_name]));
  const labName = labs?.find(l=>l.id===piece.laboratory_id)?.name ?? 'Não atribuído';
  const unitName = units?.find(u=>u.id===piece.unit_id)?.name ?? 'Unidade da clínica';
  const actions = (isLab ? labSteps : clinicSteps)[piece.status] ?? [];
  const query = await searchParams;
  return <>
    <div className="page-heading"><div><span className="eyebrow"><Link href="/painel/pecas">Peças</Link> / {piece.reference}</span><h1>{piece.patient_name}<span className="heading-dot">.</span></h1><p>{procedureNames[piece.procedure_type] ?? piece.procedure_type} · {labName}</p></div><Link className="button secondary" href={`/etiquetas/${piece.id}`} target="_blank" rel="noopener noreferrer">Imprimir etiqueta 60 × 40</Link></div>
    {query.criada && <p className="notice success" role="status">Peça cadastrada com sucesso no banco real.</p>}
    {query.sucesso && <p className="notice success" role="status">Movimentação registrada no histórico, com data e responsável.</p>}
    {query.erro && <p className="notice error" role="alert">Operação recusada. Confira o status atual, as permissões e os campos obrigatórios.</p>}
    <div className="operations-info-grid">
      <section className="panel"><span className="eyebrow">IDENTIFICAÇÃO</span><h2>{piece.reference}</h2>
        <div className="operations-facts">
          <p><b>Situação:</b> {statusNames[piece.status] ?? piece.status}</p>
          <p><b>Procedimento:</b> {procedureNames[piece.procedure_type]}</p>
          <p><b>Dente/região:</b> {piece.teeth?.join(', ') || piece.arch || 'Não informado'}</p>
          <p><b>Laboratório:</b> {labName}</p>
          {!isLab && <p><b>Unidade:</b> {unitName}</p>}
          <p><b>Código do laboratório:</b> {piece.laboratory_reference || 'Ainda não informado'}</p>
          <p><b>Próxima consulta:</b> {dateTime(piece.next_appointment_at)}</p>
          <p><b>Prazo esperado:</b> {dateOnly(piece.expected_at)}</p>
          {piece.priority && <p><b>Prioridade:</b> {piece.priority_reason || 'Urgente'}</p>}
          {piece.location && <p><b>Localização física:</b> {piece.location}</p>}
          {piece.notes && <p><b>Observações:</b> {piece.notes}</p>}
        </div>
      </section>
      <section className="panel"><span className="eyebrow">RASTREABILIDADE</span><h2>Datas de movimentação</h2>
        <div className="operations-facts">
          <p><b>Cadastro:</b> {dateTime(piece.created_at)}</p>
          <p><b>Envio:</b> {dateTime(piece.sent_at)}</p>
          <p><b>Recebido no laboratório:</b> {dateTime(piece.lab_received_at)}</p>
          <p><b>Despacho do laboratório:</b> {dateTime(piece.lab_dispatched_at)}</p>
          <p><b>Chegada à clínica:</b> {dateTime(piece.received_at)}</p>
          <p><b>Entregue ao paciente:</b> {dateTime(piece.delivered_at)}</p>
          <p><b>Responsável pela chegada:</b> {piece.received_by ? (names.get(piece.received_by) ?? piece.received_by) : 'Não registrado'}</p>
          <p><b>Responsável pela entrega:</b> {piece.delivered_by ? (names.get(piece.delivered_by) ?? piece.delivered_by) : 'Não registrado'}</p>
        </div>
      </section>
    </div>
    {actions.length > 0 && <section className="panel"><div className="section-title"><div><h2>Registrar próxima movimentação</h2><p>A ação será salva no banco com sua identificação e horário.</p></div></div>
      <div className="operations-actions-grid">{actions.map(action=><form key={action} action={movePiece} className="operations-action-card">
        <input type="hidden" name="piece_id" value={piece.id}/><input type="hidden" name="action" value={action}/>
        <h3>{actionLabel[action]}</h3>
        {action==='receber_clinica' && <div className="field"><label htmlFor="location">Onde a peça está guardada? *</label><input id="location" name="location" maxLength={160} required placeholder="Caixa 2 / armário"/></div>}
        {isLab && ['receber_laboratorio','despachar'].includes(action) && <div className="field"><label htmlFor={`laboratory_reference_${action}`}>Código do laboratório (se disponível)</label><input id={`laboratory_reference_${action}`} name="laboratory_reference" maxLength={100} defaultValue={piece.laboratory_reference ?? ''}/></div>}
        <div className="field"><label htmlFor={`note_${action}`}>Motivo / observação{['solicitar_revisao','cancelar'].includes(action) ? ' *' : ''}</label><input id={`note_${action}`} name="note" maxLength={1000} required={['solicitar_revisao','cancelar'].includes(action)} placeholder="Opcional, exceto revisão ou cancelamento"/></div>
        <button className="button primary" type="submit">{actionLabel[action]}</button>
      </form>)}</div>
    </section>}
    {!isLab && <section className="panel">
      <div className="section-title"><div><h2>Prioridade da peça</h2><p>O laboratório verá as peças prioritárias antes das demais.</p></div><span className="badge">{piece.priority ? 'Prioritária' : 'Normal'}</span></div>
      <form className="operations-inline-form" action={changePiecePriority}>
        <input type="hidden" name="piece_id" value={piece.id}/>
        <input type="hidden" name="priority" value={piece.priority ? 'false' : 'true'}/>
        {!piece.priority && <input name="reason" maxLength={500} placeholder="Motivo da urgência" aria-label="Motivo da urgência"/>}
        <button type="submit" className="button secondary">{piece.priority ? 'Retirar prioridade' : 'Marcar como prioridade'}</button>
      </form>
    </section>}
    <section className="panel"><div className="section-title"><div><h2>Histórico completo</h2><p>Movimentações auditadas e associadas ao usuário.</p></div><span className="badge">{history?.length ?? 0} eventos</span></div>
      {history?.length ? <div className="operations-timeline">{history.map(event=><div className="operations-history" key={event.id}>
        <div><strong>{actionLabel[event.action] ?? event.action}</strong><span>{dateTime(event.created_at)}</span></div>
        <p>{names.get(event.actor_id) ?? `${event.actor_role} · ${event.actor_id.slice(0,8)}`}</p>
        {event.old_status && <p>{statusNames[event.old_status] ?? event.old_status} → {statusNames[event.new_status ?? ''] ?? event.new_status}</p>}
        {event.note && <p>Observação: {event.note}</p>}
      </div>)}</div> : <p className="operations-muted">Sem eventos registrados ainda.</p>}
    </section>
  </>;
}
