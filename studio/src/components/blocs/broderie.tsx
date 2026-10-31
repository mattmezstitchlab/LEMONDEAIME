/**
 * Le type de bloc « broderie » : ses commandes pour le Point du bloc, en navigation progressive.
 * Premier cercle : les familles (Points, Broder, Fils, Affichage) et les fonctions du bloc (Loupe, Tout voir, Importer, Exporter, Guide).
 * Chaque famille remplace les choix du cercle par ses sous-outils ; chaque feuille appelle la vraie action de l'atelier (rien de simulé).
 * Le registre ne sait rien de la broderie, ce fichier si.
 */
import { Camera, Check, Lightbulb, ListTodo, Replace, Undo2, LayoutGrid, ListChecks, FileJson, FileText, Folder, HelpCircle, Image as ImageIcon, PanelBottom, Settings2, Share2, Compass, Download, Eye, FileUp, Grid3x3, Maximize, Palette, Pencil, Search, Shapes, Sparkles, Spool, Square, Crosshair } from "lucide-react";
import { enregistrerTypeBloc, typeBloc } from "../../lib/point/registre";
import type { ModePoint } from "../../lib/point/modes";
import type { ReactNode } from "react";
import type { Tool } from "../../lib/stitch";
import type { ViewMode } from "../Canvas";
import { FLOSS } from "../../lib/dmc";
import { FAMILLES, filsParFamille } from "../../lib/famillesFils";
import { ToolIcon } from "../ToolIcons";

export interface ContexteBroderie {
  outil: Tool;
  /** choisir un outil réel : l'atelier (Dessiner ou Broder) suit l'outil */
  choisirOutil: (t: Tool, atelier: "create" | "stitch") => void;
  /** l'index DMC du fil actif, et les fils du motif (index DMC) */
  couleur: number; filsDuMotif: number[];
  choisirFil: (idx: number) => void;
  vue: ViewMode; choisirVue: (v: ViewMode) => void;
  symboles: boolean; basculerSymboles: () => void;
  grille: "visible" | "masquee"; basculerGrille: () => void;
  loupe: boolean; basculerLoupe: () => void;
  toutVoir: () => void;
  /** le sélecteur de fichier, réglé sur un genre (ou tout ce qui s'importe) */
  importer: (genre?: "image" | "pdf" | "projet") => void;
  ouvrages: () => void; composer?: () => void;
  exporter: () => void; enregistrer: () => void; partager: () => void;
  filsEtToile: () => void; suivi: () => void;
  aide: () => void; chercher: () => void;
  guide?: () => void;
  /** revenir tout de suite au dock du bas (l'interface classique) */
  dockClassique?: () => void;
  /** remplacer un fil du motif par une autre nuance : aperçu sur le vrai motif (avec son historique), puis confirmer ou annuler */
  /** l'avancée réelle de chaque fil du motif (le suivi) : pour choisir la couleur à broder dans le cercle */
  avancee?: { idx: number; code: string; cells: number; done: number }[];
  /** le Guide lumineux : les suggestions de la prochaine étape (un point violet), activées ou non */
  suggestions?: { actives: boolean; basculer: () => void };
  remplacement?: { attente: { de: number; vers: number } | null; preparer: (de: number, vers: number) => void; confirmer: () => void; annuler: () => void };
  /** le Tambour vivant : filmer sa vraie toile et y poser ce patron (essai du Cadre-Tambour) */
  surMaToile?: () => void;
  /** le suivi dans le cercle : le prochain point de la couleur active (le montrer recentre la toile, rien n'est coché à la place de la personne) */
  prochain?: { code: string; reste: number; montrer: () => void };
}

/* les outils de dessin : les quatre premiers d'abord (le parcours le plus fréquent), le reste dans « Plus d'outils » */
const POINTS: [Tool, string, string][] = [["cross", "Croix", "le point de croix entier"], ["half", "Demi-point", "une demi-croix, dans le sens choisi"], ["back", "Point arrière", "un trait de contour, de coin à coin"], ["erase", "Gomme", "effacer des points"]];
const PLUS: [Tool, string][] = [["hand", "Main"], ["fill", "Remplir"], ["pick", "Pipette"], ["select", "Sélection"], ["quarter", "Quart"], ["threeQuarter", "Trois quarts"], ["petite", "Petite croix"], ["bead", "Perle"], ["knot", "Nœud"], ["long", "Point lancé"], ["line", "Ligne"], ["rect", "Rectangle"], ["ellipse", "Ellipse"], ["lasso", "Lasso"], ["move", "Déplacer"]];
const BRODER: [Tool, string, string][] = [["mark", "Marquer", "cocher les cases brodées"], ["block", "Bloc 10 × 10", "cocher un carré de dix sur dix"], ["row", "Ligne", "cocher une rangée"], ["unpick", "À défaire", "décocher des cases"], ["park", "Parking", "garer une aiguille sur une case"], ["hand", "Main", "déplacer la grille sans cocher"], ["pick", "Pipette", "prendre le fil d’une case"], ["details", "Détails", "le fil et la case sous le doigt"], ["note", "Note", "une note sur une case"]];
const VUES: [ViewMode, string, string, ReactNode][] = [["flat", "À plat", "les couleurs à plat", <Square aria-hidden="true" />], ["real", "Réaliste", "le rendu du fil sur la toile", <Sparkles aria-hidden="true" />], ["pattern", "Patron", "la grille à suivre, case par case", <Grid3x3 aria-hidden="true" />]];

