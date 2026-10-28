import { useState } from 'react';
import { Orbe } from '../charte/Charte';

/* LE CONCEPT AIME, présenté sur l'accueil (ce qui était la page « La Charte ») :
   deux docks, l'orbe, sept principes, et qui peut voir. */

type Noeud = { label: string; texte: string; kids?: Noeud[] };
const ESPACE: Noeud[] = [
  { label: 'Le jour', texte: 'Le déroulé, le lieu, les rappels : tout ce qui fait la journée.', kids: [
    { label: 'Programme', texte: 'Le déroulé heure par heure.' }, { label: 'Lieu', texte: 'Une adresse sur une carte.' }, { label: 'Rappels', texte: 'Ne rien oublier, au bon moment.' }] },
  { label: 'L’équipe', texte: 'Qui fait quoi : les rôles, les messages, les tâches.', kids: [
    { label: 'Rôles', texte: 'Chacun sa place et ses droits.' }, { label: 'Messages', texte: 'Parler au bon endroit.' }, { label: 'Tâches', texte: 'Ce qu’il reste à faire, et par qui.' }] },
  { label: 'Invités', texte: 'Inviter, placer, répondre.', kids: [
    { label: 'Invitation', texte: 'Inviter et suivre les réponses.' }, { label: 'Placement', texte: 'Qui s’assoit où.' }, { label: 'Questions', texte: 'Un formulaire simple.' }] },
  { label: 'Galerie', texte: 'Les images et les mots qui restent.', kids: [
    { label: 'Médias', texte: 'Vidéo, son, image.' }, { label: 'Livre d’or', texte: 'Les mots des proches.' }] },
];

/* Le dock du haut à niveaux : un clic sur un outil affiche ses fonctions dans le dock lui-même, sans menu caché. */
export function DemoDocks() {
  const [chemin, setChemin] = useState<number[]>([]);
  const [lieu, setLieu] = useState(0);
  let noeud: Noeud = { label: 'Votre espace', texte: 'Le dock du haut montre d’abord ce qui sert. Choisissez un outil : ses fonctions prennent sa place, le chemin reste affiché.', kids: ESPACE };
  const fil = [noeud.label];
  chemin.forEach(i => { noeud = noeud.kids![i]; fil.push(noeud.label); });
  const lieux = ['Projets', 'Partagés avec moi', 'Archives', 'Profil'];
  return (
    <div style={{ marginTop: 48, padding: 'clamp(18px, 3vw, 40px)', borderRadius: 24, background: '#ECECE8', border: '1px solid #E2E2DE' }}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div role="group" aria-label="Démonstration du dock du haut" className="dock-haut" style={{ maxWidth: '100%', overflowX: 'auto' }}
          onKeyDown={e => { if (e.key === 'Escape' && chemin.length) { e.preventDefault(); setChemin(chemin.slice(0, -1)); } }}>
          {chemin.length > 0 && <><button type="button" className="outil" onClick={() => setChemin(chemin.slice(0, -1))}>Retour</button><span className="separateur" aria-hidden="true" /></>}
          {(noeud.kids || []).map((k, i) => <button key={k.label} type="button" className="outil" aria-haspopup={k.kids ? 'true' : undefined} onClick={() => setChemin([...chemin, i])} style={{ fontWeight: 500 }}>{k.label}{k.kids && <span style={{ fontSize: 12, color: '#55555A' }}>{k.kids.length}</span>}</button>)}
        </div>
      </div>
      <nav aria-label="Chemin (démonstration)" style={{ marginTop: 14, textAlign: 'center', fontSize: 15 }}>
        {fil.map((f, i) => <span key={i}>{i > 0 && <span aria-hidden="true" style={{ color: '#8A8A86' }}> › </span>}{i < fil.length - 1
          ? <button type="button" onClick={() => setChemin(chemin.slice(0, i))} style={{ border: 0, background: 'none', padding: '6px 2px', minHeight: 32, fontWeight: 500, color: '#55555A', textDecoration: 'underline', textUnderlineOffset: 3 }}>{f}</button>
          : <b aria-current="location" style={{ fontWeight: 700 }}>{f}</b>}</span>)}
      </nav>
      <p aria-live="polite" style={{ margin: '28px auto 32px', maxWidth: '40ch', textAlign: 'center', fontSize: 'clamp(19px, 1.8vw, 24px)', lineHeight: 1.4, fontWeight: 600, letterSpacing: '-0.01em' }}>{noeud.texte}</p>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div role="group" aria-label="Démonstration du dock du bas" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 7, borderRadius: 16, background: 'var(--dock)', border: '1px solid var(--dock-trait)', maxWidth: '100%', overflowX: 'auto' }}>
          <span className="lieu" aria-hidden="true" style={{ width: 50, padding: 0, justifyContent: 'center', border: 0, background: '#0B0B0C' }}><Orbe taille={24} /></span>
          {lieux.map((l, i) => <button key={l} type="button" className="lieu" aria-pressed={lieu === i} aria-current={lieu === i ? 'true' : 'false'} onClick={() => setLieu(i)}>{l}</button>)}
        </div>
      </div>
      <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 16 }}>
        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.55, color: '#3A3A3F' }}><b style={{ color: '#0B0B0C', fontWeight: 600 }}>En haut, blanc : faire.</b> Des mots, pas de pictos. D’abord ce qui sert maintenant ; un outil se déploie en fonctions, dans le dock même.</p>
        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.55, color: '#3A3A3F' }}><b style={{ color: '#0B0B0C', fontWeight: 600 }}>En bas, sombre : aller.</b> Les lieux de la page, le lieu visible en blanc. Le Point, à gauche, ramène toujours à l’accueil.</p>
      </div>
    </div>
  );
}

