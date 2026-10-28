// Les projets présentés par LE MONDE AIME (le portfolio) : les deux premiers, la validation d'un projet, et qui peut les modifier.
// Ce module ne dépend de rien (ni Node, ni base) : le serveur et le site l'importent tous les deux.

/* Les projets d'origine. Ils servent tant que la table « projets » n'existe pas (avant la migration) ou ne répond pas,
   et la migration 2026-10-28-02 les inscrit une première fois dans la table. */
const S = n => '/media/studio/' + n + '.jpg';
const W = n => '/media/wedding/' + n + '.jpg';
export const DEFAUTS = [
  {
    slug: 'brode-way', titre: 'Brode Way', categorie: 'Broderie', annee: 2026, statut: 'en-ligne', ordre: 1, une: true, publie: true,
    accroche: 'L’atelier de point de croix : dessiner, lire et broder un patron, case par case.',
    description: 'Brode Way est un atelier de broderie complet, dans le navigateur.\n\nOn y dessine un patron qui nous ressemble, on le lit en rendu réaliste, à plat ou en symboles, et on suit sa progression fil par fil. Les fils DMC du motif sont dans le dock, avec leur avancement et l’état du stock.\n\nUn patron en plusieurs pages PDF se recompose sur une table magnétique, raccords et couleurs vérifiés. Chaque ouvrage se range dans l’espace AIME de la personne et la suit d’un appareil à l’autre.',
    role: 'Conception, design et développement',
    lien: '/studio/atelier',
    couverture: S('dessiner'), alt: 'Brode Way : une initiale botanique brodée au point de croix, entourée de fleurs roses',
    galerie: [
      { src: S('fils'), alt: 'Les fils DMC du motif en pastilles dans le dock du bas' },
      { src: S('patron'), alt: 'Le motif affiché en symboles de patron' },
      { src: S('progression'), alt: 'La timeline du patron dans le dock du bas, couleur par couleur' },
      { src: S('puzzle-pdf'), alt: 'Un patron PDF recomposé sur la table de montage magnétique' },
    ],
  },
  {
    slug: 'aime-wedding', titre: 'AIME Wedding', categorie: 'Mariage', annee: 2026, statut: 'en-cours', ordre: 2, une: false, publie: true,
    accroche: 'Le site officiel de l’union : une page pour les mariés, les prestataires et les invités.',
    description: 'AIME Wedding réunit autour d’une union toutes les personnes qui la font vivre.\n\nLes mariés ont la page de leur union, les prestataires une vitrine pensée pour leur métier, les invités leur place dans l’histoire. Chacun voit ce qui le concerne, au bon moment.\n\nLe projet est en cours : la page d’accueil, les unions, le Réseau des prestataires et l’espace personnel sont en construction.',
    role: 'Conception, design et développement',
    lien: '/aime-wedding',
    couverture: W('piscine'), alt: 'Un couple de mariés au bord de la piscine d’un motel dans le désert',
    galerie: [
      { src: W('union-ines-hugo'), alt: 'Un couple sur un balcon face aux toits de Paris et à la tour Eiffel' },
      { src: W('collection-chateaux'), alt: 'Un bal de mariage devant un château illuminé' },
      { src: W('invites-table-7'), alt: 'Une longue table dressée sur une terrasse face à la mer' },
      { src: W('collection-electro'), alt: 'Des mariés s’embrassent sur une piste de danse aux néons' },
    ],
  },
];

export const STATUTS = { 'en-ligne': 'En ligne', 'en-cours': 'En cours', 'bientot': 'Bientôt' };
export const LIMITES = { titre: 80, accroche: 200, description: 6000, categorie: 40, role: 120, alt: 200, galerie: 12, projets: 60 };

