/**
 * .0NE — le Disque universel, interface principale. UN SEUL Disque ; un univers est un CONTEXTE.
 * Clic sur un univers → le Disque change de contexte → le contenu réel au centre (aucune fenêtre de présentation entre les deux).
 * - L'adresse garde le contexte, l'objet choisi, les filtres : l'historique du navigateur est l'historique des contextes.
 * - La couronne : les commandes du contexte actif (le même composant que l'atelier), plus Univers (la grille ATLAS), À propos, Retour.
 * - La zone réservée sous le Disque : hauteur fixe ; le nom et l'aide des commandes, la ligne d'état, une question — rien ne bouge.
 * - Agrandir : le Disque se replie en Point, le contenu prend l'écran ; le Point le redéploie, le contexte est intact.
 * - Plein écran (atelier, Terminal) : le contexte est gardé pour le retour (« Revenir à .0NE »).
 * - Téléphone : le contenu prend la largeur, les mêmes commandes en liste, le Point reste en haut.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { PROTOTYPES } from "../lib/site";
import { Info, LayoutGrid, X } from "lucide-react";
import DisqueOne from "../components/one/DisqueOne";
import { IconeOne } from "../components/one/icones";
import { NOMS_STATUTS, universPublics } from "../lib/one/contrat";
import { suivreUnivers, tousLesUnivers } from "../lib/one/univers";
import { appliquerOne, lireOne, themeOne } from "../lib/one/preferences";
import { ecrireEtat, lireEtat, memoriserRetour, type ContexteUnivers, type EtatContexte, type OutilsContexte } from "../lib/one/contextes";
import type { ModePoint } from "../lib/point/modes";
import { GALERIE } from "./disque/galerie";
import { BUREAU } from "./disque/bureau";
import { BRODERIE, deploiement, presentation } from "./disque/autres";
import { PORTAIL } from "./disque/portail";
import "../design/aime.css";
import "./one.css";
import "./disque.css";

const BASE = import.meta.env.BASE_URL;
const RACCORDES: Record<string, ContexteUnivers> = {
  galerie: GALERIE, bureau: BUREAU, broderie: BRODERIE,
  terminal: deploiement("terminal", "one/terminal", "Le Disque Terminal : vos fichiers, Git et l’audio, sur un vrai dossier"),
  "carte-vivante": deploiement("carte-vivante", "essai-carte", "La Carte vivante : une carte, plusieurs formes, une seule adresse"),
};

function useMobile() {
  const [m, setM] = useState(() => window.matchMedia?.("(max-width: 640px)").matches ?? false);
  useEffect(() => { const q = window.matchMedia?.("(max-width: 640px)"); if (!q) return; const f = () => setM(q.matches); q.addEventListener?.("change", f); return () => q.removeEventListener?.("change", f); }, []);
  return m;
}


export default function DisqueUnivers() {
  const [, setV] = useState(0);
  useEffect(() => suivreUnivers(() => setV(v => v + 1)), []);
  const p = useMemo(lireOne, []);
  useEffect(() => { appliquerOne(p); }, [p]);
  const theme = themeOne(p), mobile = useMobile();
  const tous = universPublics(tousLesUnivers());

  const [etat, setEtat] = useState<EtatContexte>(lireEtat);
  const [commandes, setCommandes] = useState<ModePoint[]>([]);
  const [ligne, setLigne] = useState(""), [message, setMessage] = useState("");
  const [question, setQuestion] = useState<{ q: string; v: string; f: (v: string) => void } | null>(null);
  const [grille, setGrille] = useState(false), [apropos, setApropos] = useState(false);
  const [grand, setGrand] = useState<{ contenu: ReactNode; titre: string } | null>(null);
  const titre = useRef<HTMLHeadingElement>(null);

  /* l'historique du navigateur est l'historique des contextes */
  useEffect(() => { const f = () => { setEtat(lireEtat()); setGrand(null); setQuestion(null); }; window.addEventListener("popstate", f); return () => window.removeEventListener("popstate", f); }, []);
  const naviguer = useCallback((e: EtatContexte, remplacer = false) => {
    const url = window.location.pathname + ecrireEtat(e);
    if (remplacer) history.replaceState(null, "", url); else history.pushState(null, "", url);
    setEtat(e); setMessage(""); setQuestion(null);
  }, []);
  const u = tous.find(x => x.id === etat.u) ?? null;
  /* un contexte = un composant stable (sinon le centre serait remonté à chaque rendu) */
  const contexte: ContexteUnivers = useMemo(() => etat.u === "accueil" || !u ? PORTAIL(() => setGrille(true)) : RACCORDES[u.id] ?? presentation(u), [etat.u, u?.id, tous.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const etatRef = useRef(etat); etatRef.current = etat;
  useEffect(() => { document.title = u ? `${u.nom} — .0NE` : ".0NE"; requestAnimationFrame(() => titre.current?.focus({ preventScroll: true })); }, [etat.u]); // eslint-disable-line react-hooks/exhaustive-deps

  const outils: OutilsContexte = {
    aller: (e, remplacer) => naviguer({ ...etatRef.current, ...e }, remplacer ?? (e.o !== undefined && !e.f)),
    changerUnivers: id => { setGrille(false); setApropos(false); naviguer({ u: id }); },
    deployer: chemin => { memoriserRetour({ adresse: window.location.pathname + window.location.search, nom: u?.nom ?? ".0NE" }); window.location.assign(BASE + chemin); },
    dire: t => setMessage(t),
    agrandir: (contenu, t) => setGrand({ contenu, titre: t }),
    demander: (q, v, f) => setQuestion({ q, v, f }),
    mobile,
  };
  const publier = useCallback((m: ModePoint[], l?: string) => { setCommandes(m); setLigne(l ?? ""); }, []);

  /* la couronne : le contexte, puis les communs (Univers, À propos, Retour) */
  /* au Portail, la couronne est FAIRE · ALLER · VOIR · ORIGINE (les univers sont dans ALLER) */
  const communs: ModePoint[] = contexte.id === "accueil" ? [] : [
    { id: "c-univers", nom: "Univers", groupe: "socle", icone: <LayoutGrid aria-hidden="true" />, aide: "la grille de tous les univers (ATLAS)", actif: grille, ouvrir: () => setGrille(true) },
    ...(u ? [{ id: "c-apropos", nom: "À propos", groupe: "socle" as const, icone: <Info aria-hidden="true" />, aide: `la présentation de ${u.nom}`, ouvrir: () => setApropos(true) },
      { id: "c-retour", nom: ".0NE", groupe: "socle" as const, icone: <span className="one-orbe dq-mini-orbe" aria-hidden="true" />, aide: "revenir à l’accueil du Disque", ouvrir: () => naviguer({ u: "accueil" }) }] : []),
  ];
  const modes = [...commandes, ...communs];
  const Centre = contexte.Composant;
  const centre = <Centre key={contexte.id} etat={etat} outils={outils} publier={publier} />;

  return <div className={"one dq" + (mobile ? " dq-mobile" : "")} data-aime={theme} data-contexte={contexte.id}>
    <section className="dq-tete" aria-label="Contexte du Disque">
      <a className="one-marque" href={BASE + "one/univers"} onClick={e => { e.preventDefault(); naviguer({ u: "accueil" }); }}><span className="one-orbe" aria-hidden="true" />.0NE</a>
      <nav className="dq-fil" aria-label="Où je suis"><span>{u ? u.nom : "Accueil"}</span>{u && <span className={"dq-statut-mini om-" + u.statut}>{NOMS_STATUTS[u.statut]}</span>}</nav>
      <button type="button" className="one-bouton dq-bouton-grille" onClick={() => setGrille(true)}><LayoutGrid aria-hidden="true" />Univers</button>
    </section>
    <main className="dq-scene">
      <h1 ref={titre} tabIndex={-1} className="sr-only">{u ? `${u.nom}, dans le Disque .0NE` : "Le Disque .0NE"}</h1>
      {/* le même Disque partout, téléphone compris : seules ses dimensions s'adaptent (jamais une liste à la place du cadran) */}
      <DisqueOne key={"dq-" + contexte.id} contexte={"dq-" + contexte.id} etiquette={`Le Disque : ${u?.nom ?? ".0NE"}`} modes={modes}
        max={mobile ? Math.min(640, window.innerWidth - 8, Math.round(window.innerHeight * 0.8)) : Math.min(640, Math.round(window.innerHeight * 0.72))} centre={<div className="dq-centre" data-contexte={contexte.id}>{centre}</div>} />
      {/* la zone réservée : hauteur fixe ; rien ne pousse le Disque */}
      <div className="dq-zone" aria-live="polite">
        {question ? <form className="dq-question" onSubmit={e => { e.preventDefault(); setQuestion(null); }}>
            <label><span className="sr-only">{question.q}</span><input autoFocus placeholder={question.q} defaultValue={question.v} onChange={e => question.f(e.target.value)} /></label>
            <button type="submit" className="one-bouton">OK</button><button type="button" className="one-bouton" onClick={() => { question.f(""); setQuestion(null); }}>Effacer</button></form>
          : !message ? <p className="sr-only">{ligne}</p>   /* rien sous le Disque : la ligne d’état reste pour les lecteurs d’écran */
          : <p className="dq-ligne">{message || ligne}</p>}
      </div>
    </main>

    {grille && <div className="dq-voile" role="dialog" aria-modal="true" aria-labelledby="dq-grille-titre" onKeyDown={e => { if (e.key === "Escape") setGrille(false); }}>
      <div className="dq-grille">
        <div className="dq-grille-tete"><h2 id="dq-grille-titre">Tous les univers</h2><button type="button" className="one-bouton" autoFocus onClick={() => setGrille(false)}><X aria-hidden="true" />Fermer</button></div>
        <p className="dq-grille-aide">Une case, un univers : choisissez un contexte, le Disque l’ouvre. Le statut est dit tel qu’il est.</p>
        <ul>{tous.map(x => <li key={x.id}><button type="button" className="dq-case" data-univers={x.id} aria-current={x.id === etat.u ? "true" : undefined} onClick={() => outils.changerUnivers(x.id)}>
          <span className="dq-case-ico" style={{ color: x.teinte }}><IconeOne nom={x.icone} /></span><b>{x.nom}</b><span className="dq-case-phrase">{x.phrase}</span>
          <span className={"dq-statut-mini om-" + x.statut}>{RACCORDES[x.id] ? "" : "présentation · "}{NOMS_STATUTS[x.statut]}</span></button></li>)}</ul>
        {PROTOTYPES && <p className="dq-grille-pied"><a href={BASE + "explorer"}>Explorer tous les prototypes</a> · <a href={BASE + "one/lumiere/vivre"}>Vivre LUMIERE</a></p>}
      </div>
    </div>}
    {apropos && u && <div className="dq-voile" role="dialog" aria-modal="true" aria-labelledby="dq-apropos-titre" onKeyDown={e => { if (e.key === "Escape") setApropos(false); }}>
      <div className="dq-apropos"><h2 id="dq-apropos-titre">{u.nom}</h2><p>{u.description}</p><p className="dq-grille-aide">Dans la couronne : {u.familles.map(f => f.nom).join(", ")}.</p>
        {u.ailleurs && <p><a href={u.ailleurs.chemin}>{u.ailleurs.nom} (hors .0NE)</a></p>}
        <button type="button" className="one-bouton one-bouton-plein" autoFocus onClick={() => setApropos(false)}>Revenir au Disque</button></div>
    </div>}
    {grand && <div className="dq-grand" role="dialog" aria-modal="true" aria-label={`${grand.titre}, en grand`} onKeyDown={e => { if (e.key === "Escape") setGrand(null); }}>
      <div className="dq-grand-contenu">{grand.contenu}</div>
      <button type="button" className="dq-point-replie" autoFocus onClick={() => setGrand(null)} aria-label="Revenir au Disque"><span className="one-orbe" aria-hidden="true" /><span>Revenir au Disque</span></button>
    </div>}
  </div>;
}
