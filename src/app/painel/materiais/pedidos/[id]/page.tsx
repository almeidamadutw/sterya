import Link from 'next/link';
import { notFound } from 'next/navigation';
import { advanceOrder } from '@/app/actions/material-operations';
import { MaterialOperationForm } from '@/components/material-operation-form';
import { requireProfile } from '@/lib/auth';
import { materialBase, materialDate, materialQuantity, orderActions, orderBase, orderPriorityLabel, orderStates, validMaterialId } from '@/lib/materials';
import { createClient } from '@/lib/supabase/server';

export default async function OrderDetailPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ novo?: string }>;
}) {
  const { id } = await params;
  const { novo } = await searchParams;
  if (!validMaterialId(id)) notFound();
  const profile = await requireProfile();
  const supabase = await createClient();
  const [order, items, events, units] = await Promise.all([
    supabase.from('material_orders').select('code,unit_id,state,priority,note,requested_by,requested_by_name,created_at,purchase_code').eq('id', id).maybeSingle(),
    supabase.from('material_order_items').select('material_id,material_name,material_variant,measure,quantity,received').eq('order_id', id).order('material_name').order('material_variant'),
    supabase.from('material_order_events').select('id,action,note,actor_name,created_at').eq('order_id', id).order('created_at', { ascending: false }).order('id'),
    supabase.from('units').select('id,name'),
  ]);
  if (order.error || items.error || events.error || units.error) {
    return <p className="notice error" role="alert">Não foi possível carregar o pedido. Recarregue a página.</p>;
  }
  if (!order.data) notFound();
  const request = order.data;
  const unit = units.data.find(unit => unit.id === request.unit_id)?.name;
  const manager = profile.role === 'gestor';
  const pendingItems = items.data.filter(item => item.received < item.quantity);
  const remaining = (quantity: number, received: number) => Math.round((quantity - received) * 1000) / 1000;
  const canCancel = (request.state === 'solicitado' && (manager || request.requested_by === profile.id))
    || (request.state === 'aprovado' && manager);
  const operationFields = (action: string) => <>
    <input type="hidden" name="id" value={id} /><input type="hidden" name="action" value={action} />
  </>;

  return <>
    <div className="page-heading">
      <div><span className="eyebrow">{orderStates[request.state]}</span><h1>{request.code}</h1>
        <p>{unit} · Solicitado por {request.requested_by_name} · {materialDate.format(new Date(request.created_at))}</p></div>
      <Link className="button secondary" href={orderBase}>Voltar aos pedidos</Link>
    </div>
    {novo === '1' && <p className="notice" role="status">Pedido enviado para aprovação.</p>}
    <section className="panel">
      <div className="section-title"><h2>Itens do pedido</h2>
        <span className={'badge purchase-priority-' + request.priority}>Prioridade {orderPriorityLabel(request.priority).toLowerCase()}</span>
      </div>
      {request.note && <p className="purchase-order-note">{request.note}</p>}
      {request.purchase_code && <p><strong>Código da compra:</strong> {request.purchase_code}</p>}
      <div className="table-scroll"><table>
        <thead><tr><th>Material</th><th>Pedido</th><th>Recebido</th><th>Pendente</th></tr></thead>
        <tbody>{items.data.map(item => <tr key={item.material_id}>
          <td><Link href={materialBase + '/' + item.material_id}>{item.material_name}</Link> {item.material_variant}</td>
          <td>{materialQuantity.format(item.quantity)} {item.measure}</td>
          <td>{materialQuantity.format(item.received)} {item.measure}</td>
          <td>{materialQuantity.format(remaining(item.quantity, item.received))} {item.measure}</td>
        </tr>)}</tbody>
      </table></div>
    </section>
    {request.state === 'solicitado' && <section className="panel">
      <div className="section-title"><h2>Aprovação</h2></div>
      {manager ? <div className="material-approval-grid">
        <MaterialOperationForm action={advanceOrder} label="Aprovar pedido">
          {operationFields('aprovar')}
          <label className="field">Observação da aprovação<textarea name="note" rows={2} maxLength={1000} /></label>
        </MaterialOperationForm>
        <MaterialOperationForm action={advanceOrder} label="Recusar pedido">
          {operationFields('recusar')}
          <label className="field">Motivo da recusa<textarea name="note" rows={2} required minLength={2} maxLength={1000} /></label>
        </MaterialOperationForm>
      </div> : <p>O pedido aguarda aprovação da Gestão.</p>}
    </section>}
    {request.state === 'aprovado' && <section className="panel">
      <div className="section-title"><h2>Registrar compra</h2></div>
      <MaterialOperationForm action={advanceOrder} label="Marcar como comprado">
        {operationFields('comprar')}
        <label className="field">Código ou protocolo da compra<input name="purchase_code" required maxLength={100} /></label>
        <label className="field">Observação (opcional)<textarea name="note" rows={2} maxLength={1000} /></label>
      </MaterialOperationForm>
    </section>}
    {request.state === 'comprado' && pendingItems.length > 0 && <section className="panel">
      <div className="section-title"><h2>Confirmar recebimento em {unit}</h2></div>
      <p>Preencha só as quantidades que chegaram agora. Elas serão somadas ao estoque da unidade.</p>
      <MaterialOperationForm action={advanceOrder} label="Confirmar recebimento">
        {operationFields('receber')}
        <div className="material-form-grid">
          {pendingItems.map(item => <label className="field" key={item.material_id}>
            {item.material_name} {item.material_variant} ({item.measure})
            <input name="material_id" type="hidden" value={item.material_id} />
            <input name="quantity" inputMode="decimal" maxLength={12}
              placeholder={'Até ' + materialQuantity.format(remaining(item.quantity, item.received))} />
          </label>)}
        </div>
        <label className="field">Observação (opcional)<textarea name="note" rows={2} maxLength={1000} /></label>
      </MaterialOperationForm>
    </section>}
    {canCancel && <section className="panel">
      <details><summary>Cancelar pedido</summary>
        <MaterialOperationForm action={advanceOrder} label="Confirmar cancelamento">
          {operationFields('cancelar')}
          <label className="field">Motivo do cancelamento<textarea name="note" rows={2} required minLength={2} maxLength={1000} /></label>
        </MaterialOperationForm>
      </details>
    </section>}
    <section className="panel">
      <div className="section-title"><h2>Histórico do pedido</h2></div>
      <ul className="material-events">{events.data.map(event => <li key={event.id}>
        <b>{orderActions[event.action]}</b>
        <span>{event.actor_name} · {materialDate.format(new Date(event.created_at))}</span>
        {event.note && <p>{event.note}</p>}
      </li>)}</ul>
    </section>
  </>;
}
