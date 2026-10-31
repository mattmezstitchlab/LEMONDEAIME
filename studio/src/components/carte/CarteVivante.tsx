/**
 * La carte vivante : une même carte, plusieurs formes (ronde, carrée, verticale), et sa page en pleine largeur,
 * dépliée sur place : pas de navigation, les mêmes données, les mêmes interactions (média affiché, face, créneau choisi).
 *
 * Accessibilité :
 * - Retourner : un bouton ; la face cachée est inerte (ni focus ni lecteur d'écran) ; le focus passe au titre de la face montrée.
 * - Carrousel : boutons Précédent et Suivant, points numérotés, flèches du clavier, glisser au doigt ; jamais de défilement automatique.
 * - Aucune action n'est envoyée : c'est une démonstration, et la carte le dit.
 * - Mouvement réduit : la carte change de face sans rotation.
 */
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { ACTIONS, actionsPour, disposition, modulesVisibles, NOMS_MODULES, type Carte, type Format, type IdAction, type Media, type Role, type TypeModule } from "../../lib/carte/carte";
import "./CarteVivante.css";

type Face = "recto" | "verso";
/* en page : ce qui accompagne le média, en haut à droite ; le reste se range dessous */
const HAUT: TypeModule[] = ["identite", "description", "prestations", "localisation"];

/* ——— Le carrousel des médias ——— */
function Carrousel({ medias, index, onIndex, nom, grand }: { medias: Media[]; index: number; onIndex: (k: number) => void; nom: string; grand?: boolean }) {
  const n = medias.length, m = medias[index % n], depart = useRef<number | null>(null);
  const aller = (k: number) => onIndex(((k % n) + n) % n);
  const touche = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") { e.preventDefault(); aller(index + 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); aller(index - 1); }
  };
  const bas = (e: PointerEvent) => { depart.current = e.clientX; };
  const haut = (e: PointerEvent) => { if (depart.current === null) return; const dx = e.clientX - depart.current; depart.current = null; if (Math.abs(dx) > 40) aller(index + (dx < 0 ? 1 : -1)); };
  if (!m) return null;
  return <div className={"cv-carrousel" + (grand ? " cv-carrousel-grand" : "")} role="region" aria-roledescription="carrousel" aria-label={`Médias de ${nom}`} tabIndex={0} onKeyDown={touche} onPointerDown={bas} onPointerUp={haut}>
    <figure className="cv-diapo" role="group" aria-roledescription="diapositive" aria-label={`${index + 1} sur ${n}`}>
      {m.genre === "video"
        ? <video className="cv-media" src={m.src} poster={m.affiche} controls preload="none" aria-label={m.alt} />
        : <img className="cv-media" src={m.src} alt={m.alt} draggable={false} decoding="async" />}
      <figcaption className="cv-credit">{m.credit}</figcaption>
    </figure>
    {n > 1 && <>
      <button type="button" className="cv-fleche cv-fleche-g" onClick={() => aller(index - 1)} aria-label="Média précédent">‹</button>
      <button type="button" className="cv-fleche cv-fleche-d" onClick={() => aller(index + 1)} aria-label="Média suivant">›</button>
      <div className="cv-points">{medias.map((x, k) => <button key={k} type="button" className="cv-point" aria-label={`Média ${k + 1} : ${x.alt}`} aria-current={k === index ? "true" : undefined} onClick={() => aller(k)} />)}</div>
    </>}
    <p className="cv-cache" aria-live="polite">{`Média ${index + 1} sur ${n} : ${m.alt}`}</p>
  </div>;
}

