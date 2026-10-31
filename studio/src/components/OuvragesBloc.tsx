import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { getProject, listProjects, type ProjectRecord } from "../lib/library";
import { StitchThumbnail } from "./MotifLibrary";

/** Glisser un ouvrage de « Mes ouvrages » sur la grille : il s'ouvre. */
export const OUVRAGE_DRAG_TYPE = "application/x-aime-ouvrage";
const ACCEPTE = "image/png,image/jpeg,image/webp,.pdf,.json,.oxs";

function Vignette({ r }: { r: ProjectRecord }) {
  const p = useMemo(() => { try { return getProject(r); } catch { return null; } }, [r]);
  return p ? <StitchThumbnail pattern={p} /> : <span className="pzs-fichier-vide" aria-hidden="true" />;
}

/** Le rond du profil, dans la grille : vos ouvrages en dossiers, à ouvrir d'un clic ou à glisser sur la grille,
 *  et une case où déposer une image, un PDF ou un projet (.json, .oxs) depuis l'ordinateur. */
export default function OuvragesBloc({ courant, ouvrir, importer, dossier: dossierImpose, onDossier, onListe }: { courant?: string; ouvrir: (id: string) => void; importer: (f: File) => void;
  /** facultatif : le dossier choisi est tenu par l'hôte (le Bureau du disque le retient d'une visite à l'autre) */
  dossier?: string | null; onDossier?: (d: string | null) => void;
  /** facultatif : la liste réelle, pour que l'hôte range ses commandes (les dossiers dans la couronne) */
  onListe?: (l: ProjectRecord[]) => void }) {
  const [liste, setListe] = useState<ProjectRecord[] | null>(null);
  const [dossierLocal, setDossierLocal] = useState<string | null>(null);
  const dossier = dossierImpose !== undefined ? dossierImpose : dossierLocal;
  const setDossier = (d: string | null) => { if (onDossier) onDossier(d); else setDossierLocal(d); };
  const [survol, setSurvol] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { let vivant = true; listProjects().then(l => { if (vivant) { const t = [...l].sort((a, b) => b.updated - a.updated); setListe(t); onListe?.(t); } }).catch(() => { if (vivant) setListe([]); }); return () => { vivant = false; }; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const dossiers = useMemo(() => [...new Set((liste ?? []).map(r => r.folder).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr")), [liste]);
  const vus = (liste ?? []).filter(r => dossier === null || r.folder === dossier).slice(0, 24);
  const deposer = (e: DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setSurvol(false);
    const id = e.dataTransfer.getData(OUVRAGE_DRAG_TYPE); if (id) { ouvrir(id); return; }
    const f = e.dataTransfer.files?.[0]; if (f) importer(f);
  };
  return <>
    <div className="pzs-dossiers" role="group" aria-label="Dossiers">
      <button type="button" aria-pressed={dossier === null} onClick={() => setDossier(null)}>Tous <span>{liste?.length ?? "…"}</span></button>
      {dossiers.map(d => <button key={d} type="button" aria-pressed={dossier === d} onClick={() => setDossier(dossier === d ? null : d)}>{d} <span>{liste!.filter(r => r.folder === d).length}</span></button>)}
    </div>
    <ul className="pzs-fichiers" aria-label="Mes ouvrages">
      <li>
        <button type="button" className={"pzs-depot" + (survol ? " survol" : "")} onClick={() => input.current?.click()}
          onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; setSurvol(true); }} onDragLeave={() => setSurvol(false)} onDrop={deposer}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" /></svg>
          <b>Déposer un fichier</b><span>Image, PDF, .json, .oxs</span>
        </button>
        <input ref={input} type="file" className="sr-only" tabIndex={-1} aria-hidden="true" accept={ACCEPTE} onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) importer(f); }} />
      </li>
      {vus.map(r => <li key={r.id}>
        <button type="button" className="pzs-fichier" draggable aria-current={r.id === courant ? "true" : undefined}
          aria-label={"Ouvrir " + r.name + " dans la grille, " + r.w + " × " + r.h + " points, brodé à " + Math.round(r.progress * 100) + " %"}
          onDragStart={e => { e.dataTransfer.setData(OUVRAGE_DRAG_TYPE, r.id); e.dataTransfer.effectAllowed = "copy"; }}
          onClick={() => ouvrir(r.id)}>
          <span className="pzs-fichier-image"><Vignette r={r} /></span>
          <b>{r.name}</b>
          <span>{r.w} × {r.h} · {Math.round(r.progress * 100)} %{r.id === courant ? " · ouvert" : ""}</span>
        </button>
      </li>)}
    </ul>
    {liste && !liste.length && <p className="pzs-note">Aucun ouvrage pour l’instant : déposez une image, un PDF ou un projet.</p>}
    {/* l'explication est derrière le « ? » de Mes ouvrages : la liste reste lisible */}
  </>;
}
