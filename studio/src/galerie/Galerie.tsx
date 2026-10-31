/**
 * La Galerie des Vivants (lots G3 à G5) : un mur d'œuvres exposées, lisible sans compte, et la fiche de chaque œuvre.
 * Socle AIME (Jour). Le cœur est un bouton à bascule ; les votes sont visibles par tous (décision de Matt) ; on ne vote pas pour soi.
 * « Signaler » pour tout le monde ; « Ouvrir dans le Cadre » copie l'œuvre dans l'atelier du visiteur, pour son usage personnel.
 * Les textes libres sont affichés comme du texte, jamais comme du HTML. Aucun e-mail, aucun identifiant de compte.
 */
import { useCallback, useEffect, useId, useState } from "react";
import { compteCourant } from "../lib/aimeSync";
import { lireCode } from "../lib/motif5d/code";
import Sceau from "../components/Sceau";
import "../design/aime-composants.css";
import "./Galerie.css";
import { cm, lireFiche, lireGalerie, lireMiennes, nomDuFil, retirer, signaler, voter, type Oeuvre } from "./api";

const BASE = import.meta.env.BASE_URL;
const lienFiche = (id: string) => BASE + "galerie?id=" + id;
const idDeAdresse = () => { try { const v = new URLSearchParams(window.location.search).get("id"); return v && /^[a-z0-9]{12}$/.test(v) ? v : null; } catch { return null; } };
const vueDeAdresse = () => { try { return new URLSearchParams(window.location.search).get("vue") === "miennes" ? "miennes" : "mur"; } catch { return "mur"; } };

function Coeur({ o, compte, surVote }: { o: Oeuvre; compte: string | null; surVote: (o: Oeuvre) => void }) {
  const [dit, setDit] = useState("");
  const basculer = async () => {
    if (!compte) { setDit("Entrez dans AIME pour donner votre cœur."); return; }
    if (o.mienne) { setDit("On ne vote pas pour sa propre œuvre."); return; }
    const r = await voter(o.id, !o.jaiVote);
    if (r.ok) { surVote({ ...o, votes: r.votes, jaiVote: r.jaiVote }); setDit(r.jaiVote ? "Votre cœur est donné." : "Votre cœur est retiré."); } else setDit(r.raison);
  };
  return <span className="ga-coeur-hote">
    <button type="button" className="ga-coeur" aria-pressed={!!o.jaiVote} disabled={!!o.mienne} onClick={basculer}
      aria-label={`${o.jaiVote ? "Retirer mon cœur" : "Donner mon cœur"} — ${o.votes} ${o.votes > 1 ? "cœurs" : "cœur"}`}>
      <span aria-hidden="true">{o.jaiVote ? "♥" : "♡"}</span><span aria-hidden="true">{o.votes}</span></button>
    <span className="ga-cache" role="status">{dit}</span>
  </span>;
}

function Carte({ o, compte, surVote, ouvrir }: { o: Oeuvre; compte: string | null; surVote: (o: Oeuvre) => void; ouvrir: (id: string) => void }) {
  return <div className="ga-carte">
    <a href={lienFiche(o.id)} onClick={e => { e.preventDefault(); ouvrir(o.id); }} className="ga-carte-lien" aria-label={`${o.titre}, par ${o.pseudo}`}>
      <span className="ga-carte-image"><img src={o.apercu} alt="" loading="lazy" /></span>
    </a>
    <div className="ga-cartel">
      <div><p className="ga-cartel-titre">{o.titre}</p><p className="ga-cartel-sous">{o.pseudo} · {o.w} × {o.h} points · {o.fils.length} fils</p></div>
      <Coeur o={o} compte={compte} surVote={surVote} />
    </div>
    {o.statut === "masquee" && <p className="aime-etat aime-etat--erreur">Masquée par l’équipe</p>}
  </div>;
}

