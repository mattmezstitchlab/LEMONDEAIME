# Point Zéro B — analyse et feuille de route

Audit de code réalisé le 13 octobre 2026 sur `7d2982b` (branche `arena/b8d87879-pointzero`).
Tout ce qui est affirmé ici a été vérifié dans le source ; les numéros de ligne sont indiqués.

État mécanique du dépôt **au moment de l'audit** (le bilan après livraison est
en §6) :

| Contrôle | Résultat |
| --- | --- |
| `npm install` | 126 paquets, aucun avertissement |
| `npx tsc --noEmit` | 0 erreur (TS `strict` + `noUnusedLocals` + `noUnusedParameters`) |
| `npm run build` | OK, 2 212 modules, 7,8 s |
| Bundle | `dist/index.html` seul, 3 416 ko (1 090 ko gzip) + `conversion.worker.js` 40 ko |
| `npm run dev` | OK, landing HTTP 200 |
| Tests automatisés | Aucun (pas de vitest, pas de `.github/`) |
| README / LICENSE | Absents |

Taille : 9 066 lignes en `src/` (18 composants, 24 modules `lib/`), 664 lignes de CSS.

---

## 1. Ce que c'est

Un **atelier de point de croix complet, 100 % client**, en React 19 + Vite 7 + Tailwind 4,
compilé en un unique fichier HTML autonome (PWA : `sw.js`, manifeste, wake lock).
Cible explicite : **iPad + Apple Pencil**, avec repli clavier/souris.

Le positionnement est le vrai différenciateur. Ce n'est pas un convertisseur photo → grille
de plus : c'est **un seul projet qui traverse deux gestes**, protégés l'un de l'autre.

- **Créer** : dessiner le patron (points, fractions, formes, sélection, calques, alphabet compté).
- **Broder** : suivre l'exécution sans pouvoir abîmer le dessin.
  `App.tsx:33` verrouille l'ensemble : `STITCH_TOOLS` ne contient que
  `hand, pick, mark, details, block, row, park, unpick, note`. Toute autre tentative renvoie
  « Passez en mode Créer pour modifier le dessin ». En lecture partagée, seul `hand` reste.

### Le modèle de données est au niveau d'un logiciel métier

`Pattern` (`lib/pattern.ts:70`) ne stocke pas une matrice de couleurs. Il stocke :

- sur les **cases** : `cross`, `fwd` / `bwd` (les deux demi-points « / » et « \ »),
  `q[0..3]` (les quatre quarts NW/NE/SE/SW → un demi + un quart = un vrai trois-quarts),
  `done` (avancement) ;
- sur les **trous** (0..w × 0..h, pas 0..w-1) : `back`, `long`, `knots`,
  `special` (`petite` | `bead`) ;
- le suivi : `mistakes` (à défaire), `parked` (fils garés **par coin de case**),
  `ornamentDone` (avancement **séparé** des contours et ornements), `annotations`, `sessions` ;
- la structure : `layers` + `activeLayer`, `symbolMap`, `supplies` (écheveaux entiers,
  mètres partiels, lot de teinture), `provenance`, `fabric`, `waste`, `backStrands`.

Tableaux typés + indices de palette : compact, et `toObject`/`fromObject` sérialisent en
tableaux plats. C'est le niveau de détail d'un Pattern Keeper, pas d'un jouet.

### Les dix points vraiment forts

1. **Colorimétrie sérieuse.** `srgbToLab` correct (gamma sRGB, blanc D65),
   `deltaE2000` écrit à la main, et **validé sur la paire de référence Sharma 2005**
   (`checks.ts` : `|ΔE(50;2,6772;−79,7751 / 50;0;−82,7485) − 2,0425| < 1e-4`).
   489 DMC « cross-checked » chargées depuis `craft-color-codes`.

2. **Auto-vérification honnête.** `runChecks()` tourne à l'ouverture de l'atelier
   (`App.tsx`) et est relançable depuis Réglages. Douze assertions métier : unicité de la
   palette, CIEDE2000, 504 symboles structurellement distincts, Aida 14 → 70 pts = 12,7 cm,
   lin 28 sur 2 = Aida 14, écheveau 8 m × 6 brins = 48 m simples, bloc 10 × 10 borné,
   parking et « à défaire » **qui ne modifient pas le patron**, suivi séparé contours/perles,
   conservation JSON par code DMC, sélection + rotation, aller-retour OXS.
   L'UI n'affiche jamais « réussi » avant exécution. C'est rare et c'est la bonne culture.

3. **`docs/AUDIT-B.md` a une section « Limites non dissimulées ».** Le dépôt documente
   ce qu'il ne fait pas. C'est le meilleur signal de qualité du repo.

4. **Persistance par codes, pas par indices.** `toObject` écrit
   `flossCodes: FLOSS.map(f => f.code)` ; `fromObject` **refuse** un fichier sans cette table
   au lieu de remapper silencieusement, et sauvegarde l'ancien JSON dans
   `point-zero:legacy-backup`. Décision juste : `registerBlend` pousse dans `FLOSS` à la
   volée (`mix:321/1+Blanc/2`), donc les indices sont instables entre deux sessions.

