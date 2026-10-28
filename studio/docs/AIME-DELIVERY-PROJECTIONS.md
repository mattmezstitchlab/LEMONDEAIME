# Lot projections / démonstrateur mariage / UX

Base : accueil immersif `7c60582`, lui-même sur sécurité et P0. Aucun nouveau magasin, Kernel ou Dossier Universel.

## Démonstration reproductible

1. Ouvrir `/espace`, cliquer **Essayer le mariage fictif — créer un dossier local**. Cette action explicite crée un seul WorldSpace et ses deux moments fictifs, en une écriture gardée. Pas de noms ou données réels importés.
2. Dans **Un dossier, trois projections**, modifier l'heure de Cérémonie et confirmer.
3. Le programme du dossier, l'aperçu Mini-site et le récapitulatif utilisent la même valeur. L'historique canonique contient avant/après et confirmation.
4. Ouvrir explicitement la projection dans le Studio Mini-site (confirmation avant remplacement du brouillon courant). Le titre et le style restent personnalisables. Le programme lié est calculé à la lecture depuis WorldSpace.moments ; les événements internes et storage actualisent l'aperçu sans sauvegarder une copie du programme.
5. Personnaliser le texte de la section Programme la dissocie explicitement en mode custom. Le bouton de dissociation capture l'affichage courant ; reprendre le suivi requiert confirmation et conserve le texte personnalisé dans le modèle local.
6. Exporter un HTML produit un instantané ; il ne se met PAS à jour après téléchargement. Le JSON Mini-site garde sa référence : il ne remplace pas une sauvegarde du dossier canonique.

Une source absente, corrompue ou d'un autre dossier bloque l'aperçu/export HTML lié ; pas de réparation. Le mode custom reste utilisable indépendamment de la source. Les anciens MiniSite sans binding restent compatibles. Supprimer la section liée supprime aussi sa liaison, jamais le moment canonique.

## Réutilisation et contrats

- `dossierProjections.ts` : schéma d'interface v1 limité à trois blocs autorisés, chronologie, Mini-site et document. Aucun code libre ni nouveau builder.
- Mini-site : moteur responsive existant, binding versionné optionnel, source canonique par WorldSpace.id.
- Document : `createAdminDocument` et `docToHTML` existants, brouillon rendu en mémoire.
- Registre existant étendu de 5 à 8 capacités : chronology.project, mini-site.project, document.project. Tests d'entrée/sortie réels. Preuve des nouveaux moteurs par blob Git exact et test qui recalcule son empreinte, plutôt qu'attribuer les nouvelles fonctions à un ancien commit. La CI/PR publiée fournit la preuve d'intégration.
- Programme du dossier : projection directe de `WorldSpace.moments`, PAS copie dans `ProgrammeStore`. Le Studio Programme pédagogique historique garde ses séances ; sa migration/synchronisation générale est volontairement différée faute de date, durée et lieu canoniques définis pour tous les cas.
- Budget/Administratif/Programme peuvent découvrir l'identité canonique via le sélecteur commun. Juridique retrouve aussi les supports Academy stockés par dossier, et leur titre lié/personnalisé. Aucun contenu n'est dupliqué dans WorldSpace.

## UX

Le diagnostic propose des libellés lisibles plutôt qu'une saisie de code technique. Un autre besoin nécessite une description et confirmation. Les identifiants d'adaptateurs ne sont plus affichés dans le parcours principal. Un changement du dossier invalide le diagnostic affiché. Le JSON de besoin reste une proposition à copier, non une décision persistée.

## Tests

`npx vitest run src/__tests__/weddingProjections.test.tsx src/__tests__/capabilityRegistry.test.ts src/__tests__/dossierCapabilities.test.tsx`

Le test DEMO monte le Dossier ET le véritable MiniSiteStudio, confirme 15:45 et contrôle les trois rendus plus l'absence de réécriture du MiniSite sauvegardé. Tests : personnalisation, source absente/étrangère, version du binding, horaire invalide, octets corrompus, identité Budget et Academy/Juridique, historique sans doublon, preuve du moteur.

## Limites et point de reprise

- Recette JSDOM et contrats : pas une recette visuelle iPhone/desktop, audio ou impression physique.
- Pas de publication/RSVP serveur, comptes, rôles effectifs, invitations ou révocation. Un futur partage exige identité authentifiée, grants limités par ressource/champ/action/durée, journaux et contrôle serveur. Les rôles SpacePerson restent descriptifs.
- Pas d'unification complète de tous les magasins : Design, Métamorphose, Budget/Programme historiques et bibliothèque créative restent des ressources spécialisées ; leurs migrations/résolveurs doivent être testés un par un.
- Le titre Mini-site est initialisé puis personnalisable, seul le programme est en suivi canonique dans ce lot.
- Le schéma d'interface est fixe et de confiance, pas un environnement généré arbitrairement.
- Besoins : toujours mémoire/export, pas de coffre de sauvegarde complet ni recherche sémantique.
- Suite : recette visuelle des PR, restauration/export complet, résolution inter-Studios plus large, lazy-loading du shell/Studios avec non-régression PWA. Aucun service d'identité, base distante, IA ou paiement sans nouvelle validation.

## Ordre de revue

#42 → #43 stockage → #44 sécurité → #45 accueil → cette PR. Aucun merge automatique. La dernière preview contient cumulativement les quatre lots, sans changer main. Le coût des CI/previews existantes n'est pas garanti nul ; aucun service supplémentaire n'est activé.

Résultats locaux : suite complète 458/458 (59 fichiers) et 6/6 tests Node réussis. Après les derniers contrôles de liaison et de découverte : 22/22 ciblés registre/intégration, puis 21/21 Dossier/mariage ; TypeScript et build finaux réussis, manifeste hors ligne contrôlé. Audit npm toujours à 0 alerte connue. La CI publiée doit revérifier l'ensemble sur son SHA. Les intentions de mariage créées par le parcours normal portent désormais aussi le kind canonique mariage, pas professionnel.
