import {writeStoredJSON} from "../lib/storageSafety";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Copy, Download, FileText, Plus, Trash2, Upload } from "lucide-react";
import { StudioFrame, studioButton, studioInput, saveStudioFile } from "./StudioFrame";
import { ADMIN_STORAGE, createAdminDocument, docKinds, docToHTML, documentArtBackground, documentArtThemes, documentTotals, duplicateAsInvoice, safeAdminStore, type AdminDocKind, type AdminDocument, type AdminDocState, type AdminStore, type DocumentArtTheme, type DocumentItem } from "../lib/adminCore";
import { eurosToCents, euro, loadProjectOptions } from "../lib/budgetCore";
import { ART_KEY, artToSVG, safeArt } from "../lib/artWorldCore";

const load=():AdminStore=>{
  try{return safeAdminStore(JSON.parse(localStorage.getItem(ADMIN_STORAGE)??"null"))??{version:1,documents:[]};}
  catch{return {version:1,documents:[]};}
};
interface Props {onBack:()=>void;linkedProject?:{id:string;name:string}|null}
export default function AdminStudio({onBack,linkedProject}:Props) {
  const [store,setStore]=useState<AdminStore>(load);
  const [selectedId,setSelectedId]=useState<string|null>(store.documents[0]?.id??null);
  const [newKind,setNewKind]=useState<AdminDocKind>("devis");
  const [filter,setFilter]=useState("");
  const [notice,setNotice]=useState("");
  const importPicker=useRef<HTMLInputElement>(null);
  const availableProjects=useMemo(()=>{
    const p=loadProjectOptions();
    if(linkedProject&&!p.some(x=>x.id===linkedProject.id))p.unshift(linkedProject);
    return p;
  },[linkedProject]);
  const artBackdrop=useMemo(()=>{
    try{return safeArt(JSON.parse(localStorage.getItem(ART_KEY)??"null"));}catch{return null;}
  },[]);
  const doc=store.documents.find(d=>d.id===selectedId)??null;
  const money=doc&&(doc.kind==="devis"||doc.kind==="facture");
  const totals=doc?documentTotals(doc):null;
  useEffect(()=>{try{writeStoredJSON(ADMIN_STORAGE,JSON.stringify(store),safeAdminStore);}
    catch{setNotice("Stockage local saturé : exportez votre bibliothèque en JSON.");}},[store]);
  const update=(patch:Partial<AdminDocument>)=>{
    if(!doc)return;
    setStore(prev=>({...prev,documents:prev.documents.map(d=>d.id===doc.id?{...d,...patch}:d)}));
  };
  const addDoc=()=>{
    const next=createAdminDocument(newKind,linkedProject?.id??"");
    setStore(prev=>({...prev,documents:[next,...prev.documents]}));setSelectedId(next.id);
  };
  const remove=()=>{
    if(!doc||!window.confirm("Supprimer définitivement « "+doc.reference+" » ?"))return;
    setStore(prev=>({...prev,documents:prev.documents.filter(d=>d.id!==doc.id)}));
    setSelectedId(store.documents.find(d=>d.id!==doc.id)?.id??null);
  };
  const convert=()=>{
    if(!doc||doc.kind!=="devis")return;
    if(!window.confirm("Créer une facture brouillon à partir de ce devis ? Le devis original sera conservé."))return;
    const next=duplicateAsInvoice(doc);
    setStore(prev=>({...prev,documents:[next,...prev.documents]}));setSelectedId(next.id);
    setNotice("Facture brouillon créée. Vérifiez toutes les mentions avant émission.");
  };
  const updateItem=(id:string,patch:Partial<DocumentItem>)=>{
    if(!doc)return;
    update({items:doc.items.map(i=>i.id===id?{...i,...patch}:i)});
  };
  const addItem=()=>{
    if(!doc)return;
    const item:DocumentItem={id:globalThis.crypto?.randomUUID?.()??Math.random().toString(36).slice(2),title:"Nouvelle ligne",quantity:1,unitCents:0};
    update({items:[...doc.items,item]});
  };
  const downloadDocument=(format:"html"|"json")=>{
    if(!doc)return;
    const name=doc.reference.toLowerCase().replace(/[^a-z0-9-]/g,"-")||"document";
    if(format==="html")saveStudioFile(name+".html",docToHTML(doc,artBackdrop),"text/html;charset=utf-8");
    else saveStudioFile(name+".pointzero.json",JSON.stringify(doc,null,2));
  };
  const importJSON=async(e:ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0];e.target.value="";if(!file)return;
    if(file.size>4_000_000){setNotice("Fichier trop volumineux.");return;}
    try{
      const parsed=safeAdminStore(JSON.parse(await file.text()));
      if(!parsed)throw Error("Bibliothèque de documents incompatible.");
      if(!window.confirm("Remplacer les documents locaux par cette bibliothèque ?"))return;
      setStore(parsed);setSelectedId(parsed.documents[0]?.id??null);setNotice("Documents importés.");
    }catch(error){setNotice(error instanceof Error?error.message:"Import impossible.");}
  };
  const actions=<div className="flex gap-1">
    <button title="Exporter tous les documents JSON" aria-label="Exporter bibliothèque admin JSON" className={studioButton+" !px-2"}
      onClick={()=>saveStudioFile("pointzero-admin.json",JSON.stringify(store,null,2))}><Download size={16}/></button>
    <button title="Importer une bibliothèque JSON" aria-label="Importer bibliothèque admin JSON" className={studioButton+" !px-2"} onClick={()=>importPicker.current?.click()}><Upload size={16}/></button>
  </div>;
  return <StudioFrame title="Admin / Documents" subtitle="Brouillons et modèles · aperçu A4 · stockage local" onBack={onBack}
    leftLabel="Bibliothèque de documents" rightLabel="Édition du document" actions={actions}
    left={<>
      <h2 className="mb-3 text-sm font-semibold">Mes documents</h2>
      <input className={studioInput+" mb-3"} aria-label="Rechercher un document" placeholder="Rechercher…" value={filter} onChange={e=>setFilter(e.target.value)}/>
      <div className="space-y-2">
        {store.documents.filter(d=>(d.title+" "+d.reference+" "+d.recipient).toLowerCase().includes(filter.toLowerCase())).map(d=>
          <button key={d.id} type="button" onClick={()=>setSelectedId(d.id)} aria-pressed={selectedId===d.id}
            className={"block w-full rounded-[6px] border p-3 text-left "+(selectedId===d.id?"border-white/50 bg-white/15":"border-white/15 bg-white/[.05] hover:bg-white/10")}>
            <span className="block truncate text-xs font-semibold">{d.title||d.reference}</span>
            <span className="mt-1 block text-[11px] text-white/60">{d.reference} · {d.state}</span>
          </button>)}
      </div>
      <div className="mt-5 border-t border-white/10 pt-4">
        <h3 className="text-xs font-semibold">Créer un document</h3>
        <select aria-label="Type de nouveau document" className={studioInput+" mt-3"} value={newKind} onChange={e=>setNewKind(e.target.value as AdminDocKind)}>
          {docKinds.map(k=><option key={k.id} value={k.id}>{k.label}</option>)}
        </select>
        <button type="button" className={studioButton+" mt-3 w-full"} onClick={addDoc}><Plus size={15}/> Nouveau document</button>
      </div>
      <p className="mt-4 text-[11px] leading-relaxed text-white/60">Les documents ne sont ni envoyés ni signés automatiquement. Ils doivent être vérifiés avant usage officiel.</p>
    </>}
    right={<>
      {!doc?<p className="text-xs text-white/60">Choisissez ou créez un document.</p>:<div className="space-y-3">
        <h2 className="text-sm font-semibold">Modifier le document</h2>
        <label className="block text-xs text-white/75">Intitulé
          <input aria-label="Titre du document" className={studioInput+" mt-1"} maxLength={200} value={doc.title} onChange={e=>update({title:e.target.value})}/>
        </label>
        <label className="block text-xs text-white/75">Référence interne
          <input aria-label="Référence du document" className={studioInput+" mt-1"} maxLength={100} value={doc.reference} onChange={e=>update({reference:e.target.value})}/>
        </label>
        <label className="block text-xs text-white/75">État
          <select aria-label="État du document" className={studioInput+" mt-1"} value={doc.state} onChange={e=>update({state:e.target.value as AdminDocState})}>
            <option value="brouillon">Brouillon</option><option value="à vérifier">À vérifier</option><option value="finalisé">Finalisé (déclaratif)</option>
          </select>
        </label>
        <label className="block text-xs text-white/75">Projet associé
          <select aria-label="Projet lié au document" className={studioInput+" mt-1"} value={doc.projectId} onChange={e=>update({projectId:e.target.value})}>
            <option value="">Aucun projet</option>{availableProjects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className="block text-xs text-white/75">Fond artistique léger (A4)
          <select aria-label="Fond artistique du document" className={studioInput+" mt-1"} value={doc.artTheme??"none"}
            onChange={e=>update({artTheme:e.target.value as DocumentArtTheme})}>
            {documentArtThemes.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <span className="mt-1 block text-[10px] text-white/55">Un décor discret derrière le texte. Pour « Ma toile », utilisez le projet local LE MONDE AIME.</span>
        </label>
        <details open className="border-t border-white/10 pt-2">
          <summary className="cursor-pointer text-xs font-semibold">Émetteur et destinataire</summary>
          <label className="mt-2 block text-xs text-white/75">Émetteur
            <input aria-label="Nom de l'émetteur" className={studioInput+" mt-1"} value={doc.issuer} maxLength={300} onChange={e=>update({issuer:e.target.value})}/>
          </label>
          <label className="mt-2 block text-xs text-white/75">Adresse émetteur
            <textarea className={studioInput+" mt-1"} rows={2} value={doc.issuerAddress} maxLength={1500} onChange={e=>update({issuerAddress:e.target.value})}/>
          </label>
          <label className="mt-2 block text-xs text-white/75">Contact et mentions émetteur
            <textarea className={studioInput+" mt-1"} rows={2} value={doc.issuerContact} maxLength={500} onChange={e=>update({issuerContact:e.target.value})}/>
          </label>
          <label className="mt-2 block text-xs text-white/75">Destinataire
            <input aria-label="Nom du destinataire" className={studioInput+" mt-1"} value={doc.recipient} maxLength={300} onChange={e=>update({recipient:e.target.value})}/>
          </label>
          <label className="mt-2 block text-xs text-white/75">Adresse destinataire
            <textarea className={studioInput+" mt-1"} rows={2} value={doc.recipientAddress} maxLength={1500} onChange={e=>update({recipientAddress:e.target.value})}/>
          </label>
        </details>
        <details open className="border-t border-white/10 pt-2">
          <summary className="cursor-pointer text-xs font-semibold">Objet et contenu</summary>
          <label className="mt-2 block text-xs text-white/75">Objet
            <input aria-label="Objet du document" className={studioInput+" mt-1"} value={doc.subject} maxLength={1000} onChange={e=>update({subject:e.target.value})}/>
          </label>
          <label className="mt-2 block text-xs text-white/75">Texte libre
            <textarea aria-label="Contenu du document" className={studioInput+" mt-1"} rows={5} value={doc.body} maxLength={20000} onChange={e=>update({body:e.target.value})}/>
          </label>
          <label className="mt-2 block text-xs text-white/75">Date
            <input aria-label="Date d'émission" type="date" className={studioInput+" mt-1"} value={doc.issueDate} onChange={e=>update({issueDate:e.target.value})}/>
          </label>
          {money&&<label className="mt-2 block text-xs text-white/75">Échéance
            <input aria-label="Date d'échéance" type="date" className={studioInput+" mt-1"} value={doc.dueDate} onChange={e=>update({dueDate:e.target.value})}/>
          </label>}
        </details>
        {money&&<details open className="border-t border-white/10 pt-2">
          <summary className="cursor-pointer text-xs font-semibold">Lignes et montants</summary>
          {doc.items.map(item=><div key={item.id} className="mt-2 space-y-2 rounded-[5px] border border-white/15 p-2">
            <div className="flex gap-1"><input aria-label={"Désignation ligne "+item.id} className={studioInput+" min-w-0 flex-1"} maxLength={500} value={item.title} onChange={e=>updateItem(item.id,{title:e.target.value})}/>
              <button title="Retirer la ligne" aria-label={"Retirer ligne "+item.id} onClick={()=>update({items:doc.items.filter(i=>i.id!==item.id)})} className="px-1 text-white/65"><Trash2 size={15}/></button></div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px] text-white/65">Quantité
                <input type="number" min=".01" step=".01" className={studioInput+" mt-1"} value={item.quantity} onChange={e=>updateItem(item.id,{quantity:Math.min(100000,Math.max(.01,Number(e.target.value)||.01))})}/>
              </label>
              <label className="text-[11px] text-white/65">Prix unitaire (€)
                <input type="number" min="0" step=".01" className={studioInput+" mt-1"} value={(item.unitCents/100).toFixed(2)} onChange={e=>{const cents=eurosToCents(e.target.value);if(cents!==null)updateItem(item.id,{unitCents:cents});}}/>
              </label>
            </div>
          </div>)}
          <button onClick={addItem} className={studioButton+" mt-2 w-full"}><Plus size={15}/> Ajouter une ligne</button>
          <label className="mt-3 block text-xs text-white/75">TVA
            <select aria-label="Taux de TVA" className={studioInput+" mt-1"} value={doc.vatRate} onChange={e=>update({vatRate:Number(e.target.value)})}>
              {[0,2.1,5.5,10,20].map(rate=><option key={rate} value={rate}>{rate} %</option>)}
            </select>
          </label>
          <label className="mt-3 block text-xs text-white/75">Conditions de paiement
            <textarea className={studioInput+" mt-1"} rows={3} value={doc.paymentTerms} maxLength={3000} onChange={e=>update({paymentTerms:e.target.value})}/>
          </label>
        </details>}
        <label className="block text-xs text-white/75">Pied de page / mentions
          <textarea aria-label="Mentions du document" className={studioInput+" mt-1"} rows={3} value={doc.footer} maxLength={3000} onChange={e=>update({footer:e.target.value})}/>
        </label>
        {doc.kind==="devis"&&<button className={studioButton+" w-full"} onClick={convert}><Copy size={15}/> Créer une facture brouillon</button>}
        <button className={studioButton+" w-full"} onClick={remove}><Trash2 size={15}/> Supprimer ce document</button>
        <p className="text-[11px] leading-relaxed text-white/55">Les champs légaux, la numérotation officielle, la TVA applicable et la conformité électronique restent à vérifier. Aucun envoi automatique.</p>
      </div>}
    </>}
  >
    <div className="mx-auto max-w-[900px]">
      {!doc?<div className="mx-auto mt-[10vh] max-w-md rounded-[7px] border border-white/15 bg-[#09090b] p-6 text-center">
        <FileText size={32} className="mx-auto text-white/75"/><h2 className="mt-3 text-xl font-semibold">Vos documents, au même endroit</h2>
        <p className="mt-2 text-sm text-white/65">Choisissez Devis, Facture, Contrat, Attestation ou Courrier dans la bibliothèque à gauche.</p>
        <button onClick={addDoc} className={studioButton+" mt-4"}><Plus size={15}/> Créer un document</button>
      </div>:<>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-[11px] uppercase tracking-[.12em] text-white/55">Administration · document</p>
            <h2 className="mt-1 text-xl font-semibold">{doc.title||"Document"}</h2>
            <p className="mt-1 text-xs text-white/65">{doc.reference} · {doc.state}</p></div>
          <div className="flex gap-2">
            <button className={studioButton} onClick={()=>downloadDocument("html")}><FileText size={15}/> A4 imprimable</button>
            <button className={studioButton} onClick={()=>downloadDocument("json")}><Download size={15}/> JSON</button>
          </div>
        </div>
        <article aria-label="Aperçu A4 du document" className="relative isolate mx-auto min-h-[780px] max-w-[760px] rounded-[4px] bg-white px-6 py-8 text-[#18181b] shadow-xl sm:px-10 sm:py-12"
          style={{backgroundImage:documentArtBackground(doc.artTheme)}}>
          {doc.artTheme==="my-art"&&artBackdrop&&<img alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-contain opacity-[.085]"
            src={"data:image/svg+xml;charset=utf-8,"+encodeURIComponent(artToSVG(artBackdrop))}/>}
          
          <header className="flex flex-wrap justify-between gap-4 border-b-2 border-black pb-5">
            <div><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-black/50">POINTZERO · Administration</p>
              <h3 className="mt-3 text-2xl font-bold">{doc.title||doc.kind}</h3>
              <p className="mt-1 text-xs text-black/55">{doc.reference}</p></div>
            <div className="text-xs text-black/65"><p>Émis le {doc.issueDate}</p>{money&&<p className="mt-1">Échéance : {doc.dueDate}</p>}</div>
          </header>
          <div className="mt-8 grid grid-cols-2 gap-4 text-xs">
            <div><p className="font-semibold">Émetteur</p><p className="mt-2 whitespace-pre-wrap break-words text-black/75">{[doc.issuer,doc.issuerAddress,doc.issuerContact].filter(Boolean).join("\n")||"À renseigner"}</p></div>
            <div><p className="font-semibold">Destinataire</p><p className="mt-2 whitespace-pre-wrap break-words text-black/75">{[doc.recipient,doc.recipientAddress].filter(Boolean).join("\n")||"À renseigner"}</p></div>
          </div>
          {doc.subject&&<h4 className="mt-9 break-words text-base font-semibold">{doc.subject}</h4>}
          {money&&<div className="mt-8 overflow-x-auto"><table className="w-full min-w-[350px] border-collapse text-left text-[12px]">
            <thead><tr className="border-b border-black/30"><th className="py-2">Désignation</th><th className="py-2 text-right">Qté</th><th className="py-2 text-right">Prix</th><th className="py-2 text-right">Total</th></tr></thead>
            <tbody>{doc.items.map(i=><tr key={i.id} className="border-b border-black/10">
              <td className="py-2">{i.title}</td><td className="py-2 text-right">{i.quantity}</td><td className="py-2 text-right">{euro(i.unitCents)}</td><td className="py-2 text-right">{euro(Math.round(i.unitCents*i.quantity))}</td>
            </tr>)}</tbody>
          </table><div className="mt-4 text-right text-xs">
            <p>Sous-total : {euro(totals?.subtotal??0)}</p><p className="mt-1">TVA ({doc.vatRate} %) : {euro(totals?.vat??0)}</p>
            <p className="mt-2 text-lg font-bold">Total : {euro(totals?.total??0)}</p>
          </div></div>}
          <div className="mt-10 min-h-[150px] whitespace-pre-wrap break-words text-sm leading-relaxed">{doc.body||"Texte libre à compléter dans le panneau des propriétés."}</div>
          {doc.paymentTerms&&<div className="mt-8 whitespace-pre-wrap text-xs text-black/65">{doc.paymentTerms}</div>}
          <footer className="mt-12 whitespace-pre-wrap break-words border-t border-black/15 pt-4 text-[11px] text-black/55">{doc.footer}</footer>
        </article>
        <p className="mt-3 text-center text-xs text-white/65">Fichier HTML A4 à ouvrir puis imprimer ou enregistrer en PDF via le navigateur.</p>
      </>}
      {notice&&<p role="status" className="mt-4 rounded-[5px] bg-[#09090b] p-3 text-sm text-white">{notice}</p>}
    </div>
    <input ref={importPicker} type="file" accept="application/json,.json" className="sr-only" aria-label="Importer documents admin JSON" onChange={e=>void importJSON(e)}/>
  </StudioFrame>;
}
