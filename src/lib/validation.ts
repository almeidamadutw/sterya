export function normalizeUsername(value: string) {
  const username = value.trim().toLowerCase().replace(/@(?:cpe\.ceoclub|ceoclubcpe)$/, '');
  return /^[a-z0-9][a-z0-9._-]{2,39}$/.test(username) ? username : null;
}
export function authEmail(username: string) { return `${username}@acesso.sterya.app`; }
export function displayUsername(username: string) { return `${username}@cpe.ceoclub`; }
export function passwordError(password: string) {
  return password.length < 8 || password.length > 128 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)
    ? 'Use de 8 a 128 caracteres, com letras e números.' : null;
}
export function normalizeCode(value: string) {
  const code = value.replace(/[\s-]/g, '').toUpperCase();
  return /^[A-F0-9]{32}$/.test(code) ? code : null;
}
export type ActionState = { error?: string; success?: string; code?: string; username?: string; expires_at?: string; kind?: string };
export const roleNames: Record<string, string> = { suporte: 'Suporte', gestor: 'Gestão', equipe: 'Equipe', laboratorio: 'Laboratório' };
export const procedureNames: Record<string, string> = { ppf_lente: 'PPF / lente', pt: 'PT', protocolo: 'Protocolo', ppr: 'PPR', onlay: 'Onlay', psi: 'PSI' };
export const statusNames: Record<string, string> = { aguardando_envio: 'Aguardando envio', no_laboratorio: 'Enviada ao laboratório', recebido_laboratorio: 'Recebida no laboratório', em_producao: 'Em produção', despachada: 'Despachada para a clínica', recebida: 'Recebida na clínica', entregue: 'Entregue ao paciente', revisao: 'Em revisão', cancelada: 'Cancelada' };
