import { useEffect, useMemo, useRef, useState } from 'react';
import { Lien } from '../lib/router';
import data from '../lib/briques.json';
import { FICHES, domaine } from '../lib/reseau-exemples';

/* La loupe : chercher dans tout AIME sans quitter la page. Sans rien taper, c'est le plan du site. */
type Entree = { label: string; meta: string; href: string; groupe: string };
const B = data.briques as unknown as Record<string, { name: string; fam: string; does: string }>;
const PLAN: Entree[] = [
  ...[['Accueil', 'Le Monde AIME, le site officiel de l’union', '/'], ['Les unions', 'Les pages des mariés', '/#unions'], ['Prestataires', 'Les métiers de l’union', '/reseau?domaine=mariage'], ['Invités', 'Chaque invité a sa page', '/#invites'], ['Collections', 'Les unions par univers', '/#collections']]
    .map(([label, meta, href]) => ({ label, meta, href, groupe: 'Le Monde AIME' })),
  ...[['Studio', 'Créer : broderie d’abord', '/studio/atelier'], ['Boutique', 'Créations à acheter, louer, broder', '/boutique'], ['Les moments', 'Le programme de l’union, de l’idée au premier anniversaire', '/moments'], ['Musique', 'La journée en musique, moment par moment', '/musique'], ['Atelier de broderie', 'Dessiner, broder, importer', '/studio/atelier'], ['Point Zéro', 'Commencer quelque chose', '/point-zero']]
    .map(([label, meta, href]) => ({ label, meta, href, groupe: 'Créer' })),
  ...[['Votre espace', 'Projets, ouvrages, partagés, archives', '/buro'], ['Mon profil', 'Ce que le Réseau montre de moi', '/buro?lieu=profil'], ['Entrer', 'Google, clé d’accès ou lien e-mail', '/entrer'], ['A+', 'Aller plus loin', '/a-plus'], ['À propos d’AIME', 'La marque, l’association, le fondateur', '/a-propos']]
    .map(([label, meta, href]) => ({ label, meta, href, groupe: 'Votre espace' })),
];
const RESEAU: Entree[] = FICHES.map(f => ({ label: f.nom, meta: domaine(f.domaine)!.label + ' · ' + f.famille, href: '/reseau/' + f.slug, groupe: 'Réseau' }));
const BRIQUES: Entree[] = Object.values(B).map(b => ({ label: b.name, meta: b.fam + ' · ' + b.does, href: '/point-zero?q=' + encodeURIComponent(b.name), groupe: 'Briques' }));
const sans = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const GROUPES = ['Le Monde AIME', 'Créer', 'Votre espace', 'Réseau', 'Briques'];
export function Recherche({ fermer, groupe }: { fermer: () => void; groupe?: string | null }) {
  const [q, setQ] = useState('');
  const champ = useRef<HTMLInputElement>(null);
  useEffect(() => { champ.current?.focus(); }, []);
  const res = useMemo(() => {
    const t = sans(q.trim());
    const tout = [...PLAN, ...RESEAU, ...BRIQUES].filter(e => !groupe || e.groupe === groupe);
    if (!t) return groupe ? tout.slice(0, 30) : PLAN;
    return tout.filter(e => sans(e.label + ' ' + e.meta).includes(t)).slice(0, 30);
  }, [q, groupe]);
  const groupes = [...new Set(res.map(r => r.groupe))];
  return (
    <div className="recherche-bloc" role="search" aria-label="Chercher dans tout AIME" onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); fermer(); } }}>
      <label htmlFor="champ-recherche" className="sr-only">Chercher dans tout AIME</label>
      <div style={{ display: 'flex', gap: 8 }}>
        <input id="champ-recherche" ref={champ} className="champ" type="search" autoComplete="off" placeholder="Chercher : une page, une personne, une brique…" value={q} onChange={e => setQ(e.target.value)} />
        {q && <button type="button" className="bouton" style={{ height: 52 }} onClick={() => { setQ(''); champ.current?.focus(); }}>Effacer</button>}
      </div>
      <p role="status" aria-live="polite" style={{ margin: '12px 2px 6px', fontSize: 14, color: '#55555A' }}>{q.trim() ? (res.length ? res.length + ' résultat' + (res.length > 1 ? 's' : '') : 'Rien trouvé. Essayez « mariage », « devis » ou « broderie ».') : 'Le plan du site · Échap pour fermer'}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '8px 20px', maxHeight: 'min(60vh, 520px)', overflowY: 'auto' }}>
        {groupes.map(g => <section key={g} aria-label={g}>
          <h2 style={{ margin: '10px 0 6px', fontSize: 12, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase', color: '#55555A' }}>{g}</h2>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {res.filter(r => r.groupe === g).map(r => <li key={r.href + r.label}><Lien href={r.href} onClick={fermer} target={r.href.startsWith('http') ? '_blank' : undefined} rel={r.href.startsWith('http') ? 'noopener' : undefined} className="recherche-lien">
              <b style={{ fontWeight: 600 }}>{r.label}</b><span>{r.meta}</span></Lien></li>)}
          </ul>
        </section>)}
      </div>
    </div>
  );
}
