-- Allocate one permanent sequence per unit. Only the printed cabinet number rolls over.
alter table public.pieces
  add column cabinet_sequence bigint,
  add constraint pieces_cabinet_sequence_positive check (cabinet_sequence > 0);

alter table public.pieces
  add column cabinet_box smallint generated always as (((cabinet_sequence - 1) % 100)::smallint) stored;

create table private.piece_cabinet_counters (
  tenant_id uuid not null,
  unit_id uuid not null,
  last_number bigint not null check (last_number > 0),
  primary key (tenant_id, unit_id),
  foreign key (unit_id, tenant_id) references public.units(id, tenant_id)
);
revoke all on private.piece_cabinet_counters from public, anon, authenticated;

-- Keep the existing history intact and assign boxes in registration order.
with numbered as (
  select id, row_number() over (partition by tenant_id, unit_id order by created_at, id) as number
  from public.pieces
  where unit_id is not null
)
update public.pieces p
set cabinet_sequence = numbered.number
from numbered
where p.id = numbered.id;

insert into private.piece_cabinet_counters(tenant_id, unit_id, last_number)
select tenant_id, unit_id, max(cabinet_sequence)
from public.pieces
where cabinet_sequence is not null
group by tenant_id, unit_id;

alter table public.pieces
  add constraint pieces_cabinet_sequence_per_unit check ((unit_id is null) = (cabinet_sequence is null));

create unique index pieces_unit_cabinet_sequence_idx
  on public.pieces(tenant_id, unit_id, cabinet_sequence)
  where cabinet_sequence is not null;
create index pieces_tenant_created_at_idx on public.pieces(tenant_id, created_at);

create function private.assign_piece_cabinet_number() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.unit_id is null then
    new.cabinet_sequence := null;
    return new;
  end if;

  insert into private.piece_cabinet_counters as counter(tenant_id, unit_id, last_number)
  values (new.tenant_id, new.unit_id, 1)
  on conflict (tenant_id, unit_id) do update
    set last_number = counter.last_number + 1
  returning last_number into new.cabinet_sequence;

  return new;
end;
$$;
revoke all on function private.assign_piece_cabinet_number() from public, anon, authenticated;

create trigger pieces_assign_cabinet_number
before insert on public.pieces
for each row execute function private.assign_piece_cabinet_number();
