/**
 * Essai privé : le socle visuel AIME, Jour et Nuit — présenté avant toute généralisation (/essai-aime).
 * Mélange des références de Matt (29 octobre) : le cadre, la nav pilule de verre, le titre qui s'estompe, les titres à graisses mêlées,
 * le calendrier sobre, le contrôle segmenté en relief, le bento sombre avec ses tuiles d'éclat, la bande défilante, les appareils inclinés,
 * et le disque radial réel de la landing (importé tel quel : ni le Point ni le Dock ne sont modifiés).
 * Tout est construit avec design/aime.css et design/aime-composants.css ; les couleurs vives n'appartiennent qu'au contenu d'un univers.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, ChevronDown, Compass, FileUp, FolderOpen, SlidersHorizontal, Monitor, Moon, Palette, PenLine, Scissors, Sun, SunMoon, Smartphone, X } from "lucide-react";
import "../design/aime-composants.css";
import "./EssaiAime.css";
import { CHOIX_THEMES, useTheme, type Theme } from "../design/theme";
import { Disque } from "../components/edition/Edition";
import type { ModePoint } from "../lib/point/modes";

const IMG = import.meta.env.BASE_URL + "images/";
const TOKENS: [string, string][] = [
  ["fond", "Fond"], ["fond-2", "Fond 2"], ["surface", "Surface"], ["surface-2", "Surface 2"], ["texte", "Texte"], ["texte-2", "Texte secondaire"], ["texte-3", "Texte tertiaire"],
  ["bordure-champ", "Bordure de champ"], ["primaire", "Primaire"], ["selection", "Sélection"], ["focus", "Focus"], ["erreur", "Erreur"], ["succes", "Succès"], ["desactive", "Désactivé"],
];
const UNIVERS: { id: string; nom: string; img?: string; legende: string }[] = [
  { id: "neutre", nom: "Neutre", img: "histoire/reconstitution-atelier.webp", legende: "Reconstitution générée" },
  { id: "broderie", nom: "Broderie", img: "histoire/met-palampore-2010-337.webp", legende: "The Met, domaine public" },
  { id: "mariage", nom: "Mariage", legende: "Visuel à venir" },
  { id: "spectacle", nom: "Spectacle", legende: "Visuel à venir" },
  { id: "culture", nom: "Culture", img: "histoire/met-reserve-bleue-40-128.webp", legende: "The Met, domaine public" },
  { id: "art", nom: "Art", img: "histoire/reconstitution-pigments.webp", legende: "Reconstitution générée" },
];
const BANDE = ["Broderie", "Mariage", "Spectacle", "Culture", "Art", "Studio", "Bureau", "Le Point"];

/* ——— les couleurs réellement calculées par le navigateur : la valeur et le contraste sur le fond du thème ——— */
const rgb = (s: string) => (s.match(/[\d.]+/g) ?? []).map(Number);
const lum = (c: number[]) => { const f = (x: number) => { x /= 255; return x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
const ratio = (a: number[], b: number[]) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
const hex = (c: number[]) => "#" + c.slice(0, 3).map(v => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();

function Nuancier() {
  const hote = useRef<HTMLDivElement>(null), [m, setM] = useState<Record<string, { hex: string; r: number }>>({});
  useEffect(() => {
    const el = hote.current; if (!el) return;
    const mesurer = () => {
      const cs = getComputedStyle(el), tmp = document.createElement("span"); el.appendChild(tmp);
      const lire = (v: string) => { tmp.style.color = v; return rgb(getComputedStyle(tmp).color); };
      const F = lire(cs.getPropertyValue("--aime-fond").trim()), out: typeof m = {};
      for (const [k] of TOKENS) { const c = lire(cs.getPropertyValue("--aime-" + k).trim()); out[k] = { hex: hex(c), r: ratio(c, F) }; }
      tmp.remove(); setM(out);
    };
    mesurer(); const o = new MutationObserver(mesurer); o.observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ["data-aime"] });
    return () => o.disconnect();
  }, []);
  return <div ref={hote} className="ea-nuancier">{TOKENS.map(([k, nom]) => <div key={k} className="ea-teinte">
    <span className="ea-pastille" style={{ background: `var(--aime-${k})` }} aria-hidden="true" />
    <p><b>{nom}</b><br /><code>{m[k]?.hex ?? ""}</code><br /><span className="ea-ratio">{m[k] ? (/^(fond|surface)/.test(k) ? "—" : m[k].r.toFixed(1) + ":1") : ""}</span></p>
  </div>)}</div>;
}

function EnteteSection({ sur, titre, chapo, lien }: { sur: string; titre: React.ReactNode; chapo: string; lien?: [string, string] }) {
  return <div className="aime-entete-section">
    <div><p className="aime-sur">{sur}</p><h2 className="aime-titre ea-titre-section">{titre}</h2></div>
    <p className="aime-chapo">{chapo}</p>
    {lien ? <a className="aime-lien-fleche" href={lien[1]}>{lien[0]} <span aria-hidden="true">→</span></a> : <span />}
  </div>;
}

/* ——— le calendrier : un mois, un jour choisi, un programme ——— */
const JOURS = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"], NOMS_JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
function Calendrier({ id, programme, initial = 8, marque }: { id: string; programme: [string, string][]; initial?: number; marque?: number }) {
  const [mois, setMois] = useState(9), [jour, setJour] = useState(initial), annee = 2026;
  const semaines = useMemo(() => {
    const decal = (new Date(annee, mois, 1).getDay() + 6) % 7, n = new Date(annee, mois + 1, 0).getDate(), cases: (number | null)[] = [...Array(decal).fill(null), ...Array.from({ length: n }, (_, i) => i + 1)];
    while (cases.length % 7) cases.push(null);
    return Array.from({ length: cases.length / 7 }, (_, i) => cases.slice(i * 7, i * 7 + 7));
  }, [mois]);
  const changer = (d: number) => { setMois(x => Math.min(11, Math.max(0, x + d))); setJour(1); };
  return <div className="aime-calendrier">
    <div className="aime-calendrier-tete"><h3 id={id}>{MOIS[mois]} {annee}</h3>
      <div><button type="button" onClick={() => changer(-1)} aria-label="Mois précédent">‹</button><button type="button" onClick={() => changer(1)} aria-label="Mois suivant">›</button></div></div>
    <table aria-labelledby={id}><thead><tr>{JOURS.map((j, i) => <th key={j} scope="col"><abbr title={NOMS_JOURS[i]}>{j}</abbr></th>)}</tr></thead>
      <tbody>{semaines.map((s, i) => <tr key={i}>{s.map((d, k) => <td key={k}>{d && <button type="button" aria-pressed={d === jour} className={mois === 9 && d === marque ? "aime-jour-marque" : undefined}
        aria-label={`${NOMS_JOURS[k]} ${d} ${MOIS[mois].toLowerCase()}${mois === 9 && d === marque ? ", aujourd’hui" : ""}`} onClick={() => setJour(d)}>{d}</button>}</td>)}</tr>)}</tbody></table>
    {programme.length > 0 && <ul className="aime-agenda" aria-label={`Programme du ${jour} ${MOIS[mois].toLowerCase()}`}>{programme.map(([h, t]) => <li key={h}><time>{h}</time><b>{t}</b></li>)}</ul>}
  </div>;
}

function Segment({ choix, sombre, etiquette }: { choix: string[]; sombre?: boolean; etiquette: string }) {
  const [v, setV] = useState(choix[sombre ? 0 : 1]);
  return <div className={"aime-segment" + (sombre ? " aime-segment--sombre" : "")} role="group" aria-label={etiquette}>
    {choix.map(c => <button key={c} type="button" aria-pressed={v === c} onClick={() => setV(c)}>{c}</button>)}</div>;
}
function Interrupteur({ nom, initial }: { nom: string; initial: boolean }) {
  const [on, setOn] = useState(initial);
  return <button type="button" role="switch" aria-checked={on} className="aime-interrupteur" onClick={() => setOn(!on)}><span className="aime-interrupteur-rail" aria-hidden="true" />{nom}</button>;
}

function Composants({ compact }: { compact?: boolean }) {
  const [onglet, setOnglet] = useState("Aperçu");
  return <div className={"ea-composants" + (compact ? " ea-composants--compact" : "")}>
    <div className="aime-carte ea-bloc"><p className="ea-bloc-titre">Boutons</p>
      <div className="ea-ligne">
        <button type="button" className="aime-btn aime-btn--primaire">Commencer <span className="aime-btn-fleche" aria-hidden="true">→</span></button>
        <button type="button" className="aime-btn aime-btn--secondaire">Voir la démo</button>
        <button type="button" className="aime-btn aime-btn--contour">Réserver</button>
        <button type="button" className="aime-btn aime-btn--primaire" disabled>Désactivé</button>
        <button type="button" className="aime-btn aime-btn--danger aime-btn--petit">Supprimer</button>
      </div></div>
    <div className="aime-carte ea-bloc"><p className="ea-bloc-titre">Navigation et réglages</p>
      <nav className="aime-nav" aria-label="Exemple de navigation"><a href="#socle" aria-current="page">Accueil</a><a href="#composants">Studio</a><a href="#bento">Bureau</a><a href="#univers">Réseau</a></nav>
      <div className="aime-onglets" role="group" aria-label="Exemple d’onglets">{["Aperçu", "Inspecteur", "Historique"].map(o => <button key={o} type="button" aria-pressed={onglet === o} onClick={() => setOnglet(o)}>{o}</button>)}</div>
      <Segment choix={["Fils", "Patron", "Rendu"]} etiquette="Affichage" />
      <div className="ea-ligne"><Interrupteur nom="Symboles" initial /><Interrupteur nom="Grille" initial={false} /></div>
      <div className="ea-ligne"><span className="aime-etat aime-etat--ok">En direct</span><span className="aime-etat aime-etat--erreur">Refusé</span><span className="aime-etat">Brouillon</span></div>
    </div>
    <div className="aime-carte ea-bloc"><p className="ea-bloc-titre">Champs</p>
      <div className="aime-champ"><label htmlFor={`ea-c1${compact ? "b" : ""}`}>Titre</label><input id={`ea-c1${compact ? "b" : ""}`} defaultValue="Garance & indigo" /><span className="aime-aide">16 / 140</span></div>
      <div className="aime-champ"><label htmlFor={`ea-c2${compact ? "b" : ""}`}>Lien</label><input id={`ea-c2${compact ? "b" : ""}`} defaultValue="javascript:alert(1)" aria-invalid="true" aria-describedby={`ea-c2e${compact ? "b" : ""}`} /><span className="aime-erreur" id={`ea-c2e${compact ? "b" : ""}`}>Lien https attendu</span></div>
      <div className="aime-champ"><label htmlFor={`ea-c3${compact ? "b" : ""}`}>Identifiant</label><input id={`ea-c3${compact ? "b" : ""}`} defaultValue="Non modifiable" disabled /></div>
      <label className="aime-case"><input type="checkbox" defaultChecked /> Reconstitution générée</label>
    </div>
    <div className="aime-verre ea-bloc"><p className="ea-bloc-titre">Panneau flottant (verre)</p>
      <p className="ea-verre-titre">Version 9 · Publiée</p><p className="aime-chapo">Une version n’est jamais modifiée ni effacée. Restaurer republie une copie.</p>
      <div className="ea-ligne"><button type="button" className="aime-btn aime-btn--primaire aime-btn--petit">Publier</button><button type="button" className="aime-btn aime-btn--secondaire aime-btn--petit">Historique</button></div>
    </div>
  </div>;
}

/* ——— le disque radial réel (le même Point que la landing), avec des commandes de démonstration ——— */
function LeDisque() {
  const [dernier, setDernier] = useState("");
  const modes = useMemo<ModePoint[]>(() => {
    const m = (id: string, nom: string, aide: string, icone: React.ReactNode): ModePoint => ({ id, nom, aide, groupe: "socle", icone, ouvrir: () => setDernier(nom) });
    return [m("ouvrages", "Mes ouvrages", "Ouvrir la bibliothèque", <FolderOpen size={18} />), m("visite", "Visite", "Faire la visite guidée", <Compass size={18} />),
      m("creer", "Créer", "Commencer un motif", <PenLine size={18} />), m("broder", "Broder", "Passer en lecture de broderie", <Scissors size={18} />),
      m("fils", "Fils DMC", "Ouvrir le nuancier", <Palette size={18} />), m("importer", "Importer", "Importer une image ou un patron", <FileUp size={18} />)];
  }, []);
  return <div className="ea-disque">
    <Disque contexte="essai-aime" modes={modes} etiquette="Le Point : le disque radial, démonstration" max={1.3} />
    <p className="ea-disque-statut" role="status" aria-live="polite">{dernier ? `Choisi : ${dernier} (démonstration, aucune action)` : "Touchez un secteur, ou Tab puis les flèches et Entrée."}</p>
  </div>;
}

function Colonne({ theme }: { theme: Theme }) {
  return <section data-aime={theme} className="ea-colonne aime-scene" aria-label={theme === "jour" ? "Mode Jour" : "Mode Nuit"}>
    <p className="ea-colonne-titre"><span className="aime-point" aria-hidden="true" />Mode {theme === "jour" ? "Jour" : "Nuit"}</p>
    <div className="ea-colonne-grille">
      <Calendrier id={`ea-cal-${theme}`} initial={theme === "jour" ? 8 : 14} marque={29} programme={theme === "jour" ? [["8 h", "Préparatifs"], ["10 h", "Trajet vers le lieu"], ["10 h 30", "Cérémonie"]] : [["20 h 30", "Balance son"], ["21 h", "Entrée des artistes"]]} />
      <Composants compact />
    </div>
  </section>;
}

/* ——— le méga-menu : trois choix qui se déplient (cartes, journal, projets avec aperçu) ——— */
const PROJETS = [
  { nom: "Point Zéro", sous: "Broderie et patrons", img: "hero-ipad-broderie.jpg" },
  { nom: "L’histoire", sous: "Le textile, de l’Inde à nous", img: "histoire/reconstitution-port.webp" },
  { nom: "Le nuancier", sous: "489 fils DMC, un seul geste", img: "landing/ecran-nuancier.webp" },
  { nom: "Le Bureau", sous: "Les contenus du site", img: "ecrans/atelier-ordinateur.webp" },
];
function MegaMenu() {
  const [ouvert, setOuvert] = useState<string | null>(null), [projet, setProjet] = useState(0), hote = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ouvert) return;
    const clavier = (e: KeyboardEvent) => { if (e.key === "Escape") { setOuvert(null); hote.current?.querySelector<HTMLButtonElement>(`[data-menu="${ouvert}"]`)?.focus(); } };
    const dehors = (e: PointerEvent) => { if (!hote.current?.contains(e.target as Node)) setOuvert(null); };
    document.addEventListener("keydown", clavier); document.addEventListener("pointerdown", dehors);
    return () => { document.removeEventListener("keydown", clavier); document.removeEventListener("pointerdown", dehors); };
  }, [ouvert]);
  const choix = (id: string, nom: string) => <button type="button" data-menu={id} aria-expanded={ouvert === id} aria-controls={`ea-menu-${id}`} onClick={() => setOuvert(o => o === id ? null : id)}>{nom}<ChevronDown size={15} aria-hidden="true" /></button>;
  return <div className="aime-menu" ref={hote}>
    <nav className="aime-menu-barre" aria-label="Navigation principale (exemple)">{choix("projets", "Projets")}{choix("univers", "Univers")}{choix("journal", "Journal")}<a className="aime-menu-contact" href="#cote">Contact</a></nav>
    {ouvert === "univers" && <div className="aime-menu-panneau" id="ea-menu-univers"><div className="aime-menu-cartes">
      <a href="#univers"><img src={IMG + "histoire/met-palampore-2010-337.webp"} alt="" /><b>Broderie</b><small>Les fils et les patrons</small></a>
      <a href="#univers"><img src={IMG + "histoire/reconstitution-atelier.webp"} alt="" /><b>Savoir-faire</b><small>Les gestes de l’atelier</small></a>
      <a href="#univers"><img src={IMG + "histoire/met-reserve-bleue-40-128.webp"} alt="" /><b>Culture</b><small>Les pièces des musées</small></a></div></div>}
    {ouvert === "journal" && <div className="aime-menu-panneau ea-menu-etroit" id="ea-menu-journal">
      <div className="aime-menu-tete"><p>Dernières entrées</p><a href="#point">Tout le journal <ArrowUpRight size={13} aria-hidden="true" /></a></div>
      <ul className="aime-menu-liste">{[["histoire/met-palampore-2010-337.webp", "Le palampore", "Un jardin peint pour Ceylan"], ["histoire/met-reserve-bleue-40-128.webp", "La réserve bleue", "L’indigo qui protège le dessin"], ["histoire/reconstitution-pigments.webp", "Les pigments", "Garance, indigo et gaude"]].map(([i, t, d]) =>
        <li key={t}><a href="#point"><img src={IMG + i} alt="" /><span><b>{t}</b><small>{d}</small></span></a></li>)}</ul></div>}
    {ouvert === "projets" && <div className="aime-menu-panneau ea-menu-large" id="ea-menu-projets"><div className="aime-menu-projets">
      <ul>{PROJETS.map((p, i) => <li key={p.nom}><button type="button" aria-current={projet === i} onClick={() => setProjet(i)} onPointerEnter={() => setProjet(i)} onFocus={() => setProjet(i)}><b>{p.nom}</b><small>{p.sous}</small><ArrowRight size={18} aria-hidden="true" /></button></li>)}</ul>
      <div className="aime-menu-apercu"><img src={IMG + PROJETS[projet].img} alt={`Aperçu : ${PROJETS[projet].nom}`} /><span className="aime-rond-fleche" aria-hidden="true"><ArrowUpRight size={18} /></span>
        <span className="aime-compteur" aria-live="polite">{String(projet + 1).padStart(2, "0")} / {String(PROJETS.length).padStart(2, "0")}</span></div></div></div>}
  </div>;
}

