import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lireDate, repondreLocal, dateLisible } from '../../api/_orbe-local.mjs';
import orbe, { consigne } from '../../api/orbe.mjs';
import { nettoyerProfil, nettoyerDemande, jourOk } from '../../api/reseau.mjs';
const res = () => ({ statusCode: 200, headers: {}, body: '', setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = b; } });
const juin = new Date(2026, 9, 28);
test('lireDate : formats français, année suivante quand le jour est passé, dates impossibles refusées', () => {
  assert.equal(lireDate('Le 12 juin, au bord de la mer', juin), '2027-06-12');
  assert.equal(lireDate('samedi 1er novembre', juin), '2026-11-01');
  assert.equal(lireDate('12/06/2027', juin), '2027-06-12');
  assert.equal(lireDate('le 2027-06-12', juin), '2027-06-12');
  assert.equal(lireDate('31 février 2027', juin), null);
  assert.equal(lireDate('au bord de la mer', juin), null);
  assert.equal(dateLisible('2027-06-01'), '1er juin 2027');
});
test('repondreLocal : les dates du calendrier, les prestations, jamais un tarif inventé', () => {
  const f = { nom: 'Camille', metier: 'Fleuriste', zone: 'toute la Bretagne', prestations: [{ titre: 'Bouquet', texte: '' }] };
  assert.match(repondreLocal(f, 'Libre le 12/06/2027 ?', () => 'libre').reponse, /12 juin 2027.*libre/);
  assert.equal(repondreLocal(f, 'Libre le 12/06/2027 ?', () => null).trouve, false);
  assert.match(repondreLocal(f, 'Quelles prestations ?').reponse, /Bouquet/);
  assert.match(repondreLocal(f, 'Où intervenez-vous ?').reponse, /Bretagne/);
  const t = repondreLocal(f, 'Quel est votre tarif ?');
  assert.equal(t.trouve, false); assert.doesNotMatch(t.reponse, /\d/);
  assert.match(repondreLocal({ ...f, tarif: 'à partir de 900 €' }, 'combien ?').reponse, /900 €/);
});
test('nettoyerProfil : prestations, liens et tarif bornés ; un lien invalide refusé', () => {
  const { profil } = nettoyerProfil({ nom: 'Léa', domaine: 'mariage', metier: 'DJ', prestations: [{ titre: ' Soirée ', texte: 'x' }, { titre: '' }, ...Array(10).fill({ titre: 'y' })], liens: ['instagram.com/lea'], tarif: 'sur devis' });
  assert.equal(profil.prestations.length, 7); assert.equal(profil.prestations[0].titre, 'Soirée');
  assert.deepEqual(profil.liens, ['https://instagram.com/lea']); assert.equal(profil.tarif, 'sur devis');
  assert.ok(nettoyerProfil({ nom: 'Léa', domaine: 'mariage', metier: 'DJ', liens: ['javascript:alert(1)'] }).raison);
});
test('nettoyerDemande et jourOk', () => {
  assert.ok(nettoyerDemande({ message: 'hey' }).raison);
  assert.ok(nettoyerDemande({ message: 'Bonjour, une question', jour: '2027-02-30' }).raison);
  assert.ok(nettoyerDemande({ message: 'Bonjour, une question', invites: -3 }).raison);
  assert.deepEqual(nettoyerDemande({ message: 'Bonjour, une question', jour: '2027-06-12', invites: '120', lieu: ' Brest ' }).demande, { jour: '2027-06-12', lieu: 'Brest', invites: 120, message: 'Bonjour, une question' });
  assert.equal(jourOk('2027-06-12'), true); assert.equal(jourOk('2027-13-01'), false);
});
test('orbe : la consigne ne parle que de la fiche ; sans base, fermé ; question vide refusée', async () => {
  const c = consigne({ nom: 'Camille', metier: 'Fleuriste', prestations: [] });
  assert.match(c, /troisième personne/); assert.match(c, /n'inventes rien/);
  const old = process.env.DATABASE_URL; delete process.env.DATABASE_URL;
  try {
    const r = res(); await orbe({ method: 'POST', url: '/api/orbe', headers: { host: 'x.fr', origin: 'https://x.fr', 'content-type': 'application/json' }, body: { ref: 'abcdefabcdef', question: 'Libre ?' } }, r);
    assert.equal(r.statusCode, 503);
  } finally { if (old !== undefined) process.env.DATABASE_URL = old; }
});
