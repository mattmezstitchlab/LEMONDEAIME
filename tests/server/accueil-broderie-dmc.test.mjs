import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const lire=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
test('accueil : même présentation sous l’ouverture, pas de second header ou moteur',()=>{
 const a=lire('src/pages/AccueilBroderie.tsx');
 assert.match(a, /<CrossStitchHome integre/);
 assert.ok(a.indexOf('<OuvertureFleur')<a.indexOf('<CrossStitchHome'));
 assert.match(a,/studio\/src\/components\/CrossStitchHome/);
 assert.doesNotMatch(a,/<iframe|UsagesDisque/);
 const c=lire('studio/src/components/CrossStitchHome.tsx');
 assert.match(c,/data-dmc=\{fil.code\}/);
 assert.doesNotMatch(c,/<figure|className="ch-fond"|backgroundImage:/);
});