5. **504 symboles vectoriels générés.** 24 primitives déclaratives en espace unitaire
   [-1,1]² × 20 masques de 5 marqueurs périphériques (`lib/symbols.ts`).
   Une définition, plusieurs rendus (`drawSymbol` canvas, `drawSymbolPdf` jsPDF,
   `SymbolIcon` SVG React). Attribution persistante via `symbolMap` + échange
   anti-collision dans `FlossRail`.

6. **Import PDF à trois étages** — le morceau le plus ambitieux :
   - *vectoriel* : `pdf.js` `rawText` → découpe des runs multi-glyphes en glyphes
     individuels par interpolation d'avance (`splitRuns`), axes validés par variation
     strictement linéaire (`linearAxis`), pas de case déduit des graduations
     (`pitchFromAxis`), légende appariée par votes symbole → code ;
   - *raster de secours* : détection des réseaux de lignes (`detectBlocks`),
     **homographie projective** résolue par pivot de Gauss sur 4 coins calibrés
     (`chartRecognition.ts`), signature 12 × 12 par case, registre de symboles par
     distance de Hamming ≤ 22 / 144, `rectifyBlock` ;
   - *manuel* : mode « puzzle » à tableau magnétique, drag & drop, aimantage 2 × 2 mm,
     positions persistées avec le patron (`PdfPrep.tsx`, 977 lignes).

7. **Génération par prompt, avec l'insight juste.** On demande une **illustration lisse**
   (« photorealistic painterly, rich smooth color gradients ») et on interdit explicitement
   « no cross-stitch texture, no grid » — c'est le Floyd–Steinberg local qui produit le rendu
   point de croix. Plus un parseur de composition FR/EN (« un papillon sur un éléphant » →
   sujet principal / secondaire / relation renforcés), une graine pour varier,
   et `loadRemoteImage` en CORS anonyme avec délai de 120 s.

8. **Export OXS** au cœur portable (`fullstitches`, `backstitches`, `partstitches`) plus une
   extension `<pointzero_extra>` pour les quarts, perles et noeuds. La bonne décision
   d'interopérabilité : ce qui est standard reste standard, ce qui ne l'est pas est isolé
   et son échec de parsing n'abîme pas le cœur.

9. **WebRTC en lecture seule à auteur unique.** Échange SDP copié/collé manuellement,
   data channel chiffré, l'hôte est le seul écrivain. Le refus de promettre une fusion
   automatique non implémentée est documenté — c'est le choix honnête.

10. **L'atelier vidéo intégré.** MediaRecorder + `getDisplayMedia` + voix système ou fichier
    audio importé (durées **décodées** via `OfflineAudioContext` pour ne pas tronquer),
    sous-titres VTT générés depuis un script de 7 chapitres qui **pilote réellement l'UI**
    (`pointzero:canvas`, `pointzero:floss`, `pointzero:export-preview`) sur une **copie**
    de démonstration. Le produit se documente lui-même, sans fichier vidéo fictif.

    > **Supprimé depuis, et remplacé.** L'idée juste de ce point — le produit se
    > documente lui-même, sur l'interface réelle — a été conservée ; le moyen
    > (filmer, enregistrer, narrer) a été retiré à la demande : un studio de
    > capture, trois modes de voix et des sous-titres à caler, pour produire une
    > vidéo que personne ne regarde au moment où il faut cliquer. Le guide pas à
    > pas (§4, P5) montre un pictogramme à la fois, attend le geste réel, et
    > répond aux questions. Le mécanisme de cible (`data-guide`) est celui que la
    > visite filmée avait introduit ; la copie de démonstration et le pilote de
    > chapitres ont disparu avec elle.

Accessibilité réelle, pas décorative : annonce de case en `aria-live`, piège à focus des
panneaux avec restauration de l'élément précédent, stylet seul (`pencilOnly`),
mouvement réduit, grand texte, haut contraste, cibles ≥ 44 px.

---

## 2. Ce qui est cassé — 5 bugs vérifiés

Les deux premiers touchent **le patron imprimé**, c'est-à-dire le cœur de la valeur.

### 🔴 B1. Le PDF s'imprime avec les mauvais symboles

`lib/pdf.ts:243` construit `symIndex` depuis la position dans la palette :

```ts
p.palette.forEach((idx, pos) => symIndex.set(idx, pos));
```

et la légende fait pareil (`lib/pdf.ts:190` : `const sym = p.palette.indexOf(r.idx)`).

Mais **tout le reste de l'app** passe par `assignedSymbol(p, idx)`, qui lit `p.symbolMap` :
`Canvas.tsx:289`, `:477`, `:482`, `FlossRail.tsx:28`, `:154`, `PaletteSheet.tsx:34`, `:86`,
`oxs.ts:19`, `pattern.ts:272`.

→ Dès qu'une utilisatrice change un symbole dans la fiche fil (FlossRail a une UI dédiée,
avec échange anti-collision), **la grille imprimée et sa légende affichent un autre symbole
que l'écran et que le fichier OXS**. Sur un patron de 40 pages, c'est inutilisable.

