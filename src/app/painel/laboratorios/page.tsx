import { requireProfile } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { EmptyState } from '@/components/empty-state';
export const metadata = { title: 'Laboratórios' };
const specialty: Record<string, string> = {
  'Laboratório Alexandra - Carla': 'PT, PPR e demais trabalhos',
  'Laboratório Emerson': 'PPF posterior',
  'Laboratório Design - Renan': 'PSI e PPF anterior',
  'Laboratório Daiane Mota': 'Contenção',
  'Laboratório Eder': 'Infraestrutura de PPR'
};
export default async function Laboratories() {
  if ((await requireProfile()).role === 'laboratorio') redirect('/painel/pecas');
  const supabase = await createClient();
  const { data, error } = await supabase.from('laboratories').select('id,name,active').order('name');
  return <><div className="page-heading"><div><span className="eyebrow">PARCEIROS DA ROTINA</span><h1>Laboratórios<span className="heading-dot">.</span></h1><p>Parceiros da Casal Odonto e encaminhamento sugerido por especialidade.</p></div></div>
    <section className="panel"><div className="section-title"><div><h2>Laboratórios cadastrados no banco</h2><p>Os logins individuais podem ser emitidos pela área de Usuários.</p></div><span className="badge">{data?.length ?? 0} laboratórios</span></div>
    {error ? <p role="alert" className="notice error">Não foi possível carregar os laboratórios.</p>
      : data?.length ? <div className="table-scroll"><table><thead><tr><th>Laboratório</th><th>Especialidade</th><th>Situação</th></tr></thead><tbody>
        {data.map(lab => <tr key={lab.id}><td><b>{lab.name}</b></td><td>{specialty[lab.name] ?? 'Conforme cadastro'}</td><td><span className="badge">{lab.active ? 'Ativo' : 'Inativo'}</span></td></tr>)}
      </tbody></table></div> : <EmptyState icon="lab" title="Nenhum laboratório cadastrado." text="Os laboratórios parceiros aparecerão aqui."/ >}</section></>;
}
