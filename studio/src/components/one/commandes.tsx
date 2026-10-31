/** .0NE — la couronne de la personne : ses univers favoris (le registre), puis les accès communs. Chaque commande ouvre une vraie adresse. */
import { LayoutGrid, SlidersHorizontal } from "lucide-react";
import { NOMS_STATUTS, type Univers } from "../../lib/one/contrat";
import type { ModePoint } from "../../lib/point/modes";
import { IconeOne } from "./icones";

export const adresseUnivers = (u: Univers) => import.meta.env.BASE_URL + (u.ouverture.type === "route" ? u.ouverture.chemin : "one/univers#u-" + u.id);

export function commandesDesUnivers(liste: Univers[], favoris: string[], aller: (chemin: string) => void = c => window.location.assign(c)): ModePoint[] {
  const miens = favoris.map(id => liste.find(u => u.id === id)).filter((u): u is Univers => !!u);
  return [
    ...miens.map((u): ModePoint => ({ id: "u-" + u.id, nom: u.nom, icone: <IconeOne nom={u.icone} />, groupe: "metier",
      aide: `${u.phrase} ${NOMS_STATUTS[u.statut]}${u.statut === "preparation" ? " : sa présentation seulement" : ""}.`, ouvrir: () => aller(adresseUnivers(u)) })),
    { id: "tous-les-univers", nom: "Univers", icone: <LayoutGrid aria-hidden="true" />, groupe: "socle", aide: "tous les univers de .0NE", ouvrir: () => aller(import.meta.env.BASE_URL + "one/univers") },
    { id: "premiere-rencontre", nom: "Mes réglages", icone: <SlidersHorizontal aria-hidden="true" />, groupe: "socle", aide: "reprendre la Première rencontre : affichage, sons, interaction, univers", ouvrir: () => aller(import.meta.env.BASE_URL + "one/premiere-rencontre") },
  ];
}
