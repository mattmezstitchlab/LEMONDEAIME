# La Fleur du Ciel — relations de provenance (état réel au 1er novembre 2026)

Aucune copie, aucune base : ces relations nomment des fichiers qui existent déjà. Ce qui n'existe pas est dit.

| Élément | Nature | Fichier ou adresse | Statut |
|---|---|---|---|
| Œuvre originale | Une fleur dessinée pour le morceau (pas d'image source) | décrite dans `studio/public/clip/fleur-du-ciel/LISEZMOI.md` | réel |
| Fichier musical | « La Fleur du Ciel », composition et enregistrement de Matt | `studio/public/clip/fleur-du-ciel/la-fleur-du-ciel.m4a` (AAC, aligné sur le master) | réel, publié avec l'accord de Matt (1/11/2026) |
| Représentation brodée | Données `clip-brode` v1 : 127 morceaux de 50 images de 160 × 160 points | `clip.json`, `fils-NNN.bin.gz` ; lue par `/studio/fleur-du-ciel` et par l'ouverture de la landing | réel |
| Projet éditable (patron) | — | — | **aucun** : la fleur n'a pas de patron Point Zéro ; la ressemblance avec une broderie n'en crée pas |
| Vidéo exportée | Clip 4 min 13, 1080 × 1080, avec la musique | `la-fleur-du-ciel-brodee.mp4` (23 Mo) | réel ; jamais chargée par l'ouverture (lien de secours sans WebGL) |
| Versions publiées | PR #38 (la page), PR #39 (la vidéo), cette ouverture (landing) | historique Git de `main` | réel |
| Image de couverture | Image 880 × 880 rendue depuis les données (t = 196,2 s : le bouton fermé, avant l'éclosion) | `public/media/fleur-du-ciel-couverture.jpg` | dérivée de la représentation brodée |

Repères vérifiés dans les données (test `tests/ouverture`) : la toile est entièrement brodée à 196,0 s ; aucun point ne change entre 196,8 s et 197,0 s (l'aiguille s'arrête, le silence) ; l'éclosion fait changer plusieurs milliers de points à partir de 198,5 s (impact à 198,255 s) ; l'arc-en-ciel suit ; le cœur à 242,75 s.
