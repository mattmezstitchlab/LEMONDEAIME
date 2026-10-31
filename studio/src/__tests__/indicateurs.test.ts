/**
 * Les points lumineux du Disque universel : un état sémantique attaché à une commande (jamais à une position),
 * direct ou hérité d'un sous-menu, temporaire ou persistant, consulté ou résolu ; le Guide déterministe ; le remplacement avec décision.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { aVoir, decorer, etatDe, Indicateurs, trier, type Indicateur } from "../lib/point/indicateurs";
import { nomAccessible, type ModePoint } from "../lib/point/modes";
import { suggestion } from "../components/blocs/guideBroderie";
import { commandesBroderie, type ContexteBroderie } from "../components/blocs/broderie";
import { premierAnneau } from "../components/TambourAtelier";

const I = (o: Partial<Indicateur> & Pick<Indicateur, "id" | "commande" | "etat">): Indicateur => ({ contexte: "broderie", libelle: o.id, ...o });
const feuille = (id: string): ModePoint => ({ id, nom: id, aide: id, groupe: "metier", ouvrir: vi.fn() });
const famille = (id: string, enfants: ModePoint[]): ModePoint => ({ id, nom: id, aide: id, groupe: "metier", ouvrir: () => {}, enfants: () => enfants });

describe("Les indicateurs : un état par commande", () => {
  afterEach(() => vi.useRealTimers());
  it("publier remplace le même événement ; temporaire, il s'efface seul ; persistant, il reste jusqu'à résolution", () => {
    vi.useFakeTimers();
    const t = new Indicateurs(), vu: number[] = []; t.abonner(l => vu.push(l.length));
    t.publier(I({ id: "export", commande: "exp-projet", etat: "encours" }));
    t.publier(I({ id: "export", commande: "exp-projet", etat: "reussite", duree: 5000 }));
    expect(t.actifs()).toHaveLength(1); expect(t.actifs()[0].etat).toBe("reussite");
    t.publier(I({ id: "remplacement", commande: "remplacer-confirmer", etat: "action" }));
    vi.advanceTimersByTime(5001);
    expect(t.actifs().map(i => i.id)).toEqual(["remplacement"]);
    t.resoudre("remplacement"); expect(t.actifs()).toHaveLength(0);
  });
  it("plusieurs événements presque simultanés : l'ordre suit l'importance, puis le plus récent", () => {
    const t = new Indicateurs();
    t.publier(I({ id: "a", commande: "x", etat: "info" })); t.publier(I({ id: "b", commande: "x", etat: "erreur" }));
    t.publier(I({ id: "c", commande: "x", etat: "guide" })); t.publier(I({ id: "d", commande: "x", etat: "info" }));
    expect(trier(t.actifs()).map(i => i.id)).toEqual(["b", "c", "d", "a"]);
  });
  it("direct ou hérité : une famille signale ce qui attend dessous, sans se l'attribuer", () => {
    const fils = famille("fils", [famille("remplacer", [feuille("remplacer-confirmer")])]);
    const l = [I({ id: "r", commande: "remplacer-confirmer", etat: "action", libelle: "Confirmez ou annulez." })];
    expect(etatDe(fils, l)).toMatchObject({ etat: "action", herite: true });
    expect(etatDe(feuille("remplacer-confirmer"), l)).toMatchObject({ etat: "action", herite: false });
    expect(etatDe(feuille("points"), l)).toBeNull();
  });
  it("un « terminé » déjà vu ne remonte plus ; une décision attendue, si", () => {
    const t = new Indicateurs(); const fils = famille("fils", [feuille("dmc-321")]);
    t.publier(I({ id: "ok", commande: "dmc-321", etat: "reussite" })); t.consulter("ok");
    expect(etatDe(fils, t.actifs())).toBeNull();
    t.publier(I({ id: "act", commande: "dmc-321", etat: "action" })); t.consulter("act");
    expect(etatDe(fils, t.actifs())?.etat).toBe("action");
  });
  it("décorer : chaque commande porte son point, dit dans son nom accessible ; l'ouvrir marque l'information consultée", () => {
    const consulter = vi.fn(), exporter = feuille("exp-projet");
    const l = [I({ id: "export", commande: "exp-projet", etat: "reussite", libelle: "Le fichier est prêt." })];
    const [m] = decorer([famille("exporter", [exporter])], l, consulter);
    expect(m.indicateur).toMatchObject({ etat: "reussite", herite: true });
    expect(nomAccessible(m)).toContain("À voir dans ce sous-menu, terminé : Le fichier est prêt.");
    const [e] = m.enfants!(); expect(nomAccessible(e)).toContain(". terminé : Le fichier est prêt.");
    e.ouvrir(); expect(consulter).toHaveBeenCalledWith("export"); expect(exporter.ouvrir).toHaveBeenCalled();
    expect(decorer([exporter], [])[0]).toBe(exporter);   /* rien à dire : la commande est rendue telle quelle */
  });
  it("une commande repliée dans « Plus » (place réduite) reste consultable : « Plus » hérite de son état", () => {
    const ids = ["loupe", "guide", "points", "broder", "fils", "affichage", "importer", "exporter", "replier", "retracter"];
    const modes = ids.map(id => id === "exporter" ? famille("exporter", [feuille("exp-projet")]) : feuille(id));
    const anneau = decorer(premierAnneau(modes, 7), [I({ id: "e", commande: "exp-projet", etat: "erreur", libelle: "L’export n’a pas abouti." })]);
    expect(anneau.find(m => m.id === "plus")?.indicateur).toMatchObject({ etat: "erreur", herite: true });
  });
  it("l'Orbe ne réclame l'attention que pour ce qui n'a pas été vu (jamais pour une simple suggestion)", () => {
    const l = [I({ id: "g", commande: "fils", etat: "guide" }), I({ id: "a", commande: "x", etat: "action" }), I({ id: "r", commande: "y", etat: "reussite", consulte: true })];
    expect(aVoir(l).map(i => i.id)).toEqual(["a"]);
  });
});

