import {afterEach,describe,expect,it} from "vitest";
import {createMiniSite,miniSection,miniSiteToHTML,safeMiniSite} from "../lib/miniSiteCore";
import {newSpace,safeWorld,sourcesForTile,linkedModuleInfo} from "../lib/oneSpaceCore";
import {
 EXTERNAL_KEY,RIPPLECIRCLE,addExternal,externalById,externalManifest,readExternal,
 safeExternalURL,validRegistry,writeExternal
} from "../lib/externalProjects";
afterEach(()=>localStorage.clear());
describe("POINTZERO — brancher un projet existant",()=>{
 it("reconnaît RIPPLECIRCLE par référence unique et manifeste explicite",()=>{
   const r=readExternal();
   expect(r.resources).toEqual(expect.arrayContaining([RIPPLECIRCLE]));
   expect(externalById("ripplecircle")?.url).toBe("https://ripplecircle.vercel.app/");
   expect(externalManifest(RIPPLECIRCLE)).toMatchObject({version:1,capabilities:{readData:false,writeData:false,authentication:false}});
   expect(safeExternalURL("https://ripplecircle.vercel.app/")).toBe(RIPPLECIRCLE.url);
 });
 it("refuse les liens dangereux et ne télécharge pas les contenus tiers",()=>{
   for(const url of ["javascript:alert(1)","data:text/html,abc","http://exemple.com/",
    "https://user:secret@example.com/","https://localhost/","https://127.0.0.1/private",
    "//ripplecircle.vercel.app","https://example.com:8080/","https://site.local/"]){
     expect(safeExternalURL(url),url).toBe("");
   }
   expect(safeExternalURL("https://example.com/public#section")).toBe("");
   expect(safeExternalURL("https://example.com/demo")).toBe("https://example.com/demo");
 });
 it("enregistre d'autres projets par URL HTTPS, sans doublon",()=>{
   const first=addExternal(readExternal(),"Projet de test","https://demo.example.org/");
   expect(first.resources).toHaveLength(2);
   writeExternal(first);
   expect(readExternal()).toEqual(first);
   expect(()=>addExternal(first,"Double","https://demo.example.org/")).toThrow();
   expect(validRegistry({...first,resources:[...first.resources,first.resources[1]]})).toBeNull();
   expect(validRegistry({...first,resources:[{...RIPPLECIRCLE,url:"javascript:alert(1)"}]})).toBeNull();
   localStorage.setItem(EXTERNAL_KEY,"{");
   expect(readExternal().resources[0].id).toBe("ripplecircle");
 });
 it("branche une référence dans Mon Espace sans copier les données du projet distant",()=>{
   const space=newSpace("mariage","Jour J");
   space.tiles.push({id:"external-1",kind:"external",title:"Cadran",visible:true,refId:RIPPLECIRCLE.id});
   expect(safeWorld({version:1,spaces:[space],selectedSpaceId:space.id})).not.toBeNull();
   expect(sourcesForTile("external")).toContainEqual({label:RIPPLECIRCLE.title,id:RIPPLECIRCLE.id});
   expect(linkedModuleInfo(space.tiles.at(-1)!)?.label).toBe(RIPPLECIRCLE.title);
   expect(linkedModuleInfo({...space.tiles.at(-1)!,refId:"nonexistent"})).toBeNull();
 });
 it("exporte Mini-site avec lien de secours et iframe uniquement à la demande",()=>{
   const site=createMiniSite("mariage"),section=miniSection("externe");
   section.title="Cadran du Jour J";
   section.externalRefId=RIPPLECIRCLE.id;
   site.sections.push(section);
   expect(safeMiniSite(site)).not.toBeNull();
   const html=miniSiteToHTML(site);
   expect(html).toContain("https://ripplecircle.vercel.app/");
   expect(html).toContain("Ouvrir RIPPLECIRCLE");
   expect(html).toContain("Afficher ici à ma demande");
   expect(html).toContain("allow-scripts allow-same-origin allow-forms");
   expect(html).toContain('document.createElement("iframe")');
   expect(html).not.toContain('<iframe src="https://ripplecircle.vercel.app/"');
   expect(html).toContain('rel="noopener noreferrer"');
 });
 it("maintient un mini-site ancien sans JavaScript tiers ni chargement automatique",()=>{
   const site=createMiniSite("portfolio");
   const html=miniSiteToHTML(site);
   expect(html).not.toContain("<script>");
   expect(html).not.toContain('class="external-project"');
   expect(html).not.toContain("data-external-url");
   const newSec=miniSection("externe");
   newSec.externalRefId="missing";
   site.sections.push(newSec);
   expect(miniSiteToHTML(site)).toContain("Projet externe non relié");
 });
});