/* Les neuf états de l'orbe : chacun change de forme et porte un mot, jamais la couleur seule. */
type Etat = { titre: string; texte: string; fond: [string, string]; anneau?: { w: number; c: string; dash?: string; tourne?: boolean }; signe?: 'coche' | 'alerte'; satellite?: boolean; double?: boolean; lueur?: string };
const ETATS: Etat[] = [
  { titre: 'Repos', texte: 'Présente et silencieuse. Rien à faire.', fond: ['#FFFFFF', '#C9B8FF'] },
  { titre: 'Écoute', texte: 'Anneau plein et stable : j’attends votre geste.', fond: ['#D9F4FF', '#4FB8E8'], anneau: { w: 1.6, c: '#4A4FA8' } },
  { titre: 'Réflexion', texte: 'Anneau en pointillé qui tourne : je prépare.', fond: ['#F1E9FF', '#A98BE0'], anneau: { w: 1.6, c: '#8E6FB0', dash: '2 3', tourne: true } },
  { titre: 'Action', texte: 'Chaude, une impulsion : c’est ici, à vous.', fond: ['#FFE0B8', '#F37A7A'], lueur: 'rgba(243,169,92,.6)' },
  { titre: 'Confirmation', texte: 'Verte avec une coche : c’est fait.', fond: ['#DFF8EA', '#3DBE82'], signe: 'coche' },
  { titre: 'Attention', texte: 'Ambre, pointillé et point d’exclamation : à regarder.', fond: ['#FFF1C9', '#E3A23A'], signe: 'alerte', anneau: { w: 1.6, c: '#B5651D', dash: '3 2.4' } },
  { titre: 'Protection', texte: 'Anneau épais : privé ou protégé.', fond: ['#E3EAFF', '#6F86D6'], anneau: { w: 3.2, c: '#5E5E9A' } },
  { titre: 'Lien', texte: 'Un satellite sur l’anneau : relié à quelqu’un.', fond: ['#FFE3F1', '#7FA6E0'], anneau: { w: 1.4, c: '#4E6E99' }, satellite: true },
  { titre: 'Accessibilité', texte: 'Double anneau : mon confort est actif.', fond: ['#FFFFFF', '#D8D2BE'], anneau: { w: 1.6, c: '#8F8B7A' }, double: true },
];
function OrbeEtat({ e, i }: { e: Etat; i: number }) {
  const id = 'orbe-etat-' + i;
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true" style={{ overflow: 'visible', filter: e.lueur ? `drop-shadow(0 0 10px ${e.lueur})` : undefined }}>
      <defs><radialGradient id={id} cx="35%" cy="32%" r="75%"><stop offset="0" stopColor={e.fond[0]} /><stop offset="1" stopColor={e.fond[1]} /></radialGradient></defs>
      {e.anneau && <circle cx="36" cy="36" r="33" fill="none" stroke={e.anneau.c} strokeWidth={e.anneau.w} strokeDasharray={e.anneau.dash} className={e.anneau.tourne ? 'orbe-tourne' : undefined} style={{ transformOrigin: '36px 36px' }} />}
      <circle cx="36" cy="36" r="26" fill={`url(#${id})`} stroke="rgba(11,11,12,.14)" strokeWidth="1" />
      {e.double && <circle cx="36" cy="36" r="20" fill="none" stroke="#fff" strokeWidth="2" />}
      {e.satellite && <circle cx="59.3" cy="12.7" r="4.5" fill="#4E6E99" stroke="#fff" strokeWidth="1.5" />}
      {e.signe === 'coche' && <path d="M26 37l7 7 13-15" fill="none" stroke="#0B0B0C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
      {e.signe === 'alerte' && <><path d="M36 25v13" stroke="#0B0B0C" strokeWidth="3.4" strokeLinecap="round" /><circle cx="36" cy="46" r="2.2" fill="#0B0B0C" /></>}
    </svg>
  );
}
export function Orbes() {
  return (
    <ul style={{ listStyle: 'none', margin: '48px 0 0', padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 240px), 1fr))', gap: 14 }}>
      {ETATS.map((e, i) => <li key={e.titre} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 18px', borderRadius: 18, background: '#fff', border: '1px solid #E2E2DE' }}>
        <span style={{ flex: 'none' }}><OrbeEtat e={e} i={i} /></span>
        <span><b style={{ display: 'block', fontSize: 18, fontWeight: 600 }}>{e.titre}</b><span style={{ fontSize: 15, lineHeight: 1.45, color: '#3A3A3F' }}>{e.texte}</span></span>
      </li>)}
    </ul>
  );
}

export const PRINCIPES: [string, string][] = [
  ['Deux docks', 'En haut, blanc : les verbes, ce qu’on fait. En bas, sombre : les lieux, où l’on va.'],
  ['Des mots, pas des pictos', 'Seuls les signes universels restent : la loupe, le « + », le chevron du menu, fermer, retour.'],
  ['Aucun doublon', 'Chaque action n’apparaît qu’une fois. Le pied de page est la seule exception.'],
  ['Le mot le plus court', '« A+ » plutôt que « Pro », « + » plutôt que « Créer ».'],
  ['Une seule porte', 'Le « + » : « Entrer » avant, le Point Zéro après. Votre espace garde tout le reste.'],
  ['Des titres légers', 'Titres en 600. Le 900 est réservé à la signature de chaque page d’accueil.'],
  ['Au-delà du WCAG 2.2 AA', 'Contrastes, clavier, lecteurs d’écran, mouvement réduit : partout, dès le premier jour.'],
];
export const VISIBILITES: [string, string][] = [['Privé', 'Vous seul·e'], ['Restreint', 'Les personnes invitées'], ['Par lien', 'Qui a le lien'], ['Public', 'Visible dans Le Monde AIME']];
