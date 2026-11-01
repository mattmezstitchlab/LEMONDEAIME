import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const lire = p => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');

test('consolidation : compte canonique depuis le header, bibliothèque de patron séparée', () => {
  const header = lire('src/charte/HeaderPublic.tsx'), panel = lire('src/charte/PanneauPersonnel.tsx');
  assert.match(header, /<PanneauPersonnel/); assert.match(header, /aria-label="Mon espace personnel"/);
  assert.match(header, /root.inert=true/); assert.match(header, /root.inert=inertAvant/);
  for (const name of ['Projets', 'Partagés avec moi', 'Archives', 'Profil']) assert.ok(lire('src/charte/dossiersPersonnels.ts').includes(name));
  assert.match(panel, /<EntrerBloc/); assert.match(panel, /seDeconnecter\(\{ effacerOuvrages:/);
  const studio = lire('studio/src/components/StudioDocks.tsx');
  assert.doesNotMatch(studio, /racineBureau|bureauCentre|id: "bureau-dossiers"/);
  assert.match(studio, /Bibliothèque de l’atelier/); assert.match(studio, /<OuvragesBloc/);
  assert.match(studio, /<TambourAtelier/); assert.match(studio, /racine=\{nav0 \? racine0\(\)/);
});

test('consolidation : lecteur commun et annulation préservés, aucun second moteur de clip', () => {
  const opening = lire('src/ouverture/OuvertureFleur.tsx'), clip = lire('studio/src/clip/ClipBrode.tsx');
  assert.match(opening, /ClipFleurIntroduction/); assert.doesNotMatch(opening, /new Audio|new .*RenduClip/);
  assert.match(clip, /<Point scene/); assert.match(clip, /ticketLecture.current\+\+/);
  assert.match(clip, /annulation.abort\(\)/); assert.match(clip, /a.removeAttribute\("src"\)/);
  assert.match(lire('studio/src/clip/donnees.ts'), /arreter\(\).*this.controle.abort\(\)/);
  const charte = lire('src/charte/Charte.tsx');
  assert.doesNotMatch(charte, /className="dock-bas|orbe-dock/);
  assert.match(charte, /<Musique \/>/); assert.match(charte, /contenu.rendu\(\)/);
  assert.doesNotMatch(lire('studio/src/components/CrossStitchHome.tsx'), /<TopDock|className="pzh-bottom"/);
});

test('consolidation : scénario Fleur suit le temps source et se replie sans écrire un patron', async () => {
  const js = ts.transpileModule(lire('studio/src/clip/scenarioFleur.ts'), { compilerOptions: {module:ts.ModuleKind.ESNext} }).outputText;
  const {scenarioFleur} = await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
  assert.equal(scenarioFleur(1).phase,'broder'); assert.equal(scenarioFleur(3).phase,'fils');
  assert.equal(scenarioFleur(4).phase,'couleur'); assert.equal(scenarioFleur(7).phase,'loupe');
  assert.equal(scenarioFleur(10).phase,'replier'); assert.equal(scenarioFleur(11).ouvert,false);
  assert.equal(scenarioFleur(NaN).ouvert,false);
});
