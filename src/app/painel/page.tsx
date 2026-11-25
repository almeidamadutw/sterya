import Link from 'next/link';
import { requireProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Icon } from '@/components/icon';
import { EmptyState } from '@/components/empty-state';
export const metadata = { title: 'Visão geral' };
export default async function Dashboard() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const statuses = [['no_laboratorio','recebido_laboratorio','em_producao','despachada'], ['recebida'], ['revisao'], ['entregue']];
  const counts = await Promise.all(statuses.map(status => supabase.from('pieces').select('id', { count: 'exact', head: true }).in('status', status)));
  const failed = counts.some(result => result.error);
  const today = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeZone: 'America/Sao_Paulo' }).format(new Date());
  const cards = [{ title: 'No laboratório', sub: 'Acompanhando a produção', icon: 'lab', color: 'blue' }, { title: 'Recebidas na clínica', sub: 'Prontas para a próxima etapa', icon: 'box', color: 'green' }, { title: 'Em revisão', sub: 'Atenção aos retornos', icon: 'clock', color: 'amber' }, { title: 'Entregues ao paciente', sub: 'Cuidado concluído', icon: 'check', color: 'purple' }];
  return <><div className="page-heading"><div><span className="eyebrow">VISÃO GERAL</span><h1>Olá, {profile.full_name.split(' ')[0]}<span className="heading-dot">.</span></h1><p>Cada etapa acompanhada. Cada detalhe no lugar.</p></div><span className="date-chip"><Icon name="calendar" size={17} />{today}</span></div>
    {failed && <div className="notice error" role="alert">Não foi possível atualizar os indicadores. Recarregue a página.</div>}
    <section className="stats-grid" aria-label="Indicadores de peças">{cards.map((c, i) => <div className="stat-card" key={c.title}><div className="stat-top"><span>{c.title}</span><span className={`stat-icon ${c.color}`}><Icon name={c.icon} /></span></div><strong>{counts[i].error ? '—' : counts[i].count ?? 0}</strong><small>{c.sub}</small></div>)}</section>
    <section className="panel welcome-panel"><div><span className="eyebrow">UMA NOVA FORMA DE ORGANIZAR</span><h2>Sua operação, mais conectada.</h2><p>O início de uma rotina em que cada peça tem seu lugar<br className="desktop-break" /> e cada informação chega à pessoa certa.</p><Link href="/painel/pecas" className="button primary">Acompanhar peças<Icon name="arrow" size={17} /></Link></div><div className="welcome-steps"><span><i>01</i> Envio ao laboratório</span><span><i>02</i> Recebimento na clínica</span><span><i>03</i> Entrega ao paciente</span></div></section>
    <section className="panel"><div className="section-title"><div><h2>Agenda e conferência de peças</h2><p>Quem vem hoje e o que precisa estar pronto.</p></div><span className="badge neutral">Próxima etapa</span></div><EmptyState icon="calendar" title="Vamos conectar a rotina da clínica." text="A agenda do Clinicorp e a conferência das peças por consulta serão integradas na próxima etapa do projeto." /></section>
  </>;
}
