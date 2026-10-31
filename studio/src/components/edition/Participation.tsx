/**
 * La participation : l'Orbe, les cinq rencontres, « Ma rosace » qui suit la visite, et le cadeau.
 * Un dialogue déterministe (pas d'IA) : des phrases courtes, quatre réponses visibles, un historique, une reprise.
 * Chaque réponse est un geste explicite ; le défilement ne choisit jamais. Chaque aperçu est calculé par le vrai moteur 5D,
 * à la taille du compositeur de l'atelier : la même recette redonne le même motif ici et dans l'atelier.
 */
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { CLES, DIMENSIONS, type Choix, type Signature } from "../../lib/motif5d/code";
import { FLOSS } from "../../lib/dmc";
import Sceau from "../Sceau";
import type { ModePoint } from "../../lib/point/modes";
import { codeDeCreation, complete, creation, dimensionDe, graineDe, nbChoix, OFFERTE_CLE, PROVISOIRE, reponseDe, signatureDe, useCreation } from "./creation";
import { peindre, rosaceDe, type Rosace } from "./rosace";
import { mouvementReduit } from "./defilement";
import { ORIGINE, remplir, useContenus, type Contenus } from "./contenus";

/* ——— Les mots de l'Orbe, liés aux chapitres et aux cinq dimensions exactes du moteur ——— */
export interface Rencontre { cle: keyof Signature; num: number; id: string; titre: string; question: string; reaction: (rep: string) => string }
/* l'ordre, les clés et les ancres restent dans le code ; les mots viennent des contenus (Bureau éditorial) */
const ORDRE: { cle: keyof Signature; id: string }[] = [
  { cle: "structure", id: "or-forme" }, { cle: "trace", id: "or-lignes" }, { cle: "echelle", id: "or-finesse" }, { cle: "palette", id: "or-couleurs" }, { cle: "densite", id: "or-plein" },
];
export const rencontresDe = (c: Contenus): Rencontre[] => ORDRE.map((o, k) => { const m = c.rencontres[o.cle];
  return { ...o, num: k + 1, titre: m.titre, question: m.question, reaction: rep => remplir(m.reaction, { reponse: rep }) }; });
export const RENCONTRES: Rencontre[] = rencontresDe(ORIGINE);
export function useRencontres() { const c = useContenus(); return useMemo(() => rencontresDe(c), [c]); }
const rencontreDe = (liste: Rencontre[], cle: keyof Signature) => liste.find(r => r.cle === cle)!;

/** La sphère nacrée de l'Orbe : la même que le centre du Point. */
export function Orbe({ taille = 64, parle }: { taille?: number; parle?: boolean }) {
  return <span className={"or-sphere" + (parle ? " or-parle" : "")} style={{ width: taille, height: taille }} aria-hidden="true" />;
}

/** Un aperçu réel : la rosace du moteur, peinte dans un canevas. */
export function Apercu({ r, className, fond, label }: { r: Rosace; className?: string; fond?: string; label?: string }) {
  const cv = useRef<HTMLCanvasElement>(null);
  useEffect(() => { peindre(cv.current, r, fond); const f = () => peindre(cv.current, r, fond); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, [r, fond]);
  return <canvas ref={cv} className={className} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} />;
}

/** Les quatre aperçus d'une dimension : la création du moment, avec chacune des quatre réponses. */
function useQuatre(cle: keyof Signature) {
  const c = useCreation(), base = signatureDe(c), g = graineDe(c);
  return useMemo(() => ([0, 1, 2, 3] as Choix[]).map(k => rosaceDe({ ...base, [cle]: k }, g)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cle, g, base.structure, base.trace, base.densite, base.echelle, base.palette]);
}

