/**
 * Le contexte Galerie : les rosaces réelles du moteur 5D (les recettes des éditions), au centre du Disque.
 * Parcourir, filtrer (une deuxième couronne par dimension), rechercher, agrandir, informations, favoris, partager, broder.
 * Aucune page classique : tout se passe dans le Disque. (La Galerie des Vivants, qui demande un serveur, reste joignable
 * par « À propos » ; ses œuvres rejoindront ce centre quand une base répondra.)
 */
import { useEffect, useMemo, useState } from "react";
import { Heart, Info, Maximize2, Search, Share2, SkipBack, SkipForward, SlidersHorizontal, Images, Scissors } from "lucide-react";
import { DIMENSIONS, enClair, type Signature } from "../../lib/motif5d/code";
import { RECETTES, recetteDe } from "../../lib/motif5d/recettes";
import type { ContexteUnivers } from "../../lib/one/contextes";
import type { ModePoint } from "../../lib/point/modes";
/** une famille : le Point la remplace par ses enfants ; `ouvrir` n'est pas appelé */
const famille = () => {};
import Rosace, { rosaceDuCode } from "./Rosace";

const CLE_FAV = "one:galerie:favoris";
const lireFav = (): string[] => { try { const v = JSON.parse(localStorage.getItem(CLE_FAV) ?? "[]"); return Array.isArray(v) ? v.filter(x => typeof x === "string") : []; } catch { return []; } };
const ecrireFav = (v: string[]) => { try { localStorage.setItem(CLE_FAV, JSON.stringify(v)); } catch { /* navigation privée */ } };
export const idRecette = (nom: string) => nom.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const ROSACES = RECETTES.map(r => ({ ...r, id: idRecette(r.nom), sig: recetteDe(r.code).signature }));

