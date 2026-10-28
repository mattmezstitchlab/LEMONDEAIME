import {afterEach,expect,it} from 'vitest';
import {GRID_CONTENT_CSS,cellSpan} from '../lib/gridConstraints';
import {createDesign} from '../lib/designStudio';
import {referenceCurrentDesign,resolveCollection} from '../lib/fragmentResources';
import {readFragments} from '../lib/fragmentGrid';
import {fragmentsHTML} from '../lib/compositionLayout';
afterEach(()=>localStorage.clear());
it('contraintes content-first sans hauteur fixe et spans bornés',()=>{
 expect(GRID_CONTENT_CSS).toContain('minmax(124px,auto)');expect(GRID_CONTENT_CSS).toContain('overflow-wrap:anywhere');expect(GRID_CONTENT_CSS).not.toContain('line-clamp');
 for(const columns of [1,2,3,4])expect(cellSpan(4,columns)).toBe(columns);
 expect(cellSpan(NaN,2)).toBe(1);expect(()=>cellSpan(2,0)).toThrow();
});
it('une référence, modification Design relue, personnalisation conservée, export privé refusé',()=>{
 const d=createDesign('affiche');d.name='Original';localStorage.setItem('pointzero:design-current:v1',JSON.stringify(d));
 const f=referenceCurrentDesign(),collection={version:1 as const,name:'Espace local',fragments:[f]};const snapshot=JSON.stringify(collection);
 localStorage.setItem('pointzero:design-current:v1',JSON.stringify({...d,name:'Nouvelle version'}));
 const resolved=resolveCollection(collection,'private');expect(resolved.fragments[0].title).toBe('Nouvelle version');expect(resolved.fragments[0].image).toContain('data:image/svg+xml');
 expect(JSON.stringify(collection)).toBe(snapshot);expect(()=>fragmentsHTML(collection,'editorial')).toThrow(/privée/);
 f.source={...f.source!,allowExport:true};expect(fragmentsHTML(collection,'immersive')).toContain('Nouvelle version');
 f.title='Mon cadrage éditorial';f.source={...f.source,titleMode:'custom'};expect(resolveCollection(collection,'private').fragments[0].title).toBe('Mon cadrage éditorial');
 expect(readFragments(collection)?.fragments[0].source).toEqual(f.source);
 f.source={...f.source,allowExport:false};expect(()=>fragmentsHTML(collection,'regular')).toThrow();
});
it('source absente, corrompue ou autre id refusée sans écriture',()=>{
 const d=createDesign('affiche');localStorage.setItem('pointzero:design-current:v1',JSON.stringify(d));const f=referenceCurrentDesign();
 const c={version:1 as const,name:'x',fragments:[f]};
 for(const raw of ['{broken',JSON.stringify({...d,id:'other'})]){localStorage.setItem('pointzero:design-current:v1',raw);expect(()=>resolveCollection(c,'private')).toThrow();expect(localStorage.getItem('pointzero:design-current:v1')).toBe(raw)}
 expect(readFragments({...c,fragments:[{...f,source:{...f.source,version:2}}]})).toBeNull();
});
it('texte extrême conservé et échappé dans tous les modes',()=>{
 const d=createDesign('affiche');localStorage.setItem('pointzero:design-current:v1',JSON.stringify(d));const f=referenceCurrentDesign();delete f.source;f.title='W'.repeat(160);f.description='<script>'+('mot '.repeat(100));
 for(const mode of ['editorial','regular','immersive'] as const){const html=fragmentsHTML({version:1,name:'x',fragments:[f]},mode);expect(html).toContain('W'.repeat(160));expect(html).toContain('&lt;script&gt;');expect(html).toContain('aime-content-cell')}
});
