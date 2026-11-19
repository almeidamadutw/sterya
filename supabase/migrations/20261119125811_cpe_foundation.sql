create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated, service_role;

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  name text not null,
  unique (id, tenant_id), unique (tenant_id, name)
);
create table if not exists public.laboratories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  name text not null check (length(name) between 2 and 120),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, tenant_id), unique (tenant_id, name)
);
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id),
  username text not null unique check (username ~ '^[a-z0-9][a-z0-9._-]{2,39}$'),
  full_name text not null check (length(full_name) between 2 and 100),
  role text not null check (role in ('suporte', 'gestor', 'equipe', 'laboratorio')),
  laboratory_id uuid,
  active boolean not null default true,
  sessions_valid_after timestamptz not null default '-infinity',
  created_at timestamptz not null default now(),
  foreign key (laboratory_id, tenant_id) references public.laboratories(id, tenant_id),
  check ((role = 'laboratorio' and laboratory_id is not null) or (role <> 'laboratorio' and laboratory_id is null))
);
create index if not exists profiles_tenant_idx on public.profiles(tenant_id);
create index if not exists profiles_laboratory_idx on public.profiles(laboratory_id, tenant_id);
create table if not exists public.pieces (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  unit_id uuid,
  patient_name text not null check (length(patient_name) between 2 and 160),
  clinicorp_patient_id text,
  procedure_type text not null check (procedure_type in ('ppf_lente','pt','protocolo','ppr','onlay','psi')),
  quantity integer not null default 1 check (quantity > 0 and quantity <= 100),
  teeth text[] not null default '{}',
  arch text check (arch in ('superior','inferior','ambas')),
  laboratory_id uuid,
  reference text,
  status text not null default 'aguardando_envio' check (status in ('aguardando_envio','no_laboratorio','recebida','entregue','revisao','cancelada')),
  location text,
  sent_at timestamptz,
  expected_at date,
  received_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (unit_id, tenant_id) references public.units(id, tenant_id),
  foreign key (laboratory_id, tenant_id) references public.laboratories(id, tenant_id)
);
create index if not exists pieces_tenant_status_idx on public.pieces(tenant_id, status);
create index if not exists pieces_lab_idx on public.pieces(laboratory_id, tenant_id);
create index if not exists pieces_unit_idx on public.pieces(unit_id, tenant_id);

create table if not exists private.access_codes (
  code_hash text primary key check (length(code_hash) = 64),
  kind text not null check (kind in ('activate','reset')),
  tenant_id uuid not null references public.tenants(id),
  username text not null,
  full_name text not null,
  role text not null check (role in ('suporte','gestor','equipe','laboratorio')),
  laboratory_id uuid,
  target_user_id uuid references auth.users(id) on delete cascade,
  status text not null default 'available' check (status in ('available','processing','consumed','revoked')),
  lease uuid,
  claimed_at timestamptz,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  foreign key (laboratory_id, tenant_id) references public.laboratories(id, tenant_id)
);
create index if not exists access_codes_username_idx on private.access_codes(username, kind);
create table if not exists private.rate_limits (
  key_hash text primary key,
  bucket timestamptz not null,
  attempts integer not null
);
create table if not exists private.audit_events (
  id bigint generated always as identity primary key,
  tenant_id uuid references public.tenants(id),
  actor_id uuid,
  action text not null,
  subject_id uuid,
  created_at timestamptz not null default now()
);
alter table private.access_codes enable row level security;
alter table private.rate_limits enable row level security;
alter table private.audit_events enable row level security;
revoke all on all tables in schema private from public, anon, authenticated;
grant all on all tables in schema private to service_role;
grant usage, select on all sequences in schema private to service_role;

-- Authorization comes from a protected database profile, never user_metadata.
-- A reset advances sessions_valid_after, immediately excluding old sessions
-- from both the app and the Data API even before an access token expires.
create or replace function private.current_scope() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('tenant_id', p.tenant_id, 'role', p.role, 'laboratory_id', p.laboratory_id)
  from public.profiles p
  where p.id = (select auth.uid()) and p.active
    and exists (
      select 1 from auth.sessions s
      where s.id::text = (select auth.jwt()->>'session_id')
        and s.user_id = p.id
        and s.created_at >= p.sessions_valid_after
        and (s.not_after is null or s.not_after > now())
    );
