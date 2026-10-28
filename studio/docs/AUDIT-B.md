# Point Zero B : implementation et verification

La direction B conserve l'accueil limite au hero, l'atelier plein ecran, les outils
a gauche et les fils en bas. Les pictogrammes du panneau droit sont dans son
en-tete, sans bande ni fond secondaire. Les outils moins frequents sont classes
dans Preparer, Dessin, Suivre et Reglages.

## Fonctions implementees

| Audit | Mise en oeuvre |
| --- | --- |
| Creer / Broder | Deux jeux d'outils, lecture de patron, protection des modifications |
| Conception | Rectangle, lasso, copier, coller, deplacement, rotation, retournements, lignes, formes, alphabet compte, symetrie |
| Points | Croix, demi, quart, trois-quarts, petite croix, arriere, lance, noeud et perle |
| Organisation | Calques visibles/verrouilles, bibliotheque IndexedDB, dossiers, recherche, huit versions anterieures |
| Fournitures | Stock global, echeveaux entiers, metres partiels, lots, liste d'achat CSV multi-projets, melanges de deux DMC |
| Tissu | Aida/Binca, lin/evenweave, 7 a 40 ct, sur 1/sur 2, cm/pouces, marge et couleur |
| Couleurs | 489 references sourcees, CIEDE2000, valeurs manquantes non inventees |
| Symboles | 504 definitions vectorielles, attribution persistante, changement avec echange pour eviter les collisions |
| Suivi | Fil actif, case, ligne, bloc 10x10, parking par coin, a defaire, suivi distinct des contours/ornements, notes, journal local |
| Import | Image avec calcul en worker, pixel art 1:1, PDF : lecture du texte (symboles, legende par lignes, axes, ordre des pages), secours image par blocs cales, tableau magnetique de positionnement manuel |
| Generation par prompt | Champ de description + styles, image IA tierce gratuite a controler, puis conversion DMC locale comme une photo |
| Export | PDF A4/Letter avec apercu, N&B/couleur, provenance, JSON, coeur OXS, PNG, achats CSV |
| Accessibilite | Contraste, grand texte, clavier annonceur de case, focus de panneaux, stylet uniquement, mouvement reduit |
| Conservation | IndexedDB, JSON stable par codes, avertissement de quota, cache de shell hors ligne, manifesto web |
| Droits | Usage personnel par defaut a l'import, auteur/source conserves, avertissement avant diffusion |
| Distance | Lecture directe WebRTC chiffree, un hote auteur, invitation/reponse manuelles |
| Presentation | Sept chapitres, visite de l'atelier sur copie, capture autorisee d'onglet, micro/audio humain importe, sous-titres et script |

## Nouveautés (décembre 2025)

- **Grille PDF manuelle** : mode « puzzle » avec tableau magnétique, drag & drop des blocs,
  aimantage aux bords (2×2mm équivalent grille), quand la numérotation des axes PDF est ambiguë.
  Les coordonnées des blocs sont enregistrées avec le patron.
- **Lecture vectorielle des symboles** : les runs PDF.js multi-caractères sont découpés en glyphes
  individuels avec interpolation d'avance, pour placer chaque symbole à sa vraie coordonnée.
- **Génération par prompt enrichie** : le champ accepte maintenant la composition
  ("papillon sur un éléphant"), les sujets principal / secondaire / relation sont
  explicitement renforcés dans le modèle. Une graine distincte génère une variante.

## Ce qui est verifiable

- La compilation de production doit passer avec `build_project`.
- Le moteur execute des controles a l'ouverture de l'atelier ; Reglages /
  Verifications locales permet de les relancer et d'afficher les resultats. Ils
  couvrent palette, symboles,
  CIEDE2000 (paire Sharma), tissu, consommation, marquage, serialisation, selections
  et aller-retour OXS. Aucun statut de test reussi n'est affiche avant execution.
- La video n'est disponible qu'apres une vraie capture MediaRecorder ; pas de
  fichier video fictif ou de capture preconstruite.

## Limites non dissimulees

- DMC annonce 500 teintes dans le catalogue commercial. La source RGB disponible
  en documente 489 : ce n'est pas une couverture universelle de toutes les gammes.
- Le suivi des fractions reste par case, pas par jambe individuelle de couleur.
- La reconnaissance PDF requiert calibration et validation ; contours, fractions
  et ornements complexes d'un PDF tiers ne sont pas automatiquement reconnus.
- La lecture automatique de toutes les legendes, de tous les PDF Etsy et des
  formats proprietaires PAT/XSD n'est pas revendiquee.
- OXS suit le coeur croix/arriere et les conventions de demi-points documentees.
  Les extensions Point Zero gardent les fractions/ornements. Tous les lecteurs
  externes ne les supportent pas ; un corpus reel reste a tester.
- Les symboles complexes doivent etre evalues a petite taille sur imprimante.
- Le stock ne contient pas encore de nuanciers mesures pour toutes les marques,
  fils metallises, panaches et fournitures speciales. Les perles sont dessinees,
  mais leur reference fabricant doit etre documentee dans les notes.
- Le metrage reste une estimation geometrique de la longueur cumulee des brins
  simples, avec 15 % de marge et environ 2,5 cm de longueur de travail a deux
  brins sur Aida 14. Un echeveau DMC offre 8 m × 6 brins. Tension, methode et
  deplacements au dos ne sont pas mesures.
- WebRTC ne fournit pas de coedition multi-auteurs, de cloud ou de relais TURN.
  Certains reseaux bloquent la connexion. Le mode a auteur unique evite les
  conflits au lieu de promettre une fusion automatique non implementee.
- Une voix systeme peut etre feminine mais reste synthetique. Une vraie voix
  naturelle requiert un enregistrement autorise de la narratrice ou le microphone.
- La generation de motif envoie le prompt a un service d'image tiers. La formulation
  des sujets et leur relation est renforcee, mais un modele generatif ne garantit
  pas qu'il respectera tous les objets demandes : l'image source doit etre relue
  avant conversion et le patron DMC verifie case par case.
- Capturer l'onglet requiert HTTPS, consentement et un navigateur compatible.
  Sur iPad, utiliser la capture systeme quand getDisplayMedia est absent.
- Chaque chapitre peut etre selectionne et filme separement, ou reuni aux autres.
  Les durees des voix importees sont decodees pour ne pas tronquer leur narration.
  Les sous-titres reprennent le script fourni, sans reconnaissance automatique vocale.
- Les textes de droits ne remplacent pas un avis juridique ni des CGU validees
  pour un service commercial.

## Tests metier encore necessaires

Vrais iPad et Apple Pencil, VoiceOver, grands patrons, PDF de differents designers,
impression A4/Letter, nuances/quantites de fil, connexions WebRTC inter-reseaux,
permissions de capture et mux audio/video dans plusieurs navigateurs. Aucun audit
web ne remplace ces essais avec des brodeuses et des creatrices de patrons.

## Sources principales

- DMC, Mouliné Spécial : https://www.dmc.com/US/en/products/mouline-special
- Nuancier RGB documente : https://github.com/makebead/craft-color-codes
- Specification OXS : https://www.ursasoftware.com/OXSFormat/
- Capture autorisee : https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia
- Donnees WebRTC chiffrees : https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Using_data_channels
- Maintien de l'ecran : https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API