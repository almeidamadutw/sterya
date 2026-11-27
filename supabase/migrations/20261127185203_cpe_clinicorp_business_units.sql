alter table public.units
  add column clinicorp_business_id text
  check (clinicorp_business_id is null or clinicorp_business_id ~ '^[1-9][0-9]{0,31}$');

-- The labels returned by Clinicorp can be identical. Use the validated unit IDs
-- already configured for these two Casal Odonto units in AVERA/NEZVA.
update public.units u
set clinicorp_business_id = x.business_id
from public.tenants t, (values
  ('Salto', '4857297821237248'),
  ('Sorocaba', '4987769222070272')
) x(unit_name, business_id)
where t.id = u.tenant_id and t.slug = 'casal-odonto' and u.name = x.unit_name;

create unique index units_clinicorp_business_idx
  on public.units(tenant_id, clinicorp_business_id)
  where clinicorp_business_id is not null;
