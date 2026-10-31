/**
 * Le contexte Bureau : les VRAIS ouvrages de la personne (Mes ouvrages, sur cet appareil), au centre du Disque.
 * Ouvrir (dans Broderie, plein écran : le Disque se replie, puis revient), créer, rechercher, organiser.
 * Rien n'est inventé : sans ouvrage, le centre le dit, et propose un ouvrage d'ESSAI annoncé comme démonstration
 * (une recette réelle du moteur 5D, rangée dans Mes ouvrages ; on peut le supprimer depuis l'atelier).
 */
import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown, FilePlus2, FolderOpen, Search, SkipBack, SkipForward, Sparkles } from "lucide-react";
import { FLOSS } from "../../lib/dmc";
import { getProject, listProjects, saveLibrary, type ProjectRecord } from "../../lib/library";
import { generer, formatParDefaut } from "../../lib/motif5d/generer";
import { recetteDe } from "../../lib/motif5d/recettes";
import { VERSION } from "../../lib/motif5d/code";
import type { ContexteUnivers } from "../../lib/one/contextes";
import type { ModePoint } from "../../lib/point/modes";
/** une famille : le Point la remplace par ses enfants ; `ouvrir` n'est pas appelé */
const famille = () => {};

type Tri = "date" | "nom" | "avancement";
const date = (t: number) => new Date(t).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

function Apercu({ rec, taille }: { rec: ProjectRecord; taille: number }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    try {
      const p = getProject(rec); if (!p) return;
      const s = Math.max(1, Math.floor(taille * 0.7 / Math.max(p.w, p.h))), c = document.createElement("canvas"); c.width = p.w * s; c.height = p.h * s;
      const x = c.getContext("2d")!; x.fillStyle = "#f6f1e7"; x.fillRect(0, 0, c.width, c.height);
      const cross = (p as unknown as { cross: ArrayLike<number> }).cross;
      for (let y = 0; y < p.h; y++) for (let i = 0; i < p.w; i++) { const f = cross[y * p.w + i]; if (f >= 0) { x.fillStyle = FLOSS[f]?.hex ?? "#888"; x.fillRect(i * s, y * s, s, s); } }
      setUrl(c.toDataURL());
    } catch { setUrl(""); }
  }, [rec.id, rec.updated, taille]);
  return url ? <img className="dq-ouvrage-img" src={url} alt="" /> : <span className="dq-ouvrage-img dq-ouvrage-vide" />;
}

export const BUREAU: ContexteUnivers = {
  id: "bureau", permissions: { partager: false, modifier: true, supprimer: false },
  Composant({ etat, outils, publier }) {
    const [ouvrages, setOuvrages] = useState<ProjectRecord[] | null>(null);
    const [recherche, setRecherche] = useState("");
    const tri = (etat.f?.tri as Tri) || "date";
    const recharger = () => listProjects().then(setOuvrages, () => setOuvrages([]));
    useEffect(() => { void recharger(); }, []);
    const liste = useMemo(() => (ouvrages ?? []).filter(o => !recherche || o.name.toLowerCase().includes(recherche.toLowerCase()))
      .sort((a, b) => tri === "nom" ? a.name.localeCompare(b.name, "fr") : tri === "avancement" ? b.progress - a.progress : b.updated - a.updated), [ouvrages, recherche, tri]);
    const i = Math.max(0, liste.findIndex(o => o.id === etat.o)), o = liste[i];
    useEffect(() => {
      if (ouvrages === null) { publier([], "Lecture de vos ouvrages…"); return; }
      const essai = async () => {
        const r = recetteDe("5D-12342.g21.v0.1"), [w, h] = formatParDefaut(r.signature);
        const { pattern } = generer({ ...r, version: VERSION, w, h });
        await saveLibrary({ ...pattern, name: "Démonstration — Givre (ouvrage d’essai)" } as typeof pattern);
        await recharger(); outils.dire("Un ouvrage d’essai a été rangé dans Mes ouvrages, sur cet appareil (démonstration).");
      };
      const modes: ModePoint[] = [
        ...(o ? [{ id: "b-ouvrir", nom: "Ouvrir", groupe: "metier" as const, icone: <FolderOpen aria-hidden="true" />, aide: `ouvrir « ${o.name} » dans Broderie ; le Disque garde ce contexte pour le retour`,
          ouvrir: () => outils.deployer("atelier?ouvrage=" + encodeURIComponent(o.id)) },
          { id: "b-precedent", nom: "Précédent", groupe: "metier" as const, icone: <SkipBack aria-hidden="true" />, aide: "l’ouvrage précédent", ouvrir: () => outils.aller({ o: liste[(i - 1 + liste.length) % liste.length].id }) },
          { id: "b-suivant", nom: "Suivant", groupe: "metier" as const, icone: <SkipForward aria-hidden="true" />, aide: "l’ouvrage suivant", ouvrir: () => outils.aller({ o: liste[(i + 1) % liste.length].id }) }] : []),
        { id: "b-creer", nom: "Créer", groupe: "metier", icone: <FilePlus2 aria-hidden="true" />, aide: "un nouvel ouvrage, dans l’atelier", ouvrir: () => outils.deployer("atelier") },
        { id: "b-rechercher", nom: "Rechercher", groupe: "metier", icone: <Search aria-hidden="true" />, aide: "par nom", ouvrir: () => outils.demander("Rechercher un ouvrage", recherche, setRecherche) },
        { id: "b-organiser", nom: "Organiser", groupe: "metier", icone: <ArrowUpDown aria-hidden="true" />, aide: "trier vos ouvrages", actif: tri !== "date",
          ouvrir: famille, enfants: () => ([["date", "Les plus récents"], ["nom", "Par nom"], ["avancement", "Par avancement"]] as const).map(([v, nom]) =>
            ({ id: "b-tri-" + v, nom, groupe: "metier" as const, aide: "trier : " + nom.toLowerCase(), actif: tri === v, ouvrir: () => outils.aller({ f: { ...(etat.f ?? {}), tri: v } }) })) },
        ...(!ouvrages.length ? [{ id: "b-essai", nom: "Ouvrage d’essai", groupe: "metier" as const, icone: <Sparkles aria-hidden="true" />, aide: "ranger un ouvrage de démonstration (une rosace réelle du moteur 5D) dans Mes ouvrages", ouvrir: () => void essai() }] : []),
      ];
      publier(modes, o ? `« ${o.name} » · ${o.w} × ${o.h} points · ${Math.round(o.progress)} % brodé · modifié le ${date(o.updated)} · ${i + 1} sur ${liste.length}` : ouvrages.length ? "Aucun ouvrage ne correspond à la recherche." : "Aucun ouvrage sur cet appareil.");
    }, [ouvrages, o?.id, liste.length, recherche, tri]); // eslint-disable-line react-hooks/exhaustive-deps
    if (ouvrages === null) return <div className="dq-vide"><p>…</p></div>;
    if (!o) return <div className="dq-vide"><p className="dq-vide-titre">{ouvrages.length ? "Aucun résultat" : "Aucun ouvrage ici"}</p>
      <p>{ouvrages.length ? "Changez la recherche." : "Créez un ouvrage dans l’atelier, ou rangez un ouvrage d’essai (démonstration)."}</p></div>;
    return <figure className="dq-bureau" data-objet={o.id}>
      <Apercu rec={o} taille={outils.mobile ? 300 : 420} />
      <figcaption><b>{o.name}</b><span>{Math.round(o.progress)} % · {date(o.updated)}</span>{/Démonstration/.test(o.name) && <em className="dq-demo">démonstration</em>}</figcaption>
    </figure>;
  },
};
