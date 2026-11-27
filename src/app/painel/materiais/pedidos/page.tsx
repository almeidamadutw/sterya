import Link from 'next/link';
import { EmptyState } from '@/components/empty-state';
import { Icon } from '@/components/icon';
import { catalogPage, materialBase, materialDate, orderBase, orderPriorities, orderPriorityLabel, orderStates, validMaterialId } from '@/lib/materials';
import { requireProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Compras e estoque | STERYA' };
const pageSize = 30;

export default async function OrdersPage({ searchParams }: {
  searchParams: Promise<{ situacao?: string; prioridade?: string; pagina?: string; unidade?: string }>;
}) {
  const profile = await requireProfile();
  const params = await searchParams;
  const state = typeof params.situacao === 'string' && Object.hasOwn(orderStates, params.situacao) ? params.situacao : '';
  const priority = orderPriorities.find(option => String(option.value) === params.prioridade)?.value;
  const requestedUnit = typeof params.unidade === 'string' && validMaterialId(params.unidade) ? params.unidade : '';
  const page = catalogPage(params.pagina);
  const supabase = await createClient();
  let query = supabase.from('material_orders').select('id,code,unit_id,requested_by_name,state,priority,created_at', { count: 'exact' });
  if (state) query = query.eq('state', state);
  if (priority) query = query.eq('priority', priority);
  if (requestedUnit) query = query.eq('unit_id', requestedUnit);
  const [orders, units] = await Promise.all([
    query.order('approval_priority', { ascending: false }).order('created_at', { ascending: false })
      .order('id').range((page - 1) * pageSize, page * pageSize - 1),
    supabase.from('units').select('id,name').order('name'),
  ]);
  const unitId = units.data?.find(unit => unit.id === requestedUnit)?.id;
  const unitNames = new Map(units.data?.map(unit => [unit.id, unit.name]));
  const unitQuery = unitId ? '?unidade=' + unitId : '';
  const orderListLink = (nextState = '', nextPriority?: number, nextPage = 1) => {
    const search = new URLSearchParams(unitQuery);
    if (nextState) search.set('situacao', nextState);
    if (nextPriority) search.set('prioridade', String(nextPriority));
    if (nextPage > 1) search.set('pagina', String(nextPage));
    return orderBase + (search.size ? '?' + search.toString() : '');
  };
  const shortcuts = [
    { title: 'Estoque', text: 'Conferir saldo e movimentações', icon: 'box', href: materialBase + unitQuery },
    { title: 'Listas de compra', text: 'Ver os pedidos da unidade', icon: 'list', href: orderListLink() },
    { title: 'Recebimentos', text: 'Conferir o que chegou', icon: 'check', href: orderListLink('comprado') },
  ];
  const orderNextStep: Record<string, string> = {
    solicitado: profile.role === 'gestor' ? 'Revisar solicitação' : 'Aguardar aprovação',
    aprovado: 'Preparar ou registrar compra',
    comprado: 'Conferir entrega',
  };

  return <>
    <div className="page-heading">
      <div><h1>Compras e estoque</h1><p>Acompanhe seus pedidos da aprovação ao recebimento.</p></div>
      <div className="material-toolbar">
        <Link className="button secondary" href={orderBase + '/novo?cadastro=1' + (unitId ? '&unidade=' + unitId : '')}>Cadastrar item</Link>
        <Link className="button primary" href={orderBase + '/novo' + unitQuery}>Novo pedido</Link>
      </div>
    </div>
    <nav className="purchase-shortcuts" aria-label="Atalhos de compras">
      {shortcuts.map(shortcut => <Link key={shortcut.title} href={shortcut.href} className="purchase-shortcut">
        <span className="purchase-shortcut-icon"><Icon name={shortcut.icon} /></span>
        <span><strong>{shortcut.title}</strong><small>{shortcut.text}</small></span>
      </Link>)}
    </nav>
    <form key={orderListLink(state, priority)} className="material-list-filter" action={orderBase} method="get">
      <label className="field">Unidade
        <select name="unidade" defaultValue={unitId ?? ''}>
          <option value="">Todas as unidades</option>
          {units.data?.map(unit => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
        </select>
      </label>
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
      <div className="section-title">
        <div><h2>Pedidos de compra</h2><p>Os pedidos pendentes mais urgentes aparecem primeiro.</p></div>
      </div>
      {orders.error || units.error ? <p className="notice error" role="alert">Não foi possível carregar os pedidos.</p> :
        orders.data.length ? <div className="table-scroll"><table>
          <thead><tr><th>Pedido</th><th>Unidade</th><th>Situação</th><th>Prioridade</th><th>Próxima ação</th><th>Solicitante</th><th>Data</th></tr></thead>
          <tbody>{orders.data.map(order => <tr key={order.id}>
            <td><Link className="button secondary" href={orderBase + '/' + order.id}>{order.code}</Link></td>
            <td>{unitNames.get(order.unit_id) ?? '—'}</td>
            <td><span className="badge">{orderStates[order.state]}</span></td>
            <td><span className={'badge purchase-priority-' + order.priority}>{orderPriorityLabel(order.priority)}</span></td>
            <td><Link href={orderBase + '/' + order.id}>{orderNextStep[order.state] ?? 'Ver histórico'}</Link></td>
            <td>{order.requested_by_name}</td>
            <td>{materialDate.format(new Date(order.created_at))}</td>
          </tr>)}</tbody>
        </table></div> : <EmptyState icon="list" title="Nenhum pedido nesta página." text="Abra um pedido ou confira os filtros." />}
      {(page > 1 || (orders.count ?? 0) > page * pageSize) && <div className="catalog-pagination">
        <span>Página {page}</span>
        <div>{page > 1 && <Link className="button secondary" href={orderListLink(state, priority, page - 1)}>Anterior</Link>}
          {(orders.count ?? 0) > page * pageSize && <Link className="button secondary" href={orderListLink(state, priority, page + 1)}>Próxima</Link>}</div>
      </div>}
    </section>
  </>;
}
