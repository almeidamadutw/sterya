import { clinicorpCredentialsForUnit } from './lookup.ts';

type Unit = { id: string; name: string; tenantSlug: string };
type ReadSecret = (key: string) => string | undefined;

export function clinicorpEdgeCredentials(unit: Unit, secret: ReadSecret) {
  const config = secret('CLINICORP_UNIT_CONFIG');
  const explicit = clinicorpCredentialsForUnit(config, unit.id);
  if (explicit) return explicit;

  // Named and legacy settings belong only to the Casal Odonto tenant.
  if (unit.tenantSlug !== 'casal-odonto') return null;
  const unitName = unit.name.trim().toUpperCase();
  if (unitName !== 'SALTO' && unitName !== 'SOROCABA') return null;
  const byName = clinicorpCredentialsForUnit(config, unitName.toLowerCase())
    ?? clinicorpCredentialsForUnit(config, unit.name);
  if (byName) return byName;

  const read = (prefix: string) => ({
    username: (secret(prefix + '_API_USERNAME') || secret(prefix + '_USERNAME'))?.trim() ?? '',
    token: (secret(prefix + '_API_TOKEN') || secret(prefix + '_TOKEN'))?.trim() ?? '',
    subscriberId: secret(prefix + '_SUBSCRIBER_ID')?.trim() ?? '',
  });
  const scoped = read('CLINICORP_' + unitName);
  if (scoped.username || scoped.token || scoped.subscriberId) {
    return scoped.username && scoped.token && scoped.subscriberId ? scoped : null;
  }

  // The existing unscoped CPE credentials were registered for Salto.
  // A shared fallback must never enable searches in another unit.
  if (unitName !== 'SALTO') return null;
  const legacyUnitId = secret('CLINICORP_UNIT_ID')?.trim();
  const legacyUnitName = secret('CLINICORP_UNIT')?.trim().toUpperCase();
  if ((legacyUnitId && legacyUnitId !== unit.id) || (legacyUnitName && legacyUnitName !== unitName)) return null;
  const legacy = read('CLINICORP');
  return legacy.username && legacy.token && legacy.subscriberId ? legacy : null;
}
