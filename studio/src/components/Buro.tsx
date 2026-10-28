import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { ArrowLeft, ChevronDown, Search } from "lucide-react";
import { deleteProject, getProject, listProjects, saveLibrary, type ProjectRecord } from "../lib/library";
import { clonePattern, makeId, type Pattern } from "../lib/pattern";
import { patternToSvg } from "../lib/svg";
import { VISIBILITY, VISIBILITY_ORDER, readVisibilities, writeVisibility, type Visibility } from "../lib/visibility";
import VisibilityOrb from "./VisibilityOrb";

/**
 * Le BurO : l'entrée du studio (charte UniO).
 * En haut, des verbes : Créer, Rejoindre, Échanger, Modèles. Un projet choisi déplie ses propres gestes.
 * En bas, des lieux : Projets, Partagés avec moi, Archives.
 */
type Place = "projets" | "partages" | "archives";
type Path = null | "creer" | "rejoindre" | "echanger" | "partager" | "chercher";
const ARCHIVES = "Archives";

interface Props {
  currentName: string;
  onOpen: (p: Pattern) => void;
  onContinue: () => void;
  onNew: () => void;
  onImport: (file: File) => void;
  onGenerate: () => void;
  onModels: () => void;
  onWatch: () => void;
  onInvite: (p: Pattern) => void;
  onHome: () => void;
}

const LABELS: Record<Exclude<Path, null>, string> = { creer: "Créer", rejoindre: "Rejoindre", echanger: "Échanger", partager: "Partager", chercher: "Rechercher" };

function thumb(record: ProjectRecord): string {
  try {
    const p = getProject(record);
    if (!p) return "";
    const cell = Math.max(2, Math.min(8, Math.floor(240 / Math.max(p.w, p.h))));
    const { svg } = patternToSvg(p, { grid: false, symbols: false, legend: false, cell });
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  } catch { return ""; }
}

function Tool({ children, onClick, pressed, disabled, haspopup, count, soon, id }: { children: React.ReactNode; onClick?: () => void; pressed?: boolean; disabled?: boolean; haspopup?: boolean; count?: number; soon?: boolean; id?: string }) {
  return <button id={id} type="button" className="pzs-tool" onClick={onClick} disabled={disabled} aria-pressed={pressed === undefined ? undefined : pressed}
    aria-haspopup={haspopup ? "true" : undefined} data-on={pressed ? "1" : undefined}>
    {children}{count !== undefined && <span className="pzs-count" aria-hidden="true">{count}</span>}
    {soon && <span className="buro-soon">Bientôt</span>}
  </button>;
}

