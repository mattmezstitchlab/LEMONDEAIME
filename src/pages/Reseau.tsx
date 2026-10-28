import { useEffect, useState } from 'react';
import { Tete, Verbe, BoutonBuro, Pied } from '../charte/Charte';
import { Lien } from '../lib/router';
import { useSession } from '../lib/session';
import { initiales, lireReseau, type Profil } from '../lib/reseau';

/* Le Réseau : les personnes et les studios du Monde AIME. Chacun choisit d'y apparaître, depuis son espace. */
export function CarteProfil({ p }: { p: Profil }) {
  return (
    <article style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%', padding: 22, borderRadius: 22, background: '#fff', border: '1px solid #E2E2DE' }}>
      <span aria-hidden="true" style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--nacre)', boxShadow: 'inset 0 0 0 1px rgba(11,11,12,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700 }}>{initiales(p.nom)}</span>
      <p style={{ margin: '6px 0 0', fontSize: 13, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: '#55555A' }}>{p.metier}{p.ville ? ' · ' + p.ville : ''}</p>
      <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.015em' }}>{p.nom}</h2>
      {p.bio && <p style={{ margin: 0, fontSize: 16, lineHeight: 1.55, color: '#3A3A3F', whiteSpace: 'pre-line' }}>{p.bio}</p>}
      {p.site && <a href={p.site} target="_blank" rel="noopener nofollow ugc" style={{ marginTop: 'auto', fontSize: 16, fontWeight: 600, overflowWrap: 'anywhere' }}>{p.site.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}<span className="sr-only"> (nouvel onglet)</span></a>}
    </article>
  );
}
export default function Reseau() {
  const session = useSession();
  const [profils, setProfils] = useState<Profil[] | null>(null);
  const [metiers, setMetiers] = useState<string[]>([]);
  const [filtre, setFiltre] = useState<string | null>(null);
  const [raison, setRaison] = useState('');
  useEffect(() => { lireReseau().then(r => { setProfils(r.profils || []); setMetiers(r.metiers || []); if (!r.ok) setRaison(r.raison || ''); }); }, []);
  const liste = (profils || []).filter(p => !filtre || p.metier === filtre);
  return (
    <>
      <a className="lien-evitement" href="#contenu">Aller au contenu</a>
      <Tete courant="/reseau" verbes={<><Verbe href="/monde">Découvrir</Verbe><Verbe href="/reseau" actif>Réseau</Verbe></>} />
      <main id="contenu" style={{ padding: 'clamp(48px, 7vw, 96px) var(--marge) 140px' }}>
        <p className="surtitre">Le Monde AIME</p>
        <h1 className="titre" style={{ fontSize: 'clamp(48px, 8vw, 128px)', lineHeight: .9 }}>Réseau</h1>
        <p className="chapeau">Les personnes et les studios qui font Le Monde AIME : prestataires de l’union, brodeuses et brodeurs, créatrices et créateurs. Chacun choisit d’y apparaître, ou non.</p>
        <div style={{ marginTop: 28, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {session
            ? <Lien className="bouton noir" href="/buro?lieu=profil">Mon profil</Lien>
            : <Lien className="bouton noir" href="/entrer">+ Entrer pour rejoindre le Réseau</Lien>}
          <Lien className="bouton" href="/monde">Voir les studios</Lien>
        </div>
        {metiers.length > 0 && <div role="group" aria-label="Filtrer par métier" style={{ marginTop: 48, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[null, ...metiers].map(m => {
            const n = (profils || []).filter(p => !m || p.metier === m).length;
            return <button key={m || 'tous'} type="button" aria-pressed={filtre === m} onClick={() => setFiltre(m)} style={{ height: 44, padding: '0 16px', borderRadius: 999, border: '1px solid #0B0B0C', background: filtre === m ? '#0B0B0C' : '#fff', color: filtre === m ? '#fff' : '#0B0B0C', fontSize: 15, fontWeight: 600 }}>{m || 'Tout le monde'} <span style={{ opacity: .7, fontWeight: 500 }}>{n}</span></button>;
          })}
        </div>}
        <p role="status" aria-live="polite" className="sr-only">{profils ? liste.length + ' profil' + (liste.length > 1 ? 's' : '') : ''}</p>
        {profils === null
          ? <p style={{ marginTop: 40, fontSize: 18 }}>Chargement…</p>
          : liste.length
            ? <ul style={{ listStyle: 'none', margin: '32px 0 0', padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: 20 }}>{liste.map((p, i) => <li key={i}><CarteProfil p={p} /></li>)}</ul>
            : <div style={{ marginTop: 40, padding: 'clamp(28px, 4vw, 48px)', borderRadius: 24, border: '2px dashed #BDBDB8', maxWidth: 760 }}>
              <h2 style={{ margin: 0, fontSize: 28, fontWeight: 600 }}>{raison ? 'Le Réseau se repose.' : filtre ? 'Personne ici pour l’instant.' : 'Le Réseau s’ouvre.'}</h2>
              <p className="texte" style={{ marginTop: 12 }}>{raison || 'Soyez parmi les premiers : créez votre profil depuis votre espace, puis choisissez de le rendre visible.'}</p>
            </div>}
      </main>
      <Pied />
      <BoutonBuro />
    </>
  );
}
