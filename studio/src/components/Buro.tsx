import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { ArrowLeft, Search, X } from "lucide-react";
import { deleteProject, getProject, listProjects, saveLibrary, type ProjectRecord } from "../lib/library";
import { clonePattern, makeId, type Pattern } from "../lib/pattern";
import { patternToSvg } from "../lib/svg";
import { VISIBILITY, VISIBILITY_ORDER, readVisibilities, writeVisibility, type Visibility } from "../lib/visibility";
import VisibilityOrb from "./VisibilityOrb";
import TopDock from "./TopDock";
import OrbeGuide, { visiteVue, type Etape } from "./OrbeGuide";

/**
 * Le BurO : le bureau de la brodeuse (charte UniO).
 * En haut, le dock pour faire : l'orbe et son menu, des verbes (Créer, Rejoindre, Échanger), la loupe et le retour au studio.
 * Un projet choisi déplie ses propres gestes dans ce même dock.
 * Au milieu : l'ouvrage en cours, quatre façons de commencer, les projets, broder ensemble et l'activité.
 * En bas, le dock pour se repérer : Le Point (la visite) et les lieux : Projets, Partagés avec moi, Archives.
 * À la première visite, Le Point présente tout le BurO, de bout en bout.
 */
export const VISITE_BURO = "pointzero:visite-buro:v1";
export const ETAPES_BURO: Etape[] = [
  { dock: "haut", cible: "orbe", titre: "Bienvenue dans votre BurO", texte: "Je suis Le Point. Le BurO, c’est votre bureau : vos ouvrages, ceux qu’on vous confie, et tout ce qui se brode ensemble. Mon carré ouvre le menu : l’accueil, le studio, et cette visite." },
  { dock: "haut", cible: "creer", titre: "Créer", texte: "Le premier verbe : commencer un nouvel ouvrage. Un clic déploie ses trois façons dans le dock." },
  { dock: "haut", cible: "outils", chemin: "creer", titre: "Trois façons de commencer", texte: "Une grille vierge pour dessiner, un fichier à importer (photo, PDF, projet JSON ou OXS), ou un patron généré à partir de quelques mots. La flèche à gauche remonte d’un niveau." },
  { dock: "haut", cible: "rejoindre", titre: "Rejoindre", texte: "Regarder en direct l’ouvrage d’une amie, depuis votre appareil. Bientôt : rejoindre avec un code, et les SAL." },
  { dock: "haut", cible: "echanger", titre: "Échanger", texte: "L’activité de vos ouvrages. Bientôt : les messages et les commentaires posés sur la grille." },
  { dock: "haut", cible: "chercher", titre: "Chercher un projet", texte: "La loupe filtre vos projets par leur nom, au fil de la frappe." },
  { dock: "haut", cible: "studio", titre: "Retour au studio", texte: "Vous ramène dans l’atelier, sur l’ouvrage en cours." },
  { dock: "page", cible: "reprendre", titre: "L’ouvrage en cours", texte: "Le dernier ouvrage ouvert sur cet appareil : « Continuer » le rouvre là où vous l’avez laissé." },
  { dock: "page", cible: "commencer", titre: "Commencer en un geste", texte: "Les mêmes départs que le verbe Créer, en grand : grille vierge, importer, générer, ou regarder un ouvrage en direct." },
  { dock: "page", cible: "projets", titre: "Vos projets", texte: "Touchez un projet pour le choisir : ses gestes (Ouvrir, Partager, Dupliquer, Archiver) apparaissent dans le dock du haut. Un double clic l’ouvre directement." },
  { dock: "page", cible: "ensemble", titre: "Broder ensemble", texte: "Chaque projet a sa visibilité : privé, restreint, par lien ou public. Choisissez un projet, puis Partager." },
  { dock: "bas", cible: "lieux", titre: "Les lieux du BurO", texte: "Projets, Partagés avec moi, Archives : le dock du bas vous dit toujours où vous êtes, avec le nombre de projets." },
  { dock: "bas", cible: "point", titre: "Me retrouver", texte: "Je reste ici, dans le dock du bas : un clic, et je refais la visite avec vous. Bon ouvrage !" },
];
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

