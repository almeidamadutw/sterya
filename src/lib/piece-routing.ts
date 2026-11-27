export {
  classifyPieceProcedure, parsePieceArch, parsePieceTeeth, suggestPieceLaboratory,
} from '../../supabase/functions/cpe-clinicorp-lookup/piece-procedure.ts';
export type { PieceArch, PieceProcedureType } from '../../supabase/functions/cpe-clinicorp-lookup/piece-procedure.ts';
export type { ClinicorpPieceCandidate, ClinicorpProcedureResult } from '../../supabase/functions/cpe-clinicorp-lookup/procedures.ts';

export function pieceRoutingLabel(type: string, sourceLabel: string, stage: string) {
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
