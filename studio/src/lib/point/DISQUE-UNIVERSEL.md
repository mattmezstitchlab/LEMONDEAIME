# Le Disque universel : contrat d'architecture (brouillon, 29/10/2026)

Le Disque est une **présentation** du Point : la même navigation, les mêmes commandes, posées sur une couronne autour d'un contenu.
Le Cadre-Tambour de l'atelier (Point Zéro) en est le premier cas complet. Ce document dit ce qui appartient à chaque couche,
pour qu'un autre domaine (photo, carte, boutique, temps…) se branche sans réécrire les autres.

Il complète `CONTRAT.md` (le noyau du Point), qui reste la référence.

## Les cinq couches

| Couche | Rôle | Fichiers aujourd'hui | Règle |
|---|---|---|---|
| 1. Noyau d'interaction | navigation, niveaux, Retour, Point Zéro, Favoris, focus, clavier, annonces, Confort | `lib/point/modes.ts`, `memoire.ts`, `confort.ts`, `profils.ts`, `components/point/LePoint.tsx`, `Point.tsx`, `PanneauConfort.tsx` | aucun import métier (test `pointPortable`) ; changé seulement par options facultatives, inactives par défaut |
| 2. Registre des commandes | familles, sous-commandes, identifiants stables, actions réelles | `lib/point/registre.ts` ; types : `components/blocs/broderie.tsx`, `image.tsx`, `tambour.tsx`, `superposition.tsx` | **une seule liste d'actions par type de bloc**, partagée par le dock, le Point du bloc, le Disque et (demain) la Grille |
| 3. Présentation géométrique | anneau classique, disque unique, rayons, enveloppes, pagination, cartouche, morphose | anneau : `modes.ts` (`positionDe`, `rayonPour`) ; disque : `lib/tambour/disque.ts` (pur, testé), `components/TambourAtelier.tsx` + `.css` | calcule des places, ne connaît ni les actions ni les données ; une forme (cercle, carré, page…) = une fonction de géométrie |
| 4. Contenu central | ce qu'on voit et touche au centre | broderie : `components/Canvas.tsx` (la vraie grille) ; image : `essais/EssaiImage.tsx` ; caméra : `tambour/Tambour.tsx` ; superposition : `tambour/Calque.tsx` ; carte : `components/carte/CarteVivante.tsx` | le centre est une surface de travail du domaine ; le Disque ne le dessine pas, il le laisse passer (gestes) |
| 5. Données et métier | ouvrages, médias, conversions, suivi, sauvegarde, droits | `lib/pattern.ts`, `library.ts`, `editing.ts`, `convert.ts`, `cadre.ts`, `cadrePhoto.ts`, `motif5d/`, `api/*.mjs` | source canonique ; jamais dupliquée par une présentation ; droits vérifiés côté serveur |

## Ce qu'un domaine déclare pour avoir son disque

1. **Un type de bloc** dans le registre : `enregistrerTypeBloc({ id, nom, commandes: contexte => ModePoint[] })`.
   Chaque feuille appelle une vraie action du domaine. Les familles ont des `enfants` ; le Disque les affiche sur la même couronne.
2. **Un contexte** : l'état et les actions réelles du domaine (ex. `ContexteBroderie` : outil, fil, vue, symboles, import, export…).
3. **Un contenu central** : son composant, monté par le domaine lui-même (le Disque se pose par-dessus, sans le dupliquer).
4. **Éventuellement un raccourci central** (`centre`) : toujours doublé par une commande de l'anneau (clavier, lecteur d'écran).

Le domaine ne fournit **ni positions ni rayons** : la couche 3 les calcule (place disponible, nombre de commandes, taille du texte).

## Options ajoutées au noyau pour le Disque (inactives par défaut)

- `centre` : un raccourci posé sur la sphère (doublé dans l'anneau).
- `tambour: { rayon, cote, parPage }` (présentation « scène ») : l'anneau entoure un contenu ; le centre laisse passer les gestes ; la pagination suit la capacité de la couronne.

## Garde-fous

- Une commande affichée n'accorde aucun droit : l'action réelle vérifie (serveur pour ce qui est sensible).
- Le Disque n'est ni la base de données, ni le moteur de calcul, ni le système de comptes : c'est une projection.
- Accessibilité : chaque commande au clavier, au toucher, à la souris, avec un nom accessible ; Retour, Point Zéro, Confort toujours atteignables ;
  focus visible ; cibles de 44 px visées ; mouvement réduit = transitions instantanées ; alternative (liste du Point, Confort › présentation) quand le radial gêne.
- Géométrie testée : chaque enveloppe (rond, mot, focus) dans sa zone, sans collision (`__tests__/tambour.test.tsx`, `tests/e2e/cadre_tambour.py`).
