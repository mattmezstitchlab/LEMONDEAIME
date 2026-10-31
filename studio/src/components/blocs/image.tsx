/**
 * Le type de bloc « image » : la preuve que le même Point pilote une autre création.
 * Aucune ligne du noyau ne change : ce fichier déclare ses commandes dans le registre, comme la broderie déclare les siennes.
 * Recadrer, Couleurs, Dimensions, Affichage, Exporter, Importer ; chaque feuille appelle une vraie action sur l'image.
 */
import { Contrast, Crop, Download, Droplet, Expand, Eye, FileUp, Grid3x3, Palette, RotateCcw, Scaling, Shrink, SlidersHorizontal, Sun } from "lucide-react";
import type { ReactNode } from "react";
import { enregistrerTypeBloc, typeBloc } from "../../lib/point/registre";
import type { ModePoint } from "../../lib/point/modes";

export type Cadrage = "original" | "1:1" | "4:3" | "16:9" | "3:4";
export type Fond = "clair" | "sombre" | "damier";
export type FormatExport = "png" | "jpeg" | "webp";
export interface ReglagesImage { luminosite: number; contraste: number; saturation: number; nb: boolean; sepia: boolean }
export const REGLAGES_NEUTRES: ReglagesImage = { luminosite: 0, contraste: 0, saturation: 100, nb: false, sepia: false };

export interface ContexteImage {
  cadrage: Cadrage; recadrer: (c: Cadrage) => void;
  reglages: ReglagesImage; regler: (r: Partial<ReglagesImage>) => void; reinitialiser: () => void;
  /** l'échelle de sortie, en %, et la taille de sortie qui en résulte */
  echelle: number; redimensionner: (e: number) => void; taille: (e: number) => { w: number; h: number };
  vue: "ajuste" | "reel"; afficher: (v: "ajuste" | "reel") => void;
  tiers: boolean; basculerTiers: () => void;
  fond: Fond; choisirFond: (f: Fond) => void;
  exporter: (f: FormatExport) => void;
  importer: () => void;
}

const CADRAGES: [Cadrage, string, string][] = [["original", "Original", "Orig."], ["1:1", "Carré", "1:1"], ["4:3", "Paysage 4:3", "4:3"], ["16:9", "Panoramique 16:9", "16:9"], ["3:4", "Portrait 3:4", "3:4"]];
const signe = (v: number) => (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v);

