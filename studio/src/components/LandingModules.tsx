import { useMemo, useState, type ReactNode } from "react";
import { GROUPS } from "./landingTools";
import SymbolIcon from "./SymbolIcon";
import CardDeck from "./CardDeck";
import { createPattern, ensurePalette, computeStats, consumptionCm, assignedSymbol, type Pattern } from "../lib/pattern";
import { FLOSS, flossIndex } from "../lib/dmc";
import { nearestColors, deltaELabel } from "../lib/colorScience";
import { activityGrid } from "../lib/sessionStats";
import type { Session } from "../lib/pattern";
import { runChecks } from "../lib/checks";
import { reflectPoint } from "../lib/stitch";
import { SYMBOLS } from "../lib/symbols";

/**
 * La landing en modules.
 *
 * Chaque module porte un nom, une promesse d'une ligne et une grille de cartes.
 * Une carte est vivante quand elle peut l'être : elle monte le vrai composant
 * ou appelle la vraie fonction, sur un motif de démonstration clairement annoncé
 * comme tel. Ce qui n'existe pas encore n'a pas de carte : le module SAL porte
 * un badge « en construction » et montre seulement le jeu de 54 cartes, qui lui
 * existe.
 *
 * Rien ici n'invente une fonction : chaque carte vivante cite, en commentaire,
 * le fichier dont elle sort.
 */

/* ------------------------------------------------------------------ */
/*  Motif de démonstration                                             */
/* ------------------------------------------------------------------ */

function demoPattern(): Pattern {
  const p = createPattern("Démonstration", 24, 18, 14, 2);
  const codes = ["321", "3801", "939", "727"];
  for (const c of codes) ensurePalette(p, flossIndex(c));
  // Les cases stockent des indices de fil DMC, pas des positions de palette :
  // c'est ainsi que l'atelier entier compte, la palette ne servant qu'à l'ordre
  // de la légende.
  for (let y = 3; y < 9; y += 1) for (let x = 3; x < 13; x += 1) p.cross[y * p.w + x] = flossIndex("321");
  for (let y = 9; y < 14; y += 1) for (let x = 6; x < 18; x += 1) p.cross[y * p.w + x] = flossIndex("3801");
  for (let y = 4; y < 7; y += 1) for (let x = 15; x < 21; x += 1) p.cross[y * p.w + x] = flossIndex("939");
  for (let x = 3; x < 21; x += 1) p.fwd[15 * p.w + x] = flossIndex("727");
  return p;
}

/* ------------------------------------------------------------------ */
/*  Cartes vivantes                                                    */
/* ------------------------------------------------------------------ */

/** Les vrais pictos de la landing, dont un seul respire : la cible du guide
    (animation réelle, index.css `[data-coach="on"]`). */
function LivePulse() {
  const tools = GROUPS.flatMap((g) => g.tools).slice(0, 6);
  return (
    <div>
      <div className="flex items-end gap-3 rounded-[12px] bg-white/[0.04] p-3">
        {tools.map((t, i) => (
          <span key={t.name} className="tool-demo flex-1 text-accent-2" data-coach={i === 2 ? "on" : undefined} title={t.name}>
            {t.icon}
          </span>
        ))}
      </div>
      <p className="live-note mt-2">Six pictos réels, une seule cible qui respire : c'est ainsi que le guide montre un outil.</p>
    </div>
  );
}

/** Une vraie ligne de légende : symbole affecté, code, métrage (pattern.ts). */
function LiveLegend() {
  const p = useMemo(demoPattern, []);
  const { rows } = useMemo(() => computeStats(p), [p]);
  // Une légende ne liste que les fils réellement posés : les teintes par
  // défaut d'une grille neuve n'ont rien à y faire.
  const posed = rows.filter((r) => r.cross + r.half + r.quarter > 0);
  return (
    <ul className="live-legend">
      {posed.slice(0, 4).map((r) => (
        <li key={r.idx} className="flex items-center gap-2.5 rounded-[10px] bg-white/[0.04] px-2.5 py-1.5">
          <span className="h-10 w-10 shrink-0 rounded-[10px]" style={{ background: r.hex }} />
          <SymbolIcon sym={assignedSymbol(p, r.idx)} size={15} />
          <span className="font-mono text-[12px] text-label">{r.code}</span>
          <span className="flex-1 truncate text-[11.5px] text-label-3">{r.name}</span>
          <span className="font-mono text-[11px] text-label-2">{(consumptionCm(r, p, p.strands) / 100).toFixed(1)} m</span>
        </li>
      ))}
    </ul>
  );
}

