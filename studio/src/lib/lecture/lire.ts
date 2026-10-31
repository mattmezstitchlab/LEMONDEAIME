/**
 * LA LECTURE CLAIRE : ce que les moteurs disponibles extraient vraiment d'un fichier. Aucun résumé généré, aucune IA.
 * Le fichier reste sur l'appareil, l'original n'est jamais modifié. Ce qui n'est pas lu est dit (limites).
 *
 * - Markdown : lu ici (titres, paragraphes, listes, liens, blocs de code) — lireMarkdown, pure.
 * - HTML : analysé par le navigateur sans exécuter de script (DOMParser) ; l'aperçu est isolé (iframe sandbox, aucun script).
 * - PDF : pdf.js (déjà utilisé par l'atelier) : pages, métadonnées, texte des premières pages, plan, aperçu de la page 1.
 * - Image : dimensions et métadonnées du fichier ; texte détecté et EXIF : non lus ici (dit).
 * - Texte, JSON : lus tels quels.
 */
export type TypeFichier = "pdf" | "md" | "html" | "image" | "txt" | "json" | "video" | "autre";
export type Vue = "apercu" | "texte" | "structure" | "liens" | "source";
export const NOM_TYPE: Record<TypeFichier, string> = { pdf: "PDF", md: "MD", html: "HTML", image: "IMAGE", txt: "TXT", json: "JSON", video: "VIDÉO", autre: "AUTRE" };
export const NOM_LONG: Record<TypeFichier, string> = { pdf: "PDF", md: "Markdown", html: "Page HTML", image: "Image", txt: "Texte", json: "JSON", video: "Vidéo", autre: "Autre fichier" };
export const NOM_VUE: Record<Vue, string> = { apercu: "Aperçu", texte: "Texte", structure: "Structure", liens: "Liens", source: "Source" };
export const ORDRE_TYPES: TypeFichier[] = ["pdf", "md", "html", "image", "txt", "json", "video", "autre"];

export function typeDe(f: { name: string; type: string }): TypeFichier {
  const n = f.name.toLowerCase(), t = (f.type || "").toLowerCase();
  if (t === "application/pdf" || n.endsWith(".pdf")) return "pdf";
  if (t === "text/markdown" || /\.(md|markdown)$/.test(n)) return "md";
  if (t === "text/html" || /\.html?$/.test(n)) return "html";
  if (t.startsWith("image/") || /\.(jpe?g|png|webp|gif|avif|svg)$/.test(n)) return "image";
  if (t === "application/json" || n.endsWith(".json")) return "json";
  if (t.startsWith("video/") || /\.(mp4|mov|m4v|webm)$/.test(n)) return "video";
  if (t.startsWith("text/") || /\.(txt|csv|log)$/.test(n)) return "txt";
  return "autre";
}

export interface Titre { niveau: number; texte: string }
export interface Lien { texte: string; cible: string }
export interface Lecture {
  type: TypeFichier; nom: string; octets: number; modifie?: number;
  /** ce qui est mesuré, en mots courts : « 3 pages », « 12 titres »… */
  mesures: string[];
  titres: Titre[]; liens: Lien[];
  /** le texte réellement extrait (borné) */
  texte?: string;
  /** la source brute (borné) */
  source?: string;
  /** aperçu : une image (adresse locale), ou une page isolée (srcdoc) */
  image?: string; page?: string;
  /** ce que la lecture ne fait pas, dit clairement */
  limites: string[];
  vues: Vue[];
}

const BORNE = 20000;
const borner = (s: string) => s.length > BORNE ? s.slice(0, BORNE) + "\n… (la suite n’est pas affichée ici ; le fichier d’origine est intact)" : s;

