/**
 * LA fiche contextuelle : un seul composant pour tous les domaines (lib/fiche). Il ne connaît aucun métier : il reçoit
 * l'adresse d'un élément (« dmc-310 »), demande sa fiche au registre, et la montre. Ce qui change d'un domaine à
 * l'autre — les informations, les relations, les actions — vient des données et des règles du domaine, jamais d'ici.
 *
 * Deux présentations d'une même fiche (on ne force pas un contenu dense à tenir dans un cercle) :
 *  - « disque » : l'essentiel, dans le centre du Disque ; les actions sont dans la couronne (Le Point) ;
 *  - « etendu » : tout — les informations avec leur source, les relations, les actions avec ce qu'elles modifient,
 *    la version, les limites.
 * Accessibilité : un titre qui prend le focus quand l'élément change ; un statut et un glyphe pour chaque information
 * (la couleur ne porte jamais seule le sens) ; un message d'action annoncé poliment ; cibles de 44 px.
 */
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { GLYPHES_FAIT, NOMS_STATUTS_FAIT, etatDe, type Action, type Fait, type Fiche, type Resultat, type Role, type Source } from "../../lib/fiche/fiche";
import { resoudre } from "../../lib/fiche/registre";
import { effetEnPhrase, executerAction, suivreFiches } from "../../lib/fiche/actions";
import "./FicheContextuelle.css";

export type Presentation = "disque" | "etendu" | "carte";
export interface FicheProps {
  /** l'adresse de l'élément : « <domaine>-<identifiant> » */
  adresse: string;
  role: Role;
  presentation: Presentation;
  /** ouvrir un élément relié (une relation navigable) */
  onNaviguer?: (adresse: string) => void;
  /** dire le résultat d'une action (la zone aria-live de l'hôte) */
  onResultat?: (r: Resultat) => void;
  /** en présentation « disque » : montrer tout */
  onAgrandir?: () => void;
  /** vrai quand la même fiche est lue en entier juste à côté : la présentation du Disque est alors masquée aux lecteurs d'écran (pas de lecture en double) */
  duplique?: boolean;
  /** présentation « carte » : le volet « Détails » peut être piloté de l'extérieur (le Disque : « Tout voir ») */
  details?: boolean;
  onDetails?: (ouvert: boolean) => void;
}

const LIEUX: Record<Source["lieu"], string> = { code: "Dans le code", appareil: "Sur votre appareil", calcul: "Calculé", serveur: "Sur un serveur" };

/** la fiche d'une adresse, relue à sa source à chaque changement (après une action, par exemple) */
export function useFiche(adresse: string, role: Role): { ok: true; fiche: Fiche } | { ok: false; raison: string } {
  const [v, setV] = useState(0);
  useEffect(() => suivreFiches(() => setV(x => x + 1)), []);
  return useMemo(() => resoudre(adresse, role), [adresse, role, v]); // eslint-disable-line react-hooks/exhaustive-deps
}