/* ——— la une : un grand visuel sobre, un grand titre blanc, de l'air ——— */
function LaUne() {
  return <section className="ea-une" data-aime="nuit" aria-labelledby="ea-une-titre">
    <div className="ea-une-visuel" aria-hidden="true">
      <img className="ea-une-image" src={IMG + "une/mariee-cosmos.webp"} alt="" />
    </div>
    <div className="ea-une-haut">
      <p className="ea-marque ea-marque-photo"><span className="aime-point" aria-hidden="true" />AIME<sup>®</sup></p>
      <MegaMenu />
      <span />
    </div>
    <div className="ea-une-bas">
      <h1 id="ea-une-titre" className="ea-une-titre">Un socle,<br />tous les univers.</h1>
      <div className="ea-une-cote">
        <p>Une interface sobre, en Jour et en Nuit. Les images, les matières et les couleurs appartiennent à chaque univers.</p>
        <div className="ea-ligne"><a className="aime-btn ea-blanc" href="#point">Commencer <span aria-hidden="true">→</span></a><a className="aime-btn aime-btn--contour ea-contour-photo" href="#composants">Les composants</a></div>
      </div>
    </div>
    <p className="ea-une-legende">Visuel fourni par Matt</p>
  </section>;
}

/* ——— le panneau d'outil : régler une image (local, l'image choisie ne quitte pas l'appareil) ——— */
function OutilImage() {
  const fichier = useRef<HTMLInputElement>(null);
  const [o, setO] = useState({ luminosite: 100, contraste: 100, saturation: 100 }), [cadrage, setCadrage] = useState("centre"), [src, setSrc] = useState(IMG + "une/mariee-cosmos.webp");
  useEffect(() => () => { if (src.startsWith("blob:")) URL.revokeObjectURL(src); }, [src]);
  const nombre = (k: keyof typeof o, nom: string, min: number, max: number) => <div className="aime-reglage">
    <label htmlFor={`ea-o-${k}`}>{nom}</label>
    <div className="aime-reglage-valeur"><input id={`ea-o-${k}`} type="number" min={min} max={max} value={o[k]} onChange={e => setO({ ...o, [k]: Math.min(max, Math.max(min, Number(e.target.value) || min)) })} />
      <input type="range" min={min} max={max} value={o[k]} aria-label={nom} onChange={e => setO({ ...o, [k]: Number(e.target.value) })} /></div></div>;
  const pos = { haut: "50% 15%", centre: "50% 50%", bas: "50% 85%" }[cadrage];
  return <section className="aime-outil" aria-labelledby="ea-outil-titre">
    <div className="aime-outil-tete"><span className="aime-outil-icone" aria-hidden="true"><SlidersHorizontal size={17} /></span><h3 id="ea-outil-titre">Image</h3></div>
    <div className="aime-outil-apercu"><img src={src} alt="Aperçu de l’image réglée" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: pos, filter: `brightness(${o.luminosite}%) contrast(${o.contraste}%) saturate(${o.saturation}%)` }} /></div>
    <div className="aime-reglage"><label htmlFor="ea-o-cadrage">Cadrage</label><select id="ea-o-cadrage" value={cadrage} onChange={e => setCadrage(e.target.value)}>
      <option value="haut">Haut</option><option value="centre">Centre</option><option value="bas">Bas</option></select></div>
    {nombre("luminosite", "Luminosité", 50, 150)}{nombre("contraste", "Contraste", 50, 150)}{nombre("saturation", "Saturation", 0, 200)}
    <input ref={fichier} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) setSrc(URL.createObjectURL(f)); }} />
    <button type="button" className="aime-btn aime-btn--plein" onClick={() => fichier.current?.click()}>Ajouter une image</button>
    <p className="ea-note">L’image reste sur votre appareil.</p>
  </section>;
}

