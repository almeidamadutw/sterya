alter table public.material_orders
  add column priority smallint not null default 1 check (priority between 1 and 3),
  add column approval_priority smallint generated always as (
    case when state = 'solicitado' then priority else 0::smallint end
  ) stored;

create index material_orders_approval_idx
  on public.material_orders(tenant_id, approval_priority desc, created_at desc, id);

insert into public.material_categories(tenant_id, code, name, sort_order)
select tenants.id, groups.code, groups.name, groups.sort_order
from public.tenants
cross join (values ('essenciais', 'Essenciais', 90), ('outras_compras', 'Outras compras', 91))
  as groups(code, name, sort_order)
where tenants.slug = 'casal-odonto'
on conflict (tenant_id, code) do nothing;

create or replace function private.request_material_order(p_id uuid, p_unit uuid, p_note text, p_items jsonb, p_priority smallint)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  actor public.profiles := private.material_operator();
  material public.materials;
  item record;
  inserted uuid;
begin
  if p_priority is null or p_priority not between 1 and 3 then
    raise exception 'Selecione uma prioridade válida.';
  end if;
  if p_id is null or length(coalesce(p_note,'')) > 1000
    or not exists (select 1 from public.units where id = p_unit and tenant_id = actor.tenant_id) then
    raise exception 'Confira a unidade e a observação do pedido.';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'Selecione os materiais do pedido.'; end if;
  if jsonb_array_length(p_items) not between 1 and 50 then raise exception 'Inclua de 1 a 50 itens no pedido.'; end if;
  insert into public.material_orders(id,tenant_id,unit_id,note,requested_by,requested_by_name,priority)
    values(p_id,actor.tenant_id,p_unit,nullif(btrim(p_note),''),actor.id,actor.full_name,p_priority)
    on conflict (id) do nothing returning id into inserted;
  if inserted is null then
    if exists (select 1 from public.material_orders where id = p_id and tenant_id = actor.tenant_id and requested_by = actor.id and unit_id = p_unit)
      then return p_id; end if;
    raise exception 'Identificador de pedido inválido.';
  end if;
  for item in select * from jsonb_to_recordset(p_items) as i(material_id uuid, quantity numeric) order by material_id loop
    if item.quantity is null or item.quantity = 'NaN'::numeric or item.quantity <= 0
      or item.quantity > 99999999 or item.quantity <> round(item.quantity,3) then
      raise exception 'Informe uma quantidade válida para cada material.';
    end if;
    select * into material from public.materials
      where id = item.material_id and tenant_id = actor.tenant_id and active for share;
    if not found or material.purchase_unit is null then
      raise exception 'Escolha materiais cadastrados com unidade de medida.';
    end if;
    insert into public.material_order_items(tenant_id,order_id,material_id,material_name,material_variant,measure,quantity)
      values(actor.tenant_id,p_id,material.id,material.name,material.variant,material.purchase_unit,item.quantity);
  end loop;
  insert into public.material_order_events(id,tenant_id,order_id,action,note,actor_id,actor_name)
    values(gen_random_uuid(),actor.tenant_id,p_id,'solicitar',nullif(btrim(p_note),''),actor.id,actor.full_name);
  return p_id;
end;
$$;

-- Existing clients can continue to request an order with normal priority.
create or replace function private.request_material_order(p_id uuid, p_unit uuid, p_note text, p_items jsonb)
returns uuid language sql security invoker set search_path = '' as $$
  select private.request_material_order(p_id, p_unit, p_note, p_items, 1::smallint);
$$;

create or replace function public.request_material_order(p_id uuid, p_unit uuid, p_note text, p_items jsonb, p_priority smallint)
returns uuid language sql security invoker set search_path = '' as $$
  select private.request_material_order(p_id, p_unit, p_note, p_items, p_priority);
$$;

revoke all on function private.request_material_order(uuid, uuid, text, jsonb, smallint),
  public.request_material_order(uuid, uuid, text, jsonb, smallint) from public, anon, authenticated;
grant execute on function private.request_material_order(uuid, uuid, text, jsonb, smallint),
  public.request_material_order(uuid, uuid, text, jsonb, smallint) to authenticated;

notify pgrst, 'reload schema';
