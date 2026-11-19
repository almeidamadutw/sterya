import { AuthShell } from '@/components/auth-shell';
import { CodeForm } from '@/components/auth-forms';
export const metadata = { title: 'Primeiro acesso' };
export default function Activate() { return <AuthShell><CodeForm kind="activate" /></AuthShell>; }
