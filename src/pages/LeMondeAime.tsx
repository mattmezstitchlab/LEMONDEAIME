import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Tete, VerbesSite, DockBas, Pied, Orbe } from '../charte/Charte';
import { ApercuEspace } from '../charte/ApercuEspace';
import { Metamorphose, type UniversM } from '../charte/Metamorphose';
import { useConfort } from '../lib/confort';
import { SECTIONS, estTransformee, useMeta, type SectionId } from '../lib/metamorphose';
import { CREATIONS } from '../lib/boutique';
import { CarteCreation } from './Boutique';
import { Lien } from '../lib/router';
import { EXEMPLES, UNION_EXEMPLE } from '../lib/reseau-exemples';
import { CarteReseau } from './Reseau';

/* LE MONDE AIME : l'accueil du site, le site officiel de l'union (la planche Main de la maquette). Une page pour chaque personne qui la fait vivre : les mariés, les prestataires, les invités. */
const W = (s: string) => '/media/wedding/' + s + '.jpg';
const DIAPOS = [
  { src: W('piscine'), who: 'Camille & Gabriel', where: 'Piscine du motel, 18 h 12', alt: 'Un couple de mariés au bord de la piscine d’un motel dans le désert' },
  { src: W('supermarche'), who: 'Les mariés', where: 'Rayon frais, 11 h 40', alt: 'Une mariée pousse un caddie fleuri dans les rayons d’un supermarché' },
  { src: W('laverie'), who: 'Les invités', where: 'Laverie automatique, cycle 40°', alt: 'Les mariés assis sur des machines à laver, entourés d’invités' },
  { src: W('wagon'), who: 'Le maître d’hôtel', where: 'Wagon-restaurant, entre deux tunnels', alt: 'Les mariés dans un wagon-restaurant devant des montagnes enneigées' },
  { src: '/media/sous-la-mer.jpg', who: 'L’officiant', where: 'Sous la mer, 20 h', alt: 'Une cérémonie sous un dôme vitré entouré de poissons' },
  { src: '/media/scene.jpg', who: 'Le DJ', where: 'Le club, 2 h 17', alt: 'Les mariés s’embrassent au milieu d’une piste de danse éclairée en rose' },
  { src: '/media/phare.jpg', who: 'Le photographe', where: 'Le phare, marée haute', alt: 'Un couple au pied d’un phare face à la mer agitée au coucher du soleil' },
  { src: '/media/facade.jpg', who: 'Le chauffeur', where: 'Las Vegas, 23 h 59', alt: 'Une limousine blanche devant une chapelle de mariage illuminée à Las Vegas' },
];
const UNIONS = [
  { nom: UNION_EXEMPLE, ou: 'Motel dans le désert', src: W('union-camille-gabriel'), alt: 'Un couple danse sous les étoiles devant un motel du désert' },
  { nom: 'Inès & Hugo', ou: 'Toits de Paris', src: W('union-ines-hugo'), alt: 'Un couple sur un balcon face aux toits de Paris et à la tour Eiffel' },
  { nom: 'Lou & Marius', ou: 'Cinéma de quartier', src: W('union-lou-marius'), alt: 'Un couple de mariés sur la scène d’un cinéma au rideau rouge' },
];
const INVITES = [
  { nom: 'Les témoins', ou: 'Ceux qui étaient là depuis le début', src: W('invites-temoins'), alt: 'Des invités trinquent dans une cour éclairée de guirlandes' },
  { nom: 'La table 7', ou: 'Vue sur la mer', src: W('invites-table-7'), alt: 'Une longue table dressée sur une terrasse face à la mer' },
  { nom: 'Les copains de fac', ou: 'Arrivés à la dernière minute', src: W('invites-copains'), alt: 'Un groupe d’amis rit dans une rue pavée' },
];
const COLLECTIONS = [
  { nom: 'Châteaux & bals', ou: 'Pierre, lustres et feux de Bengale', src: W('collection-chateaux'), alt: 'Un bal de mariage devant un château illuminé' },
  { nom: 'Nuits électro', ou: 'Jusqu’au lever du jour', src: W('collection-electro'), alt: 'Des mariés s’embrassent sur une piste de danse aux néons' },
  { nom: 'Bord de mer', ou: 'Falaises, vent et sel', src: W('collection-mer'), alt: 'Une table de mariage près d’une bergerie au-dessus de la mer' },
  { nom: 'Forêts & jardins', ou: 'Sous les arbres', src: W('collection-forets'), alt: 'Une cérémonie dans l’allée de tilleuls d’un château' },
];
const PLACES = [
  ['01', 'J’organise', 'Les mariés', 'La page de votre union : votre histoire, votre jour, et tout ce que vous voulez partager.'],
  ['02', 'Je coordonne', 'Organisateurs, témoins', 'Chacun voit ce qui le concerne, au bon moment, sans rien perdre du reste.'],
  ['03', 'Je contribue', 'Les prestataires', 'Votre page vitrine et le module pensé pour votre métier.'],
  ['04', 'Je participe', 'Les invités', 'Votre place dans l’union : vos souvenirs, vos messages, vos photos.'],
];
const FAMILLES = ['La cérémonie', 'La table', 'La musique', 'L’image', 'La scène'];

