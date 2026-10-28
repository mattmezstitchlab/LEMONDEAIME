# OXS : coeur portable et extension Point Zéro

Ce document décrit exactement ce que Point Zéro écrit dans un fichier `.oxs`, ce
qu'il sait relire, et ce qu'il perd volontairement. Il remplace un XSD.

## Pourquoi pas de XSD

OXS est un format d'échange employé par plusieurs logiciels de point de croix,
sans schéma publié faisant autorité. Écrire un XSD « officiel » reviendrait à
inventer une norme à partir d'un seul échantillon de fichiers, puis à laisser un
document qui a l'air de faire foi alors que personne ne peut le vérifier. Ce
document dit donc ce que fait ce logiciel, avec les mêmes exigences de précision
qu'un schéma, sans en revendiquer le statut.

Deux règles en découlent, et elles sont appliquées dans le code
(`src/lib/oxs.ts`) :

1. **Le coeur reste standard.** Tout ce qu'un autre logiciel sait lire —
   dimensions, palette, croix, demi-points, points arrière — est écrit dans les
   éléments usuels, sans attribut inventé nécessaire à la compréhension du motif.
2. **Le reste est optionnel et ignoré sans dommage.** Les données propres à
   Point Zéro voyagent dans un seul élément, `<pointzero_extra>`. Un lecteur qui
   ne le connaît pas obtient un motif correct ; Point Zéro qui relit un fichier
   sans cet élément obtient aussi un motif correct.

Le fichier JSON du projet (`toObject` / `fromObject`, version 3) est le seul
format **fidèle**. OXS est un format d'échange : il transporte un dessin, pas un
chantier.

## Le coeur portable

Élément racine `<chart>`, encodage UTF-8 déclaré.

### `<properties>`

| Attribut | Contenu |
| --- | --- |
| `chartwidth`, `chartheight` | Dimensions en cases. |
| `charttitle` | Nom du projet, échappé. |
| `author` | Auteur déclaré dans la provenance, vide sinon. |
| `copyright` | Licence déclarée dans la provenance. |
| `instructions` | Notes du motif. |
| `stitchesperinch` | `count / over` : le compte **effectif**, un lin 28 brodé sur 2 fils donne 14. |
| `palettecount` | Nombre de fils employés, toile exclue. |
| `software` | `Point Zero B`. |

### `<palette>`

Un `<palette_item>` par entrée, **l'indice 0 étant toujours la toile** :

| Attribut | Contenu |
| --- | --- |
| `index` | Position dans la palette OXS. `0` = toile, puis `palette.indexOf(idx) + 1`. |
| `number` | `DMC <code>` ; la toile porte `Cloth`. |
| `name` | Nom du fil tel que publié par DMC, ou `Cloth`. |
| `color` | Hexadécimal **sans** `#`. |
| `strands`, `bsstrands` | Brins au point de croix, brins au point arrière. |
| `symbol` | Numéro du symbole dans la bibliothèque vectorielle de Point Zéro (504 glyphes). Informatif pour un tiers ; Point Zéro le relit pour ne pas réattribuer les symboles par défaut. |

### Points

- `<fullstitches><stitch x y palindex/></fullstitches>` — croix complètes, une
  par case, `x` et `y` entiers depuis le coin haut-gauche.
- `<partstitches><partstitch x y palindex1 palindex2 direction/></partstitches>` —
  demi-points. `palindex1` porte la couleur, `palindex2` reste à `0`.
  `direction="3"` est la diagonale montante (`fwd`), `direction="4"` la
  diagonale descendante (`bwd`). C'est la convention la plus répandue parmi les
  lecteurs OXS, mais elle n'est pas universelle : un logiciel tiers peut
  afficher un demi-point dans l'autre sens.
- `<backstitches><backstitch x1 y1 x2 y2 palindex objecttype/></backstitches>` —
  `objecttype="backstitch"` pour les points arrière, `"straightstitch"` pour les
  points lancés. Les coordonnées sont en cases et **peuvent être décimales** :
  un point lancé peut partir du milieu d'une case.

## L'extension `<pointzero_extra>`

Un élément unique, après `<backstitches>`, contenant un document JSON **échappé
pour XML** (`&` `"` `<` `>`). Quatre clés :

### `q` — quarts de point

Quatre tableaux de `chartwidth × chartheight` entiers, indexés en ligne majeure
(`y * width + x`). Les valeurs sont des indices de la palette OXS (`pi`), `-1`
pour une case vide.

| Tableau | Quart de la case |
| --- | --- |
| `q[0]` | haut-gauche |
| `q[1]` | haut-droite |
| `q[2]` | bas-droite |
| `q[3]` | bas-gauche |

L'ordre suit le sens des aiguilles d'une montre depuis le coin haut-gauche. Un
trois-quarts s'écrit comme un demi-point (`partstitch`) plus un quart (`q`),
comme dans l'atelier.

