import Link from 'next/link';
import { EmptyState } from '@/components/empty-state';
import { catalogPage, materialBase, materialDate, orderBase, orderPriorities, orderPriorityLabel, orderStates } from '@/lib/materials';
import { createClient } from '@/lib/supabase/server';

const pageSize = 30;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ situacao?: string; prioridade?: string; pagina?: string }> }) {
  const params = await searchParams;
  const state = typeof params.situacao === 'string' && Object.hasOwn(orderStates, params.situacao) ? params.situacao : '';
  const priority = orderPriorities.find(option => String(option.value) === params.prioridade)?.value;
  const page = catalogPage(params.pagina);
  const supabase = await createClient();
  let query = supabase.from('material_orders').select('id,code,unit_id,requested_by_name,state,priority,created_at', { count: 'exact' });
  if (state) query = query.eq('state', state);
  if (priority) query = query.eq('priority', priority);
  const [orders, units] = await Promise.all([
    query.order('approval_priority', { ascending: false }).order('created_at', { ascending: false }).order('id').range((page - 1) * pageSize, page * pageSize - 1),
    supabase.from('units').select('id,name'),
  ]);
  const unitNames = new Map(units.data?.map(unit => [unit.id, unit.name]));
  const pageLink = (next: number) => orderBase + '?' + new URLSearchParams({ situacao: state, prioridade: priority ? String(priority) : '', pagina: String(next) });
  return <>
    <div className="page-heading">
      <div><h1>Pedidos de compra</h1><p>Pedidos que aguardam aprovação aparecem primeiro, por prioridade.</p></div>
      <div className="material-toolbar">
        <Link className="button secondary" href={materialBase}>Catálogo</Link>
        <Link className="button secondary" href={orderBase + '/novo?cadastro=1'}>Cadastrar item</Link>
        <Link className="button primary" href={orderBase + '/novo'}>Novo pedido</Link>
      </div>
    </div>
    <form className="material-list-filter" action={orderBase} method="get">
      <label className="field">Situação do pedido
        <select name="situacao" defaultValue={state}>
          <option value="">Todas as situações</option>
          {Object.entries(orderStates).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
        </select>
      </label>
      <label className="field">Prioridade
        <select name="prioridade" defaultValue={priority ?? ''}>
          <option value="">Todas as prioridades</option>
          {orderPriorities.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <button type="submit" className="button secondary">Filtrar</button>
    </form>
    <section className="panel">
      {orders.error || units.error ? <p className="notice error" role="alert">Não foi possível carregar os pedidos.</p> :
        orders.data.length ? <div className="table-scroll"><table>
          <thead><tr><th>Pedido</th><th>Unidade</th><th>Situação</th><th>Prioridade</th><th>Solicitante</th><th>Data</th></tr></thead>
          <tbody>{orders.data.map(order => <tr key={order.id}>
            <td><Link className="button secondary" href={orderBase + '/' + order.id}>{order.code}</Link></td>
            <td>{unitNames.get(order.unit_id) ?? '—'}</td>
            <td><span className="badge">{orderStates[order.state]}</span></td>
            <td><span className={'badge purchase-priority-' + order.priority}>{orderPriorityLabel(order.priority)}</span></td>
            <td>{order.requested_by_name}</td>
            <td>{materialDate.format(new Date(order.created_at))}</td>
          </tr>)}</tbody>
        </table></div> : <EmptyState icon="list" title="Nenhum pedido nesta página." text="Abra um pedido ou confira os filtros." />}
      {(page > 1 || (orders.count ?? 0) > page * pageSize) && <div className="catalog-pagination">
        <span>Página {page}</span>
        <div>{page > 1 && <Link className="button secondary" href={pageLink(page - 1)}>Anterior</Link>}
          {(orders.count ?? 0) > page * pageSize && <Link className="button secondary" href={pageLink(page + 1)}>Próxima</Link>}</div>
      </div>}
    </section>
  </>;
}
