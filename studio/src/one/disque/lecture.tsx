/**
 * LA LECTURE CLAIRE, dans le Disque (Matt, 30/10/2026 : « L'anneau choisit. Le centre affiche. Le Point Zéro relie. »).
 * Niveau 1 : les types réellement présents · 2 : les fichiers du type (sauté s'il n'y en a qu'un) · 3 : les lectures ·
 * 4 : les actions. L'anneau intérieur montre seulement les choix du niveau courant ; le centre, une seule représentation.
 * L'adresse garde le niveau : f.v=lecture, f.k (type), f.n (fichier), f.l (lecture), f.a (agir). Les fichiers restent en mémoire.
 */
import { useEffect, useState } from "react";
import AnneauChoix, { type Choix } from "../../components/one/AnneauChoix";
import { chargerDemonstration, estDemonstration, EVT_IMPORT, importer, importes, lecture, parType } from "../../lib/lecture/import";
import { NOM_LONG, NOM_TYPE, NOM_VUE, taille as poids, type Lecture, type TypeFichier, type Vue } from "../../lib/lecture/lire";
import { reconnaitre } from "../../lib/present/ajouter";
import type { OutilsContexte } from "../../lib/one/contextes";
import "./lecture.css";

const BASE = import.meta.env.BASE_URL ?? "/studio/";
type F = Record<string, string>;

/** ouvrir le sélecteur de fichiers (dans le geste de la personne) ; un dossier entier si demandé */
export function choisirFichiers(dossier: boolean, ensuite: () => void) {
  const i = document.createElement("input"); i.type = "file"; i.multiple = true;
  if (dossier) i.setAttribute("webkitdirectory", "");
  i.addEventListener("change", () => { if (i.files?.length) { importer([...i.files]); ensuite(); } });
  i.click();
}
export const demonstration = (ensuite: () => void, dire: (t: string) => void) =>
  chargerDemonstration(BASE).then(ensuite, () => dire("La démonstration n’a pas pu être chargée."));

export function useImport() {
  const [, maj] = useState(0);
  useEffect(() => { const f = () => maj(x => x + 1); window.addEventListener(EVT_IMPORT, f); return () => window.removeEventListener(EVT_IMPORT, f); }, []);
  return importes();
}

const court = (s: string, n = 12) => s.length > n ? s.slice(0, n - 1) + "…" : s;

