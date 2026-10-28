import {expect,it} from 'vitest';
import {AIME_SYMBOLS,symbolSVG} from '../lib/aimeSymbols';
import {COMPOSITIONS,fragmentsHTML,compositionCSS} from '../lib/compositionLayout';
import {demoFragments} from '../lib/fragmentGrid';
import {createMiniSite,miniSiteToHTML,safeMiniSite} from '../lib/miniSiteCore';
it('14 symboles originaux exportables sans emoji, script ou étoile générique',()=>{
 expect(Object.keys(AIME_SYMBOLS)).toHaveLength(14);
 for(const name of Object.keys(AIME_SYMBOLS) as (keyof typeof AIME_SYMBOLS)[]){const svg=symbolSVG(name);expect(svg).toContain('viewBox="0 0 24 24"');expect(svg).toContain('stroke-width="1.5"');expect(svg).not.toContain('<script');}
});
it('mêmes fragments, trois compositions, export échappé et responsive réel',()=>{
 const data=demoFragments();data.fragments[0].title='<script>bad</script>';const original=JSON.stringify(data);
 for(const mode of COMPOSITIONS){const html=fragmentsHTML(data,mode);expect(html).toContain('&lt;script&gt;');expect(html).toContain('@media(max-width:600px)');expect(html).toContain('Recomposition');expect(compositionCSS(mode)).toContain('grid-column');}
 expect(JSON.stringify(data)).toBe(original);
});
it('mariage, association et professionnel conservent identité/contenus lors de recomposition',()=>{
 for(const kind of ['mariage','presentation','portfolio'] as const){const base=createMiniSite(kind);base.title=kind==='presentation'?'Notre association':kind==='portfolio'?'Notre activité':base.title;const before=JSON.stringify(base);
 for(const compositionMode of COMPOSITIONS){const changed={...base,compositionMode};expect(safeMiniSite(changed)).toBeTruthy();expect(changed.id).toBe(base.id);const html=miniSiteToHTML(changed);expect(html).toContain(base.title.replace(/&/g,'&amp;'));expect(html).toContain('aime-composition');}
 expect(JSON.stringify(base)).toBe(before);}
});
