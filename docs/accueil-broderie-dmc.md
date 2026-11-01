# Broderie sous la vidéo de l’accueil

Base : convergence 2c9595d (retour arrière de #50). Cette proposition ne réintroduit pas UsagesDisque.

- Accueil : réutilisation de CrossStitchHome sous l’ouverture Fleur existante et sa courte introduction. En mode intégré : pas de second main, h1, header, footer ou héros floral. Sections, inventaire des outils, accès atelier/import et avertissement de sauvegarde conservés.
- Même source des huit chapitres sur accueil et /studio/ : suppression des captures et fonds illustrés dans le rendu ; fichiers médias conservés, non supprimés.
- Aplats provenant de FLOSS : DMC 154, 3347, 823, 3713, 3820, 932, 3818, 3848. Les valeurs hex sont lues dans le nuancier canonique, pas recopiées. Références visibles, couleurs écran indicatives.
- Texte noir/blanc selon la luminance, contraste calculé >=4,5 pour les huit aplats. Pas de transparence sur les détails.
- Depuis l’accueil, les commandes vont à l’atelier par les intentions existantes ; le choix d’un fichier se fait dans l’atelier, pas dans un champ racine qui perdrait le fichier. Visite : accès à la page Studio qui la lance. Reprise : ouvrage local restauré par l’atelier ; aucun faux ouvrage actif montré sur l’accueil.
- La route /studio/ reste compatible et présente la même narration ; pas de redirection serveur, ni de copie concurrente du contenu. L’atelier et ses callbacks internes ne changent pas.
- Édition privée ?edition inchangée côté Studio ; l’accueil réutilise explicitement la narration publique.

Aucun moteur, Disque, donnée, média, film, musique, API, variable, base, ressource ou dépendance modifié. Aucune fusion ou production. Les données de compte distantes restent non vérifiées sans environnement isolé.

## Simplification finale du header et de l’accueil

La demande suivante remplace le placement de la vidéo en tête de l’accueil : elle est désormais accessible par « Vidéo » dans le header, lecteur inchangé. Le composant d’ouverture n’est plus monté sur l’accueil (ses fichiers sont conservés).

| Avant sur l’accueil | Maintenant |
|---|---|
| Tout le Studio (12 capacités) | Catalogue canonique extrait dans catalogueStudio.ts, consultable depuis Studio dans le header |
| Importer (bloc bas) | Studio → Importer, même route d’entrée atelier ; formats/support de l’atelier inchangés |
| Vos ouvrages / Continuer / Mes ouvrages | Studio → Mes ouvrages / Continuer ; Mon espace conserve dossiers et partages |
| Boutons Ouvrir/Créer/Visite au-dessus des sections | Studio → Ouvrir/Créer/Visite ; la visite appelle le callback existant une fois via ?visite=1 |
| Deux films à explorer | Vidéo → Fleur ; Studio → UPTOWN/Fleur |
| Grandes entrées | Trois sections-liens DMC : Créer et broder, Importer un motif, Mes ouvrages |
| Avertissement sauvegarde | Conservé dans le menu Studio, pas supprimé |

L’accueil intégré ne monte plus #tout, #csh-import, #commencer, .csh-actions-contextuelles, ni les anciens groupes de boutons. La présentation autonome /studio/ garde ses commandes locales fonctionnelles ; l’atelier reste intact. Le menu utilise le même dispositif modal accessible que le compte, un seul ouvert à la fois, corps de page inerte, Échap et restitution du focus au déclencheur. Les comptes connectés restent non testés hors simulation.
