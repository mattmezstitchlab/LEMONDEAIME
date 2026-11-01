// ROSACE — Transfert vers l'atelier Point Zéro
//
// Le format de transfert est le format natif de l'atelier :
// `Pattern` sérialisé avec `toObject` (studio/src/lib/pattern.ts, format v3,
// table des codes DMC incluse) et stocké sous la clé locale de l'atelier
// `point-zero:motif:v1`, que l'atelier relit au démarrage via `loadStored()`.
// Aucun second modèle de patron n'est créé : bibliothèque et atelier partagent
// la même source de vérité.

import { toObject, type Pattern } from "../../../studio/src/lib/pattern";

export const ATELIER_STORAGE_KEY = "point-zero:motif:v1";
export const ATELIER_ARCHIVE_PREFIX = "point-zero:motif:archive-";
export const ATELIER_URL = "/studio/";

export interface TransfertAtelier {
  ok: boolean;
  patternId: string | null;
  archive: string | null;
  raison?: string;
}

/**
 * Prépare l'ouverture dans l'atelier.
 *
 * Si un ouvrage existe déjà dans l'atelier, il est d'abord archivé sous une
 * clé horodatée (l'atelier ne gère qu'un projet présent à la fois). Le patron
 * de la rosace est ensuite écrit dans la clé de l'atelier et la page
 * /studio/ est chargée : l'atelier y retrouve exactement la même géométrie,
 * graine, palette, dimensions et croix (la signature 5D reste lisible dans
 * les notes du patron).
 */
export function transférerVersAtelier(
  pattern: Pattern,
  options?: { archiveSiExistants?: boolean },
): TransfertAtelier {
  let archive: string | null = null;
  try {
    const existing = localStorage.getItem(ATELIER_STORAGE_KEY);
    if (existing && options?.archiveSiExistants !== false) {
      const cle = `${ATELIER_ARCHIVE_PREFIX}${Date.now()}`;
      localStorage.setItem(cle, existing);
      archive = cle;
    }
    localStorage.setItem(ATELIER_STORAGE_KEY, JSON.stringify(toObject(pattern)));
  } catch (err) {
    return {
      ok: false,
      patternId: null,
      archive: null,
      raison: `Impossible d'écrire le patron pour l'atelier : ${err}`,
    };
  }
  if (typeof window !== "undefined") {
    window.location.href = ATELIER_URL;
  }
  return { ok: true, patternId: pattern.id ?? null, archive };
}

/**
 * Télécharge le patron au format Point Zéro (`.pointzero.json`). Le fichier
 * peut être importé dans l'atelier via son écran d'importation, sans modifier
 * l'ouvrage actuellement ouvert.
 */
export function téléchargerPatron(pattern: Pattern, nomFichier?: string): void {
  const blob = new Blob([JSON.stringify(toObject(pattern))], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = (nomFichier || slugify(pattern.name)) + ".pointzero.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function slugify(s: string): string {
  return (
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "rosace"
  );
}

/** Liste les archivages d'ouvrages précédemment remplacés par un transfert. */
export function listerArchives(): { cle: string; date: number }[] {
  if (typeof localStorage === "undefined") return [];
  const out: { cle: string; date: number }[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const cle = localStorage.key(i);
    if (cle && cle.startsWith(ATELIER_ARCHIVE_PREFIX)) {
      out.push({ cle, date: Number(cle.slice(ATELIER_ARCHIVE_PREFIX.length)) || 0 });
    }
  }
  return out.sort((a, b) => b.date - a.date);
}
