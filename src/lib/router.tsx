import { useEffect, useState, type AnchorHTMLAttributes, type MouseEvent } from 'react';

/* Un routeur minimal : l'historique du navigateur, sans bibliothèque. Les liens internes ne rechargent pas la page. */
const ecouteurs = new Set<() => void>();
export function aller(href: string) {
  const u = new URL(href, window.location.href);
  window.history.pushState({}, '', u.pathname + u.search + u.hash);
  ecouteurs.forEach(f => f());
  if (u.hash) requestAnimationFrame(() => document.getElementById(u.hash.slice(1))?.scrollIntoView());
  else window.scrollTo({ top: 0 });
}
export function useChemin() {
  const [chemin, setChemin] = useState(window.location.pathname);
  useEffect(() => {
    const maj = () => setChemin(window.location.pathname);
    ecouteurs.add(maj); window.addEventListener('popstate', maj);
    return () => { ecouteurs.delete(maj); window.removeEventListener('popstate', maj); };
  }, []);
  return chemin;
}
export function Lien({ href = '/', onClick, ...p }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const interne = href.startsWith('/') && !href.startsWith('//') && !href.startsWith('/api/');
  const clic = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || !interne || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0 || p.target === '_blank') return;
    e.preventDefault(); aller(href);
  };
  return <a href={href} onClick={clic} {...p} />;
}
