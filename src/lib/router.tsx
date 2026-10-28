import { useEffect, useState, type AnchorHTMLAttributes, type MouseEvent } from 'react';

/* Un routeur minimal : l'historique du navigateur, sans bibliothèque. Les liens internes ne rechargent pas la page. */
const ecouteurs = new Set<() => void>();
/* l'historique garde la profondeur (pour la flèche retour) et la position de lecture (pour revenir là où l'on était) */
type Etat = { n?: number; y?: number };
const etat = (): Etat => (window.history.state && typeof window.history.state === 'object' ? window.history.state : {}) as Etat;
if (typeof window !== 'undefined') {
  try { window.history.scrollRestoration = 'manual'; } catch { /* navigateur ancien */ }
  /* un lien d'ancre (#section) déclenche aussi « popstate », sans état : le navigateur fait défiler lui-même, on ne le ramène pas en haut */
  window.addEventListener('popstate', () => { if (!window.history.state) return; const y = etat().y || 0; requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior }))); });
}
export function profondeur() { return etat().n || 0; }
export function revenir() { if (profondeur() > 0) window.history.back(); else aller('/'); }
export function aller(href: string) {
  const u = new URL(href, window.location.href);
  const e = etat();
  window.history.replaceState({ ...e, y: window.scrollY }, '');
  window.history.pushState({ n: (e.n || 0) + 1, y: 0 }, '', u.pathname + u.search + u.hash);
  ecouteurs.forEach(f => f());
  if (u.hash) requestAnimationFrame(() => document.getElementById(u.hash.slice(1))?.scrollIntoView());
  else window.scrollTo({ top: 0 });
}
/* changer l'adresse sans nouvelle entrée d'historique ni défilement (un onglet, un filtre) */
export function remplacer(href: string) {
  const u = new URL(href, window.location.href);
  window.history.replaceState(window.history.state, '', u.pathname + u.search + u.hash);
  ecouteurs.forEach(f => f());
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
export function useRecherche() {
  const [q, setQ] = useState(window.location.search);
  useEffect(() => {
    const maj = () => setQ(window.location.search);
    ecouteurs.add(maj); window.addEventListener('popstate', maj);
    return () => { ecouteurs.delete(maj); window.removeEventListener('popstate', maj); };
  }, []);
  return q;
}
export function Lien({ href = '/', onClick, ...p }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const interne = href.startsWith('/') && !href.startsWith('//') && !href.startsWith('/api/') && !/^\/studio(\/|$)/.test(href);   /* le StudiO est une application à part entière : on y entre par un vrai chargement de page */
  const clic = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || !interne || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0 || p.target === '_blank') return;
    e.preventDefault(); aller(href);
  };
  return <a href={href} onClick={clic} {...p} />;
}
