/* La musique : les morceaux de chacun, rangés par moments du Jour J. Extraits de 30 s par Deezer, liens pour les autres plateformes. */
export type Moment = 'preparatifs' | 'ceremonie' | 'sortie' | 'cocktail' | 'entree' | 'repas' | 'gateau' | 'ouverture' | 'soiree' | 'fin';
export const MOMENTS: [Moment, string, string][] = [
  ['preparatifs', 'Les préparatifs', 'Le matin, entre la coiffure et les derniers boutons.'],
  ['ceremonie', 'La cérémonie', 'L’entrée, les échanges, la sortie des alliances.'],
  ['sortie', 'La sortie', 'Les pétales, les applaudissements, la première photo.'],
  ['cocktail', 'Le cocktail', 'Les retrouvailles, un verre à la main.'],
  ['entree', 'L’entrée des mariés', 'Le moment où toute la salle se lève.'],
  ['repas', 'Le repas', 'En fond, pour se parler.'],
  ['gateau', 'Le gâteau', 'Les bougies, les étincelles, la pièce montée.'],
  ['ouverture', 'L’ouverture du bal', 'La première danse.'],
  ['soiree', 'La soirée', 'La piste, jusqu’au bout de la nuit.'],
  ['fin', 'La fin de soirée', 'Les derniers, bras dessus bras dessous.'],
];
export type Musique = { id?: string; source: 'deezer' | 'lien'; deezer: number | null; titre: string; artiste: string; pochette: string; lien: string; moment?: Moment; duree?: number };
type Rep = { ok: boolean; raison?: string; resultats?: Musique[]; musiques?: Musique[]; musique?: Musique; extrait?: string };
async function appel(url: string, init?: RequestInit): Promise<Rep> {
  try { const r = await fetch(url, { credentials: 'same-origin', ...init }); const j = await r.json().catch(() => ({})); return j.ok === undefined ? { ok: false } : j; }
  catch { return { ok: false, raison: 'Connexion impossible : vérifiez votre réseau.' }; }
}
const poster = (corps: unknown) => appel('/api/musique', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) });
export const chercherMorceau = (q: string) => appel('/api/musique?q=' + encodeURIComponent(q));
export const extrait = (id: number) => appel('/api/musique?extrait=' + id);
export const mesMusiques = () => appel('/api/musique?moi=1');
export const musiquesDe = (ref: string) => appel('/api/musique?ref=' + ref);
export const ajouterMusique = (m: { deezer?: number; lien?: string; titre?: string; artiste?: string; moment: Moment }) => poster({ action: 'ajouter', ...m });
export const retirerMusique = (id: string) => poster({ action: 'retirer', id });
export const changerMoment = (id: string, moment: Moment) => poster({ action: 'moment', id, moment });
export const nomMoment = (m?: string) => MOMENTS.find(x => x[0] === m)?.[1] || 'La soirée';
