import type { PieceRegion } from '../../supabase/functions/cpe-clinicorp-lookup/piece-procedure.ts';

export {
  classifyPieceProcedure, parsePieceArch, parsePieceTeeth, pieceRegion, suggestPieceLaboratory,
} from '../../supabase/functions/cpe-clinicorp-lookup/piece-procedure.ts';
export type { PieceArch, PieceProcedureType, PieceRegion } from '../../supabase/functions/cpe-clinicorp-lookup/piece-procedure.ts';
export type { ClinicorpPieceCandidate, ClinicorpProcedureResult } from '../../supabase/functions/cpe-clinicorp-lookup/procedures.ts';

export function isPieceRegion(value: string): value is PieceRegion {
  return value === 'anterior' || value === 'posterior';
}

export function pieceRoutingLabel(type: string, sourceLabel: string, stage: string, region = '') {
  if (type === 'ppf_lente' && isPieceRegion(region)) return 'PPF ' + region;
  if (type === 'ppr' && stage === 'infraestrutura') return 'Infraestrutura de PPR';
  if (type === 'ppr' && stage === 'completa') return 'PPR';
  return sourceLabel;
}

const localDateTime = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function appointmentInputValue(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = Object.fromEntries(localDateTime.formatToParts(date).map(part => [part.type, part.value]));
  return parts.year + '-' + parts.month + '-' + parts.day + 'T' + parts.hour + ':' + parts.minute;
}
