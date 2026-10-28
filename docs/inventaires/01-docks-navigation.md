# Sujet n° 1 — Docks et navigation : clôture

Clos le 28 octobre 2026. Les preuves de chaque décision sont dans `cartographie/preuves.json`. L'audit et ses résolutions se lisent dans `/systeme-nerveux` (lecture d'inspection, onglet Inventaire).

Règle suivie : plusieurs accès à un même moteur ne font pas un doublon. Seules les fonctions réellement dupliquées ont été corrigées ; les accès utiles restent.

## Problèmes confirmés et décisions

| # | Problème confirmé (dans le code) | Décision | État |
|---|---|---|---|
| 1 | Deux « Déconnexion » dans le même dock du haut : menu de l'orbe et bloc de l'espace | Gardée dans le bloc de l'espace seulement, là où l'on gère son compte | Résolu |
| 2 | L'espace porte trois noms : « Votre espace », « Mon espace », « Ouvrir mon espace » | « Mon espace » nomme le lieu partout (rond du profil, loupe, pied, titre de page, Studio) ; « Ouvrir mon espace » est l'action ; les phrases gardent « votre espace » ; les quatre dossiers restent des raccourcis | Résolu |
| 3 | La loupe propose « Studio » et « Atelier de broderie » vers la même adresse | Une seule entrée « Studio », décrite comme l'atelier de broderie ; « studio », « atelier » et « broderie » la trouvent ; les autres accès au Studio restent | Résolu |
| 4 | Deux sens de « ma musique » : fichiers de l'appareil (dock) et morceaux du compte (/musique) | Pas de fusion. Le dock propose « Fichier de cet appareil » (rien n'est envoyé) et « Mes morceaux » ; une piste locale est marquée « Sur cet appareil » ; /musique dit que ses morceaux sont ceux du compte | Résolu |
| 5 | Deux routeurs et deux familles de docks (site et Studio) | Examinés, gardés séparés : le Studio est une application à part, un lien ramène au site. Seul le libellé de l'espace a été aligné | Décidé |
| 6 | Sur téléphone, les rubriques du dock du haut défilent sans le montrer | Un fondu discret à droite signale la suite ; il disparaît en fin de défilement | Résolu |
| 7 | Clavier : états et retours des deux docks | Examinés et prouvés, rien à corriger : ouverture au clavier, Échap ferme, le focus revient, focus visible, cibles d'au moins 44 px, flèche retour seulement quand elle sert | Résolu (sans changement) |
| 8 | Deux fonctions pour retirer les accents (loupe du site, recherche des moments) | Reporté au sujet Grille 200 : les rassembler toucherait le moteur du programme | À vérifier |
| 9 | Point Zéro accessible depuis plusieurs endroits | Conservé : des accès utiles à dessein ; libellés à revoir avec le sujet Unions | Décidé |

## Fichiers modifiés et dépendances

- `src/charte/Charte.tsx` : dock du haut (Déconnexion, nom de l'espace, fondu des rubriques), mode Musique du dock du bas, pied. Il est utilisé par toutes les pages.
- `src/charte/Recherche.tsx` : la loupe (une entrée Studio, groupe « Mon espace »). Il est utilisé par le dock du haut.
- `src/pages/Buro.tsx`, `src/App.tsx`, `src/charte/ApercuEspace.tsx` : le nom de l'espace.
- `src/pages/Musique.tsx` : une phrase qui situe les morceaux du compte.
- `src/styles.css` : la règle `.dock-haut .rangee.deborde` (le fondu).
- `studio/src/components/StudioDocks.tsx`, `studio/src/components/LibrarySheet.tsx` : le nom de l'espace.
- Inchangés : la direction artistique, les moteurs métier (programme, musique, réseau, comptes), les données canoniques. Le lecteur de musique n'a pas été modifié : la provenance d'une piste se lit à son adresse.

## Tests avant / après

- `tests/e2e/docks.py`, sur le même parcours :
  - avant les corrections : 20 vérifications réussies, 11 en échec ;
  - après : 31 sur 31 réussies, au commit 948cf8f.
- Les échecs d'avant correspondent exactement aux problèmes 1, 2, 3, 4 et 6.
- Les vérifications clavier, retour, téléphone (taille des cibles, débordement) et Studio réussissaient déjà : ce sont des comportements prouvés et gardés.
- Non-régression :
  - `tests/e2e/navigation.py` : 15/15 ;
  - `tests/e2e/moments.py` : 42/42 ;
  - `tests/e2e/systeme.py` : 21/21 ;
  - tests serveur : 46/46 ;
  - Studio : 540/540.

## Vérification ordinateur, téléphone, clavier

- Ordinateur (1440 px) : les blocs de l'orbe, de la loupe et de l'espace ; le mode Musique ; le pied.
- Téléphone (390 px) :
  - aucune page ne déborde ;
  - le fondu des rubriques, et leur défilement jusqu'à « Boutique » ;
  - toutes les commandes des docks font au moins 44 px ;
  - le bloc de l'espace tient dans l'écran.
- Clavier :
  - l'orbe, la loupe, le profil et le cercle du dock du bas s'ouvrent avec Entrée ;
  - Échap ferme et rend le focus ;
  - le focus reste visible.

## Mettre à jour la carte

```
npm run carte:tout     # construit, lance les parcours, relit le dépôt, enregistre les preuves
```
