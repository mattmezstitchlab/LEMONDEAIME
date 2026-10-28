# SLÂME — prototype de communication musicale (V1)

> Expérience créative et d'accessibilité. Ne remplace pas un dispositif de communication médicale ou d'appel aux secours.

## Lancer le prototype
- Dans POINTZERO, cliquer sur **SLÂME · Écouter la grille** (accueil) ou **♫ SLÂME** (atelier).
- URL directe : **/#slame**. Le motif en cours dans l'atelier est conservé.
- Si le patron ne contient aucun point, un motif MUSICBOX de démonstration est affiché sans enregistrer ni modifier le patron d'origine.

## Faire parler un ouvrage
1. Dans l'atelier POINTZERO, créer un motif, importer une image ou ouvrir un patron.
2. Dans SLÂME, cliquer **Écouter mon ouvrage** : les cases coloriées sont lues par rangées alternées ; les points arrière et noeuds sont aussi interprétés.
3. Autre possibilité : cliquer A, puis B, puis C, D... sur la grille. Les cases intermédiaires sont parcourues avec un algorithme de rasterisation. Les retours sur une même case restent dans la partition.
4. Choisir la gamme, l'humeur musicale déclarée et le tempo. Cliquer Jouer ou activer une boucle.
5. Choisir une expression (« Je t'aime », « Pardon », « Non », « J'ai besoin d'aide »...) ou écrire un message, puis cliquer Prononcer.
6. Exporter le JSON du trajet, de la partition et du journal explicite, ou exporter un fichier MIDI standard contenant notes, durées, silences et tempo. Ces fichiers sont locaux.

Les 489 couleurs DMC **ne sont pas 489 fréquences naturelles** : SLÂME applique une règle documentée couleur→degré de gamme/octave.
Les 504 symboles de l'atelier ne sont pas une traduction en mots : une association pictogramme/intention définie par l'utilisateur sera une évolution distincte.
L'émotion n'est pas inférée du motif ; la personne la sélectionne.
Les cases vides sont des silences ; les demi-points, croix, points arrière, points lancés et noeuds influencent la durée ou l'articulation.

## Modes d'entrée
- Souris/tactile : clics successifs, sans glisser-déposer.
- Clavier : focaliser la grille, flèches pour déplacer le curseur, Entrée pour poser un point, Retour arrière pour annuler le dernier point.
- Contacteur : activer Balayage. Un seul déclencheur Espace ou le bouton Valider sélectionne d'abord une rangée, puis une colonne.
- Caméra : option expérimentale exclusivement locale, disponible **uniquement** dans les navigateurs ayant l'API FaceDetector. Cette API n'est pas universelle. Le visage dirige uniquement le curseur, jamais la synthèse vocale ou des alertes. Pas de reconnaissance d'identité.
- Micro : option expérimentale à seuil réglable ; un signal sonore tenu 700 ms valide seulement la case courante. Le souffle n'est pas authentifié et du bruit ambiant peut déclencher la case.
- La synthèse vocale utilise speechSynthesis et les voix disponibles dans le navigateur. Une voix très naturelle, le clonage vocal et le fonctionnement hors ligne dépendent du fournisseur et ne sont pas garantis.

## Confidentialité, sécurité et secours
Aucune vidéo, donnée biométrique ou piste micro n'est envoyée par le code SLÂME à un serveur.
Les flux sont arrêtés lorsqu'on quitte l'écran, ou quand le mode est désactivé.
Les phrases prononcées sont listées **en mémoire de session** et seulement exportées par un clic.
La parole est toujours émise par un bouton explicite, jamais par une prédiction de sentiment, un geste de tête ou le souffle.
Aucun SMS, courriel, appel, réseau de contacts ou déclenchement automatique d'urgence n'est activé.
Un événement horodaté n'est pas une preuve que le message a été perçu ou compris.

## Collaboration SAL
Le partage existant de POINTZERO est principalement de la lecture entre pairs. **L'édition musicale simultanée multiutilisateur et les échanges d'alertes n'existent pas encore.**
Étape future : contributions autorisées par membre, historique par couleur/piste, consentement par message, statut « envoyé / reçu / lu / confirmé » calculé d'après des accusés réels. Ne jamais confondre absence d'accusé et absence de besoin.

## Structure de code
- src/lib/slame.ts : algorithme pur (rasterLine, appendWaypoint, stitchAt, dmcToMidi, motifTrail, stepsForTrail)
- src/components/SlameStudio.tsx : vue d'exploration, Web Audio minimal, voix navigateur et commandes expérimentales
- src/lib/slameMidi.ts : export musical Standard MIDI File format 0 (sans paroles)
- src/__tests__/slame.test.ts : parcours, couleur, silence et symboles
- src/App.tsx et src/components/Landing.tsx : route #slame et navigation

La première V1 joue une synthèse Web Audio légère autonome. **Elle n'intègre pas encore l'InstrumentEngine/Mixer de la dernière archive AIME Music Lab**, et ne prétend pas disposer de son export audio WAV (un export MIDI simple a été ajouté ici) ; c'est la prochaine intégration. Le socle du calcul musical est séparé pour rendre ce raccordement explicite.

## Vérification
Lancer npm ci puis npm run verify. Tester à l'oreille et sur appareils réels avant toute mise à disposition destinée aux personnes utilisant une aide technique.
