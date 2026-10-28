import { useState, type ReactNode } from 'react';
import { Orbe, OrbeDessin } from './Charte';
import { MiniGrille } from '../pages/FicheReseau';
import { EXEMPLES } from '../lib/reseau-exemples';
import { profils } from '../lib/confort';

/* L'Espace en aperçu, dans un écran : les dossiers que chaque espace aura par défaut, un seul endroit pour tout.
   Projets est ouvert, un projet est ouvert dedans (ses fichiers, puis sa grille). */
type Dossier = 'projets' | 'profil' | 'documents' | 'ressources' | 'prestataires' | 'tutoriels' | 'design' | 'aplus';
const W = (s: string) => '/media/wedding/' + s + '.jpg';
const DOSSIERS: { id: Dossier; nom: string; teinte: string; pro?: boolean }[] = [
  { id: 'projets', nom: 'Projets', teinte: '#C9B8FF' },
  { id: 'profil', nom: 'Profil', teinte: '#FFD6EC' },
  { id: 'documents', nom: 'Documents', teinte: '#D9E8FF' },
  { id: 'ressources', nom: 'Ressources', teinte: '#B9F0E4' },
  { id: 'prestataires', nom: 'Prestataires', teinte: '#FFE2B8' },
  { id: 'tutoriels', nom: 'Tutoriels', teinte: '#E4E4E1' },
  { id: 'design', nom: 'Design System', teinte: '#8A8A86' },
  { id: 'aplus', nom: 'A+', teinte: '#F5B754', pro: true },
];
type Fichier = { nom: string; genre: string };
type Projet = { id: string; nom: string; studio: string; photo: string; alt: string; fichiers: Fichier[]; briques: string[] };
const PROJETS: Projet[] = [
  { id: 'union', nom: 'Notre union', studio: 'Le Monde AIME', photo: W('union-camille-gabriel'), alt: 'Un couple danse sous les étoiles devant un motel du désert',
    fichiers: [{ nom: 'La page de l’union', genre: 'Page' }, { nom: 'Le programme du jour', genre: 'Document' }, { nom: 'La liste des invités', genre: 'Tableau' }, { nom: 'Le plan de table', genre: 'Placement' }, { nom: 'Le faire-part', genre: 'Design' }, { nom: 'Les photos de la piscine', genre: 'Galerie' }],
    briques: ['intention', 'page', 'personnes', 'invitation', 'placement', 'programme', 'galerie', 'livreor', 'lieu', 'budget'] },
  { id: 'fairepart', nom: 'Le faire-part', studio: 'Studio', photo: W('piscine'), alt: 'Un couple de mariés au bord de la piscine d’un motel',
    fichiers: [{ nom: 'Recto', genre: 'Design' }, { nom: 'Verso', genre: 'Design' }, { nom: 'Les adresses', genre: 'Tableau' }], briques: ['modele', 'palette', 'document', 'invitation', 'personnes'] },
  { id: 'broderie', nom: 'Les initiales brodées', studio: 'Broderie', photo: '/media/grille-roses.jpg', alt: 'Une grille de broderie au point de croix avec des roses',
    fichiers: [{ nom: 'La grille', genre: 'Ouvrage' }, { nom: 'La palette de fils', genre: 'Palette' }], briques: ['grille', 'palette', 'atelier', 'import'] },
];
const SOUS: { id: string; nom: string; modeles: { nom: string; photo?: string }[] }[] = [
  { id: 'faire-part', nom: 'Faire-part', modeles: [{ nom: 'Désert', photo: W('union-camille-gabriel') }, { nom: 'Toits de Paris', photo: W('union-ines-hugo') }, { nom: 'Bord de mer', photo: W('collection-mer') }] },
  { id: 'cartes', nom: 'Cartes de visite', modeles: [{ nom: 'Nacre' }, { nom: 'Encre' }, { nom: 'Grille' }] },
  { id: 'save', nom: 'Save the date', modeles: [{ nom: 'Château', photo: W('collection-chateaux') }, { nom: 'Électro', photo: W('collection-electro') }] },
  { id: 'menus', nom: 'Menus', modeles: [{ nom: 'Table 7', photo: W('invites-table-7') }, { nom: 'Jardin', photo: W('collection-forets') }] },
  { id: 'plans', nom: 'Plans de table', modeles: [{ nom: 'Tables rondes' }, { nom: 'Grande tablée' }] },
  { id: 'patrons', nom: 'Patrons de broderie', modeles: [{ nom: 'Roses', photo: '/media/grille-roses.jpg' }, { nom: 'Initiales', photo: '/media/broderie.jpg' }] },
];

