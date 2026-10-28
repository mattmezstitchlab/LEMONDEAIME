// L'orbe d'une carte du Réseau, sans IA : ce qui se répond directement depuis la fiche (dates, prestations, zone, tarif, langues).
// Partagé par le serveur (api/orbe.mjs, avant d'appeler Claude ou quand la clé manque) et par le site (les cartes d'exemple).
// Règle : on ne dit que ce qui est écrit sur la fiche. Rien n'est inventé, surtout pas un prix.

const MOIS = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
const sans = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const iso = (a, m, j) => a + '-' + String(m).padStart(2, '0') + '-' + String(j).padStart(2, '0');
function valide(a, m, j) { const d = new Date(Date.UTC(a, m - 1, j)); return d.getUTCFullYear() === a && d.getUTCMonth() === m - 1 && d.getUTCDate() === j; }

/* « le 12 juin », « 12/06/2027 », « 2027-06-12 », « samedi 12 juin 2027 » → '2027-06-12' ; sans année : la prochaine fois que ce jour revient */
export function lireDate(texte, aujourdhui = new Date()) {
  const t = sans(texte);
  let m = /\b(\d{4})-(\d{2})-(\d{2})\b/.exec(t);
  if (m) return valide(+m[1], +m[2], +m[3]) ? iso(+m[1], +m[2], +m[3]) : null;
  m = /\b(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?\b/.exec(t);
  let j, mo, a;
  if (m) { j = +m[1]; mo = +m[2]; a = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : null; }
  else {
    m = new RegExp('\\b(1er|\\d{1,2})\\s+(' + MOIS.join('|') + ')(?:\\s+(\\d{4}))?\\b').exec(t);
    if (!m) return null;
    j = m[1] === '1er' ? 1 : +m[1]; mo = MOIS.indexOf(m[2]) + 1; a = m[3] ? +m[3] : null;
  }
  if (!a) {
    const y = aujourdhui.getFullYear(), auj = iso(y, aujourdhui.getMonth() + 1, aujourdhui.getDate());
    a = iso(y, mo, j) >= auj ? y : y + 1;
  }
  return valide(a, mo, j) ? iso(a, mo, j) : null;
}
export function dateLisible(d) {
  const [a, m, j] = d.split('-').map(Number);
  return (j === 1 ? '1er' : j) + ' ' + ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'][m - 1] + ' ' + a;
}
export const ETATS = { libre: 'libre', option: 'en option (à confirmer)', prise: 'déjà prise' };

/* fiche : { nom, metier, ville, zone, langues, tarif, bio, prestations: [{ titre, texte }] } ; dispo(date) → 'libre' | 'option' | 'prise' | null */
export function repondreLocal(fiche, question, dispo) {
  const q = sans(question), n = fiche.nom || 'Cette personne';
  const date = lireDate(question);
  if (date && dispo) {
    const e = dispo(date);
    if (e) return { trouve: true, reponse: 'Le ' + dateLisible(date) + ', ' + n + ' est ' + ETATS[e] + '.' + (e !== 'prise' ? ' Envoyez une demande pour la réserver.' : '') };
    return { trouve: false, reponse: n + ' n’a pas encore indiqué si le ' + dateLisible(date) + ' est libre. Le plus sûr : lui envoyer une demande.' };
  }
  const p = Array.isArray(fiche.prestations) ? fiche.prestations.filter(x => x && x.titre) : [];
  if (/prestation|propos|offre|service|formule|que fai|quoi/.test(q)) {
    if (p.length) return { trouve: true, reponse: n + ' propose : ' + p.map(x => x.titre + (x.texte ? ' (' + x.texte + ')' : '')).join(' ; ') + '.' };
    if (fiche.bio) return { trouve: true, reponse: 'D’après sa fiche : « ' + String(fiche.bio).slice(0, 300) + ' » Le détail de ses prestations n’y est pas encore.' };
    if (fiche.metier) return { trouve: true, reponse: n + ' est ' + fiche.metier.toLowerCase() + '. Le détail de ses prestations n’est pas encore sur sa fiche.' };
  }
  if (/ou |zone|region|deplac|intervien|ville|secteur|loin/.test(q)) {
    if (fiche.zone || fiche.ville) return { trouve: true, reponse: [fiche.ville ? n + ' est basé·e à ' + fiche.ville + '.' : '', fiche.zone ? 'Zone d’intervention : ' + fiche.zone + '.' : ''].filter(Boolean).join(' ') };
  }
  if (/prix|tarif|cout|combien|budget|devis/.test(q)) {
    if (fiche.tarif) return { trouve: true, reponse: 'Tarif indiqué par ' + n + ' : ' + fiche.tarif + '. Pour un devis précis, envoyez une demande avec votre date et votre lieu.' };
    return { trouve: false, reponse: n + ' n’a pas indiqué de tarif sur sa fiche. Envoyez une demande avec votre date et votre lieu pour recevoir un devis.' };
  }
  if (/langue|anglais|english|parle/.test(q) && fiche.langues) return { trouve: true, reponse: n + ' parle : ' + fiche.langues + '.' };
  return { trouve: false, reponse: 'Je ne trouve pas la réponse sur la fiche de ' + n + '. Vous pouvez lui envoyer une demande directement.' };
}