/* ——— le menu mobile, en Jour et en Nuit : Fermer, le thème, l'heure ——— */
function MenuMobile({ theme, basculer }: { theme: Theme; basculer: () => void }) {
  const [heure, setHeure] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setHeure(new Date()), 15000); return () => clearInterval(t); }, []);
  const h = heure.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return <div data-aime={theme} className="aime-menu-mobile">
    <div className="aime-menu-mobile-barre"><button type="button"><X size={18} aria-hidden="true" />Fermer</button>
      <button type="button" className="aime-rond" onClick={basculer} aria-label={theme === "nuit" ? "Passer en Jour" : "Passer en Nuit"}>{theme === "nuit" ? <Moon size={18} /> : <Sun size={18} />}</button>
      <time dateTime={heure.toISOString()}>{h}</time></div>
    <nav aria-label={`Menu mobile, ${theme === "nuit" ? "Nuit" : "Jour"} (exemple)`}>
      <p>Menu</p>{["L’atelier", "Les univers", "Le journal", "Le Bureau"].map(l => <a key={l} className="aime-grand" href="#socle">{l}</a>)}
      <hr /><p>Mentions</p><a href="#socle">Confidentialité</a><a href="#socle">Conditions d’utilisation</a>
      <p>Réseaux</p><a href="#socle">Instagram · YouTube</a>
    </nav>
  </div>;
}

