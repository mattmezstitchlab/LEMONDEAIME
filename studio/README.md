# Point Zéro

**L'atelier de point de croix qui tient dans un onglet : créer le patron et le broder, dans le même projet.**

Point Zéro est une application web progressive, hors ligne, pensée pour l'iPad et l'Apple Pencil — et
utilisable au clavier, à la souris et au stylet passif. Pas de compte, pas d'abonnement, pas
d'analytique, pas de serveur à soi : les motifs, le stock de fils et l'historique restent dans le
navigateur (IndexedDB, avec repli localStorage).

Elle couvre le cycle complet, ce qui évite d'ouvrir quatre outils différents pour un seul ouvrage :

| Étape | Ce que fait l'atelier |
| --- | --- |
| **Composer** | Grille vierge jusqu'à 1 000 × 1 000 cases, 26 outils (croix, demi, quart, trois-quarts, petite croix, perle, arrière, lancé, noeud français, remplissage, formes, lasso, déplacement, lettrage compté 5 × 7), symétrie, calques visibles et verrouillables |
| **Convertir** | Photo ou pixel art → quantification DMC avec tramage Floyd–Steinberg, calcul en worker ; génération d'image par description (service tiers), reprise ensuite comme une photo |
| **Importer** | PDF du commerce : lecture vectorielle des symboles (pdf.js), légende par lignes, axes, ordre des pages ; secours image par blocs calés et tableau magnétique de recollement quand la numérotation est ambiguë. Fichiers projet et OXS |
| **Suivre le fil** | Substitution d'un fil par ses trois plus proches en CIEDE2000, correspondance du motif entier vers une autre marque (diamant DMC, perles à repasser Perler, Hama, Artkal, MARD, Nabbi) sans changer la langue du motif |
| **Préparer** | 489 références DMC sourcées, correspondance perceptuelle CIEDE2000, mélanges de deux fils, tissu (Aida/binca, lin, evenweave, 7 à 40 ct, sur 1 ou sur 2), marge, métrage et nombre d'écheveaux par fil, stock et liste d'achats CSV multi-projets |
| **Broder** | Fil actif, symétrie sur trois axes, suivi case / ligne / bloc 10 × 10, parking par coin, erreurs à défaire, contours et ornements suivis séparément, sessions horodatées et calendrier d'activité, séries, estimation de fin |
| **Exporter** | PDF paginé A4 ou Letter avec recouvrement, règle d'échelle à mesurer, page d'ornements, légende, correspondances multi-marques et provenance ; SVG vectoriel ; JSON ; OXS (coeur standard + extension documentée) ; PNG ; CSV |
| **Se repérer** | Guide pas à pas : une étape à la fois, le pictogramme concerné pulse, un mémo court, et l'étape se valide quand le geste est réellement fait. Un champ de questions répond sur tout l'atelier, hors ligne |
| **Partager** | Lecture à distance chiffrée (WebRTC, invitation manuelle), l'hôte reste auteur |

## Essayer

```bash
npm install
npm run dev        # atelier sur http://localhost:5173
```

```bash
npm run build      # dist/ — JS et CSS inlinés dans un seul HTML (public/ reste à côté)
npm run preview    # servir le build
npm run verify     # types + tests + build, la commande de contrôle (CI : docs/INTEGRATION-CONTINUE.md)
```

`npm run test` lance les 64 tests (Vitest, jsdom). Ils ne testent pas des utilitaires isolés : ils
verrouillent ce qui s'est déjà cassé — la fidélité de l'export PDF, l'accord entre les symboles de
l'éditeur, du PDF, du SVG et de l'OXS, la consommation de fil selon la toile, la sérialisation par
codes plutôt que par indices.

## Comment c'est construit

- **Le motif est un tableau typé, pas une liste d'objets.** `cross`, `fwd`, `bwd`, `q[4]`, `done`
  sont des `Int16Array` indexés par `y * w + x` ; les segments (arrières, lancés), noeuds, points
  spéciaux, annotations et parkings sont des listes courtes. Aucun objet par case : un 300 × 300
  occupe environ 1,3 Mo de mémoire plate, et l'annulation se fait par trait de stylet.
- **La sérialisation est stable par codes.** `toObject()` écrit la table des codes DMC utilisés ;
  `fromObject()` refuse un fichier qui ne la contient pas plutôt que de deviner des couleurs. Les
  indices internes peuvent changer entre deux versions, pas le motif.
- **Une seule définition de symbole, trois rendus.** Les 504 symboles sont déclaratifs (cercles,
  rectangles, polygones, segments) et dessinés à l'identique sur canvas, en PDF (jsPDF) et en SVG.
  Un symbole personnalisé dans l'atelier est le même partout, y compris dans l'OXS, où le numéro
  écrit dans le coeur est relu au retour.
