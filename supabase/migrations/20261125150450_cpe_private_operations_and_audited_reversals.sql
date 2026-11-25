
-- Aprimora estornos e mantém RPCs privilegiadas em schema não exposto.
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
    when 'estornar_entrega' then
      if not v_clinic or v_piece.status <> 'entregue' then raise exception 'Transição não permitida'; end if;
      if v_note is null then raise exception 'Justifique o estorno'; end if;
      v_new := 'recebida';
    when 'estornar_recebimento' then
      if not v_clinic or v_piece.status <> 'recebida' then raise exception 'Transição não permitida'; end if;
      if v_note is null then raise exception 'Justifique o estorno'; end if;
      select old_status into v_new from public.piece_events
        where piece_id=v_piece.id and action='receber_clinica'
        order by id desc limit 1;
      if v_new not in ('no_laboratorio','recebido_laboratorio','em_producao','despachada') then
        raise exception 'Histórico insuficiente para estornar';
      end if;
    when 'cancelar' then
      if not v_clinic or v_piece.status in ('entregue','cancelada') then raise exception 'Transição não permitida'; end if;
      if v_note is null then raise exception 'Descreva o motivo do cancelamento'; end if;
      v_new := 'cancelada';
    else raise exception 'Ação desconhecida';
  end case;
  update public.pieces set
    status = v_new,
    sent_at = case when p_action in ('enviar','reenviar') then now() else sent_at end,
    lab_received_at = case when p_action='receber_laboratorio' then now() when p_action='reenviar' then null else lab_received_at end,
    lab_dispatched_at = case when p_action='despachar' then now() when p_action='reenviar' then null else lab_dispatched_at end,
    received_at = case when p_action='receber_clinica' then now() when p_action in ('reenviar','estornar_recebimento') then null else received_at end,
    delivered_at = case when p_action='entregar_paciente' then now() when p_action in ('reenviar','estornar_entrega') then null else delivered_at end,
    received_by = case when p_action='receber_clinica' then auth.uid() when p_action in ('reenviar','estornar_recebimento') then null else received_by end,
    delivered_by = case when p_action='entregar_paciente' then auth.uid() when p_action in ('reenviar','estornar_entrega') then null else delivered_by end,
    location = case when p_action='receber_clinica' then btrim(p_location) when p_action in ('reenviar','estornar_recebimento') then null else location end,
    laboratory_reference = case when p_laboratory_reference is not null then nullif(btrim(p_laboratory_reference),'') else laboratory_reference end,
    updated_by=auth.uid(), updated_at=now()
  where id = v_piece.id;
  insert into public.piece_events(tenant_id,piece_id,actor_id,actor_role,action,old_status,new_status,note)
  values(v_tenant,v_piece.id,auth.uid(),v_role,p_action,v_piece.status,v_new,v_note);
end;
$$;

alter function public.register_piece(text,text,uuid,uuid,text[],text,date,timestamptz,boolean,text,text) set schema private;
alter function public.transition_piece(uuid,text,text,text,text) set schema private;
alter function public.set_piece_priority(uuid,boolean,text) set schema private;

create function public.register_piece(
  p_patient_name text, p_procedure_type text, p_unit_id uuid, p_laboratory_id uuid,
  p_teeth text[] default '{}', p_arch text default null, p_expected_at date default null,
  p_next_appointment_at timestamptz default null, p_priority boolean default false,
  p_note text default null, p_clinicorp_patient_id text default null
) returns uuid
language sql security invoker set search_path = '' as $$
select private.register_piece(p_patient_name,p_procedure_type,p_unit_id,p_laboratory_id,
  p_teeth,p_arch,p_expected_at,p_next_appointment_at,p_priority,p_note,p_clinicorp_patient_id);
$$;
revoke all on function public.register_piece(text,text,uuid,uuid,text[],text,date,timestamptz,boolean,text,text) from public, anon;
grant execute on function public.register_piece(text,text,uuid,uuid,text[],text,date,timestamptz,boolean,text,text) to authenticated;

create function public.transition_piece(
  p_piece_id uuid, p_action text, p_note text default null, p_location text default null,
  p_laboratory_reference text default null
) returns void
language sql security invoker set search_path = '' as $$
select private.transition_piece(p_piece_id,p_action,p_note,p_location,p_laboratory_reference);
$$;
revoke all on function public.transition_piece(uuid,text,text,text,text) from public, anon;
grant execute on function public.transition_piece(uuid,text,text,text,text) to authenticated;

create function public.set_piece_priority(
  p_piece_id uuid, p_priority boolean, p_reason text default null
) returns void
language sql security invoker set search_path = '' as $$
select private.set_piece_priority(p_piece_id,p_priority,p_reason);
$$;
revoke all on function public.set_piece_priority(uuid,boolean,text) from public, anon;
grant execute on function public.set_piece_priority(uuid,boolean,text) to authenticated;
