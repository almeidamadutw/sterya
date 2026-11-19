import { requireProfile } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { EmptyState } from '@/components/empty-state';
export const metadata = { title: 'Materiais' };
export default async function Materials() {
  if ((await requireProfile()).role === 'laboratorio') redirect('/painel/pecas');
  return <><div className="page-heading"><div><span className="eyebrow">ORGANIZAÇÃO DO SETOR</span><h1>Materiais<span className="heading-dot">.</span></h1><p>Do pedido da equipe à aprovação e à compra.</p></div><span className="badge neutral">Em preparação</span></div><section className="panel"><EmptyState icon="list" title="Pedidos mais organizados, do início ao fim." text="Vamos construir o fluxo de itens e quantidades, aprovação da Ana, observações e registro do protocolo de compra." /></section></>;
}