const ligne = (v, n) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const texte = (v, n) => String(v ?? '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, n);
export const slugOk = s => typeof s === 'string' && /^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/.test(s);
export const slugDe = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/, '');
/* une image : un fichier du site (/media/…) ou un fichier envoyé dans le stockage du site (projets/…) */
export function imageOk(u) {
  if (typeof u !== 'string' || !u) return false;
  if (/^\/media\/[a-z0-9/_.-]+\.(jpe?g|png|webp|avif)$/i.test(u) && !u.includes('..')) return true;
  try { const x = new URL(u); return x.protocol === 'https:' && /\.public\.blob\.vercel-storage\.com$/.test(x.hostname) && x.pathname.startsWith('/projets/'); } catch { return false; }
}
/* le lien « Visiter le site » : une page du site (/…) ou une adresse https */
export function lienOk(u) {
  if (typeof u !== 'string' || !u) return false;
  if (/^\/(?!\/)[^\s<>"']*$/.test(u)) return true;
  try { return new URL(u).protocol === 'https:'; } catch { return false; }
}

/* Un projet envoyé par l'administration, réduit à ce qu'on garde. Renvoie { projet } ou { erreur } (une phrase pour l'écran). */
export function nettoyerProjet(b) {
  if (!b || typeof b !== 'object') return { erreur: 'Projet illisible.' };
  const titre = ligne(b.titre, LIMITES.titre);
  if (!titre) return { erreur: 'Donnez un titre au projet.' };
  const slug = b.slug ? String(b.slug) : slugDe(titre);
  if (!slugOk(slug)) return { erreur: 'L’adresse du projet ne prend que des minuscules, des chiffres et des tirets.' };
  const annee = Number(b.annee);
  if (!Number.isInteger(annee) || annee < 1990 || annee > 2100) return { erreur: 'Indiquez une année (par exemple 2026).' };
  const statut = Object.hasOwn(STATUTS, b.statut) ? b.statut : null;
  if (!statut) return { erreur: 'Choisissez un état : en ligne, en cours ou bientôt.' };
  const lien = String(b.lien || '').trim();
  if (lien && !lienOk(lien)) return { erreur: 'Le lien doit être une page du site (/…) ou une adresse https.' };
  const couverture = String(b.couverture || '').trim();
  if (couverture && !imageOk(couverture)) return { erreur: 'L’image de couverture doit venir du site ou d’un envoi.' };
  const galerie = (Array.isArray(b.galerie) ? b.galerie : []).slice(0, LIMITES.galerie + 1);
  if (galerie.length > LIMITES.galerie) return { erreur: 'Une galerie compte au plus ' + LIMITES.galerie + ' images.' };
  const images = [];
  for (const g of galerie) {
    const src = String((g && g.src) || '').trim();
    if (!imageOk(src)) return { erreur: 'Une image de la galerie ne vient ni du site ni d’un envoi.' };
    images.push({ src, alt: ligne(g.alt, LIMITES.alt) });
  }
  const ordre = Number.isInteger(Number(b.ordre)) ? Math.max(0, Math.min(9999, Number(b.ordre))) : 0;
  return { projet: {
    slug, titre, annee, statut, lien, couverture, galerie: images, ordre,
    accroche: ligne(b.accroche, LIMITES.accroche), description: texte(b.description, LIMITES.description),
    categorie: ligne(b.categorie, LIMITES.categorie) || 'Projet', role: ligne(b.role, LIMITES.role), alt: ligne(b.alt, LIMITES.alt),
    publie: b.publie === true, une: b.une === true,
  } };
}

/* L'administration est réservée aux adresses listées dans AIME_ADMIN (séparées par des virgules). Sans cette variable : fermée à tous. */
export function estAdmin(email, liste) {
  const e = String(email || '').trim().toLowerCase();
  if (!e) return false;
  return String(liste || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean).includes(e);
}
/* ce que voit le public : les projets publiés, dans l'ordre */
export const publics = l => l.filter(p => p.publie).sort((a, b) => a.ordre - b.ordre || a.titre.localeCompare(b.titre));
