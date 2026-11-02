import { lazy, Suspense } from 'react';
import './accueil-broderie.css';
const ApercuMotif = lazy(() => import('./ApercuMotif'));

/* Une vitrine dédiée à la broderie. Les autres univers restent accessibles par
   leurs adresses, sans être proposés dans ce parcours. L’atelier est une autre
   application : conserver de vrais liens pour charger son point d’entrée. */
export default function Accueil() {
  return (
    <div className="br-accueil">
      <a className="lien-evitement" href="#contenu">Aller au contenu</a>
      <header className="br-header">
        <a className="br-marque" href="/" aria-label="Le Monde AIME — accueil broderie">LE MONDE AIME<span>L’atelier de broderie</span></a>
        <nav aria-label="Navigation broderie">
          <a href="#decouvrir">Les possibilités</a>
          <a href="#bien-demarrer">Bien démarrer</a>
          <a className="br-action" href="/studio/">Ouvrir l’atelier <span aria-hidden="true">↗</span></a>
        </nav>
      </header>
      <main id="contenu">
        <div className="ac-cadre br-hero-cadre">
          <section className="ac-hero br-hero" aria-labelledby="br-titre">
            <img src="/media/grille-roses.jpg" alt="" fetchPriority="high" decoding="async" />
            <div className="ac-hero-contenu br-hero-contenu">
              <p className="surtitre">Point Zéro · L’atelier de point de croix</p>
              <h1 id="br-titre" className="signature">Vos patrons prennent une autre dimension.</h1>
              <p className="br-hero-presentation">Transformez votre PDF en grille modifiable. Composez un motif en cinq choix. Changez son format et voyez-le se redessiner.</p>
              <div className="br-actions">
                <a className="br-action br-hero-principal" href="/studio/">Ouvrir l’atelier <span aria-hidden="true">↗</span></a>
                <a className="br-hero-secondaire" href="#decouvrir">Voir les possibilités <span aria-hidden="true">↓</span></a>
              </div>
              <p className="br-hero-legende">Illustration de broderie · Roses sur toile</p>
            </div>
          </section>
        </div>
        <nav className="br-raccourcis" aria-label="Les possibilités de l’atelier">
          <a href="#decouvrir"><span>01</span> Du PDF à la grille ↘</a>
          <a href="#composer"><span>02</span> Un motif à votre mesure ↘</a>
          <a href="#camera"><span>03</span> La broderie côté caméra ↘</a>
        </nav>
        <section className="br-section br-fonction" id="decouvrir" aria-labelledby="br-decouvrir">
          <div className="br-fonction-texte">
            <p className="br-sur">01 / Votre PDF, autrement</p>
            <h2 id="br-decouvrir">Pas seulement un patron à regarder.<br />Une grille à travailler.</h2>
            <p className="br-chapeau">Rassemblez les pages de votre patron sur une table de montage magnétique. Vérifiez les fils reconnus, puis retrouvez le motif dans les outils de l’atelier.</p>
            <ol className="br-liste">
              <li><strong>Importez et calez.</strong> Repérez les grilles et ajustez leurs limites.</li>
              <li><strong>Assemblez.</strong> Rapprochez les blocs : l’aimantage vous aide à les positionner.</li>
              <li><strong>Travaillez votre grille.</strong> Corrigez les couleurs DMC et ouvrez le motif reconstruit dans l’atelier.</li>
            </ol>
            <a className="br-action" href="/studio/">Commencer avec mon PDF ↗</a>
            <p className="br-note">Dans l’atelier, choisissez « Importer un patron ». La reconnaissance dépend du PDF : vérifiez les symboles, les couleurs estimées et les dimensions avant de broder. Utilisez des patrons que vous avez le droit d’adapter.</p>
          </div>
          <div className="br-pdf-schema" role="img" aria-label="Schéma du parcours : pages du PDF, montage magnétique, puis grille modifiable">
            <span className="br-sur">Le parcours de votre patron</span>
            <div className="br-pages" aria-hidden="true"><span>Page 01<br />＋ ＋ ＋<br />＋ × ＋</span><span>Page 02<br />＋ × ＋<br />＋ ＋ ＋</span></div>
            <span aria-hidden="true" className="br-fleche">↓</span>
            <div className="br-schema-bloc">Montage magnétique<small>Caler · rapprocher · assembler</small></div>
            <span aria-hidden="true" className="br-fleche">↓</span>
            <div className="br-schema-bloc br-schema-final">Votre grille modifiable<small>Points · couleurs DMC · outils de broderie</small></div>
            <p className="br-note">Schéma explicatif — pas une capture de l’interface.</p>
          </div>
        </section>
        <section className="br-section br-fonction br-composer" id="composer" aria-labelledby="br-composer">
          <div className="br-fonction-texte">
            <p className="br-sur">02 / Composez sans partir d’un dessin</p>
            <h2 id="br-composer">Cinq choix.<br />Votre prochain motif.</h2>
            <p className="br-chapeau">Une forme, un tracé, une densité, une échelle, une palette. Le compositeur transforme vos choix en motif de point de croix.</p>
            <ul className="br-cinq" aria-label="Les cinq choix du compositeur"><li>Forme</li><li>Tracé</li><li>Densité</li><li>Échelle</li><li>Palette</li></ul>
            <h3>Changez le format.<br />Le motif se redessine.</h3>
            <p>Essayez ici : chaque format relance la génération depuis la même recette. Ce n’est pas simplement une image agrandie.</p>
            <p>Gardez la recette ou partagez son lien pour retrouver le motif. Dans l’atelier, vous pouvez ensuite le préparer et le broder.</p>
            <a className="br-action" href="/studio/">Composer mon motif ↗</a>
            <p className="br-note">Choisissez « Créer un motif ». Le recalcul concerne les motifs générés compatibles non retouchés, pas tous les patrons importés. Le lien partage la recette, pas vos retouches ni votre progression.</p>
          </div>
          <Suspense fallback={<p role="status">Chargement du motif à essayer…</p>}><ApercuMotif /></Suspense>
        </section>
        <section className="br-section" id="camera" aria-labelledby="br-camera">
          <div className="br-entete"><p className="br-sur">03 / À explorer · Fonctionnalités expérimentales</p><h2 id="br-camera">Le monde autour de vous,<br />en points de croix.</h2><p>Deux expériences du Tambour vivant pour rapprocher le motif de ce que vous voyez.</p></div>
          <div className="br-experiences">
            <article><span className="br-numero">Caméra → Motif</span><h3>Cadrez une fleur.<br />Voyez-la en points.</h3><p>Observez un aperçu en points de croix depuis la caméra, ajustez ses couleurs, figez l’image et ouvrez le motif dans l’atelier.</p><p className="br-note">Une photo peut remplacer la caméra. L’aperçu est une simulation : les fils réels peuvent différer des couleurs à l’écran.</p></article>
            <article><span className="br-numero">Patron → Toile filmée</span><h3>Votre patron sur l’image de votre toile.</h3><p>Superposez le patron, réglez ses quatre coins et affichez la grille, les symboles ou une couleur. Isolez les points restant à faire d’après votre suivi enregistré.</p><p className="br-note">Calage manuel. L’outil ne reconnaît pas automatiquement les points brodés, ne détecte pas les erreurs et ne suit pas l’aiguille.</p></article>
          </div>
          <a className="br-action" href="/studio/tambour">Explorer le Tambour vivant ↗</a>
          <p className="br-note">Expérience à vérifier sur votre appareil. L’accès à la caméra nécessite votre autorisation ; aucune activation depuis cette page.</p>
        </section>
        <section className="br-section br-aide" id="bien-demarrer" aria-labelledby="br-aide-titre">
          <div><p className="br-sur">Avant le premier point</p><h2 id="br-aide-titre">Bien démarrer.</h2><p>Quelques repères pour préparer votre premier ouvrage numérique.</p></div>
          <div className="br-questions">
            <details open><summary>Que puis-je importer ?</summary><p>L’atelier propose l’import d’images PNG, JPEG ou WebP, de patrons PDF et de projets JSON ou OXS. Le résultat dépend du fichier : vérifiez la grille et les couleurs avant de commencer à broder. Tous les PDF ne se convertissent pas de la même façon.</p></details>
            <details><summary>Où retrouver mes ouvrages ?</summary><p>Ouvrez « Mes ouvrages » dans l’atelier. Les sauvegardes locales restent liées à votre navigateur et à votre appareil : elles ne constituent pas, à elles seules, une sauvegarde sur un compte.</p></details>
            <details><summary>Comment conserver mon travail ?</summary><p>Exportez régulièrement votre projet au format JSON depuis l’atelier. Gardez cette copie avant de changer d’appareil ou d’effacer les données du navigateur.</p></details>
            <details><summary>Et si je n’ai pas encore de patron ?</summary><p>À l’entrée de l’atelier, choisissez « Créer un motif ». Le compositeur vous guide en cinq choix, sans importer de patron.</p></details>
          </div>
        </section>
        <section className="br-invitation" aria-labelledby="br-commencer"><p className="br-sur">À vous de créer</p><h2 id="br-commencer">Tout commence<br />par un premier point.</h2><a className="br-action" href="/studio/">Commencer dans l’atelier <span aria-hidden="true">↗</span></a></section>
      </main>
      <footer className="br-footer"><span>LE MONDE AIME · Point Zéro</span><p>Un espace consacré à la broderie au point de croix.</p><a href="#contenu">Retour en haut ↑</a></footer>
    </div>
  );
}
