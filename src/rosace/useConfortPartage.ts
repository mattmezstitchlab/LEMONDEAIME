import { useEffect } from 'react';
import { ACCESS_KEY, applyPrefs, readPrefs } from '../../studio/src/lib/accessibilityCore';

/** Le cadre ROSACE et /system sont deux documents de même origine.
 * Les préférences restent celles du Point : on relaie seulement les changements
 * de stockage entre les documents, sans copier ni créer de nouveaux réglages. */
export function useConfortPartage(actif: boolean) {
  useEffect(() => {
    if (!actif) return;
    const suivre = (e: StorageEvent) => {
      if (e.key !== ACCESS_KEY && e.key !== null) return;
      const preferences = readPrefs();
      applyPrefs(preferences);
      window.dispatchEvent(new CustomEvent('pz:accessibility', { detail: preferences }));
    };
    window.addEventListener('storage', suivre);
    return () => window.removeEventListener('storage', suivre);
  }, [actif]);
}
