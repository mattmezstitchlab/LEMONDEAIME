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
export type Musique = { id?: string; source: 'deezer' | 'lien' | 'fichier'; deezer: number | null; titre: string; artiste: string; pochette: string; lien: string; moment?: Moment; duree?: number };
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
export const ajouterMusique = (m: { deezer?: number; lien?: string; fichier?: string; droits?: boolean; titre?: string; artiste?: string; moment: Moment }) => poster({ action: 'ajouter', ...m });
export const retirerMusique = (id: string) => poster({ action: 'retirer', id });
export const changerMoment = (id: string, moment: Moment) => poster({ action: 'moment', id, moment });
export const nomMoment = (m?: string) => MOMENTS.find(x => x[0] === m)?.[1] || 'La soirée';
export const jouable = (m: Musique) => !!m.deezer || m.source === 'fichier';
/* envoyer un fichier audio à soi (sa propre création) : directement du navigateur au stockage, puis l'ajouter */
export async function envoyerFichier(f: File, userId: string, infos: { titre: string; artiste: string; moment: Moment }, progres?: (p: number) => void): Promise<{ ok: boolean; raison?: string; musique?: Musique }> {
  if (f.size > 20 * 1024 * 1024) return { ok: false, raison: 'Ce fichier dépasse 20 Mo.' };
  if (!/^audio\//.test(f.type) && !/\.(mp3|m4a|wav|ogg|aac)$/i.test(f.name)) return { ok: false, raison: 'Choisissez un fichier audio : MP3, M4A, WAV ou OGG.' };
  try {
    const { upload } = await import('@vercel/blob/client');
    const nom = f.name.normalize('NFD').replace(/[^\w.-]+/g, '-').slice(-80) || 'morceau.mp3';
    const b = await upload('musique/' + userId + '/' + nom, f, { access: 'public', handleUploadUrl: '/api/musique?envoi=1', clientPayload: JSON.stringify({ droits: true }), onUploadProgress: e => progres?.(e.percentage) });
    const r = await ajouterMusique({ fichier: b.url, droits: true, titre: infos.titre, artiste: infos.artiste, moment: infos.moment });
    return r.ok && r.musique ? { ok: true, musique: r.musique } : { ok: false, raison: r.raison || 'Le fichier est envoyé mais n’a pas pu être ajouté.' };
  } catch (e) { return { ok: false, raison: e instanceof Error && /droits|Cochez/.test(e.message) ? 'Cochez « c’est ma création, j’en ai les droits ».' : 'L’envoi n’a pas abouti : un fichier audio de 20 Mo au plus, puis réessayez.' }; }
}
