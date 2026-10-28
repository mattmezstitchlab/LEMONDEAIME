import { useState, type ReactNode } from 'react';
import { Orbe } from '../charte/Charte';
import { Lien } from '../lib/router';
import data from '../lib/briques.json';

/* L'aperçu du studio sur l'accueil : dans AIME, une info est saisie une seule fois.
   Ce que AIME sait déjà remplit chaque document ; on change une info, elle change partout. */
const B = data.briques as unknown as Record<string, { name: string; c: string }>;
type Infos = { maries: string; date: string; heure: string; lieu: string; invites: string; contact: string };
const DEPART: Infos = { maries: 'Camille & Gabriel', date: 'samedi 12 juin 2027', heure: '17 h', lieu: 'The Desert Lily Motel', invites: '112', contact: 'Camille' };
const CHAMPS: [keyof Infos, string, string][] = [
  ['maries', 'Les mariés', 'Profil de l’union'], ['date', 'La date', 'Calendrier'], ['heure', 'La cérémonie', 'Programme'],
  ['lieu', 'Le lieu', 'Lieu'], ['invites', 'Les invités', 'Personnes'], ['contact', 'Le contact', 'Profil'],
];
type Doc = { id: string; label: string; briques: string[]; rendu: (i: Infos, V: (k: keyof Infos) => ReactNode) => ReactNode };
const DOCS: Doc[] = [
  { id: 'fairepart', label: 'Faire-part', briques: ['invitation', 'personnes', 'calendrier', 'lieu'], rendu: (_, V) => <div style={{ textAlign: 'center' }}>
    <p style={{ margin: 0, fontSize: 13, letterSpacing: '.2em', textTransform: 'uppercase', color: '#55555A' }}>Faire-part</p>
    <p style={{ margin: '18px 0 6px', fontSize: 'clamp(26px, 3vw, 38px)', fontWeight: 600, letterSpacing: '-0.03em' }}>{V('maries')}</p>
    <p style={{ margin: 0 }}>ont la joie de vous annoncer leur union</p>
    <p style={{ margin: '18px 0 0', fontWeight: 600 }}>le {V('date')}, à {V('heure')}</p><p style={{ margin: '4px 0 0' }}>{V('lieu')}</p>
    <p style={{ margin: '20px 0 0', fontSize: 14, color: '#55555A' }}>Votre réponse, sur la page de l’union.</p></div> },
  { id: 'programme', label: 'Programme', briques: ['programme', 'lieu', 'calendrier'], rendu: (_, V) => <div>
    <p style={{ margin: 0, fontSize: 13, letterSpacing: '.2em', textTransform: 'uppercase', color: '#55555A' }}>Programme · {V('date')}</p>
    <ol style={{ listStyle: 'none', margin: '18px 0 0', padding: 0, display: 'grid', gap: 12 }}>
      <li><b style={{ fontWeight: 600 }}>{V('heure')}</b> · Cérémonie, {V('lieu')}</li><li><b style={{ fontWeight: 600 }}>Ensuite</b> · Vin d’honneur</li><li><b style={{ fontWeight: 600 }}>Le soir</b> · Dîner et soirée</li></ol>
    <p style={{ margin: '18px 0 0', fontSize: 14, color: '#55555A' }}>Partagé avec l’équipe de {V('maries')}.</p></div> },
  { id: 'devis', label: 'Demande de devis', briques: ['devis', 'personnes', 'lieu', 'calendrier'], rendu: (_, V) => <div>
    <p style={{ margin: 0, fontSize: 13, letterSpacing: '.2em', textTransform: 'uppercase', color: '#55555A' }}>À la fleuriste</p>
    <p style={{ margin: '18px 0 0', lineHeight: 1.6 }}>Bonjour, nous préparons notre union le {V('date')} à {V('lieu')}, pour {V('invites')} invités. Pourriez-vous nous faire une proposition pour le bouquet et les arches ?</p>
    <p style={{ margin: '14px 0 0' }}>Merci, {V('contact')}</p></div> },
  { id: 'message', label: 'Message aux invités', briques: ['messages', 'personnes', 'lieu'], rendu: (_, V) => <div>
    <p style={{ margin: 0, fontSize: 13, letterSpacing: '.2em', textTransform: 'uppercase', color: '#55555A' }}>Aux {V('invites')} invités</p>
    <p style={{ margin: '18px 0 0', lineHeight: 1.6 }}>Chers invités, rendez-vous le {V('date')} à {V('heure')}, à {V('lieu')}. Toutes les infos sont sur notre page.</p>
    <p style={{ margin: '14px 0 0' }}>{V('maries')}</p></div> },
];

