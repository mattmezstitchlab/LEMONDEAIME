// ROSACE — Landing et collection de la bibliothèque

import { useState, useMemo } from "react";
import { Lien } from "../lib/router";
import { FiltresRosace, type TriRosace, filtrerCollection } from "../components/rosace/FiltresRosace";
import { CarteRosace } from "../components/rosace/CarteRosace";
import { catalogue, trouverRosace, famillesDisponibles } from "../lib/rosace/catalogue";

export default function Rosace() {
  const [filtres, setFiltres] = useState<FiltresRosace>({
    recherche: "", famille: "", palette: "", format: "", densité: "", difficulté: "", favoris: false,
  });
  const [tri, setTri] = useState<TriRosace>("nom");

  const rosaces = useMemo(() => filtrerCollection(catalogue(), filtres, tri), [filtres, tri]);
  const créerVers = useMemo(() => trouverRosace("Aubépine")?.spec.id, []);

  const familles = famillesDisponibles();

  return (
    <>
      <a className="lien-evitement" href="#contenu">Aller au contenu</a>

      <header className="rosace-en-tête">
        <div className="bouclier">
          <span className="surtitre">ROSACE — La bibliothèque</span>
          <h1>ROSACE</h1>
          <p className="chapeau">Une bibliothèque de formes à broder.</p>
          <p className="signature-phrase">« Chaque fil dessine un monde. »</p>
        </div>
        <p className="éditorial">
          Une rosace n'est pas simplement une image : c'est une composition
          géométrique reproductible, dotée d'une signature de génération, d'une
          palette de fils DMC, de dimensions, d'une grille de points et d'une
          estimation de réalisation. Découvrez, choisissez, ouvrez dans le
          Disque, modifiez, obtenez le patron.
        </p>
        <div className="actions">
          {créerVers && <Lien href={`/rosace/${créerVers}`} className="bouton noir">Créer une rosace</Lien>}
          <a href="#collection" className="bouton">Explorer la collection</a>
        </div>
      </header>

      <section id="collection" className="collection">
        <h2 className="titre-section">La collection</h2>
        <p className="fine">
          Huit premières créations, une par famille éditoriale. Chaque carte
          ouvre sur une fiche complète : signature, fils, quantités, difficulté
          et ouverture dans l'atelier Point Zéro.
        </p>
        <FiltresRosace familles={familles} filtres={filtres} tri={tri} onFiltres={setFiltres} onTri={setTri} />
        <div className="grille">
          {rosaces.length === 0 ? (
            <div className="état-vide">
              <p>Aucune rosace ne correspond à la combinaison de filtres choisie.</p>
              <button type="button" className="bouton" onClick={() => {
                setFiltres({ recherche: "", famille: "", palette: "", format: "", densité: "", difficulté: "", favoris: false });
                setTri("nom");
              }}>
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            rosaces.map((r) => <CarteRosace key={r.spec.id} rosace={r} />)
          )}
        </div>
        <p className="pied">
          {rosaces.length} rosace{rosaces.length > 1 ? "s" : ""} affichée{rosaces.length > 1 ? "s" : ""}.
        </p>
      </section>

      <section className="éditorial-fermeture">
        <h2>Au-delà des huit premières</h2>
        <p>
          Le moteur 5D (Forme · Tracé · Densité · Format · Palette) combine une
          graine et une version de générateur pour produire des centaines de
          variations reproductibles. Chaque variation reste reproductible et
          n'altère jamais le modèle d'origine.
        </p>
      </section>
    </>
  );
}
