/**
 * Le Disque posé dans une page, au service de la fiche contextuelle : la MÊME pièce que l'atelier (DisqueOne), le MÊME Point
 * (ses familles et ses enfants), la même fiche au centre. Rien n'est refait : cette pièce ne fait que relier trois choses
 * existantes — le Disque, le registre des domaines, et les actions d'une fiche (lib/fiche/actions).
 *
 * Disque → Sélection : une famille par domaine (Fils DMC, Éléments SYST'AIME) ; choisir un enfant change la fiche.
 * Fiche → Action : les actions permises de la fiche courante sont des commandes de la couronne (et des boutons de la fiche entière).
 * Résultat vérifiable : le message de l'action, avec ce qui a été relu à sa source, est dit dans une zone annoncée aux lecteurs d'écran.
 */
import { useMemo, useState, type ReactNode } from "react";
import { Expand, SkipBack, SkipForward } from "lucide-react";
import DisqueOne from "../one/DisqueOne";
import FicheContextuelle, { useFiche } from "./FicheContextuelle";
import { commandesDeFiche } from "../../lib/fiche/actions";
import type { Role } from "../../lib/fiche/fiche";
import type { ModePoint } from "../../lib/point/modes";

export interface ElementDeGroupe {
  adresse: string; nom: string; aide?: string; couleur?: string;
  /** vrai pour toutes les adresses que cet élément « contient » (un thème contient ses six couches) : il reste alors actif */
  contient?: (adresse: string) => boolean;
}
export interface GroupeFiches { id: string; nom: string; aide: string; icone?: ReactNode; elements: ElementDeGroupe[] }

/** Les commandes de la couronne : une famille par groupe, puis ce que la fiche courante permet. Pure : elle se teste seule. */
export function construireModes(o: {
  groupes: GroupeFiches[]; courante: string; choisir: (adresse: string) => void;
  /** les commandes propres à la fiche courante (ses actions), déjà fabriquées */
  actions: ModePoint[]; toutVoir?: () => void;
}): ModePoint[] {
  const { groupes, courante, choisir } = o;
  const actif = (e: ElementDeGroupe) => e.adresse === courante || !!e.contient?.(courante);
  const enCours = groupes.find(g => g.elements.some(actif));
  const liste = enCours?.elements ?? [];
  const i = liste.findIndex(actif);
  const modes: ModePoint[] = groupes.map(g => ({
    id: "df-" + g.id, nom: g.nom, groupe: "metier" as const, icone: g.icone, aide: g.aide, actif: g === enCours, ouvrir: () => {},
    enfants: () => g.elements.map(e => ({
      id: "df-el-" + e.adresse, nom: e.nom, groupe: "metier" as const, couleur: e.couleur, actif: actif(e),
      aide: e.aide ?? `ouvre la fiche « ${e.nom} »`, ouvrir: () => choisir(e.adresse),
    })),
  }));
  if (o.toutVoir) modes.push({ id: "df-tout", nom: "Tout voir", groupe: "metier", icone: <Expand aria-hidden="true" />, aide: "la fiche en entier : sources, version, relations, limites", ouvrir: o.toutVoir });
  modes.push(...o.actions);
  if (liste.length > 1) modes.push(
    { id: "df-precedent", nom: "Précédent", groupe: "metier", icone: <SkipBack aria-hidden="true" />, aide: `l'élément précédent de « ${enCours!.nom} »`, ouvrir: () => choisir(liste[(i - 1 + liste.length) % liste.length].adresse) },
    { id: "df-suivant", nom: "Suivant", groupe: "metier", icone: <SkipForward aria-hidden="true" />, aide: `l'élément suivant de « ${enCours!.nom} »`, ouvrir: () => choisir(liste[(i + 1) % liste.length].adresse) });
  return modes;
}

export default function DisqueFiches({ groupes, courante, onChoisir, role, max = 480, etiquette, onToutVoir }: {
  groupes: GroupeFiches[]; courante: string; onChoisir: (adresse: string) => void; role: Role;
  max?: number; etiquette: string; onToutVoir?: () => void;
}) {
  const r = useFiche(courante, role);
  const [dit, setDit] = useState("");
  const modes = useMemo(() => construireModes({
    groupes, courante, choisir: onChoisir, toutVoir: onToutVoir,
    actions: r.ok ? commandesDeFiche(r.fiche, role, (_a, res) => setDit(res.message + (res.verification ? " " + res.verification : ""))) : [],
  }), [groupes, courante, onChoisir, onToutVoir, r, role]);

  return <div className="df">
    <DisqueOne contexte="df-disque" etiquette={etiquette} modes={modes} max={max}
      centre={<FicheContextuelle adresse={courante} role={role} presentation="disque" duplique onAgrandir={onToutVoir} />} />
    <p className="df-dit" role="status" aria-live="polite">{dit}</p>
  </div>;
}
