import Link from 'next/link';
import { requestOrder } from '@/app/actions/material-operations';
import { MaterialOperationForm } from '@/components/material-operation-form';
import { MaterialOrderLines } from '@/components/material-order-lines';
import { materialBase, orderBase } from '@/lib/materials';
import { createClient } from '@/lib/supabase/server';

export default async function NewOrderPage({ searchParams }: { searchParams: Promise<{ material?: string }> }) {
  const { material } = await searchParams;
  const supabase = await createClient();
  const [materials, units] = await Promise.all([
    supabase.from('materials').select('id,name,variant,code,purchase_unit').eq('active', true)
      .not('purchase_unit', 'is', null).order('name').order('variant').overrideTypes<
        { id: string; name: string; variant: string; code: string; purchase_unit: string }[], { merge: false }>(),
    supabase.from('units').select('id,name').order('name'),
  ]);
  const initial = materials.data?.find(item => item.id === material)?.id;
  return <>
    <div className="page-heading">
      <div><h1>Novo pedido de compra</h1><p>Reúna os materiais da mesma unidade em um pedido.</p></div>
      <Link className="button secondary" href={orderBase}>Voltar aos pedidos</Link>
    </div>
    <section className="panel">
      {materials.error || units.error ?
        <p className="notice error" role="alert">Não foi possível carregar os materiais e unidades.</p> :
        !materials.data?.length || !units.data?.length ?
          <div>
            <p>Para abrir um pedido, cadastre a unidade de medida dos materiais que serão comprados.</p>
            <Link className="button secondary" href={materialBase}>Abrir catálogo</Link>
          </div> :
          <MaterialOperationForm action={requestOrder} label="Enviar para aprovação">
            <label className="field">Unidade que vai receber
              <select name="unit_id" defaultValue="" required>
                <option value="" disabled>Selecione a unidade</option>
                {units.data.map(unit => <option value={unit.id} key={unit.id}>{unit.name}</option>)}
              </select>
            </label>
            <MaterialOrderLines materials={materials.data} initial={initial} />
            <label className="field">Observação (opcional)<textarea name="note" rows={3} maxLength={1000} /></label>
            <p className="operations-muted">A lista mostra materiais com unidade de medida preenchida. <Link href={materialBase}>Consultar catálogo</Link></p>
          </MaterialOperationForm>}
    </section>
  </>;
}
