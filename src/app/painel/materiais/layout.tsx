import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { requireProfile } from '@/lib/auth';

export default async function MaterialsLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile();
  if (!['suporte', 'gestor', 'equipe'].includes(profile.role)) redirect('/painel/pecas');
  return children;
}
