import {useEffect,useState} from 'react';
import {STORAGE_BLOCKED,type StorageStatus} from '../lib/storageSafety';
/** Explicit raw export only. Never resets or repairs the original key. */
export default function StorageRecoveryNotice(){
 const [blocked,setBlocked]=useState<{key:string;status:StorageStatus}|null>(null),[error,setError]=useState('');
 useEffect(()=>{const listener=(e:Event)=>setBlocked((e as CustomEvent).detail);window.addEventListener(STORAGE_BLOCKED,listener);return()=>window.removeEventListener(STORAGE_BLOCKED,listener)},[]);
 if(!blocked)return null;
 return <aside role="alert" style={{position:'fixed',bottom:12,left:12,right:12,zIndex:1000,padding:18,background:'#fff7e8',color:'#292019',border:'2px solid #805116',borderRadius:8,maxWidth:700}}>
  <strong>Sauvegarde bloquée — données d’origine conservées</strong>
  <p>Magasin {blocked.key} : {blocked.status}. N’effacez pas les données du navigateur. Exportez une copie brute privée avant de demander une récupération.</p>
  <button type="button" onClick={()=>{try{
   const raw=localStorage.getItem(blocked.key);if(raw===null)throw Error('Aucune donnée à exporter');
   const url=URL.createObjectURL(new Blob([raw],{type:'application/octet-stream'}));const a=document.createElement('a');
   a.href=url;a.download='aime-recovery-private.txt';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500);
  }catch{setError('Export impossible : accès au stockage ou téléchargement indisponible.')}}}>Exporter la copie brute privée</button>
  <button type="button" onClick={()=>setBlocked(null)} style={{marginLeft:16}}>Fermer l’avertissement</button>
  {error&&<p>{error}</p>}
 </aside>;
}
