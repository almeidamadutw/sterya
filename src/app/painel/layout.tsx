import { Brand } from '@/components/brand';
import { Navigation } from '@/components/navigation';
import { Icon } from '@/components/icon';
import { requireProfile } from '@/lib/auth';
import { roleNames } from '@/lib/validation';
import { signOut } from '@/app/actions/auth';
import { createClient } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data: tenant } = await supabase.from('tenants').select('name').eq('id', profile.tenant_id).single();
  return <div className="app-shell"><aside className="sidebar"><Brand compact /><div className="workspace"><span className="workspace-dot" /><span>{tenant?.name ?? 'Sua clínica'}<small>CONTROLE DE PROCESSOS</small></span></div>
    <span className="nav-caption">SEU ESPAÇO</span><Navigation manager={['suporte', 'gestor'].includes(profile.role)} lab={profile.role === 'laboratorio'} />
    <div className="sidebar-bottom"><div className="sidebar-message"><Icon name="lock" size={17} /><p>Mais clareza para<br />cuidar de cada etapa.</p></div><div className="account"><span className="avatar">{profile.full_name.slice(0, 1).toUpperCase()}</span><span>{profile.full_name}<small>{roleNames[profile.role]}</small></span><form action={signOut}><button type="submit" aria-label="Sair da conta" title="Sair da conta"><Icon name="logout" size={18} /></button></form></div></div></aside>
    <div className="app-main"><header className="app-topbar"><span className="breadcrumb">CEO Club <b>/</b> CPE</span><span className="topbar-label"><span className="tiny-dot" /> Controle de processos</span></header><main id="conteudo" className="page-content">{children}</main><footer className="app-footer">CEO Club CPE <span>Uma rotina mais conectada.</span></footer></div></div>;
}
