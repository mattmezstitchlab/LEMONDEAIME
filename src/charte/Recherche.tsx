import { useEffect, useMemo, useRef, useState } from 'react';
import { Lien } from '../lib/router';
/* Recherche limitée aux accès broderie ; les autres modules ne sont pas supprimés. */
type Entree = { label: string; meta: string; href: string; groupe: string };
const PLAN: Entree[] = [
  { label: 'Accueil', meta: 'Broderie et démonstrations', href: '/', groupe: 'Broderie' },
  { label: 'Découvrir la broderie', meta: 'Le Studio Point Zéro', href: '/studio/', groupe: 'Broderie' },
  { label: 'Atelier de broderie', meta: 'Importer, créer, broder', href: '/studio/atelier', groupe: 'Broderie' },
  { label: 'La Fleur du Ciel', meta: 'Démonstration brodée', href: '/studio/fleur-du-ciel', groupe: 'Broderie' },
  { label: 'UPTOWN', meta: 'Démonstration brodée', href: '/studio/uptown', groupe: 'Broderie' },
  { label: 'Votre espace', meta: 'Ouvrages, projets partagés et archives', href: '/buro', groupe: 'Votre espace' },
  { label: 'Mon profil', meta: 'Votre profil personnel', href: '/buro?lieu=profil', groupe: 'Votre espace' },
  { label: 'Entrer', meta: 'Connexion à votre compte', href: '/entrer', groupe: 'Votre espace' },
];
const sans = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const GROUPES = ['Broderie', 'Votre espace'];
export function Recherche({ fermer, groupe }: { fermer: () => void; groupe?: string | null }) {
  const [q, setQ] = useState('');
  const champ = useRef<HTMLInputElement>(null);
  useEffect(() => { champ.current?.focus(); }, []);
  const res = useMemo(() => {
    const t = sans(q.trim());
    const tout = PLAN.filter(e => !groupe || e.groupe === groupe);
    if (!t) return groupe ? tout.slice(0, 30) : PLAN;
    return tout.filter(e => sans(e.label + ' ' + e.meta).includes(t)).slice(0, 30);
  }, [q, groupe]);
  const groupes = [...new Set(res.map(r => r.groupe))];
  return (
    <div className="recherche-bloc" role="search" aria-label="Chercher dans tout AIME" onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); fermer(); } }}>
      <label htmlFor="champ-recherche" className="sr-only">Chercher dans tout AIME</label>
      <div style={{ display: 'flex', gap: 8 }}>
        <input id="champ-recherche" ref={champ} className="champ" type="search" autoComplete="off" placeholder="Chercher : un atelier, un ouvrage, un film…" value={q} onChange={e => setQ(e.target.value)} />
        {q && <button type="button" className="bouton" style={{ height: 52 }} onClick={() => { setQ(''); champ.current?.focus(); }}>Effacer</button>}
      </div>
      <p role="status" aria-live="polite" style={{ margin: '12px 2px 6px', fontSize: 14, color: '#55555A' }}>{q.trim() ? (res.length ? res.length + ' résultat' + (res.length > 1 ? 's' : '') : 'Rien trouvé. Essayez « atelier », « fils » ou « broderie ».') : 'Le plan du site · Échap pour fermer'}</p>
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
