create unique index if not exists materials_id_tenant_idx on public.materials(id, tenant_id);

create table if not exists public.material_stock (
  tenant_id uuid not null,
  unit_id uuid not null,
  material_id uuid not null,
  quantity numeric(14,3) not null default 0 check (quantity >= 0),
  primary key (tenant_id, unit_id, material_id),
  foreign key (unit_id, tenant_id) references public.units(id, tenant_id),
  foreign key (material_id, tenant_id) references public.materials(id, tenant_id)
);
create index if not exists material_stock_material_idx on public.material_stock(material_id, tenant_id);

create table if not exists public.material_orders (
  id uuid primary key,
  tenant_id uuid not null,
  unit_id uuid not null,
  code text generated always as ('PED-' || upper(substr(replace(id::text, '-', ''), 1, 12))) stored,
  state text not null default 'solicitado' check (state in ('solicitado','aprovado','recusado','comprado','recebido','cancelado')),
  note text,
  purchase_code text,
  requested_by uuid,
  requested_by_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (unit_id, tenant_id) references public.units(id, tenant_id),
  unique (id, tenant_id),
  unique (tenant_id, code)
);
create index if not exists material_orders_unit_idx on public.material_orders(unit_id, tenant_id);
create index if not exists material_orders_list_idx on public.material_orders(tenant_id, created_at desc);

create table if not exists public.material_order_items (
  tenant_id uuid not null,
  order_id uuid not null,
  material_id uuid not null,
  material_name text not null,
  material_variant text not null,
  measure text not null,
  quantity numeric(14,3) not null check (quantity > 0),
  received numeric(14,3) not null default 0 check (received between 0 and quantity),
  primary key (order_id, material_id),
  foreign key (order_id, tenant_id) references public.material_orders(id, tenant_id),
  foreign key (material_id, tenant_id) references public.materials(id, tenant_id)
);
create index if not exists material_order_items_material_idx on public.material_order_items(material_id, tenant_id);

create table if not exists public.material_order_events (
  id uuid primary key,
  tenant_id uuid not null,
  order_id uuid not null,
  action text not null check (action in ('solicitar','aprovar','recusar','comprar','receber','cancelar')),
  note text,
  actor_id uuid,
  actor_name text not null,
  created_at timestamptz not null default now(),
  foreign key (order_id, tenant_id) references public.material_orders(id, tenant_id)
);
create index if not exists material_order_events_order_idx on public.material_order_events(order_id, tenant_id, created_at desc);

create table if not exists public.material_stock_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  unit_id uuid not null,
  material_id uuid not null,
  order_event_id uuid references public.material_order_events(id),
  kind text not null check (kind in ('inicial','entrada','baixa','recebimento')),
  delta numeric(14,3) not null,
  balance_after numeric(14,3) not null check (balance_after >= 0),
  reason text not null check (length(btrim(reason)) between 2 and 1000),
  actor_id uuid,
  actor_name text not null,
  created_at timestamptz not null default now(),
  foreign key (tenant_id, unit_id, material_id) references public.material_stock(tenant_id, unit_id, material_id),
  check ((kind = 'recebimento') = (order_event_id is not null)),
  check ((kind = 'baixa' and delta < 0) or (kind = 'inicial' and delta >= 0) or (kind in ('entrada','recebimento') and delta > 0))
);
create index if not exists material_stock_events_history_idx on public.material_stock_events(tenant_id, unit_id, material_id, created_at desc);
create index if not exists material_stock_events_receipt_idx on public.material_stock_events(order_event_id);