export function StudioDemo() {
  const [infos, setInfos] = useState<Infos>(DEPART);
  const [doc, setDoc] = useState(DOCS[0].id);
  const [touche, setTouche] = useState<keyof Infos | null>(null);
  const d = DOCS.find(x => x.id === doc)!;
  const V = (k: keyof Infos) => <mark className={'info-remplie' + (touche === k ? ' vient' : '')}>{infos[k] || '…'}</mark>;
  return (
    <div className="studio-demo">
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div role="group" aria-label="Le document à préparer" className="dock-haut" style={{ maxWidth: '100%', overflowX: 'auto' }}>
          <span className="outil" aria-hidden="true" style={{ paddingLeft: 8 }}><Orbe /><span style={{ fontWeight: 600 }}>Point Zéro</span></span>
          <span className="separateur" aria-hidden="true" />
          {DOCS.map(x => <button key={x.id} type="button" className="outil" aria-pressed={doc === x.id} onClick={() => setDoc(x.id)} style={{ fontWeight: doc === x.id ? 700 : 500, background: doc === x.id ? 'var(--doux)' : undefined }}>{x.label}</button>)}
        </div>
      </div>
      <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 20, alignItems: 'start' }}>
        <form aria-labelledby="titre-sait" onSubmit={e => e.preventDefault()} style={{ padding: 20, borderRadius: 18, background: '#fff', border: '1px solid #E2E2DE' }}>
          <h3 id="titre-sait" style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Ce que AIME sait déjà</h3>
          <p style={{ margin: '4px 0 14px', fontSize: 14.5, color: '#55555A' }}>Saisi une fois, dans le profil et la page de l’union. Modifiez une info : elle change dans chaque document.</p>
          <div style={{ display: 'grid', gap: 10 }}>
            {CHAMPS.map(([k, l, source]) => <label key={k} style={{ display: 'grid', gap: 4, fontSize: 14.5, fontWeight: 600 }}>
              <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>{l}<span style={{ fontWeight: 500, color: '#55555A' }}>{source}</span></span>
              <input className="champ" style={{ height: 44, fontSize: 16 }} value={infos[k]} maxLength={60} onChange={e => { setInfos({ ...infos, [k]: e.target.value }); setTouche(k); }} onBlur={() => setTouche(null)} />
            </label>)}
          </div>
          <button type="button" className="bouton" style={{ marginTop: 14, height: 44 }} onClick={() => setInfos(DEPART)}>Revenir à l’exemple</button>
        </form>
        <div>
          <article aria-label={'Aperçu : ' + d.label} aria-live="polite" className="studio-papier">{d.rendu(infos, V)}</article>
          <p style={{ margin: '14px 2px 0', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 14.5, color: '#3A3A3F' }}>
            <span style={{ fontWeight: 600, color: '#0B0B0C' }}>Briques :</span>
            {d.briques.map(b => <span key={b} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span aria-hidden="true" style={{ width: 11, height: 11, borderRadius: 3, background: B[b].c, boxShadow: 'inset 0 0 0 1px rgba(11,11,12,.25)' }} />{B[b].name}</span>)}
          </p>
          <p style={{ margin: '8px 2px 0', fontSize: 14.5, color: '#55555A' }}>Exemple : rien n’est enregistré. Les parties en couleur viennent de ce que AIME sait déjà.</p>
        </div>
      </div>
      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
        <Lien className="bouton noir" href="/point-zero">Commencer au Point Zéro</Lien>
        <Lien className="bouton" href="/reseau/la-fleuriste">Voir la fleuriste qui reçoit la demande</Lien>
      </div>
    </div>
  );
}
