import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Tete, DockBas, Pied, Orbe } from '../charte/Charte';
import { EntrerBloc } from '../charte/EntrerBloc';
import { Lien, useRecherche } from '../lib/router';
import { useSession } from '../lib/session';
import { lireBuro, ecrireBuro, type Projet, type Mariage } from '../lib/buro';
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


const MOIS_ISO = /^\d{4}-\d{2}-\d{2}$/;
const dateLongue = (d?: string) => d && MOIS_ISO.test(d) ? new Date(d + 'T12:00:00Z').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '';

/* Créer notre mariage : trois étapes (Noms, Date, Lieu), un seul enregistrement. C'est le même point d'entrée /api/buro que « Nouveau projet »
   (genre « mariage » = un espace « evenement » avec sa fiche) ; rien n'est gardé sur l'appareil. Date et lieu peuvent attendre. */
function NouveauMariage({ fini, annuler }: { fini: (id: string, titre: string) => void; annuler: () => void }) {
  const [etape, setEtape] = useState(0);
  const [v, setV] = useState({ a: '', b: '', date: '', nom: '', ville: '' });
  const [etat, setEtat] = useState<{ envoi?: boolean; raison?: string }>({});
  const cle = useRef(typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
  const enCours = useRef(false);
  const maj = (k: keyof typeof v) => (e: { target: { value: string } }) => setV(x => ({ ...x, [k]: e.target.value }));
  const suivant = (e: FormEvent) => {
    e.preventDefault();
    if (etape === 0 && (!v.a.trim() || !v.b.trim())) { setEtat({ raison: 'Indiquez les deux noms (ou prénoms) de l’union.' }); return; }
    setEtat({}); setEtape(etape + 1);
  };
  const enregistrer = async (e: FormEvent) => {
    e.preventDefault();
    if (enCours.current) return;
    enCours.current = true; setEtat({ envoi: true });
    const mariage: Record<string, unknown> = { noms: [v.a, v.b], lieu: { nom: v.nom, ville: v.ville } };
    if (v.date) mariage.date = v.date;
    const r = await ecrireBuro({ genre: 'mariage', mariage, cle: cle.current });
    if (r.ok && r.id) fini(r.id, v.a.trim() + ' & ' + v.b.trim()); else { enCours.current = false; setEtat({ raison: r.raison || 'Enregistrement impossible : réessayez.' }); }
  };
  const noms = ['Noms', 'Date', 'Lieu'];
  return (
    <form onSubmit={etape < 2 ? suivant : enregistrer} aria-label="Créer notre mariage" style={{ marginTop: 20, display: 'grid', gap: 12, maxWidth: 640, padding: 20, borderRadius: 20, background: '#fff', border: '1px solid #E2E2DE' }}>
      <p className="surtitre" style={{ margin: 0 }} aria-live="polite">Créer notre mariage · étape {etape + 1} sur 3 · {noms[etape]}</p>
      {etape === 0 && <>
        <label htmlFor="nm-a" style={{ fontWeight: 600 }}>Première personne</label>
        <input id="nm-a" className="champ" maxLength={80} autoFocus autoComplete="off" value={v.a} onChange={maj('a')} />
        <label htmlFor="nm-b" style={{ fontWeight: 600 }}>Seconde personne</label>
        <input id="nm-b" className="champ" maxLength={80} autoComplete="off" value={v.b} onChange={maj('b')} />
      </>}
      {etape === 1 && <>
        <label htmlFor="nm-date" style={{ fontWeight: 600 }}>Date du mariage</label>
        <input id="nm-date" type="date" className="champ" min="2000-01-01" max="2100-12-31" autoFocus value={v.date} onChange={maj('date')} />
        <p style={{ margin: 0, fontSize: 15, color: '#3A3A3F' }}>Pas encore fixée ? Laissez vide : vous pourrez l’ajouter plus tard.</p>
      </>}
      {etape === 2 && <>
        <label htmlFor="nm-lieu" style={{ fontWeight: 600 }}>Lieu</label>
        <input id="nm-lieu" className="champ" maxLength={120} autoFocus autoComplete="off" value={v.nom} onChange={maj('nom')} />
        <label htmlFor="nm-ville" style={{ fontWeight: 600 }}>Ville</label>
        <input id="nm-ville" className="champ" maxLength={120} autoComplete="off" value={v.ville} onChange={maj('ville')} />
      </>}
      <p role="status" aria-live="polite" style={{ margin: 0, minHeight: 22, fontWeight: 600 }}>{etat.raison}</p>
      <span style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {etape < 2
          ? <button className="bouton noir" type="submit">Continuer</button>
          : <button className="bouton noir" type="submit" disabled={!!etat.envoi}>{etat.envoi ? 'Enregistrement…' : 'Enregistrer notre mariage'}</button>}
        {etape > 0 && <button className="bouton" type="button" onClick={() => { setEtat({}); setEtape(etape - 1); }}>Retour</button>}
        <button className="bouton" type="button" onClick={annuler}>Annuler</button>
      </span>
    </form>
  );
}

/* La fiche d'un mariage : les deux personnes (propriétaire, ou membre « editor ») modifient noms, date et lieu. La révision vue accompagne
   l'enregistrement : si l'autre personne a modifié entre-temps, le serveur refuse (409) et rien n'est écrasé. */
function FicheMariage({ p, apres, fermer }: { p: Projet; apres: (m: string) => void; fermer: () => void }) {
  const m: Mariage = p.mariage || { noms: ['', ''] };
  const peut = p.role === 'owner' || p.role === 'editor';
  const [etat, setEtat] = useState<{ envoi?: boolean; raison?: string; conflit?: boolean }>({});
  const enregistrer = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget), a = String(f.get('a') || '').trim(), b = String(f.get('b') || '').trim();
    if (!a || !b) { setEtat({ raison: 'Indiquez les deux noms (ou prénoms) de l’union.' }); return; }
    if (etat.envoi) return;
    setEtat({ envoi: true });
    const r = await ecrireBuro({ action: 'maj', id: p.id, titre: a + ' & ' + b, rev: p.rev || 0, mariage: { noms: [a, b], date: String(f.get('date') || ''), lieu: { nom: String(f.get('lieu') || ''), ville: String(f.get('ville') || '') } } });
    if (r.ok) apres('Notre mariage est enregistré.'); else setEtat({ raison: r.raison || 'Enregistrement impossible : réessayez.', conflit: !!r.conflit });
  };
  return (
    <section aria-label={'Mariage ' + p.titre} style={{ marginTop: 20, padding: 20, borderRadius: 20, background: '#fff', border: '2px solid #0B0B0C', maxWidth: 720 }}>
      <p className="surtitre" style={{ margin: '0 0 12px' }}>{p.role === 'owner' ? 'Notre mariage' : 'Mariage partagé avec vous'} · Date et lieu</p>
      {peut
        ? <form onSubmit={enregistrer} style={{ display: 'grid', gap: 12 }}>
          <label htmlFor="fm-a" style={{ fontWeight: 600 }}>Première personne</label>
          <input id="fm-a" name="a" className="champ" maxLength={80} required defaultValue={m.noms[0] || ''} autoComplete="off" />
          <label htmlFor="fm-b" style={{ fontWeight: 600 }}>Seconde personne</label>
          <input id="fm-b" name="b" className="champ" maxLength={80} required defaultValue={m.noms[1] || ''} autoComplete="off" />
          <label htmlFor="fm-date" style={{ fontWeight: 600 }}>Date</label>
          <input id="fm-date" name="date" type="date" className="champ" min="2000-01-01" max="2100-12-31" defaultValue={m.date || ''} />
          <label htmlFor="fm-lieu" style={{ fontWeight: 600 }}>Lieu</label>
          <input id="fm-lieu" name="lieu" className="champ" maxLength={120} defaultValue={m.lieu?.nom || ''} autoComplete="off" />
          <label htmlFor="fm-ville" style={{ fontWeight: 600 }}>Ville</label>
          <input id="fm-ville" name="ville" className="champ" maxLength={120} defaultValue={m.lieu?.ville || ''} autoComplete="off" />
          <p role="status" aria-live="polite" style={{ margin: 0, minHeight: 22, fontWeight: 600 }}>{etat.raison}</p>
          <span style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="bouton noir" type="submit" disabled={!!etat.envoi}>{etat.envoi ? 'Enregistrement…' : 'Enregistrer'}</button>
            {etat.conflit && <button className="bouton" type="button" onClick={() => apres('Dernière version rechargée.')}>Recharger la dernière version</button>}
            <button className="bouton" type="button" onClick={fermer}>Fermer</button>
          </span>
        </form>
        : <div style={{ display: 'grid', gap: 10 }}>
          <h2 className="titre" style={{ fontSize: 32 }}>{m.noms.filter(Boolean).join(' & ') || p.titre}</h2>
          <p style={{ margin: 0, fontSize: 17, lineHeight: 1.5 }}>{[dateLongue(m.date), [m.lieu?.nom, m.lieu?.ville].filter(Boolean).join(', ')].filter(Boolean).join(' · ') || 'Date et lieu pas encore indiqués.'}</p>
          <span><button className="bouton" type="button" onClick={fermer}>Fermer</button></span>
        </div>}
    </section>
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
  const [mariage, setMariage] = useState(false);
  /* « Créer notre mariage » depuis Organiser : /buro?creer=mariage. L'intention survit à la connexion (même appareil, 30 minutes) puis s'efface. */
  useEffect(() => {
    try {
      if (new URLSearchParams(window.location.search).get('creer') === 'mariage') localStorage.setItem('aime-creer', JSON.stringify({ t: Date.now(), v: 'mariage' }));
    } catch { /* rien */ }
  }, [recherche]);
  useEffect(() => {
    if (!session) return;
    try {
      const x = JSON.parse(localStorage.getItem('aime-creer') || 'null');
      if (x && x.v === 'mariage' && Date.now() - x.t < 30 * 60 * 1000) { setMariage(true); setNouveau(false); setChoisi(null); setLieu('projets'); }
      localStorage.removeItem('aime-creer');
    } catch { /* rien */ }
  }, [session]);
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
          {lieu === 'projets' && !nouveau && !mariage && <p style={{ margin: '20px 0 0', display: 'flex', gap: 10, flexWrap: 'wrap' }}><button type="button" className="bouton noir" onClick={() => { setNouveau(true); setChoisi(null); setMsg(''); }}>Nouveau projet</button><button type="button" className="bouton" onClick={() => { setMariage(true); setChoisi(null); setMsg(''); }}>Créer notre mariage</button></p>}
          {lieu === 'projets' && mariage && <NouveauMariage annuler={() => setMariage(false)} fini={(id, t) => { setMariage(false); setMsg('Le mariage « ' + t + ' » est enregistré dans votre espace.'); charger().then(() => setChoisi(id)); }} />}
          {lieu === 'projets' && nouveau && <NouveauProjet annuler={() => setNouveau(false)} fini={(id, t) => { setNouveau(false); setMsg('« ' + t + ' » enregistré dans votre espace.'); charger().then(() => setChoisi(id)); }} />}
          {sel && (sel.mariage
            ? <FicheMariage key={sel.id + ':' + (sel.rev || 0)} p={sel} fermer={() => setChoisi(null)} apres={m => { setMsg(m); charger(); }} />
            : <Fiche key={sel.id + ':' + (sel.rev || 0)} p={sel} fermer={() => setChoisi(null)} apres={m => { setMsg(m); charger(); }} />)}
          <ul style={{ listStyle: 'none', margin: '20px 0 0', padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: 20 }}>
            {lieu === 'projets' && <li><Lien href="/point-zero" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 240, height: '100%', padding: 22, borderRadius: 22, border: '2px dashed #BDBDB8', textDecoration: 'none' }}>
              <Orbe taille={56} /><span><span style={{ display: 'block', fontSize: 24, fontWeight: 600 }}>Point Zéro</span><span style={{ display: 'block', marginTop: 6, fontSize: 16, color: '#3A3A3F' }}>Commencer quelque chose : importer, décrire, annoncer.</span></span>
            </Lien></li>}
            {projets === null ? <li style={{ fontSize: 18 }}>Chargement…</li> : liste.map(p => {
              const on = p.id === choisi;
              return <li key={p.id}><button type="button" aria-pressed={on} onClick={() => setChoisi(on ? null : p.id)} style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', height: '100%', minHeight: 240, padding: 20, borderRadius: 22, border: on ? '2px solid #0B0B0C' : '1px solid #E2E2DE', background: '#fff', textAlign: 'left' }}>
                <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: '#55555A' }}>{p.studio || p.genre}</span>
                <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.015em' }}>{p.titre}</span>
                <span style={{ fontSize: 15, color: '#3A3A3F' }}>{p.mariage ? ([dateLongue(p.mariage.date), [p.mariage.lieu?.nom, p.mariage.lieu?.ville].filter(Boolean).join(', ')].filter(Boolean).join(' · ') || 'Date et lieu à indiquer') : p.briques.length ? p.briques.slice(0, 5).map(b => B[b]?.name || b).join(' · ') + (p.briques.length > 5 ? '…' : '') : (p.description || '').slice(0, 90) + ((p.description || '').length > 90 ? '…' : '')}</span>
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
