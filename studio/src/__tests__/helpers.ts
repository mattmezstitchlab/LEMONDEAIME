/**
 * Utilitaires de test.
 *
 * jsPDF produit un PDF non compressé : on peut donc lire son contenu comme du
 * texte et compter les opérateurs de dessin. Les assertions ci-dessous
 * comparent des PDF entre eux plutôt que de deviner des octets, ce qui les
 * garde valables quand la mise en page évolue.
 */

export async function pdfText(blob: Blob): Promise<string> {
  if (typeof blob.arrayBuffer === "function") return Buffer.from(await blob.arrayBuffer()).toString("latin1");
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsBinaryString(blob);
  });
}

/** Nombre de pages déclaré dans le catalogue du PDF. */
export function pageCount(text: string): number {
  const found = text.match(/\/Count\s+(\d+)/);
  if (!found) throw new Error("PDF sans /Count : sortie illisible");
  return Number(found[1]);
}

/** Rectangles et aplats : un par case coloriée en mode couleur. */
export function rectOps(text: string): number {
  return (text.match(/ re\n/g) ?? []).length;
}

/** Cercles et ellipses (nœuds français, perles) : chemins de Bézier fermés. */
export function curveOps(text: string): number {
  return (text.match(/\bc\n/g) ?? []).length;
}

/**
 * jsPDF écrit un identifiant de document aléatoire et une date de création :
 * deux PDF au contenu identique ne sont donc jamais octet pour octet égaux.
 * On neutralise ces deux champs avant toute comparaison.
 */
export function normalize(text: string): string {
  return text
    .replace(/\/ID \[\s*<[0-9A-Fa-f]+>\s*<[0-9A-Fa-f]+>\s*\]/g, "/ID [<0> <0>]")
    .replace(/\/CreationDate \(D:[^)]*\)/g, "/CreationDate (D:0)")
    .replace(/\/ModDate \(D:[^)]*\)/g, "/ModDate (D:0)");
}
