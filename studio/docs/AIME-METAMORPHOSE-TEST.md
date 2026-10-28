# MÉTAMORPHOSE : parcours de test et tranche de composition

Base vérifiée : #47 `fa1148e`, CI réussie ; Design Lab référence `3634a31` inchangée. Les protections de stockage sont conservées. Pas de modification de production ni de secret par cette PR.

## Pourquoi le scanner ne répondait pas

`POST /api/metamorphose-scan` attend `POINTZERO_SCAN_ACCESS_CODE`, comparé par empreintes de longueur fixe via timingSafeEqual. Aucun environnement Vercel du projet ne contient de variable au moment de la vérification : le handler retourne donc 503 avant toute requête externe. Le code n'est pas récupérable dans le dépôt et ne doit jamais y être ajouté.

## Activation humaine sécurisée — Preview seulement

1. Projet pointzero → Settings → Environment Variables : https://vercel.com/matthieulecointre-9534s-projects/pointzero/settings/environment-variables
2. Créer dans un gestionnaire de mots de passe un secret aléatoire fort (par exemple 32 octets), le conserver en privé. Ne pas le coller dans une conversation, un commit ou des logs.
3. Ajouter `POINTZERO_SCAN_ACCESS_CODE` comme variable sensible **Preview**, limitée à la branche de cette PR. Ne pas sélectionner Production.
4. Ajouter `POINTZERO_SCAN_ALLOWED_HOSTS` : liste exacte de noms de domaines possédés, séparés par virgules, sans protocole/chemin/wildcard. Exemple non secret : `mon-site.example,www.mon-site.example`. Les domaines de la liste restent soumis au contrôle DNS public ; liste vide = refus.
5. Reconstruire uniquement la preview de cette branche après configuration (action non effectuée dans cette mission). Ne pas promouvoir. Les déploiements déjà créés ne reçoivent pas rétroactivement les variables.
6. Ouvrir `/atelier?studio=metamorphose`, saisir URL HTTPS finale du site autorisé, saisir le secret dans le champ privé, confirmer l'autorisation, lancer. Le code est envoyé dans un header HTTPS, pas dans l'URL ; aucun stockage local du code n'est ajouté.
7. Vérifier titre, fragments et limites ; absence de secret dans Network URL et console. Tester une mauvaise valeur (401), absence de consentement (400), domaine hors liste (400), domaine interne (400), puis répétition rapide (429 par instance).

Cette procédure exige une intervention humaine de saisie du secret. L'agent ne dispose pas ici d'un outil de saisie protégée qui permettrait de le créer sans exposition. Aucun contournement ni désactivation du gate. Une identité administrateur serveur pourrait remplacer le secret plus tard, avec sessions, droits et audit ; les rôles locaux OneSpace ou la simple présence sur une preview ne suffisent pas.

## Sécurité et limites vérifiées dans le code

HTTPS uniquement, sans identifiants, IP littérale interdite, port 443, IPv6 refusée ; refus des adresses internes/réservées, DNS vérifié puis adresse épinglée pour éviter un changement de résolution ; redirections non suivies ; HTML seulement ; 1 Mo maximum, timeout 9 s et fonction 20 s. Ajout d'une liste de domaines exacte, contrôle Origin lorsqu'il est fourni, taille du body effectivement sérialisé, code borné, une requête active et pause de 10 s **par instance**. Ce dernier contrôle n'est PAS un quota distribué : avant diffusion élargie, prévoir WAF ou limite centrale autorisée et budget. Le scanner reste privé pour tests limités, pas un proxy public.

Tests Node : secret généré temporairement dans le processus sans affichage, transport/DNS simulés, authentification, consentement, domaine hors liste, DNS loopback, HTML parsé et origine étrangère. Ces tests prouvent le handler, pas l'accès réseau de la preview. Aucun site tiers contacté par le test. Le sandbox ne peut pas faire de requêtes aux déploiements ; test en ligne non effectué.

Prise en charge : une page HTML statique, titre et H1/H2/H3 (24 maximum), image OpenGraph éventuelle et observations heuristiques. Pas de JS exécuté, capture navigateur, téléchargement de ressources privées, session/cookie, extraction CSS complète, audit juridique, récupération de backend ou reconnaissance générale de composants interactifs. Un site SPA peut produire peu de fragments ; utiliser une page HTML statique possédée pour la première recette.

## Compositions réelles, non deuxième projet

`compositionLayout.ts` fournit la grammaire CSS partagée éditorial/régulier/immersif, utilisée par export HTML de fragments et par le moteur Mini-site. La grille d'édition existante reste un outil de manipulation ; le nouvel iframe affiche un document réellement à 390/768/1200 px, avec ses propres media queries. L'export utilise le même renderer que cet aperçu. Il n'est ni une capture ni une réplique fonctionnelle du site inspecté.

Mini-site : choix de composition optionnel dans le Studio, même objet/id/contenu/binding de dossier, aucun nouveau magasin. Les anciens sans choix gardent leur rendu. Changer de composition ne crée pas de copie. Pas d'export de code serveur ou de publication automatique. Les trois cas mariage, association (présentation) et professionnel (portfolio) sont testés sur les moteurs réels ; cela ne prouve pas encore une proposition automatiquement aboutie pour toute intention.

## Iconographie

14 dessins vectoriels originaux de cette tranche, grille 24, trait 1,5, caps/joins ronds ; tailles 16/24/32. `AimeSymbol` cache les icônes décoratives et exige un label pour les représentations informatives. Exports SVG dans le Studio Design System. Pas d'animation par défaut ; aucune étoile IA à quatre branches ou emoji dans cette nouvelle bibliothèque. Premiers remplacements dans l'en-tête AIME et le Dossier. Les autres anciens symboles/emoji du dépôt ne sont pas tous remplacés : migration à poursuivre, sans modifier les contenus créatifs des utilisateurs. Recherche d'antériorité juridique non réalisée ; aucune exclusivité revendiquée.

## Landing et recette visuelle

Pas de nouvelle refonte de landing dans cette tranche : la demande impose un avant/après visuel, impossible sans navigateur autorisé. Le hero historique, époques et architecture peuvent être remis en comparaison depuis Git, mais pas remplacés silencieusement. Les contenus des six séquences restent intacts, seul le premier signe de marque est raccordé à la nouvelle bibliothèque.

Recette obligatoire : navigateur bureau/tablette/téléphone, zoom 200%, navigation clavier, images absentes, pages longues, export/ouverture hors ligne. Vérifier qu'une composition conserve le texte sans troncature, les liens, le titre et les couleurs personnalisées ; les media queries et tests JSDOM ne certifient pas la qualité visuelle. Aucun nouvel environnement permanent ou service payant activé.

Suites : saisie du secret Preview et test réseau autorisé ; avant/après capturé ; modèles complets avec médias autorisés ; migration iconographique transversale ; tests clavier/iOS/Android ; quotas distribués avant ouverture du scanner à plusieurs utilisateurs.

Validation locale : 464/464 tests applicatifs (61 fichiers), 7/7 tests Node (dont scanner privé simulé), TypeScript, build et manifeste hors ligne réussis. Contrôles finaux après bornage du code/compatibilité des anciens Mini-sites : tests Node 7/7 et tests ciblés 7/7, TypeScript réussi. Audit npm : 0 vulnérabilité connue. Le test réseau d'une preview activée reste à faire par le propriétaire après saisie des variables. Aucun rendu visuel comparatif n'a été certifié.
