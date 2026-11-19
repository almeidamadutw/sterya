import { AuthShell } from '@/components/auth-shell';
import { CodeForm } from '@/components/auth-forms';
export const metadata = { title: 'Recuperar acesso' };
export default function Recover() { return <AuthShell><CodeForm kind="reset" /></AuthShell>; }
