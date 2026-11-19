import type { Metadata } from 'next';
import './globals.css';
import './beta.css';
export const metadata: Metadata = { title: { default: 'CEO Club CPE', template: '%s · CEO Club CPE' }, description: 'Controle de processos da esterilização. Peças, laboratórios e materiais em uma única rotina.', robots: { index: false, follow: false } };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="pt-BR"><body>{children}</body></html>; }
