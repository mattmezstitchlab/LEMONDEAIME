/**
 * Disque Terminal — le moteur : il exécute les commandes du registre sur le vrai dossier, tient le contexte
 * (dossier courant, élément choisi, favoris), le journal (annuler, rétablir) et dit, pour chaque action, la commande réelle.
 * Sans React : testable seul, réutilisable par d'autres présentations (le Disque, la liste, le clavier).
 */
import { commande, type Lumiere, type VueCentre } from "./contrat";
import { DepotGit } from "./git";
import { CORBEILLE, joindre, nomDe, normaliser, parent, tailleLisible, type Entree, type Fs } from "./fs";
import { cretes, decoder, dureeLisible, estAudio, metadonnees, noteEssai, versWav } from "./audio";

export interface Resultat { centre: VueCentre; lumiere: Lumiere; commande: string; /** la commande conseillée ensuite (point violet) */ suite?: string; message?: string }
interface Trace { nom: string; commande: string; quand: number; annuler?: () => Promise<void>; refaire?: () => Promise<void> }
export interface Reglages { voirCommande: boolean; confirmer: boolean; auteur: string; favoris: string[] }
export const REGLAGES_DEFAUT: Reglages = { voirCommande: false, confirmer: true, auteur: "", favoris: [] };

const detail = (e: Entree) => e.genre === "dossier" ? "dossier" : `${tailleLisible(e.taille)}${e.modifie ? " · " + new Date(e.modifie).toLocaleDateString("fr-FR") : ""}`;
const message = (ton: Lumiere, titre: string, texte?: string): VueCentre => ({ genre: "message", ton, titre, texte });
const MOTS_ETAT: Record<string, string> = { nouveau: "nouveau", modifie: "modifié", supprime: "supprimé", ajoute: "ajouté", "ajoute-modifie": "ajouté puis modifié" };

export class Moteur {
  cwd = ""; precedent = ""; selection: Entree | null = null;
  journal: Trace[] = []; private annules: Trace[] = [];
  derniere: { id: string; args: Record<string, string> } | null = null;
  readonly git: DepotGit;
  constructor(public fs: Fs, public reglages: Reglages = { ...REGLAGES_DEFAUT }) { this.git = new DepotGit(fs); }

  equivalent(id: string, args: Record<string, string> = {}): string {
    const c = commande(id); if (!c) return "";
    return c.equivalent({ cible: this.selection?.chemin ?? "", destination: this.cwd || ".", ...args });
  }
  /** ce qui manque avant d'exécuter (le centre le demande) ; null : tout est prêt */
  manque(id: string, args: Record<string, string> = {}): Resultat | null {
    const c = commande(id); if (!c) return null;
    const s = this.selection, cmd = this.equivalent(id, args);
    const choisir = (quoi: string): Resultat => ({ centre: message("attention", `Choisissez d’abord ${quoi} au centre.`, "Touchez un élément de la liste, puis relancez l’action."), lumiere: "attention", commande: cmd });
    if (c.besoins.includes("selection") && !s) return choisir("un élément");
    if (c.besoins.includes("dossier") && s?.genre !== "dossier") return choisir("un dossier");
    if (c.besoins.includes("fichier") && s?.genre !== "fichier") return choisir("un fichier");
    if (c.besoins.includes("audio") && !(s?.genre === "fichier" && estAudio(s.nom))) return choisir("un fichier audio");
    if (c.portee === "pont") return { centre: message("attention", `${c.nom} : un pont local est nécessaire`, "Envoyer et récupérer passent par le réseau et vos identifiants Git. Dans le navigateur, .0NE ne le fait pas encore : un petit programme local (le pont) le permettra. Rien n’a été envoyé."), lumiere: "attention", commande: cmd };
    if (c.besoins.includes("destination") && !args.destination) return { centre: { genre: "destination", titre: `${c.nom} « ${s!.nom} » : choisissez le dossier d’arrivée`, commande: id }, lumiere: "recommande", commande: cmd };
    if (c.besoins.includes("texte") && !args.texte) {
      const etiquettes: Record<string, [string, string, string?]> = {
        "fic-renommer": ["Renommer", "Nouveau nom", s?.nom], "fic-creer": ["Créer un dossier", "Nom du dossier"], "git-commit": ["Valider les changements", "Message de validation", undefined],
        "che-nom": ["Chercher par nom", "Un mot du nom"], "che-extension": ["Chercher par extension", "Extension (wav, mp3, md…)"], "aud-ranger": ["Ranger dans le dépôt", "Dossier de l’album", "LUMIERE"],
        "exe-libre": ["Taper une commande", "Commande (ls, cd, mkdir, mv, cp, rm, find, git…)"], "reg-identite": ["Votre nom pour Git", "Nom", this.reglages.auteur], "git-branche": ["Branche", "Nom d’une nouvelle branche (laisser vide pour lister)"],
      };
      const [titre, etiquette, valeur] = etiquettes[id] ?? [c.nom, "Texte"];
      if (id === "git-branche" && args.texte === "") return null;
      return { centre: { genre: "saisie", titre, etiquette, valeur: valeur ?? "", commande: id, aide: c.aide }, lumiere: "recommande", commande: cmd };
    }
    if (c.risque === "destructif" && this.reglages.confirmer && args.confirme !== "oui") return { centre: { genre: "confirmation", titre: c.nom, texte: id === "reg-corbeille" ? "La corbeille sera vidée définitivement. Cette action ne peut pas être annulée." : `« ${s?.nom} » ira à la corbeille. Vous pourrez annuler.`, commande: id }, lumiere: "attention", commande: cmd };
    return null;
  }

