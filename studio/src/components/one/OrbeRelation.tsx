/**
 * L'Orbe relationnelle, au centre du Disque : elle manifeste le cycle Recevoir → Situer → (Demander) → Agir → Vérifier → Répondre.
 * - Présence : calme. Réception : une impulsion la rejoint. Contexte : elle dit ce qu'elle sait (et seulement cela).
 *   Clarification : une question. Action : elle s'efface quand le centre montre un fichier, un résultat Git, une onde (retrait).
 *   Écho : une réponse lumineuse ET écrite ; la preuve est affichée ; « Pourquoi ce signal ? » dit si c'est une donnée ou une illustration.
 * - Les points relationnels (deuxième couche, distincte des points des commandes) : chacun a une identité et un état.
 * - Toucher l'Orbe : choisir une intention (une couleur ET un mot) ; tout se fait aussi au clavier, sans son, sans animation, en liste.
 */
import { useEffect, useId, useRef, useState } from "react";
import { INTENTIONS, type Choix, type Intention, type Reponse } from "../../lib/orbe/relation";
import { lireOne } from "../../lib/one/preferences";
import type { EtatIndicateur } from "../../lib/point/indicateurs";
import "./OrbeRelation.css";

export interface PointRelationnel { id: string; nom: string; etat: EtatIndicateur }
const MOT: Record<Reponse["issue"], string> = { reussite: "vérifié", echec: "échec", refus: "non autorisé", confirmation: "votre accord", precision: "question", information: "information" };

export default function OrbeRelation({ reponse, evenement, onEvenement, points, occupe, retrait, onIntention, onChoix, onFermer }: {
  reponse: Reponse | null; evenement?: { titre: string; texte: string } | null; onEvenement?: (c: Choix) => void; points: PointRelationnel[]; occupe: boolean; retrait: boolean;
  onIntention: (i: Intention, texte?: string) => void; onChoix: (c: Choix) => void; onFermer: () => void;
}) {
  const [choisir, setChoisir] = useState(false), [pourquoi, setPourquoi] = useState(false), [texte, setTexte] = useState("");
  const [phase, setPhase] = useState<string>("presence");
  const id = useId(), orbe = useRef<HTMLButtonElement>(null);
  const liste = lireOne().presentation === "liste";
  const reduit = () => document.documentElement.dataset.pzMotion === "reduce" || !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  /* les phases défilent (Recevoir, Situer, …) ; en mouvement réduit : l'état final tout de suite, les étapes restent écrites */
  useEffect(() => {
    if (!reponse) { setPhase("presence"); return; }
    setPourquoi(false);
    const fin = reponse.etapes.at(-1)?.phase ?? "echo";
    if (reduit()) { setPhase(fin); return; }
    let k = 0; setPhase(reponse.etapes[0]?.phase ?? "reception");
    const t = window.setInterval(() => { k++; if (k >= reponse.etapes.length) { window.clearInterval(t); return; } setPhase(reponse.etapes[k].phase); }, 320);
    return () => window.clearInterval(t);
  }, [reponse]);
  const etat = occupe ? "action" : phase;
  const fermerChoix = () => { setChoisir(false); requestAnimationFrame(() => orbe.current?.focus()); };

  return <div className={"or" + (retrait && !choisir ? " or-retrait" : "") + (evenement ? " or-signal" : "")} data-phase={etat} data-issue={reponse?.issue ?? ""}>
    <div className="or-coeur">
      <button ref={orbe} type="button" className="or-orbe" aria-expanded={choisir} aria-controls={id + "-intentions"}
        aria-label={choisir ? "Fermer les intentions" : "L’Orbe : dire une intention (explorer, comprendre, créer, aide, signaler, plus simple)"} onClick={() => setChoisir(v => !v)}>
        <span className="or-nacre" aria-hidden="true" /><span className="or-impulsion" aria-hidden="true" />
      </button>
      {/* les points relationnels : une identité, un état, dits en mots (pas seulement en couleur) */}
      <ul className="or-points" aria-label="Points relationnels">{points.map((p, k) => <li key={p.id} data-id={p.id} data-etat={p.etat} style={{ ["--or-a" as string]: `${-90 + k * 52}deg` }}>
        <span className="or-point" aria-hidden="true" /><span className="sr-only">{p.nom}</span></li>)}</ul>
    </div>
    {choisir && <div id={id + "-intentions"} className={"or-intentions" + (liste ? " or-liste" : "")} role="group" aria-label="Choisir une intention"
      onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); fermerChoix(); } }}>
      {INTENTIONS.map(i => <button key={i.id} type="button" data-intention={i.id} onClick={() => { setChoisir(false); onIntention(i.id); }} title={i.aide}>
        <span className="or-couleur" style={{ background: i.couleur }} aria-hidden="true" />{i.nom}</button>)}
    </div>}
    {evenement && !choisir && <section className="or-evenement" aria-live="polite"><span className="or-marque" aria-hidden="true" />
      <p><b>{evenement.titre}</b> {evenement.texte}</p>
      <div className="or-choix"><button type="button" className="one-bouton" onClick={() => onEvenement?.({ id: "voir-diff", libelle: "Voir les différences" })}>Voir les différences</button>
        <button type="button" className="one-bouton" onClick={() => onEvenement?.({ id: "etat", libelle: "État du dépôt", commande: "git-status" })}>État du dépôt</button></div></section>}
    {reponse && !choisir && <section className="or-echo" data-issue={reponse.issue} data-compact={retrait && !pourquoi ? "oui" : undefined} aria-live="polite" aria-labelledby={id + "-titre"}>
      <p className="or-echo-tete"><span className="or-marque" aria-hidden="true" /><span className="or-mot">{MOT[reponse.issue]}</span>
        <button type="button" className="or-fermer" aria-label="Fermer la réponse de l’Orbe" onClick={onFermer}>×</button></p>
      <p id={id + "-titre"} className="or-titre">{reponse.titre}</p>
      {reponse.texte && <p className="or-texte">{reponse.texte}</p>}
      {reponse.preuve && <p className="or-preuve">Preuve : {reponse.preuve}</p>}
      {reponse.issue === "precision" && reponse.question === "Votre signalement"
        ? <form className="or-saisie" onSubmit={e => { e.preventDefault(); if (texte.trim()) { onIntention("signaler", texte.trim()); setTexte(""); } }}>
            <label><span className="sr-only">Votre signalement</span><input value={texte} onChange={e => setTexte(e.target.value)} maxLength={500} placeholder="Ce qui ne va pas…" /></label>
            <button type="submit" className="one-bouton one-bouton-plein">Noter</button></form>
        : reponse.choix && reponse.choix.length > 0 && <div className="or-choix">{reponse.choix.map(c => <button key={c.id} type="button" className="one-bouton" onClick={() => onChoix(c)}>{c.libelle}</button>)}</div>}
      <button type="button" className="or-pourquoi" aria-expanded={pourquoi} onClick={() => setPourquoi(v => !v)}>Pourquoi ce signal ?</button>
      {pourquoi && <ol className="or-etapes">{reponse.etapes.map((e, k) => <li key={k} data-genre={e.signal.genre}>
        <b>{NOMS_PHASES[e.phase]}</b> · {e.texte} <small>{e.signal.genre === "donnee" ? `Donnée : ${e.signal.source}` : `Illustratif : ${e.signal.raison}`}</small></li>)}</ol>}
    </section>}
  </div>;
}
const NOMS_PHASES: Record<string, string> = { presence: "Présence", reception: "Recevoir", contexte: "Situer", clarification: "Demander", action: "Agir", verification: "Vérifier", echo: "Répondre" };
