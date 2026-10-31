// @vitest-environment node
/**
 * Disque Terminal — le moteur sur un vrai arbre de fichiers (ici une implémentation en mémoire de l'API des dossiers du navigateur,
 * la même interface que l'espace d'essai et qu'un dossier de l'ordinateur) : fichiers, corbeille, annuler, chercher, Git, commande tapée.
 */
import { describe, expect, it } from "vitest";
import { nouveauFs } from "./aides-dossierMemoire";
import { Moteur, preparerEspace } from "../lib/terminal/moteur";
import { COMMANDES, FAMILLES, LUMIERES } from "../lib/terminal/contrat";
import { metadonnees, noteEssai } from "../lib/terminal/audio";
import { diffLignes } from "../lib/terminal/git";

const choisir = async (m: Moteur, chemin: string) => { m.selection = (await m.fs.lister(chemin.split("/").slice(0, -1).join("/"))).find(e => e.chemin === chemin) ?? null; };

describe("Le registre du Disque Terminal", () => {
  it("huit familles ; chaque commande a sa famille, son équivalent réel et un risque ; envoyer et récupérer demandent un pont", () => {
    expect(FAMILLES.map(f => f.id)).toEqual(["naviguer", "fichiers", "git", "chercher", "audio", "historique", "executer", "reglages"]);
    for (const c of COMMANDES) { expect(FAMILLES.some(f => f.id === c.famille), c.id).toBe(true); expect(c.equivalent({ cible: "a.wav", destination: "b", texte: "x" }).length, c.id).toBeGreaterThan(0); }
    expect(COMMANDES.filter(c => c.portee === "pont").map(c => c.id)).toEqual(["git-push", "git-pull"]);
    expect(Object.keys(LUMIERES)).toEqual(["disponible", "recommande", "encours", "succes", "attention", "erreur", "notification"]);
  });
});

describe("Le moteur sur un vrai arbre", () => {
  it("préparer l'espace d'essai : de vrais fichiers, un dépôt Git et une première validation", async () => {
    const fs = nouveauFs(); expect(await preparerEspace(fs)).toBe(true); expect(await preparerEspace(fs)).toBe(false);
    const m = new Moteur(fs), r = await m.executer("git-log");
    expect(r.centre.genre === "sortie" && r.centre.lignes[0].texte).toMatch(/Espace d’essai : premiers fichiers/);
  }, 20000);
  it("ce qui manque est demandé, jamais deviné : un élément, un texte, une destination, une confirmation", async () => {
    const m = new Moteur(nouveauFs()); await preparerEspace(m.fs);
    expect((await m.executer("fic-renommer")).lumiere).toBe("attention");
    await choisir(m, "README.md");
    expect((await m.executer("fic-renommer")).centre.genre).toBe("saisie");
    expect((await m.executer("fic-copier")).centre.genre).toBe("destination");
    expect((await m.executer("fic-supprimer")).centre.genre).toBe("confirmation");
    expect((await m.executer("git-push")).centre).toMatchObject({ genre: "message", ton: "attention" });
  }, 20000);
  it("renommer, mettre à la corbeille, annuler, rétablir — et la commande réelle est dite", async () => {
    const m = new Moteur(nouveauFs()); await preparerEspace(m.fs); m.cwd = "notes";
    await choisir(m, "notes/idees.md"); const r = await m.executer("fic-renommer", { texte: "pensees.md" });
    expect(r.commande).toBe("mv notes/idees.md pensees.md"); expect(await m.fs.genre("notes/pensees.md")).toBe("fichier");
    await m.executer("his-annuler"); expect(await m.fs.genre("notes/idees.md")).toBe("fichier");
    await m.executer("his-retablir"); expect(await m.fs.genre("notes/pensees.md")).toBe("fichier");
    await choisir(m, "notes/pensees.md"); await m.executer("fic-supprimer", { confirme: "oui" });
    expect(await m.fs.genre("notes/pensees.md")).toBeNull(); await m.executer("his-annuler"); expect(await m.fs.genre("notes/pensees.md")).toBe("fichier");
  }, 20000);
  it("chercher : par extension, et les doublons par empreinte", async () => {
    const m = new Moteur(nouveauFs()); await preparerEspace(m.fs);
    const w = await m.executer("che-extension", { texte: "wav" }); expect(w.centre.genre === "liste" && w.centre.entrees.length).toBe(2);
    const d = await m.executer("che-doublons"); expect(d.centre.genre === "sortie" && d.centre.titre).toBe("1 groupe de doublons");
  }, 20000);
  it("Git : état, ajouter, valider (conseille ensuite), différences", async () => {
    const m = new Moteur(nouveauFs(), { voirCommande: false, confirmer: true, auteur: "Matt", favoris: [] }); await preparerEspace(m.fs);
    await m.fs.ecrire("notes/idees.md", "- Le cube contient la grille.\n- Un Point.\n");
    const s = await m.executer("git-status"); expect(s.suite).toBe("git-add"); expect(s.centre.genre === "sortie" && s.centre.lignes.map(l => l.texte).join()).toMatch(/modifié · notes\/idees.md/);
    await choisir(m, "notes/idees.md"); const d = await m.executer("git-diff"); expect(d.centre.genre === "sortie" && d.centre.lignes.some(l => l.texte === "+ - Un Point.")).toBe(true);
    m.selection = null; expect((await m.executer("git-add")).suite).toBe("git-commit");
    const c = await m.executer("git-commit", { texte: "Un Point" }); expect(c.lumiere).toBe("succes"); expect(c.suite).toBeUndefined(); expect(c.commande).toBe('git commit -m "Un Point"');
    const l = await m.executer("git-log"); expect(l.centre.genre === "sortie" && l.centre.lignes[0].texte).toMatch(/Un Point — Matt/);
  }, 30000);
  it("la commande tapée devient la même action ; une commande inconnue n'exécute rien", async () => {
    const m = new Moteur(nouveauFs()); await preparerEspace(m.fs);
    await m.libre("mkdir projets"); expect(await m.fs.genre("projets")).toBe("dossier");
    await m.libre("mv README.md projets"); expect(await m.fs.genre("projets/README.md")).toBe("fichier");
    await m.libre("cd projets"); expect(m.cwd).toBe("projets");
    expect((await m.libre("curl http://exemple")).lumiere).toBe("attention");
  }, 20000);
  it("Audio : ranger dans le dépôt prépare pour Git ; les métadonnées d'un WAV sont lues", async () => {
    const m = new Moteur(nouveauFs()); await preparerEspace(m.fs);
    const meta = await metadonnees(noteEssai(1, 440), "n.wav"); expect(meta).toMatchObject({ format: "WAV", canaux: 1, frequence: 22050, bits: 16 });
    await choisir(m, "a-ranger/note-essai-la-440.wav"); const r = await m.executer("aud-ranger", { texte: "LUMIERE" });
    expect(await m.fs.genre("assets/audio/LUMIERE/note-essai-la-440.wav")).toBe("fichier"); expect(r.suite).toBe("git-commit");
    expect((await m.git.etat()).find(x => x.chemin === "assets/audio/LUMIERE/note-essai-la-440.wav")?.indexe).toBe(true);
  }, 20000);
  it("la différence ligne à ligne", () => {
    expect(diffLignes("a\nb\nc", "a\nc\nd").map(l => l.genre + l.texte)).toEqual([" a", "-b", " c", "+d"]);
  });
});
