'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const value = (data: FormData, key: string) => String(data.get(key) ?? '').trim();
const maybe = (s: string) => s || null;

function appointmentFromBrazil(value: string) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}:00-03:00`);
  return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString();
}

export async function createPiece(form: FormData) {
  const actor = await requireProfile();
  if (actor.role === 'laboratorio') redirect('/painel/pecas?erro=permissao');
  const supabase = await createClient();
  const teeth = value(form, 'teeth').split(/[\s,;]+/).map(s => s.trim()).filter(Boolean).slice(0, 32);
  const { data, error } = await supabase.rpc('register_piece', {
    p_patient_name: value(form, 'patient_name'),
    p_procedure_type: value(form, 'procedure_type'),
    p_unit_id: value(form, 'unit_id'),
    p_laboratory_id: value(form, 'laboratory_id'),
    p_teeth: teeth,
    p_arch: maybe(value(form, 'arch')),
    p_expected_at: maybe(value(form, 'expected_at')),
    p_next_appointment_at: appointmentFromBrazil(value(form, 'next_appointment_at')),
    p_priority: form.get('priority') === 'on',
    p_note: maybe(value(form, 'notes')),
    p_clinicorp_patient_id: maybe(value(form, 'clinicorp_patient_id'))
  });
  if (error || !data) redirect('/painel/pecas?erro=cadastro');
  revalidatePath('/painel');
  revalidatePath('/painel/pecas');
  redirect(`/painel/pecas/${data}?criada=1`);
}

export async function movePiece(form: FormData) {
  await requireProfile();
  const id = value(form, 'piece_id');
  if (!uuidPattern.test(id)) redirect('/painel/pecas?erro=peca');
  const action = value(form, 'action');
  const supabase = await createClient();
  const { error } = await supabase.rpc('transition_piece', {
    p_piece_id: id,
    p_action: action,
    p_note: maybe(value(form, 'note')),
    p_location: maybe(value(form, 'location')),
    p_laboratory_reference: maybe(value(form, 'laboratory_reference'))
  });
  if (error) redirect(`/painel/pecas/${id}?erro=movimentacao`);
  revalidatePath('/painel');
  revalidatePath('/painel/pecas');
  revalidatePath(`/painel/pecas/${id}`);
  redirect(`/painel/pecas/${id}?sucesso=movimentacao`);
}

export async function changePiecePriority(form: FormData) {
  const actor = await requireProfile();
  if (actor.role === 'laboratorio') redirect('/painel/pecas');
  const id = value(form, 'piece_id');
  if (!uuidPattern.test(id)) redirect('/painel/pecas?erro=peca');
  const supabase = await createClient();
  const { error } = await supabase.rpc('set_piece_priority', {
    p_piece_id: id, p_priority: value(form, 'priority') === 'true', p_reason: maybe(value(form, 'reason'))
  });
  if (error) redirect(`/painel/pecas/${id}?erro=prioridade`);
  revalidatePath('/painel/pecas');
  revalidatePath(`/painel/pecas/${id}`);
  redirect(`/painel/pecas/${id}?sucesso=prioridade`);
}
