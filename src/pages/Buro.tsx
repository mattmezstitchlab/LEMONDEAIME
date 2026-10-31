import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Tete, DockBas, Pied, Orbe } from '../charte/Charte';
import { EntrerBloc } from '../charte/EntrerBloc';
import { Lien, useRecherche } from '../lib/router';
import { useSession } from '../lib/session';
import { lireBuro, ecrireBuro, type Projet } from '../lib/buro';
import MonProfil from './MonProfil';
import data from '../lib/briques.json';
import { clesPossibles, creerCle, nombreDeCles } from '../lib/cles';

const VIS: Record<string, string> = { prive: 'Privé', restreint: 'Restreint', lien: 'Par lien', public: 'Public' };
const ORDRE = ['prive', 'restreint', 'lien', 'public'];
type Lieu = 'projets' | 'partages' | 'archives' | 'profil';


/* Nouveau projet : un titre, une description ; l'enregistrement est celui de /api/buro (la table spaces), rien de local. */
function NouveauProjet({ fini, annuler }: { fini: (id: string, titre: string) => void; annuler: () => void }) {
  const [etat, setEtat] = useState<{ envoi?: boolean; raison?: string }>({});
  /* une clé par formulaire ouvert, et une garde : un double clic ou une nouvelle tentative ne crée jamais deux projets */
  const cle = useRef(typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
  const enCours = useRef(false);
  const envoyer = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget), titre = String(f.get('titre') || '').trim();
    if (!titre) { setEtat({ raison: 'Donnez un nom au projet.' }); return; }
    if (enCours.current) return;
    enCours.current = true; setEtat({ envoi: true });
    const r = await ecrireBuro({ titre, description: String(f.get('description') || ''), cle: cle.current });
    if (r.ok && r.id) fini(r.id, titre); else { enCours.current = false; setEtat({ raison: r.raison || 'Enregistrement impossible : réessayez.' }); }
  };
  return (
    <form onSubmit={envoyer} aria-label="Nouveau projet" style={{ marginTop: 20, display: 'grid', gap: 12, maxWidth: 640, padding: 20, borderRadius: 20, background: '#fff', border: '1px solid #E2E2DE' }}>
      <label htmlFor="np-titre" style={{ fontWeight: 600 }}>Titre du projet</label>
      <input id="np-titre" name="titre" className="champ" maxLength={120} required autoFocus autoComplete="off" />
      <label htmlFor="np-desc" style={{ fontWeight: 600 }}>Description</label>
      <textarea id="np-desc" name="description" className="champ" rows={4} maxLength={2000} style={{ height: 'auto', padding: 14, resize: 'vertical' }} />
      <p role="status" aria-live="polite" style={{ margin: 0, minHeight: 22, fontWeight: 600 }}>{etat.raison}</p>
      <span style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className="bouton noir" type="submit" disabled={!!etat.envoi}>{etat.envoi ? 'Enregistrement…' : 'Enregistrer le projet'}</button>
        <button className="bouton" type="button" onClick={annuler}>Annuler</button>
      </span>
    </form>
  );
}

/* La fiche d'un projet : le propriétaire modifie le titre et la description ; un projet partagé se lit seulement.
   La révision vue (rev) accompagne l'enregistrement : si le projet a changé ailleurs, le serveur refuse (409) et rien n'est écrasé. */
