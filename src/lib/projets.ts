/* Les projets du portfolio LE MONDE AIME, côté site : lecture publique, droit d'administration, enregistrement. */
import { useEffect, useState } from 'react';
import { DEFAUTS, STATUTS } from '../../api/_projets.mjs';
import { upload } from '@vercel/blob/client';

export type Image = { src: string; alt: string };
export type Projet = {
  slug: string; titre: string; accroche: string; description: string; categorie: string; annee: number;
  statut: 'en-ligne' | 'en-cours' | 'bientot'; role: string; lien: string; couverture: string; alt: string;
  galerie: Image[]; ordre: number; publie: boolean; une: boolean; maj?: string;
  /** d'autres liens, à côté de « Visiter le site » (facultatif) */
  liens?: { libelle: string; href: string }[];
};
export const ORIGINE = DEFAUTS as Projet[];
export const ETATS = STATUTS as Record<Projet['statut'], string>;
export const VIDE: Projet = { slug: '', titre: '', accroche: '', description: '', categorie: '', annee: new Date().getFullYear(), statut: 'en-cours', role: '', lien: '', couverture: '', alt: '', galerie: [], ordre: 99, publie: false, une: false };

type Reponse<T> = { ok: boolean; raison?: string; code?: string } & Partial<T>;
async function lireJson<T>(r: Response): Promise<Reponse<T>> { try { return await r.json(); } catch { return { ok: false, raison: 'Réponse illisible.' } as Reponse<T>; } }
const poster = <T,>(corps: object) => fetch('/api/projets', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) })
  .then(r => lireJson<T>(r)).catch(() => ({ ok: false, raison: 'Le site ne répond pas : vérifiez la connexion.' }) as Reponse<T>);

/* les projets publiés ; sans réponse du serveur (site servi sans API, réseau coupé), ceux d'origine */
export function useProjets(): Projet[] | null {
  const [p, setP] = useState<Projet[] | null>(null);
  useEffect(() => {
    let vivant = true;
    fetch('/api/projets').then(r => lireJson<{ projets: Projet[] }>(r)).then(j => { if (vivant) setP(j.ok && Array.isArray(j.projets) ? j.projets as Projet[] : ORIGINE.filter(x => x.publie)); })
      .catch(() => { if (vivant) setP(ORIGINE.filter(x => x.publie)); });
    return () => { vivant = false; };
  }, []);
  return p;
}
export async function lireProjet(slug: string): Promise<Projet | null> {
  const r = await fetch('/api/projets?slug=' + encodeURIComponent(slug), { credentials: 'same-origin' }).catch(() => null);
  const j = r && /json/.test(r.headers.get('content-type') || '') ? await lireJson<{ projet: Projet }>(r) : null;
  if (j) return j.ok && j.projet ? j.projet as Projet : null;   /* le serveur a répondu : publié, ou introuvable */
  return ORIGINE.find(x => x.slug === slug && x.publie) || null;   /* sans serveur : les projets d'origine */
}
/* la personne connectée peut-elle administrer ? (false sans réponse) */
export function useAdmin(): boolean {
  const [a, setA] = useState(false);
  useEffect(() => { let vivant = true; fetch('/api/projets?moi=1', { credentials: 'same-origin' }).then(r => lireJson<{ admin: boolean }>(r)).then(j => { if (vivant) setA(!!j.admin); }).catch(() => {}); return () => { vivant = false; }; }, []);
  return a;
}
export const lireTout = () => fetch('/api/projets?admin=1', { credentials: 'same-origin' }).then(r => lireJson<{ projets: Projet[]; table: boolean }>(r)).catch(() => ({ ok: false, raison: 'Le site ne répond pas.' }) as Reponse<{ projets: Projet[]; table: boolean }>);
export const enregistrer = (projet: Projet, ancien: string | null) => poster<{ slug: string }>({ action: 'enregistrer', projet, ancien });
export const supprimer = (slug: string) => poster<object>({ action: 'supprimer', slug });
export const ordonner = (slugs: string[]) => poster<object>({ action: 'ordre', slugs });
/* une image du projet, envoyée directement du navigateur vers le stockage du site */
export async function envoyerImage(slug: string, f: File, progres?: (p: number) => void): Promise<string> {
  const nom = f.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9._-]+/g, '-').slice(-80) || 'image';
  const b = await upload('projets/' + (slug || 'nouveau') + '/' + nom, f, { access: 'public', handleUploadUrl: '/api/projets?envoi=1', onUploadProgress: e => progres?.(e.percentage) });
  return b.url;
}
/* « Visiter le site » : une page du site, ou une adresse https (ouverte à côté) */
export const externe = (lien: string) => /^https:\/\//.test(lien);
export const categories = (l: Projet[]) => [...new Set(l.map(p => p.categorie).filter(Boolean))];