function Figure({ x, ratio = '4 / 5' }: { x: { nom: string; ou: string; src: string; alt: string }; ratio?: string }) {
  return (
    <figure style={{ margin: 0 }}>
      <div style={{ aspectRatio: ratio, borderRadius: 10, overflow: 'hidden', background: '#E4E4E1' }}><img src={x.src} alt={x.alt} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>
      <figcaption style={{ marginTop: 14 }}><span style={{ display: 'block', fontSize: 22, fontWeight: 600, letterSpacing: '-0.03em' }}>{x.nom}</span><span style={{ fontSize: 15, color: '#55555A' }}>{x.ou}</span></figcaption>
    </figure>
  );
}
/* L'en-tête d'une section, comme sur la maquette : le grand mot au centre, une phrase dessous. */
function Entete({ id, sur, texte, lien }: { id: string; sur: string; titre?: string; texte: string; lien?: [string, string] }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 56 }}>
      <h2 id={id} className="grand-mot">{sur}</h2>
      <p style={{ margin: '18px auto 0', maxWidth: '32rem', fontSize: 'clamp(18px, 1.7vw, 24px)', lineHeight: 1.35 }}>{texte}</p>
      {lien && <Lien className="bouton" href={lien[1]} style={{ marginTop: 24 }}>{lien[0]}</Lien>}
    </div>
  );
}
const Fleche = ({ d }: { d: string }) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d={d} /></svg>;

