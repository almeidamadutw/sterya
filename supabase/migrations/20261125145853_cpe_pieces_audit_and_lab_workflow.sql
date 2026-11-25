
-- STERYA: operações reais de peças com auditoria e acesso restrito
-- A precificação permanece deliberadamente fora do escopo.
alter table public.pieces add column if not exists laboratory_reference text;
alter table public.pieces add column if not exists next_appointment_at timestamptz;
alter table public.pieces add column if not exists priority boolean not null default false;
alter table public.pieces add column if not exists priority_reason text;
alter table public.pieces add column if not exists notes text;
alter table public.pieces add column if not exists lab_received_at timestamptz;
alter table public.pieces add column if not exists lab_dispatched_at timestamptz;
alter table public.pieces add column if not exists created_by uuid references auth.users(id);
alter table public.pieces add column if not exists updated_by uuid references auth.users(id);
alter table public.pieces add column if not exists received_by uuid references auth.users(id);
alter table public.pieces add column if not exists delivered_by uuid references auth.users(id);
alter table public.pieces add column if not exists updated_at timestamptz not null default now();
alter table public.pieces drop constraint if exists pieces_status_check;
alter table public.pieces add constraint pieces_status_check
check (status in ('aguardando_envio','no_laboratorio','recebido_laboratorio','em_producao','despachada','recebida','entregue','revisao','cancelada'));
create unique index if not exists pieces_unique_reference_per_tenant on public.pieces (tenant_id, reference) where reference is not null;
create index if not exists pieces_next_appointment_idx on public.pieces(tenant_id, next_appointment_at);
create table if not exists public.piece_events(
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants(id),
  piece_id uuid not null references public.pieces(id) on delete restrict,
  actor_id uuid not null references auth.users(id),
  actor_role text not null,
  action text not null,
  old_status text,
  new_status text,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists piece_events_piece_idx on public.piece_events(piece_id, created_at desc);
alter table public.piece_events enable row level security;
revoke all on public.piece_events from anon, authenticated;
grant select on public.piece_events to authenticated;
grant all on public.piece_events to service_role;
drop policy if exists piece_events_read on public.piece_events;
create policy piece_events_read on public.piece_events for select to authenticated
using (
  tenant_id = ((select private.current_scope())->>'tenant_id')::uuid
  and exists (
    select 1 from public.pieces p where p.id = piece_id and p.tenant_id = piece_events.tenant_id
  )
);

-- As únicas gravações operacionais passam por RPCs com validação de perfil e sessão.
-- A função SECURITY DEFINER é restrita a authenticated e valida explicitamente escopo,
-- unidade, laboratório, transições e auditoria antes de gravar.
create or replace function public.register_piece(
  p_patient_name text, p_procedure_type text, p_unit_id uuid, p_laboratory_id uuid,
  p_teeth text[] default '{}', p_arch text default null, p_expected_at date default null,
  p_next_appointment_at timestamptz default null, p_priority boolean default false,
  p_note text default null, p_clinicorp_patient_id text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_scope jsonb; v_tenant uuid; v_role text; v_id uuid := gen_random_uuid();
        v_ref text; v_name text := btrim(p_patient_name);
begin
  v_scope := private.current_scope();
  v_tenant := nullif(v_scope->>'tenant_id','')::uuid;
  v_role := v_scope->>'role';
  if auth.uid() is null or v_tenant is null or v_role not in ('suporte','gestor','equipe') then
    raise exception 'Acesso negado' using errcode='42501';
  end if;
  if v_name is null or char_length(v_name) not between 2 and 160
     or p_procedure_type not in ('ppf_lente','pt','protocolo','ppr','onlay','psi')
     or p_unit_id is null or p_laboratory_id is null
     or coalesce(array_length(p_teeth,1),0) > 32
     or char_length(coalesce(p_note,'')) > 1000
     or char_length(coalesce(p_clinicorp_patient_id,'')) > 120 then
    raise exception 'Dados da peça inválidos';
  end if;
  if p_arch is not null and p_arch not in ('superior','inferior','ambas') then
    raise exception 'Arcada inválida';
  end if;
  if not exists(select 1 from public.units where id=p_unit_id and tenant_id=v_tenant) then
    raise exception 'Unidade inválida';
  end if;
  if not exists(select 1 from public.laboratories where id=p_laboratory_id and tenant_id=v_tenant and active) then
    raise exception 'Laboratório inválido';
  end if;
  v_ref := 'CO-' || upper(substr(replace(v_id::text,'-',''),1,12));
  insert into public.pieces(id,tenant_id,unit_id,patient_name,clinicorp_patient_id,
     procedure_type,teeth,arch,laboratory_id,reference,status,expected_at,
     next_appointment_at,priority,notes,created_by,updated_by)
  values(v_id,v_tenant,p_unit_id,v_name,nullif(btrim(p_clinicorp_patient_id),''),
     p_procedure_type,coalesce(p_teeth,'{}'),p_arch,p_laboratory_id,v_ref,'aguardando_envio',
     p_expected_at,p_next_appointment_at,p_priority,nullif(btrim(p_note),''),
     auth.uid(),auth.uid());
  insert into public.piece_events(tenant_id,piece_id,actor_id,actor_role,action,new_status,note)
  values(v_tenant,v_id,auth.uid(),v_role,'criar','aguardando_envio',nullif(btrim(p_note),''));
  return v_id;
end;
$$;
revoke all on function public.register_piece(text,text,uuid,uuid,text[],text,date,timestamptz,boolean,text,text) from public, anon;
grant execute on function public.register_piece(text,text,uuid,uuid,text[],text,date,timestamptz,boolean,text,text) to authenticated;

create or replace function public.transition_piece(
  p_piece_id uuid, p_action text, p_note text default null,
  p_location text default null, p_laboratory_reference text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare v_scope jsonb; v_tenant uuid; v_role text; v_lab uuid;
        v_piece public.pieces%rowtype; v_new text; v_note text:=nullif(btrim(p_note),'');
        v_clinic boolean; v_lab_actor boolean;
begin
  v_scope := private.current_scope();
  v_tenant := nullif(v_scope->>'tenant_id','')::uuid;
  v_role := v_scope->>'role';
  v_lab := nullif(v_scope->>'laboratory_id','')::uuid;
  if auth.uid() is null or v_tenant is null then raise exception 'Acesso negado' using errcode='42501'; end if;
  v_clinic := v_role in ('suporte','gestor','equipe');
  v_lab_actor := v_role = 'laboratorio';
  select * into v_piece from public.pieces where id = p_piece_id and tenant_id = v_tenant for update;
  if not found or (v_lab_actor and v_piece.laboratory_id is distinct from v_lab) then
     raise exception 'Peça não encontrada ou sem permissão' using errcode='42501';
  end if;
  if char_length(coalesce(v_note,'')) > 1000 or char_length(coalesce(p_location,'')) > 160
     or char_length(coalesce(p_laboratory_reference,'')) > 100 then
     raise exception 'Texto muito longo';
  end if;
  if p_laboratory_reference is not null and not v_lab_actor then
     raise exception 'Código do laboratório só pode ser preenchido por seu responsável' using errcode='42501';
  end if;
  case p_action
    when 'enviar' then
      if not v_clinic or v_piece.status <> 'aguardando_envio' then raise exception 'Transição não permitida'; end if;
      v_new := 'no_laboratorio';
    when 'reenviar' then
      if not v_clinic or v_piece.status <> 'revisao' then raise exception 'Transição não permitida'; end if;
      v_new := 'no_laboratorio';
    when 'receber_laboratorio' then
      if not v_lab_actor or v_piece.status <> 'no_laboratorio' then raise exception 'Transição não permitida'; end if;
      v_new := 'recebido_laboratorio';
    when 'iniciar_producao' then
      if not v_lab_actor or v_piece.status <> 'recebido_laboratorio' then raise exception 'Transição não permitida'; end if;
      v_new := 'em_producao';
    when 'despachar' then
      if not v_lab_actor or v_piece.status not in ('recebido_laboratorio','em_producao') then raise exception 'Transição não permitida'; end if;
      v_new := 'despachada';
    when 'receber_clinica' then
      if not v_clinic or v_piece.status not in ('no_laboratorio','recebido_laboratorio','em_producao','despachada') then
        raise exception 'Transição não permitida';
      end if;
      if length(btrim(coalesce(p_location,''))) < 2 then raise exception 'Informe onde a peça foi guardada'; end if;
      v_new := 'recebida';
    when 'entregar_paciente' then
      if not v_clinic or v_piece.status <> 'recebida' then raise exception 'Transição não permitida'; end if;
      v_new := 'entregue';
    when 'solicitar_revisao' then
      if not v_clinic or v_piece.status not in ('recebida','entregue') then raise exception 'Transição não permitida'; end if;
      if v_note is null then raise exception 'Descreva o motivo da revisão'; end if;
      v_new := 'revisao';
    when 'cancelar' then
      if not v_clinic or v_piece.status in ('entregue','cancelada') then raise exception 'Transição não permitida'; end if;
      if v_note is null then raise exception 'Descreva o motivo do cancelamento'; end if;
      v_new := 'cancelada';
    else raise exception 'Ação desconhecida';
  end case;
  update public.pieces set
    status = v_new,
    sent_at = case when p_action in ('enviar','reenviar') then now() else sent_at end,
    lab_received_at = case when p_action='receber_laboratorio' then now() else lab_received_at end,
    lab_dispatched_at = case when p_action='despachar' then now() else lab_dispatched_at end,
    received_at = case when p_action='receber_clinica' then now() when p_action='reenviar' then null else received_at end,
    delivered_at = case when p_action='entregar_paciente' then now() when p_action='reenviar' then null else delivered_at end,
    received_by = case when p_action='receber_clinica' then auth.uid() when p_action='reenviar' then null else received_by end,
    delivered_by = case when p_action='entregar_paciente' then auth.uid() when p_action='reenviar' then null else delivered_by end,
    location = case when p_action='receber_clinica' then btrim(p_location) when p_action='reenviar' then null else location end,
    laboratory_reference = case when p_laboratory_reference is not null then nullif(btrim(p_laboratory_reference),'') else laboratory_reference end,
    updated_by=auth.uid(), updated_at=now()
  where id = v_piece.id;
  insert into public.piece_events(tenant_id,piece_id,actor_id,actor_role,action,old_status,new_status,note)
  values(v_tenant,v_piece.id,auth.uid(),v_role,p_action,v_piece.status,v_new,v_note);
end;
$$;
revoke all on function public.transition_piece(uuid,text,text,text,text) from public, anon;
grant execute on function public.transition_piece(uuid,text,text,text,text) to authenticated;

create or replace function public.set_piece_priority(
  p_piece_id uuid, p_priority boolean, p_reason text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare v_scope jsonb; v_tenant uuid; v_role text; v_current boolean;
begin
  v_scope := private.current_scope();
  v_tenant := nullif(v_scope->>'tenant_id','')::uuid;
  v_role := v_scope->>'role';
  if auth.uid() is null or v_tenant is null or v_role not in ('suporte','gestor','equipe') then
    raise exception 'Acesso negado' using errcode='42501';
  end if;
  if char_length(coalesce(p_reason,'')) > 500 then raise exception 'Motivo muito longo'; end if;
  select priority into v_current from public.pieces where id=p_piece_id and tenant_id=v_tenant for update;
  if not found then raise exception 'Peça não encontrada'; end if;
  update public.pieces set priority=p_priority,
    priority_reason=case when p_priority then nullif(btrim(p_reason),'') else null end,
    updated_by=auth.uid(),updated_at=now() where id=p_piece_id;
  insert into public.piece_events(tenant_id,piece_id,actor_id,actor_role,action,old_status,new_status,note)
  select v_tenant,p_piece_id,auth.uid(),v_role,
    case when p_priority then 'marcar_prioridade' else 'retirar_prioridade' end,
    status,status,nullif(btrim(p_reason),'')
  from public.pieces where id=p_piece_id;
end;
$$;
revoke all on function public.set_piece_priority(uuid,boolean,text) from public, anon;
grant execute on function public.set_piece_priority(uuid,boolean,text) to authenticated;

-- Os cinco laboratórios foram confirmados pela equipe, sem criar logins/senhas.
insert into public.laboratories(tenant_id,name)
select t.id, lab.name from public.tenants t
cross join (values
('Laboratório Alexandra - Carla'),
('Laboratório Emerson'),
('Laboratório Design - Renan'),
('Laboratório Daiane Mota'),
('Laboratório Eder')
) as lab(name)
where t.slug = 'casal-odonto'
on conflict (tenant_id,name) do nothing;
