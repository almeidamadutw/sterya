'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/icon';
export function Navigation({ manager, lab }: { manager: boolean; lab: boolean }) {
  const pathname = usePathname();
  const links = [{ href: '/painel', title: 'Visão geral', icon: 'grid' }, { href: '/painel/pecas', title: 'Peças', icon: 'box' }, ...(!lab ? [{ href: '/painel/laboratorios', title: 'Laboratórios', icon: 'lab' }, { href: '/painel/materiais', title: 'Materiais', icon: 'list' }] : []), ...(manager ? [{ href: '/painel/usuarios', title: 'Usuários', icon: 'users' }] : [])];
  return <nav className="main-nav" aria-label="Navegação principal">{links.map(link => <Link key={link.href} href={link.href} className={pathname === link.href ? 'active' : ''} aria-current={pathname === link.href ? 'page' : undefined}><Icon name={link.icon} /><span>{link.title}</span></Link>)}</nav>;
}
