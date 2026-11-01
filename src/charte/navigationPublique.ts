// Source unique du header public broderie, partagée par le site et le Studio.
export const ENTREES_PUBLIQUES = [
  { nom: 'Accueil', href: '/' },
  { nom: 'Broderie', href: '/studio/' },
  { nom: 'Atelier', href: '/studio/atelier' },
] as const;
export function rubriqueActive(pathname: string): string | null {
  const p = pathname.replace(/\/+$/, '') || '/';
  if (p === '/') return '/';
  if (p === '/studio/atelier' || p === '/studio/tambour') return '/studio/atelier';
  if (p === '/studio' || p.startsWith('/studio/') || p === '/point-zero' || p === '/projets/brode-way') return '/studio/';
  return null; // Comptes et anciens univers ne deviennent pas des rubriques publiques.
}
