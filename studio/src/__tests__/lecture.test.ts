import { describe, expect, it } from "vitest";
import { lireHtml, lireMarkdown, typeDe } from "../lib/lecture/lire";
import { parType } from "../lib/lecture/import";

describe("la lecture claire : ce qui est vraiment extrait, rien d'inventé", () => {
  it("reconnaît les types par le type annoncé ou l'extension", () => {
    expect(typeDe({ name: "a.PDF", type: "" })).toBe("pdf");
    expect(typeDe({ name: "notes.md", type: "" })).toBe("md");
    expect(typeDe({ name: "page.htm", type: "" })).toBe("html");
    expect(typeDe({ name: "x", type: "image/heic" })).toBe("image");
    expect(typeDe({ name: "d.json", type: "" })).toBe("json");
    expect(typeDe({ name: "archive.zip", type: "application/zip" })).toBe("autre");
  });
  it("Markdown : titres, paragraphes, listes, liens, code ; le code n'est pas lu comme du texte", () => {
    const m = lireMarkdown("# Titre\n\nUn paragraphe\nsur deux lignes.\n\n## Sous-titre\n- un\n- deux\n\n```\n# pas un titre\n```\n\nVoir [AIME](https://www.lemondeaime.com) et https://exemple.fr.");
    expect(m.titres).toEqual([{ niveau: 1, texte: "Titre" }, { niveau: 2, texte: "Sous-titre" }]);
    expect(m.paragraphes).toBe(2); expect(m.listes).toBe(2); expect(m.code).toBe(1);
    expect(m.liens).toEqual([{ texte: "AIME", cible: "https://www.lemondeaime.com" }, { texte: "https://exemple.fr.", cible: "https://exemple.fr." }]);
    expect(m.texte).not.toContain("pas un titre");
  });
  it("HTML : sections, titres, liens, images sans alt ; les scripts sont comptés, jamais exécutés", () => {
    const h = lireHtml(`<html lang="fr"><head><title> Essai </title></head><body><header>h</header><main><h1>Un</h1><section><h2>Deux</h2><a href="/x">lien</a><img src="a.png"><img src="b.png" alt="b"></section></main><script>window.__execute = 1</script></body></html>`, new DOMParser());
    expect(h.titre).toBe("Essai"); expect(h.langue).toBe("fr");
    expect(h.titres.map(t => t.texte)).toEqual(["Un", "Deux"]);
    expect(h.sections).toEqual([["header", 1], ["main", 1], ["section", 1]]);
    expect(h.liens).toEqual([{ texte: "lien", cible: "/x" }]);
    expect(h.images).toBe(2); expect(h.sansAlt).toBe(1); expect(h.scripts).toBe(1);
    expect((window as unknown as { __execute?: number }).__execute).toBeUndefined();
    expect(h.texte).not.toContain("__execute");
  });
  it("l'anneau montre seulement les types réellement présents, dans un ordre stable", () => {
    const f = (n: string, t = "") => new File(["x"], n, { type: t });
    expect(parType([f("b.png", "image/png"), f("a.md"), f("c.pdf"), f("d.html")]).map(g => g.type)).toEqual(["pdf", "md", "html", "image"]);
  });
});
