import { useRef } from "react";
import { SITE_BRODERIE } from "../lib/site";
import "../design/aime.css";
import "./entree-broderie.css";

type Props = { onCreate: () => void; onImport: (file: File) => void; onLibrary: () => void; onContinue: () => void; projectName: string };
/** L’entrée ne crée ni ne remplace un ouvrage : seuls les outils existants le font. */
export default function EntreeBroderie({ onCreate, onImport, onLibrary, onContinue, projectName }: Props) {
  const input = useRef<HTMLInputElement>(null);
  return <main className="eb-entree" data-aime="jour">
    <header><a href={SITE_BRODERIE ? import.meta.env.BASE_URL : "/"}>← Accueil broderie</a><span>Point Zéro · par Le Monde AIME</span></header>
    <section aria-labelledby="eb-titre">
      <p className="eb-sur">L’atelier de point de croix</p>
      <h1 id="eb-titre">Que souhaitez-vous<br />broder aujourd’hui ?</h1>
      <p>Choisissez votre point de départ. Votre ouvrage en cours reste conservé.</p>
      <div className="eb-choix">
        <button type="button" onClick={onCreate}><span>01 / Imaginer</span><strong>Créer un motif</strong><span>Ouvrir le compositeur de rosaces et préparer un motif à broder.</span><span aria-hidden="true">Composer →</span></button>
        <button type="button" onClick={() => input.current?.click()}><span>02 / Préparer</span><strong>Importer un patron</strong><span>Choisir un PDF, une image ou un projet JSON / OXS sur cet appareil.</span><span aria-hidden="true">Choisir un fichier →</span></button>
        <button type="button" onClick={onLibrary}><span>03 / Poursuivre</span><strong>Reprendre un ouvrage</strong><span>Ouvrir « Mes ouvrages » et retrouver vos créations enregistrées.</span><span aria-hidden="true">Mes ouvrages →</span></button>
      </div>
      <input ref={input} className="sr-only" tabIndex={-1} type="file" aria-label="Choisir un patron, une image ou un projet" accept="image/png,image/jpeg,image/webp,.pdf,.json,.oxs" onChange={e => { const file = e.target.files?.[0]; e.target.value = ""; if (file) onImport(file); }} />
      <button type="button" className="eb-continuer" onClick={onContinue}>Ouvrir la grille actuelle <span>· {projectName}</span> →</button>
      <aside><h2>Gardez une copie de vos ouvrages.</h2><p>Les sauvegardes locales dépendent de cet appareil et de ce navigateur. Exportez régulièrement votre projet en JSON, notamment avant de changer d’appareil ou d’effacer les données du navigateur.</p><p>Après un import, vérifiez les points et les couleurs : tous les PDF ne se convertissent pas de la même façon.</p></aside>
    </section>
  </main>;
}