Correctif minuscule : `computeStats` renvoie déjà la bonne valeur —
`pattern.ts:272` met `pos: assignedSymbol(p, idx)` dans chaque `ColorStat`.
Utiliser `r.pos` dans la légende, et construire `symIndex` avec
`p.palette.forEach(idx => symIndex.set(idx, assignedSymbol(p, idx)))`.

### 🔴 B2. Le PDF ignore les calques

`lib/pdf.ts:51` : `const p = input;` — aucun appel à `compositePattern`.
Or Canvas (`:191`), OXS (`oxs.ts:8`), l'export PNG (`ExportStudio.tsx:26`) et
`resizePattern` (`editing.ts:101`) composent tous.

→ Dès qu'un projet a des calques, le PDF exporte **les tableaux bruts du calque actif seul**,
sans fusionner les calques visibles. Export silencieusement faux, sans avertissement.

### 🔴 B3. Double téléchargement du PDF (et téléchargement pendant la démo)

`buildPdf` se termine par `lib/pdf.ts:381` :

```ts
const blob = doc.output("blob");
downloadBlob(blob, `${slugify(p.name)}${opts.bw ? "-nb" : "-couleur"}.pdf`);
return blob;
```

et `ExportStudio.tsx:16` fait `… if (preview) setUrl(…) else downloadBlob(blob, "…-a4-symboles.pdf")`.

→ Un export produit **deux fichiers aux noms différents**.
Pire : le chapitre « export » de la visite guidée (`App.tsx`, `guideChapter`) dispatche
`pointzero:export-preview` → `exportChart(true)` → `buildPdf` → **téléchargement non demandé
en pleine démonstration vidéo**, alors que l'intention est seulement d'afficher l'aperçu.

Correctif : retirer le `downloadBlob` de `buildPdf` (fonction pure qui renvoie le blob)
et laisser l'appelant décider.

### 🟠 B4. Le PDF n'imprime ni noeuds, ni points lancés, ni perles, ni petites croix, ni annotations

Grep sur `lib/pdf.ts` : `knots` n'apparaît **que deux fois** — au comptage de couverture
(`:126`) et dans le calcul d'écheveaux (`:141`). Jamais dans la boucle de dessin des grilles
(`:284-320`). `p.long`, `p.special`, `p.annotations`, `p.parked`, `p.mistakes` :
**zéro occurrence** dans le fichier.

→ La note de bas de page du PDF affirme : « les noeuds français par des cercles ».
C'est faux. Et la couverture annonce `totals.knots` et `totals.longCm` pour des points
qu'aucune page ne montre. Tout l'effort de suivi séparé (`ornamentDone`, `detailsNear`,
`markDetail`) est perdu à l'impression — alors que le tracé des points arrière, lui, existe
(`:352-364`) : il suffit de faire pareil pour `long`, `knots` et `special`.

### 🟠 B5. Grands patrons : clone complet à chaque pointermove

Trois effets cumulés, tous dans le chemin le plus chaud de l'app :

1. `Canvas.tsx:678` (`processSamples`) fait `clonePattern(base)` **à chaque appel**, donc à
   chaque événement pointermove (60–120/s sur iPad). Un 300 × 300 = 7 `Int16Array` +
   1 `Uint8Array` de 90 000 cases ≈ 1,3 Mo par clone → **~150 Mo/s d'allocation**.
   Un 1000 × 1000 (limite haute acceptée par `createPattern`) → ~15 Mo par clone : l'app gèle.
2. `Canvas.tsx:191` appelle `compositePattern(...)` **à chaque frame**. Sans calque c'est un
   early-return gratuit (`pattern.ts:189`) ; **avec** calques c'est un clone + fusion complète
   du motif à 60 fps.
3. Chaque `onLive` dispatche → nouvelle identité de `pattern` → le
   `useMemo([pattern])` de `FlossRail.tsx:26` relance `computeStats`, parcours complet des
   cases, **à chaque pointermove**.

→ C'est exactement le « grands patrons » que l'AUDIT-B liste dans « Tests métier encore
nécessaires ». Pistes : cloner une seule fois dans `beginStroke` et muter le draft pendant le
trait ; mémoïser le composite hors du chemin de dessin ; throttler ou rendre incrémental
`computeStats` pendant un trait (le delta de cases touchées est connu).

### 🟡 Plus petits, mais réels

- **`overlap` n'est exposé nulle part.** `ExportStudio` passe `{ bw, paper }` seulement : le
  chevauchement de 10 cases est permanent et non contrôlable. Et il **grise** les cases de la
  zone (`pdf.ts:290-303`) sans redessiner le contenu du bloc voisin : ce n'est donc pas un vrai
  chevauchement de repères, seulement une bande grise.
- **`buildPdf` est entièrement synchrone.** Un 1000 × 1000 = 625 pages × 1600 cellules ×
  primitives jsPDF. UI figée, sans progression ni annulation ; ExportStudio affiche juste
  « Préparation… ». À découper en tranches avec `await tick()` (le motif existe déjà :
  `pdfAnalysis.ts:73` définit `const tick = () => new Promise(r => setTimeout(r, 0))`).