/** Quatre réponses, comme un groupe de boutons radio : flèches pour passer, Entrée ou Espace pour choisir. */
function Reponses({ cle, variante, children }: { cle: keyof Signature; variante: string; children: (k: Choix, r: Rosace) => ReactNode }) {
  const c = useCreation(), quatre = useQuatre(cle), d = dimensionDe(cle), choisi = c.choix[cle];
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const focal = choisi ?? 0;
  const touche = (e: KeyboardEvent, k: number) => {
    const pas = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (!pas) return;
    e.preventDefault(); refs.current[(k + pas + 4) % 4]?.focus();
  };
  return <div className={"or-reponses or-" + variante} role="radiogroup" aria-label={`${d.nom} : ${d.question}`}>
    {([0, 1, 2, 3] as Choix[]).map(k => { const [nom, phrase] = d.reponses[k];
      return <button key={k} ref={el => { refs.current[k] = el; }} type="button" role="radio" aria-checked={choisi === k} tabIndex={k === focal ? 0 : -1}
        aria-label={`${nom} : ${phrase}`} className="or-reponse" data-reponse={`${cle}-${k}`} onKeyDown={e => touche(e, k)} onClick={() => creation.choisir(cle, k)}>
        {children(k, quatre[k])}
        <span className="or-nom">{nom}</span><span className="or-phrase">{phrase}</span>
      </button>; })}
  </div>;
}

/** Une rencontre avec l'Orbe : la question, quatre réponses visibles, la réaction. Variantes : cartes, loupes, écheveaux, curseur. */
export function RencontreOrbe({ cle, variante, sombre, compacte }: { cle: keyof Signature; variante: "cartes" | "loupes" | "echeveaux" | "curseur"; sombre?: boolean; compacte?: boolean }) {
  const c = useCreation(), r = rencontreDe(useRencontres(), cle), choisi = c.choix[cle];
  const titre = useId();
  const reaction = choisi !== undefined ? r.reaction(reponseDe(cle, choisi)[0]) : "";
  return <section id={r.id} className={"or-rencontre" + (sombre ? " or-sombre" : "") + (compacte ? " or-compacte" : "")} aria-labelledby={titre} data-rencontre={cle}>
    <div className="or-tete">
      <Orbe taille={compacte ? 44 : 64} parle={choisi === undefined} />
      <div>
        <p className="or-kicker" id={titre}>Rencontre {r.num} sur 5 · {r.titre}</p>
        <p className="or-question">{r.question}</p>
      </div>
    </div>
    <Reponses cle={cle} variante={variante}>
      {(k, ro) => variante === "echeveaux"
        ? <span className="or-fils" aria-hidden="true">{ro.cases.length ? [...new Set(ro.cases.map(x => x.f))].slice(0, 6).map(f => <i key={f} style={{ background: FLOSS[f]?.hex }} />) : null}<Apercu r={ro} className="or-mini" /></span>
        : variante === "curseur"
          ? <span className="or-jauge" aria-hidden="true"><i style={{ width: [25, 50, 75, 100][k] + "%" }} /></span>
          : <span className={variante === "loupes" ? "or-lentille" : "or-carte"}><Apercu r={ro} className="or-apercu" fond={variante === "loupes" ? "#f7f4ec" : undefined} /></span>}
    </Reponses>
    <p className="or-reaction" role="status" aria-live="polite">{reaction}</p>
  </section>;
}

/** La rencontre « Les lignes », dans le disque : le même Point, quatre secteurs, chacun avec son aperçu réel. */
export function useCommandesTrace(): ModePoint[] {
  const c = useCreation(), quatre = useQuatre("trace"), d = dimensionDe("trace");
  const [images, setImages] = useState<string[]>([]);
  useEffect(() => {
    const out: string[] = [];
    for (const ro of quatre) { const cv = document.createElement("canvas"); cv.style.cssText = "position:fixed;left:-9999px;top:0;width:88px;height:88px"; const ctx = cv.getContext?.("2d"); if (!ctx) return; document.body.appendChild(cv); peindre(cv, ro); out.push(cv.toDataURL()); cv.remove(); }
    setImages(out);
  }, [quatre]);
  return ([0, 1, 2, 3] as Choix[]).map(k => ({ id: "trace-" + k, nom: d.reponses[k][0], aide: d.reponses[k][1], groupe: "metier", actif: c.choix.trace === k, resteOuvert: true,
    icone: images[k] ? <img src={images[k]} alt="" className="or-icone-apercu" /> : undefined, annonceEnPropre: true,
    ouvrir: () => creation.choisir("trace", k) }));
}

