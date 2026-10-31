/**
 * L'Orbe relationnelle — un moteur DÉTERMINISTE (aucune IA) qui donne une forme au cycle :
 *   Recevoir → Situer → Comprendre → Agir → Vérifier → Répondre      (ou : Recevoir → Demander → Clarifier → Agir).
 * Principe : comprendre la personne avant de répondre — à partir du seul contexte AUTORISÉ (l'univers actif, l'action demandée,
 * l'élément choisi, les préférences explicites) ; rien n'est lu ailleurs, rien n'est deviné sur la personne (aucune émotion).
 * Chaque signal dit d'où il vient : « donnée » (un fait vérifié par le moteur, avec sa preuve) ou « illustratif » (une mise en forme).
 * Une action non vérifiée ne reçoit jamais l'état « réussite ».
 */

export type Phase = "presence" | "reception" | "contexte" | "clarification" | "action" | "verification" | "echo";
export type Intention = "explorer" | "comprendre" | "creer" | "aide" | "signaler" | "plus-simple";
export type Issue = "reussite" | "echec" | "refus" | "confirmation" | "precision" | "information";
/** l'origine d'un signal lumineux : jamais une couleur sans raison */
export type Signal = { genre: "donnee"; source: string } | { genre: "illustratif"; raison: string };

export interface IntentionDef { id: Intention; nom: string; couleur: string; aide: string }
/** une couleur choisie par la personne exprime une INTENTION ; elle n'est jamais lue comme une émotion */
export const INTENTIONS: IntentionDef[] = [
  { id: "explorer", nom: "Explorer", couleur: "#8ab4ff", aide: "voir ce qu’il y a ici" },
  { id: "comprendre", nom: "Comprendre", couleur: "#c9b8ff", aide: "en savoir plus sur ce qui est choisi" },
  { id: "creer", nom: "Créer", couleur: "#86dc9d", aide: "faire quelque chose de nouveau" },
  { id: "aide", nom: "Demander de l’aide", couleur: "#f4f4f2", aide: "les actions utiles ici" },
  { id: "signaler", nom: "Signaler un problème", couleur: "#ffb86b", aide: "noter ce qui ne va pas (gardé sur cet appareil)" },
  { id: "plus-simple", nom: "Plus simple", couleur: "#ffd6ec", aide: "des explications plus simples, pas à pas" },
];

/** les phrases de confiance (l'Orbe sait dire ce qu'elle ignore) */
export const PHRASES = {
  manque: "Je n’ai pas assez d’informations.",
  nonVerifie: "Je n’ai pas vérifié ce résultat.",
  accord: "J’ai besoin de votre accord.",
  echec: "Cette action a échoué.",
  nonAutorise: "Je n’ai pas l’autorisation de faire cela ici.",
} as const;

/** le contexte autorisé : la liste FERMÉE de ce que l'Orbe peut connaître (et rien d'autre) */
export interface ContexteAutorise {
  univers: string;
  action?: string;
  element?: { genre: "dossier" | "fichier"; nom: string; extension: string; lu: boolean };
  /** le dépôt du dossier de travail, s'il existe (sa branche, le nombre de changements) */
  depot?: { branche: string; changements: number };
  preferences: { guidage: Guidage; presentation: "auto" | "arc" | "liste"; mouvementReduit: boolean };
  autorisations: string[];
}
export type Guidage = "discret" | "standard" | "pas-a-pas";
export const CHAMPS_CONTEXTE = ["univers", "action", "element", "depot", "preferences", "autorisations"] as const;

export interface Choix { id: string; libelle: string; commande?: string; args?: Record<string, string> }
export interface Etape { phase: Phase; texte: string; signal: Signal }
export interface Reponse {
  issue: Issue; titre: string; texte: string;
  etapes: Etape[];
  /** une question (demande ambiguë) ou des actions proposées (choix) */
  question?: string; choix?: Choix[];
  /** ce qui prouve le résultat (affiché) ; absent → l'issue ne peut pas être « réussite » */
  preuve?: string;
  /** la commande à confirmer */
  attente?: { commande: string; args: Record<string, string> };
}

/** ce qu'un univers fournit à l'Orbe : ses capacités, ses permissions, l'exécution et la VÉRIFICATION */
export interface UniversRelationnel {
  contexte(): Promise<ContexteAutorise>;
  /** les actions proposées pour une intention, dans ce contexte (table déterministe) ; [] = ambigu ou impossible */
  proposer(i: Intention, c: ContexteAutorise): { question?: string; choix: Choix[] };
  permis(commande: string, c: ContexteAutorise): { permis: true; confirmation?: boolean } | { permis: false; raison: string };
  executer(commande: string, args: Record<string, string>): Promise<{ ok: boolean; resume: string; erreur?: string }>;
  verifier(commande: string, args: Record<string, string>): Promise<{ verifie: boolean; preuve: string }>;
  nomCommande(commande: string): string;
}

const donnee = (source: string): Signal => ({ genre: "donnee", source });
const illus = (raison: string): Signal => ({ genre: "illustratif", raison });
const simple = (c: ContexteAutorise, normal: string, pasAPas: string) => c.preferences.guidage === "pas-a-pas" ? pasAPas : normal;

export class Orbe {
  constructor(private u: UniversRelationnel) {}