- **L'aperçu PDF est un `<iframe src={blob:}>`** (`ExportStudio.tsx:28`). iOS/iPadOS Safari
  n'affiche pas les PDF en inline : sur la cible principale, l'aperçu est probablement vide.
  Le lien « ouvrir dans un nouvel onglet » sauve la mise, mais l'aperçu est un argument de vente.
- **9 outils sur 26 ne sont accessibles que par la feuille « Projet »** :
  `threeQuarter, petite, bead, lasso, move, line, rect, ellipse, note` (+ `details`)
  n'apparaissent ni dans le Dock (`Dock.tsx` n'expose que 16 outils) ni dans
  `KEYS` (`App.tsx:34`). `stampText` (l'alphabet compté) n'a aucun raccourci non plus.
- **La symétrie est partielle.** `Canvas.tsx:682` ne l'applique qu'à
  `cross, half, quarter, threeQuarter, petite, bead, erase`. Pas au remplissage, ni aux formes
  (`line/rect/ellipse`), ni au texte, ni aux points arrière / lancés / noeuds. Un motif
  symétrique avec contours doit être repris à la main.
- **`addKnotTo` écrase un noeud d'une autre couleur** posé au même demi-point :
  le filtre porte sur `x`/`y` seulement, pas sur `c` (`stitch.ts`).
- **Un seul projet « courant » en localStorage** (`point-zero:motif:v1`). Le multi-projet vit
  dans IndexedDB ; si IndexedDB est indisponible (navigation privée iOS), tout repose sur cette
  clé unique + l'export manuel. L'avertissement existe, le repli multi-projet non.
- **Aucun test automatisé.** `checks.ts` est un auto-diagnostic runtime, pas une suite :
  il ne tourne pas au build, ne bloque rien, et ne couvre ni `buildPdf`, ni `readVectorChart`,
  ni `analyzePdf`, ni `quantizePixels`. Pas de vitest, pas de `.github/`.
- **Pas de README, pas de LICENSE.** Or les données DMC sont **CC BY 4.0** et la licence
  exige un crédit (« Color data: craft-color-codes by MakeBead »). Le crédit est dans
  `dmc.ts` et l'AUDIT, mais ni à la racine du dépôt ni dans le PDF exporté.
  À régler **avant** toute publication.
- `package.json` s'appelle encore `react-vite-tailwind`, version `0.0.0`.
- **Aucun i18n** : tout est en dur en français, y compris les textes d'erreur — alors que les
  prompts IA générés sont en anglais. Le marché du point de croix est très anglophone
  (Etsy, Pattern Keeper).

---

## 3. Ce qu'on peut ajouter gratuitement avec ce qu'on a déjà

### La trouvaille : `craft-color-codes` est déjà installé et l'app n'utilise qu'un fichier sur 15

`lib/dmc.ts:1` importe **uniquement** `craft-color-codes/data/json/dmc-floss.json` (489 couleurs).
Le paquet contient **15 palettes et 3 689 couleurs**, plus une API JS typée
(`src/index.d.ts`) : `nearest`, `nearestAcross`, `convert`, `search`, `getColor`,
`ciede2000`, `deltaE`, `rgbToLab`. Code MIT, données CC BY 4.0.

**Zéro nouvelle dépendance. Zéro nouveau build.** Tout est déjà dans `node_modules`.

| Palette | Couleurs | Statut | Champ utile |
| --- | ---: | --- | --- |
| Miyuki Delica 11/0 | **1 288** | `measured` | `glass`, `discontinued` |
| DMC Mouliné Spécial | 489 | `cross-checked` | — (déjà utilisé) |
| Pixel art 256 | 256 | `generated` | — |
| Minecraft map | 244 | `official` | `base`, `shade`, `buildable`, `caveat` |
| MARD 291 / 221 / 185 | 291 | `community` | — |
| Artkal S | 199 | `community` | `sku` |
| DMC diamond painting | 154 | `cross-checked` | — |
| Perler Midi | 103 | `community` | `sku` |
| Hama Midi | 92 | `community` | — |
| Minecraft blocks | 53 | `approximate` | `block`, `group`, `survival` |
| Red Heart Super Saver | 44 | `approximate` | — |
| LEGO | 40 | `approximate` | — |
| Nabbi BioBeads | 30 | `community` | — |

### 1. 🔥 Les perles ont enfin une référence fabricant

`docs/AUDIT-B.md` avoue : « Les perles sont dessinées, mais leur reference fabricant doit
etre documentee dans les notes. »

Le paquet contient **Miyuki Delica 11/0 : 1 288 couleurs au statut `measured`**
— mesurées sur le matériel du fabricant lui-même, avec le type de verre
(`opaque`, `transparent`, `alabaster`, `silk`) et un flag `discontinued` (76 références).

L'app a **déjà tout le reste** : l'outil `bead`, le tableau `special[]` avec positions
demi-case, le comptage `beads` dans `computeStats`, le suivi `ornamentDone`, le rendu
canvas et PDF. Il ne manque que la table de références.

→ `convert('dmc', code, 'delica')` donne, pour chaque fil du motif, la perle la plus proche
avec son ΔE. On obtient : une vraie nomenclature de perles dans la fiche fil et dans le PDF,
un rendu qui tient compte du type de verre, et un avertissement sur les perles discontinuées.
**C'est le trou n° 1 du stock, et il est déjà comblé dans `node_modules`.**

### 2. Un sélecteur de marque — la couche couleur est déjà isolée

`lib/dmc.ts` est la seule couche couleur ; tout le reste consomme `FLOSS[idx]` et
`nearestFloss(lab)`. En la remplaçant par un objet `Palette`
(`{ id, colors, status, sources, license }`), on obtient le multi-marque.

Le format projet **n'a pas à changer** : ce sont toujours des indices + une table de codes,
et `toObject` écrit déjà `flossCodes` → la portabilité d'un fichier entre palettes est
acquise par construction. Il suffira d'y ajouter `paletteId`.

Attention à l'honnêteté des statuts, que l'app pratique déjà pour DMC : Delica est `measured`,
DMC `cross-checked`, mais Artkal / Perler / Hama / Nabbi / MARD sont `community`
(échantillonnés par des hobbyistes) et LEGO / Minecraft / Red Heart `approximate`.
À afficher comme tel — c'est exactement l'esprit de la section « Limites non dissimulées ».

### 3. Le même moteur, cinq marchés adjacents

Le rendu, la grille, la quantification, l'export PDF, le mode Broder : **rien à réécrire**.

- **Perles à repasser** (Perler / Hama / Artkal / MARD) : le même produit avec une autre
  palette et une autre marque en couverture. Le `craft` du fichier JSON dit littéralement
  `fuse-beads`. Ajouter la taille de plaque (carré 29 × 29, hexagone) et le gabarit de
  repassage au PDF.
- **Diamond painting** (154 drills DMC-codés, `cross-checked`) : le mode Broder devient
  « poser », avec le stylet, le parking par coin et le suivi par bloc **déjà écrits**.
  Les drills étant codés DMC, la conversion depuis un motif existant est triviale.
- **Minecraft map art** (244 couleurs `official`) : la grille devient une liste de blocs à
  récolter, avec `block` namespacé (`minecraft:white_wool`), `shade` (0/1/2/3 pour le relief),
  `buildable` et `caveat`. Le flag `survival: false` permet de filtrer les minerais
  irréalisables en mode survie. Personne ne fait ça sérieusement en français.
- **LEGO mosaic** (40 couleurs) : même export, liste de pièces.
- **Crochet / tricot** (Red Heart 44) : le calcul de métrage existe déjà, il faut le convertir
  en pelotes. MakeBead a un crochet pattern maker ; la palette est là.

### 4. `nearest(hex, 'dmc', { limit: 3 })` = la substitution de fil intelligente

L'app a déjà `replaceColor(p, from, to)` (`editing.ts`) et un bloc « Remplacer le fil actif »
(`WorkspacePanel.tsx:62`) qui **exige un code DMC exact** — sinon « Code DMC introuvable ».

L'API documente l'échelle : « Under ~1 looks identical, under ~3 is close, over ~10 is a
different color. »

→ « Le DMC 321 est épuisé à la mercerie ? Voici les 3 plus proches : ΔE 1,2 / 2,8 / 4,1. »
C'est **le** cas d'usage réel d'une brodeuse devant son rayon, et tout est déjà en place :
le Lab, le CIEDE2000, la palette, le remplacement global.

### 5. `convert()` et `nearestAcross()` pour les créatrices qui vendent

Un patron vendu en plusieurs gammes doit publier ses équivalences :
« DMC 3801 ≈ Delica DB0361 ≈ Perler P23 ». `convert(from, code, to)` renvoie les
correspondances classées avec leur ΔE. Une page « Équivalences » dans l'export PDF est
un argument commercial direct, et elle ne coûte qu'une boucle.

### 6. Les mélanges de fils existent déjà — il manque l'exploration

`registerBlend('321', 'Blanc', 1, 2)` crée le code `mix:321/1+Blanc/2` avec son RGB pondéré
et son Lab, et `computeStats` lit `f.blend` pour compter les brins réels de chaque composant.
C'est un vrai moteur de fils tweed/ombrés. `WorkspacePanel` expose `mixA`, `mixB`,
`aStrands`, `bStrands` — mais rien pour **explorer** : pas d'aperçu de dégradé, pas de
suggestion, pas de « tweed automatique entre ces deux DMC sur 5 paliers ».

### 7. Les 489 → 500

L'AUDIT documente le trou. `SOURCES.md` du paquet explique la provenance des 489 et les
11 conflits réglés (dont DMC 309, gris-brun en amont, rouge ici). À faire :
un avertissement explicite quand `flossIndex` renvoie `-1` — aujourd'hui c'est silencieux,
`nearestFloss` n'étant appelé en repli que dans `fromOxs`.

### 8. Le moteur permet encore, sans nouvelle technologie

- **Export SVG natif.** `lib/symbols.ts` est déclaratif en espace unitaire et l'AUDIT annonce
  déjà « un seul dessin, trois rendus (canvas, PDF, SVG) ». Il existe `drawSymbol` (canvas),
  `drawSymbolPdf` (jsPDF) et `SymbolIcon` (SVG React, un symbole à la fois) — mais **pas** de
  rendu SVG du patron entier. Un `drawSymbolSvg` + un parcours de grille donne un export SVG
  vectoriel, gratuit et très demandé (découpe, broderie machine, revente).
- **Grille « point zéro » configurable.** Tout est déjà centré sur `w/2`, `h/2` (axes rouges
  canvas `:275-285` et PDF `:345-348`). Permettre de déplacer l'origine, ou de numéroter en
  absolu / relatif.
- **Découpe en tuiles à imprimer.** `PdfPrep` sait déjà **assembler** des blocs en une grille
  (`assembleFromTileLayout`). L'opération inverse — découper un grand patron en tuiles
  numérotées avec repères de collage — est le même calcul, et c'est ce que veulent les
  brodeuses de grands formats.
- **Visualisation des statistiques de session.** `sessionSummary` calcule déjà
  `perMinute`, `longest` (chaîne de jours consécutifs), `activeDays` et une **ETA** datée.
  Rien ne l'affiche sous forme de calendrier de chaleur ou de courbe. Zéro dépendance.
- **Recherche par nom de couleur.** `search('dusty rose')` du paquet cherche dans les noms
  anglais ; `PaletteSheet` a déjà un champ code/nom local. Les deux se combinent.

### 9. Plus ambitieux, mais cohérent avec l'existant

- **PAT / XSD.** L'AUDIT dit explicitement que ce n'est pas revendiqué. XSD est documenté
  publiquement et le socle import/export multi-format existe déjà avec OXS.
- **Relais TURN optionnel** pour le partage WebRTC : le mode auteur unique est un choix
  assumé, mais un relais ferait passer le taux de connexion (l'AUDIT note que certains
  réseaux bloquent).
- ~~**Reconnaissance vocale** pour les sous-titres de l'atelier vidéo~~ — sans objet depuis
  la suppression du studio vidéo (P5).
- **Co-édition multi-auteurs (CRDT)** — seulement si le positionnement change.
  L'AUDIT a raison de ne pas le promettre aujourd'hui.
- **Étalonnage écran → carte physique.** L'app répète à juste titre que les couleurs écran
  sont des approximations. Un mode « imprimer une mire de 24 DMC, photographier sa carte
  physique à côté, corriger le profil » transformerait la limite assumée en fonctionnalité.
  C'est le seul moyen honnête de tenir la promesse couleur.

---

## 4. Ordre proposé — et ce qui en a été fait

Cette feuille de route a été déroulée intégralement le 13 octobre 2026. Les
statuts sont ceux du code livré, pas des intentions.

**P0 — correctifs, touchent le produit imprimé** ✅

- B1 ✅ symboles PDF alignés sur `assignedSymbol` : la légende et la grille
  partagent `r.pos`, verrouillé par deux tests qui réaffectent un symbole et
  vérifient que l'impression suit.
- B2 ✅ `compositePattern` en tête de `buildPdf` : un projet dont le calque actif
  est vide imprime le dessin des calques visibles.
- B3 ✅ `buildPdf` est redevenue une fonction pure, renvoie le `Blob`, et
  l'appelant décide du téléchargement.
- B4 ✅ `long`, `knots`, `special` (petites croix et perles) et `annotations`
  sont dessinés sur les pages de grille, avec renvois numérotés ; la table des
  ornements n'est pas imprimée quand elle est vide, et le suivi de broderie ne
  l'est jamais.
- B5 ✅ perf : cache LRU des instantanés de calques, `applyStrokeSegment` au lieu
  d'un clone par échantillon, brouillon unique pendant un trait, statistiques
  calculées sur une valeur différée.
- Au passage, quatre autres défauts vérifiés ont été corrigés : export
  entièrement synchrone (progression + `AbortController`), géométrie A4 qui
  débordait (case adaptative), nœud écrasé par `addKnotTo` quand la couleur
  différait, et flèche `→` imprimée « droite » sur la ligne Toile de la
  couverture (repli Latin-1 réservé à la navigation entre pages).

**P0 bis — légal** ✅

- `README.md` et `LICENSE` écrits ; attribution des données couleur dans le
  dépôt, dans l'interface et dans chaque export (PDF, SVG).
- Le paquet s'appelle `point-zero`.
- ⚠️ Découverte en route, et elle était un piège : **les tables de
  `craft-color-codes` n'ont pas toutes la même licence.** Les mesures MakeBead
  (DMC, Miyuki, diamant, MARD, Minecraft, pixel art) sont en CC BY 4.0, mais les
  tables de perles à repasser Perler, Hama, Artkal et Nabbi viennent de
  `maxcleme/beadcolors` sous MIT. Annoncer « CC BY 4.0 » partout aurait été une
  attribution fausse. L'application, les exports, le README et `LICENSE`
  affichent désormais la licence de la table réellement employée.

**P1 — crédibilité technique** ✅

- Harnais vitest + jsdom, 9 fichiers, **162 tests** au total ; `npm run verify` enchaîne
  `tsc --noEmit`, `vitest run` et `build`. Les 12 auto-tests de `checks.ts` sont
  exécutés à chaque passage de la suite : une régression du moteur fait échouer
  `engine.test.ts`.
- Workflow de CI écrit (Node 22, `npm ci && npm run verify`), consigné dans
  [`docs/INTEGRATION-CONTINUE.md`](INTEGRATION-CONTINUE.md).
  ⚠️ **Ni installé ni exécuté** : le jeton employé pour pousser cette branche n'a
  pas la permission `workflows`, et GitHub refuse la poussée d'un commit ajoutant
  un fichier sous `.github/workflows/`. Contourner ce contrôle en renommant le
  fichier aurait été la pire des réponses — il existe pour qu'un jeton compromis
  ne puisse pas exécuter du code sur les runners du dépôt. La commande jouée par
  le workflow, elle, est exécutée localement à chaque modification.
- Pas d'ESLint dans le projet ; `npm run verify` est la porte d'entrée, et c'est
  écrit dans le README pour qu'on n'attende pas un lint qui n'existe pas.

**P2 — valeur produit immédiate** ✅

- Miyuki Delica 11/0 : 1 288 références mesurées, chargement différé, choix au
  plus proche en CIEDE2000, références arrêtées exclues, colonne « perle » dans
  la légende PDF et SVG, crédit et limites de la mesure affichés tels quels.
- Substitution de fil : `nearestColors` factorisé dans `colorScience.ts` (une
  seule implémentation pour les fils et les perles), trois propositions avec
  écart ΔE00 et libellé, mélanges enregistrés exclus du vivier.

**P3 — croissance** ✅

- Sélecteur de marque : six tables chargées à la demande, table de
  correspondance calculée sur le motif **fusionné**, affichée dans l'export,
  téléchargeable en CSV et imprimée dans le PDF (résumé en couverture, une ligne
  par fil après la légende). Appariement exact par code quand la marque numérote
  comme DMC — le diamant DMC partage 154 codes — signalé « même code » au lieu
  d'être présenté comme une approximation.
- Les 10 outils absents du Dock sont exposés (groupe « plus », chiffres 1 à 9).
- Symétrie étendue : axes x, y et les deux, reflet des formes au relâchement, du
  remplissage (un jeu de contexte par axe) et des points arrière. La règle,
  verrouillée par les tests : **la symétrie reflète ce qui pose du fil, pas ce
  qui suit l'avancement** (marquage, stationnement, suivi, sélection exclus).

**P4 — différenciation**

- Export SVG ✅ (noir et blanc, symboles, légende, seuil d'omission annoncé).
- Visualisation des sessions ✅ : calendrier d'activité des treize dernières
  semaines dans le journal du projet, intensités relatives à la meilleure
  journée affichée — et c'est écrit, pour qu'un mois régulier à vingt cases ne
  se lise pas comme un mois vide. L'ETA et la vitesse existaient déjà en texte.
- Étalonnage ✅ dans le seul sens vérifiable : **une règle de 10 cm imprimée à
  mesurer** en couverture, avec la taille de case réelle et l'injonction de
  désactiver l'ajustement à la page. L'étalonnage écran → carte physique
  (profils ICC, spectrophotomètre) est hors de portée d'une application hors
  ligne : l'écran n'est pas l'autorité, la carte du fabricant l'est, et le
  logiciel le dit au lieu de promettre une fidélité qu'il ne peut pas garantir.
- Statut des palettes ✅ affiché honnêtement (`measured`, `cross-checked`,
  `community`) avec l'écart médian et le pire écart du motif.
- XSD ❌ **volontairement abandonné**, remplacé par `docs/OXS-EXTENSION.md`.
  OXS n'a pas de schéma publié faisant autorité ; écrire un XSD « officiel »
  aurait consisté à inventer une norme depuis un seul échantillon de fichiers et
  à laisser un document qui a l'air de faire foi. La documentation décrit
  exactement le même contrat — éléments, attributs, types, invariants, règles de
  relecture, ce qui est perdu — sans en revendiquer le statut. Deux pertes réelles
  d'aller-retour ont été corrigées au passage : les numéros de symboles et les
  références de perle sont maintenant relus.
- Découpe en tuiles à imprimer ⚠️ **c'était déjà fait** : la pagination du PDF
  découpe le motif en blocs de 40 cases avec bandes grisées de chevauchement et
  index des pages. Il n'y avait rien à construire, seulement à le dire.
- ❌ Reste ouvert : l'aperçu PDF dans `<iframe>` ne s'affiche pas sur iOS Safari
  (contourné par le téléchargement direct) ; `vite-plugin-singlefile` inline les
  tables chargées à la demande, donc le différé n'est réel qu'en développement.

**P5 — demandé après coup : guider au lieu de filmer** ✅

- Studio vidéo et voix supprimés : composant, capture `getDisplayMedia`,
  synthèse vocale, fichiers audio importés, script et sous-titres VTT, ainsi que
  la copie de démonstration et le pilote de chapitres qui allaient avec. Un
  bouton en moins, et environ 130 lignes de code qui n'avaient de sens que pour
  produire une vidéo.
- Guide pas à pas à la place : une étape à la fois, un seul pictogramme animé, un
  mémo court, et **validation par le geste réel** — l'outil est pris, une case est
  posée, un fil est choisi, un panneau est ouvert. « Suivant » et « Précédent »
  restent toujours disponibles : un guide qui bloque est pire que pas de guide.
  Deux pistes (Créer, Broder) qui suivent le mode en cours, reprise là où l'on
  s'est arrêté, démarrage seul à la première ouverture, boussole pour rejouer.
- Champ de questions : recherche dans une base écrite depuis le source
  (`src/lib/coach.ts`, 54 entrées couvrant les 26 outils, les panneaux, les
  formats, la toile, les mélanges, les correspondances, le journal, le partage,
  l'accessibilité et les limites assumées). **Aucun modèle distant** : hors ligne,
  sans compte ni clé, un agent appelé sur le réseau se tairait sans connexion et
  devinerait sur une interface qu'il ne voit pas. Un mot seul ne suffit pas à
  répondre, et une question hors sujet reçoit « je ne sais pas » suivi de pistes.
- Le groupe « plus » du dock s'ouvre seul quand le guide y pointe un outil : un
  pictogramme qui pulse dans un groupe replié ne guide personne.
- L'animation respecte « réduire les animations » (règle globale déjà en place),
  et la cible reste identifiable sans mouvement : le contour est dessiné dans les
  deux cas.
- 40 tests : pertinence et refus de la recherche, intégrité de la base et du
  parcours, reprise de progression et nettoyage d'un état illisible, rendu du
  guide, et invariant d'intégration — **chaque outil visé par une étape existe
  réellement dans le dock du mode concerné**.
- L'atelier est aussi monté entier sous jsdom (`src/__tests__/atelier.test.tsx`,
  11 tests) : démarrage seul, une seule cible animée, groupe « plus » ouvert par
  le guide, étape validée par le geste, Échappe qui masque sans effacer,
  parcours qui suit le mode, question posée dans le champ. Les suites isolées
  prouvaient que chaque pièce fonctionne ; celle-ci prouve qu'elles sont
  branchées. Elle a trouvé deux défauts que rien d'autre ne voyait :
  - **l'étape « prendre le point de croix » était invalidable.** L'outil croix
    est l'outil par défaut : attendre un changement d'état faisait patienter
    l'étape pour rien. La validation d'un outil se fait désormais au toucher,
    dans `chooseTool` — le geste, c'est d'aller le chercher, pas que l'atelier
    change d'avis ;
  - **les raccourcis plantaient si la cible de l'événement n'était pas un
    Element** (`e.target.closest` sans garde). Garde ajoutée.

---

## 5. Bilan chiffré après livraison

| Contrôle | Avant (`7d2982b`) | Après |
| --- | --- | --- |
| `npx tsc --noEmit` | 0 erreur | 0 erreur |
| Tests automatisés | aucun | 162, sur 9 fichiers |
| `npm run verify` | inexistant | tsc + tests + build |
| CI | aucune | workflow écrit dans `docs/INTEGRATION-CONTINUE.md`, non installé (permission `workflows` absente du jeton), jamais exécuté |
| README / LICENSE | absents | écrits, avec attribution par table |
| Bundle | 3 416 ko (1 090 ko gzip) | 3 674 ko (1 152 ko gzip) |
| Tables couleur employées | 1 sur 15 (`dmc-floss` seul) | 8 sur 15 (+ Delica, + 6 correspondances) |
| Outils exposés dans le Dock | 16 sur 26 | 26 |
| Symétrie | aucune | 3 axes, formes et remplissage inclus |
| Documentation | 1 audit interne | audit, feuille de route statuée, contrat OXS, CI |
| Aide dans l'atelier | studio vidéo à filmer soi-même | guide pas à pas validé par le geste + 54 réponses hors ligne |

Le poids ajouté est celui des données, pas du code : 71 ko de tables de
correspondance en plus des 149 ko de la Delica, soit environ 48 ko gzippés. Le
monde hors ligne se paie en octets embarqués. Les sept tables réellement
employées sont déclarées une par une dans `src/lib/palettes.ts` et
`src/lib/beads.ts` : un import à chemin variable ferait embarquer les quinze.

---

## 6. Sources

- craft-color-codes (15 palettes, 3 689 couleurs, API) : https://github.com/makebead/craft-color-codes
- DMC Mouliné Spécial art. 117 : https://www.dmc.com/US/en/products/mouline-special
- Spécification OXS : https://www.ursasoftware.com/OXSFormat/
- CIEDE2000, paires de référence Sharma 2005 : https://www2.ece.rochester.edu/~gsharma/ciede2000/
- WebRTC data channels : https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Using_data_channels
- Screen Wake Lock : https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API
