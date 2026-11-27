import { redirect } from 'next/navigation';
import { EmptyState } from '@/components/empty-state';
import { requireProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Laboratórios' };

const specialtyByName: Record<string, string> = {
  'Laboratório Alexandra - Carla': 'PT, PPR e demais trabalhos',
  'Laboratório Emerson': 'PPF posterior',
  'Laboratório Design - Renan': 'PSI e PPF anterior',
  'Laboratório Daiane Mota': 'Contenção',
  'Laboratório Eder': 'Infraestrutura de PPR'
};

const priceFormat = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export default async function Laboratories() {
  if ((await requireProfile()).role === 'laboratorio') redirect('/painel/pecas');

  const supabase = await createClient();
  const { data: labs, error } = await supabase.from('laboratories')
    .select('id,name,active,specialty,laboratory_services(name,service_code,fixed_price,display_order,source_note)')
    .order('name')
    .order('display_order', { referencedTable: 'laboratory_services' });

  return <>
    <div className="page-heading"><div>
      <h1>Laboratórios<span className="heading-dot">.</span></h1>
      <p>Abra um laboratório para consultar os preços fixos dos serviços.</p>
    </div></div>
    {error && <p role="alert" className="notice error">Não foi possível carregar os laboratórios e a tabela de preços.</p>}
    {!error && !labs?.length && <section className="panel">
      <EmptyState icon="lab" title="Nenhum laboratório cadastrado." text="Os laboratórios parceiros aparecerão aqui." />
    </section>}
    {labs?.map(lab => <details className="panel operations-create" key={lab.id}>
      <summary className="operations-summary">
        {lab.name}{' '}
        <span className="badge neutral">{lab.specialty ?? specialtyByName[lab.name] ?? 'Especialidade não informada'}</span>{' '}
        <span className="badge">{lab.active ? 'Ativo' : 'Inativo'}</span>
      </summary>
      {lab.laboratory_services.length ? <>
        <p className="operations-muted">
          {lab.laboratory_services.length === 1 ? '1 serviço' : `${lab.laboratory_services.length} serviços`}
        </p>
        <div className="table-scroll">
          <table aria-label={`Preços de ${lab.name}`}>
            <thead><tr><th scope="col">Serviço</th><th scope="col">Preço fixo</th></tr></thead>
            <tbody>{lab.laboratory_services.map(service => <tr key={`${service.display_order}-${service.service_code ?? service.name}`}>
              <td style={{ whiteSpace: 'normal' }}>
                <b>{service.name}</b>
                {service.service_code && <div className="operations-muted">Código {service.service_code}</div>}
                {service.source_note && <div className="operations-muted">{service.source_note}</div>}
              </td>
              <td>{priceFormat.format(Number(service.fixed_price))}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </> : <p className="operations-muted">Nenhum preço cadastrado.</p>}
    </details>)}
  </>;
}
