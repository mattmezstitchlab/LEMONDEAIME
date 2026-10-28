/**
 * Réplique statique du studio, pour l'accueil : la grille en plein écran entre les deux docks
 * (charte UniO). Mêmes libellés que StudioDocks. Si le studio change, cette réplique change avec lui.
 * Purement décorative : aucun bouton n'est actif, rien n'est lu ni écrit.
 */
const TOP = ["Dessiner", "Broder", "Fils", "Partager"];
const DRAW = ["Main", "Croix", "Gomme", "Remplir", "Pipette", "Sélection"];
const VIEWS = ["Réaliste", "À plat", "Patron"];

export default function StudioDemo({ projectName = "Roses anciennes" }: { projectName?: string }) {
  return <div className="sdemo" aria-hidden="true">
    <img className="sdemo-grid" src={import.meta.env.BASE_URL+"images/grille-roses.png"} alt="" width="680" height="680" loading="lazy" />
    <div className="sdemo-head">
      <div className="sdemo-top">
        <span className="sdemo-brand"><b>×</b> Point Zéro ▾</span>
        <i className="sdemo-sep" />
        <span className="sdemo-back">←</span>
        <span className="sdemo-parent">Dessiner</span>
        <i className="sdemo-sep" />
        <span className="sdemo-thread"><i style={{ background: "#BC4365" }} />DMC 3350</span>
        {DRAW.map(t => <span key={t} data-on={t === "Croix" ? "1" : undefined}>{t}</span>)}
        <span className="sdemo-more">{TOP.filter(t => t !== "Dessiner").join(" · ")}</span>
      </div>
      <p className="sdemo-crumbs">Point Zéro › {projectName} › <b>Dessiner</b> › Croix</p>
    </div>
    <div className="sdemo-bottom">
      <span className="sdemo-buro"><i />BurO</span>
      <span className="sdemo-place">{projectName}</span>
      <i className="sdemo-sep" />
      {VIEWS.map(v => <span key={v} data-on={v === "Réaliste" ? "1" : undefined}>{v}</span>)}
      <span>Symboles</span>
      <i className="sdemo-sep" />
      <span>−</span><span>+</span><span className="sdemo-light">Tout voir</span>
    </div>
  </div>;
}
