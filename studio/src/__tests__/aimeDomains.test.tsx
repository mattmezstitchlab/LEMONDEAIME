import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {AIME_DOMAINS,domainToolPath} from '../lib/aimeDomains';
import {entryStudio} from '../lib/entryNavigation';
import AimeDomainNavigation from '../components/AimeDomainNavigation';
it('regroupe les outils sans doubler leurs routes et sans supprimer les modes existants',()=>{
 const routes=AIME_DOMAINS.flatMap(d=>d.tools.map(t=>t.route));expect(new Set(routes).size).toBe(routes.length);
 for(const route of routes){const url=new URL(domainToolPath(route),'https://example.test');expect(entryStudio(url.search,'',url.pathname)).toBe(route)}
 expect(()=>domainToolPath('manifest-admin')).toThrow();
});
it('navigation par objectif, limites visibles, association séparée, aucune sauvegarde',async()=>{
 (globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
 const write=vi.spyOn(Storage.prototype,'setItem'),navigate=vi.fn();const node=document.createElement('div');document.body.append(node);const root=createRoot(node);
 try{await act(async()=>root.render(<AimeDomainNavigation onNavigate={navigate}/>));expect(node.querySelectorAll('details')).toHaveLength(5);
 expect(node.textContent).toContain('association distincte');expect(node.textContent).toContain('n’est pas encore un parcours disponible');
 const link=node.querySelector('a[href="/atelier?studio=mini-site"]')!;
 await act(async()=>link.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true})));expect(navigate).toHaveBeenCalledWith('/atelier?studio=mini-site');expect(write).not.toHaveBeenCalled();
 }finally{await act(async()=>root.unmount());node.remove();vi.restoreAllMocks()}
});
