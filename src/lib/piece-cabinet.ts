export function cabinetBoxLabel(box: number | null | undefined) {
  return box == null ? null : String(box).padStart(2, '0');
}

export function pieceYearRange(year: number) {
  return { start: year + '-01-01T00:00:00-03:00', end: (year + 1) + '-01-01T00:00:00-03:00' };
}

export function currentPieceYear() {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', year: 'numeric' }).format(new Date()));
}
