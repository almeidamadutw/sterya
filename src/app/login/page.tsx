import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/auth';
import { AuthShell } from '@/components/auth-shell';
import { LoginForm } from '@/components/auth-forms';
export const dynamic = 'force-dynamic';
export default async function Login({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  if (await getProfile()) redirect('/painel');
  const { status } = await searchParams;
  const success = status === 'activated' ? 'Conta ativada! Agora entre com seu usuário e sua senha.' : status === 'reset' ? 'Senha atualizada. Entre com sua nova senha.' : undefined;
  return <AuthShell><LoginForm success={success} /></AuthShell>;
}