  async lister(): Promise<VueCentre> {
    const l = await this.fs.lister(this.cwd);
    return { genre: "liste", entrees: l.map(e => ({ nom: e.nom, chemin: e.chemin, genre: e.genre, detail: detail(e) })), vide: "Ce dossier est vide." };
  }
  private async aller(chemin: string) { const n = normaliser(chemin); if ((await this.fs.genre(n)) !== "dossier") throw new Error(`« ${n || "/"} » n’est pas un dossier.`); this.precedent = this.cwd; this.cwd = n; this.selection = null; }
  private tracer(t: Omit<Trace, "quand">) { this.journal.push({ ...t, quand: Date.now() }); if (this.journal.length > 200) this.journal.shift(); if (t.annuler) this.annules = []; }
  private async depot(): Promise<boolean> { return this.git.existe(); }

  /** exécuter une commande du registre ; les erreurs deviennent un message rouge, jamais une exception muette */
  async executer(id: string, args: Record<string, string> = {}): Promise<Resultat> {
    const manque = this.manque(id, args); if (manque) return manque;
    const cmd = this.equivalent(id, args), s = this.selection;
    const ok = async (titre: string, texte?: string, suite?: string, centre?: VueCentre): Promise<Resultat> => ({ centre: centre ?? message("succes", titre, texte), lumiere: "succes", commande: cmd, suite, message: titre });
    if (!["his-annuler", "his-retablir", "exe-repeter", "his-actions", "his-commandes"].includes(id)) this.derniere = { id, args };
    try {
      switch (id) {
        /* — Naviguer — */
        case "nav-parent": await this.aller(parent(this.cwd)); break;
        case "nav-ouvrir": await this.aller(s!.chemin); break;
        case "nav-bureau": await this.aller(""); break;
        case "nav-depot": { if (!(await this.depot())) return { centre: message("attention", "Ce dossier n’est pas un dépôt Git.", "Git › Initialiser en fait un dépôt."), lumiere: "attention", commande: cmd }; await this.aller(""); break; }
        case "nav-retour": await this.aller(this.precedent); break;
        case "nav-favoris": {
          if (args.ajouter === "oui") { if (!this.reglages.favoris.includes(this.cwd)) this.reglages.favoris.push(this.cwd); return ok(`« /${this.cwd} » ajouté aux favoris.`); }
          if (args.aller !== undefined) { await this.aller(args.aller); break; }
          return { centre: { genre: "liste", titre: "Favoris", entrees: this.reglages.favoris.map(f => ({ nom: "/" + f, chemin: f, genre: "dossier" as const, detail: "favori" })), vide: "Aucun favori : ouvrez un dossier, puis Favoris › Ajouter ce dossier." }, lumiere: "disponible", commande: cmd };
        }
        /* — Fichiers — */
        case "fic-lister": break;
        case "fic-creer": { const c = joindre(this.cwd, args.texte); await this.fs.creerDossier(c);
          this.tracer({ nom: `Créer « ${args.texte} »`, commande: cmd, annuler: () => this.fs.supprimerDefinitivement(c), refaire: () => this.fs.creerDossier(c) }); return ok(`Dossier « ${args.texte} » créé.`, undefined, undefined, await this.lister()); }
        case "fic-renommer": { const vers = joindre(parent(s!.chemin), args.texte); await this.fs.deplacer(s!.chemin, vers); const de = s!.chemin;
          this.tracer({ nom: `Renommer « ${s!.nom} » en « ${args.texte} »`, commande: cmd, annuler: () => this.fs.deplacer(vers, de), refaire: () => this.fs.deplacer(de, vers) }); this.selection = null;
          return ok(`Renommé en « ${args.texte} ».`, undefined, undefined, await this.lister()); }
        case "fic-copier": case "fic-deplacer": {
          const vers = joindre(args.destination, s!.nom), de = s!.chemin, copie = id === "fic-copier";
          if (copie) await this.fs.copier(de, vers); else await this.fs.deplacer(de, vers);
          this.tracer({ nom: `${copie ? "Copier" : "Déplacer"} « ${s!.nom} » vers /${args.destination}`, commande: cmd, annuler: () => copie ? this.fs.supprimerDefinitivement(vers) : this.fs.deplacer(vers, de), refaire: () => copie ? this.fs.copier(de, vers) : this.fs.deplacer(de, vers) });
          this.selection = null; return ok(`« ${s!.nom} » ${copie ? "copié" : "déplacé"} vers /${args.destination}.`, undefined, undefined, await this.lister()); }
        case "fic-supprimer": { const de = s!.chemin, dans = await this.fs.jeter(de);
          this.tracer({ nom: `Mettre « ${s!.nom} » à la corbeille`, commande: cmd, annuler: () => this.fs.deplacer(dans, de), refaire: async () => { await this.fs.deplacer(de, dans); } });
          this.selection = null; return ok(`« ${s!.nom} » est dans la corbeille.`, "Historique › Annuler le remet à sa place.", "his-annuler", await this.lister()); }
        /* — Git — */
        case "git-status": case "git-add": case "git-commit": case "git-log": case "git-diff": case "git-branche": {
          if (!(await this.depot())) {
            if (args.initialiser === "oui") { await this.git.initialiser(); return ok("Dépôt Git initialisé.", "Branche « principale ». Ajoutez puis validez vos fichiers.", "git-add"); }
            return { centre: { genre: "confirmation", titre: "Pas encore de dépôt Git ici", texte: "Initialiser un dépôt dans ce dossier de travail ? (git init)", commande: id + ":init" }, lumiere: "attention", commande: "git init" };
          }
          return this.git_(id, args, cmd);
        }
        /* — Chercher — */
        case "che-nom": case "che-extension": case "che-gros": case "che-recents": case "che-doublons": return this.chercher(id, args, cmd);
        /* — Audio — */
        case "aud-lire": case "aud-apercu": case "aud-duree": case "aud-meta": {
          const f = await this.fs.lire(s!.chemin), meta = await metadonnees(f, s!.nom);
          const m: Record<string, string> = { Format: meta.format, Taille: tailleLisible(f.size) };
          if (meta.titre) m.Titre = meta.titre; if (meta.artiste) m.Artiste = meta.artiste; if (meta.album) m.Album = meta.album; if (meta.piste) m.Piste = meta.piste; if (meta.annee) m.Année = meta.annee;
          if (meta.frequence) m.Fréquence = `${meta.frequence} Hz`; if (meta.canaux) m.Canaux = meta.canaux === 1 ? "mono" : meta.canaux === 2 ? "stéréo" : String(meta.canaux); if (meta.bits) m.Résolution = `${meta.bits} bits`;
          let duree: number | undefined, onde: number[] | undefined;
          if (id !== "aud-meta") { const a = await decoder(f); duree = a.duration; m.Durée = dureeLisible(a.duration); if (id === "aud-apercu" || id === "aud-lire") onde = cretes(a, 180); }
          return { centre: { genre: "audio", chemin: s!.chemin, nom: s!.nom, duree, cretes: onde, meta: m }, lumiere: id === "aud-lire" ? "encours" : "succes", commande: cmd };
        }
        case "aud-convertir": {
          const vers = s!.chemin.replace(/\.[^.]+$/, "") + (s!.nom.toLowerCase().endsWith(".wav") ? "-16bits.wav" : ".wav");
          if (await this.fs.genre(vers)) throw new Error(`« ${nomDe(vers)} » existe déjà.`);
          const a = await decoder(await this.fs.lire(s!.chemin)); await this.fs.ecrire(vers, versWav(a));
          this.tracer({ nom: `Convertir « ${s!.nom} » en WAV`, commande: cmd, annuler: () => this.fs.supprimerDefinitivement(vers), refaire: async () => { await this.fs.ecrire(vers, versWav(await decoder(await this.fs.lire(s!.chemin)))); } });
          return ok(`Copie WAV créée : « ${nomDe(vers)} ».`, "L’original est inchangé. (L’encodage MP3 n’est pas encore disponible dans le navigateur.)", undefined, await this.lister()); }
        case "aud-ranger": {
          const album = normaliser(args.texte).replace(/\//g, "-"), dossier = joindre("assets/audio", album), vers = joindre(dossier, s!.nom), de = s!.chemin;
          await this.fs.dossier(dossier, true); await this.fs.deplacer(de, vers);
          let git = ""; if (await this.depot()) { await this.git.ajouter([vers]); git = " et préparé pour Git (git add)"; }
          this.tracer({ nom: `Ranger « ${s!.nom} » dans /${dossier}`, commande: cmd, annuler: () => this.fs.deplacer(vers, de), refaire: () => this.fs.deplacer(de, vers) });
          this.selection = null; return ok(`« ${s!.nom} » rangé dans /${dossier}${git}.`, undefined, git ? "git-commit" : undefined); }
        /* — Historique — */
        case "his-actions": return { centre: { genre: "sortie", titre: "Dernières actions", lignes: this.journal.slice(-14).reverse().map(t => ({ texte: `${new Date(t.quand).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} · ${t.nom}${t.annuler ? "" : " (non annulable)"}` })) }, lumiere: "disponible", commande: cmd };
        case "his-commandes": return { centre: { genre: "sortie", titre: "Les commandes réelles équivalentes", lignes: this.journal.slice(-14).reverse().map(t => ({ texte: "$ " + t.commande })) }, lumiere: "disponible", commande: cmd };
        case "his-annuler": { const t = [...this.journal].reverse().find(x => x.annuler && !this.annules.includes(x)); if (!t) return { centre: message("disponible", "Rien à annuler."), lumiere: "disponible", commande: cmd };
          await t.annuler!(); this.annules.push(t); return ok(`Annulé : ${t.nom}.`, undefined, undefined, await this.lister()); }
        case "his-retablir": { const t = this.annules.pop(); if (!t) return { centre: message("disponible", "Rien à rétablir."), lumiere: "disponible", commande: cmd };
          await t.refaire!(); return ok(`Rétabli : ${t.nom}.`, undefined, undefined, await this.lister()); }
        /* — Exécuter — */
        case "exe-libre": return this.libre(args.texte);
        case "exe-repeter": { if (!this.derniere) return { centre: message("disponible", "Rien à répéter."), lumiere: "disponible", commande: cmd }; return this.executer(this.derniere.id, this.derniere.args); }
        case "exe-voir": this.reglages.voirCommande = !this.reglages.voirCommande; return ok(this.reglages.voirCommande ? "La commande réelle s’affiche sous chaque action." : "La commande réelle est cachée.");
        /* — Réglages — */
        case "reg-confirmer": this.reglages.confirmer = !this.reglages.confirmer; return ok(this.reglages.confirmer ? "Confirmation avant la corbeille : oui." : "Confirmation avant la corbeille : non (tout reste annulable).");
        case "reg-identite": this.reglages.auteur = args.texte.trim().slice(0, 60); return ok(`Les validations seront signées « ${this.reglages.auteur} ».`);
        case "reg-corbeille": { if ((await this.fs.genre(CORBEILLE)) === "dossier") await this.fs.supprimerDefinitivement(CORBEILLE); this.tracer({ nom: "Vider la corbeille", commande: cmd }); return ok("Corbeille vidée."); }
        case "reg-source": return { centre: message("disponible", "Dossier de travail : " + this.fs.nom), lumiere: "disponible", commande: cmd };
        default: return { centre: message("erreur", "Commande inconnue."), lumiere: "erreur", commande: cmd };
      }
      return { centre: await this.lister(), lumiere: "succes", commande: cmd };
    } catch (e) {
      return { centre: message("erreur", "L’action n’a pas abouti.", (e as Error)?.message || String(e)), lumiere: "erreur", commande: cmd };
    }
  }

  private async git_(id: string, args: Record<string, string>, cmd: string): Promise<Resultat> {
    const g = this.git;
    if (id === "git-status") {
      const l = await g.etat(), b = await g.branche();
      if (!l.length) return { centre: { genre: "message", ton: "succes", titre: `Rien à valider sur « ${b} ».`, texte: "Le dossier de travail est propre." }, lumiere: "succes", commande: cmd };
      const prets = l.filter(x => x.indexe).length;
      return { centre: { genre: "sortie", titre: `Branche « ${b} » · ${l.length} changement${l.length > 1 ? "s" : ""}`, lignes: l.map(x => ({ texte: `${x.indexe ? "● prêt" : "○"} ${MOTS_ETAT[x.etat]} · ${x.chemin}`, ton: x.etat === "supprime" ? "retrait" : x.indexe ? "ajout" : "attention" })) },
        lumiere: "notification", commande: cmd, suite: prets ? "git-commit" : "git-add" };
    }
    if (id === "git-add") {
      const l = await g.etat(), cibles = this.selection ? l.filter(x => x.chemin === this.selection!.chemin || x.chemin.startsWith(this.selection!.chemin + "/")).map(x => x.chemin) : l.map(x => x.chemin);
      if (!cibles.length) return { centre: message("disponible", "Rien à ajouter."), lumiere: "disponible", commande: cmd };
      await g.ajouter(cibles);
      return { centre: { genre: "message", ton: "succes", titre: `${cibles.length} changement${cibles.length > 1 ? "s" : ""} prêt${cibles.length > 1 ? "s" : ""} à valider.`, texte: cibles.slice(0, 6).join(" · ") + (cibles.length > 6 ? " …" : "") }, lumiere: "succes", commande: cmd, suite: "git-commit" };
    }
    if (id === "git-commit") {
      const prets = (await g.etat()).filter(x => x.indexe);
      if (!prets.length) return { centre: message("attention", "Rien n’est prêt à valider.", "Git › Ajouter d’abord."), lumiere: "attention", commande: cmd, suite: "git-add" };
      const nom = this.reglages.auteur || "Personne .0NE";
      const oid = await g.valider(args.texte, { name: nom, email: "local@one.invalid" });
      return { centre: { genre: "progression", titre: `Validé : « ${args.texte} »`, part: 1, etape: `${oid.slice(0, 7)} · ${prets.length} fichier${prets.length > 1 ? "s" : ""} · ${nom}` }, lumiere: "succes", commande: cmd };   /* envoyer demande un pont : on ne le recommande pas tant qu’il n’existe pas */
    }
    if (id === "git-log") {
      const h = await g.historique();
      return { centre: { genre: "sortie", titre: `Historique · ${await g.branche()}`, lignes: h.length ? h.map(c => ({ texte: `${c.oid} · ${c.message.split("\n")[0]} — ${c.auteur}, ${new Date(c.date).toLocaleDateString("fr-FR")}` })) : [{ texte: "Aucune validation pour l’instant." }] }, lumiere: "disponible", commande: cmd };
    }
    if (id === "git-diff") {
      const d = await g.difference(this.selection!.chemin), changees = d.lignes.filter(l => l.genre !== " ");
      return { centre: { genre: "sortie", titre: `Différences · ${this.selection!.nom}`, lignes: changees.length ? changees.slice(0, 80).map(l => ({ texte: `${l.genre} ${l.texte}`, ton: l.genre === "+" ? "ajout" : "retrait" })) : [{ texte: "Aucune différence avec la dernière validation." }] }, lumiere: "disponible", commande: cmd };
    }
    /* git-branche */
    if (args.texte) { await g.creerBranche(args.texte); return { centre: message("succes", `Branche « ${args.texte} » créée et choisie.`), lumiere: "succes", commande: cmd }; }
    if (args.aller) { await g.changerBranche(args.aller); return { centre: message("succes", `Branche « ${args.aller} » choisie.`), lumiere: "succes", commande: `git switch ${args.aller}` }; }
    const b = await g.branche();
    return { centre: { genre: "sortie", titre: "Branches", lignes: (await g.branches()).map(x => ({ texte: `${x === b ? "● " : "  "}${x}`, ton: x === b ? "ajout" : "neutre" })) }, lumiere: "disponible", commande: cmd };
  }

  private async chercher(id: string, args: Record<string, string>, cmd: string): Promise<Resultat> {
    const tous: Entree[] = []; for await (const e of this.fs.parcourir(this.cwd)) if (e.genre === "fichier") tous.push(e);
    let r: Entree[] = [], titre = "";
    const mot = (args.texte ?? "").toLowerCase().replace(/^\*?\.?/, "");
    if (id === "che-nom") { r = tous.filter(e => e.nom.toLowerCase().includes((args.texte ?? "").toLowerCase())); titre = `« ${args.texte} » dans le nom`; }
    if (id === "che-extension") { r = tous.filter(e => e.nom.toLowerCase().endsWith("." + mot)); titre = `Fichiers .${mot}`; }
    if (id === "che-gros") { r = [...tous].sort((a, b) => b.taille - a.taille).slice(0, 20); titre = "Les plus gros fichiers"; }
    if (id === "che-recents") { const lim = Date.now() - 7 * 86400000; r = tous.filter(e => e.modifie >= lim).sort((a, b) => b.modifie - a.modifie); titre = "Modifiés ces 7 derniers jours"; }
    if (id === "che-doublons") {
      const parTaille = new Map<number, Entree[]>(); for (const e of tous) if (e.taille > 0) parTaille.set(e.taille, [...(parTaille.get(e.taille) ?? []), e]);
      const groupes: Entree[][] = [];
      for (const l of parTaille.values()) if (l.length > 1) { const parEmpreinte = new Map<string, Entree[]>();
        for (const e of l) { const h = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", await (await this.fs.lire(e.chemin)).arrayBuffer()))).map(x => x.toString(16).padStart(2, "0")).join(""); parEmpreinte.set(h, [...(parEmpreinte.get(h) ?? []), e]); }
        for (const g of parEmpreinte.values()) if (g.length > 1) groupes.push(g); }
      return { centre: { genre: "sortie", titre: groupes.length ? `${groupes.length} groupe${groupes.length > 1 ? "s" : ""} de doublons` : "Aucun doublon", lignes: groupes.flatMap((g, k) => [{ texte: `Groupe ${k + 1} · ${tailleLisible(g[0].taille)}`, ton: "attention" as const }, ...g.map(e => ({ texte: "  /" + e.chemin }))]) }, lumiere: groupes.length ? "notification" : "succes", commande: cmd };
    }
    return { centre: { genre: "liste", titre: `${titre} · ${r.length}`, entrees: r.map(e => ({ nom: e.chemin.slice(this.cwd ? this.cwd.length + 1 : 0), chemin: e.chemin, genre: "fichier" as const, detail: detail(e) })), vide: "Aucun résultat." }, lumiere: r.length ? "succes" : "disponible", commande: cmd };
  }

  /** la commande tapée : un petit sous-ensemble, traduit vers LES MÊMES actions (rien n'est exécuté par un interpréteur) */
  async libre(ligne: string): Promise<Resultat> {
    const mots = (ligne.match(/"[^"]*"|'[^']*'|\S+/g) ?? []).map(m => m.replace(/^["']|["']$/g, "")), [a, b, c, ...reste] = mots;
    const choisir = async (chemin: string) => { const n = joindre(this.cwd, chemin), g = await this.fs.genre(n); if (!g) throw new Error(`« ${chemin} » n’existe pas.`); this.selection = { nom: nomDe(n), chemin: n, genre: g, taille: 0, modifie: 0 }; };
    try {
      if (a === "ls" || a === "ll") return this.executer("fic-lister");
      if (a === "pwd") return { centre: message("disponible", "/" + this.cwd), lumiere: "disponible", commande: "pwd" };
      if (a === "cd") { if (!b || b === "~") return this.executer("nav-bureau"); if (b === "..") return this.executer("nav-parent"); if (b === "-") return this.executer("nav-retour"); await choisir(b); return this.executer("nav-ouvrir"); }
      if (a === "mkdir") return this.executer("fic-creer", { texte: b === "-p" ? c : b });
      if ((a === "mv" || a === "cp") && b && c) { await choisir(b); const dest = joindre(this.cwd, c);
        if ((await this.fs.genre(dest)) === "dossier") return this.executer(a === "mv" ? "fic-deplacer" : "fic-copier", { destination: dest });
        if (a === "mv" && parent(dest) === parent(this.selection!.chemin)) return this.executer("fic-renommer", { texte: nomDe(dest) });
        throw new Error("Destination introuvable : indiquez un dossier existant (ou un nouveau nom, pour renommer)."); }
      if (a === "rm") { const cible = [b, c].find(x => x && !x.startsWith("-")); if (!cible) throw new Error("rm : que faut-il supprimer ?"); await choisir(cible); return this.executer("fic-supprimer"); }
      if (a === "find") { const i = mots.findIndex(m => m === "-name" || m === "-iname"); const motif = i > 0 ? mots[i + 1] ?? "" : "";
        const ext = motif.match(/^\*\.([\w]+)$/); return ext ? this.executer("che-extension", { texte: ext[1] }) : this.executer("che-nom", { texte: motif.replace(/\*/g, "") }); }
      if (a === "git") {
        if (b === "status") return this.executer("git-status");
        if (b === "add") { if (c && c !== "." && c !== "-A") await choisir(c); else this.selection = null; return this.executer("git-add"); }
        if (b === "commit") { const i = mots.indexOf("-m"); return this.executer("git-commit", { texte: i > 0 ? mots.slice(i + 1).join(" ") : "" }); }
        if (b === "log") return this.executer("git-log");
        if (b === "diff" && c) { await choisir(c.replace(/^--\s*/, "") === "--" ? reste[0] : c); return this.executer("git-diff"); }
        if (b === "branch") return this.executer("git-branche", c ? { texte: c } : { texte: "" });
        if ((b === "switch" || b === "checkout") && c) return c === "-c" || c === "-b" ? this.executer("git-branche", { texte: reste[0] }) : this.executer("git-branche", { aller: c, texte: "" });
        if (b === "push" || b === "pull") return this.executer(b === "push" ? "git-push" : "git-pull");
        if (b === "init") return this.executer("git-status", { initialiser: "oui" });
      }
      return { centre: message("attention", `« ${a ?? ""} » n’est pas disponible ici.`, "Le Disque comprend : ls, pwd, cd, mkdir, mv, cp, rm, find -name, git status / add / commit -m / log / diff / branch / switch / init. Aucun programme n’est lancé : chaque commande devient une action du Disque."), lumiere: "attention", commande: ligne };
    } catch (e) { return { centre: message("erreur", "La commande n’a pas abouti.", (e as Error).message), lumiere: "erreur", commande: ligne }; }
  }
}

