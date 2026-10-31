/**
 * LE PORTAIL : l'accueil du Disque. Le Disque est seul, centré ; rien autour (Matt, 30/10/2026 : « On voit l'ensemble. On choisit.
 * On approfondit. On revient. »). La couronne navigue, l'intérieur affiche.
 *
 * - Au centre, par défaut (le Point Zéro) : le calendrier radial (la bague du temps : DES CHIFFRES, DES POINTS, UN CERCLE),
 *   sur les éléments datés du projet choisi ; année → mois → jour → heure → moment, et retour.
 * - Voir › Lecture (et Faire › Ajouter) : la lecture claire des fichiers importés (./lecture : l'anneau choisit, le centre affiche).
 * - Voir › Projet : le projet au centre (lib/present/recommander : règles déterministes, raisons affichées, rien deviné).
 * - La couronne : FAIRE · ALLER · VOIR · ORIGINE (Confort est ajouté par le Point, toujours en premier). Les listes sont des familles :
 *   elles remplacent l'anneau quand on les ouvre, la couronne n'est jamais chargée.
 * - L'adresse garde tout : le projet (f.p), la vue (f.v), l'échelle (f.e) et la période (f.t). Revenir garde le contexte.
 * Données : les VRAIS ouvrages de l'appareil, et LUMIERE (lu dans ses données ; le film n'est pas touché). Une démonstration le dit.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Compass, Eye, PenLine, Play } from "lucide-react";
import BagueTemps from "../../components/one/BagueTemps";
import { listProjects, type ProjectRecord } from "../../lib/library";
import { lireOne } from "../../lib/one/preferences";
import type { ContexteUnivers, EtatContexte, OutilsContexte } from "../../lib/one/contextes";
import type { ModePoint } from "../../lib/point/modes";
import { recommander, RIEN, type Projet, type Raison } from "../../lib/present/recommander";
import { ecrireChoix, epingler, ignorer, lireChoix } from "../../lib/present/choix";
import { depuisOuvrage, FUTUR_LUMIERE, JOURNAL_LUMIERE, journalOuvrage, LUMIERE, type Element } from "../../lib/present/projets";
import { PROTOTYPES } from "../../lib/site";
import { chargerAtlas } from "../../lib/present/atlas";
import { approximatifs, dans, lirePeriode, nomPeriode, sansDate, type Periode } from "../../lib/temps/echelles";
import { choisirFichiers, demonstration, VueLecture } from "./lecture";
import "./portail.css";

const EVT = "aime:present";
const famille = () => {};
const MARQUE: Record<Raison["nature"], string> = { donnee: "●", declaree: "◆", manque: "○" };
const DIT: Record<Raison["nature"], string> = { donnee: "donnée réelle", declaree: "déclaré", manque: "non renseigné" };
const dateFr = (d?: string) => { if (!d) return "sans date"; const [a, m, j] = d.slice(0, 10).split("-"); const h = d.length > 10 ? ` · ${d.slice(11, 16)}` : ""; return j ? `${+j}/${m}/${a}${h}` : m ? `${m}/${a}` : a; };

/* ——— les données du Portail : une seule source pour le centre et les côtés ——— */
export function usePortail(etat: EtatContexte) {
  const [ouvrages, setOuvrages] = useState<ProjectRecord[] | null>(null);
  const [choix, setChoix] = useState(lireChoix);
  useEffect(() => { listProjects().then(setOuvrages, () => setOuvrages([])); }, []);
  /* ATLAS : lu en direct dans atlas.lemondeaime.com (jamais copié) ; s'il ne répond pas, il n'apparaît pas */
  const [atlas, setAtlas] = useState<Awaited<ReturnType<typeof chargerAtlas>>>(null);
  useEffect(() => { let vivant = true; chargerAtlas().then(a => { if (vivant) setAtlas(a); }); return () => { vivant = false; }; }, []);
  useEffect(() => { const f = () => setChoix(lireChoix()); window.addEventListener(EVT, f); return () => window.removeEventListener(EVT, f); }, []);
  const maintenant = useMemo(() => Date.now(), [choix]); // eslint-disable-line react-hooks/exhaustive-deps
  const projets: Projet[] = useMemo(() => [...(PROTOTYPES ? [LUMIERE] : []), ...(atlas ? [atlas.projet] : []), ...(ouvrages ?? []).map(depuisOuvrage)], [ouvrages, atlas]);
  const propositions = useMemo(() => recommander(projets, choix, lireOne().favoris, maintenant), [projets, choix, maintenant]);
  const choisi = projets.find(p => p.id === etat.f?.p) ?? propositions[0]?.projet ?? null;
  const proposition = propositions.find(x => x.projet.id === choisi?.id) ?? null;
  const rec = (ouvrages ?? []).find(o => "o-" + o.id.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 38) === choisi?.id);
  const passe: Element[] = choisi?.id === "lumiere" ? JOURNAL_LUMIERE : choisi?.id === "atlas" ? atlas?.elements ?? [] : rec ? [journalOuvrage(rec)] : [];
  const futur: Element[] = choisi?.id === "lumiere" ? FUTUR_LUMIERE : choisi?.avancement !== undefined && choisi.avancement < 100
    ? [{ id: "f-finir", projet: choisi.id, titre: `Finir l’ouvrage : il reste ${100 - Math.round(choisi.avancement)} % à broder`, precision: "aucune", source: "avancement réel", genre: "futur" }] : [];
  const changerChoix = useCallback((f: (c: typeof choix) => typeof choix) => { const c = f(lireChoix()); ecrireChoix(c); setChoix(c); window.dispatchEvent(new Event(EVT)); }, []);
  return { charge: ouvrages !== null, projets, propositions, choisi, proposition, passe, futur, choix, changerChoix, maintenant };
}
export type Portail = ReturnType<typeof usePortail>;

