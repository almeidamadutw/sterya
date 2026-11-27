import Link from 'next/link';
import { notFound } from 'next/navigation';
import { moveStock, saveMaterial } from '@/app/actions/material-operations';
import { MaterialFields } from '@/components/material-fields';
import { MaterialOperationForm } from '@/components/material-operation-form';
import { materialBase, materialDate, materialQuantity, orderBase, validMaterialId } from '@/lib/materials';
import { createClient } from '@/lib/supabase/server';

const movementNames: Record<string, string> = {
  inicial: 'Saldo inicial', entrada: 'Entrada', baixa: 'Baixa', recebimento: 'Recebimento de compra',
};

export default async function MaterialPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ unidade?: string; novo?: string }>;
}) {
  const { id } = await params;
  const search = await searchParams;
  if (!validMaterialId(id)) notFound();
  const supabase = await createClient();
  const [materialResult, groups, units, stock, orderUse] = await Promise.all([
    supabase.from('materials').select('id,category_id,code,name,variant,purchase_unit,review_note,source_label').eq('id', id).eq('active', true).maybeSingle(),
    supabase.from('material_categories').select('id,name').order('sort_order'),
    supabase.from('units').select('id,name').order('name'),
    supabase.from('material_stock').select('unit_id,quantity').eq('material_id', id),
    supabase.from('material_order_items').select('order_id').eq('material_id', id).limit(1),
  ]);
  if (materialResult.error || groups.error || units.error || stock.error || orderUse.error) {
    return <p className="notice error" role="alert">Não foi possível carregar o material. Recarregue a página.</p>;
  }
  const material = materialResult.data;
  if (!material) notFound();
  const unit = units.data.find(item => item.id === search.unidade) ?? units.data[0];
  const balance = stock.data.find(item => item.unit_id === unit?.id);
  const history = unit ? await supabase.from('material_stock_events')
    .select('id,kind,delta,balance_after,reason,actor_name,created_at')
    .eq('material_id', id).eq('unit_id', unit.id).order('created_at', { ascending: false }).order('id').limit(100) : null;

  return <>
    <div className="page-heading">
      <div><span className="eyebrow">{material.code}</span><h1>{material.name}</h1>{material.variant && <p>{material.variant}</p>}</div>
      <div className="material-toolbar">
        <Link className="button secondary" href={materialBase + (search.unidade === unit?.id && unit ? '?unidade=' + unit.id : '')}>Voltar ao catálogo</Link>
        {material.purchase_unit && <Link className="button primary" href={orderBase + '/novo?material=' + id + (unit ? '&unidade=' + unit.id : '')}>Pedir material</Link>}
      </div>
    </div>
    {search.novo === '1' && <p className="notice" role="status">Material cadastrado.</p>}
    <section className="panel">
      <div className="section-title"><h2>Estoque por unidade</h2></div>
      <div className="material-saldos">
        {units.data.map(item => {
          const quantity = stock.data.find(row => row.unit_id === item.id)?.quantity;
          return <Link key={item.id} className="material-saldo" aria-current={item.id === unit?.id ? 'true' : undefined}
            href={materialBase + '/' + id + '?unidade=' + item.id}>
            <span>{item.name}</span>
            <strong>{quantity == null ? 'Saldo não lançado' : materialQuantity.format(quantity) + ' ' + (material.purchase_unit ?? '')}</strong>
          </Link>;
        })}
      </div>
      {!unit ? <p>Nenhuma unidade cadastrada.</p> : !material.purchase_unit ?
        <p className="notice">Preencha a unidade de medida em <a href="#editar-material">Editar material</a> para lançar o estoque.</p> :
        <MaterialOperationForm action={moveStock} label={'Registrar em ' + unit.name} key={unit.id + ':' + Boolean(balance)}>
          <input type="hidden" name="material_id" value={id} />
          <input type="hidden" name="unit_id" value={unit.id} />
          <div className="material-form-grid">
            <label className="field">Movimentação em {unit.name}
              <select name="kind" defaultValue={balance ? 'baixa' : 'inicial'}>
                {!balance && <option value="inicial">Saldo inicial</option>}
                <option value="entrada">Entrada avulsa</option>
                <option value="baixa">Baixa</option>
              </select>
            </label>
            <label className="field">Quantidade ({material.purchase_unit})
              <input name="quantity" inputMode="decimal" required maxLength={12} placeholder="Ex.: 10" />
            </label>
            <label className="field material-wide">Motivo
              <input name="reason" required minLength={2} maxLength={1000} placeholder="Ex.: contagem inicial ou uso no atendimento" />
            </label>
          </div>
        </MaterialOperationForm>}
    </section>
    {unit && <section className="panel">
      <div className="section-title"><h2>Histórico de {unit.name}</h2></div>
      {history?.error ? <p className="notice error" role="alert">Não foi possível carregar o histórico.</p> :
        history?.data?.length ? <div className="table-scroll"><table>
          <thead><tr><th>Data e hora</th><th>Movimentação</th><th>Quantidade</th><th>Saldo</th><th>Responsável</th><th>Motivo</th></tr></thead>
          <tbody>{history.data.map(event => <tr key={event.id}>
            <td>{materialDate.format(new Date(event.created_at))}</td>
            <td>{movementNames[event.kind] ?? event.kind}</td>
            <td>{event.delta > 0 ? '+' : ''}{materialQuantity.format(event.delta)}</td>
            <td>{materialQuantity.format(event.balance_after)}</td>
            <td>{event.actor_name}</td><td className="material-wrap">{event.reason}</td>
          </tr>)}</tbody>
        </table></div> : <p>Nenhuma movimentação nesta unidade.</p>}
      {history?.data?.length === 100 && <p className="operations-muted">Mostrando as 100 movimentações mais recentes.</p>}
    </section>}
    <section className="panel" id="editar-material">
      <div className="section-title"><h2>Editar material</h2></div>
      {material.review_note && <p className="notice">{material.review_note}</p>}
      {material.source_label && <p className="operations-muted">Descrição original do PDF: {material.source_label}</p>}
      <MaterialOperationForm action={saveMaterial} label="Salvar alterações">
        <MaterialFields groups={groups.data} material={material} measureInUse={Boolean(stock.data.length || orderUse.data.length)} />
      </MaterialOperationForm>
    </section>
  </>;
}
