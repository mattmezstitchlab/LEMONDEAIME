/**
 * Le type de bloc « tambour » (Tambour vivant, lot A : Caméra → Broderie).
 * Les commandes du Point autour du tambour : Caméra, Vues, Couleurs, Détail, Fils DMC (échanger), Figer, Broder ce motif, Une photo.
 * Chaque feuille appelle une vraie action. Le centre du Point ouvre aussi la caméra (raccourci du mode Tambour seulement).
 */
import { Camera, CameraOff, Layers, Columns2, Eye, FileUp, Grid3x3, Image as ImageIcon, Palette, Pause, Play, RotateCcw, Scan, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { FLOSS } from "../../lib/dmc";
import { enregistrerTypeBloc, typeBloc } from "../../lib/point/registre";
import type { ModePoint } from "../../lib/point/modes";
import type { EtatCamera } from "../../lib/tambour/camera";

export type VueTambour = "points" | "photo" | "comparer";
export const COULEURS = [4, 6, 8, 12, 16, 24];
export const DETAILS: [number, string][] = [[48, "Gros points"], [64, "Moyen"], [80, "Fin"]];

export interface ContexteTambour {
  camera: EtatCamera; basculerCamera: () => void;
  aSource: boolean;
  vue: VueTambour; afficher: (v: VueTambour) => void;
  couleurs: number; choisirCouleurs: (n: number) => void;
  cote: number; choisirCote: (n: number) => void;
  /** les fils de l'aperçu, du plus présent au moins présent (déjà échangés), et leurs voisins proposés */
  fils: number[]; voisins: (fil: number) => number[];
  echanger: (de: number, vers: number) => void; echanges: number; annulerEchanges: () => void;
  fige: boolean; figer: () => void;
  capturer: () => void;
  importer: () => void;
  /** passer au lot B : poser un patron sur la vraie toile filmée */
  superposer: () => void;
}

const nomFil = (i: number) => FLOSS[i] ? `DMC ${FLOSS[i].code} · ${FLOSS[i].name}` : "fil";

export function commandesTambour(c: ContexteTambour): ModePoint[] {
  const ouverte = c.camera === "active";
  return [
    { id: "camera", nom: ouverte ? "Fermer la caméra" : "Caméra", icone: ouverte ? <CameraOff aria-hidden="true" /> : <Camera aria-hidden="true" />, groupe: "socle", actif: ouverte,
      aide: ouverte ? "éteindre la caméra ; l’image reste sur votre appareil" : "filmer le monde : ce que voit la caméra devient du point de croix (votre navigateur demande l’accord)", ouvrir: c.basculerCamera },
    { id: "vues", nom: "Vues", icone: <Eye aria-hidden="true" />, aide: "points de croix, photo, ou les deux côte à côte", groupe: "socle", ouvrir: () => {},
      enfants: () => ([["points", "Points de croix", <Grid3x3 key="p" aria-hidden="true" />, "l’image convertie en points DMC"], ["photo", "Photo", <ImageIcon key="i" aria-hidden="true" />, "l’image telle que la caméra la voit"], ["comparer", "Comparer", <Columns2 key="c" aria-hidden="true" />, "la photo à gauche, les points à droite"]] as [VueTambour, string, ReactNode, string][])
        .map(([id, nom, icone, aide]): ModePoint => ({ id: "vue-" + id, nom, icone, aide, groupe: "socle", actif: c.vue === id, resteOuvert: true, ouvrir: () => c.afficher(id) })) },
    { id: "couleurs", nom: "Couleurs", valeur: String(c.couleurs), aide: `${c.couleurs} fils DMC au plus`, groupe: "metier", ouvrir: () => {},
      enfants: () => COULEURS.map((n): ModePoint => ({ id: "couleurs-" + n, nom: `${n} couleurs`, valeur: String(n), aide: n <= 6 ? "peu de fils : un motif simple" : n >= 16 ? "beaucoup de fils : plus de nuances" : "un bon équilibre", groupe: "metier", actif: c.couleurs === n, resteOuvert: true, ouvrir: () => c.choisirCouleurs(n) })) },
    { id: "detail", nom: "Détail", icone: <Scan aria-hidden="true" />, aide: `${c.cote} × ${c.cote} points`, groupe: "metier", ouvrir: () => {},
      enfants: () => DETAILS.map(([n, nom]): ModePoint => ({ id: "detail-" + n, nom: `${nom} (${n} points)`, valeur: String(n), aide: `${n} × ${n} points`, groupe: "metier", actif: c.cote === n, resteOuvert: true, ouvrir: () => c.choisirCote(n) })) },
    { id: "fils", nom: "Fils DMC", icone: <Palette aria-hidden="true" />, aide: c.fils.length ? `${c.fils.length} fils dans l’aperçu ; choisissez-en un pour l’échanger` : "les fils apparaissent avec l’image", groupe: "metier", ouvrir: () => {},
      enfants: () => [
        ...c.fils.slice(0, 15).map((f): ModePoint => ({ id: "fil-" + f, nom: nomFil(f), couleur: FLOSS[f]?.hex, aide: "l’échanger contre un fil voisin", groupe: "metier", ouvrir: () => {},
          enfants: () => c.voisins(f).map((v): ModePoint => ({ id: "vers-" + v, nom: nomFil(v), couleur: FLOSS[v]?.hex, aide: `remplace ${FLOSS[f]?.code ?? ""}`, groupe: "metier", ouvrir: () => c.echanger(f, v) })) })),
        ...(c.echanges ? [{ id: "annuler-echanges", nom: "Fils d’origine", icone: <RotateCcw aria-hidden="true" />, aide: `annuler ${c.echanges} échange${c.echanges > 1 ? "s" : ""}`, groupe: "metier" as const, ouvrir: c.annulerEchanges }] : []),
      ] },
    { id: "figer", nom: c.fige ? "Reprendre" : "Figer", icone: c.fige ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />, aide: c.fige ? "revenir à l’image en direct" : "garder cette image pour la régler tranquillement", groupe: "creation", actif: c.fige, resteOuvert: true, ouvrir: c.figer },
    { id: "capturer", nom: "Broder ce motif", icone: <Sparkles aria-hidden="true" />, aide: c.aSource ? `ouvrir ces ${c.cote} × ${c.cote} points dans l’atelier, avec la photo ; l’ouvrage rejoint Mes ouvrages` : "il faut d’abord une image : la caméra, ou une photo", groupe: "creation", ouvrir: c.capturer },
    { id: "photo", nom: "Une photo", icone: <FileUp aria-hidden="true" />, aide: "choisir une photo de l’appareil à la place de la caméra", groupe: "creation", ouvrir: c.importer },
    { id: "superposer", nom: "Superposer un patron", icone: <Layers aria-hidden="true" />, aide: "filmer votre vraie toile et y poser un patron de Mes ouvrages", groupe: "creation", ouvrir: c.superposer },
  ];
}

if (!typeBloc("tambour")) enregistrerTypeBloc<ContexteTambour>({ id: "tambour", nom: "Tambour", commandes: commandesTambour });
