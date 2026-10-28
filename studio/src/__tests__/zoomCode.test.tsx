import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {demoZoomPattern,cellInfo,editZoomCell,zoomHTML,zoomJSON,zoomSVG} from '../lib/zoomCode';
import {fromObject} from '../lib/pattern';
import ZoomCodePrototype from '../components/ZoomCodePrototype';
it('Pattern canonique existant, cellule stable, conversions explicites sans mutation',()=>{
 const p=demoZoomPattern(),before=p.cross.slice(),id=cellInfo(p,0).id;
 const next=editZoomCell(p,0,'321');expect(cellInfo(next,0).thread).toBe('321');expect(cellInfo(next,0).id).toBe(id);expect(next.id).toBe(p.id);
 expect(p.cross).toEqual(before);expect(fromObject(JSON.parse(zoomJSON(next)))?.cross[0]).toBe(next.cross[0]);
 expect(zoomSVG(next)).toContain('<svg');expect(zoomHTML(next)).toContain('width:100%');expect(zoomHTML(next)).toContain('Pas une conversion en application');
 expect(()=>editZoomCell(p,0,'not-a-thread')).toThrow();expect(()=>cellInfo(p,999)).toThrow();expect(cellInfo(editZoomCell(next,0,''),0).thread).toBeNull();
});
it('sélection, proposition, confirmation, propagation puis annulation sans sauvegarde',async()=>{
 (globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
 const write=vi.spyOn(Storage.prototype,'setItem');const node=document.createElement('div');document.body.append(node);const root=createRoot(node);
 try{await act(async()=>root.render(<ZoomCodePrototype/>));const frame=()=>node.querySelector('iframe')!.srcdoc;const original=frame();
 const button=(text:string)=>[...node.querySelectorAll('button')].find(b=>b.textContent===text)!;
 await act(async()=>button('Prévisualiser la modification').click());expect(frame()).not.toBe(original);
 await act(async()=>button('Confirmer la modification').click());expect(node.textContent).toContain('Fil : 321');
 await act(async()=>button('Annuler').click());expect(frame()).toBe(original);
 await act(async()=>button('Rétablir').click());expect(frame()).not.toBe(original);expect(write).not.toHaveBeenCalled();
 expect(node.querySelector('iframe')!.getAttribute('sandbox')).toBe('');
 }finally{await act(async()=>root.unmount());node.remove();vi.restoreAllMocks()}
});
