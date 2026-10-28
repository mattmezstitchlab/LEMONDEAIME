import { fromObject, toObject, type Pattern } from "./pattern";

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function slugify(s: string) {
  return (
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "motif"
  );
}

export function saveProjectFile(p: Pattern) {
  const blob = new Blob([JSON.stringify(toObject(p))], { type: "application/json" });
  downloadBlob(blob, `${slugify(p.name)}.pointzero.json`);
}

/** Lecture texte compatible aussi avec les navigateurs dont File.text n'est pas disponible. */
export async function readTextFile(file: File): Promise<string> {
  if (typeof file.text === "function") return file.text();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string"
      ? resolve(reader.result)
      : reject(new Error("Lecture du fichier impossible."));
    reader.onerror = () => reject(reader.error ?? new Error("Lecture du fichier impossible."));
    reader.onabort = () => reject(new Error("Lecture interrompue."));
    reader.readAsText(file);
  });
}

export async function readProjectFile(file: File): Promise<Pattern | null> {
  try {
    return fromObject(JSON.parse(await readTextFile(file)));
  } catch {
    return null;
  }
}
