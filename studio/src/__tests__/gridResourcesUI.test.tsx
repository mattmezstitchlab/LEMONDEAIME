import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import FragmentGridWorkspace from '../components/FragmentGridWorkspace';
import {createDesign} from '../lib/designStudio';
afterEach(()=>{localStorage.clear();vi.restoreAllMocks()});
it('relie et actualise une création sans copie persistante ni export privé implicite',async()=>{
 (globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
 const d=createDesign('affiche');d.name='Source A';localStorage.setItem('pointzero:design-current:v1',JSON.stringify(d));
 const node=document.createElement('div');document.body.append(node);const root=createRoot(node);
 try{
 await act(async()=>root.render(<FragmentGridWorkspace/>));
 const button=(name:string)=>[...node.querySelectorAll('button')].find(b=>b.textContent===name)!;
 await act(async()=>button('Relier ma création Design').click());
 const saved=localStorage.getItem('pointzero:universal-fragments:v1')!;expect(saved).toContain(d.id);expect(saved).not.toContain('data:image/svg');
 localStorage.setItem('pointzero:design-current:v1',JSON.stringify({...d,name:'Source B'}));
 await act(async()=>window.dispatchEvent(new Event('aime:design-changed')));
 expect(node.textContent).toContain('Source B');expect(localStorage.getItem('pointzero:universal-fragments:v1')).toBe(saved);
 await act(async()=>button('Exporter HTML responsive').click());expect(node.textContent).toContain('Export refusé');
 expect(node.querySelector('.aime-content-grid')?.getAttribute('style')??'').not.toContain('grid-auto-rows: 124px');
 expect(node.querySelector('.aime-content-cell')).toBeTruthy();
 }finally{await act(async()=>root.unmount());node.remove()}
});