$$;
revoke all on function private.current_scope() from public, anon;
grant execute on function private.current_scope() to authenticated, service_role;

alter table public.tenants enable row level security;
alter table public.units enable row level security;
alter table public.laboratories enable row level security;
alter table public.profiles enable row level security;
alter table public.pieces enable row level security;
revoke all on public.tenants, public.units, public.laboratories, public.profiles, public.pieces from anon, authenticated;
grant select on public.tenants, public.units, public.laboratories, public.profiles, public.pieces to authenticated;
grant all on public.tenants, public.units, public.laboratories, public.profiles, public.pieces to service_role;

drop policy if exists tenants_read on public.tenants;
create policy tenants_read on public.tenants for select to authenticated
using (id = ((select private.current_scope())->>'tenant_id')::uuid);
drop policy if exists units_read on public.units;
create policy units_read on public.units for select to authenticated
using (tenant_id = ((select private.current_scope())->>'tenant_id')::uuid and (select private.current_scope())->>'role' <> 'laboratorio');
drop policy if exists laboratories_read on public.laboratories;
create policy laboratories_read on public.laboratories for select to authenticated
using (tenant_id = ((select private.current_scope())->>'tenant_id')::uuid and (
  (select private.current_scope())->>'role' <> 'laboratorio' or id = ((select private.current_scope())->>'laboratory_id')::uuid
));
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated
using (tenant_id = ((select private.current_scope())->>'tenant_id')::uuid and (
  id = (select auth.uid()) or (select private.current_scope())->>'role' in ('suporte','gestor')
));
drop policy if exists pieces_read on public.pieces;
create policy pieces_read on public.pieces for select to authenticated
using (tenant_id = ((select private.current_scope())->>'tenant_id')::uuid and (
  (select private.current_scope())->>'role' <> 'laboratorio' or laboratory_id = ((select private.current_scope())->>'laboratory_id')::uuid
));

create or replace function public.take_access_attempt(p_key text) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare n integer;
begin
  insert into private.rate_limits(key_hash, bucket, attempts)
  values (p_key, date_bin('15 minutes', now(), '2020-01-01'::timestamptz), 1)
  on conflict (key_hash) do update set
    attempts = case when private.rate_limits.bucket = excluded.bucket then private.rate_limits.attempts + 1 else 1 end,
    bucket = excluded.bucket
  returning attempts into n;
  return n <= 12;
end;
$$;
create or replace function public.claim_access_code(p_hash text, p_kind text) returns jsonb
language sql security invoker set search_path = '' as $$
  update private.access_codes c
  set status = 'processing', lease = gen_random_uuid(), claimed_at = now()
  where c.code_hash = p_hash and c.kind = p_kind and c.expires_at > now()
    and (c.status = 'available' or (c.status = 'processing' and c.claimed_at < now() - interval '10 minutes'))
  returning to_jsonb(c.*);
$$;
create or replace function public.release_access_code(p_hash text, p_lease uuid) returns void
language sql security invoker set search_path = '' as $$
  update private.access_codes set status = 'available', lease = null, claimed_at = null
  where code_hash = p_hash and lease = p_lease and status = 'processing';
$$;
create or replace function public.lookup_access_user(p_email text) returns uuid
language sql security invoker set search_path = '' as $$
  select id from auth.users where email = p_email limit 1;
