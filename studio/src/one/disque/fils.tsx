/**
 * Le contexte « Fils DMC » du Disque : parcourir les fils, en choisir un, lire sa fiche.
 * Disque → Sélection → Fiche → Informations réelles → Action autorisée → Résultat vérifiable :
 *  - le fil choisi est dans l'adresse (?u=broderie&o=dmc-310) : la sélection s'envoie et se retrouve ;
 *  - le centre montre l'essentiel de la fiche ; « Tout voir » l'ouvre en grand (le Disque se replie en Point) ;
 *  - la couronne porte les mêmes actions que la fiche (une seule liste : lib/fiche/actions.ts) ;
 *  - une action écrit le profil de l'atelier, le relit, et le dit dans la zone réservée.
 * Rien n'est recopié : tout est lu à la source par le domaine « dmc » (lib/fiche/dmc.ts).
 */
import { useEffect, useMemo, useState } from "react";
import { Expand, Palette, Search, SkipBack, SkipForward, Undo2 } from "lucide-react";
import { BASE_FLOSS, filCorrespond } from "../../lib/dmc";
import { FAMILLES, filsParFamille } from "../../lib/famillesFils";
import { FLOSS } from "../../lib/dmc";
import type { ContexteUnivers } from "../../lib/one/contextes";
import type { ModePoint } from "../../lib/point/modes";
import { adresse, declarerDomaine, lireAdresse } from "../../lib/fiche/registre";
import { domaineDmc } from "../../lib/fiche/dmc";
import { commandesDeFiche } from "../../lib/fiche/actions";
import FicheContextuelle, { useFiche } from "../../components/fiche/FicheContextuelle";

/* le domaine est déclaré une fois (le module peut être rechargé : « déjà déclaré » n'est pas une erreur) */
declarerDomaine(domaineDmc());

type PropsContexte = Parameters<ContexteUnivers["Composant"]>[0];
/** une famille : le Point la remplace par ses enfants ; `ouvrir` n'est pas appelé */
const famille = () => {};
const ROLE = "proprietaire" as const;   // la personne devant son propre appareil : ses données locales sont les siennes

/** la fiche en grand : elle garde son propre fil quand on suit une relation, et prévient le Disque (l'adresse reste juste) */
function FicheGrande({ depart, onChoisir, onResultat }: { depart: string; onChoisir: (a: string) => void; onResultat: (m: string) => void }) {
  const [a, setA] = useState(depart);
  return <FicheContextuelle adresse={a} role={ROLE} presentation="etendu"
    onNaviguer={x => { setA(x); onChoisir(x); }} onResultat={r => onResultat(r.message + (r.verification ? " " + r.verification : ""))} />;
}

export function FilsDmc({ etat, outils, publier }: PropsContexte) {
  const code = lireAdresse(etat.o)?.id ?? "";
  const courante = adresse("dmc", code);
  const famId = etat.f?.famille && FAMILLES.some(f => f.id === etat.f!.famille) ? etat.f.famille : undefined;
  const [recherche, setRecherche] = useState("");

  /* la liste parcourue : une famille (du plus clair au plus foncé) ou toute la table, filtrée par la recherche */
  const liste = useMemo(() => {
    const base = famId ? (filsParFamille().get(famId) ?? []).map(i => FLOSS[i]) : BASE_FLOSS;
    return base.filter(f => filCorrespond(f, recherche));
  }, [famId, recherche]);
  const i = Math.max(0, liste.findIndex(f => f.code.toLowerCase() === code.toLowerCase()));
  const aller = (c: string) => outils.aller({ o: adresse("dmc", c) });

  const r = useFiche(courante, ROLE);
  const dire = (m: string) => outils.dire(m);
  const grand = () => outils.agrandir(<FicheGrande depart={courante} onChoisir={a => outils.aller({ o: a }, true)} onResultat={dire} />, r.ok ? r.fiche.titre : "Fil DMC");

  useEffect(() => {
    const modes: ModePoint[] = [];
    if (r.ok) {
      modes.push({ id: "fd-tout", nom: "Tout voir", groupe: "metier", icone: <Expand aria-hidden="true" />, aide: "la fiche en entier : sources, version, relations, limites", ouvrir: grand });
      modes.push(...commandesDeFiche(r.fiche, ROLE, (_a, res) => dire(res.message + (res.verification ? " " + res.verification : ""))));
    }
    if (liste.length > 1) modes.push(
      { id: "fd-precedent", nom: "Précédent", groupe: "metier", icone: <SkipBack aria-hidden="true" />, aide: "le fil précédent de la liste", ouvrir: () => aller(liste[(i - 1 + liste.length) % liste.length].code) },
      { id: "fd-suivant", nom: "Suivant", groupe: "metier", icone: <SkipForward aria-hidden="true" />, aide: "le fil suivant de la liste", ouvrir: () => aller(liste[(i + 1) % liste.length].code) });
    modes.push(
      { id: "fd-rechercher", nom: "Rechercher", groupe: "metier", icone: <Search aria-hidden="true" />, aide: "par code ou par nom, en français ou en anglais (« rouge », « 310 »)",
        ouvrir: () => outils.demander("Rechercher un fil (code ou nom)", recherche, setRecherche) },
      { id: "fd-familles", nom: "Familles", groupe: "metier", icone: <Palette aria-hidden="true" />, aide: "parcourir une famille de couleur", actif: !!famId, ouvrir: famille,
        enfants: () => [{ id: "fd-fam-toutes", nom: "Toutes", groupe: "metier" as const, aide: "tous les fils de la table", actif: !famId, ouvrir: () => outils.aller({ o: courante, f: undefined }) },
          ...FAMILLES.map(f => ({ id: "fd-fam-" + f.id, nom: f.nom, groupe: "metier" as const, couleur: f.hex, aide: `les ${filsParFamille().get(f.id)?.length ?? 0} fils de la famille « ${f.nom} »`, actif: famId === f.id,
            ouvrir: () => { const premier = filsParFamille().get(f.id)?.[0]; outils.aller({ o: premier !== undefined ? adresse("dmc", FLOSS[premier].code) : courante, f: { famille: f.id } }); } }))] },
      { id: "fd-toile", nom: "Ma toile", groupe: "metier", icone: <Undo2 aria-hidden="true" />, aide: "revenir à la toile en cours", ouvrir: () => outils.aller({ o: undefined, f: undefined }) });
    publier(modes, r.ok
      ? `${r.fiche.titre} · ${r.fiche.sous} · ${liste.length ? `${i + 1} sur ${liste.length}${famId ? " dans la famille" : ""}` : "aucun fil dans cette liste"}`
      : r.raison);
  }, [courante, famId, recherche, liste, r]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!liste.length) return <div className="dq-vide"><p className="dq-vide-titre">Aucun fil</p><p>Aucun fil ne correspond à « {recherche} ». Changez la recherche.</p></div>;
  return <div className="dq-fiche" data-objet={courante}>
    <FicheContextuelle adresse={courante} role={ROLE} presentation="disque" onAgrandir={grand} onNaviguer={a => outils.aller({ o: a })}
      onResultat={res => dire(res.message + (res.verification ? " " + res.verification : ""))} />
  </div>;
}
