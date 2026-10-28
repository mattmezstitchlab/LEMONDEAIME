# La landing en modules — proposition

**Objet :** présenter chaque fonction et chaque réglage de l'atelier, y compris ceux
qui sont cachés dans un panneau, à la manière de la référence fournie en capture
(landing sombre découpée en modules nommés : Magician, Genius, Automator, UI-AI).

**Statut :** construit pour l'essentiel (`LandingModules.tsx`, `CardDeck.tsx`,
`landingTools.tsx`, bandeau dans `Landing.tsx`). Restent à construire : le jeu
de 54 cartes comme peau du puzzle d'import, le calendrier du SAL et son serveur
optionnel. Chaque carte vivante monte le vrai composant ou appelle la vraie
fonction ; ce qui n'existe pas porte le badge « en construction » et n'a pas de
carte.

---

## 1. Ce que la référence fait bien

- **Le produit est découpé en modules nommés**, pas en listes de fonctions.
  Chaque module a un emblème, un nom propre, une promesse en une ligne, un
  bouton-pilule, puis une grille *bento* de 6 à 8 cartes.
- **Chaque carte montre la fonction en train de servir** : une mini-capture, pas
  une icône. Le lecteur ne lit pas une promesse, il voit un geste.
- **Rythme centré et sombre**, beaucoup d'air vertical, un emblème par module
  (orbe, arc pointillé, sphère, glyphe) : on sait toujours dans quel module on est.
- **Rien n'explique, tout montre.** Les titres de cartes sont des verbes ou des
  résultats (« Generate 1000 icons for anything »), jamais des noms de réglages.

Ce qu'on ne prend pas : les planètes et les dégradés violets. Notre langage
visuel existe déjà, et il est plus juste : **le point de croix lui-même**.

## 1 bis. Le bandeau défilant

Les pictos animés existants sont gardés, mais présentés autrement : sous
l'ouverture, un bandeau horizontal les fait défiler lentement, en grand
(76 px), en deux copies pour une boucle sans couture. Le survol met le défilé
en pause pour laisser le geste se dessiner ; « réduire les animations » le rend
simplement déroulable au doigt. Un seul dessin, trois scènes : la grille des
outils, le bandeau, et les cartes des modules.

## 2. Notre traduction : une constellation de points

La scène d'ouverture de la référence est un système orbital. La nôtre devient une
**grille qui se brode** : les anneaux d'orbite sont la trame, et chaque orbe est
un motif de quelques cases, dessiné avec nos propres glyphes (`src/lib/symbols.ts`,
504 signes). L'emblème d'un module n'est pas une icône importée : c'est un petit
motif compté — une bobine, un écheveau, une page, un calendrier — posé case par
case. Personne d'autre ne peut avoir cette landing.

Deuxième emprunt amélioré : les cartes de la référence sont des captures
figées. Les nôtres peuvent être **vivantes** — l'application est monofichier et
ses composants se montent partout. Une carte « calendrier d'activité » affiche un
vrai calendrier ; une carte « légende » affiche une vraie ligne de légende avec
son symbole et son métrage ; une carte « parking » montre un fil garé qui se
libère au toucher. Une landing qui laisse essayer est plus honnête qu'une landing
qui montre.

## 3. Les neuf modules

Chaque module : nom, emblème compté, promesse d'une ligne, puis cartes.
Entre parenthèses, le fichier où la fonction existe **aujourd'hui**.

### 3.1 L'Atelier — « La grille obéit au geste. »

Emblème : une croix complète sur quatre cases.

