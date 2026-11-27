export function materialSearch(value: string) {
  const normalized = value.trim().slice(0, 120).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ');
  // Escape LIKE wildcards. Values are passed via the SDK, never raw SQL.
  return normalized.replace(/[\\%_]/g, '\\$&');
}
export function catalogPage(value?: string) {
  if (!value || !/^\d{1,6}$/.test(value)) return 1;
  return Math.max(1, Number(value));
}
export const catalogPageSize = 40;

export const materialBase = '/painel/materiais';
export const orderBase = materialBase + '/pedidos';

export function validMaterialId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export type MaterialGroup = { id: string; name: string };
export const materialQuantity = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 });
export const materialDate = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });

export const orderStates: Record<string, string> = {
  solicitado: 'Aguardando aprovação',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
  comprado: 'Aguardando recebimento',
  recebido: 'Recebido',
  cancelado: 'Cancelado',
};

export const orderActions: Record<string, string> = {
  solicitar: 'Pedido enviado',
  aprovar: 'Pedido aprovado',
  recusar: 'Pedido recusado',
  comprar: 'Compra registrada',
  receber: 'Recebimento registrado',
  cancelar: 'Pedido cancelado',
};