export function VueLecture({ f, aller, outils, taille }: { f: F; aller: (x: F) => void; outils: OutilsContexte; taille: number }) {
  const tous = useImport(), groupes = parType(tous);
  const g = groupes.find(x => x.type === f.k) ?? null;
  const unique = g?.fichiers.length === 1;
  const fichier = g ? g.fichiers[unique ? 0 : Number.isInteger(+f.n) && f.n !== undefined && f.n !== "" ? +f.n : -1] ?? null : null;
  const [lu, setLu] = useState<Lecture | null>(null);
  useEffect(() => { setLu(null); if (fichier) { let vivant = true; lecture(fichier).then(l => vivant && setLu(l)); return () => { vivant = false; }; } }, [fichier]);
  const demo = estDemonstration() ? <span className="lc-demo"> · démonstration</span> : null;

  /* rien d'importé : le Disque le dit, et propose d'importer (rien n'est inventé) */
  if (!tous.length) return <AnneauChoix choix={[]} actif={null} choisir={() => {}} taille={taille} niveau="Aucun choix : rien n’est importé">
    <p className="lc-fil">Lecture</p><h2 className="lc-nom">Rien n’est importé</h2>
    <p className="lc-aide">Les fichiers restent sur cet appareil. Un rechargement de la page les oublie.</p>
    <div className="lc-gestes">
      <button type="button" onClick={() => choisirFichiers(false, () => aller({}))}>Des fichiers</button>
      <button type="button" className="lc-seul-grand" onClick={() => choisirFichiers(true, () => aller({}))}>Un dossier</button>
      <button type="button" onClick={() => demonstration(() => aller({}), outils.dire)}>Démonstration</button>
    </div>
  </AnneauChoix>;

  /* niveau 1 : les types réellement présents */
  if (!g) {
    const choix: Choix[] = groupes.map(x => ({ cle: x.type, libelle: NOM_TYPE[x.type], complet: `${NOM_LONG[x.type]} : ${x.fichiers.length} fichier${x.fichiers.length > 1 ? "s" : ""}`, compte: x.fichiers.length }));
    return <AnneauChoix choix={choix} actif={null} choisir={k => aller({ k, n: "", l: "", a: "" })} taille={taille} niveau="Les types de contenu présents dans l’import">
      <p className="lc-fil">Lecture · types{demo}</p>
      <h2 className="lc-nom">{tous.length} fichier{tous.length > 1 ? "s" : ""}</h2>
      <p className="lc-aide">{groupes.map(x => `${x.fichiers.length} ${NOM_TYPE[x.type]}`).join(" · ")}</p>
      <p className="lc-aide">Choisissez un type sur l’anneau.</p>
      <div className="lc-gestes"><button type="button" onClick={() => choisirFichiers(false, () => {})}>Ajouter</button></div>
    </AnneauChoix>;
  }
  const versTypes = { libelle: "Retour aux types", faire: () => aller({ k: "", n: "", l: "", a: "" }) };

  /* niveau 2 : les fichiers du type choisi */
  if (!fichier) {
    const choix: Choix[] = g.fichiers.map((x, i) => ({ cle: String(i), libelle: court(x.name), complet: x.name }));
    return <AnneauChoix choix={choix} actif={null} choisir={n => aller({ n, l: "", a: "" })} taille={taille} niveau={`Les fichiers ${NOM_LONG[g.type]}`} retour={versTypes}>
      <p className="lc-fil">Lecture · {NOM_TYPE[g.type]}{demo}</p>
      <h2 className="lc-nom">{g.fichiers.length} fichiers {NOM_TYPE[g.type]}</h2>
      <p className="lc-aide">Choisissez un fichier sur l’anneau.</p>
      <div className="lc-gestes"><button type="button" onClick={versTypes.faire}>Retour</button></div>
    </AnneauChoix>;
  }
  const versFichiers = unique ? versTypes : { libelle: "Retour aux fichiers", faire: () => aller({ n: "", l: "", a: "" }) };

  if (!lu) return <AnneauChoix choix={[]} actif={null} choisir={() => {}} taille={taille} niveau="Lecture en cours" retour={versFichiers}>
    <p className="lc-fil">Lecture · {NOM_TYPE[g.type]}</p><h2 className="lc-nom">{fichier.name}</h2><p className="lc-aide" role="status">Lecture du fichier…</p></AnneauChoix>;

  /* niveau 4 : agir */
  if (f.a === "agir") {
    const t = reconnaitre(fichier).transformations.filter(x => x.etat === "disponible" && x.chemin);
    const actions: Choix[] = [{ cle: "exporter", libelle: "Exporter", complet: "Exporter : télécharger une copie de l’original" },
      ...t.map(x => ({ cle: "t-" + x.id, libelle: "Transformer", complet: `Transformer : ${x.nom}` })),
      { cle: "relier", libelle: "Relier", complet: "Relier : dans ATLAS, hors du Studio" }];
    const faire = (k: string) => {
      if (k === "exporter") { const u = URL.createObjectURL(fichier), a = document.createElement("a"); a.href = u; a.download = fichier.name; a.click(); setTimeout(() => URL.revokeObjectURL(u), 4000); outils.dire(`Une copie de « ${fichier.name} » est téléchargée ; l’original est intact.`); }
      else if (k === "relier") outils.dire("Relier vit dans la Composition d’ATLAS (hors du Studio) : il n’est pas recopié ici.");
      else { const x = t.find(y => "t-" + y.id === k); if (x) outils.deployer(x.chemin!); }
    };
    return <AnneauChoix choix={actions} actif={null} choisir={faire} taille={taille} niveau={`Les actions sur ${fichier.name}`} retour={{ libelle: "Retour à la lecture", faire: () => aller({ a: "" }) }}>
      <p className="lc-fil">Agir · {NOM_TYPE[g.type]}{demo}</p><h2 className="lc-nom">{fichier.name}</h2>
      <ul className="lc-liste lc-actions">{actions.map(a => <li key={a.cle}>{a.complet}</li>)}</ul>
      <p className="lc-limite">Modifier et classer ne sont pas encore disponibles ici.</p>
      <div className="lc-gestes"><button type="button" onClick={() => aller({ a: "" })}>Retour</button></div>
    </AnneauChoix>;
  }

  /* niveau 3 : les lectures possibles ; le centre montre celle qui est choisie */
  const vue: Vue | null = lu.vues.includes(f.l as Vue) ? f.l as Vue : lu.vues[0] ?? null;
  const choix: Choix[] = [...lu.vues.map(v => ({ cle: v, libelle: NOM_VUE[v], complet: `Lire : ${NOM_VUE[v]}` })), { cle: "agir", libelle: "Agir", complet: "Agir sur ce fichier" }];
  return <AnneauChoix choix={choix} actif={vue} choisir={k => k === "agir" ? aller({ a: "agir" }) : aller({ l: k })} taille={taille} niveau={`Les lectures de ${fichier.name}`} retour={versFichiers}>
    <p className="lc-fil">Lecture · {NOM_TYPE[g.type]}{vue ? ` · ${NOM_VUE[vue]}` : ""}{demo}</p>
    <h2 className="lc-nom" title={fichier.name}>{fichier.name}</h2>
    {vue && <div className="lc-corps" tabIndex={0} aria-label={`${NOM_VUE[vue]} de ${fichier.name}`}><Corps lu={lu} vue={vue} /></div>}
    <p className="lc-mesures">{[poids(lu.octets), ...lu.mesures.slice(0, 2)].join(" · ")}</p>
    {lu.limites[0] && <p className="lc-limite">{lu.limites[0]}</p>}
    <div className="lc-gestes">
      <button type="button" onClick={versFichiers.faire}>Retour</button>
      {vue && <button type="button" onClick={() => outils.agrandir(<LectureGrande lu={lu} vue={vue} demo={estDemonstration()} />, `${NOM_VUE[vue]} · ${fichier.name}`)}>Agrandir</button>}
    </div>
  </AnneauChoix>;
}

