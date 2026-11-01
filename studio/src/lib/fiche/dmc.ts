/**
 * Le domaine « fil DMC » de la fiche contextuelle. Il LIT ses sources réelles, il ne copie rien :
 *  - la table des 489 fils (lib/dmc.ts, craft-color-codes) : référence, nom, couleur d'écran ;
 *  - le classement par familles (lib/famillesFils.ts) et l'écart de couleur CIEDE2000 (lib/dmc.ts) ;
 *  - le profil de la brodeuse (lib/brodeuseProfile.ts) : le stock de fils et les fils préférés, sur cet appareil ;
 *  - la toile en cours dans l'atelier (lib/store.ts, lib/pattern.ts) : l'usage de ce fil.
 * Les sources sont injectables (tests) ; par défaut, ce sont celles de l'atelier : le stock écrit ici est celui que l'atelier lit.
 */
import table from "craft-color-codes/data/json/dmc-floss.json";
import { BASE_FLOSS, FLOSS, nearestFlossList, contrastOn } from "../dmc";
import { FAMILLES, familleDe, filsParFamille } from "../famillesFils";
import { loadBrodeuseProfile, saveBrodeuseProfile, type BrodeuseProfile } from "../brodeuseProfile";
import { loadStored } from "../store";
import { computeStats, SKEIN_M, type Pattern } from "../pattern";
import type { Action, Fait, Fiche, Relation, Resultat, Source } from "./fiche";
import type { Domaine } from "./registre";

export interface SourcesDmc {
  profil(): BrodeuseProfile;
  enregistrerProfil(p: BrodeuseProfile): void;
  toile(): Pattern | null;
}
export const sourcesDeLAtelier: SourcesDmc = { profil: loadBrodeuseProfile, enregistrerProfil: saveBrodeuseProfile, toile: loadStored };

const MAX_ECHEVEAUX = 1000;
const nombre = (n: number, d = 1) => n.toLocaleString("fr-FR", { maximumFractionDigits: d });
const echeveaux = (n: number) => `${nombre(n, 0)} écheveau${n > 1 ? "x" : ""}`;

const SOURCES: Source[] = [
  { id: "table", libelle: `Table des fils DMC (${table.id}, ${table.count} fils)`, lieu: "code",
    detail: `Données « ${table.product} », licence ${table.license}, statut « ${table.status} » : des couleurs d'écran, pas des mesures du fil.` },
  { id: "famille", libelle: "Classement par familles de couleur", lieu: "calcul", detail: "Calculé sur la teinte, la saturation et la clarté de la couleur d'écran : ce n'est pas un classement DMC." },
  { id: "ecart", libelle: "Écart de couleur CIEDE2000", lieu: "calcul", detail: "Calculé entre les couleurs d'écran de la table." },
  { id: "profil", libelle: "Votre profil de brodeuse", lieu: "appareil", detail: "Enregistré dans ce navigateur, sur cet appareil. Il n'est pas synchronisé." },
  { id: "toile", libelle: "La toile en cours dans l'atelier", lieu: "appareil", detail: "Celle que l'atelier a gardée sur cet appareil." },
];

/** retrouve un fil de la table par son code (sans tenir compte de la casse) ; les mélanges de session ne sont pas des fils */
const trouver = (code: string) => BASE_FLOSS.findIndex(f => f.code.toLowerCase() === code.toLowerCase());