/* Fils › Remplacer un fil : le fil du motif, puis sa famille, puis la nouvelle nuance ; l'aperçu s'applique au vrai motif (annulable),
   et la décision reste en attente (Confirmer / Annuler) : rien d'irréversible sans un second geste */
const nomDmc = (i: number) => FLOSS[i] ? `DMC ${FLOSS[i].code}` : "fil";
function remplacer(c: ContexteBroderie): ModePoint[] {
  const r = c.remplacement; if (!r) return [];
  if (r.attente) { const { de, vers } = r.attente; return [
    { id: "remplacer-confirmer", nom: "Confirmer", icone: <Check aria-hidden="true" />, aide: `garder ${nomDmc(vers)} à la place de ${nomDmc(de)}`, groupe: "metier", ouvrir: r.confirmer },
    { id: "remplacer-annuler", nom: "Annuler", icone: <Undo2 aria-hidden="true" />, aide: `revenir à ${nomDmc(de)}`, groupe: "metier", ouvrir: r.annuler },
  ]; }
  if (!c.filsDuMotif.length) return [];
  return [{ id: "remplacer", nom: "Remplacer un fil", icone: <Replace aria-hidden="true" />, aide: "un fil du motif, puis sa nouvelle nuance : un aperçu sur le motif, puis vous confirmez ou annulez", groupe: "metier", ouvrir: () => {},
    enfants: () => c.filsDuMotif.map((de): ModePoint => ({ id: "rempl-de-" + (FLOSS[de]?.code ?? de), nom: nomDmc(de), couleur: FLOSS[de]?.hex, aide: `remplacer ${FLOSS[de]?.name ?? ""}`, groupe: "metier", ouvrir: () => {},
      enfants: () => FAMILLES.map((f): ModePoint => { const l = (filsParFamille().get(f.id) ?? []).filter(i => i !== de);
        return { id: "rempl-fam-" + f.id, nom: f.nom, couleur: f.hex, aide: `${l.length} nuances`, groupe: "metier", ouvrir: () => {},
          enfants: () => l.map((vers): ModePoint => ({ id: "rempl-vers-" + (FLOSS[vers]?.code ?? vers), nom: nomDmc(vers), couleur: FLOSS[vers]?.hex, aide: `${FLOSS[vers]?.name ?? ""} : aperçu, puis confirmer ou annuler`, groupe: "metier", ouvrir: () => r.preparer(de, vers) })) }; }) })) }];
}

const fil = (c: ContexteBroderie, idx: number): ModePoint => {
  const f = FLOSS[idx];
  return { id: "dmc-" + f.code, nom: "DMC " + f.code, aide: f.name, groupe: "metier", couleur: f.hex, actif: c.couleur === idx, ouvrir: () => c.choisirFil(idx) };
};