function Corps({ lu, vue }: { lu: Lecture; vue: Vue }) {
  if (vue === "apercu") {
    if (lu.type === "html" && lu.page) return <div className="lc-cadre"><iframe className="lc-page" title={`Aperçu isolé de ${lu.nom} (aucun script exécuté)`} sandbox="" srcDoc={lu.page} /></div>;
    if (lu.type === "video" && lu.image) return <video className="lc-image" src={lu.image} controls aria-label={lu.nom} />;
    if (lu.image) return <img className="lc-image" src={lu.image} alt={lu.type === "pdf" ? `Page 1 de ${lu.nom}` : `L’image « ${lu.nom} », telle qu’importée`} />;
  }
  if (vue === "texte") return lu.texte ? <p className="lc-texte">{lu.texte}</p> : <p className="lc-limite">Aucun texte extrait.</p>;
  if (vue === "structure") return <><ul className="lc-liste lc-titres">{lu.titres.map((t, i) => <li key={i} data-niveau={t.niveau}>{t.texte}</li>)}</ul>
    {!lu.titres.length && <p className="lc-limite">Aucun titre trouvé.</p>}<ul className="lc-liste lc-mesures-liste">{lu.mesures.map(m => <li key={m}>{m}</li>)}</ul></>;
  if (vue === "liens") return lu.liens.length ? <ul className="lc-liste">{lu.liens.map((l, i) => <li key={i}><span>{l.texte}</span>{l.texte !== l.cible && <small>{l.cible}</small>}</li>)}</ul> : <p className="lc-limite">Aucun lien trouvé.</p>;
  if (vue === "source") return <pre className="lc-source"><code>{lu.source}</code></pre>;
  return null;
}

/** en grand : la même lecture, sans la compresser ; toutes les mesures et toutes les limites */
function LectureGrande({ lu, vue, demo }: { lu: Lecture; vue: Vue; demo: boolean }) {
  return <article className="pt-grand lc-grand"><p className="pt-sur">Lecture · {NOM_TYPE[lu.type as TypeFichier]} · {NOM_VUE[vue]}</p>{demo && <em className="dq-demo">démonstration</em>}
    <h2 className="pt-grand-titre">{lu.nom}</h2>
    <p className="pt-grand-aide">{[poids(lu.octets), ...lu.mesures].join(" · ")}</p>
    <div className="lc-grand-corps"><Corps lu={lu} vue={vue} /></div>
    {lu.limites.length > 0 && <><h3>Limites de la lecture</h3><ul className="pt-liste">{lu.limites.map(x => <li key={x}><span>{x}</span></li>)}</ul></>}
  </article>;
}
