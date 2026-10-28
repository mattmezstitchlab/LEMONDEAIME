import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ProgrammeContexte, REFERENCE, programmeDUnion } from '../lib/programme';
import { lireBuro, type Projet } from '../lib/buro';
import { useSession } from '../lib/session';
import { Lien, useRecherche } from '../lib/router';

/* Le programme d'une union enregistrée : /moments?union=<id>. Les pages des moments lisent le programme du contexte ;
   ici, il vient de l'union rangée en base (ses choix, ses prénoms, sa date), tiré de la Grille 200 avec personnaliser().
   Sans ?union, rien ne change : la Grille 200 de référence. Seul un membre de l'union la voit (lecture par /api/buro). */
const UnionCourante = createContext<string | null>(null);

/** Garde l'union dans les liens entre les pages des moments. */
export function useLienProgramme() {
  const id = useContext(UnionCourante);
  return (href: string) => {
    if (!id) return href;
    const [avant, ancre] = href.split('#'), [chemin, q] = avant.split('?'), p = new URLSearchParams(q || '');
    p.set('union', id);
    return chemin + '?' + p.toString() + (ancre !== undefined ? '#' + ancre : '');
  };
}

export function ProgrammeUnion({ children }: { children: ReactNode }) {
  const id = new URLSearchParams(useRecherche()).get('union');
  const session = useSession();
  const [union, setUnion] = useState<Projet | null | undefined>(undefined);
  useEffect(() => {
    if (!id || !session) { setUnion(undefined); return; }
    let vivant = true;
    lireBuro().then(r => { if (vivant) setUnion((r.projets || []).find(p => p.id === id && p.union) || null); });
    return () => { vivant = false; };
  }, [id, session]);
  const P = useMemo(() => union && union.union ? programmeDUnion(REFERENCE, union.union) : null, [union]);
  if (!id) return <>{children}</>;
  if (session === null || union === null) return (
    <main id="contenu" style={{ padding: 'clamp(48px, 7vw, 96px) var(--marge)' }}>
      <h1 className="titre" style={{ fontSize: 'clamp(36px, 5vw, 64px)' }}>Programme introuvable</h1>
      <p className="chapeau">{session === null ? 'Entrez dans AIME pour ouvrir le programme de votre union.' : 'Cette union n’est pas dans votre espace.'}</p>
      <p style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{session === null ? <Lien className="bouton noir" href="/entrer">+ Entrer</Lien> : <Lien className="bouton noir" href="/buro">Mon espace</Lien>}<Lien className="bouton" href="/moments">La Grille 200 de référence</Lien></p>
    </main>
  );
  if (!P) return <main id="contenu" style={{ padding: 'clamp(48px, 7vw, 96px) var(--marge)' }}><p className="chapeau" role="status">Ouverture de votre programme…</p></main>;
  return <UnionCourante.Provider value={id}><ProgrammeContexte.Provider value={P}>{children}</ProgrammeContexte.Provider></UnionCourante.Provider>;
}
