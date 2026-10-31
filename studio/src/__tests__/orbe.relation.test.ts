// @vitest-environment node
/**
 * L'Orbe relationnelle sur le Disque Terminal (moteur déterministe, sans IA) — les dix cas demandés :
 * demande simple, ambiguë, réussite vérifiée, échec, non autorisée, confirmation, mouvement réduit et liste (préférences lues
 * dans la source unique), sans IA, et aucune divulgation d'information privée.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { nouveauFs } from "./aides-dossierMemoire";
import { Moteur, preparerEspace } from "../lib/terminal/moteur";
import { UniversTerminal } from "../lib/terminal/relation";
import { CHAMPS_CONTEXTE, INTENTIONS, Orbe, PHRASES } from "../lib/orbe/relation";
import { CLE_ONE } from "../lib/one/preferences";

/* un stockage local minimal (environnement node) : la source unique de préférences y est lue */
const memoire = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: { getItem: (k: string) => memoire.get(k) ?? null, setItem: (k: string, v: string) => void memoire.set(k, v), removeItem: (k: string) => void memoire.delete(k), clear: () => memoire.clear() },
  document: { documentElement: { dataset: {} as Record<string, string>, style: { setProperty() {} } } },
  window: { matchMedia: () => ({ matches: false }), dispatchEvent() {} },
});

async function monter() {
  const m = new Moteur(nouveauFs(), { voirCommande: false, confirmer: true, auteur: "Matt", favoris: [] }); await preparerEspace(m.fs);
  const u = new UniversTerminal(m); return { m, u, o: new Orbe(u) };
}
const choisir = async (m: Moteur, chemin: string) => { m.selection = (await m.fs.lister(chemin.split("/").slice(0, -1).join("/"))).find(e => e.chemin === chemin) ?? null; };

