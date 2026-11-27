import Link from 'next/link';
import { saveMaterial } from '@/app/actions/material-operations';
import { MaterialFields } from '@/components/material-fields';
import { MaterialOperationForm } from '@/components/material-operation-form';
import { materialBase } from '@/lib/materials';
import { createClient } from '@/lib/supabase/server';

export default async function NewMaterialPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('material_categories').select('id,name').order('sort_order');
  return <>
    <div className="page-heading">
      <div><h1>Novo material</h1><p>Cadastre um item ou uma variação no catálogo.</p></div>
      <Link className="button secondary" href={materialBase}>Voltar ao catálogo</Link>
    </div>
    <section className="panel">
      {error ? <p className="notice error" role="alert">Não foi possível carregar os grupos do catálogo.</p> :
        <MaterialOperationForm action={saveMaterial} label="Cadastrar material">
          <MaterialFields groups={data ?? []} />
        </MaterialOperationForm>}
    </section>
  </>;
}
