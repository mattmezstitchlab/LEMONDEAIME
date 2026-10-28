/* Les ouvrages de l'atelier (StudiO) gardés sur cet appareil, dans la base du navigateur « point-zero-library ».
   À la déconnexion, si la personne le choisit (jamais par défaut) : on efface de l'appareil SES ouvrages déjà rangés
   dans son espace AIME, et seulement ceux-là. Ils restent sur son compte. Ceux qui ne sont pas encore rangés (ou plus
   récents sur l'appareil), ceux sans propriétaire et ceux d'un autre compte restent sur l'appareil. */
type Local = { id: string; updated: number; compte?: string };
type Distant = { id: string; maj: number };

/** Les ouvrages à effacer : ceux du compte, déjà rangés dans son espace avec une version au moins aussi récente. */
export function choisirAEffacer(locaux: Local[], distants: Distant[], compte: string): { effacer: string[]; garder: number } {
  const surCompte = new Map(distants.map(d => [d.id, d.maj]));
  const siens = locaux.filter(l => l.compte === compte);
  const effacer = siens.filter(l => (surCompte.get(l.id) ?? -1) >= l.updated).map(l => l.id);
  return { effacer, garder: siens.length - effacer.length };
}

function ouvrir(): Promise<IDBDatabase | null> {
  return new Promise(resolve => {
    let req: IDBOpenDBRequest;
    try { req = indexedDB.open('point-zero-library'); } catch { resolve(null); return; }
    req.onupgradeneeded = () => { req.transaction?.abort(); };   /* la base n'existait pas : on ne la crée pas (l'atelier la créera) */
    req.onsuccess = () => resolve(req.result.objectStoreNames.contains('projects') ? req.result : (req.result.close(), null));
    req.onerror = () => resolve(null);
  });
}

/** Efface de l'appareil les ouvrages du compte déjà rangés dans son espace. À appeler AVANT de fermer la session. */
export async function effacerOuvragesDuCompte(compte: string): Promise<{ effaces: number; gardes: number }> {
  const db = await ouvrir();
  if (!db) return { effaces: 0, gardes: 0 };
  try {
    const locaux = await new Promise<Local[]>((ok, ko) => { const r = db.transaction('projects').objectStore('projects').getAll(); r.onsuccess = () => ok(r.result as Local[]); r.onerror = () => ko(r.error); });
    const rep = await fetch('/api/ouvrages', { credentials: 'same-origin' }).catch(() => null);
    const distants: Distant[] = rep && rep.ok ? ((await rep.json().catch(() => ({}))).ouvrages || []) : [];
    const { effacer, garder } = choisirAEffacer(locaux, distants, compte);
    if (effacer.length) await new Promise<void>((ok, ko) => { const t = db.transaction('projects', 'readwrite'); for (const id of effacer) t.objectStore('projects').delete(id); t.oncomplete = () => ok(); t.onerror = () => ko(t.error); });
    return { effaces: effacer.length, gardes: garder };
  } catch { return { effaces: 0, gardes: 0 }; }
  finally { db.close(); }
}