function IconeDossier({ teinte, taille = 22 }: { teinte: string; taille?: number }) {
  return <svg width={taille} height={taille} viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7.5A1.5 1.5 0 0 1 4.5 6H9l2 2.2h8.5A1.5 1.5 0 0 1 21 9.7v8.8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z" fill={teinte} stroke="#0B0B0C" strokeWidth="1.4" strokeLinejoin="round" /></svg>;
}
const Etiquette = ({ children, noir }: { children: ReactNode; noir?: boolean }) => <span style={{ flex: 'none', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', padding: '3px 7px', borderRadius: 6, background: noir ? '#0B0B0C' : '#F1F1EE', color: noir ? '#fff' : '#3A3A3F' }}>{children}</span>;
function Ligne({ titre, sous, genre, onClick }: { titre: string; sous?: string; genre: string; onClick?: () => void }) {
  const corps = <><span style={{ minWidth: 0 }}><b style={{ display: 'block', fontSize: 16, fontWeight: 600 }}>{titre}</b>{sous && <span style={{ fontSize: 14, color: '#55555A' }}>{sous}</span>}</span><Etiquette>{genre}</Etiquette></>;
  return <li>{onClick ? <button type="button" className="ecran-ligne" onClick={onClick}>{corps}</button> : <span className="ecran-ligne">{corps}</span>}</li>;
}
function Tuile({ nom, photo, sous, onClick, noir }: { nom: string; photo?: string; sous?: string; onClick?: () => void; noir?: boolean }) {
  const corps = <>
    <span style={{ display: 'block', aspectRatio: '4 / 3', borderRadius: 10, overflow: 'hidden', background: noir ? '#0B0B0C' : '#F1F1EE' }}>
      {photo ? <img src={photo} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: noir ? '#fff' : '#0B0B0C' }}>{nom}</span>}
    </span>
    <b style={{ display: 'block', marginTop: 8, fontSize: 15, fontWeight: 600 }}>{nom}</b>{sous && <span style={{ fontSize: 13, color: '#55555A' }}>{sous}</span>}
  </>;
  return <li>{onClick ? <button type="button" className="ecran-tuile" onClick={onClick}>{corps}</button> : <span className="ecran-tuile">{corps}</span>}</li>;
}