/* les univers de la Métamorphose : leurs visuels passent en tête du diaporama */
type Diapo = { src: string; who: string; where: string; alt: string };
const UNIVERS_M: (UniversM & { diapos: Diapo[] })[] = [
  { id: 'desert', nom: 'Désert', vignette: W('piscine'), diapos: [DIAPOS[0], { src: W('union-camille-gabriel'), who: 'Les mariés', where: 'Sous les étoiles du motel', alt: UNIONS[0].alt }] },
  { id: 'chateau', nom: 'Château', vignette: W('collection-chateaux'), diapos: [{ src: W('collection-chateaux'), who: 'Le bal', where: 'Au pied du château', alt: COLLECTIONS[0].alt }] },
  { id: 'electro', nom: 'Électro', vignette: W('collection-electro'), diapos: [{ src: W('collection-electro'), who: 'La piste', where: 'Jusqu’au lever du jour', alt: COLLECTIONS[1].alt }, DIAPOS[5]] },
  { id: 'mer', nom: 'Bord de mer', vignette: W('collection-mer'), diapos: [{ src: W('collection-mer'), who: 'La table', where: 'Au-dessus de la mer', alt: COLLECTIONS[2].alt }, DIAPOS[6], { src: W('invites-table-7'), who: 'La table 7', where: 'Vue sur la mer', alt: INVITES[1].alt }, DIAPOS[4]] },
  { id: 'foret', nom: 'Jardins', vignette: W('collection-forets'), diapos: [{ src: W('collection-forets'), who: 'La cérémonie', where: 'L’allée de tilleuls', alt: COLLECTIONS[3].alt }, { src: W('invites-temoins'), who: 'Les témoins', where: 'La cour aux guirlandes', alt: INVITES[0].alt }] },
  { id: 'paris', nom: 'Paris', vignette: W('union-ines-hugo'), diapos: [{ src: W('union-ines-hugo'), who: 'Inès & Hugo', where: 'Les toits de Paris', alt: UNIONS[1].alt }, { src: W('invites-copains'), who: 'Les copains de fac', where: 'Une rue pavée', alt: INVITES[2].alt }] },
  { id: 'insolite', nom: 'Insolite', vignette: W('laverie'), diapos: [DIAPOS[1], DIAPOS[2], DIAPOS[3], DIAPOS[7]] },
];
const S = (n: string) => '/media/studio/' + n + '.jpg';
const STUDIO = [
  { src: S('dessiner'), titre: 'Dessiner', texte: 'Un patron qui vous ressemble : les initiales des mariés, une couronne de fleurs, la date. Rendu réaliste, case par case.', alt: 'Le Studio : une initiale botanique brodée au point de croix, entourée de fleurs roses' },
  { src: S('fils'), titre: 'Les fils dans le dock', texte: 'Chaque fil DMC du motif, avec son anneau de progression et l’état du stock. Un geste pour changer de fil.', alt: 'Le Studio : les fils DMC du motif en pastilles dans le dock du bas' },
  { src: S('patron'), titre: 'Le patron', texte: 'Réaliste, à plat ou en symboles : la même grille, lue comme vous brodez.', alt: 'Le Studio : le motif affiché en symboles de patron' },
  { src: S('progression'), titre: 'La progression', texte: 'La timeline du patron, fil par fil, se remplit à mesure que vous brodez. Le cercle du dock montre où vous en êtes.', alt: 'Le Studio : la timeline du patron dans le dock du bas, couleur par couleur' },
  { src: S('puzzle-pdf'), titre: 'Le puzzle PDF', texte: 'Un patron en plusieurs pages ? Les pages se recomposent sur une table magnétique, les raccords et les couleurs DMC se vérifient.', alt: 'Le Studio : un patron PDF recomposé sur la table de montage magnétique' },
  { src: S('inviter'), titre: 'Inviter à rejoindre la grille', texte: 'Le rond du profil porte un « + » : quelqu’un regarde l’ouvrage en direct, depuis son appareil.', alt: 'Le Studio : le bloc « Inviter à rejoindre la grille » ouvert sous le dock du haut' },
];
const NOUVEAU = [
  ['Le puzzle PDF magnétique', 'Les pages d’un patron se recomposent en une seule grille, raccords contrôlés.'],
  ['Les fils dans le dock', 'Progression et stock de chaque fil, sans panneau qui encombre.'],
  ['La timeline du patron', 'Ce qui est brodé, ce qui reste, couleur par couleur.'],
  ['Chercher en français', '« rouge », « vert foncé » : le nuancier DMC répond, même en anglais.'],
  ['Partout, sans rien perdre', 'Vos ouvrages se rangent dans votre espace AIME et vous suivent d’un appareil à l’autre.'],
];
const APLUS = [
  ['01', 'Votre vitrine', 'Votre page dans le Réseau : vos photos, vos vidéos, les unions où vous êtes crédité.'],
  ['02', 'Votre module', 'Les briques de la Grille 44 pensées pour votre métier : ce que vous voyez, faites et partagez.'],
  ['03', 'Devis et factures', 'Préparés dans votre espace, retrouvés par les mariés dans le leur.'],
  ['04', 'Vos modèles', 'Les gabarits de votre métier et les modèles de site au thème de votre domaine, à reprendre dans le Studio.'],
  ['05', 'Vendre et louer', 'Vos créations dans la Boutique, reliées à votre profil.'],
];

