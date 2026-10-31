/**
 * Le type de bloc « superposition » (Tambour vivant, lot B : Patron → Toile).
 * La caméra filme la vraie toile ; le patron se pose dessus, aligné à la main par ses quatre coins.
 * Commandes : Caméra, Patron (Mes ouvrages), Affichage, Opacité, À faire, Coins, Figer, Créer depuis la caméra.
 */
import { Camera, CameraOff, Eye, FolderOpen, Grid3x3, Hash, ListChecks, Move, Palette, Pause, Play, RotateCcw, Square, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { FLOSS } from "../../lib/dmc";
import { enregistrerTypeBloc, typeBloc } from "../../lib/point/registre";
import type { ModePoint } from "../../lib/point/modes";
import type { EtatCamera } from "../../lib/tambour/camera";
import type { AffichageSuperpose } from "../../lib/tambour/superposition";

export const OPACITES = [25, 50, 75, 100];
export interface ContexteSuperposition {
  camera: EtatCamera; basculerCamera: () => void;
  patron: { id: string; nom: string } | null;
  ouvrages: { id: string; nom: string }[]; choisirPatron: (id: string) => void;
  affichage: AffichageSuperpose; afficher: (a: AffichageSuperpose) => void;
  palette: number[]; couleur: number | null; choisirCouleur: (f: number) => void;
  opacite: number; choisirOpacite: (o: number) => void;
  aFaire: boolean; basculerAFaire: () => void; reste: number;
  reinitialiserCoins: () => void;
  fige: boolean; figer: () => void;
  creer: () => void;
}

const nomFil = (i: number) => FLOSS[i] ? `DMC ${FLOSS[i].code} · ${FLOSS[i].name}` : "fil";

export function commandesSuperposition(c: ContexteSuperposition): ModePoint[] {
  const ouverte = c.camera === "active";
  const vue = (id: AffichageSuperpose, nom: string, icone: ReactNode, aide: string): ModePoint => ({ id: "aff-" + id, nom, icone, aide, groupe: "socle", actif: c.affichage === id, resteOuvert: true, ouvrir: () => c.afficher(id) });
  return [
    { id: "camera", nom: ouverte ? "Fermer la caméra" : "Caméra", icone: ouverte ? <CameraOff aria-hidden="true" /> : <Camera aria-hidden="true" />, groupe: "socle", actif: ouverte,
      aide: ouverte ? "éteindre la caméra ; l’image reste sur votre appareil" : "filmer votre toile dans son tambour (votre navigateur demande l’accord)", ouvrir: c.basculerCamera },
    { id: "patron", nom: "Patron", icone: <FolderOpen aria-hidden="true" />, aide: c.patron ? `posé : ${c.patron.nom}` : "choisir un ouvrage de Mes ouvrages", groupe: "metier", ouvrir: () => {},
      enfants: () => c.ouvrages.length ? c.ouvrages.slice(0, 15).map((o): ModePoint => ({ id: "ouvrage-" + o.id, nom: o.nom, aide: "poser ce patron sur la toile", groupe: "metier", actif: c.patron?.id === o.id, ouvrir: () => c.choisirPatron(o.id) }))
        : [{ id: "aucun", nom: "Aucun ouvrage", aide: "créez ou importez un motif dans l’atelier d’abord", groupe: "metier", ouvrir: () => {} }] },
    { id: "affichage", nom: "Affichage", icone: <Eye aria-hidden="true" />, aide: "aplats, symboles, grille seule, ou une seule couleur DMC", groupe: "socle", ouvrir: () => {},
      enfants: () => [
        vue("aplats", "Aplats", <Square aria-hidden="true" />, "les couleurs du patron, pleines"),
        vue("symboles", "Symboles", <Hash aria-hidden="true" />, "les symboles du patron, comme sur papier"),
        vue("grille", "Grille seule", <Grid3x3 aria-hidden="true" />, "la grille du patron, pour aligner"),
        { id: "aff-couleur", nom: "Une couleur", icone: <Palette aria-hidden="true" />, aide: c.couleur !== null ? `seulement ${nomFil(c.couleur)}` : "ne montrer qu’un fil DMC", groupe: "socle", actif: c.affichage === "couleur", ouvrir: () => {},
          enfants: () => c.palette.slice(0, 24).map((f): ModePoint => ({ id: "coul-" + f, nom: nomFil(f), couleur: FLOSS[f]?.hex, aide: "ne montrer que ce fil", groupe: "socle", actif: c.affichage === "couleur" && c.couleur === f, resteOuvert: true, ouvrir: () => c.choisirCouleur(f) })) },
      ] },
    { id: "opacite", nom: "Opacité", valeur: c.opacite + " %", aide: `le patron à ${c.opacite} %`, groupe: "socle", ouvrir: () => {},
      enfants: () => OPACITES.map((o): ModePoint => ({ id: "opacite-" + o, nom: `Opacité ${o} %`, valeur: o + " %", aide: o === 100 ? "le patron couvre la toile" : "la toile se voit au travers", groupe: "socle", actif: c.opacite === o, resteOuvert: true, ouvrir: () => c.choisirOpacite(o) })) },
    { id: "afaire", nom: "À faire", icone: <ListChecks aria-hidden="true" />, aide: c.aFaire ? `seulement les ${c.reste} points qui restent ; montrer tout` : `cacher les points déjà brodés (${c.reste} restent)`, groupe: "metier", actif: c.aFaire, resteOuvert: true, ouvrir: c.basculerAFaire },
    { id: "coins", nom: "Coins", icone: <Move aria-hidden="true" />, aide: "glissez les quatre coins sur ceux de votre toile (ou Tab puis les flèches)", groupe: "metier", ouvrir: () => {},
      enfants: () => [{ id: "coins-depart", nom: "Recentrer", icone: <RotateCcw aria-hidden="true" />, aide: "remettre le patron au centre du tambour", groupe: "metier", ouvrir: c.reinitialiserCoins }] },
    { id: "figer", nom: c.fige ? "Reprendre" : "Figer", icone: c.fige ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />, aide: c.fige ? "revenir à l’image en direct" : "garder cette image pour aligner tranquillement", groupe: "creation", actif: c.fige, resteOuvert: true, ouvrir: c.figer },
    { id: "creer", nom: "Créer depuis la caméra", icone: <Sparkles aria-hidden="true" />, aide: "revenir au Tambour qui convertit ce que filme la caméra", groupe: "creation", ouvrir: c.creer },
  ];
}

if (!typeBloc("superposition")) enregistrerTypeBloc<ContexteSuperposition>({ id: "superposition", nom: "Superposition", commandes: commandesSuperposition });
