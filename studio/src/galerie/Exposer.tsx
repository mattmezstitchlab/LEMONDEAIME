/**
 * La feuille « Exposer » (lot G2) : un geste explicite, une fiche à remplir, deux cases jamais précochées.
 * Un compte AIME est requis ; un import tiers ne peut pas être exposé ; l'ouvrage privé ne change pas : on expose une copie.
 */
import { useEffect, useId, useRef, useState } from "react";
import { compteCourant, dansAime } from "../lib/aimeSync";
import type { Pattern } from "../lib/pattern";
import { apercuDe, contenuDe, exposable, exposer } from "./api";
import "../design/aime.css";
import "../design/aime-composants.css";
import "./Galerie.css";

const PSEUDO_CLE = "pointzero:galerie:pseudo";

export default function Exposer({ pattern, onFermer }: { pattern: Pattern; onFermer: () => void }) {
  const t = useId(), racine = useRef<HTMLDivElement>(null);
  const [compte, setCompte] = useState<string | null | undefined>(undefined);
  const [titre, setTitre] = useState(pattern.name || ""), [pseudo, setPseudo] = useState(() => { try { return localStorage.getItem(PSEUDO_CLE) || ""; } catch { return ""; } });
  const [description, setDescription] = useState(""), [histoire, setHistoire] = useState("");
  const [auteur, setAuteur] = useState(false), [publicOk, setPublicOk] = useState(false);
  const [etat, setEtat] = useState<{ envoi?: boolean; erreur?: string; id?: string }>({});
  /* la vignette tient sous la limite du serveur (160 000 caractères) : on réduit si le motif est très détaillé */
  const [apercu] = useState(() => { for (const cote of [480, 360, 240, 160]) { const a = apercuDe(pattern, cote); if (a.length <= 150_000) return a; } return apercuDe(pattern, 120); });
  const vide = !Array.from(pattern.cross).some(n => n >= 0), tiers = !exposable(pattern);
  useEffect(() => { void compteCourant().then(setCompte); }, []);
  useEffect(() => { racine.current?.querySelector<HTMLElement>("input, button, a")?.focus(); }, [compte]);

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault(); setEtat({ envoi: true });
    try { localStorage.setItem(PSEUDO_CLE, pseudo.trim()); } catch { /* rien */ }
    const r = await exposer({ titre, pseudo, description, histoire, contenu: contenuDe(pattern), apercu, attestations: { auteur, public: publicOk } });
    setEtat(r.ok ? { id: r.id } : { erreur: r.raison });
  };
  const lien = (id: string) => import.meta.env.BASE_URL + "galerie?id=" + id;

  return <div className="ga-voile" onKeyDown={e => { if (e.key === "Escape") onFermer(); }}>
    <div ref={racine} data-aime="jour" className="ga-feuille" role="dialog" aria-modal="true" aria-labelledby={t}>
      <header className="ga-feuille-tete"><h2 id={t}>Exposer dans la Galerie des Vivants</h2><button type="button" className="aime-btn aime-btn--secondaire aime-btn--petit" onClick={onFermer}>Fermer</button></header>
      {!dansAime() || compte === null ? <div className="ga-feuille-corps">
        <p className="ga-note">Exposer demande un compte AIME : votre œuvre est rattachée à votre compte, et vous pouvez la retirer à tout moment.</p>
        {dansAime() && <a className="aime-btn aime-btn--primaire" href="/entrer">Entrer dans AIME</a>}
      </div> : compte === undefined ? <p className="ga-note ga-feuille-corps">Un instant…</p>
      : tiers ? <p className="ga-note ga-feuille-corps" role="alert">Ce motif vient d’un patron importé (PDF, OXS), d’une œuvre de la galerie ou d’une démonstration : il est pour votre usage personnel et ne peut pas être exposé.</p>
      : vide ? <p className="ga-note ga-feuille-corps" role="alert">Ce motif est encore vide : brodez quelques points avant de l’exposer.</p>
      : etat.id ? <div className="ga-feuille-corps" role="status">
        <p className="ga-titre-ok">Votre œuvre est exposée.</p>
        <p className="ga-note">Une copie est exposée ; votre ouvrage reste le vôtre, dans Mes ouvrages. Vous pouvez la retirer à tout moment depuis la galerie (« Mes œuvres »).</p>
        <a className="aime-btn aime-btn--primaire" href={lien(etat.id)}>Voir dans la galerie</a>
      </div>
      : <form className="ga-feuille-corps ga-form" onSubmit={envoyer}>
        <div className="ga-apercu-petit"><img src={apercu} alt={`Aperçu : ${pattern.w} × ${pattern.h} points`} /></div>
        <div className="aime-champ"><label htmlFor={t + "titre"}>Titre</label><input id={t + "titre"} required maxLength={120} value={titre} onChange={e => setTitre(e.target.value)} /></div>
        <div className="aime-champ"><label htmlFor={t + "pseudo"}>Pseudonyme d’artiste</label><input id={t + "pseudo"} required maxLength={40} value={pseudo} onChange={e => setPseudo(e.target.value)} aria-describedby={t + "pseudo-aide"} />
          <span className="aime-aide" id={t + "pseudo-aide"}>C’est le seul nom montré. Votre e-mail n’apparaît jamais.</span></div>
        <div className="aime-champ"><label htmlFor={t + "desc"}>Description (facultative)</label><textarea id={t + "desc"} rows={2} maxLength={600} value={description} onChange={e => setDescription(e.target.value)} /></div>
        <div className="aime-champ"><label htmlFor={t + "hist"}>Son histoire (facultative)</label><textarea id={t + "hist"} rows={3} maxLength={1200} value={histoire} onChange={e => setHistoire(e.target.value)} /></div>
        <label className="aime-case"><input type="checkbox" checked={auteur} onChange={e => setAuteur(e.target.checked)} /> Je suis l’auteur de ce motif, ou j’ai le droit de le montrer.</label>
        <label className="aime-case"><input type="checkbox" checked={publicOk} onChange={e => setPublicOk(e.target.checked)} /> J’accepte qu’il soit visible par tous, avec mon pseudonyme.</label>
        <p className="ga-note">Exposer ne donne à personne le droit de reproduire ni de vendre votre motif. Un visiteur peut seulement l’ouvrir dans son atelier, pour son usage personnel.</p>
        {etat.erreur && <p className="aime-erreur" role="alert">{etat.erreur}</p>}
        <div className="ga-ligne"><button type="submit" className="aime-btn aime-btn--primaire" disabled={!auteur || !publicOk || !titre.trim() || !pseudo.trim() || etat.envoi}>{etat.envoi ? "Envoi…" : "Exposer"}</button>
          <button type="button" className="aime-btn aime-btn--secondaire" onClick={onFermer}>Annuler</button></div>
      </form>}
    </div>
  </div>;
}
