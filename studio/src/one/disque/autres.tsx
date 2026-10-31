/**
 * Les autres contextes :
 *  - Broderie : la toile en cours et ses fils, au centre ; « Découvrir » ouvre la landing Broderie (/studio/), « Commencer » l'atelier
 *    en plein écran (le Disque se replie, puis revient : le chemin du retour est gardé).
 *  - Les espaces qui sont déjà eux-mêmes un Disque plein écran (Terminal, Carte vivante, Tambour) : le centre dit ce qu'ils sont,
 *    « Ouvrir » les déploie en gardant le chemin du retour.
 *  - Les univers non raccordés : leur statut réel et leur présentation, sans simuler un fonctionnement.
 */
import { useEffect, useState } from "react";
import { BookOpen, Camera, Expand, FolderOpen, Scissors, Sparkles } from "lucide-react";
import { FLOSS } from "../../lib/dmc";
import { loadStored } from "../../lib/store";
import { NOMS_STATUTS, type Univers } from "../../lib/one/contrat";
import type { ContexteUnivers } from "../../lib/one/contextes";
import { IconeOne } from "../../components/one/icones";
import { PROTOTYPES } from "../../lib/site";

export const BRODERIE: ContexteUnivers = {
  id: "broderie", permissions: { partager: false, modifier: true, supprimer: false },
  Composant({ outils, publier }) {
    const [p] = useState(() => { try { return loadStored(); } catch { return null; } });
    const [img, setImg] = useState("");
    const fils = p ? [...new Set(Array.from((p as unknown as { cross: ArrayLike<number> }).cross).filter(f => f >= 0))] : [];
    useEffect(() => {
      if (!p) return;
      const cross = (p as unknown as { cross: ArrayLike<number> }).cross, s = Math.max(1, Math.floor(400 / Math.max(p.w, p.h)));
      const c = document.createElement("canvas"); c.width = p.w * s; c.height = p.h * s; const x = c.getContext("2d")!;
      x.fillStyle = "#f6f1e7"; x.fillRect(0, 0, c.width, c.height);
      for (let y = 0; y < p.h; y++) for (let i = 0; i < p.w; i++) { const f = cross[y * p.w + i]; if (f >= 0) { x.fillStyle = FLOSS[f]?.hex ?? "#888"; x.fillRect(i * s, y * s, s, s); } }
      setImg(c.toDataURL());
    }, [p]);
    useEffect(() => {
      publier([
        { id: "br-decouvrir", nom: "Découvrir", groupe: "metier", icone: <BookOpen aria-hidden="true" />, aide: "la landing Point Zéro : l’histoire de la broderie, puis « Créer mon patron »", ouvrir: () => outils.deployer("?edition") },
        { id: "br-atelier", nom: p ? "Continuer" : "Commencer", groupe: "metier", icone: <Scissors aria-hidden="true" />, aide: "l’atelier en plein écran ; le Disque garde ce contexte pour le retour", ouvrir: () => outils.deployer("atelier") },
        { id: "br-ouvrages", nom: "Mes ouvrages", groupe: "metier", icone: <FolderOpen aria-hidden="true" />, aide: "le Bureau : tous vos ouvrages", ouvrir: () => outils.changerUnivers("bureau") },
        ...(PROTOTYPES ? [{ id: "br-rosaces", nom: "Rosaces", groupe: "metier" as const, icone: <Sparkles aria-hidden="true" />, aide: "la Galerie des rosaces du moteur 5D", ouvrir: () => outils.changerUnivers("galerie") }] : []),
        { id: "br-tambour", nom: "Tambour", groupe: "metier", icone: <Camera aria-hidden="true" />, aide: "le Tambour vivant : de la caméra au point", ouvrir: () => outils.deployer("tambour") },
      ], p ? `La toile en cours : « ${p.name} » · ${p.w} × ${p.h} points · ${fils.length} fils` : "Aucune toile ouverte dans l’atelier sur cet appareil.");
    }, [p?.name]); // eslint-disable-line react-hooks/exhaustive-deps
    if (!p) return <div className="dq-vide"><p className="dq-vide-titre">La toile est vierge</p><p>Une photographie devient un patron : importez-la dans l’atelier.</p>
      <div className="dq-vide-gestes"><button type="button" className="one-bouton" onClick={() => outils.deployer("atelier")}>Commencer</button><button type="button" className="one-bouton" onClick={() => outils.deployer("?edition")}>Découvrir</button></div></div>;
    return <figure className="dq-broderie">
      {img && <img className="dq-ouvrage-img" src={img} alt={`La toile en cours : ${p.name}`} />}
      <figcaption className="dq-fils" aria-label="Les fils">{fils.slice(0, 12).map(f => <i key={f} title={`DMC ${FLOSS[f]?.code} — ${FLOSS[f]?.name}`} style={{ background: FLOSS[f]?.hex }} />)}{fils.length > 12 && <span>+{fils.length - 12}</span>}</figcaption>
    </figure>;
  },
};

/** un espace qui est déjà un Disque plein écran : on le déploie, le retour est gardé */
export const deploiement = (id: string, chemin: string, ce: string): ContexteUnivers => ({
  id, permissions: { partager: false, modifier: true, supprimer: false },
  Composant({ outils, publier }) {
    useEffect(() => { publier([{ id: id + "-ouvrir", nom: "Ouvrir", groupe: "metier", icone: <Expand aria-hidden="true" />, aide: ce + " ; le Disque garde ce contexte pour le retour", ouvrir: () => outils.deployer(chemin) }], ce + "."); }, []); // eslint-disable-line react-hooks/exhaustive-deps
    return <button type="button" className="dq-deployer" onClick={() => outils.deployer(chemin)}><Expand aria-hidden="true" /><span>Ouvrir en plein écran</span></button>;
  },
});

/** un univers non raccordé : son statut réel ; rien n'est simulé */
export const presentation = (u: Univers): ContexteUnivers => ({
  id: u.id, permissions: { partager: false, modifier: false, supprimer: false },
  Composant({ publier }) {
    useEffect(() => { publier([], `${u.nom} · ${NOMS_STATUTS[u.statut]} : ${u.statut === "preparation" ? "son moteur n’est pas encore raccordé ; rien ne s’ouvre." : u.phrase}`); }, []); // eslint-disable-line react-hooks/exhaustive-deps
    return <div className="dq-presentation"><span className="dq-presentation-ico" style={{ color: u.teinte }}><IconeOne nom={u.icone} /></span>
      <p className="dq-vide-titre">{u.nom}</p><p>{u.phrase}</p><p className="dq-statut" data-statut={u.statut}>{NOMS_STATUTS[u.statut]}</p></div>;
  },
});