describe("Le Guide lumineux : des règles explicites", () => {
  const base = { points: 120, brodes: 0, filChoisi: true, outilEnMain: true, couleurTerminee: false };
  it("propose la prochaine étape d'après l'état réel, et rien quand tout est en place", () => {
    expect(suggestion({ ...base, points: 0 })).toEqual({ commande: "importer", libelle: "Commencez par choisir une photographie ou un motif." });
    expect(suggestion({ ...base, filChoisi: false })?.commande).toBe("fils");
    expect(suggestion({ ...base, outilEnMain: false })?.commande).toBe("points");
    expect(suggestion({ ...base, outilEnMain: false, brodes: 12 })?.commande).toBe("broder");
    expect(suggestion({ ...base, couleurTerminee: true })).toEqual({ commande: "fils", libelle: "Cette couleur est terminée : choisissez la suivante." });
    expect(suggestion(base)).toBeNull();
  });
});

describe("Fils › Remplacer un fil : une décision, jamais un changement irréversible d'un seul geste", () => {
  const ctx = (o: Partial<ContexteBroderie> = {}): ContexteBroderie => ({ outil: "cross", choisirOutil: vi.fn(), couleur: 0, filsDuMotif: [3, 7], choisirFil: vi.fn(), vue: "flat", choisirVue: vi.fn(),
    symboles: false, basculerSymboles: vi.fn(), grille: "visible", basculerGrille: vi.fn(), loupe: false, basculerLoupe: vi.fn(), toutVoir: vi.fn(), importer: vi.fn(), ouvrages: vi.fn(),
    exporter: vi.fn(), enregistrer: vi.fn(), partager: vi.fn(), filsEtToile: vi.fn(), suivi: vi.fn(), aide: vi.fn(), chercher: vi.fn(), ...o } as ContexteBroderie);
  it("le chemin : un fil du motif → une famille → une nuance prépare l'aperçu ; puis Confirmer ou Annuler", () => {
    const preparer = vi.fn(), confirmer = vi.fn(), annuler = vi.fn();
    const fils = commandesBroderie(ctx({ remplacement: { attente: null, preparer, confirmer, annuler } })).find(m => m.id === "fils")!;
    const remp = fils.enfants!().find(m => m.id === "remplacer")!;
    const de = remp.enfants!()[0], fam = de.enfants!()[0], vers = fam.enfants!()[0];
    expect(de.couleur).toBeTruthy(); expect(vers.nom).toMatch(/^DMC /);
    vers.ouvrir(); expect(preparer).toHaveBeenCalledWith(3, expect.any(Number)); expect(confirmer).not.toHaveBeenCalled();
    const enAttente = commandesBroderie(ctx({ remplacement: { attente: { de: 3, vers: 9 }, preparer, confirmer, annuler } })).find(m => m.id === "fils")!.enfants!();
    expect(enAttente.slice(0, 2).map(m => m.id)).toEqual(["remplacer-confirmer", "remplacer-annuler"]);
    enAttente[1].ouvrir(); expect(annuler).toHaveBeenCalled();
  });
});
