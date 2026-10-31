/**
 * AJOUTER, au Point Zéro : reconnaître honnêtement ce qui entre, et proposer seulement les transformations qui existent.
 * Rien n'est envoyé ni modifié : le fichier reste sur l'appareil, l'original intact. Aucune IA payante.
 * Une transformation « en attente » le dit ; une « hors Studio » dit où elle vit ; un fichier inconnu est signalé.
 */
export type Genre = "image" | "video" | "pdf" | "texte" | "code" | "document" | "inconnu";
export type Etat = "disponible" | "hors-studio" | "en-attente";
export interface Transformation { id: string; nom: string; chaine: string; etat: Etat; phrase: string; chemin?: string }
export interface Reconnaissance { genre: Genre; nom: string; transformations: Transformation[] }

const CODE = /\.(ts|tsx|js|jsx|mjs|cjs|py|rb|go|rs|java|kt|swift|c|h|cpp|cs|php|sh|css|scss|html|json|yaml|yml|toml|sql)$/i;
const DOC = /\.(docx?|odt|rtf|pages|xlsx?|ods|csv|pptx?|key|odp)$/i;

export function genreDe(f: { name: string; type: string }): Genre {
  const t = (f.type || "").toLowerCase(), n = f.name.toLowerCase();
  if (t.startsWith("image/") || /\.(jpe?g|png|webp|gif|heic|heif|avif)$/.test(n)) return "image";
  if (t.startsWith("video/") || /\.(mp4|mov|m4v|webm)$/.test(n)) return "video";
  if (t === "application/pdf" || n.endsWith(".pdf")) return "pdf";
  if (CODE.test(n)) return "code";
  if (t === "text/plain" || t === "text/markdown" || /\.(txt|md)$/.test(n)) return "texte";
  if (DOC.test(n)) return "document";
  return "inconnu";
}

const ATLAS = { id: "atlas", nom: "ATLAS · la Composition", chaine: "texte libre → intentions → fragments → blocs → composition", etat: "hors-studio" as Etat,
  phrase: "Le + d’ATLAS fait déjà cette transformation, dans ATLAS. Il est sur sa branche de développement (PR #7), pas encore publié : il n’est pas recopié ici." };
const APERCU = { id: "apercu", nom: "Aperçu et métadonnées", chaine: "fichier → nom, type, taille, date", etat: "disponible" as Etat, phrase: "Lu ici, sur l’appareil : rien n’est envoyé." };

export function reconnaitre(f: { name: string; type: string }): Reconnaissance {
  const genre = genreDe(f);
  const t: Transformation[] = [];
  if (genre === "image") {
    t.push({ id: "broderie", nom: "Broderie", chaine: "photo → sujet → grille → couleurs DMC → symboles → patron PDF", etat: "disponible", chemin: "atelier",
      phrase: "Le moteur de broderie existe : l’atelier s’ouvre ; choisissez Importer et reprenez la photo. L’original reste intact." });
    t.push({ id: "mariage", nom: "Mariage · un moment", chaine: "photo → horodatage → moment proposé → confirmation → chronologie", etat: "en-attente",
      phrase: "En attente : la contribution à une chronologie partagée demande le consentement et des droits réels, pas encore raccordés ici." });
  }
  if (genre === "video") {
    t.push({ id: "cinema", nom: "CINÉMA · une séquence", chaine: "vidéo → référence de média → séquence proposée → montage", etat: "en-attente",
      phrase: "En attente : le moteur de montage existe (LUMIERE), mais l’import d’un média dans un montage n’est pas encore construit. Rien n’est publié." });
    t.push({ id: "mariage", nom: "Mariage · un moment", chaine: "vidéo → horodatage → moment proposé → confirmation", etat: "en-attente",
      phrase: "En attente : consentement et droits à raccorder." });
  }
  if (genre === "pdf") t.push({ id: "broderie-pdf", nom: "Broderie · un patron PDF", chaine: "PDF → pages → grille → patron", etat: "disponible", chemin: "atelier",
    phrase: "L’atelier sait lire un patron PDF : il s’ouvre ; choisissez Importer." });
  if (genre === "texte") t.push(ATLAS);
  if (genre !== "inconnu") t.push(APERCU);
  return { genre, nom: f.name, transformations: t };
}

/** du texte collé : ATLAS seulement (et la lecture, ici) */
export const reconnaitreTexte = (): Reconnaissance => ({ genre: "texte", nom: "texte collé", transformations: [ATLAS] });

export const taille = (o: number) => o < 1024 ? `${o} octets` : o < 1024 ** 2 ? `${(o / 1024).toFixed(0)} Ko` : `${(o / 1024 ** 2).toFixed(1).replace(".", ",")} Mo`;