| Carte | Ce qu'on y voit |
| --- | --- |
| Vingt-six outils, dix derrière le « plus » | Le dock réel, groupe replié qui s'ouvre (`Dock.tsx`) |
| Symétrie sur trois axes | Un trait posé à gauche qui se reflète à droite, remplissage compris (`editing.ts`) |
| Calques qui regardent sans gêner | Calques visibles et verrouillables, calque actif seul (`WorkspacePanel.tsx`) |
| Annuler geste par geste, pas pixel par pixel | Un trait entier qui disparaît d'un coup (`store.ts`) |
| Trois vues : réel, aplat, symboles | Le même motif basculé entre les trois (`TopBar.tsx`) |
| Sélection : copier, pivoter, miroir, déplacer | La barre de sélection sur un vrai rectangle (`SelectionBar.tsx`) |
| Écrire en cases, pas en pixels | L'alphabet compté 5 × 7 posant un mot (`WorkspacePanel.tsx`) |
| Le doigt fait défiler, le stylet dessine | Le réglage stylet seul, montré sur une grille (`Canvas.tsx`) |

### 3.2 Le Fil — « Vos écheveaux, vos règles. »

Emblème : un écheveau de trois cases de haut.

| Carte | Ce qu'on y voit |
| --- | --- |
| 489 références DMC, codes et symboles | Une vraie ligne de rail de fils (`dmc.ts`, `FlossRail.tsx`) |
| Mélanger deux fils, garder la recette | Un mélange affiché `321 + 720` (`pattern.ts`) |
| « Je n'ai pas ce fil » : trois plus proches, écart dit | La substitution avec son libellé ΔE (`colorScience.ts`) |
| Le même motif en perles à repasser, en diamant | Une ligne de correspondance multi-marques (`palettes.ts`) |
| La bonne perle, une teinte approchée | La limite Miyuki affichée telle quelle (`beads.ts`) |
| 504 symboles, réaffectables à la main | Deux fils qui échangent leur signe (`symbols.ts`) |
| Stock, écheveaux, liste d'achats | Le calcul « il vous manque 2 écheveaux » (`library.ts`) |

### 3.3 Le Lecteur — « Un patron du commerce devient le vôtre. »

Emblème : une page pliée en deux.

| Carte | Ce qu'on y voit |
| --- | --- |
| Symboles lus dans le vecteur, pas devinés | La légende où le glyphe vote, les quantités non (`pdfVector.ts`) |
| Le pas vient des axes numérotés | Une page dont l'échelle se déduit des nombres (`pdfVector.ts`) |
| L'ordre des pages sort de la numérotation | Trois pages remises en place sans mosaïque (`pdfVector.ts`) |
| Si le texte manque : blocs calés, montage magnétique | La table de puzzle qui s'aimante (`PdfPrep.tsx`) |
| Quatre coins à vérifier avant de croire | L'étape de calibration (`PdfPrep.tsx`) |
| Une photo devient un motif réalisable | Le tramage Floyd–Steinberg en cours (`worker`) |
| OXS relu, JSON retrouvé | Le fichier qui rentre et ressort intact (`oxs.ts`) |

### 3.4 L'Imprimeur — « Ce que vous imprimez est ce que vous brodez. »

Emblème : une page et sa règle.

| Carte | Ce qu'on y voit |
| --- | --- |
| Pages A4 ou Letter, recouvrement compris | Deux pages qui se chevauchent de 10 cases (`pdf.ts`) |
| Une règle de 10 cm à mesurer | La règle imprimée en couverture (`pdf.ts`) |
| Ornements et légende, jamais imprimés vides | La page d'ornements réelle (`pdf.ts`) |
| Correspondances imprimées, licence citée | La page de la marque employée (`pdf.ts`) |
| SVG vectoriel, seuil d'omission annoncé | Le réglage qui prévient au lieu de surprendre (`svg.ts`) |
| Aperçu du PDF réel avant d'envoyer | L'aperçu dans l'atelier (`ExportStudio.tsx`) |
| PNG, CSV, JSON, OXS | La rangée de formats (`ExportStudio.tsx`) |

### 3.5 Le Compagnon — « Reprenez exactement là. »

Emblème : un calendrier de treize semaines.