export default function Buro(p: Props) {
  const [items, setItems] = useState<ProjectRecord[]>([]);
  const [error, setError] = useState("");
  const [place, setPlace] = useState<Place>("projets");
  const [sel, setSel] = useState<string | null>(null);
  const [path, setPath] = useState<Path>(null);
  const [q, setQ] = useState("");
  const [vis, setVis] = useState<Record<string, Visibility>>(readVisibilities);
  const [status, setStatus] = useState("");
  const [menu, setMenu] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const upRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const reload = () => listProjects()
    .then(v => { setItems(v.sort((a, b) => b.updated - a.updated)); setError(""); })
    .catch(() => setError("Le stockage de cet appareil est indisponible. Exportez vos projets en JSON pour les conserver."));
  useEffect(() => { void reload(); }, []);
  useEffect(() => { if (path === "chercher") searchRef.current?.focus(); else if (path) upRef.current?.focus(); }, [path]);

  const selected = items.find(v => v.id === sel) ?? null;
  const archived = (v: ProjectRecord) => v.folder === ARCHIVES;
  const shown = useMemo(() => items.filter(v => (place === "archives" ? archived(v) : !archived(v)) && v.name.toLowerCase().includes(q.trim().toLowerCase())), [items, place, q]);
  const thumbs = useMemo(() => Object.fromEntries(items.map(v => [v.id, thumb(v)])), [items]);
  const counts = { projets: items.filter(v => !archived(v)).length, archives: items.filter(archived).length };

  const choose = (id: string) => { setSel(id === sel ? null : id); setPath(null); };
  const open = (record: ProjectRecord) => { const pattern = getProject(record); if (pattern) p.onOpen(pattern); else setStatus("Ce projet est illisible : il n’a pas été ouvert."); };
  const moveTo = async (record: ProjectRecord, folder: string, msg: string) => {
    const pattern = getProject(record); if (!pattern) return;
    try { await saveLibrary({ ...pattern, id: record.id, folder }); await reload(); setSel(null); setStatus(msg); }
    catch (e) { setStatus(e instanceof Error ? e.message : "Opération impossible."); }
  };
  const duplicate = async (record: ProjectRecord) => {
    const pattern = getProject(record); if (!pattern) return;
    const copy = clonePattern(pattern); copy.id = makeId(); copy.name = pattern.name + " (copie)";
    try { await saveLibrary(copy); await reload(); setSel(copy.id ?? null); setStatus(`« ${copy.name} » ajoutée à vos projets.`); }
    catch (e) { setStatus(e instanceof Error ? e.message : "Copie impossible."); }
  };
  const setVisibility = (record: ProjectRecord, value: Visibility) => {
    if (!writeVisibility(record.id, value)) { setStatus("Cet appareil refuse d’enregistrer ce réglage."); return; }
    setVis(readVisibilities()); setStatus(`${record.name} : ${VISIBILITY[value].label.toLowerCase()}.`);
  };
  const remove = async (record: ProjectRecord) => {
    if (!window.confirm(`Supprimer définitivement « ${record.name} » de cet appareil ?`)) return;
    await deleteProject(record.id); await reload(); setSel(null); setStatus("Projet supprimé.");
  };
  const up = () => { if (path) setPath(null); else if (sel) setSel(null); };
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    if (menu) { e.preventDefault(); setMenu(false); document.getElementById("buro-brand")?.focus(); return; }
    if (path || sel) { e.preventDefault(); up(); }
  };
  const pick = (e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) p.onImport(f); };

  let tools: React.ReactNode;
  let parent = "";
  if (path === "creer") { parent = "Créer"; tools = <>
    <Tool onClick={p.onNew}>Grille vierge</Tool>
    <Tool onClick={() => fileRef.current?.click()}>Importer</Tool>
    <Tool onClick={p.onGenerate}>Générer</Tool>
  </>; }
  else if (path === "rejoindre") { parent = "Rejoindre"; tools = <>
    <Tool onClick={p.onWatch}>Regarder un ouvrage en direct</Tool>
    <Tool disabled soon>Avec un code</Tool>
    <Tool disabled soon>Un SAL</Tool>
  </>; }
  else if (path === "echanger") { parent = "Échanger"; tools = <>
    <Tool disabled soon>Messages</Tool>
    <Tool disabled soon>Commentaires</Tool>
    <Tool onClick={() => { setPath(null); document.getElementById("buro-activite")?.scrollIntoView({ block: "start" }); }}>Activité</Tool>
  </>; }
  else if (path === "chercher") { parent = "Rechercher"; tools = <>
    <label className="sr-only" htmlFor="buro-q">Rechercher un projet</label>
    <input id="buro-q" ref={searchRef} className="buro-search" value={q} onChange={e => setQ(e.target.value)} placeholder="Un nom de projet…" />
    {q && <Tool onClick={() => setQ("")}>Effacer</Tool>}
  </>; }
  else if (path === "partager" && selected) { parent = "Partager"; tools = <>
    {VISIBILITY_ORDER.map(v => <Tool key={v} pressed={(vis[selected.id] ?? "prive") === v} onClick={() => setVisibility(selected, v)}>
      <VisibilityOrb value={v} size={22} />{VISIBILITY[v].label}</Tool>)}
    <span className="pzs-sep" aria-hidden="true" />
    <Tool onClick={() => { const pattern = getProject(selected); if (pattern) p.onInvite(pattern); }}>Inviter à regarder</Tool>
  </>; }
  else if (selected) { parent = selected.name; tools = <>
    <Tool onClick={() => open(selected)}>Ouvrir</Tool>
    {!archived(selected) && <Tool haspopup count={5} onClick={() => setPath("partager")}>Partager</Tool>}
    <Tool onClick={() => void duplicate(selected)}>Dupliquer</Tool>
    {archived(selected)
      ? <><Tool onClick={() => void moveTo(selected, "", `« ${selected.name} » revient dans vos projets.`)}>Restaurer</Tool><Tool onClick={() => void remove(selected)}>Supprimer</Tool></>
      : <Tool onClick={() => void moveTo(selected, ARCHIVES, `« ${selected.name} » rangée dans les archives.`)}>Archiver</Tool>}
  </>; }
  else tools = <>
    <Tool haspopup count={3} onClick={() => setPath("creer")}>Créer</Tool>
    <Tool haspopup count={3} onClick={() => setPath("rejoindre")}>Rejoindre</Tool>
    <Tool haspopup count={3} onClick={() => setPath("echanger")}>Échanger</Tool>
    <Tool onClick={p.onModels}>Modèles</Tool>
  </>;

  const crumbs = ["Point Zéro", "BurO", place === "projets" ? "Projets" : place === "partages" ? "Partagés avec moi" : "Archives"];
  if (selected) crumbs.push(selected.name);
  if (path) crumbs.push(LABELS[path]);
  const date = (t: number) => new Date(t).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  return <div className="buro">
    <input ref={fileRef} type="file" className="sr-only" aria-label="Importer une image, un PDF ou un projet dans le BurO" accept="image/png,image/jpeg,image/webp,.pdf,.json,.oxs" onChange={pick} />
    <header className="pzs-head" aria-label="En-tête du BurO">
      <nav className="pzs-top" aria-label="Dock des actions du BurO" onKeyDown={onKey}>
        <div className="pzs-brandwrap">
          <button id="buro-brand" type="button" className="pzs-tool pzs-brand" aria-label="Menu Point Zéro" aria-expanded={menu} aria-controls="buro-menu" onClick={() => setMenu(v => !v)}>
            <span className="pzs-x" aria-hidden="true">×</span><span className="pzs-brandtxt"> Point Zéro</span> <ChevronDown size={13} aria-hidden="true" style={{ transform: menu ? "rotate(180deg)" : undefined }} />
          </button>
          {menu && <><div className="pzs-veil" aria-hidden="true" onClick={() => setMenu(false)} />
            <div id="buro-menu" className="pzs-menu"><ul>
              <li><button type="button" onClick={() => { setMenu(false); p.onHome(); }}>Accueil Point Zéro</button></li>
              <li><button type="button" onClick={() => { setMenu(false); p.onModels(); }}>Boutique de patrons</button></li>
              <li><button type="button" onClick={() => { setMenu(false); p.onContinue(); }}>Le studio</button></li>
            </ul></div></>}
        </div>
        <span className="pzs-sep" aria-hidden="true" />
        <div className="pzs-row">
          {(path || selected) && <>
            <button ref={upRef} type="button" className="pzs-tool pzs-up" aria-label="Remonter d’un niveau" onClick={up}><ArrowLeft size={18} aria-hidden="true" /></button>
            <span className="pzs-parent">{parent}</span>
            <span className="pzs-sep" aria-hidden="true" />
          </>}
          {tools}
        </div>
        <span className="pzs-sep" aria-hidden="true" />
        <button type="button" className="pzs-tool pzs-icon" aria-label="Rechercher un projet" aria-pressed={path === "chercher"} onClick={() => { setSel(null); setPath(path === "chercher" ? null : "chercher"); }}><Search size={17} aria-hidden="true" /></button>
      </nav>
      <p className="pzs-crumbs">{crumbs.map((c, i) => <span key={i}>{i > 0 && <span aria-hidden="true"> › </span>}{i === crumbs.length - 1 ? <strong>{c}</strong> : c}</span>)}</p>
    </header>

    <main className="buro-main" id="buro-main">
      <p className="buro-kicker">Point Zéro · Mon espace</p>
      <h1 className="buro-title">BurO</h1>
      <div className="buro-intro">
        <p className="buro-lead">Vos ouvrages, ceux qu’on vous partage, et ce qui se brode ensemble.</p>
        <div className="buro-current">
          <span><span className="buro-small">Ouvrage en cours</span><strong>{p.currentName}</strong></span>
          <button type="button" className="buro-btn" onClick={p.onContinue}>Continuer →</button>
        </div>
      </div>
      <p role="status" aria-live="polite" className="buro-status">{status}</p>
      {error && <p role="alert" className="buro-error">{error}</p>}

      {place === "partages" ? <section className="buro-empty" aria-labelledby="buro-partages">
        <h2 id="buro-partages">Partagés avec moi</h2>
        <p>Les projets que d’autres vous confient apparaîtront ici, avec leur rôle : éditeur, participant ou lecteur. Le partage en ligne arrive avec les comptes.</p>
        <p>Dès aujourd’hui, vous pouvez regarder un ouvrage en direct grâce au code qu’on vous envoie.</p>
        <button type="button" className="buro-btn" onClick={p.onWatch}>Regarder un ouvrage en direct</button>
      </section> : <section aria-labelledby="buro-liste">
        <h2 id="buro-liste" className="sr-only">{place === "archives" ? "Archives" : "Projets"}</h2>
        {shown.length === 0 ? <div className="buro-empty">
          <p>{place === "archives" ? "Aucun projet archivé." : q ? `Aucun projet ne correspond à « ${q} ».` : "Vos projets enregistrés apparaîtront ici."}</p>
          {place === "projets" && !q && <button type="button" className="buro-btn" onClick={() => setPath("creer")}>Créer un projet</button>}
        </div> : <ul className="buro-grid">
          {shown.map(v => { const on = sel === v.id, level = vis[v.id] ?? "prive"; return <li key={v.id}>
            <button type="button" className="buro-card" aria-pressed={on} data-on={on ? "1" : undefined} onClick={() => choose(v.id)} onDoubleClick={() => open(v)}
              aria-label={`${v.name}, ${v.w} sur ${v.h}, ${Math.round(v.progress * 100)} % brodé, ${VISIBILITY[level].label}`}>
              <span className="buro-thumb">{thumbs[v.id] ? <img src={thumbs[v.id]} alt="" /> : <span aria-hidden="true">×</span>}</span>
              <span className="buro-meta">
                <span className="buro-name">{v.name}</span>
                <span className="buro-sub">{v.w} × {v.h} · {Math.round(v.progress * 100)} % · {date(v.updated)}</span>
              </span>
              <span className="buro-vis"><VisibilityOrb value={level} size={22} />{VISIBILITY[level].label}</span>
            </button>
          </li>; })}
        </ul>}
      </section>}

      {place === "projets" && <>
        <section className="buro-band" aria-labelledby="buro-ensemble">
          <div>
            <p className="buro-kicker">Broder ensemble</p>
            <h2 id="buro-ensemble">Un patron, plusieurs mains.</h2>
          </div>
          <div className="buro-band-text">
            <p>Bientôt, un SAL : l’organisatrice publie un patron en parties datées, chacune avance sur son ouvrage et le fil commun montre les progrès de toutes.</p>
            <p>Chaque projet a déjà sa visibilité : privé, restreint, par lien ou public. Choisissez un projet, puis Partager.</p>
          </div>
        </section>
        <section id="buro-activite" className="buro-activity" aria-labelledby="buro-activite-titre">
          <h2 id="buro-activite-titre">Activité</h2>
          {items.length === 0 ? <p>Rien encore.</p> : <ol>{items.slice(0, 6).map(v => <li key={v.id}><strong>{v.name}</strong> modifié le {date(v.updated)}</li>)}</ol>}
        </section>
      </>}
    </main>

    <nav className="pzs-bottom" aria-label="Lieux du BurO">
      <div className="pzs-seg">
        <button type="button" aria-current={place === "projets" ? "page" : undefined} aria-pressed={place === "projets"} onClick={() => { setPlace("projets"); setSel(null); setPath(null); }}>Projets <span className="buro-n">{counts.projets}</span></button>
        <button type="button" aria-current={place === "partages" ? "page" : undefined} aria-pressed={place === "partages"} onClick={() => { setPlace("partages"); setSel(null); setPath(null); }}>Partagés avec moi</button>
        <button type="button" aria-current={place === "archives" ? "page" : undefined} aria-pressed={place === "archives"} onClick={() => { setPlace("archives"); setSel(null); setPath(null); }}>Archives <span className="buro-n">{counts.archives}</span></button>
      </div>
    </nav>
  </div>;
}
