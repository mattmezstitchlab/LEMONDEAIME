// ROSACE — Carte de collection d'une rosace

import { useState, useCallback } from "react";
import { GrilleRosace } from "./GrilleRosace";
import { FLOSS } from "../../../studio/src/lib/dmc";
import { type GeneratedRosace } from "../../../src/lib/rosace/generateur";
import { estimerTemps, difficulté } from "../../../src/lib/rosace/stats";
import { Lien } from "../../lib/router";

const FAVORIS_KEY = "rosace:favoris";

function lireFavoris(): Set<string> {
  if (typeof localStorage === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(FAVORIS_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}

function ecrireFavoris(favoris: Set<string>): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(FAVORIS_KEY, JSON.stringify([...favoris]));
  } catch {
    /* stockage indisponible */
  }
}

interface Props {
  rosace: GeneratedRosace;
  actif?: boolean;
  surChoix?: (id: string) => void;
}

export function CarteRosace({ rosace, actif = false, surChoix }: Props) {
  const [favori, setFavori] = useState(() => lireFavoris().has(rosace.spec.id));
  const { stats } = rosace;
  const couleurs = stats.rows.filter((r) => r.cells > 0).length;
  const temps = estimerTemps(stats.totals.cross);
  const diff = difficulté(rosace.pattern, rosace.spec.signature);

  const basculerFavori = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const suivant = !favori;
    setFavori(suivant);
    const favoris = lireFavoris();
    if (suivant) favoris.add(rosace.spec.id);
    else favoris.delete(rosace.spec.id);
    ecrireFavoris(favoris);
  }, [favori, rosace.spec.id]);

  return (
    <Lien
      href={`/rosace/${rosace.spec.id}`}
      onClick={() => { surChoix?.(rosace.spec.id); }}
      style={{ textDecoration: "none", color: "inherit", display: "contents" }}
    >
      <article
        className={`carte-rosace${actif ? " carte-rosace--active" : ""}${favori ? " carte-rosace--favoris" : ""}`}
        onClick={() => { surChoix?.(rosace.spec.id); }}
      >
        <button
          type="button"
          aria-label={favori ? "Retirer des favoris" : "Ajouter aux favoris"}
          aria-pressed={favori}
          className="favori"
          onClick={basculerFavori}
        >
          <span aria-hidden="true">{favori ? "★" : "☆"}</span>
          <span className="sr-only">{favori ? "Retiré des favoris" : "Ajouté aux favoris"}</span>
        </button>

        <div className="aperçu">
          <GrilleRosace
            pattern={rosace.pattern}
            cell={6}
            maxSize={260}
            ariaLabel={`Aperçu de la rosace ${rosace.spec.name}`}
          />
        </div>

        <div className="corps">
          <header className="entete">
            <h3 className="nom">{rosace.spec.name}</h3>
            <span className="famille">{rosace.spec.familleLabel}</span>
          </header>
          <div className="palette">
            {rosace.pattern.palette.slice(0, 6).map((idx) => {
              const f = FLOSS[idx];
              return (
                <span
                  key={f.code}
                  className="couleur"
                  style={{ backgroundColor: f.hex }}
                  title={`${f.code} · ${f.name}`}
                  aria-hidden="true"
                />
              );
            })}
            {rosace.pattern.palette.length > 6 && (
              <span className="couleur plus">+{rosace.pattern.palette.length - 6}</span>
            )}
          </div>
          <div className="meta">
            <span className="taille">{rosace.pattern.w} × {rosace.pattern.h} pts</span>
            <span className="séparateur">·</span>
            <span className="fils">{couleurs} couleur{couleurs > 1 ? "s" : ""}</span>
            <span className="séparateur">·</span>
            <span className="temps">{temps.texte}</span>
          </div>
          <div className="difficulté">{diff.niveau === "debutant" ? "Débutant" : diff.niveau === "intermediaire" ? "Intermédiaire" : "Expert"}</div>
        </div>
      </article>
    </Lien>
  );
}