export function domaineDmc(src: SourcesDmc = sourcesDeLAtelier): Domaine {
  return {
    id: "dmc", nom: "Fil DMC",
    resoudre(id): Fiche | null {
      const i = trouver(id); if (i < 0) return null;
      const f = FLOSS[i], code = f.code;

      /* ——— lire les sources de la personne, sans jamais faire échouer la fiche ——— */
      let profil: BrodeuseProfile | null = null, toile: Pattern | null = null, ennuiProfil = "";
      try { profil = src.profil(); } catch { ennuiProfil = "Le profil n'a pas pu être lu sur cet appareil."; }
      try { toile = src.toile(); } catch { toile = null; }
      const stock = profil?.stock[code];

      const famId = familleDe(f.hex), fam = FAMILLES.find(x => x.id === famId)!, nbFam = filsParFamille().get(famId)?.length ?? 0;

      /* ——— les informations, chacune avec sa source ; ce qui manque le dit ——— */
      const faits: Fait[] = [
        { cle: "reference", libelle: "Référence", valeur: `DMC ${code}`, statut: "lu", source: "table" },
        { cle: "nom", libelle: "Nom (anglais, comme dans la table)", valeur: f.name, statut: "lu", source: "table" },
        { cle: "couleur", libelle: "Couleur d'écran", valeur: `${f.hex.toUpperCase()} · rouge ${f.rgb[0]}, vert ${f.rgb[1]}, bleu ${f.rgb[2]}`, statut: "lu", source: "table" },
        { cle: "famille", libelle: "Famille de couleur", valeur: `${fam.nom} · ${nbFam} fils`, statut: "calcule", source: "famille", principal: true },
        { cle: "clarte", libelle: "Clarté (L* de CIELAB)", valeur: `${nombre(f.lab[0], 0)} sur 100`, statut: "calcule", source: "ecart" },
        stock
          ? { cle: "stock", libelle: "Votre stock", visibilite: "prive", principal: true, statut: "declare", source: "profil",
              valeur: `${echeveaux(stock.skeins)}${stock.remainingMeters ? ` + ${nombre(stock.remainingMeters)} m restants` : ""}` }
          : { cle: "stock", libelle: "Votre stock", visibilite: "prive", principal: true, statut: "manquant", source: "profil", valeur: null,
              manque: ennuiProfil || "Vous n'avez pas encore enregistré ce fil dans votre stock (ce n'est pas la même chose qu'un stock à zéro)." },
        profil
          ? { cle: "preferee", libelle: "Fil préféré", visibilite: "prive", statut: "declare", source: "profil", valeur: profil.preferredCodes.some(c => c.toLowerCase() === code.toLowerCase()) ? "Oui" : "Non" }
          : { cle: "preferee", libelle: "Fil préféré", visibilite: "prive", statut: "manquant", source: "profil", valeur: null, manque: ennuiProfil },
        usage(toile, code),
      ];

      /* ——— les relations : les fils DMC les plus proches par la couleur, avec leur écart ——— */
      const relations: Relation[] = nearestFlossList(f.lab, 5).filter(x => x.idx !== i).slice(0, 4).map(x => ({
        domaine: "dmc", id: FLOSS[x.idx].code, libelle: `DMC ${FLOSS[x.idx].code} · ${FLOSS[x.idx].name}`, nature: "teinte voisine",
        raison: "Couleur d'écran proche dans l'espace CIELAB : une substitution possible, à vérifier sur une carte physique.",
        mesure: `ΔE ${nombre(x.deltaE)}`, navigable: true,
      }));

      /* ——— les actions : une liste fermée, avec ce que chacune modifie ——— */
      const actions: Action[] = [];
      const avant = stock?.skeins ?? 0;
      if (avant < MAX_ECHEVEAUX) actions.push({
        id: "stock-ajouter", nom: "+1 écheveau", aide: `ajouter un écheveau entier de DMC ${code} à votre stock`, roles: ["proprietaire"],
        effet: { quoi: `votre stock de DMC ${code} passe de ${echeveaux(avant)} à ${echeveaux(avant + 1)}`, ou: "profil de brodeuse, sur cet appareil", reversible: true },
        executer: () => changerStock(src, code, +1),
      });
      if (avant >= 1) actions.push({
        id: "stock-retirer", nom: "−1 écheveau", aide: `retirer un écheveau de DMC ${code} de votre stock`, roles: ["proprietaire"],
        effet: { quoi: `votre stock de DMC ${code} passe de ${echeveaux(avant)} à ${echeveaux(avant - 1)}`, ou: "profil de brodeuse, sur cet appareil", reversible: true },
        executer: () => changerStock(src, code, -1),
      });

      return {
        domaine: "dmc", id: code, surtitre: "Fil DMC", titre: `DMC ${code}`, sous: f.name,
        apercu: { genre: "couleur", hex: f.hex, texte: contrastOn(f.hex), alt: `Aperçu de la couleur d'écran du fil DMC ${code}, ${f.name}, ${f.hex.toUpperCase()}` },
        faits, relations, sources: SOURCES, actions,
        version: { libelle: `Table « ${table.id} », ${table.count} fils, statut « ${table.status} »`, source: "table" },
        limites: [
          "Les couleurs sont des approximations d'écran : DMC ne publie pas de table RVB officielle. Confirmez sur une carte physique avant un achat important.",
          "Cette fiche décrit une référence de fil d'après une table libre ; ce n'est pas une fiche produit du fabricant.",
          "Les équivalences affichées sont des fils DMC voisins par la couleur ; celles en perles ou chez d'autres marques ne sont pas affichées ici.",
          "Le stock et l'usage viennent de cet appareil : ils ne sont pas synchronisés avec un autre.",
        ],
      };
    },
  };
}

