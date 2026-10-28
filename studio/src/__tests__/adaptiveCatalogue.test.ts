import { describe,it,expect } from "vitest";
import { prepareAdaptiveCatalogue } from "../lib/adaptiveCatalogue";
import { defaultBrodeuseProfile } from "../lib/brodeuseProfile";
import { floralDemo } from "../lib/floralComposition";
import { recomposeSubjects } from "../lib/subjectEngine";

describe("Boutique adaptive préparatoire — aucun paiement ni publication",()=>{
 it("un motif personnel ou sans licence vérifiée n'est jamais publiable",()=>{
   const pattern=recomposeSubjects(floralDemo());
   pattern.provenance={kind:"pdf",source:"patron privé.pdf",author:"Créatrice",license:"Usage personnel",personalOnly:true};
   const profile=defaultBrodeuseProfile();
   const result=prepareAdaptiveCatalogue(pattern,profile,{
     ownerName:"Créatrice",distributionPermission:"commercial",evidenceReference:"licence supposée",reviewed:true
   });
   expect(result.publishable).toBe(false);
   expect(result.status).toBe("needs_rights_review");
   expect(result.variants).toHaveLength(6);
   expect(result.variants[1].pattern.w).toBe(pattern.w);
 });
 it("les aperçus restent privés même si une licence de commercialisation a été revue",()=>{
   const source=recomposeSubjects(floralDemo());
   const options=prepareAdaptiveCatalogue(source,defaultBrodeuseProfile(),{
     ownerName:"POINTZERO",distributionPermission:"commercial",evidenceReference:"revue manuelle interne",reviewed:true
   });
   expect(options.publishable).toBe(true);
   expect(options.status).toBe("private_preview");
   expect(options.rightsWarning).toMatch(/paiement non disponibles/i);
   expect(options.variants.every(x=>x.pattern.palette.length>0)).toBe(true);
 });
});
