import { getProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { loadReport, mayReadReport } from '@/lib/cpe-reports';
import { operationalPdf } from '@/lib/operational-pdf';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store' };

export async function GET(request: Request, { params }: { params: Promise<{ tipo: string }> }) {
  const { tipo } = await params;
  if (tipo !== 'estoque' && tipo !== 'pedidos' && tipo !== 'pecas') return new Response(null, { status: 404, headers });
  const profile = await getProfile();
  if (!profile) return new Response('Entre no CPE para baixar o relatório.', { status: 401, headers });
  if (!mayReadReport(tipo, profile.role)) return new Response('Acesso indisponível para este perfil.', { status: 403, headers });

  try {
    const report = await loadReport(tipo, await createClient(), profile, new URL(request.url).searchParams);
    const now = new Date();
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    return new Response(await operationalPdf(report, now), { headers: {
      ...headers, 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="CPE-' + tipo + '-' + date + '.pdf"',
    } });
  } catch {
    return new Response('Não foi possível gerar o relatório completo. Volte à lista e tente novamente.', { status: 503, headers });
  }
}