/** L'usage de ce fil dans la toile en cours : lu, ou dit absent. */
function usage(toile: Pattern | null, code: string): Fait {
  const base = { cle: "usage", libelle: "Dans la toile en cours", visibilite: "prive" as const, source: "toile" };
  if (!toile) return { ...base, statut: "manquant", valeur: null, manque: "Aucune toile n'est ouverte dans l'atelier sur cet appareil." };
  try {
    const ligne = computeStats(toile).rows.find(r => r.code === code);
    if (!ligne) return { ...base, statut: "calcule", valeur: `Ce fil n'est pas utilisé dans « ${toile.name} ».` };
    const points = ligne.cross + ligne.half + ligne.quarter + ligne.back + ligne.long + ligne.knots;
    return { ...base, statut: "calcule", valeur: `${nombre(points, 0)} point${points > 1 ? "s" : ""} dans « ${toile.name} » · ${nombre(ligne.meters)} m · ${nombre(ligne.meters / SKEIN_M)} écheveau${ligne.meters / SKEIN_M >= 2 ? "x" : ""} à prévoir` };
  } catch { return { ...base, statut: "manquant", valeur: null, manque: "La toile en cours n'a pas pu être lue." }; }
}

/** +1 / −1 écheveau : écrit le profil de l'atelier, puis le RELIT ; le message ne dit que ce qui a été constaté. */
function changerStock(src: SourcesDmc, code: string, delta: 1 | -1): Resultat {
  const profil = src.profil(), actuel = profil.stock[code] ?? { skeins: 0, remainingMeters: 0 };
  const cible = actuel.skeins + delta;
  if (cible < 0) return { ok: false, message: "Il n'y a aucun écheveau à retirer." };
  if (cible > MAX_ECHEVEAUX) return { ok: false, message: `Le stock d'un fil est limité à ${MAX_ECHEVEAUX} écheveaux.` };
  try { src.enregistrerProfil({ ...profil, stock: { ...profil.stock, [code]: { skeins: cible, remainingMeters: actuel.remainingMeters } } }); }
  catch (e) { return { ok: false, message: e instanceof Error ? e.message : "Le stock n'a pas pu être enregistré." }; }
  const relu = src.profil().stock[code];
  if (!relu || relu.skeins !== cible) return { ok: false, message: "L'enregistrement n'a pas pu être confirmé en relisant le profil : rien n'est garanti." };
  return {
    ok: true,
    message: `${delta > 0 ? "+1" : "−1"} écheveau de DMC ${code} : vous en avez maintenant ${nombre(relu.skeins, 0)}.`,
    verification: `Relu depuis le profil enregistré : ${echeveaux(relu.skeins)}.`,
  };
}
