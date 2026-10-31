# Le Point : contrat technique du dock radial universel

Le Point est un bouton central permanent. Il ouvre un dock radial à navigation progressive. Son noyau ne connaît aucun métier : ni fil DMC, ni PDF, ni site, ni vidéo. Il comprend six choses : **des commandes, des états, des sous-menus, le focus, des actions et des retours.**

Deux créations le prouvent :
- le bloc Broderie (`components/blocs/broderie.tsx`) ;
- le bloc Image (`components/blocs/image.tsx`, page d'essai `/essai-image`).

Le commit qui a ajouté l'Image ne modifie aucun fichier du noyau.

## 1. Le noyau (portable, React seul)

| Fichier | Rôle |
|---|---|
| `lib/point/modes.ts` | Le type `ModePoint`, l'ordre de l'anneau, la navigation (`niveau`, `paginer`), les présentations |
| `lib/point/memoire.ts` | Les habitudes (Favoris) : des chemins d'identifiants, gardés sur l'appareil |
| `lib/point/confort.ts`, `lib/accessibilityCore.ts`, `lib/storageSafety.ts` | Les réglages de Confort |
| `components/point/LePoint.tsx` + `.css` | Le bouton, l'anneau, le panneau compact, l'arc, la liste, le clavier, les annonces |
| `components/point/Point.tsx`, `PanneauConfort.tsx` | Le Point d'un contexte : il apporte toujours Confort et son formulaire |

Le test `pointPortable` interdit tout import métier dans ces neuf fichiers (dmc, pattern, stitch, pdf, broderie, Studio…).

Hors du noyau, il y a l'adaptateur des blocs :
- `lib/point/registre.ts` ;
- `components/point/PointDuBloc.tsx`, qui pose le Point au bord du bloc sélectionné et évite les obstacles.

## 2. Une commande : `ModePoint`

```ts
interface ModePoint {
  id: string;            // stable : sert au focus, aux tests, à la mémoire (Favoris)
  nom: string;           // le mot court affiché et lu
  aide: string;          // une phrase : lue avec le nom, montrée en liste
  groupe: "acces" | "socle" | "metier" | "creation"; // l'ordre de l'anneau ; « acces » est réservé à Confort
  ouvrir: () => void;    // LA VRAIE ACTION (jamais un menu décoratif)
  actif?: boolean;       // un état : marque visible et « actif » dit au lecteur d'écran
  icone?: ReactNode;     // un pictogramme : un rond avec le mot dessous
  couleur?: string;      // une couleur : la commande devient une pastille
  valeur?: string;       // une valeur (« +20 », « 16:9 », « 50 % ») : une pastille à texte
  enfants?: () => ModePoint[]; // une famille : choisir remplace l'anneau par ces sous-commandes
  resteOuvert?: boolean; // le menu reste ouvert (une bascule dont on veut voir l'effet)
  annonceEnPropre?: boolean;   // la commande annonce elle-même ce qui change
}
```

Une commande peut donc prendre cinq formes :
- un **bouton** (icône et mot) ;
- une **couleur** (pastille) ;
- un **symbole** (le signe de `icone`) ;
- une **valeur** (pastille à texte) ;
- une **famille** (`enfants`).

Quand un niveau est fait d'au moins 70 % de couleurs ou de valeurs, l'anneau devient un **anneau serré de pastilles**. Si la famille parente est elle-même faite de couleurs, elle reste visible en **anneau intérieur**. C'est le seul cas où deux anneaux concentriques apparaissent.

## 3. Ce que le noyau garantit

- **Navigation :**
  - choisir une famille remplace les choix de l'anneau ;
  - pour remonter d'un niveau : Retour, Échap, Retour arrière ou le centre ;
  - Point Zéro (dès le 2ᵉ niveau) ramène au premier cercle ;
  - au-delà de 16 choix, un niveau est paginé par « Suivantes ».
- **Confort** est toujours la première commande, et toujours en haut. Son formulaire accessible et son accès direct (lien d'évitement, événement `pz:point:confort`) restent disponibles.
- **Clavier :**
  - Entrée ou Espace ouvre le menu ; les flèches tournent ; Début et Fin vont aux extrémités ;
  - Échap remonte, puis ferme ; Tab ferme ;
  - les touches ne fuient jamais vers le contexte.
- **Lecteur d'écran :**
  - `role="menu"` nommé « Le Point · <famille> » ;
  - `role="menuitem"` avec `aria-label` = nom, état et aide ;
  - `aria-haspopup="menu"` sur les familles ;
  - une annonce polie à chaque niveau (« Points : 5 choix. Échap pour revenir. »).
- **Présentation :**
  - anneau à partir de 720 px de large ;
  - panneau compact (deux colonnes, chemin en tête) en dessous ;
  - arc ou liste, au choix, dans Confort ;
  - jamais hors de l'écran ;
  - cibles d'au moins 24 px (44 px visés).
- **Centre** : une sphère nacrée, jamais de texte dessus. Dans un anneau de pastilles, le nom et l'aide du choix en cours (« DMC 351 · Corail », « Luminosité +20 ») vont dans un cartouche discret sous le disque.
- **Présentation « scène »** (`scene`, sur `Point` et `LePoint`) : le disque est posé dans une page (la landing), toujours ouvert, sans bouton ni portail. Mêmes niveaux, touches et annonces ; il ne prend le focus qu'après un geste ; un choix n'y referme rien, et Échap au premier cercle ne ferme pas.
- **Favoris** (`memoire`) :
  - les derniers choix (au plus trois d'une même famille), puis les plus utilisés ;
  - une seule entrée au premier cercle, absente tant qu'il n'y a rien à proposer ;
  - « Oublier » efface l'historique ;
  - le stockage est local (`pointzero:point:usage:<clé>`), jamais dans l'ouvrage.

## 4. Ajouter un type de bloc

```tsx
// components/blocs/video.tsx (exemple)
import { enregistrerTypeBloc, typeBloc } from "../../lib/point/registre";
export interface ContexteVideo { lecture: boolean; lire: () => void; /* … les vraies actions … */ }
if (!typeBloc("video")) enregistrerTypeBloc<ContexteVideo>({
  id: "video", nom: "Vidéo",
  commandes: c => [
    { id: "lecture", nom: c.lecture ? "Pause" : "Lire", aide: "…", groupe: "metier", actif: c.lecture, ouvrir: c.lire },
    { id: "couper", nom: "Couper", aide: "…", groupe: "metier", ouvrir: () => {}, enfants: () => [/* … */] },
  ],
});

// là où le bloc est sélectionné
<PointDuBloc<ContexteVideo> type="video" nom="Ma vidéo" selecteur=".mon-cadre" contexte={{ … }} />
```

Règles :
1. **Ne pas déclarer Confort.** Le Point l'apporte, et le registre refuse les doublons.
2. **Des identifiants stables et uniques par niveau.** La mémoire et les tests en dépendent.
3. **Chaque feuille appelle une vraie action.** Une famille n'a pas d'action ; son `ouvrir` est vide.
4. Le Cadre du bloc publie sa place dans les variables CSS `--fx0`, `--fy0`, `--fw` et `--fh` (sur l'élément `selecteur`). Le Point s'y pose : à droite si la place le permet, sinon dessous, sans couvrir les `obstacles`.
5. Un seul Point à l'écran : le contexte qui a la main le rend, les autres le taisent.
6. Le type n'importe rien du noyau en dehors de `registre`, `modes` (types) et `PointDuBloc`.

## 5. Réutilisation future (AIME Studio, ATLAS / FRAGMENT) — préparée, non intégrée

- Le noyau tient en neuf fichiers, avec React pour seule dépendance. Un hôte neutre façon FRAGMENT l'a déjà fait tourner (14/14).
- Piste : un paquet privé `@aime/point`, avec le préfixe de stockage en paramètre.
- Des types de blocs par projet : `fragment`, `composition`, `document`, `site`…
- Rien n'est branché dans ces projets à ce stade.

## 6. Tests

- `src/__tests__/point.test.tsx`, `pointDuBloc.test.tsx`, `memoire.test.ts`, `blocImage.test.tsx`, `pointPortable.test.ts`.
- `tests/e2e/parcours.py` : Broderie, trois parcours, critère « broder sans dock », Favoris.
- `tests/e2e/image.py` : bloc Image, avec vérification des pixels et du fichier exporté.
- `tests/e2e/mobile.py` et `tests/e2e/bloc.py`.
- Les tests manuels VoiceOver et NVDA sont décrits dans le protocole (S19 et suivants). Aucune conformité n'est déclarée avant ces tests.
