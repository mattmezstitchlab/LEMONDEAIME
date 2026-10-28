import { useEffect, useState } from "react";
import { ArchiveRestore, Folder, Plus, Search, Trash2 } from "lucide-react";
import { deleteProject, getProject, listProjects, shoppingList, type ProjectRecord } from "../lib/library";
import { fromObject, type Pattern, type Supply } from "../lib/pattern";
import { downloadBlob } from "../lib/io";
import Sheet from "./Sheet";

export default function LibrarySheet({ open, onClose, onLoad, onNew, inventory }: { open: boolean; onClose: () => void; onLoad: (p: Pattern) => void; onNew: () => void; inventory: Record<string, Supply> }) {
  const [items, setItems] = useState<ProjectRecord[]>([]), [q, setQ] = useState(""), [folder, setFolder] = useState(""), [versions, setVersions] = useState<string | null>(null), [error, setError] = useState("");
  const [legacy] = useState(() => { try { return localStorage.getItem("point-zero:legacy-backup") ?? ""; } catch { return ""; } });
  const reload = () => listProjects().then((v) => setItems(v.sort((a, b) => b.updated - a.updated))).catch(() => setError("Le stockage IndexedDB est indisponible. Exportez votre fichier JSON pour le conserver."));
  useEffect(() => { if (open) void reload(); }, [open]);
  const filtered = items.filter((v) => (!folder || v.folder === folder) && v.name.toLowerCase().includes(q.toLowerCase()));
  const shopping = () => {
    const all = filtered.map(getProject).filter((v): v is Pattern => !!v), rows = shoppingList(all, inventory);
    const text = "DMC;Nom;Metres_equivalent_6_brins;Echeveaux_a_acheter\n" + rows.map((r) => `${r.code};${r.name};${r.meters.toFixed(2)};${r.buy}`).join("\n");
    downloadBlob(new Blob(["\uFEFF" + text], { type: "text/csv;charset=utf-8" }), "liste-achats-point-zero.csv");
  };
  return <Sheet open={open} onClose={onClose} title="Mes projets" subtitle="Sur cet appareil, avec sauvegardes de versions" toolbar={<div className="flex items-center justify-between"><button className="btn-tinted" onClick={onNew}><Plus size={16} />Nouvelle grille</button><button onClick={shopping} className="text-[13px] font-medium text-accent-2">Liste d’achat CSV</button></div>}>
    <div className="relative"><Search size={16} className="absolute left-3 top-3 text-label-3" /><input className="field pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un projet" aria-label="Rechercher un projet" /></div>
    <label className="mt-3 flex items-center gap-2 text-[13px] text-label-2"><Folder size={15} /><select className="field" value={folder} onChange={(e) => setFolder(e.target.value)}><option value="">Tous les dossiers</option>{[...new Set(items.map((v) => v.folder).filter(Boolean))].map((f) => <option key={f}>{f}</option>)}</select></label>
    {error && <p role="alert" className="mt-3 text-[13px] text-danger">{error}</p>}
    {legacy && <button className="mt-3 text-left text-[12px] text-warn" onClick={() => downloadBlob(new Blob([legacy], { type: "application/json" }), "point-zero-sauvegarde-historique.json")}>Ancien format conservé : télécharger la sauvegarde originale</button>}
    <div className="mt-4 divide-y divide-white/10">{filtered.map((v) => <article key={v.id} className="py-4">
      <div className="flex items-start gap-2"><button onClick={() => { const p = getProject(v); if (p) onLoad(p); }} className="flex-1 text-left"><h3 className="font-semibold tracking-tight">{v.name}</h3><p className="mt-1 text-[12px] text-label-3">{v.w} × {v.h} · {Math.round(v.progress * 100)} % · {v.folder || "Sans dossier"}</p></button><button className="btn-icon" aria-label={`Versions de ${v.name}`} onClick={() => setVersions(versions === v.id ? null : v.id)}><ArchiveRestore size={17} /></button><button className="btn-icon text-danger" aria-label={`Supprimer ${v.name}`} onClick={async () => { if (window.confirm(`Supprimer « ${v.name} » de la bibliothèque ?`)) { await deleteProject(v.id); await reload(); } }}><Trash2 size={17} /></button></div>
      {versions === v.id && <div className="mt-3 border-l border-white/15 pl-3">{v.versions.length === 0 ? <p className="text-[12px] text-label-3">Pas encore de version antérieure.</p> : v.versions.map((version) => <button key={version.date} className="block py-2 text-[12px] text-accent-2" onClick={() => { const p = fromObject(JSON.parse(version.data)); if (p) onLoad(p); }}>Restaurer le {new Date(version.date).toLocaleString("fr-FR")}</button>)}</div>}
    </article>)}</div>
    {filtered.length === 0 && <p className="py-10 text-center text-[14px] text-label-3">Les projets sauvegardés apparaissent ici.</p>}
    <p className="mt-4 text-[12px] leading-relaxed text-label-3">La liste d’achat additionne les besoins des projets affichés et déduit le stock global, une seule fois. Le nettoyage des données du navigateur efface les projets locaux : conservez aussi une copie JSON.</p>
  </Sheet>;
}