| Carte | Ce qu'on y voit |
| --- | --- |
| Case, ligne, bloc de dix | Le suivi qui coche une rangée (`Dock.tsx`, `stitch.ts`) |
| Garer un fil au coin, le libérer en retouchant | Un fil garé qui attend (`WorkspacePanel.tsx`) |
| Les erreurs comptées à part, pas perdues | Le compteur « à défaire » (`pattern.ts`) |
| Treize semaines de votre régularité | Le calendrier d'activité réel (`sessionStats.ts`) |
| Une estimation de fin, depuis votre cadence | L'ETA calculée sur vos sessions (`sessionStats.ts`) |
| Annotations posées sur la grille | Une note épinglée à sa case (`WorkspacePanel.tsx`) |
| Notes, image source, consignes | Le carnet du projet (`WorkspacePanel.tsx`) |

### 3.6 Le Guide — « Il montre, vous faites. »

Emblème : une boussole de cinq cases.

| Carte | Ce qu'on y voit |
| --- | --- |
| Un pictogramme à la fois, qui respire | Le dock avec une seule cible animée (`Dock.tsx`, `index.css`) |
| L'étape attend le geste, pas le chronomètre | Une case posée qui valide l'étape (`App.tsx`) |
| Le groupe « plus » s'ouvre quand il le faut | L'outil caché qui devient visible (`Dock.tsx`) |
| Posez la question, la réponse est locale | Le champ et une vraie réponse (`Coach.tsx`, `coach.ts`) |
| « Je ne sais pas » plutôt qu'une invention | Le refus, suivi de pistes (`coach.ts`) |
| Échappe masque, la boussole rouvre | Le mémo qui disparaît sans rien effacer (`App.tsx`) |

### 3.7 Le Confort — « Réglé une fois, oublié toujours. »

Emblème : une main ouverte.

| Carte | Ce qu'on y voit |
| --- | --- |
| Contraste élevé, grands textes | La même grille dans les deux rendus (`WorkspacePanel.tsx`) |
| L'écran reste éveillé pendant que vous brodez | Le réglage, et ce qu'il évite (`WorkspacePanel.tsx`) |
| Sens des demi-points imposé avant ou arrière | Deux zones de demi-points cohérentes (`WorkspacePanel.tsx`) |
| Marge, unités, toile sur un ou deux fils | Le bloc tissu (`WorkspacePanel.tsx`) |
| Brins et gaspillage réglables, estimation honnête | Le réglage et son effet sur le métrage (`pattern.ts`) |
| Annonces de case pour lecteur d'écran | Le réglage d'accessibilité (`Canvas.tsx`) |

### 3.8 Le Lien — « Vos projets n'appartiennent qu'à vous. »

Emblème : deux aiguilles croisées.

| Carte | Ce qu'on y voit |
| --- | --- |
| Inviter par un code, montrer sans donner la main | L'invitation et son pair en lecture seule (`PeerShare.tsx`) |
| Provenance et droits, affichés à la source | Le bloc auteur/source/droits (`WorkspacePanel.tsx`) |
| Tout local : pas de compte, pas d'analytique | Le bloc confidentialité (`WorkspacePanel.tsx`) |
| Le moteur se teste devant vous | Le bouton « Exécuter les tests du moteur » et son verdict (`checks.ts`) |
| Fusionner les croix isolées, annulable | Le nettoyage contrôlé et son avertissement (`WorkspacePanel.tsx`) |
| Bibliothèques, dossiers, versions | L'étagère de projets (`LibrarySheet.tsx`) |

### 3.9 Le SAL — « Brodez la même chose, chacune chez soi. » — *à construire*

Emblème : un tambour bordé de quatre initiales.

Un *stitch-along* est un rendez-vous : plusieurs personnes brodent le même motif
sur un calendrier commun. Rien de tel n'existe encore dans l'atelier ; le code
d'invitation actuel (`PeerShare.tsx`) ouvre une **lecture seule en direct**, ce
qui n'est pas un SAL. Ce module est donc le seul de la liste qui n'aura pas de
cartes vivantes tant qu'il n'est pas construit — et la landing le dira.

Ce qui est faisable sans serveur, dans la doctrine du produit :

1. **Le calendrier du SAL** : date de début, cadence en rangées par semaine ou
   minutes par jour — déduite de vos vraies sessions, pas d'une moyenne
   imaginaire — et objectifs hebdomadaires calculés depuis le motif réel
   (rangées, cases restantes, fils engagés).
