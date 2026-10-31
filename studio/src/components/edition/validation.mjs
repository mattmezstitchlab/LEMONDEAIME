/**
 * La validation des contenus de l'édition, partagée par le studio (navigateur) et l'API (/api/contenus, serveur) :
 * une seule règle, appliquée des deux côtés. JavaScript simple, sans dépendance.
 *
 * L'origine (contenus.origine.json) est le texte actuel, le secours ET le schéma : une version est fondue sur elle,
 * champ par champ. Une version ne peut ni ajouter un champ, ni changer la forme d'un champ, ni la longueur d'une liste.
 * Seuls des textes, des adresses d'images vérifiées, des drapeaux et des points de cadrage (0 à 100 %) sont acceptés ;
 * jamais de code ni de balisage.
 */
export const LIMITES = { titre: 140, court: 400, long: 1600 };
export const LICENCES = ['domaine-public', 'reconstitution', 'capture', 'autorise'];

/** Une adresse d'image acceptée : un fichier du site (images/…), ou le dossier « contenus/ » du stockage Vercel Blob, en https. */
export function srcOk(v) {
  if (typeof v !== 'string' || v.includes('..')) return false;
  return /^images\/[a-z0-9][a-z0-9/_-]*\.(webp|png|jpe?g|avif)$/i.test(v)
    || /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/contenus\/[\w./%-]+\.(webp|png|jpe?g|avif)$/i.test(v);
}
export function urlOk(v) { try { const u = new URL(v); return u.protocol === 'https:' && !u.username && !u.password; } catch { return false; } }

const limite = cle => /titre|kicker|nom|libelle|bouton/i.test(cle) ? LIMITES.titre : /corps|note|texte|legende|question|chapeau/i.test(cle) ? LIMITES.long : LIMITES.court;
/* du texte, pas du balisage : aucun chevron, aucun caractère de contrôle */
const texteOk = (v, cle) => v.trim().length > 0 && v.length <= limite(cle) && !/[<>\u0000-\u0008\u000b-\u001f\u007f]/.test(v);

function fondre(origine, brut, chemin, ecarts) {
  if (brut === undefined) return origine;
  const ecart = raison => { ecarts.push({ chemin, raison }); return origine; };
  if (typeof origine === 'string') {
    if (typeof brut !== 'string') return ecart('un texte est attendu');
    const cle = chemin.split('.').pop() ?? '';
    if (cle === 'src') return srcOk(brut) ? brut : ecart('adresse d’image refusée');
    if (cle === 'url') return urlOk(brut) ? brut : ecart('lien https attendu');
    if (cle === 'licence') return LICENCES.includes(brut) ? brut : ecart('licence inconnue');
    if (cle === 'legende' && brut === '' && origine === '') return brut;
    if (cle === 'provenance' && brut === '') return brut;
    if (!texteOk(brut, cle)) return ecart('texte vide, trop long ou contenant du balisage');
    if (origine.includes('{reponse}') && !brut.includes('{reponse}')) return ecart('le gabarit {reponse} doit rester');
    if (origine.includes('{n}') && !brut.includes('{n}')) return ecart('le gabarit {n} doit rester');
    return brut;
  }
  if (typeof origine === 'boolean') return typeof brut === 'boolean' ? brut : ecart('oui ou non attendu');
  /* un nombre : un point de cadrage, en pour cent (0 à 100), arrondi au dixième */
  if (typeof origine === 'number') return typeof brut === 'number' && Number.isFinite(brut) && brut >= 0 && brut <= 100 ? Math.round(brut * 10) / 10 : ecart('un nombre entre 0 et 100 est attendu');
  if (Array.isArray(origine)) {
    if (!Array.isArray(brut) || brut.length !== origine.length) return ecart(`une liste de ${origine.length} éléments est attendue`);
    return origine.map((o, i) => fondre(o, brut[i], `${chemin}[${i}]`, ecarts));
  }
  if (origine && typeof origine === 'object') {
    if (!brut || typeof brut !== 'object' || Array.isArray(brut)) return ecart('un groupe de champs est attendu');
    for (const k of Object.keys(brut)) if (!(k in origine)) ecarts.push({ chemin: chemin ? `${chemin}.${k}` : k, raison: 'champ inconnu, ignoré' });
    const sortie = {};
    for (const k of Object.keys(origine)) sortie[k] = fondre(origine[k], brut[k], chemin ? `${chemin}.${k}` : k, ecarts);
    /* un média : une reconstitution le dit dans sa légende ; un média qui change d'image déclare sa licence et sa nature */
    if ('src' in origine && 'reconstitution' in origine) {
      if (sortie.reconstitution && sortie.legende && !/reconstitution/i.test(sortie.legende)) { ecarts.push({ chemin, raison: 'une reconstitution doit être annoncée dans la légende' }); return origine; }
      if (sortie.licence === 'reconstitution' && !sortie.reconstitution) { ecarts.push({ chemin, raison: 'licence « reconstitution » sans le drapeau reconstitution' }); return origine; }
      if (sortie.src !== origine.src && (brut.licence === undefined || brut.reconstitution === undefined)) { ecarts.push({ chemin, raison: 'nouvelle image : licence et nature (reconstitution ou non) à déclarer' }); return origine; }
    }
    return sortie;
  }
  return origine;
}

/** Fond une version sur l'origine : tout champ absent ou invalide garde l'origine ; les écarts sont listés. */
export function valider(origine, brut) {
  const ecarts = [];
  const contenus = fondre(origine, brut ?? {}, '', ecarts);
  return { contenus, ecarts };
}
