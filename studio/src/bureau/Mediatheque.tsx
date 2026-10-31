/**
 * La médiathèque du Bureau : les images du site (avec leurs droits) et les médias envoyés dans le stockage (dossier « contenus/ »).
 * Envoyer un média demande, avant tout, sa licence, sa nature (reconstitution ou non), sa provenance et une légende :
 * le serveur refuse sinon. Les vidéos se rangent ici (avec leur affiche et leur version mobile) ; aucun fond de la landing
 * n'affiche encore de vidéo.
 */
import { useEffect, useId, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { adresse, type Licence } from "../components/edition/contenus";
import { api, type MediaEnvoye } from "./api";
import { CATALOGUE_SITE, type MediaBureau } from "./catalogue";

const versBureau = (m: MediaEnvoye): MediaBureau => ({ origine: "envoi", src: m.url, titre: m.url.split("/").pop() ?? m.url, alt: m.alt, legende: m.legende,
  licence: m.licence as Licence, reconstitution: m.reconstitution, provenance: m.provenance, genre: m.genre === "video" ? "video" : "image" });

export default function Mediatheque({ choisir, fermer, imagesSeulement = true }: { choisir: (m: MediaBureau) => void; fermer: () => void; imagesSeulement?: boolean }) {
  const [envoyes, setEnvoyes] = useState<MediaBureau[]>([]), [etat, setEtat] = useState(""), [form, setForm] = useState(false);
  const titre = useId(), boite = useRef<HTMLDivElement>(null);
  const charger = () => api.medias().then(r => { if (r.ok && r.donnees) setEnvoyes(r.donnees.medias.filter(m => m.role === "principal").map(versBureau)); });
  useEffect(() => { void charger(); boite.current?.querySelector<HTMLElement>("h2")?.focus(); }, []);
  const liste = [...envoyes, ...CATALOGUE_SITE].filter(m => !imagesSeulement || m.genre !== "video");
  return <div ref={boite} className="bu-mediatheque" role="dialog" aria-modal="true" aria-labelledby={titre} onKeyDown={e => { if (e.key === "Escape") { e.stopPropagation(); fermer(); } }}>
    <div className="bu-mediatheque-tete"><h2 id={titre} tabIndex={-1}>Médiathèque</h2>
      <button type="button" className="bu-btn" onClick={() => setForm(f => !f)} aria-expanded={form}>Envoyer un média…</button>
      <button type="button" className="bu-fermer" onClick={fermer} aria-label="Fermer la médiathèque">×</button></div>
    {form && <Envoi fini={m => { setForm(false); setEtat(`« ${m} » est dans la médiathèque.`); void charger(); }} />}
    <p className="bu-statut" role="status">{etat}</p>
    <ul className="bu-mediatheque-liste">{liste.map(m => <li key={m.src}>
      <button type="button" className="bu-media-choix" onClick={() => choisir(m)}>
        {m.genre === "video" ? <span className="bu-video">Vidéo</span> : <img src={adresse(m.src)} alt="" loading="lazy" />}
        <span className="bu-media-choix-titre">{m.titre}</span>
        <span className="bu-media-choix-droits">{m.origine === "envoi" ? "Envoyé · " : ""}{m.reconstitution ? "Reconstitution" : m.licence === "domaine-public" ? "Domaine public" : m.licence === "capture" ? "Capture" : "Autorisé"}</span>
      </button></li>)}</ul>
  </div>;
}

/* ——— envoyer : le fichier va directement dans le stockage (le serveur signe l'envoi), puis sa description est enregistrée ——— */
function Envoi({ fini }: { fini: (nom: string) => void }) {
  const [f, setF] = useState<File | null>(null), [d, setD] = useState({ alt: "", legende: "", licence: "autorise" as Licence, reconstitution: false, provenance: "" });
  const [occupe, setOccupe] = useState(false), [erreur, setErreur] = useState("");
  const id = useId();
  const envoyer = async () => {
    if (!f) return; setOccupe(true); setErreur("");
    try {
      const nom = f.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "") || "media";
      let largeur: number | null = null, hauteur: number | null = null;
      if (f.type.startsWith("image/")) { try { const b = await createImageBitmap(f); largeur = b.width; hauteur = b.height; b.close(); } catch { /* dimensions inconnues */ } }
      const blob = await upload("contenus/" + nom, f, { access: "public", handleUploadUrl: "/api/contenus?envoi=1", contentType: f.type });
      const r = await api.decrireMedia({ url: blob.url, mime: f.type, poids: f.size, largeur, hauteur, ...d });
      if (!r.ok) { setErreur(r.raison ?? "Description refusée."); return; }
      fini(nom);
    } catch { setErreur("L’envoi a échoué (format, taille, ou stockage non configuré)."); }
    finally { setOccupe(false); }
  };
  return <form className="bu-envoi" onSubmit={e => { e.preventDefault(); void envoyer(); }}>
    <div className="bu-champ"><label htmlFor={id + "-f"}>Fichier (JPEG, PNG, WebP, AVIF jusqu’à 8 Mo ; MP4, WebM jusqu’à 100 Mo)</label>
      <input id={id + "-f"} type="file" accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm" required onChange={e => setF(e.target.files?.[0] ?? null)} /></div>
    <div className="bu-champ"><label htmlFor={id + "-a"}>Description de l’image (texte alternatif)</label><input id={id + "-a"} value={d.alt} onChange={e => setD({ ...d, alt: e.target.value })} /></div>
    <div className="bu-champ"><label htmlFor={id + "-g"}>Légende visible (crédit)</label><input id={id + "-g"} required value={d.legende} onChange={e => setD({ ...d, legende: e.target.value })} /></div>
    <div className="bu-ligne">
      <div className="bu-champ"><label htmlFor={id + "-l"}>Licence</label>
        <select id={id + "-l"} value={d.licence} onChange={e => setD({ ...d, licence: e.target.value as Licence, reconstitution: e.target.value === "reconstitution" || d.reconstitution })}>
          <option value="autorise">Utilisation autorisée</option><option value="domaine-public">Domaine public</option><option value="capture">Capture de l’atelier</option><option value="reconstitution">Reconstitution générée</option></select></div>
      <label className="bu-case"><input type="checkbox" checked={d.reconstitution} onChange={e => setD({ ...d, reconstitution: e.target.checked })} /> Reconstitution générée</label>
    </div>
    <div className="bu-champ"><label htmlFor={id + "-p"}>Provenance (auteur, musée, autorisation)</label><input id={id + "-p"} value={d.provenance} onChange={e => setD({ ...d, provenance: e.target.value })} /></div>
    {erreur && <p className="bu-erreur" role="alert">{erreur}</p>}
    <button type="submit" className="bu-btn bu-btn-plein" disabled={!f || occupe}>{occupe ? "Envoi…" : "Envoyer dans la médiathèque"}</button>
  </form>;
}