/* ——— « Ma rosace » : l'aperçu permanent et discret, l'historique, la reprise ——— */
export function MaRosace({ aller, guide }: { aller: (id: string) => void; guide: () => void }) {
  const c = useCreation(), n = nbChoix(c), s = signatureDe(c), ro = useMemo(() => rosaceDe(s, graineDe(c)), [s.structure, s.trace, s.densite, s.echelle, s.palette, c.graine]); // eslint-disable-line react-hooks/exhaustive-deps
  const [ouvert, setOuvert] = useState(false), [recommencer, setRecommencer] = useState(false);
  const bouton = useRef<HTMLButtonElement>(null), panneau = useRef<HTMLDivElement>(null), id = useId();
  const RENCONTRES = useRencontres();
  useEffect(() => { if (ouvert) panneau.current?.querySelector<HTMLElement>("h2")?.focus(); }, [ouvert]);
  if (!n) return null;
  const fermer = () => { setOuvert(false); setRecommencer(false); bouton.current?.focus(); };
  const suivante = RENCONTRES.find(r => c.choix[r.cle] === undefined);
  return <div className="or-ma" data-ouvert={ouvert ? "oui" : "non"}>
    {ouvert && <div ref={panneau} id={id} className="or-panneau" role="dialog" aria-modal="false" aria-labelledby={id + "-t"} onKeyDown={e => { if (e.key === "Escape") { e.stopPropagation(); fermer(); } }}>
      <div className="or-panneau-tete"><Orbe taille={36} /><h2 id={id + "-t"} tabIndex={-1}>Ma rosace</h2><button type="button" className="or-fermer" onClick={fermer} aria-label="Fermer Ma rosace">×</button></div>
      <Apercu r={ro} className="or-grand" label={`Votre rosace, ${n} choix sur 5 : ${DIMENSIONS.map(d => (c.choix[d.cle] === undefined ? "provisoire " : "") + d.reponses[s[d.cle]][0].toLowerCase()).join(", ")}`} />
      <ul className="or-choix">{RENCONTRES.map(r => { const k = c.choix[r.cle];
        return <li key={r.cle} data-etat={k === undefined ? "provisoire" : "choisi"}><span className="or-choix-dim">{dimensionDe(r.cle).nom}</span>
          <span className="or-choix-val">{k === undefined ? <>pas encore choisi <small>(aperçu provisoire : {reponseDe(r.cle, PROVISOIRE[r.cle])[0].toLowerCase()})</small></> : reponseDe(r.cle, k)[0]}</span>
          <button type="button" className="or-lien" onClick={() => { fermer(); aller(r.id); }}>{k === undefined ? "Choisir" : "Modifier"}</button></li>; })}</ul>
      {c.historique.length > 0 && <details className="or-histoire"><summary>Notre conversation ({c.historique.length})</summary>
        <ol>{c.historique.map((e, i) => <li key={i}><span>L’Orbe : {rencontreDe(RENCONTRES, e.cle).titre.toLowerCase()} ?</span><b>Vous : {reponseDe(e.cle, e.k)[0]}</b></li>)}</ol></details>}
      <div className="or-actions">
        {suivante ? <button type="button" className="or-btn" onClick={() => { fermer(); aller(suivante.id); }}>Reprendre : {suivante.titre.toLowerCase()}</button>
          : <button type="button" className="or-btn" onClick={() => { fermer(); aller("ed-cadeau"); }}>Voir mon cadeau</button>}
        <button type="button" className="or-btn or-btn-clair" onClick={() => { fermer(); guide(); }}>Guide de l’atelier</button>
        {recommencer ? <button type="button" className="or-btn or-btn-clair" onClick={() => { creation.oublier(); fermer(); }}>Oui, tout effacer</button>
          : <button type="button" className="or-btn or-btn-clair" onClick={() => setRecommencer(true)}>Recommencer</button>}
      </div>
      <p className="or-note">Gardée dans ce navigateur, sur cet appareil{creation.enregistrable() ? "" : " (ce navigateur refuse : seulement pour cette visite)"}.</p>
    </div>}
    <button ref={bouton} type="button" className="or-pastille" aria-expanded={ouvert} aria-controls={id} onClick={() => ouvert ? fermer() : setOuvert(true)}
      aria-label={`Ma rosace : ${n} choix sur 5. ${ouvert ? "Fermer" : "Ouvrir l’aperçu, l’historique et la reprise"}`}>
      <Apercu r={ro} className="or-pastille-apercu" />
      <span className="or-pastille-sceau" aria-hidden="true"><Sceau signature={c.choix} faits={n} taille={30} /></span>
      <span className="or-pastille-mot">Ma rosace <b>{n}/5</b></span>
    </button>
  </div>;
}