/* ——— Les modules : la même donnée, en version compacte (une face) ou pleine (la page) ——— */
interface Ctx { carte: Carte; role: Role; plein: boolean; media: number; setMedia: (k: number) => void; creneau: string | null; setCreneau: (c: string | null) => void; agir: (a: IdAction) => void; idNom?: string }
function Module({ t, x }: { t: TypeModule; x: Ctx }): ReactNode {
  const c = x.carte, H = x.plein ? "h3" : "h4";
  const titre = (s: string) => <H className="cv-mod-titre">{s}</H>;
  switch (t) {
    case "identite": return <div className="cv-identite">
      <p className="cv-surtitre">{c.fictive && <span className="cv-fictif">Exemple fictif</span>}</p>
      <h2 className="cv-nom" id={x.idNom} tabIndex={-1}>{c.identite.nom}</h2>
      <p className="cv-activite">{c.identite.activite}</p>
      {c.chiffres && <dl className="cv-chiffres">{c.chiffres.map(k => <div key={k.libelle}><dt>{k.libelle}</dt><dd>{k.valeur}</dd></div>)}</dl>}
    </div>;
    case "medias": return <Carrousel medias={c.medias} index={x.media} onIndex={x.setMedia} nom={c.identite.nom} grand={x.plein} />;
    case "description": return c.description ? <div className="cv-mod">{titre("Présentation")}<p className="cv-accroche">{c.description.titre}</p><p className="cv-texte">{c.description.texte}</p></div> : null;
    case "localisation": return c.localisation ? <div className="cv-mod cv-lieu">{x.plein && titre("Localisation")}<p><b>{c.localisation.ville}</b> · {c.localisation.zone}</p></div> : null;
    case "tarifs": return c.tarifs ? <div className="cv-mod">{titre("Tarifs")}<dl className="cv-tarifs">{c.tarifs.map(p => <div key={p.libelle}><dt>{p.libelle}</dt><dd>{p.prix}</dd></div>)}</dl></div> : null;
    case "prestations": return c.prestations ? <div className="cv-mod">{titre("Prestations")}<ul className="cv-liste">{(x.plein ? c.prestations : c.prestations.slice(0, 3)).map(p => <li key={p.nom}><b>{p.nom}</b>{x.plein && <> · {p.detail}</>}</li>)}</ul></div> : null;
    case "galerie": return c.galerie ? <div className="cv-mod">{titre("Galerie")}<ul className="cv-galerie">{c.galerie.map(g => <li key={g.src}><img src={g.src} alt={g.alt} loading="lazy" decoding="async" /></li>)}</ul></div> : null;
    case "contact": return c.contact ? <div className="cv-mod">{titre("Contact")}<ul className="cv-liste">{c.contact.map(k => <li key={k.canal}><b>{k.canal}</b> · {k.valeur}</li>)}</ul></div> : null;
    case "disponibilites": return c.disponibilites ? <div className="cv-mod">{titre("Disponibilités")}
      <div className="cv-creneaux" role="group" aria-label="Choisir un créneau">{c.disponibilites.flatMap(d => d.creneaux.map(h => { const k = `${d.jour} ${h}`;
        return <button key={k} type="button" className="cv-creneau" aria-pressed={x.creneau === k} onClick={() => x.setCreneau(x.creneau === k ? null : k)}>{d.jour.slice(0, 3)}. {h}</button>; }))}</div>
      {x.creneau && <p className="cv-choisi">Créneau choisi : {x.creneau}</p>}</div> : null;
    case "actions": { const as = actionsPour(c, x.role); return as.length ? <div className="cv-actions">{as.map(a =>
      <button key={a} type="button" className={"cv-action" + (a === as[0] ? " cv-action-1" : "")} onClick={() => x.agir(a)}>{ACTIONS[a].nom}</button>)}</div> : null; }
  }
}

