import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const lire=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
test('accueil : présentation sans vidéo ni commandes redondantes, pas de second header ou moteur',()=>{
 const a=lire('src/pages/AccueilBroderie.tsx');
 assert.match(a, /<CrossStitchHome integre/);
 assert.doesNotMatch(a, /<OuvertureFleur|id="demonstrations"|rubrique-actions/);
 assert.match(a,/data-entree-dmc/);
 assert.match(lire('src/charte/HeaderPublic.tsx'), /Menu du Studio/);
 assert.match(a,/studio\/src\/components\/CrossStitchHome/);
 assert.doesNotMatch(a,/<iframe|UsagesDisque/);
 const c=lire('studio/src/components/CrossStitchHome.tsx');
 assert.match(c,/data-dmc=\{fil.code\}/);
 assert.doesNotMatch(c,/<figure|className="ch-fond"|backgroundImage:/);
});
