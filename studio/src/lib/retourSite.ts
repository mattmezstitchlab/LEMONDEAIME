/* Retour au site (Le Monde AIME) : une seule règle pour l'atelier et les clips.
   Si la personne vient d'une page du site (hors /studio), on revient là où elle était ; sinon à l'accueil. */
export function retourSite(): void {
  try {
    if (document.referrer) {
      const ref = new URL(document.referrer);
      if (ref.origin === window.location.origin && !ref.pathname.startsWith("/studio")) { window.location.href = ref.href; return; }
    }
  } catch { /* adresse illisible : on retombe sur l'accueil */ }
  window.location.href = "/";
}