function Signaler({ id }: { id: string }) {
  const t = useId(), [ouvert, setOuvert] = useState(false), [raison, setRaison] = useState<"droits" | "contenu" | "autre">("droits"), [texte, setTexte] = useState(""), [fait, setFait] = useState("");
  if (fait) return <p className="ga-note" role="status">{fait}</p>;
  if (!ouvert) return <button type="button" className="ga-lien" onClick={() => setOuvert(true)}>Signaler cette œuvre</button>;
  return <form className="ga-signaler" onSubmit={async e => { e.preventDefault(); const r = await signaler(id, raison, texte); setFait(r.ok ? "Merci : l’équipe va regarder. L’œuvre reste visible tant qu’elle n’a pas été examinée." : r.raison); }}>
    <fieldset><legend>Pourquoi ?</legend>
      {([["droits", "Ce motif n’appartient pas à cette personne"], ["contenu", "Contenu choquant ou inapproprié"], ["autre", "Autre raison"]] as const).map(([v, nom]) =>
        <label key={v} className="aime-case"><input type="radio" name={t} checked={raison === v} onChange={() => setRaison(v)} /> {nom}</label>)}
    </fieldset>
    <div className="aime-champ"><label htmlFor={t + "t"}>Précisions (facultatives)</label><textarea id={t + "t"} rows={2} maxLength={300} value={texte} onChange={e => setTexte(e.target.value)} /></div>
    <div className="ga-ligne"><button type="submit" className="aime-btn aime-btn--primaire aime-btn--petit">Envoyer le signalement</button><button type="button" className="aime-btn aime-btn--secondaire aime-btn--petit" onClick={() => setOuvert(false)}>Annuler</button></div>
  </form>;
}

function Fiche({ id, compte, retour }: { id: string; compte: string | null; retour: () => void }) {
  const [o, setO] = useState<Oeuvre | null>(null), [erreur, setErreur] = useState("");
  useEffect(() => { let vivant = true; void lireFiche(id).then(r => { if (!vivant) return; if (r.ok) { setO(r.oeuvre); document.title = `${r.oeuvre.titre} — Galerie des Vivants`; } else setErreur(r.raison); }); return () => { vivant = false; }; }, [id]);
  if (erreur) return <div className="ga-section"><p className="ga-note" role="alert">{erreur}</p><button type="button" className="aime-btn aime-btn--secondaire" onClick={retour}>Revenir à la galerie</button></div>;
  if (!o) return <p className="ga-section ga-note">Un instant…</p>;
  const recette = o.recette ? lireCode(o.recette) : null;
  return <article className="ga-fiche" aria-labelledby="ga-fiche-titre">
    <button type="button" className="ga-lien ga-retour" onClick={retour}>← La galerie</button>
    <div className="ga-fiche-grille">
      <div className="aime-cadre ga-fiche-cadre"><div className="aime-cadre-media ga-fiche-image"><img src={o.apercu} alt={`${o.titre} : motif de point de croix, ${o.w} × ${o.h} points, ${o.fils.length} fils DMC`} /></div></div>
      <div className="ga-fiche-texte">
        <p className="aime-sur">Galerie des Vivants</p>
        <h1 id="ga-fiche-titre" className="ga-fiche-h1">{o.titre}</h1>
        <p className="ga-fiche-par">par <b>{o.pseudo}</b></p>
        <div className="ga-ligne"><Coeur o={o} compte={compte} surVote={setO} /></div>
        {o.description && <p className="ga-fiche-desc">{o.description}</p>}
        {o.histoire && <><h2 className="ga-h2">Son histoire</h2><p className="ga-fiche-histoire">{o.histoire}</p></>}
        <h2 className="ga-h2">Le motif</h2>
        <p className="ga-note">{o.w} × {o.h} points · environ {cm(o.w)} × {cm(o.h)} cm sur toile Aida 14 · {o.fils.length} fils DMC</p>
        <ul className="ga-fils" aria-label="Les fils DMC du motif">{o.fils.map(code => { const f = nomDuFil(code); return <li key={code}><span className="ga-pastille" style={{ background: f?.hex ?? "#ccc" }} aria-hidden="true" />DMC {code}{f ? ` · ${f.name}` : ""}</li>; })}</ul>
        {recette && <div className="ga-sceau"><Sceau signature={recette.signature} graine={recette.graine} taille={96} /><p className="ga-note">Empreinte du motif : <code>{o.recette}</code> (une recette du moteur 5D, pas une garantie).</p></div>}
        <div className="ga-actions">
          <a className="aime-btn aime-btn--primaire" href={BASE + "atelier?galerie=" + o.id}>Ouvrir dans mon atelier</a>
          <button type="button" className="aime-btn aime-btn--secondaire" onClick={() => { void navigator.clipboard?.writeText(window.location.origin + lienFiche(o.id)); }}>Copier le lien</button>
        </div>
        <p className="ga-note ga-droits">Ouvrir dans votre atelier crée une copie pour votre usage personnel, avec le nom de l’artiste. Exposer ne donne aucun droit de reproduire ni de vendre ce motif.</p>
        {!o.mienne && <Signaler id={o.id} />}
      </div>
    </div>
  </article>;
}