/** La substitution réelle : trois plus proches, écart dit (colorScience.ts). */
function LiveSubstitution() {
  const target = FLOSS[flossIndex("321")];
  const near = useMemo(
    () => nearestColors(target.lab, FLOSS.filter((f) => f.code !== target.code), 3),
    [target],
  );
  return (
    <ul className="space-y-1.5">
      {near.map((n) => (
        <li key={n.code} className="flex items-center gap-2.5 rounded-[10px] bg-white/[0.04] px-2.5 py-1.5">
          <span className="h-10 w-10 shrink-0 rounded-[10px]" style={{ background: n.hex }} />
          <span className="font-mono text-[12px] text-label">{n.code}</span>
          <span className="flex-1 text-[11.5px] text-label-3">ΔE00 {n.deltaE.toFixed(1)} · {deltaELabel(n.deltaE)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Le vrai calendrier d'activité, sur des sessions de démonstration. */
function LiveCalendar() {
  const grid = useMemo(() => {
    const now = new Date();
    const sessions: Session[] = [];
    for (let i = 2; i < 80; i += 1) {
      if (i % 3 === 0) continue;
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      sessions.push({ date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`, seconds: 900 + ((i * 397) % 2400), cells: 40 + ((i * 61) % 160) });
    }
    return activityGrid(sessions, 91, now);
  }, []);
  return (
    <div>
      <div className="cal-grid" role="img" aria-label={`Calendrier d'activité : ${grid.activeDays} jours de broderie sur la fenêtre affichée`}>
        {grid.days.map((d) => (
          <span key={d.date} data-level={d.level} data-today={d.today || undefined} title={`${d.date} · ${d.cells} cases`} />
        ))}
      </div>
      <p className="live-note mt-2">{grid.activeDays} jours actifs, {grid.totalMinutes} minutes — l'échelle suit votre meilleure journée, pas une moyenne imaginaire.</p>
    </div>
  );
}

/** Les vrais auto-tests du moteur, exécutés depuis la landing (checks.ts). */
function LiveChecks() {
  const [results, setResults] = useState<ReturnType<typeof runChecks> | null>(null);
  return (
    <div>
      <button type="button" className="btn-quiet w-full" onClick={() => setResults(runChecks())}>
        Exécuter les tests du moteur
      </button>
      {results && (
        <p className="mt-2 text-[11.5px] leading-relaxed text-label-2">
          {results.filter((r) => r.ok).length}/{results.length} vérifications passent, dans votre navigateur, sans serveur.
        </p>
      )}
    </div>
  );
}

/** La symétrie réelle : un point et ses reflets (editing.ts). */
function LiveSymmetry() {
  const p = { w: 9, h: 7 };
  const q = { x: 2, y: 1 };
  const pts = [q, reflectPoint(p, q, "x"), reflectPoint(p, q, "y"), reflectPoint(p, q, "xy")];
  return (
    <svg viewBox="0 0 9 7" className="w-full rounded-[10px] bg-white/[0.04]" aria-label="Un point posé en haut à gauche, reflété sur les deux axes">
      {Array.from({ length: 10 }, (_, x) => (
        <path key={`v${x}`} d={`M${x} 0 V7`} stroke="rgba(255,255,255,.07)" strokeWidth=".03" />
      ))}
      {Array.from({ length: 8 }, (_, y) => (
        <path key={`h${y}`} d={`M0 ${y} H9`} stroke="rgba(255,255,255,.07)" strokeWidth=".03" />
      ))}
      {pts.map((r, i) => (
        <g key={i} stroke={i === 0 ? "var(--color-accent)" : "var(--color-accent-2)"} strokeWidth=".12">
          <path d={`M${r.x + .2} ${r.y + .2} L${r.x + .8} ${r.y + .8}`} />
          <path d={`M${r.x + .8} ${r.y + .2} L${r.x + .2} ${r.y + .8}`} />
        </g>
      ))}
    </svg>
  );
}

/** La bibliothèque de glyphes, tirée au sort à chaque survol : 504 signes. */
function LiveGlyphs() {
  const [i, setI] = useState(0);
  return (
    <button type="button" className="flex w-full items-center justify-center gap-3 rounded-[10px] bg-white/[0.04] py-3" onClick={() => setI((v) => (v + 37) % SYMBOLS.length)} aria-label="Voir un autre glyphe de la bibliothèque">
      <SymbolIcon sym={i} size={30} color="var(--color-accent-2)" />
      <span className="font-mono text-[11px] text-label-3">glyphe {i + 1} / {SYMBOLS.length}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Emblèmes comptés                                                   */
/* ------------------------------------------------------------------ */

function Emblem({ rows }: { rows: string[] }) {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={h * 11} height={h * 11} className="emblem" aria-hidden="true">
      {rows.flatMap((row, y) =>
        [...row].map((ch, x) =>
          ch === "X" ? (
            <g key={`${x}-${y}`} className="emblem-x">
              <path d={`M${x + .18} ${y + .18} L${x + .82} ${y + .82}`} />
              <path d={`M${x + .82} ${y + .18} L${x + .18} ${y + .82}`} />
            </g>
          ) : ch === "o" ? (
            <circle key={`${x}-${y}`} className="emblem-o" cx={x + .5} cy={y + .5} r={.26} />
          ) : null,
        ),
      )}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Les neuf modules                                                   */
/* ------------------------------------------------------------------ */

interface Card {
  title: string;
  body?: string;
  live?: ReactNode;
  wide?: boolean;
}
interface Module {
  id: string;
  name: string;
  promise: string;
  emblem: string[];
  built: boolean;
  cards: Card[];
}

const MODULES: Module[] = [
  {
    id: "atelier",
    name: "L'Atelier",
    promise: "La grille obéit au geste.",
    emblem: ["X.X", ".X.", "X.X"],
    built: true,
    cards: [
      { title: "Un pictogramme qui respire", body: "Le dock réel, avec sa cible animée : le guide montre un outil à la fois, et le groupe « plus » s'ouvre quand il y pointe.", live: <LivePulse />, wide: true },
      { title: "Symétrie sur trois axes", body: "Un point posé à gauche se reflète à droite, en bas, aux deux — remplissage et formes compris.", live: <LiveSymmetry /> },
      { title: "Vingt-six outils, dix derrière le « plus »", body: "Croix, demi, quart, trois-quarts, petite croix, perle, arrière, lancé, nœud, formes, lasso, déplacement, lettrage." },
      { title: "Calques qui regardent sans gêner", body: "Visibles, verrouillables, et « calque actif seul » pour ne voir que ce qu'on pose." },
      { title: "Annuler geste par geste", body: "Un trait entier disparaît d'un coup, pas pixel par pixel." },
      { title: "Trois vues", body: "Réel, aplat, symboles : le même motif, trois lectures, une touche." },
      { title: "Écrire en cases, pas en pixels", body: "Alphabet compté 5 × 7, posé depuis le panneau Projet avec une échelle." },
      { title: "Le doigt fait défiler, le stylet dessine", body: "Le réglage stylet seul : la main nue navigue, le crayon pose." },
    ],
  },
  {
    id: "fil",
    name: "Le Fil",
    promise: "Vos écheveaux, vos règles.",
    emblem: ["o.o", ".X.", "o.o"],
    built: true,
    cards: [
      { title: "Une vraie ligne de légende", body: "Symbole affecté, code DMC, nom et métrage calculé sur un motif de démonstration.", live: <LiveLegend />, wide: true },
      { title: "« Je n'ai pas ce fil »", body: "Trois plus proches en CIEDE2000, avec l'écart dit en clair — jamais un code imposé.", live: <LiveSubstitution />, wide: true },
      { title: "489 références DMC", body: "Codes, noms, hex et lab, chargés une fois et conservés localement." },
      { title: "Mélanger deux fils, garder la recette", body: "Un mélange est une identité : il se relit, s'imprime, se partage." },
      { title: "Six correspondances de marques", body: "Diamant DMC, Perler, Hama, Artkal, MARD, Nabbi — le motif reste en DMC, sa langue." },
      { title: "La bonne perle, une teinte approchée", body: "1 288 Miyuki Delica mesurées, et la limite affichée telle quelle." },
      { title: "504 symboles réaffectables", body: "Deux fils peuvent échanger leur signe ; l'impression suit.", live: <LiveGlyphs /> },
      { title: "Stock, écheveaux, liste d'achats", body: "Ce que vous possédez déduit ce qu'il manque, tous projets confondus." },
    ],
  },
  {
    id: "lecteur",
    name: "Le Lecteur",
    promise: "Un patron du commerce devient le vôtre.",
    emblem: ["XX.", "X..", "XXX"],
    built: true,
    cards: [
      { title: "Symboles lus dans le vecteur", body: "La légende vote : le glyphe isolé à gauche du code, les quantités à droite se taisent." },
      { title: "Le pas vient des axes", body: "L'échelle se déduit des nombres alignés, pas de la densité des symboles." },
      { title: "L'ordre des pages sort de la numérotation", body: "Chaque page est placée en coordonnées absolues : aucune mosaïque à deviner." },
      { title: "Si le texte manque", body: "Blocs calés aux quatre coins, puis table de montage qui s'aimante aux bords des voisins." },
      { title: "Une photo devient un motif réalisable", body: "Tramage Floyd–Steinberg dans l'espace des fils disponibles, calculé hors du fil principal." },
      { title: "OXS relu, JSON retrouvé", body: "Ce qui entre ressort intact : symboles, perles, quadrants, provenance." },
    ],
  },
  {
    id: "imprimeur",
    name: "L'Imprimeur",
    promise: "Ce que vous imprimez est ce que vous brodez.",
    emblem: ["XXX", "X.X", "XXX"],
    built: true,
    cards: [
      { title: "Pages A4 ou Letter, recouvrement compris", body: "Blocs de 40 cases, bandes grisées de chevauchement, index des pages." },
      { title: "Une règle de 10 cm à mesurer", body: "Imprimée en couverture : si elle ne fait pas 10 cm, rien d'autre n'est juste." },
      { title: "Ornements et légende, jamais vides", body: "La page d'ornements n'est imprimée que si le motif en contient." },
      { title: "Correspondances imprimées, licence citée", body: "La page de la marque réellement employée, avec sa licence à elle." },
      { title: "SVG vectoriel, seuil annoncé", body: "Au-delà de 90 000 cases les symboles sautent, et la légende le dit." },
      { title: "Aperçu du PDF réel", body: "Avant d'envoyer ou d'imprimer, le document tel qu'il sortira." },
    ],
  },
  {
    id: "compagnon",
    name: "Le Compagnon",
    promise: "Reprenez exactement là.",
    emblem: ["X.X", "ooo", "X.X"],
    built: true,
    cards: [
      { title: "Treize semaines de votre régularité", body: "Le calendrier réel, sur des sessions de démonstration : l'échelle suit votre meilleure journée.", live: <LiveCalendar />, wide: true },
      { title: "Case, ligne, bloc de dix", body: "Le suivi coche comme on compte vraiment : par rangées et par carrés." },
      { title: "Garer un fil au coin", body: "Retouchez le même emplacement et le fil est libéré ; rien ne se perd." },
      { title: "Les erreurs comptées à part", body: "« À défaire » signale sans effacer : la reprise attend son moment." },
      { title: "Une estimation de fin, depuis votre cadence", body: "Vos sessions disent votre vitesse ; l'atelier n'invente pas la sienne." },
      { title: "Annotations épinglées à leur case", body: "Une note posée sur la grille se retrouve à sa place." },
    ],
  },
  {
    id: "guide",
    name: "Le Guide",
    promise: "Il montre, vous faites.",
    emblem: [".X.", "XXX", ".X."],
    built: true,
    cards: [
      { title: "Une étape à la fois", body: "Un seul pictogramme respire, un mémo court, et l'étape attend le geste réel." },
      { title: "Deux pistes", body: "Créer et Broder : le guide suit le mode courant, il ne l'impose jamais." },
      { title: "Posez la question", body: "54 réponses écrites depuis le source, hors ligne ; hors sujet, « je ne sais pas »." },
      { title: "Échappe masque, la boussole rouvre", body: "Fermer le mémo n'efface rien : la progression attend votre retour." },
    ],
  },
  {
    id: "confort",
    name: "Le Confort",
    promise: "Réglé une fois, oublié toujours.",
    emblem: ["o.o", "ooo", ".o."],
    built: true,
    cards: [
      { title: "Contraste élevé, grands textes", body: "Deux rendus du même atelier, pour les yeux fatigués et les lumières fortes." },
      { title: "L'écran reste éveillé", body: "Pendant que vous brodez, la tablette ne s'endort pas." },
      { title: "Sens des demi-points imposé", body: "Avant ou arrière : une zone entière suit le sens choisi." },
      { title: "Marge, unités, toile sur un ou deux fils", body: "Aïda, binca, lin, evenweave, de 7 à 40 ct — et le calcul suit." },
      { title: "Brins et gaspillage réglables", body: "L'estimation de métrage dit ses hypothèses, pas un chiffre nu." },
      { title: "Annonces de case", body: "Pour lecteur d'écran : chaque case posée se dit à voix haute." },
    ],
  },
  {
    id: "lien",
    name: "Le Lien",
    promise: "Vos projets n'appartiennent qu'à vous.",
    emblem: ["X.o", ".X.", "o.X"],
    built: true,
    cards: [
      { title: "Le moteur se teste devant vous", body: "Les auto-tests du moteur, exécutés dans votre navigateur, sans serveur.", live: <LiveChecks />, wide: true },
      { title: "Inviter par un code, montrer sans donner la main", body: "Le pair voit en direct et n'écrit jamais : l'hôte reste auteur." },
      { title: "Tout local", body: "Pas de compte, pas d'abonnement, pas d'analytique. Vos projets restent dans votre navigateur." },
      { title: "Provenance et droits affichés", body: "Un patron importé garde son auteur et sa licence ; l'atelier le répète à l'export." },
      { title: "Fusionner les croix isolées, annulable", body: "Le nettoyage contrôlé prévient : une croix isolée peut être un détail voulu." },
      { title: "Bibliothèques, dossiers, versions", body: "L'étagère de projets, locale elle aussi." },
    ],
  },
  {
    id: "sal",
    name: "Le Jeu de 54",
    promise: "Une année de broderie, carte après carte.",
    emblem: ["XXX", "XoX", "XXX"],
    built: false,
    cards: [
      {
        title: "52 semaines et 2 repos",
        body: "Un jeu de cartes à broder : chaque carte porte le glyphe de sa semaine. Mélangé au départ, il se range en un clic — par saison, ou par semaine de saison. Les deux rangements veulent dire quelque chose.",
        live: <CardDeck />,
        wide: true,
      },
      {
        title: "Le même jeu pour le puzzle d'import",
        body: "Les blocs d'un patron PDF découpé deviennent des cartes : « ranger par rangée » ou « par colonne » cesse d'être un réglage et devient un geste qui remet le motif d'aplomb.",
      },
      {
        title: "Le stitch-along, chacune chez soi",
        body: "Un calendrier commun, la cadence déduite de vos vraies sessions, et l'écart du groupe en rangées. Les semaines manquées décalent, elles ne culpabilisent pas.",
      },
      {
        title: "Synchronisé, si vous le voulez",
        body: "Un serveur optionnel portera l'avancement de chacune. Sans lui, tout reste hors ligne : l'atelier ne perd rien, le SAL attend.",
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Section                                                            */
/* ------------------------------------------------------------------ */

export default function LandingModules({ onOpen }: { onOpen: () => void }) {
  return (
    <section id="modules" className="scroll-m-16 border-t border-white/[0.07] bg-[#0c0c0f] px-5 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-[1180px]">
        <p className="text-[12px] font-semibold tracking-[.14em] text-accent-2 uppercase">Neuf modules</p>
        <h2 className="mt-4 max-w-[760px] text-[clamp(28px,3.6vw,46px)] leading-[1.05] font-semibold tracking-[-0.04em]">
          Chaque fonction de l'atelier, présentée là où elle sert.
        </h2>
        <p className="mt-5 max-w-[640px] text-[15px] leading-[1.6] text-label-2">
          Les cartes vivantes montent le vrai composant ou appellent la vraie fonction, sur un motif de
          démonstration annoncé comme tel. Ce qui n'existe pas encore n'a pas de carte : c'est le contrat de
          cette page.
        </p>

        <div className="mt-16 space-y-24 sm:space-y-32">
          {MODULES.map((m) => (
            <article key={m.id} data-module={m.id} className="scroll-m-20">
              <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:gap-8">
                <Emblem rows={m.emblem} />
                <div className="flex-1">
                  <h3 className="text-[clamp(24px,3vw,38px)] leading-tight font-semibold tracking-[-0.035em]">
                    {m.name}
                    {!m.built && (
                      <span className="ml-3 rounded-full bg-warn/15 px-2.5 py-1 align-middle text-[11px] font-semibold text-warn">
                        en construction
                      </span>
                    )}
                  </h3>
                  <p className="mt-1.5 text-[15px] text-label-2">{m.promise}</p>
                </div>
                <button type="button" onClick={onOpen} className="btn-quiet shrink-0">
                  {m.built ? "L'essayer" : "Suivre le chantier"}
                </button>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {m.cards.map((c) => (
                  <div key={c.title} className={`rounded-[16px] border border-white/[0.07] bg-white/[0.025] p-4 ${c.wide ? "lg:col-span-2" : ""}`}>
                    <h4 className="text-[14.5px] font-semibold tracking-[-0.01em]">{c.title}</h4>
                    {c.body && <p className="mt-1.5 text-[12.5px] leading-[1.55] text-label-2">{c.body}</p>}
                    {c.live && <div className="mt-3">{c.live}</div>}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
