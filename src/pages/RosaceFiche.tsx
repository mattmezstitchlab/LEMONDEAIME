// ROSACE — Fiche détaillée d'une rosace

import { useEffect, useMemo, useState, useCallback } from "react";
import { Lien, aller } from "../lib/router";
import { GrilleRosace } from "../components/rosace/GrilleRosace";
import { trouverRosace } from "../lib/rosace/catalogue";
import {
  transférerVersAtelier,
  téléchargerPatron,
} from "../lib/rosace/transfert";
import { créerVariation, type VariationKind } from "../lib/rosace/variations";
import {
  toileConseillee,
  approvisionnement,
  estimerTemps,
  difficulté,
  type ColorStat,
} from "../lib/rosace/stats";
import { PALETTE_LABELS, DENSITE_LABELS, FORME_LABELS } from "../lib/rosace/signature";

const VARIATIONS: { kind: VariationKind; label: string }[] = [
  { kind: "autre-palette", label: "Même forme, autre palette" },
  { kind: "autre-densite", label: "Même palette, autre densité" },
  { kind: "autre-graine", label: "Même signature, autre graine" },
  { kind: "plus-aeree", label: "Version plus aérée" },
  { kind: "plus-grande", label: "Version plus grande" },
];

export default function RosaceFiche() {
  const chemin = typeof window !== "undefined" ? window.location.pathname : "/";
  const id = chemin.split("/").pop() ?? "";
  const rosace = useMemo(() => trouverRosace(id), [id]);
  const [transfert, setTransfert] = useState<{
    étape: "idem" | "confirm" | "succès" | "échec";
    archive?: string | null;
  }>({ étape: "idem" });
  const [variationOuverte, setVariationOuverte] = useState(false);

  useEffect(() => {
    if (!rosace) aller("/rosace");
  }, [rosace]);
  if (!rosace) return null;

  const { pattern, stats } = rosace;
  const { signature } = rosace.spec;
  const couleurs = stats.rows.filter((r: ColorStat) => r.cells > 0);
  const diff = difficulté(pattern, signature);
  const temps = estimerTemps(stats.totals.cross);
  const toile = toileConseillee(pattern.w);
  const appro = approvisionnement(pattern);
  const ouvrirAtelier = useCallback(() => {
    setTransfert({ étape: "confirm" });
  }, []);

  const confirmerTransfert = useCallback(() => {
    const r = transférerVersAtelier(pattern);
    setTransfert(r.ok ? { étape: "succès", archive: r.archive } : { étape: "échec" });
  }, [pattern]);

  const créerVariationVers = useCallback(
    (kind: VariationKind) => {
      const suivante = créerVariation(rosace, kind);
      if (!suivante) {
        setTransfert({ étape: "échec" });
        return;
      }
      aller(`/rosace/${suivante.spec.id}`);
    },
    [rosace],
  );

  return (
    <>
      <a className="lien-evitement" href="#contenu">
        Aller au contenu
      </a>
      <nav className="fiche-nav">
        <Lien href="/rosace">← Retour à la collection</Lien>
      </nav>

      <main id="contenu" className="fiche">
        <header className="fiche-en-tête">
          <p className="surtitre">ROSACE — La bibliothèque</p>
          <h1>{rosace.spec.name}</h1>
          <p className="chapeau">{rosace.spec.description}</p>
          <p className="famille">{rosace.spec.familleLabel}</p>
        </header>

        <section className="fiche-corps">
          <div className="rosace-centrale">
            <div className="cadre">
              <GrilleRosace
                pattern={pattern}
                cell={5}
                maxSize={560}
                ariaLabel={`Grille de la rosace ${rosace.spec.name}, ${pattern.w} × ${pattern.h} points`}
              />
            </div>
            <p className="légende-grille">
              Aperçu de grille — chaque carré est un point de croix, chaque couleur est un fil DMC.
            </p>
          </div>

          <div className="fiche-infos">
            <div className="panneau signature">
              <h2>Signature de génération</h2>
              <dl>
                <dt>Forme</dt><dd>{FORME_LABELS[signature.forme]}</dd>
                <dt>Tracé</dt><dd>{"croix"}</dd>
                <dt>Densité</dt><dd>{DENSITE_LABELS[signature.densité]}</dd>
                <dt>Format</dt><dd>{signature.format} × {signature.format} pts</dd>
                <dt>Palette</dt><dd>{PALETTE_LABELS[signature.palette]}</dd>
                <dt>Graine</dt><dd>{rosace.spec.graine}</dd>
                <dt>Version du générateur</dt><dd>{rosace.spec.version}</dd>
              </dl>
              <p className="note-signature">
                Même signature + même graine + même version = rosace identique.
                Cette signature est inscrite dans le patron transmis à l'atelier.
              </p>
            </div>

            <div className="panneau réalisations">
              <h2>Réalisation</h2>
              <dl>
                <dt>Dimensions</dt><dd>{pattern.w} × {pattern.h} points</dd>
                <dt>Nombre de croix</dt><dd>{stats.totals.cross.toLocaleString("fr-FR")}</dd>
                <dt>Couleurs</dt><dd>{couleurs.length}</dd>
                <dt>Temps estimé</dt><dd>{temps.texte}</dd>
                <dt>Difficulté</dt><dd>
                  {diff.niveau === "debutant" ? "Débutant" : diff.niveau === "intermediaire" ? "Intermédiaire" : "Expert"}
                  <span className="score"> (score {diff.score})</span>
                </dd>
              </dl>
              {toile && (
                <div className="toile">
                  <h3>Toile conseillée</h3>
                  <p>{toile.libelle} — environ {toile.approxCm} cm de côté.</p>
                  <p className="justification">{toile.raison}</p>
                </div>
              )}
            </div>

            <div className="panneau fils">
              <h2>Fils DMC — quantités estimées</h2>
              <p className="fine">
                Les couleurs d'écran sont des approximations des fils physiques.
                Quantités calculées par le modèle de l'atelier (marge incluse).
              </p>
              <ul className="fils-liste">
                {appro.lignes.map((r) => (
                  <li key={r.code} className="fil">
                    <span className="échantillon" style={{ backgroundColor: r.hex }} aria-hidden="true" />
                    <span className="ref">{r.code} · {r.name}</span>
                    <span className="quantité">
                      {r.cells} croix · {r.mètres} m · {r.écheveaux} écheveau{r.écheveaux > 1 ? "x" : ""}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="totaux">
                {appro.totalMètres} m de fil au total · {appro.totalÉcheveaux} écheveau{appro.totalÉcheveaux > 1 ? "x" : ""}
              </p>
            </div>

            <div className="panneau critères">
              <h2>Critères de difficulté</h2>
              <ul>
                {diff.critères.map((c) => (
                  <li key={c.nom}>
                    <span className="critère-nom">{c.nom}</span>
                    <span className="critère-valeur">{c.commentaire}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="fiche-actions">
          {transfert.étape === "confirm" && (
            <div className="confirmation">
              <p>Ouvrir cette rosace dans l’atelier Point Zéro remplacera l’ouvrage actuellement ouvert dans l’atelier (celui-ci sera archivé localement).</p>
              <div className="boutons">
                <button type="button" className="bouton noir" onClick={confirmerTransfert}>
                  Oui, ouvrir dans l’atelier
                </button>
                <button type="button" onClick={() => setTransfert({ étape: "idem" })}>
                  Annuler
                </button>
              </div>
            </div>
          )}
          {transfert.étape === "succès" && (
            <div className="notification succès">
              Ouvert dans l’atelier.{transfert.archive ? ` L’ouvrage précédent a été archivé.` : ""}
            </div>
          )}
          {transfert.étape === "échec" && (
            <div className="notification échec">Le transfert vers l’atelier n’a pas pu aboutir.</div>
          )}
          <div className="actions-principales">
            <button
              type="button"
              className="bouton noir"
              disabled={transfert.étape === "confirm"}
              onClick={ouvrirAtelier}
            >
              Ouvrir dans l’atelier
            </button>
            <button type="button" className="bouton" onClick={() => téléchargerPatron(pattern, rosace.spec.name)}>
              Voir le patron (télécharger .pointzero.json)
            </button>
            <button
              type="button"
              className="bouton"
              onClick={() => setVariationOuverte(!variationOuverte)}
            >
              Créer une variation
            </button>
          </div>

          {variationOuverte && (
            <div className="panel variations">
              <h3>Créer une variation</h3>
              <p>Le modèle original reste inchangé ; la variation reçoit sa propre signature et reste reproductible.</p>
              <div className="choix">
                {VARIATIONS.map((v) => (
                  <button
                    key={v.kind}
                    type="button"
                    className="variation-bouton"
                    onClick={() => { créerVariationVers(v.kind); setVariationOuverte(false); }}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
