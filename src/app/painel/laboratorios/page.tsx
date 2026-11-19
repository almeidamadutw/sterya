import { requireProfile } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { EmptyState } from '@/components/empty-state';
export const metadata = { title: 'Laboratórios' };
export default async function Laboratories() {
  if ((await requireProfile()).role === 'laboratorio') redirect('/painel/pecas');
  const supabase = await createClient();
  const { data, error } = await supabase.from('laboratories').select('id,name,active').order('name');
  return <><div className="page-heading"><div><span className="eyebrow">PARCEIROS DA ROTINA</span><h1>Laboratórios<span className="heading-dot">.</span></h1><p>Cada parceiro conectado às suas próprias peças.</p></div></div><section className="panel">{error ? <p role="alert" className="notice error">Não foi possível carregar os laboratórios.</p> : data?.length ? <table><thead><tr><th>Laboratório</th><th>Situação</th></tr></thead><tbody>{data.map(lab => <tr key={lab.id}><td>{lab.name}</td><td><span className="badge">{lab.active ? 'Ativo' : 'Inativo'}</span></td></tr>)}</tbody></table> : <EmptyState icon="lab" title="Os parceiros vão aparecer aqui." text="O cadastro de laboratórios e suas tabelas de referência fazem parte da próxima etapa." />}</section></>;
}
