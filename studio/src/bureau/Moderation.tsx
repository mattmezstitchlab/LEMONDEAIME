/**
 * La modération de la Galerie des Vivants, dans le Bureau : les œuvres signalées, leurs raisons, masquer ou remettre en ligne.
 * Masquer est réversible ; rien n'est effacé. Seule l'autrice peut retirer son œuvre.
 * Les mots des signalements viennent du public : ils sont affichés comme du texte, jamais interprétés.
 */
import { useCallback, useEffect, useState } from "react";

interface Signalement { oeuvre: string; titre: string; pseudo: string; statut: "visible" | "masquee" | "retiree"; n: number; raisons: string[]; dernier: string; textes: string[] }
const RAISONS: Record<string, string> = { droits: "droits d’auteur", contenu: "contenu inapproprié", autre: "autre" };
const STATUTS: Record<Signalement["statut"], string> = { visible: "visible", masquee: "masquée", retiree: "retirée par l’autrice" };
const BASE = import.meta.env.BASE_URL;

async function appel(init?: RequestInit, q = "") {
  try {
    const r = await fetch("/api/galerie" + q, { credentials: "same-origin", ...init }), j = await r.json().catch(() => ({}));
    return r.ok && j.ok ? j : { ok: false, raison: j.raison || "La galerie ne répond pas pour le moment." };
  } catch { return { ok: false, raison: "La galerie ne répond pas pour le moment." }; }
}

export default function Moderation({ compter }: { compter?: (n: number) => void }) {
  const [liste, setListe] = useState<Signalement[] | null>(null), [statut, setStatut] = useState("");
  const [motifPour, setMotifPour] = useState<string | null>(null), [motif, setMotif] = useState("");

  const charger = useCallback(async () => {
    const r = await appel(undefined, "?signalements=1");
    if (!r.ok) { setStatut(r.raison); setListe([]); return; }
    setListe(r.signalements); compter?.(r.signalements.filter((s: Signalement) => s.statut === "visible").length);
  }, [compter]);
  useEffect(() => { void charger(); }, [charger]);

  const agir = async (s: Signalement, masquer: boolean) => {
    const r = await appel({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: masquer ? "masquer" : "demasquer", id: s.oeuvre, motif }) });
    setMotifPour(null); setMotif("");
    setStatut(r.ok ? (masquer ? `« ${s.titre} » est masquée : elle n’apparaît plus dans la galerie. Rien n’est effacé.` : `« ${s.titre} » est de nouveau visible dans la galerie.`) : r.raison);
    await charger();
  };

  return <div className="bu-moderation">
    <h2>Galerie des Vivants : signalements</h2>
    <p className="bu-aide">Masquer retire une œuvre du mur sans rien effacer ; on peut la remettre en ligne. Seule l’autrice peut la retirer définitivement.</p>
    <p className="bu-statut" role="status">{statut}</p>
    {!liste ? <p>Un instant…</p> : !liste.length ? <p>Aucun signalement.</p> : <ol>{liste.map(s => <li key={s.oeuvre} data-statut={s.statut}>
      <p><b>{s.titre}</b>, par {s.pseudo} · {STATUTS[s.statut]}</p>
      <p>{s.n} signalement{s.n > 1 ? "s" : ""} · {s.raisons.map(r => RAISONS[r] ?? r).join(", ")} · dernier le {new Date(s.dernier).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</p>
      {s.textes.length > 0 && <ul className="bu-mots">{s.textes.slice(0, 5).map((t, i) => <li key={i}>« {t} »</li>)}</ul>}
      <p className="bu-version-actions">
        {s.statut !== "retiree" && <a className="bu-lien" href={`${BASE}galerie?id=${s.oeuvre}`} target="_blank" rel="noopener">Voir la fiche</a>}
        {s.statut === "masquee" && <button type="button" className="bu-lien" onClick={() => void agir(s, false)}>Remettre en ligne</button>}
        {s.statut === "visible" && (motifPour === s.oeuvre
          ? <span className="bu-masquer">
              <label htmlFor={"bu-motif-" + s.oeuvre}>Motif (gardé pour l’historique)</label>
              <input id={"bu-motif-" + s.oeuvre} className="bu-note" maxLength={200} value={motif} onChange={e => setMotif(e.target.value)} />
              <button type="button" className="bu-btn bu-btn-alerte" onClick={() => void agir(s, true)}>Confirmer : masquer</button>
              <button type="button" className="bu-lien" onClick={() => { setMotifPour(null); setMotif(""); }}>Annuler</button>
            </span>
          : <button type="button" className="bu-lien" onClick={() => { setMotifPour(s.oeuvre); setMotif(""); }}>Masquer…</button>)}
      </p>
    </li>)}</ol>}
  </div>;
}