/** reprendre un projet là où il vit (le contexte du Disque est gardé pour le retour) */
function reprendre(p: Projet, outils: OutilsContexte) {
  if (p.genre === "film") outils.deployer(LUMIERE.adresse);
  else if (p.genre === "site" && "adresse" in p) window.open(String((p as { adresse: string }).adresse), "_blank", "noopener");
  else if (p.ref) outils.deployer("atelier?ouvrage=" + encodeURIComponent(p.ref));
}
const etatDe = (p: Projet) => p.id === "lumiere" ? LUMIERE.etat : "etat" in p ? String((p as { etat: string }).etat) : p.avancement !== undefined ? `${Math.round(p.avancement)} % brodé` : "";

/* ——— le centre : le PRÉSENT ——— */
function Present({ por, outils, etat }: { por: Portail; outils: OutilsContexte; etat: EtatContexte }) {
  const { choisi: p, proposition: prop, propositions } = por;
  if (!por.charge) return <div className="pt-present"><p className="pt-sur">Projet</p><p>…</p></div>;
  if (!p) return <div className="pt-present"><p className="pt-sur">Projet</p><p className="pt-rien">{RIEN}</p></div>;
  const raisons = (prop?.raisons ?? []).filter(r => r.nature !== "manque").slice(0, 2);
  const autre = () => { const i = propositions.findIndex(x => x.projet.id === p.id), n = propositions[(i + 1) % Math.max(1, propositions.length)]; if (n) outils.aller({ f: { ...(etat.f ?? {}), p: n.projet.id } }); };
  const epingle = por.choix.epingle === p.id;
  return <section className="pt-present" data-projet={p.id} aria-labelledby="pt-titre">
    <p className="pt-sur">{prop && prop.rang === 1 && !etat.f?.p ? "Proposé" : "Projet"}{prop?.bloque ? " · bloqué" : ""}</p>
    <h2 id="pt-titre" className="pt-titre">{p.titre}</h2>
    {p.demonstration && <em className="dq-demo">démonstration</em>}
    <p className="pt-etat">{etatDe(p)}</p>
    <p className="pt-action"><b>Prochaine action</b> {p.prochaine ? p.prochaine.texte : "non renseignée"}</p>
    {raisons.length > 0 && <ul className="pt-pourquoi" aria-label="Pourquoi ce projet apparaît ici">
      {raisons.map(r => <li key={r.texte}><span aria-hidden="true">{MARQUE[r.nature]}</span> {r.texte}<span className="sr-only"> ({DIT[r.nature]})</span></li>)}</ul>}
    <button type="button" className="pt-reprendre" onClick={() => reprendre(p, outils)}><Play aria-hidden="true" />Reprendre</button>
    <div className="pt-gestes">
      <button type="button" aria-pressed={epingle} onClick={() => { por.changerChoix(c => epingler(c, p.id)); outils.dire(epingle ? `« ${p.titre} » n’est plus épinglé.` : `« ${p.titre} » est épinglé : il restera au Présent.`); }}>{epingle ? "Épinglé" : "Épingler"}</button>
      <button type="button" onClick={() => { por.changerChoix(c => ignorer(c, p.id, Date.now())); outils.aller({ f: { ...(etat.f ?? {}), p: "" } }); outils.dire(`« ${p.titre} » est mis de côté pour 7 jours. Il reste dans vos projets.`); }}>Ignorer</button>
      <button type="button" onClick={() => outils.agrandir(<Pourquoi por={por} />, "Pourquoi ce projet")}>Pourquoi ?</button>
      {propositions.length > 1 && <button type="button" onClick={autre}>Autre</button>}
    </div>
  </section>;
}

