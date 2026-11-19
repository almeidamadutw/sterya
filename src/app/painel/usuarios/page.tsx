import { requireManager } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { UserAccess } from '@/components/user-access';
import { roleNames } from '@/lib/validation';
export const metadata = { title: 'Usuários' };
export default async function Users() {
  const profile = await requireManager();
  const supabase = await createClient();
  const [people, labs] = await Promise.all([supabase.from('profiles').select('id,username,full_name,role,active').order('full_name'), supabase.from('laboratories').select('id,name').eq('active', true).order('name')]);
  return <><div className="page-heading"><div><span className="eyebrow">PESSOAS E PERMISSÕES</span><h1>Usuários<span className="heading-dot">.</span></h1><p>Cada pessoa com o acesso certo para sua rotina.</p></div></div>{people.error || labs.error ? <div className="notice error" role="alert">Não foi possível carregar os acessos. Recarregue a página.</div> : <><UserAccess people={people.data ?? []} labs={labs.data ?? []} support={profile.role === 'suporte'} /><section className="panel"><div className="section-title"><div><h2>Pessoas da clínica</h2><p>{people.data?.length ?? 0} conta(s) ativada(s)</p></div></div><div className="table-scroll"><table><thead><tr><th>Nome</th><th>Usuário</th><th>Perfil</th><th>Situação</th></tr></thead><tbody>{people.data?.map(person => <tr key={person.id}><td><b>{person.full_name}</b></td><td>{person.username}</td><td>{roleNames[person.role]}</td><td><span className="badge">{person.active ? 'Ativo' : 'Inativo'}</span></td></tr>)}</tbody></table></div></section></>}</>;
}
