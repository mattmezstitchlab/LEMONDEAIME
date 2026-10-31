/**
 * Le Disque Terminal, vu par l'Orbe relationnelle : son contexte autorisé, ses propositions par intention (table déterministe),
 * ses permissions, l'exécution par le moteur déjà validé, et la VÉRIFICATION de chaque résultat par une relecture réelle.
 * Le contexte ne contient jamais le contenu d'un fichier non lu, ni l'identité de la personne, ni rien d'un autre univers.
 */
import type { Choix, ContexteAutorise, Intention, UniversRelationnel } from "../orbe/relation";
import { commande } from "./contrat";
import { joindre, CORBEILLE } from "./fs";
import { estAudio } from "./audio";
import type { Moteur, Resultat } from "./moteur";
import { lireOne } from "../one/preferences";

export const AUTORISATIONS_TERMINAL = ["dossier-de-travail:lire", "dossier-de-travail:ecrire", "git:local"];

export class UniversTerminal implements UniversRelationnel {
  /** les éléments dont le contenu a réellement été lu (métadonnées, différences) : l'Orbe ne prétend rien d'autre */
  lus = new Set<string>();
  dernier: Resultat | null = null;
  constructor(private m: Moteur) {}

  async contexte(): Promise<ContexteAutorise> {
    const s = this.m.selection, p = lireOne();
    let depot: ContexteAutorise["depot"];
    if (await this.m.git.existe()) depot = { branche: (await this.m.git.branche()) ?? "?", changements: (await this.m.git.etat()).length };
    return {
      univers: "Disque Terminal",
      action: this.m.derniere?.id,
      element: s ? { genre: s.genre, nom: s.nom, extension: s.nom.includes(".") ? s.nom.split(".").pop()!.toLowerCase() : "", lu: this.lus.has(s.chemin) } : undefined,
      depot,
      preferences: { guidage: p.interaction.guidage ?? "standard", presentation: p.presentation, mouvementReduit: p.affichage.reduceMotion || document.documentElement.dataset.pzMotion === "reduce" },
      autorisations: [...AUTORISATIONS_TERMINAL],
    };
  }

  proposer(i: Intention, c: ContexteAutorise): { question?: string; choix: Choix[] } {
    const ch = (id: string, args?: Record<string, string>): Choix => ({ id, libelle: commande(id)?.nom ?? id, commande: id, args });
    const e = c.element, audio = e?.genre === "fichier" && estAudio(e.nom);
    switch (i) {
      case "explorer": return { choix: e?.genre === "dossier" ? [ch("nav-ouvrir"), ch("fic-lister")] : [ch("fic-lister"), ch("che-recents")] };
      case "comprendre":
        if (audio) return { choix: [ch("aud-meta"), ch("aud-apercu"), ch("aud-duree")] };
        if (e?.genre === "fichier") return { choix: c.depot ? [ch("git-diff")] : [ch("fic-lister")] };
        if (e?.genre === "dossier") return { choix: [ch("nav-ouvrir")] };
        return { question: "Que voulez-vous comprendre ?", choix: [...(c.depot ? [ch("git-status"), ch("git-log")] : []), { id: "dossier", libelle: "Ce dossier", commande: "fic-lister" }] };
      case "creer":
        return { question: "Créer quoi ?", choix: [ch("fic-creer"), ...(c.depot && c.depot.changements ? [{ ...ch("git-commit"), libelle: "Une validation Git" }] : [])] };
      case "aide":
        return { choix: [...(c.depot?.changements ? [ch("git-status")] : []), ...(audio ? [ch("aud-apercu")] : []), ch("fic-lister"), ch("exe-libre")].slice(0, 3) };
      default: return { choix: [] };
    }
  }

  permis(cmd: string, c: ContexteAutorise): { permis: true; confirmation?: boolean } | { permis: false; raison: string } {
    const d = commande(cmd);
    if (!d) return { permis: false, raison: "Cette commande n’existe pas dans le Disque Terminal." };
    if (d.portee === "pont" || d.risque === "reseau") return { permis: false, raison: "Le pont local n’existe pas encore : rien n’a été envoyé ni récupéré. Vos fichiers et votre dépôt restent tels quels." };
    if (d.famille === "git" && !c.depot && cmd !== "git-status") return { permis: false, raison: "Ce dossier n’est pas un dépôt Git." };
    if (d.risque === "destructif") return { permis: true, confirmation: true };
    return { permis: true };
  }