/* ——— en grand : toutes les raisons, et ce qui manque ——— */
function Pourquoi({ por }: { por: Portail }) {
  const p = por.choisi, prop = por.proposition; if (!p) return null;
  return <article className="pt-grand"><p className="pt-sur">Pourquoi ce projet apparaît ici</p><h2 className="pt-grand-titre">{p.titre}</h2>
    <p className="pt-grand-aide">L’ordre des règles : épinglé, échéance déclarée, presque terminé, intention explicite, activité récente, favoris. Rien n’est deviné.</p>
    <ul className="pt-raisons">{(prop?.raisons ?? [{ texte: "Ce projet n’est pas proposé aujourd’hui (terminé, pas commencé ou mis de côté) : vous l’avez choisi.", nature: "donnee" as const }]).map(r =>
      <li key={r.texte} data-nature={r.nature}><span className="pt-marque" aria-hidden="true">{MARQUE[r.nature]}</span><span>{r.texte}<small>{DIT[r.nature]}{r.source ? ` · ${r.source}` : ""}</small></span></li>)}</ul>
    {p.prochaine && <p><b>Prochaine action</b> : {p.prochaine.texte} <small>({p.prochaine.source})</small></p>}
    {por.futur.length > 0 && <><h3>Ce qui devient possible</h3><ul className="pt-liste">{por.futur.map(e => <li key={e.id}><b>{e.titre}</b><small>possibilité · {e.source}</small></li>)}</ul>
      <p className="pt-grand-aide">Des possibilités, jamais des engagements.</p></>}
  </article>;
}

/* ——— en grand : les éléments d'une période ——— */
function ElementsPeriode({ por, periode }: { por: Portail; periode: Periode }) {
  const ici = por.passe.filter(e => dans(e, periode)), approx = approximatifs(por.passe, periode), sans = sansDate(por.passe);
  const ligne = (e: Element) => <li key={e.id}><b>{e.titre}</b><small>{dateFr(e.date)} · {e.precision === "minute" ? "date exacte" : e.precision === "aucune" ? "sans date" : `au ${e.precision === "jour" ? "jour" : e.precision === "mois" ? "mois" : "an"} près`} · {e.source}</small></li>;
  return <article className="pt-grand"><p className="pt-sur">{por.choisi?.titre} · Chronologie</p><h2 className="pt-grand-titre">{nomPeriode(periode, por.passe)}</h2>
    {ici.length ? <ul className="pt-liste">{ici.map(ligne)}</ul> : <p>Aucun élément daté à cette période.</p>}
    {approx.length > 0 && <><h3>Dans cette période, sans date assez précise</h3><ul className="pt-liste">{approx.map(ligne)}</ul></>}
    {sans.length > 0 && <><h3>Sans date</h3><ul className="pt-liste">{sans.map(ligne)}</ul></>}
  </article>;
}

