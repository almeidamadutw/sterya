import type { clinicorpCredentialsForUnit } from './lookup.ts';
import { classifyPieceProcedure, parsePieceArch, parsePieceTeeth, type PieceArch, type PieceProcedureType } from './piece-procedure.ts';

export type ClinicorpPieceCandidate = {
  id: string;
  label: string;
  type: PieceProcedureType;
  teeth: string[];
  arch: PieceArch | null;
  source: 'agenda' | 'orcamento';
  date: string | null;
};

type ProcedureError = 'invalid' | 'denied' | 'not_configured' | 'credentials_rejected' | 'busy' | 'unavailable' | 'unit_unmapped';
export type ClinicorpProcedureResult = { procedures: ClinicorpPieceCandidate[]; nextAppointment: string | null } | { error: ProcedureError };

type Row = Record<string, unknown>;
type Credentials = NonNullable<ReturnType<typeof clinicorpCredentialsForUnit>>;
type LookupOptions = { businessId?: string; fetcher?: typeof fetch; now?: Date };
type Upstream = { rows: Row[] } | { error: ProcedureError };

const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' });
const clockFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
});

function asRow(value: unknown): Row | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : null;
}

function identifier(value: unknown): string | null {
  const text = typeof value === 'string' ? value.trim() : Number.isSafeInteger(value) ? String(value) : '';
  return /^\d{1,32}$/.test(text) && /[1-9]/.test(text) ? text.replace(/^0+/, '') : null;
}

function normalize(value: unknown) {
  return typeof value === 'string'
    ? value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim()
    : '';
}

function flagged(value: unknown) {
  return value === true || value === 1 || ['X', 'TRUE', 'YES', 'SIM', '1'].includes(normalize(value));
}

function branchTerms(unitName: string): Set<string> {
  const name = normalize(unitName);
  if (!name) return new Set();
  return new Set([
    name, 'UNIDADE ' + name, 'UNIDADE DE ' + name, 'FILIAL ' + name, 'FILIAL DE ' + name,
    'CLINICA ' + name, 'CASAL ODONTO ' + name, 'CASAL ODONTO LTDA ' + name,
    'CASAL ODONTO UNIDADE ' + name, 'CASAL ODONTO UNIDADE DE ' + name, name + ' CASAL ODONTO',
  ]);
}

function inferBusinessId(rows: Row[], unitName: string): string | null {
  const names = branchTerms(unitName);
  const matches = new Set<string>();
  for (const row of rows) {
    const id = identifier(row.id);
    if (id && [row.BusinessName, row.Name].some(name => names.has(normalize(name)))) matches.add(id);
  }
  return matches.size === 1 ? [...matches][0] : null;
}

function listPayload(payload: unknown): Row[] | null {
  const object = asRow(payload);
  if (object && (object.error || object.Error || object.success === false || object.Success === false)) return null;
  const rows = Array.isArray(payload) ? payload : object?.data ?? object?.list;
  if (!Array.isArray(rows)) return null;
  return rows.flatMap(value => {
    const row = asRow(value);
    return row ? [row] : [];
  });
}

async function readClinicorpList(
  path: string,
  query: Record<string, string>,
  credentials: Credentials,
  fetcher: typeof fetch,
): Promise<Upstream> {
  const url = new URL('https://api.clinicorp.com/rest/v1/' + path);
  url.searchParams.set('subscriber_id', credentials.subscriberId);
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  try {
    const bytes = new TextEncoder().encode(credentials.username + ':' + credentials.token);
    const authorization = btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''));
    const response = await fetcher(url, {
      headers: { Accept: 'application/json', Authorization: 'Basic ' + authorization },
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(6500),
    });
    if (response.status === 204) return { rows: [] };
    if (response.status === 401 || response.status === 403) return { error: 'credentials_rejected' };
    if (response.status === 429) return { error: 'busy' };
    if (!response.ok) return { error: 'unavailable' };
    const rows = listPayload(await response.json());
    return rows ? { rows } : { error: 'unavailable' };
  } catch {
    return { error: 'unavailable' };
  }
}

function calendarDay(input: unknown): string | null {
  const raw = (typeof input === 'string' || typeof input === 'number') ? String(input).trim() : '';
  const digits = /^(\d{4})(\d{2})(\d{2})$/.exec(raw);
  const day = digits ? digits.slice(1).join('-') : raw.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const date = new Date(day + 'T12:00:00Z');
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === day ? day : null;
}

