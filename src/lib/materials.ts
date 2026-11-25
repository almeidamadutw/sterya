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
