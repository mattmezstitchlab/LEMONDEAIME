/**
 * Ce que montre chaque construction du studio.
 *
 * - `VITE_SITE=broderie` : le site Point Zéro à part, la broderie seule (sites/point-zero).
 * - `VITE_PROTOTYPES=1` : les aperçus privés montrent aussi ce qui n'est pas public (le film LUMIERE, la Galerie des Vivants,
 *   Explorer, les essais, l'accueil AIME du Disque et du Cube). Sans cette variable — la production de lemondeaime.com —
 *   ces parties n'existent pas : ni lien, ni menu, ni adresse (elles ramènent à .0NE). Oublier un réglage ne publie donc rien.
 */
export const SITE_BRODERIE = import.meta.env.VITE_SITE === "broderie";
export const PROTOTYPES = import.meta.env.VITE_PROTOTYPES === "1" && !SITE_BRODERIE;
/** la Galerie des Vivants (exposer une copie de ses créations) : seulement sur les aperçus privés */
export const GALERIE = PROTOTYPES;
