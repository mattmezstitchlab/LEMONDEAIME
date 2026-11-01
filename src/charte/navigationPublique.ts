// Source unique du header public, partagée par le site et le Studio.
export const ENTREES_PUBLIQUES = [
  { nom: 'Accueil', href: '/' },
  { nom: 'Broderie', href: '/studio/' },
  { nom: 'Mariage', href: '/aime-wedding' },
  { nom: 'Projets à venir', href: '/projets-a-venir' },
  { nom: 'À propos', href: '/a-propos' },
  { nom: 'Contact', href: '/contact' },
] as const;
export function rubriqueActive(pathname: string): string | null {
  const p = pathname.replace(/\/+$/, '') || '/';
  if (p === '/') return '/';
  if (p === '/studio' || p.startsWith('/studio/') || p === '/point-zero' || p === '/projets/brode-way') return '/studio/';
  if (p === '/aime-wedding' || p === '/musique' || p === '/reseau' || p.startsWith('/reseau/')) return '/aime-wedding';
  if (p === '/projets-a-venir' || p === '/projets' || p.startsWith('/projets/') || ['/boutique', '/a-plus', '/system', '/systaime'].includes(p)) return '/projets-a-venir';
  if (p === '/a-propos' || p === '/contact') return p;
  return null; // Les espaces de compte ne sont pas une septième rubrique publique.
}