export default function CarteVivante({ carte, role, format, onFormat, media: mediaImpose, onMedia, face: faceImposee, onFace, montrer }: { carte: Carte; role: Role; format: Format; onFormat: (f: Format) => void;
  /** facultatif : un contrôleur (le Disque) tient le média et la face ; sinon la carte les garde elle-même */
  media?: number; onMedia?: (k: number) => void; face?: Face; onFace?: (f: Face) => void;
  /** facultatif : montrer un module (la carte se tourne ou se déplie si besoin) ; n change à chaque demande */
  montrer?: { module: TypeModule; n: number } }) {
  const [mediaLocal, setMediaLocal] = useState(0), [faceLocale, setFaceLocale] = useState<Face>("recto"), [creneau, setCreneau] = useState<string | null>(null), [message, setMessage] = useState("");
  const media = mediaImpose ?? mediaLocal, face = faceImposee ?? faceLocale;
  const setMedia = (k: number) => { if (onMedia) onMedia(k); else setMediaLocal(k); };
  const setFace = (f: Face) => { if (onFace) onFace(f); else setFaceLocale(f); };
  const precedent = useRef<Exclude<Format, "page">>(format === "page" ? "verticale" : format);
  const racine = useRef<HTMLElement>(null), deplier = useRef<HTMLButtonElement>(null), retour = useRef<HTMLButtonElement>(null), dejaMonte = useRef(false);
  const id = useId(), idNom = id + "-nom", idVerso = id + "-verso";
  const visibles = useMemo(() => modulesVisibles(carte, role), [carte, role]);
  const { recto, verso, ailleurs } = disposition(format, visibles);
  if (format !== "page") precedent.current = format;

  /* le focus suit le geste : la face montrée, la page dépliée, la carte repliée */
  useEffect(() => {
    if (!dejaMonte.current) { dejaMonte.current = true; return; }
    const el = racine.current; if (!el) return;
    if (format === "page") el.querySelector<HTMLElement>(".cv-page .cv-nom")?.focus();
    else deplier.current?.focus();
  }, [format]);
  const retourner = () => {
    const f: Face = face === "recto" ? "verso" : "recto"; setFace(f);
    requestAnimationFrame(() => racine.current?.querySelector<HTMLElement>(f === "verso" ? `#${CSS.escape(idVerso)}` : ".cv-recto .cv-nom")?.focus());
  };
  /* montrer un module : sur la face où il est, ou dans la page s'il n'a pas de place dans cette forme ; puis le focus y va */
  useEffect(() => {
    if (!montrer) return;
    const t = montrer.module;
    if (format !== "page") {
      if (recto.includes(t)) setFace("recto");
      else if (verso.includes(t)) setFace("verso");
      else { onFormat("page"); }
    }
    const r = requestAnimationFrame(() => requestAnimationFrame(() => {
      const zone = racine.current?.querySelector<HTMLElement>(`${format === "page" || (!recto.includes(t) && !verso.includes(t)) ? ".cv-page" : recto.includes(t) ? ".cv-recto" : ".cv-verso"} [data-module="${t}"]`);
      if (!zone) return;
      zone.setAttribute("tabindex", "-1"); zone.focus({ preventScroll: true }); zone.scrollIntoView({ block: "nearest" });
      zone.classList.remove("cv-montre"); void zone.offsetWidth; zone.classList.add("cv-montre");
    }));
    return () => cancelAnimationFrame(r);
  }, [montrer?.n]); // eslint-disable-line react-hooks/exhaustive-deps
  const agir = (a: IdAction) => {
    if (a === "reserver" && !creneau) { setMessage("Choisissez d’abord un créneau."); return; }
    setMessage(`Démonstration : « ${ACTIONS[a].nom} »${a === "reserver" ? ` (${creneau})` : ""} n’envoie rien.`);
  };
  const x: Ctx = { carte, role, plein: format === "page", media, setMedia, creneau, setCreneau, agir };
  const rendre = (ts: TypeModule[], ctx: Ctx) => ts.map(t => <div key={t} className={"cv-zone cv-zone-" + t} data-module={t}><Module t={t} x={ctx} /></div>);

  return <article ref={racine} className={"cv cv-" + format} data-face={format === "page" ? "page" : face} aria-labelledby={idNom}
    onKeyDown={e => { if (e.key === "Escape" && format === "page") { e.stopPropagation(); onFormat(precedent.current); } }}>
    {format === "page"
      ? <div className="cv-page">
          <div className="cv-page-tete"><button ref={retour} type="button" className="cv-btn" onClick={() => onFormat(precedent.current)}><span aria-hidden="true" className="cv-btn-signe">↙</span> Réduire la carte</button></div>
          <div className="cv-page-corps">
            <div className="cv-page-media">{rendre(recto.filter(t => t === "medias"), x)}</div>
            <div className="cv-page-modules">{rendre(recto.filter(t => HAUT.includes(t)), { ...x, idNom })}</div>
          </div>
          {/* le reste, dans l'ordre du métier : en colonnes, puis la galerie en bandeau, puis les actions */}
          <div className="cv-page-bas">{rendre(recto.filter(t => t !== "medias" && !HAUT.includes(t) && t !== "galerie" && t !== "actions"), x)}</div>
          {recto.includes("galerie") && <div className="cv-page-galerie">{rendre(["galerie"], x)}</div>}
          {recto.includes("actions") && <div className="cv-page-fin">{rendre(["actions"], x)}</div>}
        </div>
      : <>
          <div className="cv-plateau">
            <div className="cv-faces">
              <section className="cv-face cv-recto" aria-label="Recto" inert={face !== "recto"} aria-hidden={face !== "recto"}>{rendre(recto, { ...x, idNom })}</section>
              <section className="cv-face cv-verso" aria-label="Verso" inert={face !== "verso"} aria-hidden={face !== "verso"}>
                <div className="cv-verso-corps">
                  <h3 className="cv-verso-titre" id={idVerso} tabIndex={-1}>{carte.identite.nom}<span> · verso</span></h3>
                  {rendre(verso, x)}
                  {ailleurs.length > 0 && <p className="cv-ailleurs">En page : {ailleurs.map(t => NOMS_MODULES[t].toLowerCase()).join(", ")}.</p>}
                </div>
              </section>
            </div>
          </div>
          <div className="cv-commandes">
            <button type="button" className="cv-btn" onClick={retourner} aria-label={face === "recto" ? "Retourner la carte : voir le verso" : "Retourner la carte : revenir au recto"}>
              <span aria-hidden="true" className="cv-btn-signe">↻</span> Retourner</button>
            <button ref={deplier} type="button" className="cv-btn cv-btn-clair" onClick={() => onFormat("page")}>Voir toute la carte</button>
          </div>
        </>}
    <p className="cv-message" role="status" aria-live="polite">{message}</p>
  </article>;
}