do $policies$
declare table_name text;
begin
  foreach table_name in array array['material_stock','material_orders','material_order_items','material_order_events','material_stock_events'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from public, anon, authenticated', table_name);
    execute format('grant select on public.%I to authenticated', table_name);
    execute format('grant all on public.%I to service_role', table_name);
    execute format('drop policy if exists clinic_read on public.%I', table_name);
    execute format(
      'create policy clinic_read on public.%I for select to authenticated using (
        tenant_id = ((select private.current_scope())->>''tenant_id'')::uuid
        and (select private.current_scope())->>''role'' in (''suporte'', ''gestor'', ''equipe''))', table_name);
  end loop;
end;
$policies$;

create or replace function private.material_operator() returns public.profiles
language plpgsql stable security definer set search_path = '' as $$
declare
  scope jsonb := private.current_scope();
  actor public.profiles;
begin
  if coalesce(scope->>'role', '') not in ('suporte','gestor','equipe') then
    raise exception 'Acesso restrito à equipe da clínica.' using errcode = '42501';
  end if;
  select * into strict actor from public.profiles where id = auth.uid();
  return actor;
end;
$$;

create or replace function private.save_material(
  p_id uuid, p_category uuid, p_name text, p_variant text, p_measure text, p_clear_review boolean
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  actor public.profiles := private.material_operator();
  material public.materials;
  measure text := nullif(btrim(p_measure), '');
begin
  if coalesce(length(btrim(p_name)), 0) not between 2 and 160
    or length(coalesce(p_variant, '')) > 160 or length(coalesce(measure, '')) > 80 then
    raise exception 'Confira o nome, a versão e a unidade do material.';
  end if;
  if not exists (select 1 from public.material_categories where id = p_category and tenant_id = actor.tenant_id) then
    raise exception 'Selecione um grupo do catálogo.';
  end if;
  if p_id is null then
    insert into public.materials(tenant_id, category_id, name, variant, purchase_unit)
    values(actor.tenant_id, p_category, btrim(p_name), btrim(coalesce(p_variant, '')), measure)
    returning id into p_id;
    return p_id;
  end if;
  select * into material from public.materials where id = p_id and tenant_id = actor.tenant_id and active for update;
  if not found then raise exception 'Material não encontrado.'; end if;
  if material.purchase_unit is distinct from measure and (
    exists (select 1 from public.material_stock where material_id = p_id and tenant_id = actor.tenant_id)
    or exists (select 1 from public.material_order_items where material_id = p_id and tenant_id = actor.tenant_id)
  ) then
    raise exception 'A unidade de medida já está em uso no estoque ou em um pedido.';
  end if;
  update public.materials set category_id = p_category, name = btrim(p_name),
    variant = btrim(coalesce(p_variant,'')), purchase_unit = measure,
    review_note = case when p_clear_review then null else review_note end
  where id = p_id and tenant_id = actor.tenant_id;
  return p_id;
end;
$$;

-- A linha de saldo é bloqueada durante cada movimentação. Pedidos chamam a mesma rotina de entrada.
create or replace function private.post_material_stock(
  p_tenant uuid, p_unit uuid, p_material uuid, p_operation uuid, p_order_event uuid,
  p_kind text, p_quantity numeric, p_reason text, p_actor uuid, p_actor_name text
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  previous numeric;
  change numeric := case when p_kind = 'baixa' then -p_quantity else p_quantity end;
  new_balance numeric;
begin
  if p_kind is null or p_kind not in ('inicial','entrada','baixa','recebimento')
    or p_quantity is null or p_quantity = 'NaN'::numeric or p_quantity > 99999999
    or p_quantity < 0 or (p_quantity = 0 and p_kind <> 'inicial')
    or p_quantity <> round(p_quantity, 3) or coalesce(length(btrim(p_reason)), 0) not between 2 and 1000 then
    raise exception 'Informe a quantidade e o motivo da movimentação.';
  end if;
  insert into public.material_stock(tenant_id, unit_id, material_id)
    values(p_tenant, p_unit, p_material) on conflict do nothing;
  select quantity into strict previous from public.material_stock
    where tenant_id = p_tenant and unit_id = p_unit and material_id = p_material for update;
  if p_operation is not null and exists (
    select 1 from public.material_stock_events where id = p_operation and tenant_id = p_tenant
      and unit_id = p_unit and material_id = p_material and actor_id = p_actor
      and kind = p_kind and delta = change and reason = btrim(p_reason)
  ) then return; end if;
  if p_kind = 'inicial' and exists (
    select 1 from public.material_stock_events where tenant_id = p_tenant and unit_id = p_unit and material_id = p_material
  ) then raise exception 'Já existe movimentação nesta unidade. Registre uma entrada ou baixa para corrigir o saldo.'; end if;
  new_balance := previous + change;
  if new_balance < 0 then raise exception 'A baixa é maior que o saldo disponível nesta unidade.'; end if;
  insert into public.material_stock_events(id, tenant_id, unit_id, material_id, order_event_id, kind, delta, balance_after, reason, actor_id, actor_name)
    values(coalesce(p_operation,gen_random_uuid()), p_tenant, p_unit, p_material, p_order_event, p_kind, change, new_balance, btrim(p_reason), p_actor, p_actor_name);
  update public.material_stock set quantity = new_balance
    where tenant_id = p_tenant and unit_id = p_unit and material_id = p_material;
end;
$$;

create or replace function private.move_material_stock(
  p_unit uuid, p_material uuid, p_operation uuid, p_kind text, p_quantity numeric, p_reason text
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  actor public.profiles := private.material_operator();
  measure text;
begin
  if p_operation is null or p_kind is null or p_kind not in ('inicial','entrada','baixa') then
    raise exception 'Movimentação inválida.';
  end if;
  if not exists (select 1 from public.units where id = p_unit and tenant_id = actor.tenant_id) then
    raise exception 'Unidade da clínica inválida.';
  end if;
  select purchase_unit into measure from public.materials
    where id = p_material and tenant_id = actor.tenant_id and active for share;
  if not found then raise exception 'Material não encontrado.'; end if;
  if measure is null then raise exception 'Cadastre a unidade de medida antes de movimentar o estoque.'; end if;
  perform private.post_material_stock(actor.tenant_id,p_unit,p_material,p_operation,null,p_kind,p_quantity,p_reason,actor.id,actor.full_name);
end;
$$;

create or replace function private.request_material_order(p_id uuid, p_unit uuid, p_note text, p_items jsonb)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  actor public.profiles := private.material_operator();
  material public.materials;
  item record;
  inserted uuid;
begin
  if p_id is null or length(coalesce(p_note,'')) > 1000
    or not exists (select 1 from public.units where id = p_unit and tenant_id = actor.tenant_id) then
    raise exception 'Confira a unidade e a observação do pedido.';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'Selecione os materiais do pedido.'; end if;
  if jsonb_array_length(p_items) not between 1 and 50 then raise exception 'Inclua de 1 a 50 itens no pedido.'; end if;
  insert into public.material_orders(id,tenant_id,unit_id,note,requested_by,requested_by_name)
    values(p_id,actor.tenant_id,p_unit,nullif(btrim(p_note),''),actor.id,actor.full_name)
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

create or replace function private.advance_material_order(
  p_id uuid, p_operation uuid, p_action text, p_note text, p_purchase_code text, p_items jsonb
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  actor public.profiles := private.material_operator();
  request public.material_orders;
  item record;
  next_state text;
  note text := nullif(btrim(p_note),'');
  protocol text := nullif(btrim(p_purchase_code),'');
begin
  if p_operation is null or length(coalesce(note,'')) > 1000 or length(coalesce(protocol,'')) > 100 then
    raise exception 'Confira os dados da movimentação.';
  end if;
  select * into request from public.material_orders where id = p_id and tenant_id = actor.tenant_id for update;
  if not found then raise exception 'Pedido não encontrado.'; end if;
  if exists (select 1 from public.material_order_events where id = p_operation and tenant_id = actor.tenant_id
    and order_id = p_id and actor_id = actor.id and action = p_action) then return; end if;
  if p_action in ('aprovar','recusar') and actor.role <> 'gestor' then
    raise exception 'A aprovação de pedidos é exclusiva da gestão.' using errcode = '42501';
  end if;
  next_state := case
    when request.state = 'solicitado' and p_action = 'aprovar' then 'aprovado'
    when request.state = 'solicitado' and p_action = 'recusar' and length(note) >= 2 then 'recusado'
    when request.state = 'aprovado' and p_action = 'comprar' and protocol is not null then 'comprado'
    when request.state = 'comprado' and p_action = 'receber' then 'comprado'
    when p_action = 'cancelar' and length(note) >= 2 and (
      (request.state = 'solicitado' and request.requested_by = actor.id)
      or (request.state in ('solicitado','aprovado') and actor.role = 'gestor')
    ) then 'cancelado'
  end;
  if next_state is null then raise exception 'Ação indisponível nesta etapa. Confira o status e os campos obrigatórios.'; end if;
  insert into public.material_order_events(id,tenant_id,order_id,action,note,actor_id,actor_name)
    values(p_operation,actor.tenant_id,p_id,p_action,case when p_action = 'comprar' then concat_ws(' · ',protocol,note) else note end,actor.id,actor.full_name);
  if p_action = 'receber' then
    if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'Informe os itens recebidos.'; end if;
    if jsonb_array_length(p_items) not between 1 and 50 then raise exception 'Informe os itens recebidos.'; end if;
    for item in select * from jsonb_to_recordset(p_items) as i(material_id uuid, quantity numeric) order by material_id loop
      if item.quantity is null or item.quantity = 'NaN'::numeric or item.quantity <= 0
        or item.quantity > 99999999 or item.quantity <> round(item.quantity,3) then
        raise exception 'Informe uma quantidade válida para o recebimento.';
      end if;
      update public.material_order_items set received = received + item.quantity
        where tenant_id = actor.tenant_id and order_id = p_id and material_id = item.material_id
          and received + item.quantity <= quantity;
      if not found then raise exception 'O recebimento ultrapassa a quantidade pendente do item.'; end if;
      perform private.post_material_stock(actor.tenant_id,request.unit_id,item.material_id,null,p_operation,'recebimento',
        item.quantity,'Recebimento do pedido ' || request.code,actor.id,actor.full_name);
    end loop;
    if not exists (select 1 from public.material_order_items where order_id = p_id and received < quantity) then
      next_state := 'recebido';
    end if;
  end if;
  update public.material_orders set state = next_state, updated_at = now(),
    purchase_code = case when p_action = 'comprar' then protocol else purchase_code end where id = p_id;
end;
$$;

create or replace function public.save_material(p_id uuid,p_category uuid,p_name text,p_variant text,p_measure text,p_clear_review boolean)
returns uuid language sql security invoker set search_path = '' as $$
  select private.save_material(p_id,p_category,p_name,p_variant,p_measure,p_clear_review);
$$;
create or replace function public.move_material_stock(p_unit uuid,p_material uuid,p_operation uuid,p_kind text,p_quantity numeric,p_reason text)
returns void language sql security invoker set search_path = '' as $$
  select private.move_material_stock(p_unit,p_material,p_operation,p_kind,p_quantity,p_reason);
$$;
create or replace function public.request_material_order(p_id uuid,p_unit uuid,p_note text,p_items jsonb)
returns uuid language sql security invoker set search_path = '' as $$
  select private.request_material_order(p_id,p_unit,p_note,p_items);
$$;
create or replace function public.advance_material_order(p_id uuid,p_operation uuid,p_action text,p_note text,p_purchase_code text,p_items jsonb)
returns void language sql security invoker set search_path = '' as $$
  select private.advance_material_order(p_id,p_operation,p_action,p_note,p_purchase_code,p_items);
$$;

revoke all on function private.material_operator(),
  private.post_material_stock(uuid,uuid,uuid,uuid,uuid,text,numeric,text,uuid,text)
  from public, anon, authenticated;
do $permissions$
declare
  signature text;
  routine_schema text;
begin
  foreach signature in array array[
    'save_material(uuid,uuid,text,text,text,boolean)','move_material_stock(uuid,uuid,uuid,text,numeric,text)',
    'request_material_order(uuid,uuid,text,jsonb)','advance_material_order(uuid,uuid,text,text,text,jsonb)'
  ] loop
    foreach routine_schema in array array['private','public'] loop
      execute format('revoke all on function %I.%s from public, anon, authenticated', routine_schema, signature);
      execute format('grant execute on function %I.%s to authenticated', routine_schema, signature);
    end loop;
  end loop;
end;
$permissions$;
