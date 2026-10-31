/**
 * Les points lumineux du Point (Disque universel) : un état sémantique attaché à une COMMANDE (son identifiant), jamais à une position.
 * Le même état peut se montrer sous une commande radiale, dans un bouton de dock ou un bloc de la Grille : « un état, plusieurs représentations ».
 * Les modules métier publient des événements réels (import terminé, export prêt, couleur terminée, décision attendue…) ;
 * le Point n'invente aucun statut. Aucune IA : tout vient d'événements structurés et de règles explicites.
 * Portable : aucun import métier (test pointPortable).
 */
import type { ModePoint } from "./modes";

export type EtatIndicateur = "repos" | "guide" | "info" | "action" | "encours" | "reussite" | "erreur";
/** l'ordre d'importance, quand plusieurs états se rencontrent (sur une commande ou sur l'Orbe) */
export const PRIORITE_ETAT: Record<EtatIndicateur, number> = { erreur: 60, action: 50, encours: 40, guide: 30, reussite: 20, info: 10, repos: 0 };
/** ce que dit chaque état, en plus du libellé (lecteur d'écran, et jamais la couleur seule) */
export const MOT_ETAT: Record<EtatIndicateur, string> = { repos: "", guide: "suggestion", info: "information", action: "décision attendue", encours: "en cours", reussite: "terminé", erreur: "erreur" };

export interface Indicateur {
  /** l'événement (stable : republier le même id remplace l'état précédent) */
  id: string;
  /** la commande concernée, par son identifiant dans le registre (« fils », « exp-projet », « dmc-3328 ») */
  commande: string;
  /** le contexte (le type de bloc : « broderie », « image »…) */
  contexte: string;
  etat: EtatIndicateur;
  /** une phrase courte : ce qui se passe (dite au lecteur d'écran, montrée dans le cartouche) */
  libelle: string;
  /** une priorité fine, à état égal (plus grand d'abord) */
  priorite?: number;
  /** temporaire : il s'efface seul après cette durée (ms) ; sinon persistant jusqu'à résolution */
  duree?: number;
  /** annoncer au lecteur d'écran (faux si le module l'annonce déjà, pour éviter les doublons) */
  annonce?: boolean;
  /** une action proposée, par son chemin dans le registre autorisé (jamais exécutée sans geste) */
  action?: string[];
  consulte?: boolean;
  resolu?: boolean;
  cree?: number;
}
export interface EtatCommande { etat: EtatIndicateur; mot: string; libelle: string; herite: boolean; id: string }

type Ecouteur = (l: Indicateur[]) => void;
/** Un tableau d'indicateurs : un par contexte d'affichage (un disque, une page). */
export class Indicateurs {
  private liste: Indicateur[] = []; private ecouteurs = new Set<Ecouteur>(); private minuteurs = new Map<string, ReturnType<typeof setTimeout>>(); private n = 0;
  publier(i: Indicateur) {
    const x = { ...i, cree: ++this.n, consulte: false, resolu: false };
    this.liste = [...this.liste.filter(y => y.id !== i.id), x];
    clearTimeout(this.minuteurs.get(i.id)); this.minuteurs.delete(i.id);
    if (i.duree) this.minuteurs.set(i.id, setTimeout(() => this.retirer(i.id), i.duree));
    this.emettre();
  }
  retirer(id: string) { if (!this.liste.some(i => i.id === id)) return; clearTimeout(this.minuteurs.get(id)); this.minuteurs.delete(id); this.liste = this.liste.filter(i => i.id !== id); this.emettre(); }
  resoudre(id: string) { this.retirer(id); }
  /** consulté : l'information a été vue (elle ne réclame plus l'attention de l'Orbe), mais reste lisible jusqu'à son terme */
  consulter(id: string) { let ch = false; this.liste = this.liste.map(i => (i.id === id && !i.consulte ? ((ch = true), { ...i, consulte: true }) : i)); if (ch) this.emettre(); }
  actifs(contexte?: string) { return this.liste.filter(i => !i.resolu && (!contexte || i.contexte === contexte)); }
  abonner(f: Ecouteur) { this.ecouteurs.add(f); f(this.liste); return () => { this.ecouteurs.delete(f); }; }
  vider() { for (const t of this.minuteurs.values()) clearTimeout(t); this.minuteurs.clear(); this.liste = []; this.emettre(); }
  private emettre() { const l = this.liste; for (const f of this.ecouteurs) f(l); }
}

/** Le plus important d'abord : état, puis priorité fine, puis le plus récent. */
export const trier = (l: Indicateur[]) => [...l].sort((a, b) => PRIORITE_ETAT[b.etat] - PRIORITE_ETAT[a.etat] || (b.priorite ?? 0) - (a.priorite ?? 0) || (b.cree ?? 0) - (a.cree ?? 0));

/* les identifiants d'une commande et de ses descendants (profondeur bornée : une famille DMC compte quelques centaines de nuances) */
function contient(m: ModePoint, id: string, profondeur = 3): boolean {
  if (!m.enfants || profondeur <= 0) return false;
  try { return m.enfants().some(e => e.id === id || contient(e, id, profondeur - 1)); } catch { return false; }
}
/**
 * L'état d'une commande : directement attaché, ou hérité d'un sous-menu (signalé comme tel : jamais un état trompeur).
 * Un état hérité ne remonte que s'il réclame une intervention ou une attention (pas un simple « terminé » déjà vu).
 */
export function etatDe(m: ModePoint, liste: Indicateur[]): EtatCommande | null {
  const directs = trier(liste.filter(i => i.commande === m.id));
  if (directs[0]) return { etat: directs[0].etat, mot: MOT_ETAT[directs[0].etat], libelle: directs[0].libelle, herite: false, id: directs[0].id };
  const dessous = trier(liste.filter(i => i.commande !== m.id && !(i.consulte && PRIORITE_ETAT[i.etat] < PRIORITE_ETAT.encours) && contient(m, i.commande)));
  return dessous[0] ? { etat: dessous[0].etat, mot: MOT_ETAT[dessous[0].etat], libelle: dessous[0].libelle, herite: true, id: dessous[0].id } : null;
}

/** Les commandes d'un niveau, chacune avec son point (et leurs familles, à la demande) : la couche visuelle interprète, le registre ne change pas. */
export function decorer(modes: ModePoint[], liste: Indicateur[], consulter?: (id: string) => void): ModePoint[] {
  if (!liste.length) return modes;
  return modes.map(m => {
    const e = etatDe(m, liste);
    return { ...m, indicateur: e ?? m.indicateur,   /* un état déclaré par le module (ex. « pont nécessaire ») reste, sauf événement plus récent */
      ouvrir: e && !e.herite && consulter ? () => { consulter(e.id); m.ouvrir(); } : m.ouvrir,
      enfants: m.enfants ? () => decorer(m.enfants!(), liste, consulter) : undefined };
  });
}

/** Ce qui réclame l'attention générale (l'Orbe) : non consulté, au-delà d'une simple suggestion. */
export const aVoir = (l: Indicateur[]) => trier(l.filter(i => !i.consulte && PRIORITE_ETAT[i.etat] >= PRIORITE_ETAT.reussite && i.etat !== "guide"));
