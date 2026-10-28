import {afterEach,expect,it,vi} from 'vitest';
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {DESIGN_SYSTEM,designCSS,designVariables} from '../lib/designSystem';
import {ratio} from '../lib/accessibilityCore';
import {createMiniSite,miniSiteToHTML,safeMiniSite} from '../lib/miniSiteCore';
import DesignFoundation from '../components/DesignFoundation';
afterEach(()=>{vi.restoreAllMocks();localStorage.clear()});
it('tokens versionnés issus du Lab et contrastes de texte clair/sombre',()=>{
 expect(DESIGN_SYSTEM.reference.commit).toBe('3634a313ddc5adabbf92b0f4cd4b58eef5b8cbb1');
 for(const t of [DESIGN_SYSTEM.tokens,{...DESIGN_SYSTEM.tokens,...DESIGN_SYSTEM.dark}]){
 expect(ratio(t.ink,t.surface)).toBeGreaterThanOrEqual(7);expect(ratio(t.muted,t.surface)).toBeGreaterThanOrEqual(4.5);expect(ratio(t.button,t.buttonText)).toBeGreaterThanOrEqual(7);
 }
 expect(designCSS()).not.toContain(':root');expect(designVariables()).toContain('--aime-radius:12px');
});
it('nouveaux mini-sites utilisent les tokens sans écraser les personnalisations ou migrer les anciens',()=>{
 const site=createMiniSite('mariage');expect(site.designVersion).toBe('1.0.0');
 const custom={...site,primaryColor:'#123456',background:'#fffaf0',title:'Notre titre'};
 const before=JSON.stringify(custom),html=miniSiteToHTML(custom);
 expect(html).toContain('--aime-petrol:#164c70');expect(html).toContain('--accent:#123456');expect(html).toContain('--paper:#fffaf0');expect(html).toContain('Notre titre');expect(JSON.stringify(custom)).toBe(before);
 const {designVersion:_,...legacy}=custom;expect(safeMiniSite(legacy)).toBeTruthy();expect(miniSiteToHTML(legacy)).not.toContain('--aime-petrol:');
 expect(safeMiniSite({...custom,designVersion:'2.0.0'})).toBeNull();
});
it('le Studio teste les thèmes sans modifier les préférences persistantes',async()=>{
 (globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
 localStorage.setItem('pointzero:accessibility:v1','original-private');const write=vi.spyOn(Storage.prototype,'setItem');
 const node=document.createElement('div'),root=createRoot(node);document.body.append(node);
 try{await act(async()=>root.render(<DesignFoundation/>));expect(node.textContent).toContain('Fondations canoniques');
 const select=node.querySelector('select')!;await act(async()=>{select.value='dark';select.dispatchEvent(new Event('change',{bubbles:true}))});
 expect(node.querySelector('[data-aime-mode]')?.getAttribute('data-aime-mode')).toBe('dark');expect(write).not.toHaveBeenCalled();expect(localStorage.getItem('pointzero:accessibility:v1')).toBe('original-private');
 }finally{await act(async()=>root.unmount());node.remove()}
});
