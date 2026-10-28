// AIME · nettoyage automatique d'un texte libre quand le compte de son auteur est supprimé (sécurité S1, demandes envoyées).
// Ce n'est PAS une anonymisation garantie : c'est un retrait de ce qui se reconnaît à coup sûr. L'identification reste possible
// par le contenu (adresse postale, surnom, nom d'un proche, détails de l'événement…). Les champs d'identité, eux, sont vidés.
// Ce qui est retiré : adresses e-mail, numéros de téléphone (et longues suites de chiffres : IBAN, numéros de compte),
// liens, et le nom de l'auteur (son nom affiché et le début de son adresse). Le reste du message est gardé pour son destinataire.
// Limite assumée : un nom de rue, un surnom ou une information écrite autrement ne peuvent pas être reconnus à coup sûr.
const sans = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const echapper = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function masquer(texte, { nom = '', email = '' } = {}) {
  let t = String(texte || '');
  t = t.replace(/[^\s@<>"()[\],;:]{1,64}@[^\s@<>"()[\],;:]{1,190}\.[^\s@<>"().,;:!?]{2,24}/g, '[adresse retirée]');
  t = t.replace(/\b(?:https?:\/\/|www\.)\S+/gi, '[lien retiré]');
  t = t.replace(/\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){3,7}(?:[ ]?[A-Z0-9]{1,4})?\b/g, '[numéro retiré]');   /* IBAN */
  /* les dates restent (utiles au destinataire) : 12/06/2027, 12-06-2027, 12.06.27 */
  t = t.replace(/(?:\+|\b)\d[\d .\-()/]{6,}\d\b/g, m => (/^\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}$/.test(m.trim()) || m.replace(/\D/g, '').length < 8 ? m : '[numéro retiré]'));
  const mots = new Set([...sans(nom).split(/[^a-z0-9]+/), ...sans(String(email).split('@')[0]).split(/[^a-z0-9]+/)].filter(m => m.length >= 3));
  if (mots.size) {
    /* comparaison sans accents ni majuscules, remplacement sur le texte d'origine, mot entier seulement */
    t = t.replace(/[\p{L}\p{N}'’-]+/gu, mot => (mots.has(sans(mot)) ? '[nom retiré]' : mot));
  }
  return t;
}