export function commandesImage(c: ContexteImage): ModePoint[] {
  const echelleDe = (cle: "luminosite" | "contraste", nom: string, icone: ReactNode): ModePoint => ({
    id: cle, nom, icone, aide: `${nom.toLowerCase()} : ${signe(c.reglages[cle])}`, groupe: "metier", ouvrir: () => {},
    enfants: () => [-40, -20, 0, 20, 40].map((v): ModePoint => ({ id: `${cle}-${v}`, nom: `${nom} ${signe(v)}`, valeur: signe(v), aide: v ? `${v > 0 ? "plus" : "moins"} ${Math.abs(v)} %` : "neutre", groupe: "metier", actif: c.reglages[cle] === v, resteOuvert: true, ouvrir: () => c.regler({ [cle]: v }) })),
  });
  return [
    {
      id: "affichage", nom: "Affichage", icone: <Eye aria-hidden="true" />, aide: "ajusté ou en taille réelle, la grille des tiers, le fond", groupe: "socle", ouvrir: () => {},
      enfants: () => [
        { id: "vue-ajuste", nom: "Ajusté au cadre", icone: <Shrink aria-hidden="true" />, aide: "l’image entière dans le cadre", groupe: "socle", actif: c.vue === "ajuste", resteOuvert: true, ouvrir: () => c.afficher("ajuste") },
        { id: "vue-reel", nom: "Taille réelle", icone: <Expand aria-hidden="true" />, aide: "un pixel de l’image pour un pixel de l’écran", groupe: "socle", actif: c.vue === "reel", resteOuvert: true, ouvrir: () => c.afficher("reel") },
        { id: "tiers", nom: "Grille des tiers", icone: <Grid3x3 aria-hidden="true" />, aide: c.tiers ? "masquer la grille des tiers" : "montrer la grille des tiers, pour composer", groupe: "socle", actif: c.tiers, resteOuvert: true, ouvrir: c.basculerTiers },
        { id: "fond", nom: "Fond", icone: <Palette aria-hidden="true" />, aide: "le fond derrière l’image", groupe: "socle", ouvrir: () => {},
          enfants: () => ([["clair", "Fond clair", "#f4f2ee"], ["sombre", "Fond sombre", "#1b1b1a"], ["damier", "Damier (transparence)", "#b8b8b8"]] as [Fond, string, string][])
            .map(([id, nom, couleur]): ModePoint => ({ id: "fond-" + id, nom, couleur, aide: nom.toLowerCase(), groupe: "socle", actif: c.fond === id, resteOuvert: true, ouvrir: () => c.choisirFond(id) })) },
      ],
    },
    {
      id: "recadrer", nom: "Recadrer", icone: <Crop aria-hidden="true" />, aide: "garder l’image entière ou la recadrer au centre, selon un format", groupe: "metier", ouvrir: () => {},
      enfants: () => CADRAGES.map(([id, nom, valeur]): ModePoint => ({ id: "cadre-" + id.replace(":", "x"), nom, valeur, aide: id === "original" ? "l’image entière" : `recadrée au centre en ${id}`, groupe: "metier", actif: c.cadrage === id, resteOuvert: true, ouvrir: () => c.recadrer(id) })),
    },
    {
      id: "couleurs", nom: "Couleurs", icone: <SlidersHorizontal aria-hidden="true" />, aide: "luminosité, contraste, saturation, noir et blanc, sépia", groupe: "metier", ouvrir: () => {},
      enfants: () => [
        echelleDe("luminosite", "Luminosité", <Sun aria-hidden="true" />),
        echelleDe("contraste", "Contraste", <Contrast aria-hidden="true" />),
        { id: "saturation", nom: "Saturation", icone: <Droplet aria-hidden="true" />, aide: `saturation : ${c.reglages.saturation} %`, groupe: "metier", ouvrir: () => {},
          enfants: () => [0, 50, 100, 150, 200].map((v): ModePoint => ({ id: "saturation-" + v, nom: `Saturation ${v} %`, valeur: v + " %", aide: v === 100 ? "neutre" : v < 100 ? "moins de couleur" : "plus de couleur", groupe: "metier", actif: c.reglages.saturation === v, resteOuvert: true, ouvrir: () => c.regler({ saturation: v }) })) },
        { id: "nb", nom: "Noir et blanc", icone: <span aria-hidden="true">N/B</span>, aide: "l’image en niveaux de gris", groupe: "metier", actif: c.reglages.nb, resteOuvert: true, ouvrir: () => c.regler({ nb: !c.reglages.nb }) },
        { id: "sepia", nom: "Sépia", icone: <span aria-hidden="true">Sé</span>, aide: "un ton ancien, brun", groupe: "metier", actif: c.reglages.sepia, resteOuvert: true, ouvrir: () => c.regler({ sepia: !c.reglages.sepia }) },
        { id: "reinitialiser", nom: "Réinitialiser", icone: <RotateCcw aria-hidden="true" />, aide: "revenir aux couleurs d’origine", groupe: "metier", resteOuvert: true, ouvrir: c.reinitialiser },
      ],
    },
    {
      id: "dimensions", nom: "Dimensions", icone: <Scaling aria-hidden="true" />, aide: (() => { const t = c.taille(c.echelle); return `taille de sortie : ${t.w} × ${t.h} px`; })(), groupe: "metier", ouvrir: () => {},
      enfants: () => [25, 50, 100, 200].map((e): ModePoint => { const t = c.taille(e);
        return { id: "echelle-" + e, nom: `${e} %`, valeur: e + " %", aide: `${t.w} × ${t.h} px`, groupe: "metier", actif: c.echelle === e, resteOuvert: true, ouvrir: () => c.redimensionner(e) }; }),
    },
    {
      id: "exporter", nom: "Exporter", icone: <Download aria-hidden="true" />, aide: "télécharger l’image telle qu’elle est réglée", groupe: "creation", ouvrir: () => {},
      enfants: () => ([["png", "PNG", "sans perte, garde la transparence"], ["jpeg", "JPEG", "léger, pour les photos"], ["webp", "WebP", "léger, pour le web"]] as [FormatExport, string, string][])
        .map(([id, nom, aide]): ModePoint => ({ id: "export-" + id, nom: "Image " + nom, valeur: nom, aide: `${aide} ; ${c.taille(c.echelle).w} × ${c.taille(c.echelle).h} px`, groupe: "creation", ouvrir: () => c.exporter(id) })),
    },
    { id: "importer", nom: "Importer", icone: <FileUp aria-hidden="true" />, aide: "remplacer l’image par une autre (PNG, JPEG, WebP)", groupe: "creation", ouvrir: c.importer },
  ];
}

if (!typeBloc("image")) enregistrerTypeBloc<ContexteImage>({ id: "image", nom: "Image", commandes: commandesImage });
