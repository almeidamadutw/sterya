'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/icon';
export function Navigation({ manager, lab }: { manager: boolean; lab: boolean }) {
  const pathname = usePathname();
  const links = [
    { href: '/painel', title: 'Visão geral', icon: 'grid' },
    { href: '/painel/pecas', title: 'Peças', icon: 'box' },
    ...(!lab ? [
      { href: '/painel/laboratorios', title: 'Laboratórios', icon: 'lab' },
      { href: '/painel/materiais', title: 'Materiais', icon: 'list' },
      { href: '/painel/materiais/pedidos', title: 'Compras e estoque', icon: 'box' },
    ] : []),
    ...(manager ? [{ href: '/painel/usuarios', title: 'Usuários', icon: 'users' }] : []),
  ];
  const active = links.findLast(link => pathname === link.href
    || (link.href !== '/painel' && pathname.startsWith(link.href + '/')));
  return <nav className="main-nav" aria-label="Navegação principal">{links.map(link =>
    <Link key={link.href} href={link.href} className={active === link ? 'active' : undefined}
      aria-current={pathname === link.href ? 'page' : active === link ? 'location' : undefined}>
      <Icon name={link.icon} /><span>{link.title}</span>
    </Link>
  )}</nav>;
}
