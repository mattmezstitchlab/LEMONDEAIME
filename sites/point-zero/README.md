# Point Zéro — le site de la broderie point de croix

Un site à part, uniquement pour la broderie : l’édition en chapitres (l’accueil), l’atelier (Mes ouvrages, l’import d’un patron PDF, les rosaces 5D par « Composer »), et le Tambour vivant (caméra).
Rien des autres concepts (.0NE, LUMIERE, ATLAS, la Galerie des Vivants, les comptes AIME) : leurs adresses renvoient à l’accueil, aucun appel au serveur AIME n’est fait.

Le code est celui du studio (`../../studio`), construit avec `VITE_SITE=broderie` (`studio/src/lib/site.ts`) et `AIME_BASE=/`.
Les ouvrages restent dans le navigateur de la personne (IndexedDB) ; rien n’est envoyé.

- Construire en local : `cd studio && AIME_BASE=/ VITE_SITE=broderie VITE_POINTZERO_NAV0=1 npx vite build --outDir ../sites/point-zero/dist`
- Vercel : un projet à part, dossier racine `sites/point-zero`, protégé (Vercel Authentication sur tous les déploiements). Aucune publication publique sans l’accord de Matt.
