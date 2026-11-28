import type { createClient } from './supabase/server';
import { materialSearch, orderPriorities, orderStates, validMaterialId } from './materials';

type Client = Awaited<ReturnType<typeof createClient>>;

export function stockFilters(search: string, group: string) {
  return { q: search.trim().slice(0, 120), category: validMaterialId(group) ? group : '' };
}

export function orderFilters(status?: string, priority?: string, unit?: string) {
  return {
    state: typeof status === 'string' && Object.hasOwn(orderStates, status) ? status : '',
    priority: orderPriorities.find(option => String(option.value) === priority)?.value,
    requestedUnit: typeof unit === 'string' && validMaterialId(unit) ? unit : '',
  };
}

export function stockQuery(client: Client, filters: ReturnType<typeof stockFilters>) {
  let query = client.from('materials').select('id,code,name,variant,category_id,source_label,review_note,purchase_unit', { count: 'exact' })
    .eq('active', true).order('name').order('variant').order('id');
  if (filters.category) query = query.eq('category_id', filters.category);
  if (filters.q) query = query.like('search_text', '%' + materialSearch(filters.q) + '%');
  return query;
}

export function orderQuery(client: Client, filters: ReturnType<typeof orderFilters>) {
  let query = client.from('material_orders').select('id,code,unit_id,requested_by_name,state,priority,created_at', { count: 'exact' })
    .order('approval_priority', { ascending: false }).order('created_at', { ascending: false }).order('id');
  if (filters.state) query = query.eq('state', filters.state);
  if (filters.priority) query = query.eq('priority', filters.priority);
  if (filters.requestedUnit) query = query.eq('unit_id', filters.requestedUnit);
  return query;
}

export function pieceQuery(client: Client, count?: 'exact') {
  return client.from('pieces').select('id,unit_id,patient_name,procedure_type,teeth,arch,reference,cabinet_box,status,laboratory_id,priority,next_appointment_at,expected_at', { count })
    .order('priority', { ascending: false }).order('next_appointment_at', { ascending: true, nullsFirst: false }).order('id');
}