/* ——— en grand : les projets ——— */
function Projets({ por, choisir }: { por: Portail; choisir: (id: string) => void }) {
  return <article className="pt-grand"><p className="pt-sur">Aller · Projets</p><h2 className="pt-grand-titre">Vos projets</h2>
    <p className="pt-grand-aide">{PROTOTYPES ? "LUMIERE, projet documenté, ATLAS (lu en direct dans atlas.lemondeaime.com) et les ouvrages de cet appareil." : "ATLAS (lu en direct dans atlas.lemondeaime.com) et les ouvrages de cet appareil."} Le rang suit les règles du Présent.</p>
    <ul className="pt-liste pt-projets">{por.projets.map(p => { const r = por.propositions.find(x => x.projet.id === p.id);
      return <li key={p.id}><button type="button" onClick={() => choisir(p.id)}><b>{p.titre}</b><small>{etatDe(p)}{r ? ` · proposé n° ${r.rang}` : " · pas proposé aujourd’hui"}{p.demonstration ? " · démonstration" : ""}</small></button></li>; })}</ul>
  </article>;
}

/* ——— le contexte d'accueil du Disque ——— */
export const PORTAIL = (ouvrirUnivers: () => void): ContexteUnivers => ({
  id: "accueil", permissions: { partager: false, modifier: false, supprimer: false },
  Composant({ etat, outils, publier }) {
    const por = usePortail(etat), p = por.choisi, f = etat.f ?? {};
    const projetVu = f.v === "projet", lectureVu = f.v === "lecture", temps = !projetVu && !lectureVu;   /* le calendrier radial est le Point Zéro */
    const aujourdhui = useMemo(() => new Date(), []);
    /* la période : celle de l'adresse, sinon le jour du dernier élément daté, sinon aujourd'hui */
    const periode: Periode = lirePeriode(f.e, f.t) ?? (() => { const d = [...por.passe].filter(e => e.date && e.precision !== "aucune").sort((a, b) => (a.date! < b.date! ? 1 : -1))[0];
      const jour = d?.date && d.date.length >= 10 ? d.date.slice(0, 10) : `${aujourdhui.getFullYear()}-${String(aujourdhui.getMonth() + 1).padStart(2, "0")}-${String(aujourdhui.getDate()).padStart(2, "0")}`; return { echelle: "jour", cle: jour }; })();
    const allerA = (x: Record<string, string>) => outils.aller({ f: Object.fromEntries(Object.entries({ ...f, ...x }).filter(([, v]) => v)) });
    const choisirProjet = (id: string) => outils.aller({ f: { p: id } });
    const versLecture = () => allerA({ v: "lecture", k: "", n: "", l: "", a: "" });
    const [taille_, setTaille] = useState(320);

    useEffect(() => {
      if (!por.charge) { publier([], "Lecture de vos projets…"); return; }
      const nom = p?.titre ?? "";
      const projetsEnfants = (): ModePoint[] => por.projets.map(x => ({ id: "pj-" + x.id, nom: x.titre, groupe: "metier", aide: etatDe(x) || "un projet", actif: x.id === p?.id, ouvrir: () => choisirProjet(x.id) }));
      const faire: ModePoint = { id: "faire", nom: "Faire", groupe: "metier", icone: <PenLine aria-hidden="true" />, aide: "les actions : chercher, ajouter, créer, ouvrir, reprendre, relier, partager", ouvrir: famille,
        indicateur: p && por.proposition ? { etat: "guide", mot: "suggestion", libelle: `Reprendre « ${nom} »`, herite: false } : undefined,
        enfants: () => [
          { id: "f-chercher", nom: "Chercher", groupe: "metier", aide: "trouver un projet par son nom", ouvrir: () => outils.demander("Chercher un projet", "", v => { const t = v.trim().toLowerCase(); const x = t && por.projets.find(y => y.titre.toLowerCase().includes(t)); if (x) choisirProjet(x.id); }) },
          { id: "f-ajouter", nom: "Ajouter", groupe: "metier", aide: "des fichiers ou un dossier : le Disque les lit au centre ; rien n’est envoyé", ouvrir: famille, enfants: () => [
            { id: "f-a-fichiers", revientAuPoint: true, nom: "Des fichiers", groupe: "metier", aide: "PDF, Markdown, HTML, image, texte… lus au centre", ouvrir: () => choisirFichiers(false, versLecture) },
            { id: "f-a-dossier", revientAuPoint: true, nom: "Un dossier", groupe: "metier", aide: "tout un dossier : l’anneau montre les types présents", ouvrir: () => choisirFichiers(true, versLecture) },
            { id: "f-a-demo", revientAuPoint: true, nom: "Démonstration", groupe: "metier", aide: "un PDF, un Markdown, une page HTML et une image du Studio, dits comme démonstration", ouvrir: () => demonstration(versLecture, outils.dire) },
          ] },
          { id: "f-creer", revientAuPoint: true, nom: "Créer", groupe: "metier", aide: "un nouvel ouvrage, dans l’atelier de broderie", ouvrir: () => outils.deployer("atelier") },
          { id: "f-ouvrir", nom: "Ouvrir", groupe: "metier", aide: "choisir un projet", ouvrir: famille, enfants: projetsEnfants },
          ...(p ? [{ id: "f-reprendre", revientAuPoint: true, nom: "Reprendre", groupe: "metier" as const, aide: `reprendre « ${nom} » là où il vit`, ouvrir: () => reprendre(p, outils) }] : []),
          { id: "f-relier", nom: "Relier", groupe: "metier", aide: "relier des blocs : dans la Composition d’ATLAS, hors du Studio", ouvrir: () => outils.dire("Relier vit dans la Composition d’ATLAS (hors du Studio) : il n’est pas recopié ici.") },
          { id: "f-partager", nom: "Partager", groupe: "metier", aide: "pas encore disponible ici", ouvrir: () => outils.dire("Partager n’est pas encore disponible dans le Studio : les droits de partage ne sont pas encore appliqués.") },
        ] };
      const aller: ModePoint = { id: "aller", nom: "Aller", groupe: "metier", icone: <Compass aria-hidden="true" />, aide: "les lieux : bureau, projets, dossiers, archives", ouvrir: famille,
        enfants: () => [
          { id: "a-bureau", nom: "Bureau", groupe: "metier", aide: "vos ouvrages au centre du Disque", ouvrir: () => outils.changerUnivers("bureau") },
          { id: "a-projets", nom: "Projets", groupe: "metier", aide: "tous vos projets, en grand", ouvrir: () => outils.agrandir(<Projets por={por} choisir={choisirProjet} />, "Vos projets") },
          { id: "a-dossiers", nom: "Dossiers", groupe: "metier", aide: "le dossier de travail (Disque Terminal)", ouvrir: () => outils.changerUnivers("terminal") },
          { id: "a-archives", revientAuPoint: true, nom: "Archives", groupe: "metier", aide: "le passé daté du projet", ouvrir: () => allerA({ p: p?.id ?? "", v: "", e: "annee", t: periode.cle.slice(0, 4) }) },
          { id: "a-univers", nom: "Univers", groupe: "metier", aide: "la grille de tous les univers", ouvrir: ouvrirUnivers },
        ] };
      const datés = por.passe.filter(e => e.precision !== "aucune").length;
      const voir: ModePoint = { id: "voir", nom: "Voir", groupe: "metier", icone: <Eye aria-hidden="true" />, aide: "les représentations : disque, chronologie, partition, rosace, grille, cube, onde", ouvrir: famille,
        indicateur: datés && projetVu ? { etat: "info", mot: "information", libelle: `${datés} élément${datés > 1 ? "s" : ""} daté${datés > 1 ? "s" : ""} à parcourir dans la Chronologie`, herite: false } : undefined,
        enfants: () => [
          { id: "v-disque", revientAuPoint: true, nom: "Disque", groupe: "metier", aide: "le calendrier radial, au Point Zéro", actif: temps, ouvrir: () => allerA({ v: "", e: "", t: "" }) },
          { id: "v-lecture", revientAuPoint: true, nom: "Lecture", groupe: "metier", aide: "les fichiers importés : l’anneau choisit, le centre affiche", actif: lectureVu, ouvrir: versLecture },
          ...(p ? [{ id: "v-projet", revientAuPoint: true, nom: "Projet", groupe: "metier" as const, aide: `« ${nom} » au centre : son état, sa prochaine action, pourquoi`, actif: projetVu, ouvrir: () => allerA({ v: "projet" }) }] : []),
          { id: "v-chronologie", revientAuPoint: true, nom: "Chronologie", groupe: "metier", aide: "les années, puis les mois, les jours, les heures", ouvrir: () => allerA({ p: p?.id ?? "", v: "", e: "annee", t: periode.cle.slice(0, 4) }) },
          ...(!PROTOTYPES ? [] : [{ id: "v-partition", nom: "Partition", groupe: "metier", aide: p?.id === "lumiere" ? "les pistes et les repères du film (le film n’est pas modifié)" : "pour LUMIERE seulement, aujourd’hui",
            ouvrir: () => p?.id === "lumiere" ? outils.deployer(LUMIERE.adresse) : outils.dire("La Partition existe aujourd’hui pour LUMIERE seulement (le moteur de montage).") },
          { id: "v-rosace", nom: "Rosace", groupe: "metier", aide: "les rosaces du moteur 5D (Galerie)", ouvrir: () => outils.changerUnivers("galerie") }] as ModePoint[]),
          { id: "v-grille", nom: "Grille", groupe: "metier", aide: "dans ATLAS, hors du Studio", ouvrir: () => outils.dire("La Grille est la Composition d’ATLAS (hors du Studio) : elle n’est pas recodée ici.") },
          { id: "v-cube", nom: "Cube", groupe: "metier", aide: "dans ATLAS, hors du Studio", ouvrir: () => outils.dire("Le Cube vit dans ATLAS (maquette, hors du Studio).") },
          { id: "v-onde", nom: "Onde", groupe: "metier", aide: "en préparation", ouvrir: () => outils.dire("L’Onde est en préparation : aucune relation vérifiée n’est encore raccordée.") },
        ] };
      const origine: ModePoint = { id: "origine", nom: "Origine", groupe: "metier", icone: <span className="one-orbe dq-mini-orbe" aria-hidden="true" />, aide: "revenir au Point Zéro : le calendrier, au jour du projet (le projet choisi est gardé)", ouvrir: () => allerA({ v: "", e: "", t: "", k: "", n: "", l: "", a: "" }) };
      publier([faire, aller, voir, origine], p
        ? `${temps ? "Calendrier · " : lectureVu ? "Lecture · " : "Projet · "}${nom}${por.proposition?.bloque ? " · bloqué" : ""} · ${por.propositions.length} projet${por.propositions.length > 1 ? "s" : ""} à reprendre`
        : RIEN);
    }, [por.charge, p?.id, por.propositions.length, por.proposition?.bloque, temps, lectureVu, periode.echelle, periode.cle, por.choix.epingle]); // eslint-disable-line react-hooks/exhaustive-deps

    const mesurer = (el: HTMLDivElement | null) => { if (el) { const t = Math.round(el.getBoundingClientRect().width); if (t && Math.abs(t - taille_) > 2) setTaille(t); } };
    if (lectureVu) return <div className="pt-temps" ref={mesurer}><VueLecture f={f} aller={allerA} outils={outils} taille={taille_} /></div>;
    /* le calendrier est le Point Zéro : il s'affiche aussi sans projet (aujourd'hui, aucun élément inventé) */
    if (temps) return <div className="pt-temps" ref={mesurer}>
      <BagueTemps periode={periode} elements={por.passe} taille={taille_} aujourdhui={aujourdhui}
        choisir={x => allerA({ p: p?.id ?? "", v: "", e: x.echelle, t: x.cle })}
        ouvrir={x => outils.agrandir(<ElementsPeriode por={por} periode={x} />, nomPeriode(x, por.passe))} />
    </div>;
    return <Present por={por} outils={outils} etat={etat} />;
  },
});

