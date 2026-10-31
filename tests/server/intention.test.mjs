import { test } from 'node:test';
import assert from 'node:assert/strict';
import { proposer, DESTINATIONS } from '../../src/lib/intention.mjs';

/* Les quatre phrases de la phase 01 : chacune doit donner un chemin, une destination réelle ou un état explicite. Jamais d'action exécutée. */
test('Je prépare mon mariage. → Organiser → AIME Wedding (disponible)', () => {
  const r = proposer('Je prépare mon mariage.');
  assert.equal(r.chemin, 'organiser'); assert.equal(r.destination.href, '/aime-wedding'); assert.equal(r.destination.etat, 'disponible'); assert.equal(r.execute, false);
});
test('Je veux créer un site. → Créer, mais la création de sites est déclarée indisponible', () => {
  const r = proposer('Je veux créer un site.');
  assert.equal(r.chemin, 'creer'); assert.equal(r.destination.etat, 'indisponible'); assert.equal(r.destination.href, null);
  assert.equal(r.destination.alternative.href, '/studio/atelier'); assert.equal(r.execute, false);
});
test('Je veux retrouver mes projets. → Mes projets → BurO (connexion nécessaire)', () => {
  const r = proposer('Je veux retrouver mes projets.');
  assert.equal(r.chemin, 'projets'); assert.equal(r.destination.href, '/buro'); assert.equal(r.destination.etat, 'connexion');
});
test('Je recherche un musicien. → Découvrir → le réseau', () => {
  const r = proposer('Je recherche un musicien.');
  assert.equal(r.chemin, 'decouvrir'); assert.equal(r.destination.href, '/reseau'); assert.equal(r.destination.etat, 'disponible');
});
test('rien, phrase vague, ambiguë, adresse web, fichiers', () => {
  assert.equal(proposer('   '), null);
  assert.equal(proposer('bonjour').chemin, null);
  assert.equal(proposer('Je veux créer un mariage').chemin, null);
  assert.equal(proposer('lemondeaime.com/projets').type, 'Adresse web');
  assert.equal(proposer('', { name: 'a.jpg', type: 'image/jpeg' }).destination.href, DESTINATIONS.creer.href);
  assert.equal(proposer('', { name: 'a.pdf', type: 'application/pdf' }).chemin, 'projets');
});
test('pas de faux positifs sur des mots qui contiennent un mot-clé', () => {
  assert.equal(proposer('Une visite de la ville').chemin, null);
  assert.equal(proposer('Je cherche un groupe de travail').chemin, 'projets');
});