### `special` — petites croix et perles

Tableau de `{ x, y, c, kind }` :

- `x`, `y` : position en cases, décimale. Une petite croix se pose à `0,25` ou
  `0,75` de la case ; une perle à `0,5` (centre).
- `c` : indice de palette OXS.
- `kind` : `"petite"` ou `"bead"`.

### `knots` — nœuds français

Tableau de `{ x, y, c }`, mêmes conventions de position et de couleur.

### `beadMap` — références de perle

Objet `{ "code DMC": "code de perle" }`, par exemple `{ "321": "DB0361" }` pour
une Miyuki Delica 11/0. **Restreint aux fils réellement présents dans la
palette** du motif exporté. La clé peut être absente quand le motif ne porte
aucune référence de perle.

Aucun coeur OXS ne connaît les références de perle : sans cette clé, un motif
perlé conserve ses positions de perles (`special`) mais perd le code du
fabricant.

## Relecture

`fromOxs` applique ces règles, dans cet ordre :

1. Un document sans `<properties>` dans `<chart>`, ou dont l'analyseur XML
   signale une erreur, est **refusé** (`OXS invalide`).
2. Dimensions hors de 1 à 1000 cases : refusées.
3. `stitchesperinch` : accepté seulement s'il correspond à un compte connu
   (7, 11, 14, 16, 18, 20, 22, 25, 28, 32, 36, 40) ; sinon le compte par défaut.
4. Chaque fil est retrouvé par son code DMC. **Si le code est inconnu** — marque
   différente, mélange, code altéré — le fil est retrouvé par sa couleur, au plus
   proche en CIEDE2000 parmi les 489 références DMC. La substitution est donc
   approchée, pas devinée au hasard.
5. `symbol` est relu quand c'est un entier dans `[0, 504[`.
6. Points et segments hors bornes, ou dont la couleur est absente de la palette,
   sont **ignorés individuellement** plutôt que de faire échouer l'import.
7. L'extension est lue dans un `try`/`catch`. `q` n'est accepté que si les quatre
   tableaux font exactement `w × h` ; `beadMap` ne conserve que les clés
   présentes dans la palette, avec une valeur de 1 à 40 caractères. **Une
   extension illisible est jetée, le coeur est conservé** : un JSON tronqué ne
   détruit pas un motif.
8. La provenance du fichier importé est marquée `kind: "oxs"`,
   `personalOnly: true` : un motif reçu d'ailleurs n'est pas présenté comme une
   création de l'atelier.

## Ce qu'OXS ne transporte pas

Choisi, et à connaître avant d'employer OXS comme sauvegarde :

| Donnée | Où elle reste |
| --- | --- |
| Progression brodée (`done`), fautes, stationnement | Fichier JSON du projet |
| Calques | Le motif exporté est **fusionné** (`compositePattern`) |
| Sessions, journal, séries | Fichier JSON |
| Stock, fournitures, liste de courses | Fichier JSON |
| Toile : type, marge, unités | Seul `stitchesperinch` et la couleur de toile passent |
| Mélanges à 2 brins | La **couleur** du mélange passe, pas la recette : à la relecture, le mélange devient le fil plein le plus proche |
| Symboles personnalisés hors de la bibliothèque Point Zéro | Le numéro passe ; un tiers n'a pas la bibliothèque |
| Annotations de la grille | Fichier JSON et PDF exporté |

La règle pratique : **OXS pour montrer un dessin à un autre logiciel, JSON pour
reprendre un chantier là où on l'a laissé.**

## Exemple minimal

```xml
<?xml version="1.0" encoding="UTF-8"?><chart><properties chartwidth="2" chartheight="1"
charttitle="Essai" author="" copyright="Tous droits réservés" instructions=""
stitchesperinch="14" palettecount="1" software="Point Zero B"/><palette>
<palette_item index="0" number="Cloth" name="Cloth" color="f7f2e8"/>
<palette_item index="1" number="DMC 321" name="Red" color="C72B3B" strands="2"
bsstrands="1" symbol="42"/></palette>
<fullstitches><stitch x="0" y="0" palindex="1"/></fullstitches>
<partstitches><partstitch x="1" y="0" palindex1="1" palindex2="0" direction="3"/></partstitches>
<backstitches><backstitch x1="0" y1="0.5" x2="1" y2="0.5" palindex="1" objecttype="backstitch"/></backstitches>
<pointzero_extra>{"q":[[-1,-1],[-1,-1],[-1,-1],[-1,1]],"special":[],
"knots":[{"x":0.5,"y":0.5,"c":1}],"beadMap":{"321":"DB0361"}}</pointzero_extra></chart>
```

(Dans le fichier réel, le JSON de `<pointzero_extra>` est échappé : `"` devient
`&quot;`. Il est présenté ici sans échappement pour rester lisible.)
