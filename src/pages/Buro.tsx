import { useEffect, useState } from 'react';
import { Tete, BoutonBuro, Pied, Orbe } from '../charte/Charte';
import { Lien } from '../lib/router';
import { useSession } from '../lib/session';
import { lireBuro, ecrireBuro, type Projet } from '../lib/buro';
import MonProfil from './MonProfil';
import data from '../lib/briques.json';
import { clesPossibles, creerCle, nombreDeCles } from '../lib/cles';

const VIS: Record<string, string> = { prive: 'Privé', restreint: 'Restreint', lien: 'Par lien', public: 'Public' };
const ORDRE = ['prive', 'restreint', 'lien', 'public'];
type Lieu = 'projets' | 'partages' | 'archives' | 'profil';

/* Votre espace AIME. En bas, les lieux (Projets, Partagés avec moi, Archives, Profil) ; en haut, ce qu'on fait au projet choisi. */
export default function Buro() {
  const session = useSession();
  const [projets, setProjets] = useState<Projet[] | null>(null);
  const [raison, setRaison] = useState('');
  const [lieu, setLieu] = useState<Lieu>(() => new URLSearchParams(window.location.search).get('lieu') === 'profil' ? 'profil' : 'projets');
  const [choisi, setChoisi] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [proposerCle, setProposerCle] = useState(false);
  useEffect(() => {
    if (!session || !clesPossibles()) return;
    let refus = false; try { refus = localStorage.getItem('aime-cle-plus-tard') === '1'; } catch { /* rien */ }
    if (!refus) nombreDeCles().then(n => setProposerCle(n === 0));
  }, [session]);
  const charger = () => lireBuro().then(r => { if (r.ok) setProjets(r.projets || []); else { setProjets([]); setRaison(r.raison || ''); } });
  useEffect(() => { if (session) charger(); }, [session]);
  const dans = (p: Projet, l: Lieu) => l === 'archives' ? p.archive : l === 'partages' ? (p.role !== 'owner' && !p.archive) : (p.role === 'owner' && !p.archive);
  const liste = (projets || []).filter(p => dans(p, lieu));
  const sel = (projets || []).find(p => p.id === choisi) || null;
  const maj = async (patch: object, texte: string) => { if (!sel) return; const r = await ecrireBuro({ action: 'maj', id: sel.id, ...patch }); setMsg(r.ok ? texte : (r.raison || 'Modification impossible.')); if (r.ok) charger(); };
  const B = data.briques as Record<string, { name: string }>;
  const verbes = sel && sel.role === 'owner'
    ? <>
      <button className="outil" type="button" onClick={() => maj({ visibilite: ORDRE[(ORDRE.indexOf(sel.visibilite) + 1) % 4] }, '« ' + sel.titre + ' » : ' + VIS[ORDRE[(ORDRE.indexOf(sel.visibilite) + 1) % 4]] + '.')}>Partager · {VIS[sel.visibilite] || 'Privé'}</button>
      <button className="outil" type="button" onClick={() => { maj({ archive: !sel.archive }, sel.archive ? '« ' + sel.titre + ' » restauré.' : '« ' + sel.titre + ' » rangé aux archives.'); setChoisi(null); }}>{sel.archive ? 'Restaurer' : 'Archiver'}</button>
    </>
    : <>{['Rejoindre', 'Échanger', 'Modèles'].map(v => <span key={v} className="outil" aria-disabled="true" style={{ color: '#55555A' }}>{v}<span className="bientot">Bientôt</span></span>)}</>;
  return (
    <>
      <a className="lien-evitement" href="#contenu">Aller au contenu</a>
      <Tete courant="/buro" verbes={verbes} />
      <main id="contenu" style={{ padding: 'clamp(48px, 7vw, 96px) var(--marge) 170px' }}>
        <h1 className="titre" style={{ fontSize: 'clamp(44px, 7vw, 108px)', lineHeight: .92 }}>Votre espace AIME</h1>
        {session === null && <p className="chapeau">Entrez dans AIME pour retrouver vos projets, sur tous vos appareils. <Lien href="/entrer">+ Entrer</Lien></p>}
        {session === undefined && <p className="chapeau">Ouverture de votre espace…</p>}
        {session && proposerCle && <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', padding: '16px 18px', borderRadius: 16, background: '#fff', border: '1px solid #E2E2DE' }}>
          <p style={{ margin: 0, fontSize: 17, lineHeight: 1.5, maxWidth: '52ch' }}><b style={{ fontWeight: 600 }}>Se souvenir de cet appareil.</b> La prochaine fois, votre visage ou votre empreinte suffiront pour entrer.</p>
          <span style={{ display: 'flex', gap: 8 }}>
            <button className="bouton noir" type="button" style={{ height: 46 }} onClick={async () => { const r = await creerCle(); setMsg(r.ok ? 'Clé d’accès enregistrée sur cet appareil.' : (r.raison || '')); if (r.ok) setProposerCle(false); }}>Créer ma clé d’accès</button>
            <button className="bouton" type="button" style={{ height: 46 }} onClick={() => { try { localStorage.setItem('aime-cle-plus-tard', '1'); } catch { /* rien */ } setProposerCle(false); }}>Plus tard</button>
          </span>
        </div>}
        {session && lieu === 'profil' && <MonProfil />}
        {session && lieu !== 'profil' && <>
          <p role="status" aria-live="polite" style={{ margin: '20px 0 0', minHeight: 24, fontSize: 16, fontWeight: 600 }}>{msg || raison}</p>
          <ul style={{ listStyle: 'none', margin: '20px 0 0', padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: 20 }}>
            {lieu === 'projets' && <li><Lien href="/point-zero" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 240, height: '100%', padding: 22, borderRadius: 22, border: '2px dashed #BDBDB8', textDecoration: 'none' }}>
              <Orbe taille={56} /><span><span style={{ display: 'block', fontSize: 24, fontWeight: 600 }}>Point Zéro</span><span style={{ display: 'block', marginTop: 6, fontSize: 16, color: '#3A3A3F' }}>Commencer quelque chose : importer, décrire, annoncer.</span></span>
            </Lien></li>}
            {projets === null ? <li style={{ fontSize: 18 }}>Chargement…</li> : liste.map(p => {
              const on = p.id === choisi;
              return <li key={p.id}><button type="button" aria-pressed={on} onClick={() => setChoisi(on ? null : p.id)} style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', height: '100%', minHeight: 240, padding: 20, borderRadius: 22, border: on ? '2px solid #0B0B0C' : '1px solid #E2E2DE', background: '#fff', textAlign: 'left' }}>
                <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: '#55555A' }}>{p.studio || p.genre}</span>
                <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.015em' }}>{p.titre}</span>
                <span style={{ fontSize: 15, color: '#3A3A3F' }}>{p.briques.length ? p.briques.slice(0, 5).map(b => B[b]?.name || b).join(' · ') + (p.briques.length > 5 ? '…' : '') : ''}</span>
                <span style={{ marginTop: 'auto', fontSize: 15, color: '#3A3A3F' }}>{VIS[p.visibilite] || 'Privé'} · {p.briques.length} briques</span>
              </button></li>;
            })}
          </ul>
          {projets && !liste.length && lieu !== 'projets' && <p style={{ fontSize: 18, color: '#3A3A3F' }}>{lieu === 'archives' ? 'Rien aux archives.' : 'Personne ne vous a encore partagé de projet.'}</p>}
        </>}
      </main>
      {session && <nav className="dock-bas" aria-label="Lieux de votre espace"><div>
        {([['projets', 'Projets'], ['partages', 'Partagés avec moi'], ['archives', 'Archives'], ['profil', 'Profil']] as [Lieu, string][]).map(([k, l]) =>
          <button key={k} type="button" className="lieu" aria-current={lieu === k ? 'true' : 'false'} onClick={() => { setLieu(k); setChoisi(null); setMsg(''); }}>{l}{k !== 'profil' && <span style={{ marginLeft: 8, fontSize: 13, opacity: .8 }}>{(projets || []).filter(p => dans(p, k)).length}</span>}</button>)}
      </div></nav>}
      <Pied />
      <BoutonBuro courant />
    </>
  );
}