function offsetDay(day: string, offset: number): string {
  const date = new Date(day + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function localCalendarDay(date: Date): string | null {
  if (!Number.isFinite(date.valueOf())) return null;
  const parts = Object.fromEntries(dayFormat.formatToParts(date).map(part => [part.type, part.value]));
  return calendarDay([parts.year, parts.month, parts.day].join('-'));
}

function appointmentInstant(row: Row): string | null {
  const timestamp = typeof row.date === 'string' ? row.date.trim() : typeof row.Date === 'string' ? row.Date.trim() : '';
  if (/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,9})?)?(?:Z|[+-]\d\d:?\d\d)$/i.test(timestamp)
    && calendarDay(timestamp)) {
    const instant = new Date(timestamp);
    if (Number.isFinite(instant.valueOf())) return instant.toISOString();
  }
  const day = calendarDay(row.AtomicDate) ?? calendarDay(timestamp);
  const value = row.fromTime ?? row.FromTime;
  const clock = typeof value === 'string' ? /^(\d{1,2}):([0-5]\d)(?::([0-5]\d))?$/.exec(value.trim()) : null;
  if (!day || !clock || Number(clock[1]) > 23) return null;
  const time = [clock[1].padStart(2, '0'), clock[2], clock[3] ?? '00'].join(':');
  const wall = day + 'T' + time;
  // Accept the offset only if its wall clock matches the clinic's time zone.
  for (const offset of ['-03:00', '-02:00']) {
    const instant = new Date(wall + offset);
    const parts = Object.fromEntries(clockFormat.formatToParts(instant).map(part => [part.type, part.value]));
    const local = [parts.year, parts.month, parts.day].join('-') + 'T' + [parts.hour, parts.minute, parts.second].join(':');
    if (local === wall) return instant.toISOString();
  }
  return null;
}

function scopedAppointments(rows: Row[], businessId: string, patientId: string): Row[] {
  return rows.filter(row => identifier(row.Clinic_BusinessId ?? row.BusinessId) === businessId
    && identifier(row.Patient_PersonId ?? row.PatientId) === patientId
    && (row.ItemType == null || normalize(row.ItemType) === 'APPOINTMENT')
    && ![row.Canceled, row.Deleted, row.NoShow].some(flagged)
    && !/\b(CANCELAD[OA]|CANCELLED|CANCELED|DESMARCAD[OA]|EXCLUID[OA]|FALTOU|FALTA|NAO COMPARECEU|NO SHOW|MISSED)\b/.test(normalize(row.StatusDescription ?? row.StatusName ?? row.SchedulingStatus ?? row.Status)));
}

function nextAppointmentFrom(rows: Row[], now: Date): string | null {
  let earliest: string | null = null;
  const reference = now.toISOString();
  for (const row of rows) {
    if ([row.Completed, row.Finished, row.Executed].some(flagged)
      || /\b(CHECKOUT|COMPLETED|FINISHED|EXECUTAD[OA]|ATENDID[OA]|REALIZAD[OA]|FINALIZAD[OA]|CONCLUID[OA])\b/.test(normalize(row.StatusDescription ?? row.StatusName ?? row.SchedulingStatus ?? row.Status))) continue;
    const timestamp = appointmentInstant(row);
    if (timestamp && timestamp > reference && (!earliest || timestamp < earliest)) earliest = timestamp;
  }
  return earliest;
}

function labelValue(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/gu, ' ').slice(0, 180) : '';
}

function clinicalLabel(row: Row): string {
  for (const value of [row.OperationDescription, row.ProcedureName, row.Description, row.Name]) {
    const label = labelValue(value);
    if (label) return label;
  }
  return '';
}

function selectedProcedureRows(value: unknown): Row[] {
  if (Array.isArray(value)) return value.flatMap(item => {
    const row = typeof item === 'string' ? { OperationDescription: item } : asRow(item);
    return row ? [row] : [];
  });
  const row = typeof value === 'string' ? { OperationDescription: value } : asRow(value);
  return row ? [row] : [];
}