export const GALERIE: ContexteUnivers = {
  id: "galerie", permissions: { partager: true, modifier: false, supprimer: false },
  Composant({ etat, outils, publier }) {
    const [fav, setFav] = useState(lireFav);
    const [recherche, setRecherche] = useState("");
    const filtres = etat.f ?? {};
    const liste = useMemo(() => ROSACES.filter(r =>
      Object.entries(filtres).every(([k, v]) => k === "q" || String(r.sig[k as keyof Signature]) === v) &&
      (!recherche || r.nom.toLowerCase().includes(recherche.toLowerCase()) || r.code.toLowerCase().includes(recherche.toLowerCase())) &&
      (filtres.favoris !== "1" || fav.includes(r.id))), [JSON.stringify(filtres), recherche, fav]); // eslint-disable-line react-hooks/exhaustive-deps
    const i = Math.max(0, liste.findIndex(r => r.id === etat.o));
    const r = liste[i];
    const taille = outils.mobile ? Math.min(340, window.innerWidth - 32) : 0;
    useEffect(() => {
      const choisir = (id: string) => outils.aller({ o: id });
      const filtrer = (cle: string, v: string | null) => { const f = { ...filtres }; if (v === null) delete f[cle]; else f[cle] = v; outils.aller({ f, o: undefined }); };
      const modes: ModePoint[] = [
        { id: "g-parcourir", nom: "Parcourir", groupe: "metier", icone: <Images aria-hidden="true" />, aide: `les ${liste.length} rosaces, une à une`,
          ouvrir: famille, enfants: () => liste.map(x => ({ id: "g-r-" + x.id, nom: x.nom, groupe: "metier" as const, aide: enClair(x.sig), actif: x.id === r?.id, ouvrir: () => choisir(x.id) })) },
        { id: "g-precedente", nom: "Précédente", groupe: "metier", icone: <SkipBack aria-hidden="true" />, aide: "la rosace précédente", ouvrir: () => liste.length && choisir(liste[(i - 1 + liste.length) % liste.length].id) },
        { id: "g-suivante", nom: "Suivante", groupe: "metier", icone: <SkipForward aria-hidden="true" />, aide: "la rosace suivante", ouvrir: () => liste.length && choisir(liste[(i + 1) % liste.length].id) },
        { id: "g-filtrer", nom: "Filtrer", groupe: "metier", icone: <SlidersHorizontal aria-hidden="true" />, actif: Object.keys(filtres).length > 0, aide: "par structure, tracé, densité, échelle, palette, ou favoris",
          ouvrir: famille, enfants: () => [
            ...DIMENSIONS.map(d => ({ id: "g-f-" + d.cle, nom: d.nom, groupe: "metier" as const, actif: filtres[d.cle] !== undefined, aide: d.question,
              ouvrir: famille, enfants: () => [{ id: "g-f-" + d.cle + "-tout", nom: "Toutes", groupe: "metier" as const, aide: "retirer ce filtre", actif: filtres[d.cle] === undefined, ouvrir: () => filtrer(d.cle, null) },
                ...d.reponses.map(([nom], k) => ({ id: `g-f-${d.cle}-${k}`, nom, groupe: "metier" as const, aide: `${d.nom} : ${nom.toLowerCase()}`, actif: filtres[d.cle] === String(k), ouvrir: () => filtrer(d.cle, String(k)) }))] })),
            { id: "g-f-favoris", nom: "Favoris", groupe: "metier" as const, aide: "seulement mes favoris", actif: filtres.favoris === "1", ouvrir: () => filtrer("favoris", filtres.favoris === "1" ? null : "1") },
            { id: "g-f-aucun", nom: "Tout voir", groupe: "metier" as const, aide: "retirer tous les filtres", ouvrir: () => outils.aller({ f: {}, o: undefined }) },
          ] },
        { id: "g-rechercher", nom: "Rechercher", groupe: "metier", icone: <Search aria-hidden="true" />, aide: "par nom ou par code", ouvrir: () => outils.demander("Rechercher une rosace", recherche, setRecherche) },
        ...(r ? [
          { id: "g-agrandir", nom: "Agrandir", groupe: "metier" as const, icone: <Maximize2 aria-hidden="true" />, aide: "la rosace en grand ; le Disque se replie en Point",
            ouvrir: () => outils.agrandir(<Rosace code={r.code} taille={Math.min(window.innerWidth, window.innerHeight) * 0.86} rond={false} etiquette={`Rosace « ${r.nom} », en grand`} />, r.nom) },
          { id: "g-infos", nom: "Informations", groupe: "metier" as const, icone: <Info aria-hidden="true" />, aide: "le code, la taille, les fils", ouvrir: () => { const ro = rosaceDuCode(r.code); outils.dire(`« ${r.nom} » · ${r.code} · ${ro.w} × ${ro.h} points · ${ro.fils} fils · ${enClair(r.sig)}`); } },
          { id: "g-favori", nom: fav.includes(r.id) ? "Retirer des favoris" : "Favori", groupe: "metier" as const, icone: <Heart aria-hidden="true" />, actif: fav.includes(r.id), aide: "gardé sur cet appareil",
            ouvrir: () => { const v = fav.includes(r.id) ? fav.filter(x => x !== r.id) : [...fav, r.id]; ecrireFav(v); setFav(v); outils.dire(fav.includes(r.id) ? "Retirée de vos favoris." : "Ajoutée à vos favoris (sur cet appareil)."); } },
          { id: "g-partager", nom: "Partager", groupe: "metier" as const, icone: <Share2 aria-hidden="true" />, aide: "copier le lien de cette rosace (une recette publique)",
            ouvrir: () => { void navigator.clipboard?.writeText(window.location.href).then(() => outils.dire("Lien copié."), () => outils.dire(window.location.href)); } },
          { id: "g-broder", nom: "Broder", groupe: "metier" as const, icone: <Scissors aria-hidden="true" />, aide: "ouvrir cette rosace dans l’atelier ; le Disque garde ce contexte pour le retour",
            ouvrir: () => outils.deployer("atelier?rosace=" + encodeURIComponent(r.code)) },
        ] : []),
      ];
      const nf = Object.keys(filtres).length;
      publier(modes, r ? `Rosaces des éditions (moteur 5D) · « ${r.nom} » · ${i + 1} sur ${liste.length}${nf ? ` · ${nf} filtre${nf > 1 ? "s" : ""}` : ""}${recherche ? ` · recherche « ${recherche} »` : ""}` : `Aucune rosace ne correspond${nf ? " aux filtres" : ""}.`);
    }, [r?.id, liste.length, JSON.stringify(filtres), recherche, fav.join()]); // eslint-disable-line react-hooks/exhaustive-deps
    if (!r) return <div className="dq-vide"><p className="dq-vide-titre">Aucune rosace</p><p>Retirez un filtre (Filtrer → Tout voir).</p></div>;
    return <figure className="dq-galerie" data-objet={r.id}>
      <Rosace code={r.code} taille={taille || 600} etiquette={`Rosace « ${r.nom} » : ${enClair(r.sig)}`} />
      <figcaption className="sr-only">{r.nom}</figcaption>
    </figure>;
  },
};