$$;
create or replace function public.finish_access_code(p_hash text, p_lease uuid, p_user_id uuid) returns void
language plpgsql security invoker set search_path = '' as $$
declare c private.access_codes%rowtype;
begin
  select * into c from private.access_codes where code_hash = p_hash and lease = p_lease
    and status = 'processing' and expires_at > now() for update;
  if not found then raise exception 'Código indisponível'; end if;
  if c.kind = 'activate' then
    if exists (select 1 from public.profiles where id = p_user_id or username = c.username) then
      raise exception 'Conta já ativada';
    end if;
    insert into public.profiles(id, tenant_id, username, full_name, role, laboratory_id)
    values (p_user_id, c.tenant_id, c.username, c.full_name, c.role, c.laboratory_id);
  else
    if c.target_user_id is distinct from p_user_id then raise exception 'Conta inválida'; end if;
    update public.profiles set sessions_valid_after = clock_timestamp()
    where id = p_user_id and tenant_id = c.tenant_id and active;
    if not found then raise exception 'Conta indisponível'; end if;
  end if;
  update private.access_codes set status = 'consumed', used_at = now(), target_user_id = p_user_id
    where code_hash = p_hash;
  insert into private.audit_events(tenant_id, actor_id, action, subject_id)
    values (c.tenant_id, c.created_by, c.kind || '_completed', p_user_id);
end;
$$;
create or replace function public.issue_access_code(p_actor uuid, p_payload jsonb, p_hash text) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare a public.profiles%rowtype; t public.profiles%rowtype;
  un text := p_payload->>'username'; k text := p_payload->>'kind';
  rn text := p_payload->>'role'; nm text := p_payload->>'full_name';
  lab uuid := nullif(p_payload->>'laboratory_id', '')::uuid;
  expires timestamptz;
begin
  select * into a from public.profiles where id = p_actor and active;
  if not found or a.role not in ('suporte','gestor') then raise exception 'Acesso negado'; end if;
  if k not in ('activate','reset') or un !~ '^[a-z0-9][a-z0-9._-]{2,39}$' then raise exception 'Dados inválidos'; end if;
  perform pg_advisory_xact_lock(hashtextextended(un, 0));
  if k = 'activate' then
    if rn is null or rn not in ('suporte','gestor','equipe','laboratorio') or nm is null or length(nm) not between 2 and 100 then
      raise exception 'Dados inválidos';
    end if;
    if rn = 'suporte' and a.role <> 'suporte' then raise exception 'Acesso negado'; end if;
    if exists (select 1 from public.profiles where username = un) then raise exception 'Usuário indisponível'; end if;
    if rn = 'laboratorio' then
      if lab is null or not exists (select 1 from public.laboratories where id = lab and tenant_id = a.tenant_id and active) then
        raise exception 'Selecione um laboratório válido';
      end if;
    else lab := null;
    end if;
    expires := now() + interval '24 hours';
  else
    select * into t from public.profiles where username = un and tenant_id = a.tenant_id and active;
    if not found or (t.role = 'suporte' and a.role <> 'suporte') then raise exception 'Conta indisponível'; end if;
    rn := t.role; nm := t.full_name; lab := t.laboratory_id;
    expires := now() + interval '15 minutes';
  end if;
  update private.access_codes set status = 'revoked' where username = un and kind = k and status in ('available','processing');
  insert into private.access_codes(code_hash, kind, tenant_id, username, full_name, role, laboratory_id, target_user_id, expires_at, created_by)
  values (p_hash, k, a.tenant_id, un, nm, rn, lab, t.id, expires, a.id);
  insert into private.audit_events(tenant_id, actor_id, action, subject_id) values (a.tenant_id, a.id, k || '_issued', t.id);
  return jsonb_build_object('username', un, 'expires_at', expires, 'kind', k);
end;
$$;
revoke all on function public.take_access_attempt(text), public.claim_access_code(text,text),
  public.release_access_code(text,uuid), public.lookup_access_user(text),
  public.finish_access_code(text,uuid,uuid), public.issue_access_code(uuid,jsonb,text) from public, anon, authenticated;
grant execute on function public.take_access_attempt(text), public.claim_access_code(text,text),
  public.release_access_code(text,uuid), public.lookup_access_user(text),
  public.finish_access_code(text,uuid,uuid), public.issue_access_code(uuid,jsonb,text) to service_role;
-- These two read privileges are exclusively for the service-role RPCs above.
grant select on auth.users to service_role;

insert into public.tenants(slug, name) values ('casal-odonto','Casal Odonto') on conflict (slug) do nothing;
insert into public.units(tenant_id, name)
select t.id, n.name from public.tenants t cross join (values ('Sorocaba'),('Salto')) n(name)
where t.slug = 'casal-odonto' on conflict (tenant_id, name) do nothing;