/* ——— Le cadeau : la rosace achevée, offerte, ouverte dans l'atelier ——— */
export function Cadeau({ aller, appareils }: { aller: (id: string) => void; appareils?: ReactNode }) {
  const c = useCreation(), s = signatureDe(c), n = nbChoix(c), fini = complete(c), code = codeDeCreation(c);
  const ro = useMemo(() => rosaceDe(s, graineDe(c)), [s.structure, s.trace, s.densite, s.echelle, s.palette, c.graine]); // eslint-disable-line react-hooks/exhaustive-deps
  const grand = useRef<HTMLCanvasElement>(null);
  const RENCONTRES = useRencontres(), T = useContenus().cadeau;
  const [telecharge, setTelecharge] = useState("");
  useEffect(() => { peindre(grand.current, ro); const f = () => peindre(grand.current, ro); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, [ro]);
  const manquent = RENCONTRES.filter(r => c.choix[r.cle] === undefined);
  const ouvrir = () => { try { localStorage.removeItem(OFFERTE_CLE); } catch { /* rien */ } window.location.assign(import.meta.env.BASE_URL + "atelier?offerte=" + encodeURIComponent(code)); };
  const image = () => {
    const cv = document.createElement("canvas"), w = ro.w * 16, h = ro.h * 16; cv.style.cssText = `position:fixed;left:-99999px;top:0;width:${w}px;height:${h}px`;
    document.body.appendChild(cv); peindre(cv, ro); cv.remove();
    cv.toBlob?.(b => { if (!b) return; const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `ma-rosace-${code.replace(/[^\w.-]/g, "")}.png`; document.body.appendChild(a); a.click(); a.remove(); setTelecharge(`Image téléchargée : ${a.download}`); });
  };
  return <section id="ed-cadeau" className="ed-cadeau" aria-labelledby="ed-cadeau-titre" data-fini={fini ? "oui" : "non"}>
    <div className="cd-scene">
      <div className="cd-objet">
        <Orbe taille={mouvementReduit() ? 96 : 120} />
        <canvas ref={grand} className="cd-rosace" role="img" aria-label={`Votre rosace : ${DIMENSIONS.map(d => d.reponses[s[d.cle]][0].toLowerCase()).join(", ")}. ${ro.fils} fils DMC, ${ro.w} × ${ro.h} points.`} />
      </div>
      <div className="cd-texte">
        <p className="ed-num">{T.kicker}</p>
        {fini ? <>
          <h2 id="ed-cadeau-titre" tabIndex={-1}>{T.titreFini}</h2>
          <p className="cd-orbe"><Orbe taille={22} />{T.orbeFini}</p>
          <p>{T.texteFini}</p>
        </> : <>
          <h2 id="ed-cadeau-titre" tabIndex={-1}>{n ? T.titreEnCours : T.titreVide}</h2>
          <p className="cd-orbe"><Orbe taille={22} />{n ? remplir(T.orbeEnCours, { n: manquent.length }) : T.orbeVide}</p>
          <ul className="cd-manque">{manquent.map(r => <li key={r.cle}><button type="button" className="or-lien" onClick={() => aller(r.id)}>{r.titre}</button></li>)}</ul>
          <button type="button" className="or-btn" onClick={() => creation.completer()}>{n ? remplir(T.boutonReste, { n: manquent.length }) : T.boutonVide}</button>
        </>}
        <p className="cd-recette"><code>{code}</code> · {ro.fils} fils DMC · {ro.w} × {ro.h} points</p>
        {fini && <div className="cd-actions">
          <button type="button" className="ed-cta" onClick={ouvrir}>Ouvrir ma rosace dans l’atelier</button>
          <button type="button" className="or-btn or-btn-clair" onClick={image}>Télécharger l’image</button>
        </div>}
        <span className="ed-cache" role="status" aria-live="polite">{telecharge}</span>
        <div className="cd-usages">
          {T.usages.map(u => <div key={u.titre}><p className="cd-usage-titre">{u.titre}</p><p>{u.texte}</p></div>)}
        </div>
        <p className="cd-note">{T.note}</p>
      </div>
    </div>
    {appareils}
  </section>;
}

/** Pour l'atelier : la recette passée par l'adresse, une seule fois. */
export const CHOIX_ORDONNES: (keyof Signature)[] = RENCONTRES.map(r => r.cle);
export { CLES };
