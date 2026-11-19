import { requireProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { procedureNames, statusNames } from '@/lib/validation';
import { EmptyState } from '@/components/empty-state';
export const metadata = { title: 'Peças' };
export default async function Pieces() {
  await requireProfile();
  const supabase = await createClient();
  const { data, error } = await supabase.from('pieces').select('id,patient_name,procedure_type,quantity,status,reference').order('created_at', { ascending: false }).limit(100);
  return <><div className="page-heading"><div><span className="eyebrow">ACOMPANHAMENTO</span><h1>Peças<span className="heading-dot">.</span></h1><p>Do laboratório até a entrega ao paciente.</p></div></div><div className="procedure-tags">{Object.values(procedureNames).map(name => <span key={name}>{name}</span>)}</div><section className="panel">{error ? <div className="notice error" role="alert">Não foi possível carregar as peças. Tente novamente.</div> : data?.length ? <div className="table-scroll"><table><thead><tr><th>Paciente</th><th>Procedimento</th><th>Quantidade</th><th>Referência</th><th>Situação</th></tr></thead><tbody>{data.map(piece => <tr key={piece.id}><td>{piece.patient_name}</td><td>{procedureNames[piece.procedure_type]}</td><td>{piece.quantity}</td><td>{piece.reference ?? '—'}</td><td><span className="badge">{statusNames[piece.status]}</span></td></tr>)}</tbody></table><p className="table-note">Exibindo até 100 peças mais recentes.</p></div> : <EmptyState title="Nenhuma peça cadastrada ainda." text="A base está pronta. O cadastro, as movimentações e a importação do Clinicorp serão construídos na próxima etapa." />}</section></>;
}