  async executer(cmd: string, args: Record<string, string>) {
    const r = await this.m.executer(cmd, args); this.dernier = r;
    const ok = r.lumiere !== "erreur" && r.lumiere !== "attention" && !["saisie", "destination", "confirmation"].includes(r.centre.genre);
    const resume = r.message ?? (r.centre.genre === "message" ? r.centre.titre : r.centre.genre === "sortie" ? r.centre.titre : r.centre.genre === "audio" ? `« ${r.centre.nom} » analysé` : commande(cmd)?.nom ?? cmd);
    if (ok && this.m.selection && ["aud-meta", "aud-apercu", "aud-duree", "aud-lire", "git-diff"].includes(cmd)) this.lus.add(this.m.selection.chemin);
    return { ok, resume, erreur: ok ? undefined : r.centre.genre === "message" ? [r.centre.titre, r.centre.texte].filter(Boolean).join(" ") : "L’action attend une précision." };
  }

  /** relire le monde réel après l'action : la seule source d'un « vérifié » */
  async verifier(cmd: string, args: Record<string, string>): Promise<{ verifie: boolean; preuve: string }> {
    const fs = this.m.fs, r = this.dernier;
    switch (cmd) {
      case "fic-creer": { const c = joindre(this.m.cwd, args.texte); return (await fs.genre(c)) === "dossier" ? { verifie: true, preuve: `le dossier « ${args.texte} » existe (dossier relu)` } : { verifie: false, preuve: "" }; }
      case "fic-renommer": { const j = this.m.journal.at(-1); const m = j?.nom.match(/« (.+) » en « (.+) »/); const vers = m ? joindre(this.m.cwd, m[2]) : ""; return vers && (await fs.genre(vers)) ? { verifie: true, preuve: `« ${m![2]} » existe (dossier relu)` } : { verifie: false, preuve: "" }; }
      case "fic-supprimer": { const l = (await fs.genre(CORBEILLE)) ? await fs.lister(CORBEILLE, { caches: true }) : []; return l.length ? { verifie: true, preuve: "l’élément est dans la corbeille (corbeille relue)" } : { verifie: false, preuve: "" }; }
      case "git-commit": { const h = await this.m.git.historique(1); return h[0]?.message === args.texte?.trim() ? { verifie: true, preuve: `dernière validation relue : ${h[0].oid} « ${h[0].message} »` } : { verifie: false, preuve: "" }; }
      case "git-add": { const n = (await this.m.git.etat()).filter(x => x.indexe).length; return n ? { verifie: true, preuve: `${n} changement${n > 1 ? "s" : ""} prêt${n > 1 ? "s" : ""} (état relu)` } : { verifie: false, preuve: "" }; }
      case "git-status": { const n = (await this.m.git.etat()).length; return { verifie: true, preuve: `état du dépôt relu : ${n} changement${n > 1 ? "s" : ""}` }; }
      case "git-log": case "git-diff": return r?.centre.genre === "sortie" ? { verifie: true, preuve: `${r.centre.lignes.length} ligne${r.centre.lignes.length > 1 ? "s" : ""} lue${r.centre.lignes.length > 1 ? "s" : ""} dans le dépôt` } : { verifie: false, preuve: "" };
      case "aud-meta": case "aud-apercu": case "aud-duree": case "aud-lire": {
        const meta = r?.centre.genre === "audio" ? r.centre.meta : undefined;
        return meta && meta.Format ? { verifie: true, preuve: `métadonnées lues : ${[meta.Format, meta.Durée, meta.Fréquence].filter(Boolean).join(", ")}` } : { verifie: false, preuve: "" };
      }
      case "fic-lister": case "nav-ouvrir": case "nav-parent": case "nav-bureau": case "che-recents": case "che-nom": case "che-extension": {
        const n = r?.centre.genre === "liste" ? r.centre.entrees.length : null; return n === null ? { verifie: false, preuve: "" } : { verifie: true, preuve: `${n} élément${n > 1 ? "s" : ""} lu${n > 1 ? "s" : ""} dans /${this.m.cwd}` };
      }
      default: return { verifie: false, preuve: "" };
    }
  }
  nomCommande(cmd: string) { return commande(cmd)?.nom ?? cmd; }
}
