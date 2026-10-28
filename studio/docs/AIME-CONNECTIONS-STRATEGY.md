# Mes connexions — préparation, aucun fournisseur connecté

## Contrat commun

`ConnectionContract` dans aimeDomains.ts est un type préparatoire sans persistance ni effet réseau. À déplacer vers un module spécialisé lorsqu'un adaptateur réel sera autorisé ; ce n'est pas un deuxième registre de capacités. Dossier canonique = référence interne, ressources externes = références identifiées avec propriétaire, provenance, version, autorisations et état. Secrets côté serveur seulement, jamais localStorage.

Distinguer import (copie ponctuelle), lien/aperçu (pas copie ni droit d'accès), recherche (résultats autorisés), lecture, sync (copies + conflits + cursors), notification, action/write, automatisation, publication et export. Une déconnexion efface/revoque les tokens et arrête les nouveaux accès ; elle ne récupère pas les copies déjà exportées. Les références peuvent rester comme historique non accessible, selon choix/rétention. Journal sans secret ; suppression des caches et webhooks à prévoir. Aucun bouton factice « connecté ».

## Matrice préparatoire — preuves et inconnues

| Fournisseur | Usage possible / API officielle | Authentification et droits | Données/copies/risques | Conditions/coûts et état |
|---|---|---|---|---|
| Google Drive | Rattacher une pièce choisie, exporter un dossier | OAuth ; privilégier drive.file par fichier, pas drive global | id/fichier/version/owner, cache minimal ; conflits de version | Vérification selon scopes ; pas de connexion AIME. https://developers.google.com/workspace/drive/api/guides/api-specific-auth |
| Google Agenda | Planning ; débuter par export ICS existant | OAuth/scopes Agenda à confirmer endpoint par endpoint | Fuseaux, doublons, modifications concurrentes | Vérification scopes sensibles possible ; quotas/tarifs à vérifier. https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification |
| Gmail | Préparer un brouillon, jamais lire toute la boîte par défaut | Scopes Gmail précis non vérifiés dans cette tranche | Très sensible : correspondants, pièces et conservation | Différé : validation Google et coût sécurité potentiels, aucun accès annoncé |
| Outlook | Calendrier/courrier via Microsoft Graph | Permissions déléguées vs application, consentement utilisateur/admin | Identifiants, delta/caches, tenant ; ne pas dupliquer boîte | Limites service/tenant à vérifier, pas de tarif forfaitaire présumé. https://learn.microsoft.com/en-us/graph/auth/ et /graph/permissions-reference |
| Notion | Pages choisies, lecture/export et actions ciblées | OAuth connexion publique, page picker ; capacités consenties | page id, propriétaire, version ; blocs ne sont pas WorldSpace | Accès aux pages sélectionnées, refresh tokens et annulation à gérer ; quotas à vérifier. https://developers.notion.com/guides/get-started/authorization |
| Slack | Notification de projet, recherche autorisée ultérieure | OAuth scopes ; read et write séparés | Channel/message ids, pas miroir complet ; visibilité privée | Quotas et plan selon opération, aucun connector. https://docs.slack.dev/reference/scopes/ |
| Figma | Rattacher un fichier, lire composants/versions autorisés | OAuth/PAT ; file_content:read ; commentaires séparés | file/node/version ; pas édition arbitraire du canvas par REST | Variables read/write Enterprise selon doc ; quotas par siège/plan. https://developers.figma.com/docs/rest-api/scopes/ et /rate-limits/ |
| GitHub | Source/PR/CI et proposition de développement | GitHub App droits par dépôt ; token installation révocable | repo/ref/sha/PR, pas code privé entier en cache | Droits/quotas/politique organisation, pas compte AIME relié. https://docs.github.com/en/rest/apps/installations |
| Vercel | Lire preview/build et publier après autorisation | Intégration par scope équipe ; permissions minimales | project/deployment/sha ; mutation production séparée | Usage build/infra peut coûter ; API et scopes précis à définir. https://vercel.com/docs/integrations/create-integration/upgrade-integration |
| Dropbox | Export/lecture fichiers choisis | OAuth scopes + App Folder vs Full Dropbox | file id/revision, conflits et accès périmé | App Folder prioritaire pour nos exports ; tarifs/quotas à vérifier. https://developers.dropbox.com/oauth-guide |
| WhatsApp | Notifications métier consenties | WhatsApp Business Platform ; pas accès générique aux conversations personnelles | Numéro/destinataire/template/trace ; opt-out et restrictions | Auth, templates, conditions et tarifs exacts non vérifiés : ne pas intégrer avant étude dédiée. https://business.whatsapp.com/resources/faq |
| Base44 | Rattacher une application et ses ressources autorisées | API/backends/SDK selon application et intégrations | Pas copie automatique des données ; identité fournisseur distincte | Docs indiquent Builder+ pour backend/connecteurs ; pas accès universel à toutes les apps. https://docs.base44.com/Integrations/Using-integrations |

Les API connues ne suffisent pas à promettre une intégration complète. Les cases non vérifiées ne sont pas des permissions présumées. Les conditions commerciales doivent être réactualisées avant choix ; aucune dépense activée dans cette tranche.

## Premier parcours proposé

1. Aujourd'hui : fichier JSON/HTML/PDF/ICS, et références HTTPS explicites déjà présentes. Pas d'authentification fournisseur.
2. Après décision : Drive par fichier, lecture seule, un utilisateur pilote, connexion → sélection → référence dans dossier → lecture → erreur/revocation → déconnexion et cache supprimé. Backend identité, stockage chiffré tokens et consentement nécessaires.
3. Seulement ensuite : export autorisé vers une destination, idempotence, accusé et journal ; sync bidirectionnelle après tests de conflits. Les outils GitHub/Vercel utilisés par l'agent ne sont pas des connecteurs embarqués dans AIME.

## Confiance / tarifs

Proposition : code de création/export local accessible, services hébergés payants explicités avant action, éventuelles licences de contenu séparées. Pas de verrou à l'export des œuvres personnelles, pas de droit d'entraînement/commercialisation implicite. Les frais API, hébergement, support et paiements doivent être montrés avant abonnement/action ; aucun prix n'est adopté ici. Révocation technique et droits contractuels doivent être expliqués séparément.
