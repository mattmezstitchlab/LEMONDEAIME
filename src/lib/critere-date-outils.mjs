/* La règle de la date de recherche du Réseau, sans React : voir critereDate.ts. */
import { lireDate } from '../../api/_orbe-local.mjs';
export const ISO = /^\d{4}-\d{2}-\d{2}$/;
export function critereDepuis(param, texteMeta, aujourdhui) {
  const deMeta = texteMeta.trim() ? lireDate(texteMeta, aujourdhui) : null;
  if (param === 'aucune') return { date: null, source: 'aucune', texteMeta, metaLisible: !!deMeta, suffixe: '?date=aucune' };
  if (param && ISO.test(param)) return { date: param, source: 'recherche', texteMeta, metaLisible: !!deMeta, suffixe: '?date=' + param };
  return { date: deMeta, source: deMeta ? 'metamorphose' : 'aucune', texteMeta, metaLisible: !!deMeta, suffixe: '' };
}