2. **Le carnet** : où le groupe devrait en être, où vous en êtes, l'écart en
   rangées et en temps ; les semaines manquées ne sont pas des fautes, elles
   décalent, comme le reste de l'atelier refuse de culpabiliser.
3. **L'invitation** : le code existant pour montrer l'ouvrage en direct, et un
   fichier `.sal` échangeable — comme s'échangent OXS et JSON — portant cadence
   et avancement de chacune. Chacune reste auteure de sa copie ; personne n'écrit
   sur le projet d'une autre.
4. **Pas de serveur, pas de compte.** L'échange reste manuel et assumé, comme le
   partage actuel. Un SAL en direct à plusieurs curseurs exigerait une
   infrastructure : c'est un autre produit, et ce n'est pas celui-ci.

Le jeu de 54 cartes, lui, **existe déjà** (`CardDeck.tsx`) : mélangé au départ,
il se range en un clic par saison ou par semaine de saison, les deux ordres
étant des lectures légitimes du même jeu. Il est joué plus haut dans la page,
dans le module qui annonce le SAL.

Décision prise depuis : le SAL synchronisé assumera un **serveur optionnel**.
L'atelier reste entièrement hors ligne sans lui ; le serveur ne porte que
l'avancement partagé. Restent à écrire : le calendrier et le carnet (3 à 4
jours), l'échange `.sal` (1 jour), le serveur et son protocole (à chiffrer
après définition du protocole), et la peau « cartes » du puzzle d'import.

## 4. La règle d'honnêteté

La landing actuelle porte un tableau « Où en est chaque fonctionnalité » dont le
contrat est « aucune promesse en l'air ». La landing en modules garde ce contrat,
avec trois conséquences :

- une carte n'existe que si la fonction existe, et cite son fichier ;
- le SAL apparaît comme module annoncé, marqué « en construction », sans cartes
  vivantes — exactement comme le tableau actuel annonce ses chantiers ;
- le tableau des quatre paliers est remis à jour d'abord : il annonce encore
  « 24 symboles » et met « en construction » des fonctions livrées (symboles au-
  delà de 24 couleurs, marques autres que DMC, alphabets de samplers). Une
  landing splendide posée sur un tableau faux serait pire que l'inverse.

## 5. Structure de page proposée

1. Ouverture : la trame qui se brode, titre, une pilule « Entrer dans l'atelier ».
2. Les neuf modules, dans l'ordre ci-dessus — l'ordre du geste : dessiner,
   choisir ses fils, lire un patron, imprimer, suivre, apprendre, régler,
   partager, se retrouver.
3. Le tableau des quatre paliers, corrigé, en fin de page : c'est lui qui tient
   la promesse des huit sections précédentes.
4. Pied de page inchangé.

Chaque section de module : emblème compté centré, nom, promesse d'une ligne,
pilule qui ouvre l'atelier **à l'endroit même de la fonction** (le guide sait
déjà montrer une cible : la pilule d'un module peut ouvrir l'atelier sur le
panneau concerné, ce que `openCoach` et les cibles de zone font déjà).

## 6. Ce que ça coûte

| Chantier | Estimation |
| --- | --- |
| Corriger le tableau des quatre paliers | fait |
| Bandeau défilant des pictos, en grand | fait |
| Neuf modules à cartes vivantes | fait |
| Composant `Module` + grille bento + cartes vivantes | fait |
| Réécrire `Landing.tsx` en neuf sections | fait |
| Emblèmes comptés des neuf modules | fait |
| Pilules qui ouvrent l'atelier sur la bonne cible | 0,5 jour |
| Tests : bandeau, neuf modules, jeu de 54, tableau honnête (`landing.test.tsx`) | fait |
| SAL (calendrier, carnet, échange `.sal`) | 4 à 5 jours |

La landing se monte sous jsdom (`atelier.test.tsx` le prouve) : chaque module et
chaque carte peuvent être vérifiés par un test, comme le reste.