- **La science des couleurs est un module pur**, partagé par le worker de conversion et son repli
  hors worker : sRGB → Lab, CIEDE2000, contraste. Les mêmes fonctions servent au fil DMC le plus
  proche et à la perle la plus proche.
- **L'honnêteté est traitée comme une fonctionnalité.** Les valeurs DMC manquantes ne sont pas
  inventées, la provenance d'un motif importé est conservée et l'usage personnel est le réglage par
  défaut, les écarts de teinte sont affichés plutôt que lissés (`docs/AUDIT-B.md`).

## Couleurs : ce qui est sourcé, et ce qui ne l'est pas

Les valeurs couleur viennent de [`craft-color-codes`](https://github.com/makebead/craft-color-codes)
(MakeBead), code MIT, **données CC BY 4.0** :

- **DMC mouliné, 489 références**, statut *cross-checked*. Blanc (`#FCFBF8`) et B5200 (`#FFFFFF`)
  restent deux références distinctes.
- **Miyuki Delica 11/0, 1 288 références**, statut *measured*, chargées à la demande seulement
  quand le motif contient des perles. D'après la source : la couleur est la moyenne sRGB de la
  photo produit officielle Miyuki 400 × 400, les photos ne sont pas redistribuées, et la
  comparaison avec deux jeux de données indépendants donne une famille de couleur juste sur tous
  les codes mais une teinte qui diffère de 6 à 12 ΔE00 en médiane. Autrement dit : **la bonne
  perle, une teinte approchée**. Les perles métallisées, galvanisées, AB et silver-lined ne peuvent
  pas être une seule couleur plate. Cet écart est affiché tel quel, jamais présenté comme une
  correspondance exacte.

Six autres tables servent aux **correspondances multi-marques** : DMC Diamond Painting (154
références, *cross-checked*, mêmes codes que le DMC mouliné), Perler Midi (103), Hama Midi (92),
Artkal S (199), MARD 291 et Nabbi BioBeads (30), toutes quatre *community*. Le motif n'est jamais
converti — il reste en DMC — ; l'atelier produit une table de correspondance, ligne par ligne, avec
l'écart CIEDE2000 et le statut de la table. Quand la marque numérote comme DMC, l'appariement est
signalé comme « même code » au lieu d'être présenté comme une approximation.

**Les licences de ces données ne sont pas les mêmes d'une table à l'autre.** Les tables mesurées ou
recoupées par MakeBead (DMC, Miyuki, diamant, MARD, Minecraft, pixel art) sont en CC BY 4.0 ; les
tables de perles à repasser Perler, Hama, Artkal et Nabbi viennent de `maxcleme/beadcolors` sous
MIT. L'atelier et les exports affichent la licence de la table réellement employée, jamais une
licence générique.

Une teinte à l'écran n'est pas un bain de fil. Pour un ouvrage destiné à être vu de près, la
référence reste la carte physique du fabricant.

## Moteur d'analyse de Point Zéro (Grille 44)

`api/analyse.mjs` est le second étage du moteur qui allume la Grille 44 : Claude lit une intention (texte, image ou PDF de 3 Mo maximum) et renvoie les briques à allumer, dans l'ordre des causalités, avec une citation pour chacune, les briques écartées et les informations repérées (dates, montants, nombre de personnes, lieux). La réponse a la même forme que le moteur local, qui reste utilisé quand ce service est absent ou en erreur.

- `ANTHROPIC_API_KEY` : clé de l'API Claude (obligatoire ; sans elle, la route répond 503 et rien n'est envoyé).
- `ANALYSE_MODEL` : modèle utilisé, `claude-haiku-5-5` par défaut.
- `ANALYSE_ALLOWED_ORIGINS` : origines autorisées en plus du site lui-même, séparées par des virgules (`*.domaine.com` accepté).
- Garde-fous : 8 000 caractères au plus, 20 analyses par minute et par adresse (au mieux, par instance), 25 secondes maximum.

## Ce qui n'est pas fini

Liste assumée, dans l'ordre où elle gêne :

## Le guide n'est pas un agent distant

Le champ de questions ressemble à un assistant, et c'est voulu — mais il ne faut
pas s'y tromper : **aucun modèle n'est appelé**. L'atelier fonctionne hors ligne,
sans compte ni clé d'API ; un agent distant se tairait sans connexion et
devinerait sur une interface qu'il ne voit pas.

À la place, la connaissance est écrite dans `src/lib/coach.ts`, depuis le source,
entrée par entrée : les 26 outils, les panneaux, les formats d'export, les
réglages de toile, les mélanges, les correspondances de marques, le journal, le
partage, l'accessibilité — et les limites assumées. La recherche est une
correspondance de mots normalisés (accents et casse ignorés), pondérée : une
locution entière pèse plus qu'un mot, et un mot seul ne suffit pas à répondre.

