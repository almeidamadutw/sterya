import Link from 'next/link';
import { MaterialOrderComposer } from '@/components/material-order-composer';
import { orderBase, type PurchaseItem } from '@/lib/materials';
import { createClient } from '@/lib/supabase/server';

export default async function NewOrderPage({ searchParams }: { searchParams: Promise<{ material?: string; cadastro?: string }> }) {
  const { material, cadastro } = await searchParams;
  const supabase = await createClient();
  const [materials, units, groups] = await Promise.all([
    supabase.from('materials').select('id,name,variant,code,purchase_unit').eq('active', true)
      .not('purchase_unit', 'is', null).order('name').order('variant')
      .overrideTypes<PurchaseItem[], { merge: false }>(),
    supabase.from('units').select('id,name').order('name'),
    supabase.from('material_categories').select('id,code,name').order('sort_order'),
  ]);
  const initial = materials.data?.find(item => item.id === material)?.id;

  return <>
    <div className="page-heading">
      <div><h1>Novo pedido de compra</h1><p>Monte a lista da unidade e escolha a prioridade para aprovação.</p></div>
      <Link className="button secondary" href={orderBase}>Voltar aos pedidos</Link>
    </div>
    <section className="panel">
      {materials.error || units.error || groups.error ?
        <p className="notice error" role="alert">Não foi possível carregar o catálogo e as unidades.</p> :
        <MaterialOrderComposer
          materials={materials.data}
          units={units.data}
          groups={groups.data}
          essentials={groups.data.find(group => group.code === 'essenciais')?.id}
          initial={initial}
          startWithRegistration={cadastro === '1'}
        />}
    </section>
  </>;
}
