import { useEffect, useState } from 'react';
import { Tete, BoutonBuro, Pied, Visuel, Orbe } from '../charte/Charte';
import { Lien } from '../lib/router';
import { useSession } from '../lib/session';
import { lireBuro, ecrireBuro, type Projet } from '../lib/buro';
import { MEDIAS } from '../lib/medias';
import data from '../lib/briques.json';

const VIS: Record<string, string> = { prive: 'Privé', restreint: 'Restreint', lien: 'Par lien', public: 'Public' };
const ORDRE = ['prive', 'restreint', 'lien', 'public'];
type Lieu = 'projets' | 'partages' | 'archives';

/* Le BurO : votre espace. En bas, les lieux (Projets, Partagés avec moi, Archives) ; en haut, ce qu'on fait au projet choisi. */
export default function Buro() {
  const session = useSession();
  const [projets, setProjets] = useState<Projet[] | null>(null);
  const [raison, setRaison] = useState('');
  const [lieu, setLieu] = useState<Lieu>('projets');
  const [choisi, setChoisi] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
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
        <p className="surtitre">Votre espace AIME</p>
        <h1 className="titre" style={{ fontSize: 'clamp(48px, 8vw, 128px)', lineHeight: .9 }}>BurO</h1>
        <div style={{ marginTop: 32 }}><Visuel m={MEDIAS['buro-hero']} hauteur="clamp(14rem, 28vw, 24rem)" /></div>
        {session === null && <p className="chapeau">Entrez dans AIME pour retrouver vos projets, sur tous vos appareils. <Lien href="/entrer">+ Entrer</Lien></p>}
        {session === undefined && <p className="chapeau">Ouverture du BurO…</p>}
        {session && <>
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
      {session && <nav className="dock-bas" aria-label="Lieux du BurO"><div>
        {([['projets', 'Projets'], ['partages', 'Partagés avec moi'], ['archives', 'Archives']] as [Lieu, string][]).map(([k, l]) =>
          <button key={k} type="button" className="lieu" aria-current={lieu === k ? 'true' : 'false'} onClick={() => { setLieu(k); setChoisi(null); setMsg(''); }}>{l}<span style={{ marginLeft: 8, fontSize: 13, opacity: .8 }}>{(projets || []).filter(p => dans(p, k)).length}</span></button>)}
      </div></nav>}
      <Pied />
      <BoutonBuro courant />
    </>
  );
}