  /** une intention choisie (éventuellement par sa couleur) : recevoir, situer, comprendre — puis demander ou proposer */
  async intention(i: Intention): Promise<Reponse> {
    const c = await this.u.contexte(), def = INTENTIONS.find(x => x.id === i)!;
    const etapes: Etape[] = [
      { phase: "reception", texte: `Demande reçue : « ${def.nom} ».`, signal: illus("l’impulsion montre que la demande est arrivée") },
      { phase: "contexte", texte: this.situer(c), signal: donnee("le contexte autorisé (univers, élément choisi, dépôt, préférences)") },
    ];
    if (i === "plus-simple") return { issue: "information", titre: "D’accord : des explications plus simples.", texte: "Une chose à la fois, avec chaque étape écrite. Vous pouvez revenir au guidage standard dans vos réglages.", etapes: [...etapes, { phase: "echo", texte: "Guidage : pas à pas.", signal: donnee("votre choix explicite") }], choix: [{ id: "garder", libelle: "Garder ce choix", commande: "pref-guidage", args: { valeur: "pas-a-pas" } }] };
    if (i === "signaler") return { issue: "precision", titre: "Que se passe-t-il ?", texte: "Décrivez le problème en quelques mots. Il reste sur cet appareil : rien n’est envoyé.", question: "Votre signalement", etapes: [...etapes, { phase: "clarification", texte: PHRASES.manque, signal: illus("une question, sans hypothèse") }], choix: [] };
    const p = this.u.proposer(i, c);
    if (p.question || !p.choix.length) return { issue: "precision", titre: p.question ?? PHRASES.manque, texte: p.choix.length ? simple(c, "Choisissez :", "Choisissez une seule chose ci-dessous. Rien ne se fera sans votre geste.") : "Rien ne correspond à cette demande ici.",
      question: p.question ?? PHRASES.manque, choix: p.choix, etapes: [...etapes, { phase: "clarification", texte: PHRASES.manque, signal: illus("l’Orbe demande au lieu de deviner") }] };
    return { issue: "information", titre: simple(c, "Voici ce que je peux faire ici.", "Voici ce que je peux faire. Choisissez une action : je la ferai, puis je vérifierai."), texte: "", choix: p.choix,
      etapes: [...etapes, { phase: "echo", texte: `${p.choix.length} action${p.choix.length > 1 ? "s" : ""} possible${p.choix.length > 1 ? "s" : ""}.`, signal: donnee("les commandes disponibles dans ce contexte") }] };
  }

  /** une commande : permis ? confirmation ? exécuter, puis VÉRIFIER avant de dire « réussi » */
  async commande(cmd: string, args: Record<string, string> = {}): Promise<Reponse> {
    const c = await this.u.contexte(), nom = this.u.nomCommande(cmd);
    const etapes: Etape[] = [
      { phase: "reception", texte: `Demande reçue : « ${nom} ».`, signal: illus("l’impulsion montre que la demande est arrivée") },
      { phase: "contexte", texte: this.situer(c), signal: donnee("le contexte autorisé") },
    ];
    const p = this.u.permis(cmd, c);
    if (!p.permis) return { issue: "refus", titre: PHRASES.nonAutorise, texte: p.raison, etapes: [...etapes, { phase: "echo", texte: p.raison, signal: donnee("la permission manquante") }] };
    if (p.confirmation && args.confirme !== "oui") return { issue: "confirmation", titre: PHRASES.accord, texte: `« ${nom} » attend votre confirmation.`, attente: { commande: cmd, args },
      etapes: [...etapes, { phase: "clarification", texte: PHRASES.accord, signal: donnee("une action irréversible ou sensible") }] };
    etapes.push({ phase: "action", texte: `${nom} : en cours.`, signal: illus("l’opération est lancée par le moteur de l’univers") });
    const r = await this.u.executer(cmd, args);
    if (!r.ok) return { issue: "echec", titre: PHRASES.echec, texte: r.erreur ?? r.resume, etapes: [...etapes, { phase: "echo", texte: r.erreur ?? r.resume, signal: donnee("l’erreur renvoyée par le moteur") }] };
    const v = await this.u.verifier(cmd, args);
    etapes.push({ phase: "verification", texte: v.verifie ? `Vérifié : ${v.preuve}` : PHRASES.nonVerifie, signal: v.verifie ? donnee(v.preuve) : illus("aucune preuve lue") });
    return v.verifie
      ? { issue: "reussite", titre: r.resume, texte: "", preuve: v.preuve, etapes: [...etapes, { phase: "echo", texte: r.resume, signal: donnee(v.preuve) }] }
      : { issue: "information", titre: r.resume, texte: PHRASES.nonVerifie, etapes: [...etapes, { phase: "echo", texte: PHRASES.nonVerifie, signal: illus("résultat non vérifié : pas de vert") }] };
  }

  /** décrire le contexte, sans rien inventer (jamais le contenu d'un fichier non lu, jamais un état de la personne) */
  situer(c: ContexteAutorise): string {
    const morceaux = [`Univers : ${c.univers}`];
    if (c.element) morceaux.push(`${c.element.genre === "dossier" ? "dossier" : "fichier"} choisi : « ${c.element.nom} »${c.element.genre === "fichier" && !c.element.lu ? " (contenu non lu)" : ""}`);
    if (c.depot) morceaux.push(`dépôt « ${c.depot.branche} » : ${c.depot.changements} changement${c.depot.changements > 1 ? "s" : ""}`);
    return morceaux.join(" · ") + ".";
  }
}