export default function FicheContextuelle({ adresse, role, presentation, onNaviguer, onResultat, onAgrandir, duplique, details, onDetails }: FicheProps) {
  const r = useFiche(adresse, role);
  const [detailsLocal, setDetailsLocal] = useState(false);
  const ouvert = details ?? detailsLocal;
  const basculer = () => { const v = !ouvert; setDetailsLocal(v); onDetails?.(v); };
  /* deux présentations de la même fiche peuvent être montées ensemble (le Disque et la fiche entière) : chaque identifiant est propre à son instance */
  const uid = useId();
  const id = (k: string) => `fc${uid}-${k}`;
  const titre = useRef<HTMLHeadingElement>(null);
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const premier = useRef(true);
  useEffect(() => { setResultat(null); if (premier.current) { premier.current = false; return; } if (presentation === "carte" || duplique) return; /* la carte ne prend jamais le focus : la personne reste où elle est (la grille, le Disque) ; le changement est annoncé par l'hôte */ titre.current?.focus({ preventScroll: true }); }, [adresse]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!r.ok) return <div className="fc fc-vide" data-presentation={presentation} role="status"><p className="fc-titre-vide">Rien à montrer</p><p>{r.raison}</p></div>;
  const f = r.fiche, partielle = etatDe(f) === "partielle", manques = f.faits.filter(x => x.statut === "manquant").length;
  const agir = (a: Action) => { const res = executerAction(a, role); setResultat(res); onResultat?.(res); };

  const apercu = f.apercu && (f.apercu.genre === "couleur"
    ? <div className="fc-apercu" role="img" aria-label={f.apercu.alt} style={{ background: f.apercu.hex, color: f.apercu.texte }}><span aria-hidden="true">{f.apercu.hex.toUpperCase()}</span></div>
    : <img className="fc-apercu fc-apercu-image" src={f.apercu.src} alt={f.apercu.alt} />);
  const etat = <p className="fc-etat" data-etat={partielle ? "partielle" : "complete"}>
    <span className="fc-glyphe" aria-hidden="true">{partielle ? "○" : "✓"}</span>
    {partielle ? `Fiche partielle : ${manques} information${manques > 1 ? "s" : ""} ne ${manques > 1 ? "sont" : "est"} pas renseignée${manques > 1 ? "s" : ""}` : "Fiche complète pour ce qu'elle déclare"}
  </p>;

  if (presentation === "carte") {
    /* la carte : de quoi comprendre d'un coup d'œil (identifiant, titre, état, deux à quatre informations, une action) ;
       tout le reste est dans « Détails », fermé par défaut. La provenance est dite UNE fois, pas à chaque ligne. */
    const dites = f.faits.filter(x => x.statut !== "manquant");
    const cle = [...f.faits.filter(x => x.principal && x.statut !== "manquant"), ...dites.filter(x => !x.principal)].slice(0, Math.max(3, Math.min(4, f.faits.filter(x => x.principal).length)));
    const [premiere, ...autres] = f.actions;
    return <article className="fc fc-carte" data-presentation="carte" data-domaine={f.domaine} aria-labelledby={id("titre")}>
      <header className="fc-carte-tete">
        {apercu ?? <div className="fc-apercu fc-sigle" aria-hidden="true">{f.sigle ?? f.titre.slice(0, 2)}</div>}
        <div className="fc-carte-titres">
          <p className="fc-sur">{f.surtitre}</p>
          <h2 id={id("titre")} ref={titre} tabIndex={-1} className="fc-titre">{f.titre}</h2>
          {f.sous && <p className="fc-sous">{f.sous}</p>}
        </div>
      </header>
      {etat}
      <dl className="fc-cles">{cle.map(x => <div key={x.cle} className="fc-cle" data-statut={x.statut}><dt>{x.libelle}</dt><dd>{x.valeur}</dd></div>)}</dl>
      {premiere && <div className="fc-carte-actions">
        <button type="button" className="one-bouton fc-principale" onClick={() => agir(premiere)} aria-describedby={id("effet")}>{premiere.nom}</button>
        {autres.map(a => <button key={a.id} type="button" className="fc-secondaire" onClick={() => agir(a)}>{a.nom}</button>)}
        <small id={id("effet")} className="fc-effet">{effetEnPhrase(premiere)}.</small>
      </div>}
      <p className="fc-resultat" role="status" aria-live="polite" data-ok={resultat ? String(resultat.ok) : undefined}>
        {resultat && <><span className="fc-glyphe" aria-hidden="true">{resultat.ok ? "✓" : "!"}</span>{resultat.message}{resultat.verification && <small> {resultat.verification}</small>}</>}
      </p>
      <div className="fc-carte-pied">
        <p className="fc-prov-globale">Source : {f.sources[0]?.libelle ?? "non indiquée"}{f.sources.length > 1 ? ` et ${f.sources.length - 1} autre${f.sources.length > 2 ? "s" : ""}` : ""}</p>
        <button type="button" className="fc-details-bouton" aria-expanded={ouvert} aria-controls={id("details")} onClick={basculer}>{ouvert ? "Masquer les détails" : "Détails"}</button>
      </div>
      {ouvert && <div id={id("details")} className="fc-details">
        <details><summary>Toutes les informations</summary>
          <dl className="fc-faits">{f.faits.map(x => <FaitLigne key={x.cle} x={x} sources={f.sources} compact />)}</dl></details>
        {f.relations.length > 0 && <details><summary>Relations <span>{f.relations.length}</span></summary>
          <ul className="fc-relations">{f.relations.map(x => <li key={x.domaine + x.id}>
            {x.navigable && onNaviguer
              ? <button type="button" className="fc-relation" onClick={() => onNaviguer(`${x.domaine}-${x.id}`)}><b>{x.libelle}</b><span>{x.nature}{x.mesure ? ` · ${x.mesure}` : ""}</span></button>
              : <div className="fc-relation"><b>{x.libelle}</b><span>{x.nature}{x.mesure ? ` · ${x.mesure}` : ""}</span></div>}
          </li>)}</ul></details>}
        <details><summary>Provenance et version</summary>
          <p className="fc-version"><b>Version affichée :</b> {f.version.libelle}.</p>
          <ul className="fc-sources">{f.sources.map(s => <li key={s.id}><b>{s.libelle}</b> <span>{LIEUX[s.lieu]}</span>{s.detail && <small>{s.detail}</small>}</li>)}</ul></details>
        <details><summary>Limites</summary><ul className="fc-limites">{f.limites.map(l => <li key={l}>{l}</li>)}</ul></details>
      </div>}
    </article>;
  }

  if (presentation === "disque") {
    /* l'essentiel : ce que le domaine déclare « principal » (deux faits au plus) ; à défaut, les deux premiers faits */
    const essentiel = (f.faits.some(x => x.principal) ? f.faits.filter(x => x.principal) : f.faits).slice(0, duplique ? 1 : 2);   // la carte est à côté : le centre du Disque n'en garde qu'une
    return <article className="fc fc-disque" data-presentation="disque" data-domaine={f.domaine} aria-labelledby={duplique ? undefined : id("titre")} aria-hidden={duplique ? true : undefined}>
      {apercu}
      <p className="fc-sur">{f.surtitre}</p>
      <h2 id={id("titre")} ref={titre} tabIndex={-1} className="fc-titre">{f.titre}</h2>
      {f.sous && <p className="fc-sous">{f.sous}</p>}
      {essentiel.map(x => <p key={x.cle} className="fc-ligne" data-statut={x.statut}><span className="fc-glyphe" aria-hidden="true">{GLYPHES_FAIT[x.statut]}</span>{x.libelle} : {x.valeur ?? "non renseigné"}</p>)}
      {!duplique && etat}
      {onAgrandir && <button type="button" className="one-bouton fc-tout" onClick={onAgrandir}>Tout voir</button>}
    </article>;
  }

  return <article className="fc fc-etendu" data-presentation="etendu" data-domaine={f.domaine} aria-labelledby={id("titre")}>
    <header className="fc-tete">
      {apercu}
      <div>
        <p className="fc-sur">{f.surtitre}</p>
        <h2 id={id("titre")} ref={titre} tabIndex={-1} className="fc-titre">{f.titre}</h2>
        {f.sous && <p className="fc-sous">{f.sous}</p>}
        {etat}
      </div>
    </header>

    <section aria-labelledby={id("h-infos")}><h3 id={id("h-infos")}>Ce que l'on sait</h3>
      <dl className="fc-faits">{f.faits.map(x => <FaitLigne key={x.cle} x={x} sources={f.sources} />)}</dl>
    </section>

    {f.relations.length > 0 && <section aria-labelledby={id("h-rel")}><h3 id={id("h-rel")}>Ce qui est relié</h3>
      <ul className="fc-relations">{f.relations.map(x => <li key={x.domaine + x.id}>
        {x.navigable && onNaviguer
          ? <button type="button" className="fc-relation" onClick={() => onNaviguer(`${x.domaine}-${x.id}`)}><b>{x.libelle}</b><span>{x.nature}{x.mesure ? ` · ${x.mesure}` : ""}</span><small>{x.raison}</small></button>
          : <div className="fc-relation"><b>{x.libelle}</b><span>{x.nature}{x.mesure ? ` · ${x.mesure}` : ""}</span><small>{x.raison}</small></div>}
      </li>)}</ul>
    </section>}

    <section aria-labelledby={id("h-act")}><h3 id={id("h-act")}>Ce que vous pouvez faire</h3>
      {f.actions.length === 0 ? <p className="fc-note">Aucune action n'est permise sur cet élément pour vous.</p>
        : <ul className="fc-actions">{f.actions.map(a => <li key={a.id}>
          <button type="button" className="one-bouton" onClick={() => agir(a)}>{a.nom}</button>
          <p><b>Modifie :</b> {effetEnPhrase(a)}.</p>
        </li>)}</ul>}
      <p className="fc-resultat" role="status" aria-live="polite" data-ok={resultat ? String(resultat.ok) : undefined}>
        {resultat && <><span className="fc-glyphe" aria-hidden="true">{resultat.ok ? "✓" : "!"}</span>{resultat.message}{resultat.verification && <small> {resultat.verification}</small>}</>}
      </p>
    </section>

    <section aria-labelledby={id("h-src")}><h3 id={id("h-src")}>D'où vient cette fiche</h3>
      <p className="fc-version"><b>Version affichée :</b> {f.version.libelle}.</p>
      <ul className="fc-sources">{f.sources.map(s => <li key={s.id}><b>{s.libelle}</b> <span>{LIEUX[s.lieu]}</span>{s.detail && <small>{s.detail}</small>}</li>)}</ul>
      <h4>Ce que cette fiche ne prouve pas</h4>
      <ul className="fc-limites">{f.limites.map(l => <li key={l}>{l}</li>)}</ul>
    </section>
  </article>;
}

function FaitLigne({ x, sources, compact }: { x: Fait; sources: Source[]; compact?: boolean }) {
  const s = sources.find(y => y.id === x.source);
  return <div className="fc-fait" data-statut={x.statut}>
    <dt>{x.libelle}</dt>
    <dd>
      <span className="fc-valeur">{x.valeur ?? <>Non renseigné<span className="fc-manque"> — {x.manque}</span></>}</span>
      {!compact && <span className="fc-prov"><span className="fc-glyphe" aria-hidden="true">{GLYPHES_FAIT[x.statut]}</span>{NOMS_STATUTS_FAIT[x.statut]}{s ? ` · ${s.libelle}` : ""}</span>}
    </dd>
  </div>;
}