export function commandesBroderie(c: ContexteBroderie): ModePoint[] {
  const outil = (atelier: "create" | "stitch") => ([id, nom, aide]: [Tool, string, string?]): ModePoint =>
    ({ id: (atelier === "stitch" ? "b-" : "o-") + id, nom, aide: aide ?? nom, groupe: "metier", icone: <ToolIcon tool={id} />, actif: c.outil === id, ouvrir: () => c.choisirOutil(id, atelier) });
  return [
    { id: "loupe", nom: "Loupe", icone: <Search aria-hidden="true" />, aide: "la grille agrandie sous le pointeur ou à la case choisie au clavier", groupe: "socle", actif: c.loupe, ouvrir: c.basculerLoupe },
    {
      id: "guide", nom: "Guide", icone: <Compass aria-hidden="true" />, aide: "la visite, l’aide et la recherche", groupe: "socle", ouvrir: () => {},
      enfants: () => [
        ...(c.guide ? [{ id: "guide-visite", nom: "Visite", icone: <Compass aria-hidden="true" />, aide: "la visite du studio avec Le Point", groupe: "socle", ouvrir: c.guide } satisfies ModePoint] : []),
        { id: "guide-chercher", nom: "Chercher", icone: <Search aria-hidden="true" />, aide: "un fil, un outil ou une fonction, par son nom", groupe: "socle", ouvrir: c.chercher },
        ...(c.suggestions ? [{ id: "guide-suggestions", nom: c.suggestions.actives ? "Suggestions : oui" : "Suggestions : non", icone: <Lightbulb aria-hidden="true" />, aide: c.suggestions.actives ? "un point violet indique la prochaine étape conseillée ; en broderie, un anneau montre le prochain point ; toucher pour les retirer" : "montrer la prochaine étape conseillée (un point violet) et, en broderie, le prochain point", groupe: "socle" as const, actif: c.suggestions.actives, resteOuvert: true, ouvrir: c.suggestions.basculer } satisfies ModePoint] : []),
        { id: "guide-aide", nom: "Réglages et aide", icone: <HelpCircle aria-hidden="true" />, aide: "les réglages du studio et l’aide", groupe: "socle", ouvrir: c.aide },
      ],
    },
    {
      id: "points", nom: "Points", icone: <Pencil aria-hidden="true" />, aide: "la croix, le demi-point, le point arrière, la gomme et tous les outils de dessin", groupe: "metier", ouvrir: () => {},
      enfants: () => [...POINTS.map(outil("create")), { id: "plus-outils", nom: "Plus d’outils", icone: <LayoutGrid aria-hidden="true" />, aide: "remplir, pipette, sélection, quarts, formes…", groupe: "metier", ouvrir: () => {}, enfants: () => PLUS.map(outil("create")) }],
    },
    { id: "broder", nom: "Broder", icone: <Spool aria-hidden="true" />, aide: "cocher ce qui est brodé, défaire, garer l’aiguille, suivre l’avancée", groupe: "metier", ouvrir: () => {},
      enfants: () => [...(c.prochain ? [{ id: "prochain-point", nom: "Prochain point", icone: <Crosshair aria-hidden="true" />, groupe: "metier" as const,
          aide: `DMC ${c.prochain.code} : ${c.prochain.reste} point${c.prochain.reste > 1 ? "s" : ""} à broder ; le prochain est amené au centre de la toile`, ouvrir: c.prochain.montrer } satisfies ModePoint] : []),
        ...BRODER.map(outil("stitch")), { id: "suivi", nom: "Suivi", icone: <ListChecks aria-hidden="true" />, aide: "l’avancée du patron, fil par fil", groupe: "metier", ouvrir: c.suivi },
        ...(c.avancee && c.avancee.length ? [{ id: "a-broder", nom: "Couleurs à broder", icone: <ListTodo aria-hidden="true" />, groupe: "metier" as const, ouvrir: () => {},
          aide: (() => { const r = c.avancee!.filter(x => x.done < x.cells).length; return r ? `${r} couleur${r > 1 ? "s" : ""} à terminer, de la plus longue à la plus courte` : "toutes les couleurs sont brodées"; })(),
          enfants: () => [...c.avancee!].filter(x => x.cells > 0).sort((a, b) => (b.cells - b.done) - (a.cells - a.done)).map((x): ModePoint => {
            const reste = x.cells - x.done;
            return { id: "a-broder-" + x.code, nom: "DMC " + x.code, couleur: FLOSS[x.idx]?.hex, groupe: "metier", actif: c.couleur === x.idx,
              aide: reste > 0 ? `${FLOSS[x.idx]?.name ?? ""} : ${reste} point${reste > 1 ? "s" : ""} à broder sur ${x.cells}` : `${FLOSS[x.idx]?.name ?? ""} : terminée`,
              ouvrir: () => { c.choisirFil(x.idx); c.choisirOutil("mark" as Tool, "stitch"); } }; }) } satisfies ModePoint] : []),
        ...(c.surMaToile ? [{ id: "sur-ma-toile", nom: "Sur ma toile", icone: <Camera aria-hidden="true" />, aide: "filmer votre vraie toile et y poser ce patron (Tambour vivant)", groupe: "metier", ouvrir: c.surMaToile } satisfies ModePoint] : [])] },
    {
      id: "fils", nom: "Fils", icone: <Palette aria-hidden="true" />, aide: "les fils du motif et le nuancier DMC par familles de couleur", groupe: "metier", ouvrir: () => {},
      enfants: () => [
        ...remplacer(c),
        ...(c.filsDuMotif.length ? [{ id: "fils-motif", nom: "Fils du motif", aide: `${c.filsDuMotif.length} fil${c.filsDuMotif.length > 1 ? "s" : ""} déjà dans le motif`, groupe: "metier", couleur: FLOSS[c.filsDuMotif[0]]?.hex, ouvrir: () => {}, enfants: () => c.filsDuMotif.map(i => fil(c, i)) } satisfies ModePoint] : []),
        ...FAMILLES.map((f): ModePoint => { const l = filsParFamille().get(f.id) ?? []; return { id: "famille-" + f.id, nom: f.nom, aide: `${l.length} nuances DMC, du plus clair au plus foncé`, groupe: "metier", couleur: f.hex, ouvrir: () => {}, enfants: () => l.map(i => fil(c, i)) }; }),
        { id: "fils-toile", nom: "Fils et toile", icone: <Settings2 aria-hidden="true" />, aide: "le nombre de brins, la toile et son compte", groupe: "metier", ouvrir: c.filsEtToile },
      ],
    },
    {
      id: "affichage", nom: "Affichage", icone: <Eye aria-hidden="true" />, aide: "symboles, à plat, réaliste, patron, grille visible ou masquée", groupe: "metier", ouvrir: () => {},
      enfants: () => [
        { id: "symboles", nom: "Symboles", icone: <Shapes aria-hidden="true" />, aide: "les symboles par-dessus les couleurs", groupe: "metier", actif: c.symboles, resteOuvert: true, ouvrir: c.basculerSymboles },
        ...VUES.map(([id, nom, aide, icone]): ModePoint => ({ id: "vue-" + id, nom, aide, icone, groupe: "metier", actif: c.vue === id, resteOuvert: true, ouvrir: () => c.choisirVue(id) })),
        { id: "tout-voir", nom: "Tout voir", icone: <Maximize aria-hidden="true" />, aide: "le patron entier à l’écran", groupe: "metier", resteOuvert: true, ouvrir: c.toutVoir },
        { id: "grille", nom: c.grille === "masquee" ? "Grille masquée" : "Grille visible", icone: <Grid3x3 aria-hidden="true" />, aide: c.grille === "masquee" ? "montrer les lignes de la grille" : "masquer les lignes de la grille", groupe: "metier", actif: c.grille === "visible", resteOuvert: true, ouvrir: c.basculerGrille },
      ],
    },
    {
      id: "importer", nom: "Importer", icone: <FileUp aria-hidden="true" />, aide: "une image, un patron PDF, un projet, ou un de mes ouvrages", groupe: "creation", ouvrir: () => {},
      enfants: () => [
        { id: "imp-image", nom: "Image", icone: <ImageIcon aria-hidden="true" />, aide: "une photo ou un dessin (PNG, JPEG, WebP), transformé en patron", groupe: "creation", ouvrir: () => c.importer("image") },
        { id: "imp-pdf", nom: "Patron PDF", icone: <FileText aria-hidden="true" />, aide: "un patron imprimé en PDF, lu case par case", groupe: "creation", ouvrir: () => c.importer("pdf") },
        { id: "imp-projet", nom: "Projet", icone: <FileJson aria-hidden="true" />, aide: "un projet Point Zéro (.json) ou un fichier OXS", groupe: "creation", ouvrir: () => c.importer("projet") },
        { id: "imp-ouvrages", nom: "Mes ouvrages", icone: <Folder aria-hidden="true" />, aide: "rouvrir un ouvrage rangé sur cet appareil", groupe: "creation", ouvrir: c.ouvrages },
        ...(c.composer ? [{ id: "imp-rosace", nom: "Composer une rosace", icone: <Sparkles aria-hidden="true" />, aide: "le compositeur de rosaces", groupe: "creation", ouvrir: c.composer } satisfies ModePoint] : []),
      ],
    },
    {
      id: "exporter", nom: "Exporter", icone: <Download aria-hidden="true" />, aide: "le patron en PDF ou en image, le projet, le partage", groupe: "creation", ouvrir: () => {},
      enfants: () => [
        { id: "exp-patron", nom: "Patron PDF ou image", icone: <FileText aria-hidden="true" />, aide: "le studio d’export : PDF à imprimer, image, légende des fils", groupe: "creation", ouvrir: c.exporter },
        { id: "exp-projet", nom: "Télécharger le projet", icone: <FileJson aria-hidden="true" />, aide: "le fichier du projet, pour le rouvrir ailleurs", groupe: "creation", ouvrir: c.enregistrer },
        { id: "exp-partager", nom: "Partager en direct", icone: <Share2 aria-hidden="true" />, aide: "inviter à regarder l’ouvrage", groupe: "creation", ouvrir: c.partager },
      ],
    },
    ...(c.dockClassique ? [{ id: "dock-classique", nom: "Dock du bas", icone: <PanelBottom aria-hidden="true" />, aide: "revenir au dock classique en bas de l’écran", groupe: "creation", ouvrir: c.dockClassique } satisfies ModePoint] : []),
  ];
}

if (!typeBloc("broderie")) enregistrerTypeBloc<ContexteBroderie>({ id: "broderie", nom: "Broderie", commandes: commandesBroderie });
