import { CourseRecord, Teacher } from '../types';
import { ZN, Zplaces } from '../constants/initialData';

export function znorm(s: string): string {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function zhas(hay: string, needle: string): boolean {
  return new RegExp('(?:^|[^a-z0-9])' + needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?=$|[^a-z0-9])', 'i').test(hay);
}

export function zloc(r: CourseRecord): [string, string] {
  const s = znorm(r.address);
  const caba = zhas(s, 'caba') || zhas(s, 'capital federal');

  for (const [z, ps] of Zplaces) {
    if (caba && z !== 'CABA') continue;
    for (const p of ps.split('|')) {
      if (zhas(s, p)) return [z, p];
    }
  }

  if (caba) return ['CABA', 'Sin barrio'];

  for (const [z, p] of [
    ['Zona Norte', 'norte'],
    ['Zona Oeste', 'oeste'],
    ['Zona Sur', 'sur'],
  ]) {
    if (zhas(s, 'zona ' + p) || s.endsWith(' ' + p)) return [z, 'Sin localidad'];
  }

  return [ZN[4] || 'Sin zona identificada', 'Sin localidad'];
}

export function zcoverage(t: Teacher): string[] {
  const s = znorm(t.zone)
    .replace(/caba (norte|sur|oeste|este)/g, 'caba')
    .replace(/noroeste/g, 'oeste');
  return ZN.slice(0, 4).filter((_, i) => zhas(s, ['caba', 'norte', 'oeste', 'sur'][i]));
}

export function zoneSales(records: CourseRecord[], month?: string, school?: string): CourseRecord[] {
  return records.filter(
    r =>
      r.status !== 'cancelado' &&
      (!school || r.school === school) &&
      (!month || String(r.date || '').startsWith(month))
  );
}