function Fiche({ p, apres, fermer }: { p: Projet; apres: (m: string) => void; fermer: () => void }) {
  const proprio = p.role === 'owner';
  const [etat, setEtat] = useState<{ envoi?: boolean; raison?: string; conflit?: boolean }>({});
  const enregistrer = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget), titre = String(f.get('titre') || '').trim();
    if (!titre) { setEtat({ raison: 'Donnez un nom au projet.' }); return; }
    if (etat.envoi) return;
    setEtat({ envoi: true });
    const r = await ecrireBuro({ action: 'maj', id: p.id, titre, description: String(f.get('description') || ''), rev: p.rev || 0 });
    if (r.ok) apres('« ' + titre + ' » enregistré.'); else setEtat({ raison: r.raison || 'Enregistrement impossible : réessayez.', conflit: !!r.conflit });
  };
  return (
    <section aria-label={'Projet ' + p.titre} style={{ marginTop: 20, padding: 20, borderRadius: 20, background: '#fff', border: '2px solid #0B0B0C', maxWidth: 720 }}>
      <p className="surtitre" style={{ margin: '0 0 12px' }}>{proprio ? 'Votre projet' : 'Projet partagé avec vous'} · {p.studio || p.genre}</p>
      {proprio
        ? <form onSubmit={enregistrer} style={{ display: 'grid', gap: 12 }}>
          <label htmlFor="fp-titre" style={{ fontWeight: 600 }}>Titre</label>
          <input id="fp-titre" name="titre" className="champ" maxLength={120} required defaultValue={p.titre} autoComplete="off" />
          <label htmlFor="fp-desc" style={{ fontWeight: 600 }}>Description</label>
          <textarea id="fp-desc" name="description" className="champ" rows={5} maxLength={2000} defaultValue={p.description || ''} style={{ height: 'auto', padding: 14, resize: 'vertical' }} />
          <p role="status" aria-live="polite" style={{ margin: 0, minHeight: 22, fontWeight: 600 }}>{etat.raison}</p>
          <span style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="bouton noir" type="submit" disabled={!!etat.envoi}>{etat.envoi ? 'Enregistrement…' : 'Enregistrer'}</button>
            {etat.conflit && <button className="bouton" type="button" onClick={() => apres('Dernière version rechargée.')}>Recharger la dernière version</button>}
            <button className="bouton" type="button" onClick={fermer}>Fermer</button>
          </span>
        </form>
        : <div style={{ display: 'grid', gap: 10 }}>
          <h2 className="titre" style={{ fontSize: 32 }}>{p.titre}</h2>
          <p style={{ margin: 0, fontSize: 17, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{p.description || 'Pas de description.'}</p>
          <span><button className="bouton" type="button" onClick={fermer}>Fermer</button></span>
        </div>}
    </section>
  );
}

/* Votre espace AIME. En bas, les lieux (Projets, Partagés avec moi, Archives, Profil) ; en haut, ce qu'on fait au projet choisi. */
export default function Buro() {
  const session = useSession();
  const [projets, setProjets] = useState<Projet[] | null>(null);
  const [raison, setRaison] = useState('');
  const [lieu, setLieu] = useState<Lieu>(() => { const l = new URLSearchParams(window.location.search).get('lieu'); return l === 'profil' || l === 'partages' || l === 'archives' ? l : 'projets'; });
  const recherche = useRecherche();
  useEffect(() => { const l = new URLSearchParams(recherche).get('lieu'); setLieu(l === 'profil' || l === 'partages' || l === 'archives' ? l : 'projets'); }, [recherche]);
  const [choisi, setChoisi] = useState<string | null>(null);
  const [nouveau, setNouveau] = useState(false);
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
  const [occupe, setOccupe] = useState(false);
  /* Partager et Archiver envoient la révision vue : si le projet a changé ailleurs, le serveur refuse (409) et on recharge la dernière version */
  const maj = async (patch: object, texte: string) => {
    if (!sel || occupe) return;
    setOccupe(true);
    const r = await ecrireBuro({ action: 'maj', id: sel.id, rev: sel.rev || 0, ...patch });
    setMsg(r.ok ? texte : (r.raison || 'Modification impossible.'));
    await charger(); setOccupe(false);
  };
  const B = data.briques as Record<string, { name: string }>;
  const verbes = sel && sel.role === 'owner'
    ? <>
      {sel.ouvrage && <a className="outil" href={'/studio/atelier?ouvrage=' + encodeURIComponent(sel.ouvrage)} style={{ fontWeight: 600 }}>Ouvrir dans le Studio</a>}
      <button className="outil" type="button" disabled={occupe} onClick={() => maj({ visibilite: ORDRE[(ORDRE.indexOf(sel.visibilite) + 1) % 4] }, '« ' + sel.titre + ' » : ' + VIS[ORDRE[(ORDRE.indexOf(sel.visibilite) + 1) % 4]] + '.')}>Partager · {VIS[sel.visibilite] || 'Privé'}</button>
      <button className="outil" type="button" disabled={occupe} onClick={() => { maj({ archive: !sel.archive }, sel.archive ? '« ' + sel.titre + ' » restauré.' : '« ' + sel.titre + ' » rangé aux archives.'); setChoisi(null); }}>{sel.archive ? 'Restaurer' : 'Archiver'}</button>
    </>
    : <>{['Rejoindre', 'Échanger', 'Modèles'].map(v => <span key={v} className="outil" aria-disabled="true" style={{ color: '#55555A' }}>{v}<span className="bientot">Bientôt</span></span>)}</>;
  return (
    <>
      <a className="lien-evitement" href="#contenu">Aller au contenu</a>
      <Tete courant="/buro" verbes={verbes} />
      <main id="contenu" style={{ padding: 'clamp(48px, 7vw, 96px) var(--marge) 170px' }}>
        <h1 className="titre" style={{ fontSize: 'clamp(44px, 7vw, 108px)', lineHeight: .92 }}>Votre espace AIME</h1>
        {session === null && <>
          <p className="chapeau">Entrez dans AIME pour retrouver vos projets, sur tous vos appareils. Vous reviendrez ici, sur vos projets.</p>
          <div style={{ marginTop: 28, maxWidth: 520 }}><EntrerBloc retour="/buro" /></div>
        </>}
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
          {lieu === 'projets' && !nouveau && <p style={{ margin: '20px 0 0' }}><button type="button" className="bouton noir" onClick={() => { setNouveau(true); setChoisi(null); setMsg(''); }}>Nouveau projet</button></p>}
          {lieu === 'projets' && nouveau && <NouveauProjet annuler={() => setNouveau(false)} fini={(id, t) => { setNouveau(false); setMsg('« ' + t + ' » enregistré dans votre espace.'); charger().then(() => setChoisi(id)); }} />}
          {sel && <Fiche key={sel.id + ':' + (sel.rev || 0)} p={sel} fermer={() => setChoisi(null)} apres={m => { setMsg(m); charger(); }} />}
          <ul style={{ listStyle: 'none', margin: '20px 0 0', padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: 20 }}>
            {lieu === 'projets' && <li><Lien href="/point-zero" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 240, height: '100%', padding: 22, borderRadius: 22, border: '2px dashed #BDBDB8', textDecoration: 'none' }}>
              <Orbe taille={56} /><span><span style={{ display: 'block', fontSize: 24, fontWeight: 600 }}>Point Zéro</span><span style={{ display: 'block', marginTop: 6, fontSize: 16, color: '#3A3A3F' }}>Commencer quelque chose : importer, décrire, annoncer.</span></span>
            </Lien></li>}
            {projets === null ? <li style={{ fontSize: 18 }}>Chargement…</li> : liste.map(p => {
              const on = p.id === choisi;
              return <li key={p.id}><button type="button" aria-pressed={on} onClick={() => setChoisi(on ? null : p.id)} style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', height: '100%', minHeight: 240, padding: 20, borderRadius: 22, border: on ? '2px solid #0B0B0C' : '1px solid #E2E2DE', background: '#fff', textAlign: 'left' }}>
                <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: '#55555A' }}>{p.studio || p.genre}</span>
                <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.015em' }}>{p.titre}</span>
                <span style={{ fontSize: 15, color: '#3A3A3F' }}>{p.briques.length ? p.briques.slice(0, 5).map(b => B[b]?.name || b).join(' · ') + (p.briques.length > 5 ? '…' : '') : (p.description || '').slice(0, 90) + ((p.description || '').length > 90 ? '…' : '')}</span>
                <span style={{ marginTop: 'auto', fontSize: 15, color: '#3A3A3F' }}>{VIS[p.visibilite] || 'Privé'}{p.briques.length > 0 && ' · ' + p.briques.length + ' briques'}</span>
              </button></li>;
            })}
          </ul>
          {projets && !liste.length && lieu !== 'projets' && <p style={{ fontSize: 18, color: '#3A3A3F' }}>{lieu === 'archives' ? 'Rien aux archives.' : 'Personne ne vous a encore partagé de projet.'}</p>}
        </>}
      </main>
      <DockBas label="Lieux de votre espace">{session ? <>
        {([['projets', 'Projets'], ['partages', 'Partagés avec moi'], ['archives', 'Archives'], ['profil', 'Profil']] as [Lieu, string][]).map(([k, l]) =>
          <button key={k} type="button" className="lieu" aria-current={lieu === k ? 'true' : 'false'} onClick={() => { setLieu(k); setChoisi(null); setMsg(''); }}>{l}{k !== 'profil' && <span style={{ marginLeft: 8, fontSize: 13, opacity: .8 }}>{(projets || []).filter(p => dans(p, k)).length}</span>}</button>)}
      </> : undefined}</DockBas>
      <Pied />
    </>
  );
}