export default function EssaiAime() {
  const { choix, theme, choisir } = useTheme();
  useEffect(() => { document.title = "Essai · socle visuel AIME"; }, []);
  return <div data-aime={theme} className="ea aime-scene">
    <span className="aime-perle ea-perle ea-perle-1" aria-hidden="true" /><span className="aime-perle ea-perle ea-perle-2" aria-hidden="true" /><span className="aime-perle ea-perle ea-perle-3" aria-hidden="true" />
    <LaUne />

    {/* 1 · le cadre : la photographie dans un bord blanc arrondi, sur un fond flouté */}
    <section id="socle" className="ea-hero" aria-label="Le cadre">
      <div className="aime-scene-flou" aria-hidden="true"><img src={IMG + "histoire/met-palampore-2010-337.webp"} alt="" /></div>
      <div className="aime-cadre ea-hero-cadre">
        <div className="aime-cadre-media ea-hero-media">
          <img src={IMG + "histoire/reconstitution-ouvrages.webp"} alt="Des ouvrages brodés ouverts et des écheveaux (reconstitution générée)" />
          <div className="aime-sur-photo">
            <div className="ea-hero-haut"><p className="ea-marque ea-marque-photo"><span className="aime-point" aria-hidden="true" />AIME<sup>®</sup></p>
              <nav className="aime-nav aime-nav--blanche" aria-label="Exemple sur photographie"><a href="#composants">Studio</a><a href="#univers">Univers</a><a href="#bento">Bureau</a><a href="#socle">Contact</a></nav></div>
            <div className="ea-hero-texte">
              <h2 className="aime-titre aime-titre--capitales">Le cadre,<br />pour un média.</h2>
              <p className="aime-chapo">Une interface neutre, en Jour et en Nuit. Les couleurs, les textures et les photographies appartiennent au contenu de chaque univers.</p>
              <div className="ea-ligne"><a className="aime-btn ea-blanc" href="#composants">Voir les composants <span aria-hidden="true">→</span></a><a className="aime-btn aime-btn--contour ea-contour-photo" href="#cote">Jour et Nuit</a></div>
            </div>
            <div className="ea-hero-bas">
              <p className="ea-legende-photo">Reconstitution générée, contenu éditorial de l’univers Broderie.</p>
              <div className="aime-verre ea-temoin"><span className="aime-point" aria-hidden="true" /><p><b>Le Point</b><br />La même sphère nacrée, dans tous les univers.</p></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* 2 · le titre qui s'estompe, et l'atelier dans un écran incliné */}
    <section className="ea-section ea-duo">
      <div className="ea-duo-texte">
        <span className="aime-puce"><span className="aime-point" aria-hidden="true" />Design system AIME · Jour et Nuit</span>
        <h2 className="aime-titre">Une seule interface, <span className="aime-fondu">pour tous les métiers et toutes les formes.</span></h2>
        <p className="aime-chapo">Noir doux, anthracite, blanc et gris très clair. Des titres moyens, des boutons pilules, des panneaux de verre, des médias posés dans un cadre.</p>
        <div className="ea-ligne"><a className="aime-btn aime-btn--primaire" href="#point">Explorer <span className="aime-btn-fleche" aria-hidden="true">→</span></a><a className="aime-btn aime-btn--secondaire" href="#univers">Les univers</a></div>
      </div>
      <div className="aime-scene-3d ea-duo-media">
        <div className="aime-cadre aime-cadre--sombre aime-ecran-incline"><div className="aime-cadre-media ea-ecran"><img src={IMG + "ecrans/atelier-ordinateur.webp"} alt="L’atelier Point Zéro sur ordinateur (capture)" /></div></div>
        <span className="aime-perle ea-perle-ecran" aria-hidden="true" />
      </div>
    </section>

    <section className="ea-section ea-phrase-section" aria-label="Sobre par nature">
      <p className="aime-phrase"><span>Sobre.</span><span>Par nature.</span></p>
      <p className="aime-chapo">Pensé pour l’atelier : de grandes zones à toucher, des choix lisibles de loin, rien qui ne serve pas.</p>
    </section>

    {/* 3 · la bande défilante */}
    <div className="aime-bandes ea-bandes" aria-hidden="true">
      {(["claire", "sombre"] as const).map(b => <div key={b} className={`aime-bande aime-bande--${b}`}><div className="aime-bande-piste">{[...BANDE, ...BANDE, ...BANDE, ...BANDE].map((t, i) => <span key={i}>{t}</span>)}</div></div>)}
    </div>

    {/* 4 · le Point : le disque radial réel */}
    <section id="point" className="ea-section ea-point">
      <div className="ea-point-texte">
        <p className="aime-sur">01 · Le Point</p>
        <h2 className="aime-titre ea-titre-mele"><span className="aime-leger">Tout part</span><br /><span className="aime-fort">d’un point.</span></h2>
        <ol className="ea-etapes"><li aria-current="step">Un point.</li><li>Un seul centre, et autour, tout l’atelier.</li><li>Choisissez : le disque devient l’outil.</li></ol>
        <div className="aime-sceau" aria-hidden="true"><svg viewBox="0 0 132 132"><defs><path id="ea-cercle" d="M66,66 m-52,0 a52,52 0 1,1 104,0 a52,52 0 1,1 -104,0" /></defs>
          <text><textPath href="#ea-cercle">Le Point · AIME · un seul geste · </textPath></text></svg><span className="aime-point" /></div>
      </div>
      <LeDisque />
    </section>

    <section className="ea-section">
      <EnteteSection sur="Tokens sémantiques" titre={<>Une base claire,<br />stable et accessible.</>} chapo="Des couleurs sémantiques, un contraste mesuré dans la page, sur le fond du thème affiché." lien={["Jour et Nuit", "#cote"]} />
      <Nuancier />
    </section>

    <section id="composants" className="ea-section">
      <EnteteSection sur="Composants" titre={<>Des éléments sobres,<br />pour composer librement.</>} chapo="Les mêmes boutons, réglages et champs partout : le Studio, le Bureau, la Carte, les docks." />
      <div className="ea-agenda">
        <Calendrier id="ea-cal" initial={8} marque={29} programme={[["8 h", "Préparatifs"], ["10 h", "Trajet vers le lieu"], ["10 h 30", "Cérémonie"]]} />
        <div data-aime="nuit" className="ea-relief">
          <p className="ea-bloc-titre">En relief, sur fond sombre</p>
          <Segment choix={["Atelier", "Bibliothèque", "Boutique"]} etiquette="Espace" />
          <Segment choix={["Patron", "Toile"]} sombre etiquette="Vue" />
          <div className="ea-ligne"><Interrupteur nom="Loupe" initial /><Interrupteur nom="Son" initial={false} /></div>
        </div>
      </div>
      <Composants />
    </section>

    {/* 5 · le bento sombre : chiffres, anneau, barres, éclats d'univers */}
    <section id="bento" data-aime="nuit" className="ea-bento-hote aime-scene">
      <div className="ea-section">
        <EnteteSection sur="Le Bureau en chiffres" titre={<><span className="aime-leger">Des tuiles</span> pour raconter,<br /><span className="aime-fondu">pas des tableaux.</span></>} chapo="Les tuiles sombres portent un chiffre, une progression, une citation. Une tuile d’éclat prend la couleur de son univers." />
        <div className="ea-bento">
          <article className="aime-tuile ea-t-anneau"><div className="aime-anneau" style={{ ["--p" as string]: 80 }}><b>4/5</b></div><p className="aime-tuile-sur">Rencontres déjà faites dans votre parcours</p></article>
          <article className="aime-tuile ea-t-barres"><p className="aime-tuile-titre">Huit fois<br />le même geste</p><p className="aime-tuile-sur">Symétries d’une rosace, du point à la composition</p>
            <ul className="aime-barres" aria-label="Points posés à chaque étape">{[["1", 8], ["2", 22], ["4", 38], ["8", 58], ["16", 78], ["32", 100]].map(([n, h]) => <li key={n} style={{ ["--h" as string]: h + "%" }}><span />{n}</li>)}</ul></article>
          <article data-aime-univers="spectacle" className="aime-tuile aime-tuile--eclat ea-t-eclat"><p className="aime-tuile-sur">Univers Spectacle</p><p className="aime-tuile-titre">Une scène,<br />une affiche,<br />un programme.</p>
            <div className="aime-telephone ea-mini-tel"><div className="aime-telephone-ecran ea-mini-ecran"><img src={IMG + "ecrans/atelier-iphone-fils.webp"} alt="L’atelier sur téléphone : le nuancier des fils (capture)" /></div></div></article>
          <article data-aime-univers="broderie" className="aime-tuile ea-t-chiffre"><p className="aime-tuile-sur">Le nuancier</p><p className="aime-chiffre aime-chiffre--eclat">489</p><p className="aime-tuile-sur">fils DMC, un seul geste</p></article>
          <article data-aime-univers="art" className="aime-tuile aime-tuile--eclat ea-t-phrase"><p className="aime-tuile-titre">Une phrase de deux lignes pour une fonction clé.</p></article>
          <article className="aime-tuile ea-t-citation"><span className="aime-etoiles" aria-label="Cinq étoiles sur cinq">★★★★★</span><p className="aime-citation">Gabarit de témoignage : le texte réel d’un client viendra ici.</p><p className="aime-tuile-sur">Nom, rôle · exemple</p></article>
        </div>
      </div>
    </section>

    <section id="panneaux" className="ea-section">
      <EnteteSection sur="Panneaux et menus" titre={<>Des outils posés,<br /><span className="aime-fondu">des menus qui respirent.</span></>} chapo="Le panneau Image est un vrai outil : choisissez une image et réglez-la, sans qu’elle quitte votre appareil." />
      <div className="ea-panneaux">
        <div className="ea-panneaux-outil" data-aime="nuit"><OutilImage /></div>
        <div className="ea-panneaux-menus">{(["nuit", "jour"] as Theme[]).map(t => <MenuMobile key={t} theme={t} basculer={() => choisir(theme === "nuit" ? "jour" : "nuit")} />)}</div>
      </div>
    </section>

    <section id="univers" className="ea-section">
      <EnteteSection sur="Univers" titre={<>Une ambiance éditoriale,<br />la même interface.</>} chapo="La couleur d’un univers colore son contenu (photographies, illustrations, liserés). Les boutons, les textes et les champs restent ceux du socle." />
      <div className="ea-univers">{UNIVERS.map(u => <article key={u.id} data-aime-univers={u.id} className="aime-carte ea-univers-carte">
        <div className="ea-univers-media">{u.img ? <img src={IMG + u.img} alt="" /> : <div className="ea-univers-eclat" />}<span className="ea-univers-legende">{u.legende}</span></div>
        <div className="ea-univers-corps"><p className="ea-univers-sur">{u.id}</p><h3 className="ea-univers-nom">{u.nom}</h3>
          <button type="button" className="aime-btn aime-btn--contour aime-btn--petit">Ouvrir <span aria-hidden="true">→</span></button></div>
      </article>)}</div>
    </section>

    <section id="cote" className="ea-section">
      <EnteteSection sur="Jour et Nuit" titre={<>Le même système,<br /><span className="aime-fondu">deux atmosphères.</span></>} chapo="Une interface qui suit l’environnement : les mêmes composants, la même logique, en clair et en sombre." />
      <div className="ea-cote">{(["jour", "nuit"] as Theme[]).map(t => <Colonne key={t} theme={t} />)}</div>
    </section>

    <section className="ea-section ea-mobile">
      <div>
        <p className="aime-sur">Sur tous les écrans</p>
        <h2 className="aime-titre ea-titre-section"><span className="aime-leger">Une expérience cohérente,</span><br /><span className="aime-fort">du bureau au téléphone.</span></h2>
        <p className="aime-chapo">La même interface, la même logique, optimisée pour chaque format.</p>
      </div>
      <div className="ea-mobile-tel">
        <span className="aime-perle ea-perle-tel" aria-hidden="true" />
        <div className="aime-telephone"><div className="aime-telephone-ecran"><img src={IMG + "ecrans/atelier-iphone-fils.webp"} alt="L’atelier sur téléphone (capture)" /></div></div>
      </div>
      <ul className="ea-atouts">
        <li><Smartphone size={18} aria-hidden="true" />Interface adaptative</li>
        <li><Monitor size={18} aria-hidden="true" />Composants cohérents</li>
        <li><SunMoon size={18} aria-hidden="true" />Parité Jour et Nuit</li>
      </ul>
    </section>

    <footer className="ea-pied">
      <p className="ea-marque"><span className="aime-point" aria-hidden="true" />AIME<sup>®</sup> <span>Socle visuel</span></p>
      <div className="aime-segment ea-theme ea-theme-pied" role="group" aria-label="Thème de cet essai">{CHOIX_THEMES.map(c => <button key={c.id} type="button" aria-pressed={choix === c.id} onClick={() => choisir(c.id)}>{c.nom}</button>)}</div>
      <p className="ea-pied-mentions">Essai privé. Police : Inter Tight (SIL OFL), auto-hébergée. Photographies : The Met (domaine public), reconstitutions générées annoncées, captures de l’atelier.</p>
    </footer>
  </div>;
}
