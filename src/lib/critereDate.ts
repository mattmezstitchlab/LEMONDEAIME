/* La date de recherche du Réseau. Par défaut, elle est reprise de la Métamorphose (la phrase « une date, un lieu »
   gardée sur cet appareil). La personne peut la changer ou ne pas en utiliser pour cette recherche : le choix vit
   dans l'adresse (?date=AAAA-MM-JJ, ou ?date=aucune) et ne modifie jamais la Métamorphose.
   Ce n'est pas la date officielle d'une union : aucune union réelle n'est lue ici. */
import { useMeta } from './metamorphose';
import { remplacer, useRecherche } from './router';

export type CritereDate = {
  date: string | null;                                   // AAAA-MM-JJ utilisée pour la recherche, ou rien
  source: 'metamorphose' | 'recherche' | 'aucune';
  texteMeta: string;                                     // la phrase de la Métamorphose, telle quelle
  metaLisible: boolean;                                  // la phrase contient-elle une date reconnue ?
  suffixe: string;                                       // à ajouter aux liens du Réseau pour garder le choix
};
import { critereDepuis, ISO } from './critere-date-outils.mjs';
export { critereDepuis };
export function useCritereDate(): CritereDate & { changer: (iso: string) => void; sansDate: () => void; reprendre: () => void } {
  const [meta] = useMeta();
  const param = new URLSearchParams(useRecherche()).get('date');
  const c = critereDepuis(param, meta.date);
  const poser = (v: string | null) => { const u = new URL(location.href); if (v) u.searchParams.set('date', v); else u.searchParams.delete('date'); remplacer(u.pathname + u.search + u.hash); };
  return { ...c, changer: iso => { if (ISO.test(iso)) poser(iso); }, sansDate: () => poser('aucune'), reprendre: () => poser(null) };
}
