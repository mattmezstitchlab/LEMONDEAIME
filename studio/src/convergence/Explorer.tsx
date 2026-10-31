/**
 * « Explorer les prototypes » : une seule page pour tout ouvrir, même ce qui est encore expérimental.
 * Chaque accès porte son statut, en mots (jamais la couleur seule).
 */
import { ACCES, AIDE_STATUTS, GROUPES, NOMS_STATUTS, type Statut } from "./acces";
import { useEffect, useState } from "react";
import { CREATIONS_ATLAS, verifierCreation, type EtatCreation, type ReferenceAtlas } from "../lib/atlas/reference";
import "../design/aime.css";
import "./convergence.css";

const VERSION = import.meta.env.VITE_CONVERGENCE_VERSION ?? "version candidate";

export default function Explorer() {
  return <main className="cv-explorer" data-aime="jour">
    <header className="cv-tete">
      <a className="cv-marque" href={import.meta.env.BASE_URL + "one/univers"}><span className="cv-orbe" aria-hidden="true" />.0NE</a>
      <span className="cv-version">{VERSION} · privée</span>
    </header>
    <section className="cv-intro">
      <p className="cv-sur">AIME — LUMIERE — ATLAS — RIPPLE — .0NE</p>
      <h1>Explorer les prototypes</h1>
      <p>Tout ce qui a été construit, au même endroit. Certaines interfaces sont expérimentales : chacune dit où elle en est.</p>
      <div className="cv-actions">
        <a className="cv-bouton cv-plein" href={import.meta.env.BASE_URL + "one/lumiere"}>Commencer par le film</a>
        <a className="cv-bouton" href={import.meta.env.BASE_URL + "one/premiere-rencontre"}>Aller à la Première rencontre</a>
        <a className="cv-bouton" href={import.meta.env.BASE_URL + "one/univers"}>Entrer dans .0NE</a>
      </div>
      <dl className="cv-legende">{(Object.keys(NOMS_STATUTS) as Statut[]).map(s => <div key={s}><dt><span className="cv-statut" data-statut={s}>{NOMS_STATUTS[s]}</span></dt><dd>{AIDE_STATUTS[s]}</dd></div>)}</dl>
    </section>
    {GROUPES.map(g => <section key={g.id} className="cv-groupe" aria-labelledby={"cv-" + g.id}>
      <h2 id={"cv-" + g.id}>{g.nom}</h2>
      <ul className="cv-grille">{ACCES.filter(a => a.groupe === g.id).map(a => {
        const externe = a.statut === "externe";
        const corps = <><span className="cv-statut" data-statut={a.statut}>{NOMS_STATUTS[a.statut]}</span>
          <b className="cv-nom">{a.nom}</b><span className="cv-phrase">{a.phrase}</span>
          {a.preuve && <span className="cv-preuve">{a.preuve}</span>}
          {externe && <span className="cv-preuve">S’ouvre dans un nouvel onglet ↗</span>}</>;
        return <li key={a.id} data-acces={a.id}>{a.chemin
          ? <a className="cv-carte" href={a.chemin} {...(externe ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{corps}</a>
          : <div className="cv-carte cv-inerte">{corps}</div>}</li>;
      })}</ul>
    </section>)}
    <section className="cv-groupe" aria-labelledby="cv-creations">
      <h2 id="cv-creations">Créations publiées dans ATLAS</h2>
      <p className="cv-phrase">Une composition d’ATLAS devient publique seulement par un geste volontaire. .0NE ne garde que sa référence et l’ouvre dans ATLAS, en lecture seule : rien n’est copié ici.</p>
      <ul className="cv-grille">{CREATIONS_ATLAS.map(r => <li key={r.id} data-creation={r.id}><CarteCreation r={r} /></li>)}</ul>
    </section>
    <footer className="cv-pied">
      <p>Version candidate privée : rien ici ne remplace encore le site public. Les réglages restent sur votre appareil. Aucun fichier audio original n’est en ligne.</p>
    </footer>
  </main>;
}

/** Une création ATLAS : sa référence est vérifiée, puis sa fiche publique dit si elle est publiée. */
function CarteCreation({ r }: { r: ReferenceAtlas }) {
  const [e, setE] = useState<EtatCreation | null>(null);
  useEffect(() => { let vivant = true; void verifierCreation(r).then(x => { if (vivant) setE(x); }); return () => { vivant = false; }; }, [r]);
  const corps = (statut: string, nom: string, phrase: string, preuve?: string) => <><span className="cv-statut" data-statut={e?.etat === "publiee" ? "externe" : "non-raccorde"}>{statut}</span>
    <b className="cv-nom">{nom}</b><span className="cv-phrase">{phrase}</span>{preuve && <span className="cv-preuve">{preuve}</span>}</>;
  if (!e) return <div className="cv-carte cv-inerte" aria-busy="true">{corps("Vérification…", r.titre ?? r.id, "Lecture de la fiche publique dans ATLAS.")}</div>;
  if (e.etat === "publiee") return <a className="cv-carte" href={e.url} target="_blank" rel="noopener noreferrer" data-etat="publiee">{corps("Publiée · ATLAS", e.titre, "Une composition née d’une demande, publiée volontairement. Elle s’ouvre dans ATLAS, en lecture seule.", "S’ouvre dans un nouvel onglet ↗")}</a>;
  return <div className="cv-carte cv-inerte" data-etat={e.etat}>{corps("Non disponible", r.titre ?? r.id, e.raison)}</div>;
}
