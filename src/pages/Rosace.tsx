import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Tete, Pied } from '../charte/Charte';
import { Lien, useRecherche } from '../lib/router';
import DisqueOne from '../../studio/src/components/one/DisqueOne';
import type { ModePoint } from '../../studio/src/lib/point/modes';
import { DIMENSIONS, type Choix, type Recette, type Signature } from '../../studio/src/lib/motif5d/code';
import { FLOSS } from '../../studio/src/lib/dmc';
import { cm, duree } from '../../studio/src/lib/cadre';
import { patternToSvg } from '../../studio/src/lib/svg';
import { mouvementReduit } from '../../studio/src/components/edition/defilement';
import ToileRosace from '../rosace/ToileRosace';
import GalerieRosaces from '../rosace/GalerieRosaces';
import { COLLECTION_ROSACES, prochaineRosace, type RosaceCollection } from '../rosace/collection';
import { useConfortPartage } from '../rosace/useConfortPartage';
import { calculerRosace, changerDimension, lienAtelier, RECETTE_INITIALE, varier } from '../rosace/modele';
import '../rosace/rosace.css';

const I = ({ children }: { children: ReactNode }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
const ICONES: Record<string, ReactNode> = {
  rosaces: <I><circle cx="12" cy="12" r="8.5" /><circle cx="8.5" cy="8.5" r="1.4" /><circle cx="15.5" cy="8.5" r="1.4" /><circle cx="8.5" cy="15.5" r="1.4" /><circle cx="15.5" cy="15.5" r="1.4" /></I>,
  precedente: <I><path d="M19 12H5M11 6l-6 6 6 6" /></I>,
  suivante: <I><path d="M5 12h14M13 6l6 6-6 6" /></I>,
  collection: <I><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></I>,
  formes: <I><circle cx="12" cy="12" r="8.5" /><path d="M12 3.5c4 4 4 13 0 17M3.5 12c4-4 13-4 17 0" /><circle cx="12" cy="12" r="2" /></I>,
  cinq: <I><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" /></I>,
  fils: <I><path d="M12 3a9 9 0 1 0 0 18c1.8 0 2.8-.8 2-2.1-.8-1.2.2-2.5 1.6-2.5H17a4 4 0 0 0 4-4C21 7 17 3 12 3Z" /><circle cx="7.5" cy="10" r=".8" /><circle cx="10" cy="6.8" r=".8" /><circle cx="14.5" cy="7" r=".8" /><circle cx="17" cy="10.5" r=".8" /></I>,
  points: <I><rect x="3.5" y="3.5" width="17" height="17" rx="1" /><path d="M9 3.5v17M15 3.5v17M3.5 9h17M3.5 15h17" /></I>,
  cadre: <I><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5M8 12h8M12 8v8" /></I>,
  lecture: <I><circle cx="10.5" cy="10.5" r="6" /><path d="m15 15 5 5M8 10.5h5M10.5 8v5" /></I>,
};

const NOMS_DIMENSIONS: Record<keyof Signature, string> = { structure: 'Forme', trace: 'Tracé', densite: 'Densité', echelle: 'Échelle', palette: 'Palette' };
const LECTURES = [
  ['01', 'Formes', 'Rosaces, anneaux et géométries.'],
  ['02', '5D', 'Cinq choix, une seule recette.'],
  ['03', 'Fils DMC', 'Les couleurs réelles de cette composition.'],
  ['04', 'Points', 'Les cases qui formeront la broderie.'],
  ['05', 'Cadre', 'La toile et les mesures estimées.'],
  ['06', 'Lecture', 'Le patron, à poursuivre dans l’atelier.'],
];

const nombre = (n: number) => new Intl.NumberFormat('fr-FR').format(n);
const allerSection = (id: string) => {
  const cible = document.getElementById(id);
  cible?.scrollIntoView({ behavior: mouvementReduit() || document.documentElement.classList.contains('calme') ? 'auto' : 'smooth', block: 'start' });
  cible?.querySelector<HTMLElement>('h2, h1')?.focus({ preventScroll: true });
};

export default function Rosace() {
  // Dans AIME SYSTEM, la page garde tout son contenu mais partage la navigation globale de l'hôte.
  const recherche = useRecherche();
  const dansSystem = new URLSearchParams(recherche).get('apercu') === 'system' && (() => {
    try { return window.parent !== window && window.parent.location.origin === window.location.origin && window.parent.location.pathname.replace(/\/+$/, '') === '/system'; }
    catch { return false; }
  })();
  useConfortPartage(dansSystem);
  // Depuis l'aperçu, l'atelier s'ouvre dans la page hôte, pas dans un cadre étriqué.
  const cibleHote = dansSystem ? '_parent' : undefined;
  const [recette, setRecette] = useState<Recette>(RECETTE_INITIALE);
  const [fil, setFil] = useState<number | null>(null);
  const [dimension, setDimension] = useState(0);
  const [vue, setVue] = useState<'croix' | 'grille'>('croix');
  const [rotation, setRotation] = useState(0);
  const [progression, setProgression] = useState(1);
  const [annonce, setAnnonce] = useState('');
  const animation = useRef(0);
  const donnees = useMemo(() => calculerRosace(recette), [recette]);
  const { pattern, controle, cadre, statistiques, code } = donnees;
  const filActif = fil !== null && pattern.palette.includes(fil) ? fil : null;
  const couleur = filActif === null ? null : statistiques.rows.find(r => r.idx === filActif) ?? null;
  const atelier = lienAtelier(recette);
  const svgPatron = useMemo(() => patternToSvg(pattern, { bw: true, grid: true, symbols: true, legend: true }).svg, [pattern]);
  const imagePatron = useMemo(() => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgPatron), [svgPatron]);
  useEffect(() => () => cancelAnimationFrame(animation.current), []);

  const choisirDimension = useCallback((cle: keyof Signature, valeur: Choix) => {
    cancelAnimationFrame(animation.current); setProgression(1); setFil(null);
    setRecette(r => changerDimension(r, cle, valeur));
    const d = DIMENSIONS.find(x => x.cle === cle)!;
    setAnnonce(`${NOMS_DIMENSIONS[cle]} : ${d.reponses[valeur][0]}. La recette, les fils et le patron sont actualisés.`);
  }, []);
  const autre = useCallback(() => {
    cancelAnimationFrame(animation.current); setProgression(1); setFil(null);
    setRecette(r => varier(r)); setAnnonce('Une nouvelle variation de la même signature est calculée.');
  }, []);
  const selectionnerRosace = (entree: RosaceCollection, depuisGalerie = false) => {
    cancelAnimationFrame(animation.current); setProgression(1); setFil(null); setRotation(0); setRecette(entree.recette);
    setAnnonce(`${entree.nom}, rosace ${entree.numero} sur 64 : la recette est chargée dans le Disque et les autres lectures.`);
    if (depuisGalerie) allerSection('instrument');
  };
  const parcourir = (direction: -1 | 1) => selectionnerRosace(prochaineRosace(code, direction));
  const naissance = () => {
    cancelAnimationFrame(animation.current);
    if (mouvementReduit() || document.documentElement.classList.contains('calme')) {
      setProgression(1); setAnnonce('Mouvement réduit : la rosace est présentée complète.'); return;
    }
    setProgression(0); setAnnonce('La rosace se construit, du centre vers les anneaux.');
    const debut = performance.now();
    const image = (t: number) => {
      if (mouvementReduit() || document.documentElement.classList.contains('calme')) {
        setProgression(1); setAnnonce('Mouvement réduit : la rosace est présentée complète.'); return;
      }
      const p = Math.min(1, (t - debut) / 2200); setProgression(p); if (p < 1) animation.current = requestAnimationFrame(image);
    };
    animation.current = requestAnimationFrame(image);
  };
  const choixFil = (idx: number) => { const selection = filActif !== idx; setFil(selection ? idx : null); setAnnonce(selection ? `DMC ${FLOSS[idx].code} : sélection de lecture, sans modifier le motif.` : 'Tous les fils sont visibles.'); };
  const familleDimension = (cle: keyof Signature): ModePoint => {
    const d = DIMENSIONS.find(x => x.cle === cle)!;
    return { id: 'dim-' + cle, nom: NOMS_DIMENSIONS[cle], aide: `${d.question} Actuellement : ${d.reponses[recette.signature[cle]][0]}.`, groupe: 'metier', ouvrir: () => {},
      enfants: () => d.reponses.map(([nom, aide], i): ModePoint => ({ id: `${cle}-${i}`, nom, aide, groupe: 'metier', actif: recette.signature[cle] === i, resteOuvert: true, ouvrir: () => choisirDimension(cle, i as Choix) })) };
  };
  const modes: ModePoint[] = [
    { id: 'rosaces', nom: 'Rosaces', icone: ICONES.rosaces, aide: 'parcourir ou choisir une des 64 rosaces dans le Disque', groupe: 'metier', ouvrir: () => {},
      enfants: () => [
        { id: 'rosace-precedente', nom: 'Précédente', icone: ICONES.precedente, aide: 'afficher la rosace précédente de la collection', groupe: 'metier', resteOuvert: true, annonceEnPropre: true, ouvrir: () => parcourir(-1) },
        { id: 'rosace-suivante', nom: 'Suivante', icone: ICONES.suivante, aide: 'afficher la rosace suivante de la collection', groupe: 'metier', resteOuvert: true, annonceEnPropre: true, ouvrir: () => parcourir(1) },
        { id: 'rosace-choisir', nom: 'Les 64', icone: ICONES.collection, aide: 'choisir une rosace numérotée, par pages', groupe: 'metier', ouvrir: () => {},
          enfants: () => COLLECTION_ROSACES.map((r): ModePoint => ({ id: 'rosace-' + r.numero, nom: r.nom, valeur: String(r.numero).padStart(2, '0'),
            aide: `rosace ${r.numero} sur 64, recette ${r.code}`, groupe: 'metier', actif: r.code === code, resteOuvert: true, annonceEnPropre: true, ouvrir: () => selectionnerRosace(r) })) },
        { id: 'rosace-grille', nom: 'La grille', icone: ICONES.points, aide: 'voir les 64 rosaces plus bas sur la page', groupe: 'metier', ouvrir: () => allerSection('formes') },
      ] },
    { id: 'formes', nom: 'Formes', icone: ICONES.formes, aide: 'choisir la forme ou calculer une variation', groupe: 'metier', ouvrir: () => {},
      enfants: () => [...familleDimension('structure').enfants!(), { id: 'variation', nom: 'Variation', aide: 'calculer une autre variation de la même signature', groupe: 'creation', resteOuvert: true, ouvrir: autre }] },
    { id: '5d', nom: '5D', icone: ICONES.cinq, aide: 'tracé, densité, échelle et palette ; la forme est dans Formes', groupe: 'metier', ouvrir: () => {},
      enfants: () => (['trace', 'densite', 'echelle', 'palette'] as const).map(familleDimension) },
    { id: 'fils', nom: 'Fils DMC', icone: ICONES.fils, aide: 'mettre en lumière un fil de la rosace, sans le remplacer', groupe: 'metier', ouvrir: () => {},
      enfants: () => [{ id: 'tous-fils', nom: 'Tous', aide: 'montrer tous les fils', groupe: 'metier', actif: filActif === null, resteOuvert: true, annonceEnPropre: true, ouvrir: () => { setFil(null); setAnnonce('Tous les fils sont visibles.'); } },
        ...pattern.palette.map((idx): ModePoint => ({ id: 'fil-' + FLOSS[idx].code, nom: 'DMC ' + FLOSS[idx].code, aide: FLOSS[idx].name + ' ; mettre ce fil en lumière', groupe: 'metier', couleur: FLOSS[idx].hex, actif: filActif === idx, resteOuvert: true, ouvrir: () => choixFil(idx) }))] },
    { id: 'points', nom: 'Points', icone: ICONES.points, aide: vue === 'croix' ? 'voir les cases de la grille' : 'revenir à la vue en croix', groupe: 'metier', actif: vue === 'grille', resteOuvert: true, ouvrir: () => setVue(v => v === 'croix' ? 'grille' : 'croix') },
    { id: 'cadre', nom: 'Cadre', icone: ICONES.cadre, aide: 'voir les mesures de ce motif plus bas', groupe: 'metier', ouvrir: () => allerSection('cadre') },
    { id: 'lecture', nom: 'Lecture', icone: ICONES.lecture, aide: 'voir l’aperçu du patron plus bas', groupe: 'metier', ouvrir: () => allerSection('lecture') },
  ];

  const d = DIMENSIONS[dimension];
  return <>
    <a className="lien-evitement" href="#contenu">Aller au contenu</a>
    {!dansSystem && <Tete courant="/projets/brode-way" />}
    <main id="contenu" className="ros-page">
      <section className="ros-hero" id="instrument" aria-labelledby="ros-titre">
        <div className="ros-topline">{dansSystem ? <a href="/projets/brode-way" target="_parent">← Broderie · LE MONDE AIME</a> : <Lien href="/projets/brode-way">← Broderie · LE MONDE AIME</Lien>}<span>UN INSTRUMENT À BRODER</span><a href={atelier} target={cibleHote}>L’atelier ↗</a></div>
        <div className="ros-masthead">
          <p className="ros-kicker"><span className="ros-diamond" /> LE MONDE AIME PRÉSENTE <span className="ros-diamond" /></p>
          <h1 id="ros-titre" tabIndex={-1}>ROSACE<span aria-hidden="true">.</span></h1>
          <p className="ros-signature">Chaque fil dessine un monde.</p>
        </div>
        <div className="ros-scene">
          <div className="ros-scene-note ros-scene-note-gauche"><span>01 — L’INSTRUMENT</span><p>Un point.<br />Puis tout un monde.</p><i aria-hidden="true">✳</i></div>
          <div className="ros-disque">
            <DisqueOne contexte="rosace-signature" max={780} bois={false} etiquette="Le Disque ROSACE : les lectures d’une même recette"
              modes={modes} centre={<div className="ros-centre-motif" style={{ transform: `rotate(${rotation}deg)` }}><ToileRosace pattern={pattern} vue={vue} fil={filActif} progression={progression} marge={.94} etiquette={`Aperçu de la recette ${code}, ${pattern.w} par ${pattern.h} points${couleur ? `, fil DMC ${couleur.code} mis en lumière` : ''}`} /></div>} />
          </div>
          <div className="ros-scene-note ros-scene-note-droite"><span>LA RECETTE EN COURS</span><p>{pattern.w} × {pattern.h}<br /><small>points sur la toile</small></p><div className="ros-mini-fils" aria-hidden="true">{pattern.palette.map(idx => <i key={idx} style={{ background: FLOSS[idx].hex }} />)}</div><code data-testid="code-rosace">{code}</code></div>
        </div>
        <div className="ros-hero-commandes" role="group" aria-label="Agir sur l’aperçu">
          <button type="button" onClick={autre}><span aria-hidden="true">✳</span> Une variation</button>
          <button type="button" onClick={() => { setRotation(a => (a + 22.5) % 360); setAnnonce('La vue tourne ; la grille et la recette restent inchangées.'); }}><span aria-hidden="true">↻</span> Tourner la vue</button>
          <button type="button" onClick={naissance}><span aria-hidden="true">◌</span> Voir naître</button>
        </div>
        <p className="ros-indication">Dans le cercle, « Rosaces » parcourt la collection. La rotation concerne seulement l’aperçu.</p>
        <div className="ros-hero-actions"><a className="ros-bouton ros-bouton-noir" href={atelier} target={cibleHote}>Créer ma rosace <span aria-hidden="true">↗</span></a><a className="ros-lien" href="#disques">Explorer les Disques <span aria-hidden="true">↓</span></a></div>
        <p className="ros-entree-note">La recette s’ouvre en aperçu dans l’atelier. Aucun ouvrage n’est créé avant votre choix.</p>
        <span className="sr-only" role="status" aria-live="polite">{annonce}</span>
      </section>

      <section className="ros-manifeste ros-section" id="disques" aria-labelledby="ros-disques-titre">
        <div className="ros-section-label"><span>01 / LE CERCLE</span><span>UNE FORME, PLUSIEURS LECTURES</span></div>
        <div className="ros-manifeste-texte"><div className="ros-petit-soleil" aria-hidden="true">✳</div><h2 id="ros-disques-titre" tabIndex={-1}>Un seul cercle.<br /><em>Des mondes à explorer.</em></h2><p>Une forme, des fils, une grille. Le Disque change de regard, jamais de matière : toutes ses lectures partent de la même rosace.</p></div>
        <ol className="ros-lectures">{LECTURES.map(([num, nom, texte]) => <li key={num}><span>{num}</span><h3>{nom}</h3><p>{texte}</p></li>)}</ol>
        <p className="ros-lectures-note">Dans cette page : le mode Rosaces parcourt 64 compositions ; formes et 5D se composent, les fils se sélectionnent en lecture, les points et le Cadre se découvrent. Loupe, suivi et modification libre des fils restent dans l’atelier.</p>
      </section>

      <section className="ros-section ros-galerie" id="formes" aria-labelledby="ros-galerie-titre">
        <div className="ros-section-label"><span>02 / LES FORMES</span><span>COMPOSITIONS CALCULÉES</span></div>
        <div className="ros-heading-row"><div><p className="ros-eyebrow">LE CERCLE COMME POINT DE DÉPART</p><h2 id="ros-galerie-titre" tabIndex={-1}>64 rosaces,<br /><em>autant de possibles.</em></h2></div><p>Trois recettes nommées du Studio et 61 compositions de cette page, toutes calculées par le moteur 5D. Choisissez-en une : elle prend place dans le Disque et toutes les lectures.</p></div>
        <div className="ros-galerie-guide"><p>Parcourez avec les flèches ou la touche Tabulation. Chaque vignette ouvre sa recette dans le Disque.</p><a href="#cinq-dimensions" onClick={e => { e.preventDefault(); allerSection('cinq-dimensions'); }}>Passer la galerie ↓</a></div>
        <GalerieRosaces choisir={r => selectionnerRosace(r, true)} codeActif={code} />
      </section>

      <section className="ros-section ros-cinq" id="cinq-dimensions" aria-labelledby="ros-cinq-titre">
        <div className="ros-section-label"><span>03 / LE SYSTÈME 5D</span><span>UNE RECETTE VIVANTE</span></div>
        <div className="ros-cinq-grid">
          <div className="ros-cinq-image"><div className="ros-cinq-cercle"><ToileRosace pattern={pattern} fil={filActif} etiquette={`Motif de la recette ${code}`} /></div><div className="ros-cinq-caption"><span>VOTRE COMPOSITION ACTUELLE</span><code>{code}</code></div></div>
          <div className="ros-cinq-texte"><p className="ros-eyebrow">CINQ DIMENSIONS, UNE MULTITUDE DE POSSIBLES</p><h2 id="ros-cinq-titre" tabIndex={-1}>Dessiner avec<br /><em>cinq intentions.</em></h2><p>La forme accueille le tracé, la densité, l’échelle et la palette. Modifiez un choix : la même recette se redessine partout.</p>
            <div className="ros-dimensions" role="group" aria-label="Choisir une dimension 5D">
              {DIMENSIONS.map((item, i) => <button type="button" key={item.cle} aria-pressed={dimension === i} data-dimension={item.cle} onClick={() => setDimension(i)}><span>0{i + 1}</span>{NOMS_DIMENSIONS[item.cle]}</button>)}
            </div>
            <div className="ros-choix-tete"><span>0{dimension + 1} / 05</span><h3>{d.question}</h3></div>
            <div className="ros-choix" role="group" aria-label={'Choix : ' + NOMS_DIMENSIONS[d.cle]}>
              {d.reponses.map(([nom, aide], i) => <button type="button" key={nom} aria-pressed={recette.signature[d.cle] === i} title={aide} onClick={() => choisirDimension(d.cle, i as Choix)}>{nom}<span aria-hidden="true">{recette.signature[d.cle] === i ? '●' : '○'}</span></button>)}
            </div>
            <p className="ros-fineprint">Format proposé : {pattern.w} × {pattern.h} points selon la forme. L’échelle règle le détail ; le Cadre de l’atelier permet d’adapter les dimensions.</p>
            {controle.ajustements.length > 0 && <p className="ros-ajustement">Ajustement du moteur : {controle.ajustements.join(' ')}</p>}
          </div>
        </div>
      </section>

      <section className="ros-section ros-fils" id="fils" aria-labelledby="ros-fils-titre">
        <div className="ros-section-label"><span>04 / LES FILS</span><span>NUANCIER DMC</span></div>
        <div className="ros-fils-grid"><div className="ros-fils-texte"><p className="ros-eyebrow">LA COULEUR A UN NOM</p><h2 id="ros-fils-titre" tabIndex={-1}>Des fils qui<br /><em>se répondent.</em></h2><p>Chaque couleur de cette rosace correspond à une référence DMC. Touchez un fil pour le mettre en lumière dans les aperçus.</p><a className="ros-lien" href={atelier} target={cibleHote}>Continuer avec cette recette <span aria-hidden="true">↗</span></a><p className="ros-fineprint">La sélection est une lecture, pas un remplacement. Après « Broder ce motif », le nuancier est accessible dans l’atelier. Les couleurs à l’écran sont approximatives : vérifiez sur un nuancier physique.</p></div>
          <div className="ros-fil-instrument"><div className="ros-fil-roue" role="group" aria-label="Fils DMC de la recette actuelle">
            <svg viewBox="0 0 300 300" aria-hidden="true"><circle cx="150" cy="150" r="105" fill="none" stroke="#d7cebe" strokeWidth=".7" />{pattern.palette.map((idx, i) => <circle key={idx} cx="150" cy="150" r="105" fill="none" stroke={FLOSS[idx].hex} strokeWidth="8" pathLength="100" strokeDasharray={`${Math.max(0, 100 / pattern.palette.length - 1.3)} 100`} strokeDashoffset={-100 * i / pattern.palette.length} transform="rotate(-90 150 150)" />)}</svg>
            {pattern.palette.map((idx, i) => { const angle = (i / pattern.palette.length * 360 - 90) * Math.PI / 180; return <button key={idx} type="button" className="ros-fil-bouton" data-dmc={FLOSS[idx].code} aria-label={`DMC ${FLOSS[idx].code} : ${FLOSS[idx].name}`} aria-pressed={filActif === idx} onClick={() => choixFil(idx)} style={{ left: `${50 + 35 * Math.cos(angle)}%`, top: `${50 + 35 * Math.sin(angle)}%`, background: FLOSS[idx].hex }} />; })}
            <div className="ros-fil-centre" aria-live="polite"><span>{couleur ? 'FIL SÉLECTIONNÉ' : 'LA PALETTE ACTUELLE'}</span><strong>{couleur ? 'DMC ' + couleur.code : pattern.palette.length + ' fils'}</strong><p>{couleur ? `${couleur.name} · ${nombre(couleur.cross)} croix` : 'Choisissez une couleur'}</p></div>
          </div><button type="button" className="ros-reset-fil" onClick={() => { setFil(null); setAnnonce('Tous les fils sont visibles.'); }} disabled={filActif === null}>Voir tous les fils <span aria-hidden="true">↗</span></button></div>
        </div>
      </section>

      <section className="ros-section ros-points" id="points" aria-labelledby="ros-points-titre">
        <div className="ros-section-label"><span>05 / DU DESSIN AU POINT</span><span>UNE MÊME DONNÉE</span></div>
        <div className="ros-points-grid"><div className="ros-points-texte"><p className="ros-eyebrow">LE MOTIF PREND CORPS</p><h2 id="ros-points-titre" tabIndex={-1}>De la géométrie<br /><em>à la grille.</em></h2><p>Ce que vous voyez n’est pas une image à convertir : le moteur compose déjà une grille de points, avec un fil DMC pour chaque case brodée.</p><div className="ros-vues" role="group" aria-label="Présentation du motif"><button type="button" aria-pressed={vue === 'croix'} onClick={() => setVue('croix')}>Les croix</button><button type="button" aria-pressed={vue === 'grille'} onClick={() => setVue('grille')}>La grille</button></div><p className="ros-fineprint">{nombre(controle.croix)} croix · {pattern.w} × {pattern.h} cases · {controle.fils} fils DMC{couleur ? ` · DMC ${couleur.code} en lumière` : ''}</p></div>
          <figure className="ros-grille-figure"><ToileRosace pattern={pattern} vue={vue} fil={filActif} marge={.9} etiquette={`${vue === 'grille' ? 'Grille' : 'Croix'} de la recette ${code}`} /><figcaption><span>FIG. 01 — {vue === 'grille' ? 'LA GRILLE' : 'LE POINT DE CROIX'}</span><span>{pattern.w} × {pattern.h}</span></figcaption></figure>
        </div>
      </section>

      <section className="ros-section ros-cadre" id="cadre" aria-labelledby="ros-cadre-titre">
        <div className="ros-section-label"><span>06 / LE CADRE</span><span>ESTIMATIONS DE L’OUVRAGE</span></div>
        <div className="ros-cadre-entete"><div><p className="ros-eyebrow">UNE IDÉE QUI PREND MESURE</p><h2 id="ros-cadre-titre" tabIndex={-1}>À taille <em>humaine.</em></h2></div><p>Des premières indications calculées avec les mesures du Cadre. La taille, la toile et les réglages se travaillent ensuite dans l’atelier.</p></div>
        <dl className="ros-mesures"><div><dt>FORMAT BRODÉ</dt><dd>{cm(cadre.cmL)}<span> × </span>{cm(cadre.cmH)}</dd><small>sur toile Aida {pattern.count}</small></div><div><dt>POINTS DE CROIX</dt><dd>{nombre(controle.croix)}</dd><small>{pattern.w} × {pattern.h} cases</small></div><div><dt>TEMPS ESTIMÉ</dt><dd>{duree(cadre.heures)}</dd><small>selon le modèle du Cadre</small></div><div><dt>ÉCHEVEAUX ESTIMÉS</dt><dd>{cadre.echeveaux}</dd><small>pour {cadre.fils} fils DMC</small></div></dl>
        <p className="ros-cadre-note">Dimensions du motif hors marge de toile. Temps et quantités sont des estimations, à adapter à votre manière de broder.</p>
      </section>

      <section className="ros-section ros-patron" id="lecture" aria-labelledby="ros-patron-titre">
        <div className="ros-section-label"><span>07 / LA LECTURE</span><span>LE PATRON</span></div>
        <div className="ros-patron-grid"><div className="ros-patron-texte"><p className="ros-eyebrow">LE CERCLE DEVIENT PATRON</p><h2 id="ros-patron-titre" tabIndex={-1}>Prête à suivre<br /><em>le fil ?</em></h2><p>La grille et ses symboles deviennent un langage à lire, point après point. Voici un aperçu du patron de votre recette actuelle.</p><a className="ros-bouton ros-bouton-noir" href={atelier} target={cibleHote}>Continuer dans l’atelier <span aria-hidden="true">↗</span></a><p className="ros-fineprint">Aperçu ici. La loupe, le zoom, le suivi et les fonctions de patron se trouvent dans l’atelier après « Broder ce motif ».</p></div>
          <figure className="ros-feuille"><div className="ros-feuille-tete"><span>ROSACE / POINT ZÉRO</span><span>01</span></div><img src={imagePatron} alt={`Aperçu du patron avec grille, symboles et légende pour la recette ${code}`} /><figcaption>APERÇU DU PATRON · {code}</figcaption></figure>
        </div>
      </section>

      <section className="ros-final" aria-labelledby="ros-final-titre"><div className="ros-final-orbite" aria-hidden="true"><span>✳</span></div><p className="ros-eyebrow">MAINTENANT, À VOUS</p><h2 id="ros-final-titre">Le plus beau reste<br /><em>à broder.</em></h2><p>Emportez cette recette dans le même atelier, ou commencez une composition depuis le début.</p><div className="ros-final-actions"><a className="ros-bouton ros-bouton-clair" href={atelier} target={cibleHote}>Ouvrir ma rosace <span aria-hidden="true">↗</span></a><a className="ros-lien ros-lien-clair" href="/studio/atelier?ouvrir=composer" target={cibleHote}>Composer depuis le début ↗</a></div><div className="ros-final-bas">{dansSystem ? <a href="/projets/brode-way" target="_parent">À propos de Brode Way ↗</a> : <Lien href="/projets/brode-way">À propos de Brode Way ↗</Lien>}<a href="/studio/fleur-du-ciel" target={cibleHote}>Découvrir La Fleur du Ciel ↗</a></div></section>
      <p className="ros-credits">Données couleur : <a href="https://github.com/makebead/craft-color-codes" target="_blank" rel="noopener noreferrer">craft-color-codes par MakeBead</a>, CC BY 4.0. Créations 5D : usage personnel.</p>
    </main>
    {!dansSystem && <Pied />}
  </>;
}
