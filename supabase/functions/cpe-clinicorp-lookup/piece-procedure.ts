export type PieceProcedureType = 'ppf_lente' | 'pt' | 'protocolo' | 'ppr' | 'onlay' | 'psi' | 'contencao';
export type PieceArch = 'superior' | 'inferior' | 'ambas';

type Laboratory = { id: string; name: string; active: boolean };
type Region = 'anterior' | 'posterior';

const fdiPattern = /^(?:[1-4][1-8]|[5-8][1-5])$/;
const normalize = (label: string) => label.normalize('NFD')
  .replace(/\p{Diacritic}/gu, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

export function parsePieceTeeth(value: unknown): string[] {
  const tokens = Array.isArray(value) ? value
    : typeof value === 'string' ? value.trim().split(/[\s,;|/]+/u)
    : typeof value === 'number' ? [value] : [];
  if (tokens.length === 0 || tokens.length > 32) return [];

  const teeth = new Set<string>();
  for (const token of tokens) {
    const tooth = typeof token === 'string' ? token.trim()
      : typeof token === 'number' && Number.isSafeInteger(token) ? String(token) : '';
    if (!fdiPattern.test(tooth)) return [];
    teeth.add(tooth);
  }
  return Array.from(teeth);
}

export function parsePieceArch(value: unknown): PieceArch | null {
  if (typeof value !== 'string') return null;
  const label = normalize(value);
  if (/\b(?:ambas|bimaxilar|duas arcadas)\b/.test(label)) return 'ambas';
  const upper = /\b(?:superior(?:es)?|sup|maxila|maxilar)\b/.test(label);
  const lower = /\b(?:inferior(?:es)?|inf|mandibula|mandibular)\b/.test(label);
  if (upper && lower) return 'ambas';
  if (upper) return 'superior';
  if (lower) return 'inferior';
  return null;
}

export function classifyPieceProcedure(label: string): PieceProcedureType | null {
  const text = normalize(label);
  if (!text || /\b(?:cirurgias?|exodontias?|reabertura|enxerto|remocao|retirada|coroa clinica|intraocular|oftalmica)\b/.test(text)) return null;

  const candidates: PieceProcedureType[] = [];
  const psi = /\bpsi\b|\bprotese\s+(?:dentaria\s+)?(?:sobre|suportada por)\s+implantes?\b/.test(text);
  const ppf = /\bppf\b|\bprotese parcial fixa\b|\bpontes? fixas?\b|\bfacetas?\b/.test(text)
    || /(?:^|\bconfeccao de )lentes?$|\blentes? (?:dent(?:al|ais)|de contato|anterior(?:es)?|posterior(?:es)?)\b/.test(text);
  // A generic surgical implant or a crown mentioned over an implant is not an explicit PSI.
  const crown = /\bcoroas?\b/.test(text) && !/\bimplantes?\b/.test(text);
  const protocol = /\bprotese (?:total )?(?:tipo )?protocolo\b|\bbarra (?:metalica )?para protocolo\b/.test(text)
    || /(?:^|\b(?:confeccao|moldagem|instalacao|prova|acrilizacao|reembasamento) (?:de |do |para )?)protocolo(?:s)?(?:$| (?=(?:definitiv[oa]|provisori[oa]|superior|inferior|sup|inf|parafusad[oa]|fix[oa]|padrao|de carga|carga|capturad[oa]|sobre implantes?|protese fixa)\b))/.test(text);

  if (ppf || (crown && !psi)) candidates.push('ppf_lente');
  if (psi) candidates.push('psi');
  if (protocol) candidates.push('protocolo');
  if (/\bppr\b|\bprotese parcial removivel\b/.test(text)) candidates.push('ppr');
  if (/\bpt\b|\bprotese total\b/.test(text) && !protocol) candidates.push('pt');
  if (/\bonlays?\b/.test(text)) candidates.push('onlay');
  if (/\bcontenc(?:ao|oes)\b/.test(text)) candidates.push('contencao');
  return candidates.length === 1 ? candidates[0] : null;
}

function pieceRegion(label: string, teeth: string[]): Region | null {
  const text = normalize(label);
  const anterior = /\b(?:anterior(?:es)?|ant)\b/.test(text);
  const posterior = /\b(?:posterior(?:es)?|post)\b/.test(text);
  if (anterior && posterior) return null;
  const labelRegion = anterior ? 'anterior' : posterior ? 'posterior' : null;

  const parsed = parsePieceTeeth(teeth);
  if (teeth.length > 0 && parsed.length === 0) return null;
  const regions = new Set<Region>(parsed.map(tooth => Number(tooth[1]) <= 3 ? 'anterior' : 'posterior'));
  if (regions.size > 1) return null;
  const toothRegion = regions.values().next().value ?? null;
  if (labelRegion && toothRegion && labelRegion !== toothRegion) return null;
  return labelRegion ?? toothRegion;
}

export function suggestPieceLaboratory(
  type: PieceProcedureType,
  label: string,
  teeth: string[],
  laboratories: Laboratory[],
): string | null {
  let target: string;
  switch (type) {
    case 'ppf_lente': {
      const region = pieceRegion(label, teeth);
      if (!region) return null;
      target = region === 'anterior' ? 'Laboratório Design - Renan' : 'Laboratório Emerson';
      break;
    }
    case 'psi':
      target = 'Laboratório Design - Renan';
      break;
    case 'ppr': {
      const text = normalize(label);
      const infrastructure = /\b(?:infra\s?estrutura|armacao|estrutura metalica)\b/;
      const withoutInfrastructure = /\b(?:sem|exceto) (?:a )?(?:infra\s?estrutura|armacao|estrutura metalica)\b/;
      target = infrastructure.test(text) && !withoutInfrastructure.test(text)
        ? 'Laboratório Eder' : 'Laboratório Alexandra - Carla';
      break;
    }
    case 'pt':
    case 'protocolo':
      target = 'Laboratório Alexandra - Carla';
      break;
    case 'contencao':
      target = 'Laboratório Daiane Mota';
      break;
    default:
      return null;
  }
  const name = normalize(target);
  const matches = laboratories.filter(lab => lab.active && normalize(lab.name) === name);
  return matches.length === 1 ? matches[0].id : null;
}