export function ApercuEspace() {
  const [dossier, setDossier] = useState<Dossier>('projets');
  const [projet, setProjet] = useState<string | null>('union');
  const [vue, setVue] = useState<'fichiers' | 'grille'>('fichiers');
  const [sous, setSous] = useState<string | null>(null);
  const ouvrir = (d: Dossier) => { setDossier(d); setProjet(null); setSous(null); setVue('fichiers'); };
  const p = PROJETS.find(x => x.id === projet) || null;
  const s = SOUS.find(x => x.id === sous) || null;
  const d = DOSSIERS.find(x => x.id === dossier)!;
  const chemin: [string, (() => void) | null][] = [['L’Espace', null], [d.nom, (p || s) ? () => ouvrir(dossier) : null]];
  if (p) chemin.push([p.nom, null]); if (s) chemin.push([s.nom, null]);
  const grille = (ids: string[]) => Object.fromEntries(ids.map(i => [i, true as const]));

  let contenu: ReactNode;
  if (dossier === 'projets' && p) contenu = <>
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
      <img src={p.photo} alt="" style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover' }} />
      <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: '#55555A' }}>{p.studio}</span><b style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>{p.nom}</b></span>
      <span role="group" aria-label="Voir le projet" style={{ display: 'flex', padding: 4, borderRadius: 12, background: '#F1F1EE' }}>
        {(['fichiers', 'grille'] as const).map(v => <button key={v} type="button" aria-pressed={vue === v} className="ecran-bascule" onClick={() => setVue(v)}>{v === 'fichiers' ? 'Fichiers' : 'Grille'}</button>)}
      </span>
    </div>
    {vue === 'fichiers'
      ? <ul className="ecran-liste">{p.fichiers.map(f => <Ligne key={f.nom} titre={f.nom} genre={f.genre} />)}</ul>
      : <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 24, alignItems: 'center' }}>
        <div style={{ maxWidth: 400 }}><MiniGrille allumees={grille(p.briques)} label={'Le projet « ' + p.nom + ' » dans la Grille 44'} /></div>
        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5, color: '#3A3A3F' }}>Le même projet, ouvert dans la grille. Le Point Zéro au centre ; chaque brique allumée est une partie du projet. On en allume une, la page suit.</p>
      </div>}
  </>;
  else if (dossier === 'projets') contenu = <ul className="ecran-tuiles">
    {PROJETS.map(x => <Tuile key={x.id} nom={x.nom} photo={x.photo} sous={x.studio + ' · ' + x.fichiers.length + ' fichiers'} onClick={() => { setProjet(x.id); setVue('fichiers'); }} />)}
    <li><span className="ecran-tuile" style={{ height: '100%' }}><span style={{ display: 'flex', aspectRatio: '4 / 3', borderRadius: 10, border: '2px dashed #BDBDB8', alignItems: 'center', justifyContent: 'center' }}><Orbe taille={44} /></span><b style={{ display: 'block', marginTop: 8, fontSize: 15, fontWeight: 600 }}>Point Zéro</b><span style={{ fontSize: 13, color: '#55555A' }}>Commencer quelque chose</span></span></li>
  </ul>;
  else if (dossier === 'profil') contenu = <>
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <img src={W('union-camille-gabriel')} alt="" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} />
      <span><b style={{ display: 'block', fontSize: 22, fontWeight: 600 }}>Camille</b><span style={{ fontSize: 15, color: '#55555A' }}>Mariée · Le Monde AIME</span></span>
    </div>
    <ul className="ecran-liste"><Ligne titre="Ma page" sous="Ce que les autres voient de moi" genre="Page" /><Ligne titre="Mes informations" sous="Saisies une seule fois, reprises partout" genre="Fiche" /><Ligne titre="Qui voit quoi" sous="Privé, restreint, par lien ou public" genre="Réglage" /></ul>
  </>;
  else if (dossier === 'documents') contenu = <ul className="ecran-liste">
    <Ligne titre="Le programme du jour" genre="Document" /><Ligne titre="Le contrat du lieu" genre="PDF" /><Ligne titre="Le devis de la fleuriste" genre="Devis" /><Ligne titre="La liste des invités" genre="Tableau" /><Ligne titre="Le plan d’accès" genre="Lieu" />
  </ul>;
  else if (dossier === 'ressources' && s) contenu = <ul className="ecran-tuiles">{s.modeles.map(m => <Tuile key={m.nom} nom={m.nom} photo={m.photo} sous="S’ouvre dans la grille" noir={m.nom === 'Encre'} />)}</ul>;
  else if (dossier === 'ressources') contenu = <ul className="ecran-tuiles petites">
    {SOUS.map(x => <li key={x.id}><button type="button" className="ecran-tuile" onClick={() => setSous(x.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, border: '1px solid #E2E2DE' }}><IconeDossier teinte="#B9F0E4" taille={34} /><span><b style={{ display: 'block', fontSize: 15, fontWeight: 600 }}>{x.nom}</b><span style={{ fontSize: 13, color: '#55555A' }}>{x.modeles.length} modèles</span></span></button></li>)}
  </ul>;
  else if (dossier === 'prestataires') contenu = <>
    <p style={{ margin: '0 0 16px', fontSize: 15, color: '#3A3A3F' }}>Un gabarit par métier : la page vitrine et son module, à reprendre dans la grille. On remplace les visuels, on ajoute une vidéo.</p>
    <ul className="ecran-tuiles">{EXEMPLES.filter(e => e.domaine === 'mariage').slice(0, 6).map(e => <Tuile key={e.slug} nom={e.nom} photo={e.photo} sous={'Gabarit · ' + e.famille} />)}</ul>
  </>;
  else if (dossier === 'tutoriels') contenu = <ol className="ecran-liste" style={{ listStyle: 'none' }}>
    {['Bien démarrer dans votre espace', 'Créer la page de votre union', 'Inviter vos proches', 'Broder vos initiales', 'Importer un PDF dans la grille magnétique'].map((t, k) => <Ligne key={t} titre={String(k + 1).padStart(2, '0') + ' · ' + t} genre="Tutoriel" />)}
  </ol>;
  else if (dossier === 'design') contenu = <ul className="ecran-tuiles">
    <li><span className="ecran-tuile"><span style={{ display: 'flex', flexDirection: 'column', gap: 10, aspectRatio: '4 / 3', borderRadius: 10, background: '#F1F1EE', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ width: '70%', height: 22, borderRadius: 8, background: '#fff', border: '1px solid #E2E2DE' }} /><span style={{ width: '70%', height: 22, borderRadius: 8, background: '#1B1B1A' }} /></span>
      <b style={{ display: 'block', marginTop: 8, fontSize: 15, fontWeight: 600 }}>Les deux docks</b><span style={{ fontSize: 13, color: '#55555A' }}>En haut les verbes, en bas les lieux</span></span></li>
    <li><span className="ecran-tuile"><span style={{ display: 'flex', flexWrap: 'wrap', gap: 4, aspectRatio: '4 / 3', borderRadius: 10, background: '#0B0B0C', alignItems: 'center', justifyContent: 'center', alignContent: 'center', padding: 8 }}>
      {profils().map(o => <OrbeDessin key={o.id} p={o} taille={34} />)}</span>
      <b style={{ display: 'block', marginTop: 8, fontSize: 15, fontWeight: 600 }}>L’orbe et Mon confort</b><span style={{ fontSize: 13, color: '#55555A' }}>Six orbes, un geste</span></span></li>
    <li><span className="ecran-tuile"><span style={{ display: 'flex', aspectRatio: '4 / 3', borderRadius: 10, background: '#F1F1EE', alignItems: 'center', justifyContent: 'center', padding: 10 }}>
      <svg width="70%" viewBox="0 0 70 50" aria-hidden="true">{Array.from({ length: 35 }, (_, k) => { const x = 5 + (k % 7) * 10, y = 5 + Math.floor(k / 7) * 10, c = k === 17; return c ? <circle key={k} cx={x} cy={y} r="4" fill="#0B0B0C" /> : <rect key={k} x={x - 3.5} y={y - 3.5} width="7" height="7" rx="1.6" fill={[3, 9, 15, 23, 25].includes(k) ? ['#FFD6EC', '#C9B8FF', '#B9F0E4', '#D9E8FF', '#FFE2B8'][[3, 9, 15, 23, 25].indexOf(k)] : '#DCDCD8'} />; })}</svg></span>
      <b style={{ display: 'block', marginTop: 8, fontSize: 15, fontWeight: 600 }}>La Grille 44</b><span style={{ fontSize: 13, color: '#55555A' }}>Les briques, l’import au centre</span></span></li>
    <li><span className="ecran-tuile"><span style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', aspectRatio: '4 / 3', borderRadius: 10, overflow: 'hidden' }}>
      {['#0B0B0C', '#F6F6F4', '#1B1B1A', '#C9B8FF', '#FFD6EC', '#B9F0E4'].map(c => <span key={c} style={{ background: c }} />)}</span>
      <b style={{ display: 'block', marginTop: 8, fontSize: 15, fontWeight: 600 }}>La charte</b><span style={{ fontSize: 13, color: '#55555A' }}>Couleurs, Inter Tight, des mots</span></span></li>
  </ul>;
  else contenu = <>
    <p style={{ margin: '0 0 16px', fontSize: 15, color: '#3A3A3F' }}>Pour celles et ceux qui en font leur métier : tout est déjà préparé.</p>
    <ul className="ecran-liste"><Ligne titre="Ma vitrine" sous="Votre page de prestataire" genre="Page" /><Ligne titre="Les modèles de site" sous="Les maquettes du site, au thème de chaque domaine" genre="Modèle" /><Ligne titre="Devis et factures" genre="Compter" /><Ligne titre="Mes clients" genre="Personnes" /></ul>
  </>;

  return (
    <div className="ecran" role="region" aria-label="Aperçu de l’Espace">
      <div className="ecran-haut">
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700 }}><Orbe taille={22} />Mon espace</span>
        <nav aria-label="Chemin" style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#55555A', overflow: 'hidden', whiteSpace: 'nowrap' }}>
          {chemin.map(([l, f], k) => <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{k > 0 && <span aria-hidden="true">›</span>}{f ? <button type="button" onClick={f} style={{ border: 0, background: 'none', padding: 0, color: 'inherit', textDecoration: 'underline', textUnderlineOffset: 3 }}>{l}</button> : <span style={{ color: k === chemin.length - 1 ? '#0B0B0C' : undefined, fontWeight: k === chemin.length - 1 ? 600 : 400 }}>{l}</span>}</span>)}
        </nav>
        <span className="ecran-verbes" aria-hidden="true">{['Nouveau', 'Importer', 'Partager'].map(v => <span key={v}>{v}</span>)}</span>
      </div>
      <div className="ecran-corps">
        <ul className="ecran-dossiers" aria-label="Dossiers">
          {DOSSIERS.map(x => <li key={x.id}><button type="button" aria-current={dossier === x.id ? 'true' : undefined} onClick={() => ouvrir(x.id)}>
            <IconeDossier teinte={x.teinte} /><span style={{ flex: 1 }}>{x.nom}</span>{x.pro && <Etiquette noir>Pro</Etiquette>}
          </button></li>)}
        </ul>
        <div className="ecran-contenu" aria-live="polite">{contenu}</div>
      </div>
    </div>
  );
}
