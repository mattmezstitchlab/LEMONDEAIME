import { useEffect, useId, useRef, useState } from "react";
import { DEFAULT_ACCESS, readPrefs, savePrefs, type Preferences } from "../../lib/accessibilityCore";
import { annonce, PROFILS } from "../../lib/point/confort";
import { ecrirePresentation, lirePresentation, type ChoixPresentation } from "../../lib/point/modes";
import { appliquerProfil, lireNiveau, nomProfil, profilActuel, PROFILS_POINT, type IdProfil } from "../../lib/point/profils";

/**
 * Le mode Confort du Point : un formulaire ordinaire, sans geste.
 * Chaque changement s'applique tout de suite à toute la page, s'enregistre sur cet appareil seulement, et se dit (l'Onde).
 * En tête, le profil (Débutante, Experte, Lecture confortable, Création géométrique) ; « Personnalisé » dès qu'un réglage s'en écarte.
 * Échap ou « Fermer » : le focus revient au Point.
 */
export default function PanneauConfort({ onFermer, onAnnonce }: { onFermer: () => void; onAnnonce: (texte: string) => void }) {
  const [p, setP] = useState<Preferences>(readPrefs);
  const [erreur, setErreur] = useState("");
  const [menu, setMenu] = useState<ChoixPresentation>(lirePresentation);
  const titre = useId(), racine = useRef<HTMLElement>(null);
  useEffect(() => { racine.current?.querySelector<HTMLElement>("button, input")?.focus(); }, []);
  useEffect(() => {
    const suivre = (e: Event) => { const d = (e as CustomEvent<Preferences>).detail; if (d) setP(d); };
    window.addEventListener("pz:accessibility", suivre);
    return () => window.removeEventListener("pz:accessibility", suivre);
  }, []);
  const changer = (suite: Preferences) => {
    try { savePrefs(suite); setErreur(""); onAnnonce(annonce(p, suite)); setP(suite); }
    catch { setErreur("Cet appareil refuse d’enregistrer les réglages (navigation privée ?). Ils s’appliquent quand même jusqu’au rechargement."); }
  };
  const set = (patch: Partial<Preferences>) => changer({ ...p, ...patch });
  const pc = (x: number) => Math.round(x * 100) + " %";
  /* le profil se relit après chaque changement (un réglage modifié à la main donne « Personnalisé ») */
  const profil: IdProfil | null = profilActuel({ confort: p, niveau: lireNiveau(), menu }) ?? null;
  const choisirProfil = (id: IdProfil) => {
    const ok = appliquerProfil(id), suite = readPrefs();
    onAnnonce(`Profil ${nomProfil(id)}.` + (ok ? "" : " Cet appareil refuse d’enregistrer : le profil vaut jusqu’au rechargement."));
    setP(suite); setMenu(lirePresentation()); setErreur("");
  };

  return <section ref={racine} className="lp-panneau" data-defile role="dialog" aria-modal="false" aria-labelledby={titre}
    onKeyDown={e => { e.stopPropagation(); /* flèches, Retour arrière… restent aux réglages, pas au contexte */ if (e.key === "Escape") { e.preventDefault(); onFermer(); } }}>
    <header className="lp-panneau-tete">
      <h2 id={titre}>Confort de lecture</h2>
      <button type="button" className="lp-fermer" onClick={onFermer}>Fermer</button>
    </header>
    <p className="lp-note">Chaque réglage s’applique tout de suite à tout le studio et reste sur cet appareil.</p>

    <fieldset className="lp-groupe">
      <legend>Mon profil</legend>
      <div className="lp-choix lp-profils-point">
        {PROFILS_POINT.map(pr => <label key={pr.id}><input type="radio" name={titre + "profil"} checked={profil === pr.id} onChange={() => choisirProfil(pr.id)} />
          <span>{pr.nom}<span className="lp-aide">{pr.aide}</span></span></label>)}
        <label><input type="radio" name={titre + "profil"} checked={profil === null} disabled />
          <span>Personnalisé<span className="lp-aide">Vos propres réglages, dès que l’un d’eux s’écarte d’un profil.</span></span></label>
      </div>
    </fieldset>

    <fieldset className="lp-groupe">
      <legend>Réglages rapides</legend>
      <div className="lp-profils">
        {PROFILS.filter(pr => pr.id !== "lecture").map(pr => <button key={pr.id} type="button" onClick={() => changer({ ...pr.valeur })} aria-describedby={titre + pr.id}>
          {pr.nom}<span id={titre + pr.id} className="lp-aide">{pr.aide}</span></button>)}
        <button type="button" onClick={() => changer({ ...DEFAULT_ACCESS })}>Réglages d’origine<span className="lp-aide">Tout revient comme au premier jour. Vos ouvrages ne bougent pas.</span></button>
      </div>
    </fieldset>

    <fieldset className="lp-groupe">
      <legend>Texte</legend>
      <label className="lp-curseur">Taille du texte <output>{pc(p.fontScale)}</output>
        <input type="range" min={100} max={175} step={5} value={Math.round(p.fontScale * 100)} aria-valuetext={pc(p.fontScale)}
          onChange={e => set({ fontScale: Number(e.target.value) / 100 })} /></label>
      <label className="lp-curseur">Interligne <output>{p.lineHeight.toLocaleString("fr-FR")}</output>
        <input type="range" min={12} max={21} step={1} value={Math.round(p.lineHeight * 10)} aria-valuetext={p.lineHeight.toLocaleString("fr-FR")}
          onChange={e => set({ lineHeight: Number(e.target.value) / 10 })} /></label>
      <label className="lp-curseur">Espacement des lettres <output>{p.spacing ? "+" + pc(p.spacing) : "normal"}</output>
        <input type="range" min={0} max={15} step={1} value={Math.round(p.spacing * 100)} aria-valuetext={p.spacing ? "plus " + pc(p.spacing) : "normal"}
          onChange={e => set({ spacing: Number(e.target.value) / 100 })} /></label>
    </fieldset>

    <fieldset className="lp-groupe">
      <legend>Thème</legend>
      <div className="lp-choix">
        {([["system", "Comme l’appareil"], ["light", "Clair"], ["dark", "Sombre"]] as const).map(([v, nom]) =>
          <label key={v}><input type="radio" name={titre + "theme"} checked={p.theme === v} onChange={() => set({ theme: v })} />{nom}</label>)}
      </div>
    </fieldset>

    <fieldset className="lp-groupe">
      <legend>Couleurs</legend>
      <div className="lp-choix">
        {([["standard", "Standard"], ["daltonisme", "Repères pour les couleurs"], ["monochrome", "Monochrome"]] as const).map(([v, nom]) =>
          <label key={v}><input type="radio" name={titre + "vision"} checked={p.vision === v} onChange={() => set({ vision: v })} />{nom}</label>)}
      </div>
      <label className="lp-case"><input type="checkbox" checked={p.contrast === "strong"} onChange={e => set({ contrast: e.target.checked ? "strong" : "normal" })} />
        <span>Contraste renforcé<span className="lp-aide">Bordures et textes plus marqués.</span></span></label>
    </fieldset>

    <fieldset className="lp-groupe">
      <legend>Mouvement et repères</legend>
      <label className="lp-case"><input type="checkbox" checked={p.reduceMotion} onChange={e => set({ reduceMotion: e.target.checked })} />
        <span>Mouvements réduits<span className="lp-aide">Plus d’animation ni de trajet : le Point saute d’un endroit à l’autre.</span></span></label>
      <label className="lp-case"><input type="checkbox" checked={p.enhancedFocus} onChange={e => set({ enhancedFocus: e.target.checked })} />
        <span>Focus renforcé<span className="lp-aide">Un contour épais autour de l’élément choisi au clavier.</span></span></label>
      <label className="lp-case"><input type="checkbox" checked={p.readingGuide} onChange={e => set({ readingGuide: e.target.checked })} />
        <span>Lecture guidée<span className="lp-aide">Une bulle répète le nom de l’élément choisi au clavier, sans lui prendre le focus.</span></span></label>
      <label className="lp-case"><input type="checkbox" checked={p.privacyBlur} onChange={e => set({ privacyBlur: e.target.checked })} />
        <span>Affichage discret<span className="lp-aide">Floute les images : une protection visuelle, pas un chiffrement.</span></span></label>
    </fieldset>
    <fieldset className="lp-groupe">
      <legend>Le menu du Point</legend>
      <div className="lp-choix">
        {([["auto", "Automatique", "anneau sur grand écran, panneau compact sur téléphone"], ["arc", "Arc compact", "pictogrammes collés au Point"], ["liste", "Liste en mots", "chaque mode écrit en entier, depuis le bas"]] as const).map(([v, nom, aide]) =>
          <label key={v}><input type="radio" name={titre + "menu"} checked={menu === v} onChange={() => { ecrirePresentation(v); setMenu(v); onAnnonce(`Menu du Point : ${nom.toLowerCase()}.`); }} /><span>{nom}<span className="lp-aide">{aide}</span></span></label>)}
      </div>
    </fieldset>
    {erreur && <p className="lp-erreur" role="alert">{erreur}</p>}
  </section>;
}
