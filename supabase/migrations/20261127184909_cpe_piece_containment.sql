alter table public.pieces drop constraint pieces_procedure_type_check;

alter table public.pieces add constraint pieces_procedure_type_check
  check (procedure_type in ('ppf_lente','pt','protocolo','ppr','onlay','psi','contencao'));

create or replace function private.register_piece(
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
     or p_procedure_type not in ('ppf_lente','pt','protocolo','ppr','onlay','psi','contencao')
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