/** préparer l'espace d'essai (une seule fois) : de vrais fichiers, annoncés comme tels ; un dépôt Git avec une première validation */
export async function preparerEspace(fs: Fs): Promise<boolean> {
  if ((await fs.lister("", { caches: true })).length) return false;
  await fs.ecrire("README.md", "# Espace d’essai du Disque Terminal\n\nUn vrai dossier, privé, dans ce navigateur. Rien n’en sort.\n");
  await fs.ecrire("notes/idees.md", "- Le cube contient la grille.\n- La grille contient le cercle.\n- Le cercle révèle le Point.\n");
  await fs.ecrire("notes/copie-idees.md", "- Le cube contient la grille.\n- La grille contient le cercle.\n- Le cercle révèle le Point.\n");
  await fs.ecrire("assets/audio/LUMIERE/LISEZMOI.txt", "L’album LUMIERE n’est pas copié ici : ses fichiers restent dans la branche privée album-original-2026.\n");
  await fs.ecrire("a-ranger/note-essai-la-440.wav", noteEssai(3, 440));
  await fs.ecrire("a-ranger/note-essai-mi-330.wav", noteEssai(2, 330));
  const g = new DepotGit(fs); await g.initialiser();
  await g.ajouter(["README.md", "notes/idees.md", "notes/copie-idees.md", "assets/audio/LUMIERE/LISEZMOI.txt"]);
  await g.valider("Espace d’essai : premiers fichiers", { name: "Disque Terminal", email: "local@one.invalid" });
  return true;
}
