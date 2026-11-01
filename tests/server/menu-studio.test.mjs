import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const lire=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
test('menu Studio : inventaire complet et accès aux commandes existantes',()=>{
 const h=lire('src/charte/HeaderPublic.tsx');
 for(const v of ['ouvrir=importer','ouvrir=ouvrages','ouvrir=reprendre','ouvrir=composer','?visite=1','/studio/uptown','/studio/fleur-du-ciel'])assert.ok(h.includes(v),v);
 assert.match(h,/TOUT.map/);assert.match(h,/Menu du Studio/);assert.match(h,/aria-modal="true"/);
 assert.match(lire('studio/src/components/CrossStitchHome.tsx'),/visiteDemandee.current = true/);
});