/** Markdown : lecture structurelle, ligne à ligne ; rien d'interprété au-delà de la syntaxe */
export function lireMarkdown(src: string) {
  const titres: Titre[] = [], liens: Lien[] = [];
  let paragraphes = 0, listes = 0, code = 0, dansCode = false, dansPara = false;
  for (const ligne of src.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(ligne)) { if (!dansCode) code++; dansCode = !dansCode; dansPara = false; continue; }
    if (dansCode) continue;
    const h = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(ligne);
    if (h) { titres.push({ niveau: h[1].length, texte: h[2].replace(/[*_`]/g, "") }); dansPara = false; }
    else if (/^\s*([-*+]|\d+[.)])\s+/.test(ligne)) { listes++; dansPara = false; }
    else if (ligne.trim() === "") dansPara = false;
    else if (!/^\s*(>|\||---|===)/.test(ligne) && !dansPara) { paragraphes++; dansPara = true; }
    for (const m of ligne.matchAll(/(!?)\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) if (!m[1]) liens.push({ texte: m[2] || m[3], cible: m[3] });
    for (const m of ligne.matchAll(/(^|[\s(])(https?:\/\/[^\s)<>]+)/g)) if (!liens.some(l => l.cible === m[2])) liens.push({ texte: m[2], cible: m[2] });
  }
  const texte = src.replace(/```[\s\S]*?```/g, "").replace(/^#{1,6}\s+/gm, "").replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[*_`>]/g, "").replace(/\n{3,}/g, "\n\n").trim();
  return { titres, liens, paragraphes, listes, code, texte };
}

/** HTML : le navigateur analyse, rien n'est exécuté ; les scripts sont comptés, jamais lancés */
export function lireHtml(src: string, parser: { parseFromString(s: string, t: "text/html"): Document }) {
  const doc = parser.parseFromString(src, "text/html");
  const titres: Titre[] = [...doc.querySelectorAll("h1,h2,h3,h4")].map(h => ({ niveau: +h.tagName[1], texte: (h.textContent ?? "").replace(/\s+/g, " ").trim() })).filter(t => t.texte);
  const liens: Lien[] = [...doc.querySelectorAll("a[href]")].map(a => ({ texte: (a.textContent ?? "").replace(/\s+/g, " ").trim() || a.getAttribute("href")!, cible: a.getAttribute("href")! }));
  const compte = (s: string) => doc.querySelectorAll(s).length;
  const sections = (["header", "nav", "main", "section", "article", "aside", "footer", "form"] as const).map(x => [x, compte(x)] as const).filter(([, n]) => n);
  const images = [...doc.querySelectorAll("img")], sansAlt = images.filter(i => !i.hasAttribute("alt")).length;
  const scripts = compte("script");
  doc.querySelectorAll("script,style,noscript,template").forEach(x => x.remove());
  const texte = (doc.body?.textContent ?? "").replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n\n").trim();
  return { titre: doc.title.trim(), langue: doc.documentElement.getAttribute("lang") ?? "", titres, liens, sections, images: images.length, sansAlt, scripts, texte };
}

const pluriel = (n: number, mot: string, pl = mot + "s") => `${n} ${n > 1 ? pl : mot}`;
const lireTexte = (f: Blob) => typeof f.text === "function" ? f.text() : new Response(f).text();

/** lit un fichier avec le moteur disponible ; ne lève pas d'erreur : un échec devient une limite dite */
export async function lire(f: File): Promise<Lecture> {
  const type = typeDe(f);
  const base: Lecture = { type, nom: f.name, octets: f.size, modifie: f.lastModified || undefined, mesures: [], titres: [], liens: [], limites: [], vues: [] };
  try {
    if (type === "md") {
      const src = await lireTexte(f), m = lireMarkdown(src);
      return { ...base, titres: m.titres, liens: m.liens, texte: borner(m.texte), source: borner(src),
        mesures: [pluriel(m.titres.length, "titre"), pluriel(m.paragraphes, "paragraphe"), pluriel(m.listes, "élément de liste", "éléments de liste"), pluriel(m.liens.length, "lien"), ...(m.code ? [pluriel(m.code, "bloc de code", "blocs de code")] : [])],
        limites: ["Lecture de la syntaxe Markdown, sans rendu complet (tableaux et HTML intégré non interprétés)."],
        vues: ["structure", "texte", "liens", "source"] };
    }
    if (type === "html") {
      const src = await lireTexte(f), h = lireHtml(src, new DOMParser());
      return { ...base, titres: h.titres, liens: h.liens, texte: borner(h.texte), source: borner(src), page: src,
        mesures: [...(h.titre ? [`titre : « ${h.titre} »`] : ["sans titre"]), ...(h.langue ? [`langue : ${h.langue}`] : []), ...h.sections.map(([s, n]) => `${n} ${s}`), pluriel(h.titres.length, "titre"), pluriel(h.liens.length, "lien"), pluriel(h.images, "image"), ...(h.sansAlt ? [`${h.sansAlt} sans texte alternatif`] : [])],
        limites: [h.scripts ? `${pluriel(h.scripts, "script")} : jamais exécuté${h.scripts > 1 ? "s" : ""}. L’aperçu est isolé, sans script ni accès au réseau de la page.` : "L’aperçu est isolé : aucun script n’est exécuté.", "Les feuilles de style et images externes ne sont pas chargées."],
        vues: ["apercu", "structure", "texte", "liens", "source"] };
    }
    if (type === "txt" || type === "json") {
      const src = await lireTexte(f);
      if (type === "json") {
        try { const v = JSON.parse(src); const cles = v && typeof v === "object" ? Object.keys(v) : [];
          return { ...base, source: borner(JSON.stringify(v, null, 2)), titres: cles.slice(0, 40).map(k => ({ niveau: 2, texte: `${k} : ${Array.isArray(v[k]) ? `liste (${v[k].length})` : typeof v[k] === "object" && v[k] ? "objet" : typeof v[k]}` })),
            mesures: [Array.isArray(v) ? `une liste de ${v.length}` : pluriel(cles.length, "clé")], limites: [], vues: ["structure", "source"] };
        } catch { return { ...base, source: borner(src), mesures: ["JSON invalide"], limites: ["Le JSON ne se lit pas : il est montré tel quel."], vues: ["source"] }; }
      }
      return { ...base, texte: borner(src), mesures: [pluriel(src.split(/\n/).length, "ligne"), pluriel(src.split(/\s+/).filter(Boolean).length, "mot")], limites: [], vues: ["texte"] };
    }
    if (type === "pdf") {
      const pdfjs = await import("pdfjs-dist");
      if (!pdfjs.GlobalWorkerOptions.workerSrc) pdfjs.GlobalWorkerOptions.workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
      const tache = pdfjs.getDocument({ data: new Uint8Array(await f.arrayBuffer()) }), doc = await tache.promise;
      const meta = await doc.getMetadata().catch(() => null) as { info?: { Title?: string; Author?: string } } | null;
      const plan = await doc.getOutline().catch(() => null) as { title: string; items?: unknown[] }[] | null;
      const lues = Math.min(doc.numPages, 5), pages: string[] = [], liens: Lien[] = [];
      for (let n = 1; n <= lues; n++) {
        const pg = await doc.getPage(n), c = await pg.getTextContent();
        let t = "", y: number | null = null;
        for (const it of c.items as { str: string; transform: number[]; hasEOL?: boolean }[]) { if (y !== null && Math.abs(it.transform[5] - y) > 2) t += "\n"; t += it.str; y = it.transform[5]; }
        pages.push(t.replace(/\n{3,}/g, "\n\n").trim());
        for (const a of await pg.getAnnotations().catch(() => []) as { subtype?: string; url?: string }[]) if (a.subtype === "Link" && a.url) liens.push({ texte: a.url, cible: a.url });
      }
      const p1 = await doc.getPage(1), vp0 = p1.getViewport({ scale: 1 }), vp = p1.getViewport({ scale: Math.min(3, 900 / vp0.width) });
      const cv = document.createElement("canvas"); cv.width = Math.ceil(vp.width); cv.height = Math.ceil(vp.height);
      await p1.render({ canvas: cv, canvasContext: cv.getContext("2d")!, viewport: vp } as never).promise;
      const image = cv.toDataURL("image/png"), total = doc.numPages; void tache.destroy();
      const texte = pages.map((t, i) => `— page ${i + 1} —\n${t}`).join("\n\n");
      const titres: Titre[] = (plan ?? []).map(x => ({ niveau: 1, texte: x.title }));
      return { ...base, image, texte: borner(texte), titres, liens,
        mesures: [pluriel(total, "page"), ...(meta?.info?.Title ? [`titre : « ${meta.info.Title} »`] : []), ...(meta?.info?.Author ? [`auteur : ${meta.info.Author}`] : []), titres.length ? pluriel(titres.length, "entrée de plan", "entrées de plan") : "sans plan", pluriel(liens.length, "lien")],
        limites: [...(total > lues ? [`Le texte des ${lues} premières pages est lu ici ; les ${total - lues} autres restent dans le fichier.`] : []), ...(pages.every(p => !p) ? ["Aucun texte extrait : le PDF est peut-être une image numérisée (la reconnaissance de texte n’est pas faite ici)."] : [])],
        vues: ["apercu", "texte", ...(titres.length ? ["structure" as const] : []), "liens"] };
    }
    if (type === "image") {
      const image = URL.createObjectURL(f);
      const dim = await new Promise<string>(ok => { const i = new Image(); i.onload = () => ok(`${i.naturalWidth} × ${i.naturalHeight} px`); i.onerror = () => ok("dimensions non lues"); i.src = image; });
      return { ...base, image, mesures: [dim, f.type || "type inconnu"], limites: ["Le texte détecté et les métadonnées EXIF ne sont pas lus ici.", "Le motif de broderie se prépare dans l’atelier (Agir › Transformer)."], vues: ["apercu"] };
    }
    if (type === "video") return { ...base, image: URL.createObjectURL(f), mesures: [f.type || "vidéo"], limites: ["La vidéo est montrée telle quelle ; aucune analyse n’est faite ici."], vues: ["apercu"] };
  } catch (e) {
    return { ...base, limites: [`La lecture a échoué (${(e as Error).message?.slice(0, 80) || "erreur"}). Le fichier d’origine est intact.`], vues: [] };
  }
  return { ...base, limites: ["Ce type de fichier n’est pas lu par le Studio : il est gardé tel quel."], vues: [] };
}

export const taille = (o: number) => o < 1024 ? `${o} octets` : o < 1024 ** 2 ? `${(o / 1024).toFixed(0)} Ko` : `${(o / 1024 ** 2).toFixed(1).replace(".", ",")} Mo`;