function Tool({ children, onClick, pressed, disabled, haspopup, count, soon, id, guide }: { children: React.ReactNode; onClick?: () => void; pressed?: boolean; disabled?: boolean; haspopup?: boolean; count?: number; soon?: boolean; id?: string; guide?: string }) {
  return <button id={id} type="button" data-guide={guide} className="pzs-tool" onClick={onClick} disabled={disabled} aria-pressed={pressed === undefined ? undefined : pressed}
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
  const [visite, setVisite] = useState(() => !visiteVue(VISITE_BURO));
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
  const echap = () => { if (!path && !sel) return false; up(); return true; };
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
    <Tool guide="creer" haspopup count={3} onClick={() => setPath("creer")}>Créer</Tool>
    <Tool guide="rejoindre" haspopup count={3} onClick={() => setPath("rejoindre")}>Rejoindre</Tool>
    <Tool guide="echanger" haspopup count={3} onClick={() => setPath("echanger")}>Échanger</Tool>
  </>;

  const crumbs = ["Point Zéro", "BurO", place === "projets" ? "Projets" : place === "partages" ? "Partagés avec moi" : "Archives"];
  if (selected) crumbs.push(selected.name);
  if (path) crumbs.push(LABELS[path]);
  const date = (t: number) => new Date(t).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  return <div className="buro">
    <input ref={fileRef} type="file" className="sr-only" aria-label="Importer une image, un PDF ou un projet dans le BurO" accept="image/png,image/jpeg,image/webp,.pdf,.json,.oxs" onChange={pick} />
    <TopDock label="Dock des actions du BurO" idBloc="buro-menu" crumbs={crumbs} onEchap={echap}
      menu={[{ label: "Accueil Point Zéro", faire: p.onHome }, { label: "Le studio", faire: p.onContinue }, { label: "Revoir la visite avec Le Point", faire: () => { setSel(null); setPath(null); setVisite(true); } }]}
      droite={<>
        <button type="button" data-guide="chercher" className="pzs-tool pzs-icon pzs-loupe" aria-label={path === "chercher" ? "Fermer la recherche" : "Rechercher un projet"} aria-pressed={path === "chercher"} onClick={() => { setSel(null); setPath(path === "chercher" ? null : "chercher"); }}>
          {path === "chercher" ? <X size={17} aria-hidden="true" /> : <Search size={18} aria-hidden="true" />}
        </button>
        <button type="button" data-guide="studio" className="pzs-tool buro-studio" aria-label="Retour au studio" title="Retour au studio" onClick={p.onContinue}><span className="buro-studio-txt">Le studio </span><span aria-hidden="true">→</span></button>
      </>}>
      {(path || selected) && <>
        <button ref={upRef} type="button" className="pzs-tool pzs-up" aria-label="Remonter d’un niveau" onClick={up}><ArrowLeft size={18} aria-hidden="true" /></button>
        <span className="pzs-parent">{parent}</span>
        <span className="pzs-sep" aria-hidden="true" />
      </>}
      {tools}
    </TopDock>

    <main className="buro-main" id="buro-main">
      <p className="buro-kicker">Point Zéro · Mon espace</p>
      <h1 className="buro-title">BurO</h1>
      <div className="buro-intro">
        <p className="buro-lead">Vos ouvrages, ceux qu’on vous partage, et ce qui se brode ensemble.</p>
        <div className="buro-current" data-guide="reprendre">
          <span><span className="buro-small">Ouvrage en cours</span><strong>{p.currentName}</strong></span>
          <button type="button" className="buro-btn" onClick={p.onContinue}>Continuer →</button>
        </div>
      </div>
      <section className="buro-start" aria-labelledby="buro-start-titre">
        <h2 id="buro-start-titre" className="buro-h2">Commencer</h2>
        <ul className="buro-starts" data-guide="commencer">
          <li><button type="button" className="buro-start-tile" onClick={p.onNew}><b>Grille vierge</b><span>Une toile de 80 × 80, prête à dessiner.</span></button></li>
          <li><button type="button" className="buro-start-tile" onClick={() => fileRef.current?.click()}><b>Importer un fichier</b><span>Photo, patron PDF, projet JSON ou OXS.</span></button></li>
          <li><button type="button" className="buro-start-tile" onClick={p.onGenerate}><b>Générer un patron</b><span>Décrivez le motif, le studio propose une grille.</span></button></li>
          <li><button type="button" className="buro-start-tile buro-start-sombre" onClick={p.onWatch}><b>Regarder en direct</b><span>Suivre l’ouvrage d’une amie, avec son code.</span></button></li>
        </ul>
      </section>
      <p role="status" aria-live="polite" className="buro-status">{status}</p>
      {error && <p role="alert" className="buro-error">{error}</p>}

      <div className="buro-liste-tete">
        <h2 className="buro-h2" id="buro-liste-titre">{place === "archives" ? "Archives" : place === "partages" ? "Partagés avec moi" : "Mes projets"}{place !== "partages" && <span className="buro-n"> {place === "archives" ? counts.archives : counts.projets}</span>}</h2>
        {place !== "partages" && shown.length > 0 && <p className="buro-astuce">Touchez un projet : ses gestes apparaissent dans le dock du haut. Double clic pour l’ouvrir.</p>}
      </div>
      {place === "partages" ? <section className="buro-empty" aria-labelledby="buro-partages" data-guide="projets">
        <h2 id="buro-partages" className="sr-only">Partagés avec moi</h2>
        <p>Les projets que d’autres vous confient apparaîtront ici, avec leur rôle : éditeur, participant ou lecteur. Le partage en ligne arrive avec les comptes.</p>
        <p>Dès aujourd’hui, vous pouvez regarder un ouvrage en direct grâce au code qu’on vous envoie.</p>
        <button type="button" className="buro-btn" onClick={p.onWatch}>Regarder un ouvrage en direct</button>
      </section> : <section aria-labelledby="buro-liste-titre">
        {shown.length === 0 ? <div className="buro-empty" data-guide="projets">
          <p>{place === "archives" ? "Aucun projet archivé." : q ? `Aucun projet ne correspond à « ${q} ».` : "Vos projets enregistrés apparaîtront ici."}</p>
          {place === "projets" && !q && <button type="button" className="buro-btn" onClick={() => setPath("creer")}>Créer un projet</button>}
        </div> : <ul className="buro-grid">
          {shown.map((v, n) => { const on = sel === v.id, level = vis[v.id] ?? "prive"; return <li key={v.id} data-guide={n === 0 ? "projets" : undefined}>
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

      {place === "projets" && <div className="buro-bas">
        <section className="buro-band" aria-labelledby="buro-ensemble" data-guide="ensemble">
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
          {items.length === 0 ? <p>Rien encore : vos ouvrages enregistrés s’afficheront ici, du plus récent au plus ancien.</p> : <ol>{items.slice(0, 6).map(v => <li key={v.id}><strong>{v.name}</strong> modifié le {date(v.updated)}</li>)}</ol>}
        </section>
      </div>}
    </main>

    <nav className="pzs-bottom" aria-label="Lieux du BurO">
      <button type="button" data-guide="point" className="pzs-cercle buro-point" aria-label="Le Point : faire la visite du BurO" title="Le Point : faire la visite" onClick={() => { setSel(null); setPath(null); setVisite(true); }}><span className="pzs-orb" aria-hidden="true" /></button>
      <div className="pzs-seg" data-guide="lieux">
        <button type="button" aria-current={place === "projets" ? "page" : undefined} aria-pressed={place === "projets"} onClick={() => { setPlace("projets"); setSel(null); setPath(null); }}>Projets <span className="buro-n">{counts.projets}</span></button>
        <button type="button" aria-current={place === "partages" ? "page" : undefined} aria-pressed={place === "partages"} onClick={() => { setPlace("partages"); setSel(null); setPath(null); }}>Partagés avec moi</button>
        <button type="button" aria-current={place === "archives" ? "page" : undefined} aria-pressed={place === "archives"} onClick={() => { setPlace("archives"); setSel(null); setPath(null); }}>Archives <span className="buro-n">{counts.archives}</span></button>
      </div>
    </nav>
    <OrbeGuide ouverte={visite} onFermer={() => setVisite(false)} etapes={ETAPES_BURO} cle={VISITE_BURO} fin="Découvrir mon BurO"
      onChemin={c => { setSel(null); setPath((c as Path) ?? null); }} />
  </div>;
}