export default function Galerie() {
  const [compte, setCompte] = useState<string | null>(null), [id, setId] = useState<string | null>(idDeAdresse), [vue, setVue] = useState<"mur" | "miennes">(vueDeAdresse);
  const [oeuvres, setOeuvres] = useState<Oeuvre[] | null>(null), [erreur, setErreur] = useState("");
  useEffect(() => { void compteCourant().then(setCompte); }, []);
  const charger = useCallback(() => {
    setOeuvres(null); setErreur("");
    void (vue === "miennes" ? lireMiennes() : lireGalerie()).then(r => { if (r.ok) setOeuvres(r.oeuvres); else setErreur(r.raison); });
  }, [vue]);
  useEffect(() => { if (!id) { charger(); document.title = "Galerie des Vivants — Point Zéro"; } }, [id, charger, compte]);
  useEffect(() => { const pop = () => { setId(idDeAdresse()); setVue(vueDeAdresse()); }; window.addEventListener("popstate", pop); return () => window.removeEventListener("popstate", pop); }, []);
  const aller = (suite: { id?: string | null; vue?: "mur" | "miennes" }) => {
    const u = new URL(window.location.href); u.search = "";
    if (suite.id) u.searchParams.set("id", suite.id); else if (suite.vue === "miennes") u.searchParams.set("vue", "miennes");
    window.history.pushState(null, "", u.pathname + u.search); setId(suite.id ?? null); if (suite.vue) setVue(suite.vue); window.scrollTo(0, 0);
  };
  const remplacer = (o: Oeuvre) => setOeuvres(l => l?.map(x => x.id === o.id ? o : x) ?? l);

  return <div data-aime="jour" className="ga aime-scene">
    <header className="ga-tete">
      <a className="ga-marque" href={BASE + "atelier"}><span className="aime-point" aria-hidden="true" />Point Zéro</a>
      <nav className="aime-nav" aria-label="Galerie">
        <a href={BASE + "galerie"} aria-current={!id && vue === "mur" ? "page" : undefined} onClick={e => { e.preventDefault(); aller({ vue: "mur" }); }}>La galerie</a>
        {compte && <a href={BASE + "galerie?vue=miennes"} aria-current={!id && vue === "miennes" ? "page" : undefined} onClick={e => { e.preventDefault(); aller({ vue: "miennes" }); }}>Mes œuvres</a>}
        <a href={BASE + "atelier"}>L’atelier</a>
      </nav>
      <span />
    </header>
    <main>
      {id ? <Fiche id={id} compte={compte} retour={() => aller({ vue: "mur" })} /> : <section className="ga-section" aria-labelledby="ga-titre">
        <p className="aime-sur">Point Zéro</p>
        <h1 id="ga-titre" className="aime-titre ga-titre">{vue === "miennes" ? <>Mes œuvres <span className="aime-fondu">exposées.</span></> : <>La Galerie <span className="aime-fondu">des Vivants.</span></>}</h1>
        <p className="aime-chapo">{vue === "miennes" ? "Les œuvres que vous avez exposées. Retirer une œuvre la fait disparaître de la galerie, avec ses cœurs ; votre ouvrage reste dans Mes ouvrages." : "Des motifs dessinés et exposés par celles et ceux qui brodent avec Point Zéro. Chaque œuvre s’ouvre dans votre atelier, pour votre usage personnel."}</p>
        {erreur && <><p className="ga-note" role="alert">{erreur}</p>
          <p className="ga-note">La galerie s’ouvrira avec les comptes. En attendant, l’atelier fonctionne sans compte : vos ouvrages restent sur cet appareil.</p>
          <a className="aime-btn aime-btn--primaire" href={BASE + "atelier"}>Ouvrir l’atelier</a></>}
        {!oeuvres && !erreur && <p className="ga-note">Un instant…</p>}
        {oeuvres && oeuvres.length === 0 && <p className="ga-note">{vue === "miennes" ? "Vous n’avez encore rien exposé. Dans l’atelier : Partager, puis Exposer." : "Aucune œuvre exposée pour l’instant. La première pourrait être la vôtre : dans l’atelier, Partager, puis Exposer."}</p>}
        {oeuvres && oeuvres.length > 0 && <ul className="ga-mur">{oeuvres.map(o => <li key={o.id} className="ga-mur-case">
          <Carte o={o} compte={compte} surVote={remplacer} ouvrir={x => aller({ id: x })} />
          {vue === "miennes" && <button type="button" className="aime-btn aime-btn--danger aime-btn--petit" onClick={async () => { const r = await retirer(o.id); if (r.ok) setOeuvres(l => l?.filter(x => x.id !== o.id) ?? l); else setErreur(r.raison); }}>Retirer de la galerie</button>}
        </li>)}</ul>}
      </section>}
    </main>
  </div>;
}
