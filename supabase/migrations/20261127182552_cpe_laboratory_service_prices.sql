alter table public.laboratories add column specialty text
  check (specialty is null or length(btrim(specialty)) between 2 and 120);

create table public.laboratory_services (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  laboratory_id uuid not null,
  name text not null check (length(btrim(name)) between 2 and 200),
  service_code text check (service_code is null or length(btrim(service_code)) between 1 and 40),
  fixed_price numeric(12,2) not null check (fixed_price >= 0 and fixed_price <> 'NaN'::numeric),
  display_order integer not null check (display_order > 0),
  source_note text,
  foreign key (laboratory_id, tenant_id) references public.laboratories(id, tenant_id),
  unique nulls not distinct (laboratory_id, name, service_code)
);

create index laboratory_services_tenant_lab_order_idx
  on public.laboratory_services (tenant_id, laboratory_id, display_order);

alter table public.laboratory_services enable row level security;
revoke all on public.laboratory_services from public, anon, authenticated;
grant select on public.laboratory_services to authenticated;
grant all on public.laboratory_services to service_role;

create policy laboratory_services_read on public.laboratory_services
for select to authenticated
using (tenant_id = ((select private.current_scope())->>'tenant_id')::uuid
  and (select private.current_scope())->>'role' in ('suporte', 'gestor', 'equipe'));
