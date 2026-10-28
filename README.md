# LE MONDE AIME

Le site officiel de **lemondeaime.com** : AIME (la marque mère), Le Monde AIME (les studios et projets), Point Zéro (la Grille 44), le BurO (votre espace) et la Charte AIME.

## Ce qui est là

| Adresse | Page | État |
| --- | --- | --- |
| `/` | AIME — « Point Zéro des vivants », manifeste, fondateur, vision | En ligne |
| `/monde` | Le Monde AIME — la galerie des studios et projets | En ligne |
| `/point-zero` | La Grille 44 : ce qu'on écrit allume les briques, le fil suit les causalités | Moteur local ; Claude dès que `ANTHROPIC_API_KEY` est posée |
| `/buro` | Vos projets, ceux qu'on vous partage, vos archives | Réel, dans la base Neon, une fois connecté |
| `/entrer` | Un lien de connexion par e-mail (Better Auth + Resend) | Réel, mêmes comptes qu'AIMESTUDIO |
| `/charte`, `/a-plus` | La Charte AIME ; A+ (bientôt) | En ligne |

## Comment c'est construit

- Vite + React + TypeScript pour les pages ; des fonctions Vercel dans `api/`.
- **Comptes** : Better Auth (lien magique par e-mail, clés d'accès), repris d'AIMESTUDIO à l'identique (`api/_auth/`), même base, mêmes cookies : les comptes existants restent valables.
- **BurO** : `api/buro.mjs` lit et écrit les projets dans la table `spaces` (avec `space_members`), la même que celle d'AIMESTUDIO.
- **Point Zéro** : `src/lib/moteur.js` (moteur local) et `api/analyse.mjs` (Claude), même forme de réponse.

## Variables d'environnement (Vercel)

Mêmes noms qu'AIMESTUDIO, pour pouvoir tout rebrancher sans rien changer :

- `DATABASE_URL` (et les autres `DATABASE_*`) : la base Neon « le-monde-aime », via l'intégration Neon de Vercel.
- `BETTER_AUTH_SECRET` (le même qu'AIMESTUDIO, pour garder les comptes et les sessions), `BETTER_AUTH_URL` (`https://www.lemondeaime.com` en production).
- `RESEND_API_KEY`, `AUTH_EMAIL_FROM` : l'envoi des liens de connexion.
- `ANTHROPIC_API_KEY` (facultatif) : l'analyse par Claude dans Point Zéro.

Sans base ni secret, les comptes et le BurO répondent 503 et le reste du site fonctionne.

## La bascule depuis AIMESTUDIO (réversible)

1. Projet Vercel `lemondeaime` relié à ce dépôt ; la base Neon et les variables y sont branchées (aimestudio n'est pas touché).
2. Essai complet sur l'adresse d'aperçu : connexion, BurO, Point Zéro.
3. Le domaine `lemondeaime.com` (et `www`) passe d'aimestudio à `lemondeaime` dans la même équipe Vercel : le DNS ne change pas.
4. aimestudio reste intact quelques semaines pour revenir en arrière ; ensuite seulement, on le débranche.

## Commandes

`npm run dev` · `npm test` (tests serveur) · `npm run build` · `npm run verify` (les deux).

> `AIME PROJETS.zip` : archive de projets déposée à la création du dépôt (Timeline Cerise, Ripple clavier, Univers AIME), gardée telle quelle.
