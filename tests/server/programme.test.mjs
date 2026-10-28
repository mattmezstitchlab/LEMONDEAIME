/* Cohérence du programme canonique de démonstration (Camille & Gabriel) : une seule union, 200 moments, tous les métiers, une seule histoire. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as P from '../../src/lib/programme-outils.mjs';
import { JOURJ } from '../../src/lib/jourj.mjs';

const lire = f => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const p = JSON.parse(lire('src/data/programme.json'));
const ms = p.moments;
const ETAPES = ['idea', 'foundations', 'conception', 'preparation', 'last-week', 'eve', 'day', 'next-day', 'following', 'transmission'];
const TAILLES = [8, 12, 14, 18, 12, 12, 102, 8, 8, 6];

test('200 moments, numérotés dans l’ordre, identifiants uniques', () => {
  assert.equal(ms.length, 200);
  ms.forEach((m, i) => assert.equal(m.n, i + 1, m.id));
  assert.equal(new Set(ms.map(m => m.id)).size, 200);
  for (const m of ms) assert.match(m.id, /^[a-z]+(-[a-z0-9]+)+$/);
});

test('les dix étapes de la Grille 200, dans l’ordre, avec leurs effectifs', () => {
  assert.deepEqual(p.etapes.map(e => e.id), ETAPES);
  assert.deepEqual(P.etapes(p).map(e => e.n), TAILLES);
  // les étapes se suivent sans se mélanger
  const suite = ms.map(m => ETAPES.indexOf(m.etape));
  for (let i = 1; i < suite.length; i++) assert.ok(suite[i] >= suite[i - 1], ms[i].id);
  const jour = P.etapes(p)[6];
  assert.equal(jour.premier, 77); assert.equal(jour.dernier, 178);
});

test('les identifiants de la Grille 200 sont conservés', () => {
  for (const id of ['idea-notes', 'foundations-venue', 'day-ceremony-bride-entry', 'day-first-dance', 'day-sunrise', 'transmission-testimonials'])
    assert.ok(P.moment(p, id), id);
  assert.equal(P.moment(p, 'day-first-dance').n, 149);
});

test('une seule union : Camille & Gabriel, aucun reste de l’ancienne partition', () => {
  assert.equal(p.union.nom, 'Camille & Gabriel');
  const texte = JSON.stringify(p);
  for (const ancien of ['Élise', 'Elise', 'Thomas', 'Claire', 'Lucas', 'Aulnes', 'Orangerie', 'tilleuls', 'moment de démonstration'])
    assert.ok(!texte.includes(ancien), ancien);
  assert.deepEqual(p.union.personnes.map(x => x.nom), ['Camille', 'Gabriel', 'Jeanne', 'Malik']);
  assert.equal(P.moment(p, 'day-ceremony-bride-entry').titre, 'Entrée de Camille');
  assert.equal(P.moment(p, 'day-dress').titre, 'Habiller Camille');
  assert.equal(P.moment(p, 'day-suit').titre, 'Habiller Gabriel');
});

test('chaque description est propre au moment', () => {
  assert.equal(new Set(ms.map(m => m.description)).size, 200);
  for (const m of ms) {
    assert.ok(m.description.length >= 40 && m.description.length <= 260, m.id + ' : ' + m.description.length);
    assert.ok(!/\d{2,}\s*(€|euros|invités|personnes|%)/.test(m.description), m.id + ' : chiffre inventé ?');
  }
});

test('lieux, métiers, responsables et prérequis renvoient à des entrées qui existent', () => {
  const lieux = new Set(p.lieux.map(l => l.id));
  const personnes = new Set(['couple', 'temoins']);
  for (const m of ms) {
    assert.ok(lieux.has(m.lieu), m.id + ' lieu ' + m.lieu);
    assert.ok(m.metiers.length > 0, m.id);
    for (const id of [...m.metiers, ...m.possibles]) assert.ok(p.metiers[id], m.id + ' métier ' + id);
    for (const r of m.responsables) assert.ok(personnes.has(r) || p.metiers[r], m.id + ' responsable ' + r);
    for (const id of m.prerequis) { const q = P.moment(p, id); assert.ok(q, m.id + ' prérequis ' + id); assert.ok(q.n < m.n, m.id + ' après ' + id); }
    assert.ok(m.fin > m.debut, m.id);
  }
});

test('tous les métiers : chacun des métiers de la taxonomie tient ou peut tenir au moins un moment', () => {
  const c = P.compter(p);
  assert.equal(c.metiers, Object.keys(p.metiers).length);
  assert.equal(c.familles, Object.keys(p.familles).length);
  for (const f of Object.keys(p.familles)) assert.ok(p.voix.some(v => v.familles.includes(f)), 'famille sans voix : ' + f);
  for (const [id, cartes] of Object.entries(p.reseau)) { assert.ok(p.metiers[id], id); assert.ok(cartes.length); }
});

test('le Jour J se lit dans l’ordre des heures, de 06:00 au lever du jour', () => {
  const jour = ms.filter(m => m.etape === 'day');
  assert.equal(P.heure(jour[0]), '06:00');
  for (let i = 1; i < jour.length; i++) assert.ok(jour[i].debut >= jour[i - 1].debut, jour[i - 1].id + ' puis ' + jour[i].id);
  assert.equal(P.moment(p, 'day-party').debut.slice(0, 10), '2026-09-15');
  assert.equal(P.heure(P.moment(p, 'day-first-dance')), '22:36');
});

test('/musique : ses dix moments couvrent tout le Jour J, dans l’ordre', () => {
  const cles = ['preparatifs', 'ceremonie', 'sortie', 'cocktail', 'entree', 'repas', 'gateau', 'ouverture', 'soiree', 'fin'];
  const musique = lire('src/lib/musique.ts');
  for (const c of cles) { assert.ok(musique.includes("['" + c + "'"), c); assert.ok(P.parMusique(p, c).length > 0, c); }
  const jour = ms.filter(m => m.etape === 'day');
  assert.ok(jour.every(m => cles.includes(m.musique)));
  assert.ok(ms.filter(m => m.etape !== 'day').every(m => m.musique === undefined));
  const ordre = jour.map(m => cles.indexOf(m.musique));
  for (let i = 1; i < ordre.length; i++) assert.ok(ordre[i] >= ordre[i - 1], jour[i].id);
  assert.equal(P.moment(p, 'day-first-dance').musique, 'ouverture');
  assert.equal(P.moment(p, 'day-ceremony-vows').musique, 'ceremonie');
});

test('les huit photos du Jour J sont raccordées à un moment, à la même heure', () => {
  assert.equal(JOURJ.length, 8);
  assert.equal(new Set(JOURJ.map(d => d.moment)).size, 8);
  for (const d of JOURJ) {
    const m = P.moment(p, d.moment);
    assert.ok(m, d.moment);
    assert.equal(m.etape, 'day', d.moment);
    if (d.metier) assert.ok(m.metiers.includes(d.metier), d.who + ' doit tenir ' + d.moment);
    assert.ok(!/\d+\s*h\s*\d+/.test(d.ou), 'l’heure vient du programme, pas du texte : ' + d.ou);
  }
  // l'accueil ne recopie aucune heure : il lit celle du moment
  const accueil = lire('src/pages/LeMondeAime.tsx');
  assert.ok(accueil.includes('JOURJ'));
  assert.ok(!/where: '[^']*\d+ h \d+/.test(accueil));
});

test('les chiffres affichés sont comptés, jamais recopiés', () => {
  const c = P.compter(p);
  assert.deepEqual([c.moments, c.etapes, c.jourJ, c.voix], [200, 10, 102, 8]);
  for (const f of ['src/pages/LeMondeAime.tsx', 'src/pages/Moments.tsx', 'src/charte/LecturesMoment.tsx']) {
    const s = lire(f);
    assert.ok(!/>\s*(200|102|122)\s*</.test(s), f + ' affiche un chiffre écrit à la main');
  }
});

test('le patron d’un moment est stable et ne brode qu’avec ses voix', () => {
  for (const m of ms) {
    const a = P.patron(p, m), b = P.patron(p, m);
    assert.deepEqual(a.points, b.points);
    assert.equal(a.points.length, 256);
    assert.ok(a.points.every(v => v >= -1 && v < a.voix.length));
    assert.ok(a.points.some(v => v >= 0), m.id + ' patron vide');
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) assert.equal(a.points[y * 16 + x], a.points[y * 16 + 15 - x]);
  }
  const bal = P.voixDe(p, P.moment(p, 'day-first-dance')).map(v => v.id);
  assert.ok(bal.includes('maries') && bal.includes('musique') && bal.includes('image'));
});

test('les personnes : chacune retrouve ses moments', () => {
  for (const x of p.union.personnes) assert.ok(P.momentsDe(p, x.id).length > 0, x.nom);
  assert.ok(P.momentsDe(p, 'dj').length > 0);
  assert.ok(P.momentsDe(p, 'malik').some(m => m.id === 'day-ceremony-rings'));
  const bal = P.personnesDe(p, P.moment(p, 'day-first-dance'));
  assert.ok(bal.some(x => x.id === 'camille') && bal.some(x => x.id === 'dj'));
});

test('aucune donnée personnelle ni projet réel : le programme est marqué comme démonstration', () => {
  assert.match(p.note, /démonstration/);
  assert.ok(!/@|https?:\/\//.test(JSON.stringify(p)));
});
