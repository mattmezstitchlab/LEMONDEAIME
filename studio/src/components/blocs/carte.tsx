/**
 * Le type de bloc « carte » : le Disque pilote la Carte Vivante existante (le même composant, ses quatre formes, ses médias,
 * ses permissions). Aucune seconde carte : ces commandes appellent les gestes de la carte (forme, média, face, module).
 * Les informations proposées sont celles que le rôle a le droit de voir (modulesVisibles) ; aucune action n'est inventée.
 */
import { ArrowLeft, ChevronLeft, ChevronRight, Eye, Image as ImageIcon, Info, RefreshCw, Shapes, UserRound } from "lucide-react";
import { enregistrerTypeBloc, typeBloc } from "../../lib/point/registre";
import type { ModePoint } from "../../lib/point/modes";
import { FORMATS, NOMS_MODULES, ROLES, type Format, type Role, type TypeModule } from "../../lib/carte/carte";

export interface ContexteCarte {
  nom: string;
  format: Format; choisirFormat: (f: Format) => void;
  role: Role; choisirRole: (r: Role) => void;
  medias: { alt: string }[]; media: number; choisirMedia: (k: number) => void;
  /** les modules que ce rôle peut voir, dans l'ordre du métier */
  modules: TypeModule[]; montrerModule: (t: TypeModule) => void;
  face: "recto" | "verso"; retourner: () => void;
  /** revenir : la page se réduit à la forme d'avant ; une carte retournée revient au recto */
  revenir: () => void;
}

export function commandesCarte(c: ContexteCarte): ModePoint[] {
  const n = c.medias.length, aller = (k: number) => c.choisirMedia(((k % n) + n) % n);
  return [
    { id: "forme", nom: "Forme", icone: <Shapes aria-hidden="true" />, aide: "ronde, carrée, verticale ou page : la même carte", groupe: "metier", ouvrir: () => {},
      enfants: () => FORMATS.map((f): ModePoint => ({ id: "forme-" + f.id, nom: f.nom, aide: f.aide, groupe: "metier", actif: c.format === f.id, resteOuvert: true, ouvrir: () => c.choisirFormat(f.id) })) },
    ...(n ? [{ id: "medias", nom: "Médias", icone: <ImageIcon aria-hidden="true" />, aide: `média ${c.media + 1} sur ${n} : ${c.medias[c.media]?.alt ?? ""}`, groupe: "metier" as const, ouvrir: () => {},
      enfants: () => [
        ...(n > 1 ? [{ id: "media-precedent", nom: "Précédent", icone: <ChevronLeft aria-hidden="true" />, aide: "le média d’avant", groupe: "metier" as const, resteOuvert: true, ouvrir: () => aller(c.media - 1) } satisfies ModePoint,
          { id: "media-suivant", nom: "Suivant", icone: <ChevronRight aria-hidden="true" />, aide: "le média suivant", groupe: "metier" as const, resteOuvert: true, ouvrir: () => aller(c.media + 1) } satisfies ModePoint] : []),
        ...c.medias.map((m, k): ModePoint => ({ id: "media-" + k, nom: `Média ${k + 1}`, valeur: String(k + 1), aide: m.alt, groupe: "metier", actif: c.media === k, resteOuvert: true, ouvrir: () => aller(k) })),
      ] } satisfies ModePoint] : []),
    { id: "informations", nom: "Informations", icone: <Info aria-hidden="true" />, aide: "ce que ce rôle peut voir : la carte se tourne ou se déplie pour le montrer", groupe: "metier", ouvrir: () => {},
      enfants: () => c.modules.filter(t => t !== "medias").map((t): ModePoint => ({ id: "module-" + t, nom: NOMS_MODULES[t], aide: "montrer : " + NOMS_MODULES[t].toLowerCase(), groupe: "metier", ouvrir: () => c.montrerModule(t) })) },
    { id: "regarder", nom: "Regarder en tant que", icone: <UserRound aria-hidden="true" />, aide: "visiteur, client ou propriétaire : chacun voit ce qui lui est ouvert", groupe: "socle", ouvrir: () => {},
      enfants: () => ROLES.map((r): ModePoint => ({ id: "role-" + r.id, nom: r.nom, icone: <Eye aria-hidden="true" />, aide: "la carte telle que la voit : " + r.nom.toLowerCase(), groupe: "socle", actif: c.role === r.id, resteOuvert: true, ouvrir: () => c.choisirRole(r.id) })) },
    ...(c.format !== "page" ? [{ id: "retourner", nom: "Retourner", icone: <RefreshCw aria-hidden="true" />, aide: c.face === "recto" ? "voir le verso" : "revenir au recto", groupe: "metier" as const, ouvrir: c.retourner } satisfies ModePoint] : []),
    ...(c.format === "page" || c.face === "verso" ? [{ id: "revenir", nom: c.format === "page" ? "Réduire" : "Recto", icone: <ArrowLeft aria-hidden="true" />, aide: c.format === "page" ? "la page redevient la carte d’avant" : "revenir au recto", groupe: "socle" as const, ouvrir: c.revenir } satisfies ModePoint] : []),
  ];
}

if (!typeBloc("carte")) enregistrerTypeBloc<ContexteCarte>({ id: "carte", nom: "Carte", commandes: commandesCarte });