/* le grand carrousel du Studio : des captures réelles de l'atelier, une utilisation par vue */
function CarrouselStudio({ reduit }: { reduit: boolean }) {
  const [k, setK] = useState(0);
  const [lecture, setLecture] = useState(!reduit);
  useEffect(() => { if (reduit) setLecture(false); }, [reduit]);
  useEffect(() => { if (!lecture) return; const t = setInterval(() => setK(n => (n + 1) % STUDIO.length), 7000); return () => clearInterval(t); }, [lecture]);
  const s = STUDIO[k];
  const rond = { width: 48, height: 48, padding: 0, borderRadius: '50%', border: '1px solid #0B0B0C', background: '#fff', color: '#0B0B0C', display: 'flex', alignItems: 'center', justifyContent: 'center' } as const;
  return (
    <div className="carrousel-studio" role="region" aria-roledescription="carrousel" aria-label="Le Studio en six vues">
      <div className="carrousel-ecran">
        {STUDIO.map((x, n) => <img key={x.src} src={x.src} alt={n === k ? x.alt : ''} aria-hidden={n !== k} loading="lazy" style={{ opacity: n === k ? 1 : 0 }} />)}
      </div>
      <div className="carrousel-legende">
        <p aria-live="polite" style={{ margin: 0 }}><span style={{ display: 'block', fontSize: 13, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase', color: '#55555A' }}>{String(k + 1).padStart(2, '0')} / {String(STUDIO.length).padStart(2, '0')}</span>
          <span style={{ display: 'block', marginTop: 4, fontSize: 'clamp(22px, 2.4vw, 34px)', fontWeight: 600, letterSpacing: '-0.025em' }}>{s.titre}</span>
          <span style={{ display: 'block', marginTop: 6, maxWidth: '46ch', fontSize: 17, lineHeight: 1.45, color: '#3A3A3F' }}>{s.texte}</span></p>
        <span style={{ display: 'flex', gap: 8, flex: 'none' }}>
          <button type="button" style={rond} aria-label="Vue précédente" onClick={() => setK((k - 1 + STUDIO.length) % STUDIO.length)}><Fleche d="M15 5l-7 7 7 7" /></button>
          <button type="button" style={rond} aria-label={lecture ? 'Mettre le carrousel en pause' : 'Relancer le carrousel'} onClick={() => setLecture(l => !l)}>{lecture ? <Fleche d="M8 5v14M16 5v14" /> : <Fleche d="M8 5l11 7-11 7z" />}</button>
          <button type="button" style={rond} aria-label="Vue suivante" onClick={() => setK((k + 1) % STUDIO.length)}><Fleche d="M9 5l7 7-7 7" /></button>
        </span>
      </div>
      <div className="carrousel-points" role="group" aria-label="Choisir une vue">{STUDIO.map((x, n) => <button key={x.src} type="button" aria-current={n === k ? 'true' : undefined} aria-label={x.titre} onClick={() => { setK(n); setLecture(false); }}>{x.titre}</button>)}</div>
      <p style={{ margin: '10px 0 0', fontSize: 13, color: '#55555A' }}>Captures du Studio.</p>
    </div>
  );
}

export default function LeMondeAime() {
  const [meta, setMeta] = useMeta();
  const [panneau, setPanneau] = useState(false);
  const perso = estTransformee(meta);
  const theme = UNIVERS_M.find(u => u.id === meta.univers);
  const diapos = useMemo(() => { const t = theme ? theme.diapos : []; return [...t, ...DIAPOS.filter(x => !t.some(y => y.src === x.src))]; }, [theme]);
  const [i, setI] = useState(0);
  useEffect(() => setI(0), [meta.univers]);
  const confort = useConfort();
  const [lecture, setLecture] = useState(() => confort.mouvement !== 'reduit');
  useEffect(() => { if (confort.mouvement === 'reduit') setLecture(false); }, [confort.mouvement]);
  const [famille, setFamille] = useState<string | null>(null);
  useEffect(() => { if (!lecture) return; const t = setInterval(() => setI(n => (n + 1) % diapos.length), 6000); return () => clearInterval(t); }, [lecture, diapos.length]);
  const d = diapos[i % diapos.length];
  const cherches = meta.presta.length ? EXEMPLES.filter(e => meta.presta.includes(e.slug)) : EXEMPLES.filter(e => e.domaine === 'mariage');
  const presta = cherches.filter(e => !famille || e.famille === famille);
  const noms = [meta.a.trim(), meta.b.trim()].filter(Boolean).join(' & ');
  const titre = noms || 'Le Monde AIME';
  const taille = titre.length <= 14 ? 'clamp(52px, 11.6vw, 200px)' : 'clamp(40px, ' + Math.max(5, 162 / titre.length).toFixed(1) + 'vw, 200px)';
  const bouton = { width: 48, height: 48, padding: 0, borderRadius: '50%', border: '1px solid rgba(255,255,255,.7)', background: 'rgba(255,255,255,.08)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' } as const;
  const cle = meta.ordre.filter(id => !meta.cachees.includes(id)).join(',');
  const visibles = useMemo(() => (cle ? cle.split(',') : []) as SectionId[], [cle]);
  const lieux = useMemo(() => visibles.map(id => [id, SECTIONS.find(s => s[0] === id)![1]] as [string, string]), [visibles]);

  const SECTION: Record<SectionId, (classe: string) => ReactNode> = {
    unions: c => <section id="unions" aria-labelledby="titre-unions" className={c}>
      <Entete id="titre-unions" sur="Unions" texte="Les pages des mariés. Chaque couple raconte son union à sa façon." lien={['Créer la page de notre union', '/point-zero?q=Nous%20nous%20marions']} />
      <div className="grille-auto" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '40px 24px' }}>{UNIONS.map(u => <Figure key={u.nom} x={u} />)}</div>
    </section>,
    prestataires: c => <section id="prestataires" aria-labelledby="titre-presta" className={c}>
      <Entete id="titre-presta" sur="Prestataires" texte={meta.presta.length ? 'Les prestataires que vous cherchez, avec leur page vitrine et leur module.' : 'Une page vitrine et un module pensé pour chaque métier de l’union.'} lien={['Tous les prestataires', '/reseau?domaine=mariage']} />
      <div role="group" aria-label="Filtrer par famille" className="rangee-puces" style={{ marginBottom: 32 }}>
        {[null, ...FAMILLES].map(f => { const on = famille === f, n = cherches.filter(e => !f || e.famille === f).length; if (f && !n) return null;
          return <button key={f || 'tous'} type="button" aria-pressed={on} onClick={() => setFamille(f)} style={{ flex: 'none', minHeight: 44, padding: '0 18px', borderRadius: 999, border: '1px solid #0B0B0C', background: on ? '#0B0B0C' : '#fff', color: on ? '#fff' : '#0B0B0C', fontSize: 15, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>{f || 'Tous'}<span style={{ fontSize: 12 }}>{n}</span></button>; })}
      </div>
      <ul className="cartes ligne" tabIndex={0} aria-label="Les prestataires, à faire défiler">
        {presta.map(e => <li key={e.slug} style={{ flexBasis: 'min(70vw, 280px)' }}><CarteReseau c={{ href: '/reseau/' + e.slug, nom: e.nom, etiquette: e.famille, photo: e.photo, alt: e.alt, exemple: true, fiche: { nom: e.nom, bio: e.texte }, credit: e.union ? 'Crédité dans ' + UNION_EXEMPLE : null }} /></li>)}
      </ul>
    </section>,
    studio: c => <section id="studio" aria-labelledby="titre-studio" className={c}>
      <Entete id="titre-studio" sur="Studio" texte="Le Studio d’AIME : tout se crée dans une grille. Il commence par la broderie, du premier motif à la dernière croix." />
      <CarrouselStudio reduit={confort.mouvement === 'reduit'} />
      <div style={{ marginTop: 28, display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}><Lien className="bouton noir" href="/studio/atelier">Ouvrir le Studio</Lien><Lien className="bouton" href="/studio/boutique">Les patrons à broder</Lien></div>
      <div className="bande-sombre">
        <p className="surtitre" style={{ color: 'rgba(255,255,255,.65)' }}>Le fil qui relie</p>
        <h3 className="titre" style={{ maxWidth: '18ch', color: '#fff' }}>Brodez votre mariage ensemble.</h3>
        <p className="chapeau" style={{ color: 'rgba(255,255,255,.8)' }}>Les initiales des mariés, la date, le mouchoir, le coussin des alliances : brodés à plusieurs, chacun chez soi, sur la même grille.</p>
        <ul className="ensemble">
          <li><b>Inviter à regarder</b><span>Une personne suit l’ouvrage en direct, en lecture seule. Le patron reste sur votre appareil.</span></li>
          <li><b>À plusieurs, partie par partie <span className="bientot" style={{ background: '#fff', color: '#0B0B0C' }}>Bientôt</span></b><span>Un même patron découpé en parties qui s’ouvrent à leur date : chacun avance, le fil commun montre les progrès de tous.</span></li>
          <li><b>Commenter sur la grille <span className="bientot" style={{ background: '#fff', color: '#0B0B0C' }}>Bientôt</span></b><span>Une petite orbe posée sur une case ouvre l’échange, là où se trouve la croix dont on parle.</span></li>
        </ul>
        <p className="surtitre" style={{ marginTop: 48, color: 'rgba(255,255,255,.65)' }}>Nouveau · pensé pour les brodeuses</p>
        <ol className="nouveau">{NOUVEAU.map(([t, x], k) => <li key={t}><span>{String(k + 1).padStart(2, '0')}</span><b>{t}</b><p>{x}</p></li>)}</ol>
      </div>
    </section>,
    invites: c => <section id="invites" aria-labelledby="titre-invites" className={c}>
      <Entete id="titre-invites" sur="Invités" texte="Les témoins, la table 7, les copains de fac. Chaque invité a sa page, ses souvenirs et sa place dans l’histoire." />
      <div className="grille-auto" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '40px 24px' }}>{INVITES.map(u => <Figure key={u.nom} x={u} ratio="4 / 3" />)}</div>
    </section>,
    collections: c => <section id="collections" aria-labelledby="titre-collections" className={c}>
      <Entete id="titre-collections" sur="Collections" texte="Explorer les unions par univers." />
      <ul className="cartes ligne" tabIndex={0} aria-label="Les collections, à faire défiler">{COLLECTIONS.map(x => <li key={x.nom}><Figure x={x} ratio="4 / 3" /></li>)}</ul>
    </section>,
    boutique: c => <section id="boutique" aria-labelledby="titre-boutique-acc" className={c}>
      <Entete id="titre-boutique-acc" sur="Boutique" texte="Ce que les artisans de l’union créent, vendent ou louent." lien={['Toute la boutique', '/boutique']} />
      <ul className="cartes ligne" tabIndex={0} aria-label="Des créations, à faire défiler">{CREATIONS.filter((_, k) => k % 2 === 0).map(x => <li key={x.id} style={{ flexBasis: 'min(70vw, 280px)' }}><CarteCreation c={x} /></li>)}</ul>
    </section>,
    chacun: c => <section id="chacun" aria-labelledby="titre-chacun" className={c}>
      <p className="surtitre">Une page pour chacun</p>
      <h2 id="titre-chacun" className="titre" style={{ maxWidth: '22ch' }}>On ne peut pas tout être au même moment. Mais on peut être bien plus qu’une seule chose.</h2>
      <ol style={{ listStyle: 'none', margin: '56px 0 0', padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: '40px 32px' }}>
        {PLACES.map(([n, t, q, x]) => <li key={n} style={{ borderTop: '1px solid #0B0B0C', paddingTop: 18 }}><p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#55555A' }}>{n} · {q}</p><h3 style={{ margin: '6px 0 10px', fontSize: 24, fontWeight: 600 }}>{t}</h3><p className="texte">{x}</p></li>)}
      </ol>
    </section>,
    espace: c => <section id="espace" aria-labelledby="titre-espace" className={c}>
      <Entete id="titre-espace" sur="L’Espace" texte="Un seul endroit pour tout. Les mêmes dossiers pour tout le monde, prêts dès l’arrivée : vos projets, votre profil, vos documents, et tout ce qu’il faut pour commencer." />
      <ApercuEspace />
      <p style={{ margin: '18px 0 0', fontSize: 15, color: '#55555A', textAlign: 'center' }}>Aperçu. Projets et Profil sont déjà dans votre espace ; Documents, Ressources, Prestataires, Tutoriels, Design System et A+ y arrivent.</p>
      <div style={{ marginTop: 28, display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}><Lien className="bouton noir" href="/buro">Ouvrir mon espace</Lien><Lien className="bouton" href="/studio/atelier">Ouvrir le Studio</Lien></div>
    </section>,
    aplus: c => <section id="aplus" aria-labelledby="titre-aplus" className={c}>
      <Entete id="titre-aplus" sur="A+" texte="Pour celles et ceux qui font l’union. Tout est déjà préparé dans votre espace : il ne reste qu’à y mettre votre métier." />
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))', gap: '40px 28px' }}>
        {APLUS.map(([n, t, x]) => <li key={n} style={{ borderTop: '1px solid #0B0B0C', paddingTop: 18 }}><p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#55555A' }}>{n}</p><h3 style={{ margin: '6px 0 10px', fontSize: 24, fontWeight: 600 }}>{t}</h3><p className="texte">{x}</p></li>)}
      </ol>
      <div style={{ marginTop: 40, display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}><Lien className="bouton noir" href="/a-plus">Découvrir A+</Lien><span style={{ fontSize: 15, color: '#55555A' }}>A+ ouvre bientôt.</span></div>
    </section>,
  };

  return (
    <>
      <a className="lien-evitement" href="#contenu">Aller au contenu</a>
      <Tete courant="/" verbes={<VerbesSite />} />
      <main id="contenu">
        <section aria-labelledby="titre-wedding" style={{ padding: '40px var(--marge) 0', textAlign: 'center' }}>
          <p style={{ margin: '0 0 18px', fontSize: 16 }}>{noms ? <><b style={{ fontWeight: 600 }}>Notre union</b>{meta.date.trim() && <> · {meta.date.trim()}</>}</> : <>Une union d’exemple · <b style={{ fontWeight: 600 }}>{UNION_EXEMPLE}</b></>}</p>
          <h1 id="titre-wedding" className="signature" style={{ fontSize: taille, overflowWrap: 'anywhere' }}>{titre}</h1>
          <p style={{ margin: '22px auto 0', maxWidth: '40rem', fontSize: 'clamp(17px, 1.5vw, 21px)', lineHeight: 1.45, color: '#3A3A3F' }}>Le site officiel de l’union. Une page pour chaque personne qui la fait vivre : les mariés, les prestataires, les invités.</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px 22px', marginTop: 22, flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span aria-hidden="true" style={{ display: 'flex' }}>{EXEMPLES.slice(0, 5).map((e, k) => <img key={e.slug} src={e.photo} alt="" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', objectPosition: 'center 22%', border: '2px solid #F6F6F4', marginLeft: k ? -10 : 0 }} />)}</span>
              <a href="#prestataires" style={{ fontSize: 18, fontWeight: 600, textUnderlineOffset: 4 }}>Les mariés et toute l’équipe de l’union</a>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button type="button" className="bouton-meta" aria-expanded={panneau} onClick={() => setPanneau(o => !o)}><Orbe taille={32} />{perso ? 'Ma version · modifier' : 'Métamorphoser la page'}</button>
              {perso && <button type="button" className="opt" style={{ fontWeight: 600 }} onClick={() => setMeta(null)}>Page de tous</button>}
            </span>
          </div>
          <div style={{ position: 'relative', marginTop: 44, height: 'clamp(24rem, 54vw, 50rem)', borderRadius: 10, overflow: 'hidden', background: '#111', textAlign: 'left' }}>
            {diapos.map((x, k) => <img key={x.src} src={x.src} alt={k === i ? x.alt : ''} aria-hidden={k !== i} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: k === i ? 1 : 0, transition: 'opacity .9s ease' }} />)}
            <div aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '46%', background: 'linear-gradient(to top, rgba(0,0,0,.65), rgba(0,0,0,0))' }} />
            <div style={{ position: 'absolute', left: 'clamp(16px, 3vw, 40px)', right: 'clamp(16px, 3vw, 40px)', bottom: 'clamp(18px, 3vw, 36px)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', color: '#fff' }}>
              <p aria-live="polite" style={{ margin: 0 }}><span style={{ display: 'block', fontSize: 13, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase' }}>{String(i + 1).padStart(2, '0')} / {String(diapos.length).padStart(2, '0')} · {d.who}</span><span style={{ display: 'block', marginTop: 6, fontSize: 'clamp(22px, 2.6vw, 38px)', fontWeight: 600, letterSpacing: '-0.02em' }}>{d.where}</span></p>
              <span style={{ display: 'flex', gap: 8 }}>
                <button type="button" style={bouton} aria-label="Photo précédente" onClick={() => setI((i - 1 + diapos.length) % diapos.length)}><Fleche d="M15 5l-7 7 7 7" /></button>
                <button type="button" style={bouton} aria-label={lecture ? 'Mettre le diaporama en pause' : 'Relancer le diaporama'} onClick={() => setLecture(l => !l)}>{lecture ? <Fleche d="M8 5v14M16 5v14" /> : <Fleche d="M8 5l11 7-11 7z" />}</button>
                <button type="button" style={bouton} aria-label="Photo suivante" onClick={() => setI((i + 1) % diapos.length)}><Fleche d="M9 5l7 7-7 7" /></button>
              </span>
            </div>
          </div>
        </section>

        {visibles.map((id, k) => <div key={id} style={{ display: 'contents' }}>{SECTION[id]('section' + (k % 2 ? ' blanche' : '') + (k === 0 ? ' premiere' : ''))}</div>)}
      </main>
      <DockBas lieux={lieux} modes={[{ id: 'jourj', nom: 'Jour J', halo: '#F5B754', progres: (i + 1) / diapos.length, rendu: () => <>
        {diapos.map((x, k) => <button key={x.src} type="button" className="lieu" aria-current={k === i ? 'true' : 'false'} onClick={() => { setI(k); setLecture(false); window.scrollTo({ top: 0, behavior: confort.mouvement === 'reduit' ? 'auto' : 'smooth' }); }}
          style={{ flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: 0, lineHeight: 1.15 }}>
          <span style={{ fontSize: 12, opacity: .75 }}>{String(k + 1).padStart(2, '0')} · {x.who}</span><span style={{ fontSize: 14 }}>{x.where}</span>
        </button>)}
      </> }]} />
      <Pied />
      {panneau && <Metamorphose m={meta} set={setMeta} univers={UNIVERS_M} fermer={() => setPanneau(false)} />}
    </>
  );
}