function candidate(
  item: Row,
  label: string,
  id: string,
  source: ClinicorpPieceCandidate['source'],
  date: string | null,
): ClinicorpPieceCandidate | null {
  const type = classifyPieceProcedure(label);
  if (!type || flagged(item.Deleted) || flagged(item.NotApproved) || flagged(item.Canceled)) return null;
  const explicitTeeth = /\b(?:dentes?|elementos?)\s*[:#]?\s*([1-4][1-8](?:(?:\s*[,;/]\s*|\s+e\s+)[1-4][1-8])*)\b/iu.exec(label)?.[1];
  const teeth = parsePieceTeeth(item.Teeth ?? item.ToothNumbers ?? item.ToothNumber ?? item.Tooth ?? item.Dentes ?? item.Dente
    ?? explicitTeeth?.replace(/\s+e\s+/giu, ', '));
  const arch = parsePieceArch(item.Arch ?? item.DentalArch ?? item.Arcada) ?? parsePieceArch(label);
  return { id, label, type, teeth, arch, source, date };
}

function candidatesFromAppointments(rows: Row[]): ClinicorpPieceCandidate[] {
  const candidates: ClinicorpPieceCandidate[] = [];
  for (const row of rows) {
    const id = identifier(row.id ?? row.Id);
    if (!id) continue;
    const instant = appointmentInstant(row);
    const date = instant ? localCalendarDay(new Date(instant)) : calendarDay(row.AtomicDate);
    const items = [...selectedProcedureRows(row.SelectedProceduresList), ...selectedProcedureRows(row.Procedures)];
    const listed = items.flatMap((item, index) => {
      const piece = candidate(item, clinicalLabel(item), 'agenda:' + id + ':' + index, 'agenda', date);
      return piece ? [piece] : [];
    });
    if (listed.length || items.length) {
      candidates.push(...listed);
      continue;
    }
    // Prefer the actual procedure label over a category when both are present.
    for (const value of [row.ProcedureName, row.CategoryDescription, row.AppointmentCategoryName, row.CategoryName]) {
      const piece = candidate(row, labelValue(value), 'agenda:' + id, 'agenda', date);
      if (piece) {
        candidates.push(piece);
        break;
      }
    }
  }
  return candidates;
}

function candidatesFromEstimates(rows: Row[], businessId: string, patientId: string): ClinicorpPieceCandidate[] {
  const candidates: ClinicorpPieceCandidate[] = [];
  for (const row of rows) {
    if (identifier(row.BusinessId) !== businessId || identifier(row.PatientId ?? row.Patient_PersonId) !== patientId
      || normalize(row.Status) !== 'APPROVED' || !Array.isArray(row.ProcedureList)) continue;
    const id = identifier(row.TreatmentId);
    if (!id) continue;
    const date = calendarDay(row.ApprovedDate);
    for (const [index, raw] of row.ProcedureList.entries()) {
      const item = asRow(raw);
      if (!item || flagged(item.Executed)) continue;
      const piece = candidate(item, labelValue(item.OperationDescription), 'orcamento:' + id + ':' + index, 'orcamento', date);
      if (piece) candidates.push(piece);
    }
  }
  return candidates;
}

function uniqueCandidates(candidates: ClinicorpPieceCandidate[]): ClinicorpPieceCandidate[] {
  const unique = new Map<string, ClinicorpPieceCandidate>();
  candidates.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || a.id.localeCompare(b.id));
  for (const piece of candidates) {
    const key = [piece.type, normalize(piece.label), [...piece.teeth].sort().join(','), piece.arch].join('|');
    if (!unique.has(key)) unique.set(key, piece);
    if (unique.size === 30) break;
  }
  return [...unique.values()];
}

export async function lookupClinicorpProcedures(
  patientId: string,
  unitName: string,
  credentials: Credentials,
  { businessId, fetcher = fetch, now = new Date() }: LookupOptions = {},
): Promise<ClinicorpProcedureResult> {
  const patient = identifier(patientId);
  const currentDay = localCalendarDay(now);
  if (patient === null || !currentDay) return { error: 'invalid' };

  let business = identifier(businessId);
  if (!business && businessId?.trim()) return { error: 'unit_unmapped' };
  if (!business) {
    const result = await readClinicorpList('business/list', {}, credentials, fetcher);
    if ('error' in result) return result;
    business = inferBusinessId(result.rows, unitName);
  }
  if (!business) return { error: 'unit_unmapped' };

  const appointments = await readClinicorpList('appointment/list', {
    businessId: business,
    patientId: patient,
    from: offsetDay(currentDay, -7),
    to: offsetDay(currentDay, 365),
  }, credentials, fetcher);
  if ('error' in appointments) return appointments;
  const scoped = scopedAppointments(appointments.rows, business, patient);
  const nextAppointment = nextAppointmentFrom(scoped, now);
  const scheduled = candidatesFromAppointments(scoped);
  if (scheduled.length) return { procedures: uniqueCandidates(scheduled), nextAppointment };

  const estimates = await readClinicorpList('estimates/list', {
    clinic_id: business,
    status: 'APPROVED',
    from: offsetDay(currentDay, -30),
    to: currentDay,
  }, credentials, fetcher);
  if ('error' in estimates) return nextAppointment ? { procedures: [], nextAppointment } : estimates;
  return { procedures: uniqueCandidates(candidatesFromEstimates(estimates.rows, business, patient)), nextAppointment };
}
