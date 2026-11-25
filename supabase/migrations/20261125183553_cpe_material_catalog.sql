-- Catálogo de materiais por clínica. Saldos, preços e pedidos não são inferidos.
create table if not exists public.material_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  code text not null check (code ~ '^[a-z][a-z0-9_]{1,59}$'),
  name text not null check (length(btrim(name)) between 2 and 80),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (id, tenant_id), unique (tenant_id, code)
);
create table if not exists public.material_imports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  source_filename text not null,
  source_sha256 text not null check (source_sha256 ~ '^[a-f0-9]{64}$'),
  source_rows integer not null check (source_rows >= 0),
  catalog_items integer not null check (catalog_items >= 0),
  requested_by uuid references auth.users(id) on delete set null,
  requested_by_label text,
  method text not null default 'assisted_pdf_import',
  imported_at timestamptz not null default now(),
  unique (id, tenant_id), unique (tenant_id, source_sha256)
);
create index if not exists material_imports_requested_by_idx on public.material_imports(requested_by);
create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  category_id uuid not null,
  code text not null default ('MAT-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))),
  name text not null check (length(btrim(name)) between 2 and 160),
  variant text not null default '' check (length(variant) <= 160),
  purchase_unit text check (purchase_unit is null or length(btrim(purchase_unit)) between 1 and 80),
  active boolean not null default true,
  source_import_id uuid,
  source_label text,
  review_note text,
  created_at timestamptz not null default now(),
  name_key text generated always as (
    regexp_replace(translate(lower(btrim(name)), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'), '\s+', ' ', 'g')
  ) stored,
  variant_key text generated always as (
    regexp_replace(translate(lower(btrim(variant)), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'), '\s+', ' ', 'g')
  ) stored,
  search_text text generated always as (
    regexp_replace(translate(lower(name || ' ' || variant || ' ' || code), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'), '\s+', ' ', 'g')
  ) stored,
  foreign key (category_id, tenant_id) references public.material_categories(id, tenant_id),
  foreign key (source_import_id, tenant_id) references public.material_imports(id, tenant_id),
  unique (tenant_id, code),
  unique (tenant_id, category_id, name_key, variant_key)
);
create index if not exists materials_category_idx on public.materials(category_id, tenant_id);
create index if not exists materials_source_idx on public.materials(source_import_id, tenant_id);
alter table public.material_categories enable row level security;
alter table public.material_imports enable row level security;
alter table public.materials enable row level security;
revoke all on public.material_categories, public.material_imports, public.materials from public, anon, authenticated;
grant select on public.material_categories, public.material_imports, public.materials to authenticated;
grant all on public.material_categories, public.material_imports, public.materials to service_role;

drop policy if exists material_categories_read on public.material_categories;
create policy material_categories_read on public.material_categories for select to authenticated
using (tenant_id = ((select private.current_scope())->>'tenant_id')::uuid
  and (select private.current_scope())->>'role' in ('suporte','gestor','equipe'));
drop policy if exists material_imports_read on public.material_imports;
create policy material_imports_read on public.material_imports for select to authenticated
using (tenant_id = ((select private.current_scope())->>'tenant_id')::uuid
  and (select private.current_scope())->>'role' in ('suporte','gestor','equipe'));
drop policy if exists materials_read on public.materials;
create policy materials_read on public.materials for select to authenticated
using (tenant_id = ((select private.current_scope())->>'tenant_id')::uuid
  and (select private.current_scope())->>'role' in ('suporte','gestor','equipe'));
