import Link from 'next/link';
import { requireProfile } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { EmptyState } from '@/components/empty-state';
import { materialSearch, catalogPage, catalogPageSize } from '@/lib/materials';

export const metadata = { title: 'Materiais | STERYA' };
type SearchValue = string | string[] | undefined;
type Category = { id: string; code: string; name: string };
type Material = { id: string; code: string; name: string; variant: string; category_id: string; source_label: string | null; review_note: string | null };
const single = (value: SearchValue) => Array.isArray(value) ? value[0] ?? '' : value ?? '';

export default async function Materials({ searchParams }: { searchParams: Promise<{ q?: SearchValue; category?: SearchValue; page?: SearchValue }> }) {
  if ((await requireProfile()).role === 'laboratorio') redirect('/painel/pecas');
  const params = await searchParams;
  const q = single(params.q).trim().slice(0, 120);
  const candidate = single(params.category);
  const category = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(candidate) ? candidate : '';
  const page = catalogPage(single(params.page));
  const supabase = await createClient();
  let query = supabase.from('materials').select('id,code,name,variant,category_id,source_label,review_note', { count: 'exact' }).eq('active', true).order('name').order('variant');
  if (category) query = query.eq('category_id', category);
  if (q) query = query.like('search_text', `%${materialSearch(q)}%`);
  const [materialsResult, categoriesResult, totalResult, importResult] = await Promise.all([
    query.range((page - 1) * catalogPageSize, page * catalogPageSize - 1),
    supabase.from('material_categories').select('id,code,name').order('sort_order'),
    supabase.from('materials').select('id', { count: 'exact', head: true }).eq('active', true),
    supabase.from('material_imports').select('source_filename,source_rows,catalog_items,imported_at').order('imported_at', { ascending: false }).limit(1)
  ]);
  const categories = (categoriesResult.data ?? []) as Category[];
  const categoryNames = new Map(categories.map(c => [c.id, c.name]));
  const materials = (materialsResult.data ?? []) as Material[];
  const total = materialsResult.count ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / catalogPageSize));
  const lastImport = importResult.data?.[0];
  const failed = Boolean(materialsResult.error || categoriesResult.error || totalResult.error);
  const linkToPage = (next: number) => {
    const search = new URLSearchParams();
    if (q) search.set('q', q);
    if (category) search.set('category', category);
    if (next > 1) search.set('page', String(next));
    return `/painel/materiais${search.size ? `?${search.toString()}` : ''}`;
  };

  return <>
    <div className="page-heading"><div><span className="eyebrow">ORGANIZAÇÃO DO SETOR</span><h1>Materiais<span className="heading-dot">.</span></h1><p>Os materiais de cada especialidade em um só catálogo.</p></div><span className="badge">{totalResult.error ? 'Catálogo' : `${totalResult.count ?? 0} materiais cadastrados`}</span></div>
    <section className="panel catalog-origin"><div><h2>Catálogo por especialidade</h2><p>{lastImport ? `${lastImport.source_rows} descrições na lista, organizadas em ${lastImport.catalog_items} cadastros após separar tamanhos e versões.` : 'Encontre o material pelo nome, versão ou código.'}</p></div><span className="badge neutral">{categories.length} grupos</span></section>
    <form method="get" action="/painel/materiais" className="catalog-filters">
      <div className="field"><label htmlFor="material-q">Pesquisar material</label><input id="material-q" name="q" defaultValue={q} maxLength={120} placeholder="Nome, tamanho, versão ou código" /></div>
      <div className="field"><label htmlFor="material-category">Especialidade / grupo</label><select id="material-category" name="category" defaultValue={category}><option value="">Todos os grupos</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      <button className="button primary" type="submit">Pesquisar</button><Link className="button secondary" href="/painel/materiais">Limpar filtros</Link>
    </form>
    <section className="panel">
      <div className="section-title"><div><h2>Materiais do catálogo</h2><p>{failed ? 'Confira a conexão e tente novamente.' : `${total} resultado(s)${q || category ? ' para os filtros selecionados' : ''}.`}</p></div></div>
      {failed ? <p className="notice error" role="alert">Não foi possível carregar o catálogo agora. Tente novamente em instantes.</p>
        : materials.length ? <><div className="table-scroll"><table className="catalog-table"><thead><tr><th>Material</th><th>Tamanho / versão</th><th>Especialidade</th><th>Código</th></tr></thead><tbody>{materials.map(material => <tr key={material.id}><td><b title={material.source_label ?? undefined}>{material.name}</b>{material.review_note && <span className="catalog-review">Conferir especificação: {material.review_note}</span>}</td><td className="catalog-variant">{material.variant || 'Não especificado'}</td><td><span className="badge">{categoryNames.get(material.category_id) ?? 'Não informada'}</span></td><td><span className="catalog-code">{material.code}</span></td></tr>)}</tbody></table></div><div className="catalog-pagination"><span>Mostrando {(page - 1) * catalogPageSize + 1}–{Math.min(page * catalogPageSize, total)} de {total}</span><div>{page > 1 && <Link className="button secondary" href={linkToPage(page - 1)}>Anterior</Link>}{page < lastPage && <Link className="button secondary" href={linkToPage(page + 1)}>Próxima</Link>}</div></div></>
          : <><EmptyState icon="list" title={q || category ? 'Nenhum material encontrado.' : 'Nenhum material nesta página.'} text="Altere os filtros ou volte ao início do catálogo para continuar." /><Link className="button secondary" href="/painel/materiais">Ver catálogo completo</Link></>}
    </section>
    <section className="panel catalog-scope"><h2>Quantidades, compras e aprovações</h2><p>Este cadastro reúne os materiais da lista. Saldos de estoque, preços e unidades de compra não foram informados no PDF; o controle desses dados e dos pedidos será conectado na próxima etapa.</p>{lastImport && <small>Origem: {lastImport.source_filename} · Importado em {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(lastImport.imported_at))}.</small>}</section>
  </>;
}
