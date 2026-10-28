# Lot P0 — préservation des magasins locaux

Base : PR #42, `156434b`. Branche dédiée, jamais main. Le schéma canonique, les clés et les objets spécialisés restent inchangés.

## Correction

`storageSafety.ts` contrôle les octets EXISTANTS avant écriture, puis la nouvelle valeur. Statuts : absent, valide, JSON corrompu, version incompatible, schéma invalide, accès indisponible. Une lecture UI peut encore montrer un modèle de repli, mais elle ne peut plus le sauvegarder par-dessus un original rejeté. Aucun reset, migration ou réparation automatique.

Couverture des écritures JSON : WorldStore (donc OneSpace ET RippleCircle), Dossier via sa garde existante, patron courant, Academy et progressions, Design courant/brouillons, Mini-sites courant/brouillons/accompagnement, Programme, Budget, Administratif, Juridique, registre externe, Art/galerie, Musique/catalogue, Mode, fragments, bibliothèque de sujets, profil brodeuse/inventaire, accessibilité et préférences. Le guide Coach utilise aussi la garde avec le vrai localStorage ; son adaptateur de stockage injecté reste réservé aux tests.

Les clés de navigation, pointeurs juridiques, score du jeu et sonde de disponibilité ne sont pas des magasins JSON métier. Le backup legacy du patron n'est plus écrit lors d'une lecture : l'original reste à sa place. La bibliothèque IndexedDB refuse le remplacement d'un projet dont les données JSON ne peuvent pas être restaurées.

La galerie et les listes de brouillons refusent un tableau partiellement invalide, au lieu de filtrer les éléments inconnus puis écraser l'original. Le profil et l'inventaire sont contrôlés avant leur première écriture ; leur sauvegarde multi-clés n'est PAS une transaction atomique en cas de quota entre les deux écritures.

## Récupération

Un avertissement global reçoit uniquement clé/statut, jamais le contenu privé. Il propose un téléchargement explicite des octets actuels, sans les effacer. Conserver ce fichier en privé. La restauration/réparation reste manuelle, après analyse de la copie et accord explicite ; aucune API de déblocage automatique n'est ajoutée. Fermer le message ne débloque pas le magasin.

Un magasin d'une version future est bloqué. Aucune migration implicite n'est introduite. Les anciennes valeurs acceptées par les validateurs existants restent lisibles. Les validateurs permissifs existants ne constituent pas une garantie de préservation des champs qu'ils ne connaissent pas : les migrations et conflits multi-onglets restent une suite distincte.

## Recette

`npm run verify` ; tests `storageSafety.test.tsx` (statuts, quota, WorldStore direct, profil/inventaire, patron, ouverture de huit écrans sur corruption et version future). Les tests existants couvrent les données valides et fonctions créatives.

Recette navigateur à faire : copier un profil de test, altérer uniquement une clé fictive, ouvrir l'écran, vérifier l'avertissement et l'export brut, vérifier octets inchangés après rafraîchissement, puis valider clavier/390px/768px. Aucun navigateur autorisé n'est disponible dans cette session. Ne pas tester la corruption sur de vraies données.

## Suites de la mission globale

1. Sécurité : dépendances ciblées, modules serveur `node --check`, tests du GET sans configuration et refus d'administration ; pas de services externes activés.
2. Landing : six séquences immersives originales, états prototype/vision explicites, liens existants conservés et recette responsive.
3. Références/projections : résolveur canonique, démonstrateur mariage limité, un horaire → programme/mini-site/document.
4. UX : cibles lisibles, états local/brouillon ; performance sans casser PWA ; backend et futur partage uniquement après accord.

La publication d'une PR peut déclencher la preview et la CI déjà configurées ; leur consommation n'est pas garantie gratuite. Aucun service payant n'est activé et aucun déploiement production n'est demandé.

Résultats locaux : suite complète 450/450 (57 fichiers), build réussi ; après ajout du cas limite 25 profils, suite ciblée 15/15 et TypeScript final réussi. La CI de la PR doit revérifier les 451 tests sur le commit publié.