Deux conséquences à connaître. La réponse est **exacte** sur ce logiciel, parce
qu'elle est écrite à partir de lui et vérifiable dans `src/`. Et elle **s'arrête
là** : une question hors sujet reçoit « je ne sais pas répondre à ça », suivi de
quelques pistes, jamais une invention. Un guide qui répond à côté apprend à ne
plus lui faire confiance.

Le pas à pas, lui, ne défile pas tout seul : chaque étape attend un geste réel —
l'outil est pris, une case est posée, un fil est choisi, un panneau est ouvert —
et « Suivant » reste disponible dans tous les cas. Un guide qui avance au
chronomètre redevient la vidéo qu'il remplace.

- **Aperçu PDF sur iPadOS.** L'aperçu passe par un `<iframe>` : Safari iOS n'y affiche pas un PDF
  en ligne. Un lien d'ouverture dans un nouvel onglet et un avertissement contournent le problème
  sans le résoudre.
- **Grands motifs et stylet.** Sur un 1 000 × 1 000, le dessin en direct peut ralentir : pendant un
  trait, le rendu recompose les calques à chaque image — le brouillon mute en place, une composition
  mémorisée afficherait l'image d'avant. Au repos, la composition est mémorisée, les instantanés de
  calques sont mis en cache et l'annulation ne clone plus le motif à chaque échantillon.
- **Symétrie partielle.** Elle reflète ce qui pose du fil : croix, demi-points, quarts,
  trois-quarts, petites croix, perles, noeuds, points arrière, remplissage, gomme, et les formes
  (ligne, rectangle, ellipse) ainsi que les points lancés au moment du relâchement. Elle ne reflète
  pas ce qui suit l'avancement — marquage, suivi case / ligne / bloc, stationnement, erreurs,
  notes, sélection, déplacement, pipette — ni le lettrage : refléter ces marques ferait mentir le
  suivi.
- **Le guide ne connaît que cet atelier.** Sa base est écrite à la main : une
  fonctionnalité ajoutée sans entrée correspondante n'existe pas pour lui. C'est
  un choix — hors ligne, exact, et borné — plutôt qu'un agent qui improvise.
- **Pas d'internationalisation.** L'interface est en français, les textes sont dans les composants.
- **Un seul fichier HTML en sortie.** `vite-plugin-singlefile` inline aussi les imports
  dynamiques : les tables de perles et de correspondances, bien que chargées à la demande, se
  retrouvent dans le fichier final (215 ko de données, ~48 ko gzippé sur 1,15 Mo). Le chargement
  différé n'est donc pas réel en production monofichier ; il l'est en développement. Seules les
  sept tables réellement employées sont déclarées dans `src/lib/palettes.ts` et `src/lib/beads.ts`
  — un import à chemin variable ferait embarquer les quinze.
- **Effacer les données du navigateur supprime les projets.** Les exportations JSON sont la vraie
  sauvegarde.

Trois documents accompagnent le code :

- [`docs/ANALYSE-ET-ROADMAP.md`](docs/ANALYSE-ET-ROADMAP.md) — l'audit d'origine, la feuille de
  route, et le statut de chaque point une fois livré, y compris ce qui a été abandonné et pourquoi.
- [`docs/AUDIT-B.md`](docs/AUDIT-B.md) — l'état de l'application avant ces travaux, fonction par
  fonction.
- [`docs/OXS-EXTENSION.md`](docs/OXS-EXTENSION.md) — le contrat OXS : coeur portable, extension
  `<pointzero_extra>`, règles de relecture, et la liste de ce que ce format ne transporte pas.
- [`docs/INTEGRATION-CONTINUE.md`](docs/INTEGRATION-CONTINUE.md) — le workflow de CI, ce qu'il
  vérifie, et pourquoi il n'est pas encore installé dans le dépôt.

## Droits

Un PDF acheté reste la propriété de son auteur : l'import et le suivi d'avancement ne transfèrent
aucun droit de redistribution. L'atelier conserve l'auteur et la source, règle l'usage personnel
par défaut et avertit avant toute diffusion. Ce n'est pas un avis juridique.

## Licence

Code : **MIT**, voir [LICENSE](LICENSE).
Données couleur : **CC BY 4.0**, MakeBead — `craft-color-codes`. L'attribution est embarquée dans
les fichiers produits (page de couverture du PDF, pied de page du SVG et de la page d'ornements)
pour qu'elle survive au partage du motif.

Les images de démonstration et les visuels d'accueil sont des illustrations de mise en scène, pas
des captures d'un appareil testé.
