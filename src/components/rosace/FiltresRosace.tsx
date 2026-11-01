// ROSACE — Filtres de la collection

import { useState, useEffect, useCallback } from "react";
import {
  PALETTES,
  FORMATS,
  DENSITES,
  PALETTE_LABELS,
  FORMAT_LABELS,
  DENSITE_LABELS,
} from "../../lib/rosace/signature";
import { difficulté } from "../../lib/rosace/stats";
import { type GeneratedRosace } from "../../lib/rosace/generateur";

export interface FiltresRosace {
  recherche: string;
  famille: string;
  palette: string;
  format: string;
  densité: string;
  difficulté: string;
  favoris: boolean;
}

export type TriRosace = "nom" | "complexite" | "temps";

const VIDE = "";

interface Props {
  familles: { id: string; label: string }[];
  filtres: FiltresRosace;
  tri: TriRosace;
  onFiltres: (filtres: FiltresRosace) => void;
  onTri: (tri: TriRosace) => void;
}

const NIVEAUX: { id: string; label: string }[] = [
  { id: "debutant", label: "Débutant" },
  { id: "intermediaire", label: "Intermédiaire" },
  { id: "expert", label: "Expert" },
];

export function FiltresRosace({ familles, filtres, tri, onFiltres, onTri }: Props) {
  const [ouvert, setOuvert] = useState(false);

  useEffect(() => {
    // Les filtres ouverts se rappellent à la réouverture.
    if (typeof window !== "undefined") {
      try {
        const stocké = sessionStorage.getItem("rosace:filtres");
        if (stocké) {
          const f = JSON.parse(stocké);
          onFiltres({ ...filtres, ...f });
        }
      } catch {
        /* stockage indisponible */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const appliquer = useCallback(
    (next: Partial<FiltresRosace>) => {
      const f = { ...filtres, ...next };
      onFiltres(f);
      try {
        sessionStorage.setItem("rosace:filtres", JSON.stringify(f));
      } catch {
        /* stockage indisponible */
      }
    },
    [filtres, onFiltres],
  );

  return (
    <section aria-label="Filtres de la collection">
      <button type="button" className="filtres-déclencheur" onClick={() => setOuvert((v) => !v)}>
        <span aria-hidden="true">≡</span>
        <span>Filtrer</span>
        {Object.values(filtres).some((v) => v !== "" && v !== false) && (
          <span className="compte-actif" aria-hidden="true">●</span>
        )}
      </button>
      {ouvert && (
        <div className="filtres-panneau">
          <div className="filtres-groupe">
            <label htmlFor="rosace-recherche">Rechercher un nom</label>
            <input
              id="rosace-recherche"
              value={filtres.recherche}
              onChange={(e) => appliquer({ recherche: e.target.value })}
              placeholder="Aubépine, Cloître, Nuancier…"
              className="champ-recherche"
            />
          </div>

          <div className="filtres-groupe">
            <label>Famille</label>
            <div className="choix">
              {bouton("Toutes", filtres.famille === VIDE, () => appliquer({ famille: VIDE }))}
              {familles.map((f) => (
                bouton(
                  f.label,
                  filtres.famille === f.id,
                  () => appliquer({ famille: f.id }),
                  f.id,
                )
              ))}
            </div>
          </div>

          <div className="filtres-groupe">
            <label>Palette de fils</label>
            <div className="choix">
              {bouton("Toutes", filtres.palette === VIDE, () => appliquer({ palette: VIDE }))}
              {PALETTES.map((p) => (
                bouton(
                  PALETTE_LABELS[p],
                  filtres.palette === p,
                  () => appliquer({ palette: p }),
                )
              ))}
            </div>
          </div>

          <div className="filtres-groupe">
            <label>Format</label>
            <div className="choix">
              {bouton("Tous", filtres.format === VIDE, () => appliquer({ format: VIDE }))}
              {FORMATS.map((f) => (
                bouton(
                  FORMAT_LABELS[f],
                  filtres.format === f,
                  () => appliquer({ format: f }),
                )
              ))}
            </div>
          </div>

          <div className="filtres-groupe">
            <label>Densité</label>
            <div className="choix">
              {bouton("Toutes", filtres.densité === VIDE, () => appliquer({ densité: VIDE }))}
              {DENSITES.map((d) => (
                bouton(
                  DENSITE_LABELS[d],
                  filtres.densité === d,
                  () => appliquer({ densité: d }),
                )
              ))}
            </div>
          </div>

          <div className="filtres-groupe">
            <label>Difficulté</label>
            <div className="choix">
              {bouton("Tous niveaux", filtres.difficulté === VIDE, () => appliquer({ difficulté: VIDE }))}
              {NIVEAUX.map((n) => (
                bouton(
                  n.label,
                  filtres.difficulté === n.id,
                  () => appliquer({ difficulté: n.id }),
                )
              ))}
            </div>
          </div>

          <div className="filtres-groupe">
            <label className="case">
              <input
                type="checkbox"
                checked={filtres.favoris}
                onChange={(e) => appliquer({ favoris: e.target.checked })}
              />
              Mes favoris seulement
            </label>
          </div>

          <div className="filtres-groupe">
            <label>Trier par</label>
            <div className="choix">
              {bouton("Nom", tri === "nom", () => onTri("nom"))}
              {bouton("Complexité", tri === "complexite", () => onTri("complexite"))}
              {bouton("Durée", tri === "temps", () => onTri("temps"))}
            </div>
          </div>

          <button type="button" className="réinitialiser" onClick={() => {
            const vide: FiltresRosace = { recherche: "", famille: VIDE, palette: VIDE, format: VIDE, densité: VIDE, difficulté: VIDE, favoris: false };
            appliquer(vide);
            onTri("nom");
          }}>
            Tout réinitialiser
          </button>
        </div>
      )}
    </section>
  );
}

/** Applique les filtres et le tri à la collection. */
export function filtrerCollection(
  rosaces: GeneratedRosace[],
  filtres: FiltresRosace,
  tri: TriRosace,
): GeneratedRosace[] {
  let out = rosaces.filter((r) => {
    const s = r.spec;
    if (filtres.recherche && !s.name.toLowerCase().includes(filtres.recherche.toLowerCase())) return false;
    if (filtres.famille && s.famille !== filtres.famille) return false;
    if (filtres.palette && s.signature.palette !== filtres.palette) return false;
    if (filtres.format && s.signature.format !== filtres.format) return false;
    if (filtres.densité && s.signature.densité !== filtres.densité) return false;
    if (filtres.favoris) {
      try {
        const favoris = new Set(JSON.parse(localStorage.getItem("rosace:favoris") ?? "[]"));
        if (!favoris.has(s.id)) return false;
      } catch {
        return false;
      }
    }
    if (filtres.difficulté) {
      const d = difficulté(r.pattern, s.signature);
      if (d.niveau !== filtres.difficulté) return false;
    }
    return true;
  });

  out = [...out].sort((a, b) => {
    if (tri === "nom") return a.spec.name.localeCompare(b.spec.name);
    const da = difficulté(a.pattern, a.spec.signature);
    const db = difficulté(b.pattern, b.spec.signature);
    if (tri === "complexite") return da.score - db.score || a.spec.name.localeCompare(b.spec.name);
    return a.stats.totals.cross - b.stats.totals.cross || a.spec.name.localeCompare(b.spec.name);
  });
  return out;
}

function bouton(label: string, actif: boolean, onClick: () => void, id?: string) {
  return (
    <button
      key={id ?? label}
      type="button"
      aria-pressed={actif}
      className={`filtre-bouton${actif ? " filtre-bouton--actif" : ""}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}