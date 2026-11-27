'use server';

import { revalidatePath } from 'next/cache';
import { requireProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { materialBase, orderBase, validMaterialId } from '@/lib/materials';

const field = (form: FormData, key: string) => String(form.get(key) ?? '').trim();

function feedback(error: { code: string; message: string } | null) {
  if (!error) return null;
  if (error.code === 'P0001' || error.code === '42501') return error.message;
  if (error.code === '23505') return 'Já existe um cadastro com esses dados ou a operação já foi registrada.';
  return 'Não foi possível salvar. Confira os dados e tente novamente.';
}

function parseQuantity(value: string) {
  return /^\d{1,8}([.,]\d{1,3})?$/.test(value) ? Number(value.replace(',', '.')) : null;
}

function parseItems(form: FormData, receiving = false) {
  const ids = form.getAll('material_id').map(String);
  const quantities = form.getAll('quantity').map(String);
  if (ids.length < 1 || ids.length > 50 || ids.length !== quantities.length || new Set(ids).size !== ids.length) return null;
  const items = [];
  for (const [index, material_id] of ids.entries()) {
    if (!validMaterialId(material_id)) return null;
    const value = quantities[index].trim();
    if (receiving && !value) continue;
    const quantity = parseQuantity(value);
    if (receiving && quantity === 0) continue;
    if (quantity === null || quantity <= 0) return null;
    items.push({ material_id, quantity });
  }
  return items.length ? items : null;
}

async function internalClient() {
  const profile = await requireProfile();
  return ['suporte', 'gestor', 'equipe'].includes(profile.role) ? createClient() : null;
}

const denied = { error: 'Acesso restrito à equipe da clínica.' };

export async function saveMaterial(form: FormData) {
  const supabase = await internalClient();
  if (!supabase) return denied;
  const id = field(form, 'id');
  const category = field(form, 'category');
  if ((id && !validMaterialId(id)) || !validMaterialId(category)) return { error: 'Selecione um grupo válido.' };
  const { data, error } = await supabase.rpc('save_material', {
    p_id: id || null,
    p_category: category,
    p_name: field(form, 'name'),
    p_variant: field(form, 'variant'),
    p_measure: field(form, 'measure'),
    p_clear_review: form.get('clear_review') === 'on',
  });
  if (error || !data) return { error: feedback(error) ?? 'Material não salvo.' };
  revalidatePath(materialBase, 'layout');
  return id ? { message: 'Material atualizado.' } : { href: materialBase + '/' + data + '?novo=1' };
}

export async function moveStock(form: FormData) {
  const supabase = await internalClient();
  if (!supabase) return denied;
  const material = field(form, 'material_id');
  const unit = field(form, 'unit_id');
  const operation = field(form, 'operation');
  const quantity = parseQuantity(field(form, 'quantity'));
  if (![material, unit, operation].every(validMaterialId) || quantity === null) {
    return { error: 'Confira o material, a unidade e a quantidade.' };
  }
  const { error } = await supabase.rpc('move_material_stock', {
    p_material: material,
    p_unit: unit,
    p_operation: operation,
    p_kind: field(form, 'kind'),
    p_quantity: quantity,
    p_reason: field(form, 'reason'),
  });
  if (error) return { error: feedback(error) ?? 'Movimentação não salva.' };
  revalidatePath(materialBase, 'layout');
  return { message: 'Movimentação registrada.', reset: true };
}

export async function requestOrder(form: FormData) {
  const supabase = await internalClient();
  if (!supabase) return denied;
  const unit = field(form, 'unit_id');
  const operation = field(form, 'operation');
  const items = parseItems(form);
  if (!validMaterialId(unit) || !validMaterialId(operation) || !items) {
    return { error: 'Selecione uma unidade e informe os materiais e quantidades, sem repetir itens.' };
  }
  const { data, error } = await supabase.rpc('request_material_order', {
    p_id: operation,
    p_unit: unit,
    p_note: field(form, 'note'),
    p_items: items,
  });
  if (error || !data) return { error: feedback(error) ?? 'Pedido não salvo.' };
  revalidatePath(orderBase);
  return { href: orderBase + '/' + data + '?novo=1' };
}

export async function advanceOrder(form: FormData) {
  const supabase = await internalClient();
  if (!supabase) return denied;
  const id = field(form, 'id');
  const operation = field(form, 'operation');
  const action = field(form, 'action');
  if (!validMaterialId(id) || !validMaterialId(operation)) return { error: 'Pedido inválido.' };
  const items = action === 'receber' ? parseItems(form, true) : [];
  if (!items) return { error: 'Informe pelo menos uma quantidade recebida.' };
  const { error } = await supabase.rpc('advance_material_order', {
    p_id: id,
    p_operation: operation,
    p_action: action,
    p_note: field(form, 'note'),
    p_purchase_code: field(form, 'purchase_code'),
    p_items: items,
  });
  if (error) return { error: feedback(error) ?? 'Pedido não atualizado.' };
  revalidatePath(materialBase, 'layout');
  return { message: 'Pedido atualizado.', reset: true };
}