describe("L'Orbe relationnelle (déterministe)", () => {
  beforeEach(() => memoire.clear());
  it("1. demande simple : Explorer → recevoir, situer, proposer (rien n'est exécuté sans geste)", async () => {
    const { o } = await monter(); const r = await o.intention("explorer");
    expect(r.etapes.map(e => e.phase)).toEqual(["reception", "contexte", "echo"]);
    expect(r.choix!.map(c => c.commande)).toEqual(["fic-lister", "che-recents"]);
  }, 20000);
  it("2. demande ambiguë : Comprendre sans rien choisir → une question, des choix, et « Je n'ai pas assez d'informations »", async () => {
    const { o } = await monter(); const r = await o.intention("comprendre");
    expect(r.issue).toBe("precision"); expect(r.question).toBe("Que voulez-vous comprendre ?");
    expect(r.etapes.some(e => e.texte === PHRASES.manque)).toBe(true); expect(r.choix!.length).toBeGreaterThan(1);
  }, 20000);
  it("3. action réussie : « réussite » seulement après une relecture réelle (la preuve est dite)", async () => {
    const { o, m } = await monter(); const r = await o.commande("fic-creer", { texte: "Projets" });
    expect(r.issue).toBe("reussite"); expect(r.preuve).toMatch(/« Projets » existe \(dossier relu\)/);
    expect(await m.fs.genre("Projets")).toBe("dossier");
    expect(r.etapes.find(e => e.phase === "verification")!.signal).toEqual({ genre: "donnee", source: r.preuve });
  }, 20000);
  it("4. action échouée : le message de l'échec, jamais de vert", async () => {
    const { o } = await monter(); await o.commande("fic-creer", { texte: "Projets" });
    const r = await o.commande("fic-creer", { texte: "Projets" });
    expect(r.issue).toBe("echec"); expect(r.titre).toBe(PHRASES.echec); expect(r.texte).toMatch(/existe déjà/);
  }, 20000);
  it("5. action non autorisée : Envoyer sans pont local → refus expliqué ; rien n'est simulé", async () => {
    const { o } = await monter(); const r = await o.commande("git-push");
    expect(r.issue).toBe("refus"); expect(r.texte).toMatch(/pont local n’existe pas encore : rien n’a été envoyé/);
    expect(r.etapes.some(e => e.phase === "action")).toBe(false);
  }, 20000);
  it("6. action en attente de confirmation : « J'ai besoin de votre accord » ; puis faite et vérifiée après accord", async () => {
    const { o, m } = await monter(); await choisir(m, "notes/copie-idees.md");
    const a = await o.commande("fic-supprimer"); expect(a.issue).toBe("confirmation"); expect(a.titre).toBe(PHRASES.accord);
    expect(await m.fs.genre("notes/copie-idees.md")).toBe("fichier");
    const b = await o.commande("fic-supprimer", { confirme: "oui" }); expect(b.issue).toBe("reussite"); expect(await m.fs.genre("notes/copie-idees.md")).toBeNull();
  }, 20000);
  it("7 et 8. mouvement réduit et présentation en liste : lus dans la source unique de préférences (aucun second profil)", async () => {
    memoire.set("pointzero:accessibility:v1", JSON.stringify({ version: 1, theme: "system", vision: "standard", fontScale: 1, lineHeight: 1.5, spacing: 0, contrast: "normal", reduceMotion: true, enhancedFocus: false, readingGuide: false, privacyBlur: false, accent: "#7562ce" }));
    memoire.set("pointzero:point:presentation", "liste");
    memoire.set(CLE_ONE, JSON.stringify({ version: 1, interaction: { cibles: "standard", guidage: "pas-a-pas" } }));
    const { u, o } = await monter(); const c = await u.contexte();
    expect(c.preferences).toEqual({ guidage: "pas-a-pas", presentation: "liste", mouvementReduit: true });
    const r = await o.intention("explorer"); expect(r.titre).toMatch(/Choisissez une action : je la ferai, puis je vérifierai/);
  }, 20000);
  it("9. sans IA : tout est déterminé par des règles ; mêmes entrées, mêmes réponses ; aucune requête réseau", async () => {
    const appels: string[] = []; const avant = globalThis.fetch; (globalThis as { fetch: unknown }).fetch = (u: string) => { appels.push(String(u)); throw new Error("réseau interdit"); };
    try {
      const a = await (await monter()).o.intention("aide"), b = await (await monter()).o.intention("aide");
      expect(a.choix).toEqual(b.choix); expect(appels).toEqual([]);
      expect(INTENTIONS.map(i => i.id)).toEqual(["explorer", "comprendre", "creer", "aide", "signaler", "plus-simple"]);
    } finally { (globalThis as { fetch: unknown }).fetch = avant; }
  }, 20000);
  it("10. aucune divulgation : le contexte n'a que ses champs autorisés ; ni identité, ni contenu non lu, ni autre univers", async () => {
    memoire.set(CLE_ONE, JSON.stringify({ version: 1, identite: { prenom: "Camille", ville: "Lyon" }, besoins: ["fatigue"], favoris: ["mariage"] }));
    const { u, m, o } = await monter(); await choisir(m, "notes/idees.md");
    const c = await u.contexte(), texte = JSON.stringify(c);
    expect(Object.keys(c).every(k => (CHAMPS_CONTEXTE as readonly string[]).includes(k))).toBe(true);
    for (const prive of ["Camille", "Lyon", "fatigue", "mariage", "Le cube contient"]) expect(texte).not.toContain(prive);
    expect(c.element).toMatchObject({ nom: "idees.md", lu: false });
    expect(o.situer(c)).toMatch(/« idees\.md » \(contenu non lu\)/);
    await m.fs.ecrire("notes/idees.md", "- Le cube contient la grille.\n- Un Point.\n");
    await o.commande("git-diff"); expect((await u.contexte()).element!.lu).toBe(true);   /* lu seulement après une vraie lecture */
  }, 20000);
});
