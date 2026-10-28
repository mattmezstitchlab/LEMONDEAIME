import {beforeEach,describe,expect,it} from "vitest";
import {FLOSS,flossIndex} from "../lib/dmc";
import {adaptPatternToProfile,defaultBrodeuseProfile,loadBrodeuseProfile,saveBrodeuseProfile,previewBoutiqueVariants} from "../lib/brodeuseProfile";
import {addSuggestedLeaves,floralDemo,suggestLeaves} from "../lib/floralComposition";
import {affectedBounds,attachSubject,changeSubject,detectSubjects,recomposeSubjects,removeSubject,reorderSubject,sceneFromPattern} from "../lib/subjectEngine";
import {fromObject,toObject,createPattern,ensurePalette} from "../lib/pattern";
import {buildPdf} from "../lib/pdf";

const filled=(p:ReturnType<typeof createPattern>)=>Array.from(p.cross).filter(v=>v>=0).length;
const put=(p:ReturnType<typeof createPattern>,x:number,y:number,c:number)=>{
  p.cross[y*p.w+x]=c;ensurePalette(p,c);
};

describe("Bouquet indépendant, profondeur brodable et stock",()=>{
  it("compose 3 fleurs, 4 feuilles et une branche sans classifier d'objets inconnus",()=>{
    const scene=floralDemo();
    expect(scene.layers).toHaveLength(8);
    expect(scene.layers.filter(l=>l.name.startsWith("Rose"))).toHaveLength(3);
    expect(scene.layers.filter(l=>l.name.startsWith("Feuille"))).toHaveLength(4);
    expect(scene.layers[0].name).toBe("Branche");
    const out=recomposeSubjects(scene);
    expect(out.w).toBe(150);expect(out.h).toBe(95);
    expect(filled(out)).toBeGreaterThan(600);
    expect(out.palette.length).toBeGreaterThan(5);
    expect(sceneFromPattern(fromObject(toObject(out))!)?.layers).toHaveLength(8);
    expect(recomposeSubjects(sceneFromPattern(fromObject(toObject(out))!)!).cross).toEqual(out.cross);
  });
  it("la superposition est réellement opaque dans tous les canaux : fractions + croix du devant",()=>{
    const back=createPattern("Fond",24,24),front=createPattern("Devant",24,24),a=flossIndex("310"),b=flossIndex("321");
    for(let y=5;y<15;y++)for(let x=5;x<15;x++){put(back,x,y,a);}
    back.q[0][10*24+10]=a;
    back.fwd[10*24+10]=a;
    back.back.push({x1:7,y1:10,x2:14,y2:10,c:a});
    for(let y=8;y<18;y++)for(let x=8;x<18;x++)put(front,x,y,b);
    let scene=detectSubjects(createPattern("Vide",24,24)).scene;
    scene=attachSubject(scene,back,0,0);
    scene=attachSubject(scene,front,0,0);
    const out=recomposeSubjects(scene);
    const cell=10*24+10;
    expect(out.cross[cell]).toBe(b);
    expect(out.q[0][cell]).toBe(-1);
    expect(out.fwd[cell]).toBe(-1);
    expect(out.back.some(seg=>seg.c===a && (seg.x1+seg.x2)/2>=9 && (seg.x1+seg.x2)/2<13)).toBe(false);
  });
  it("une feuille proposée peut être retirée sans détruire la composition ni la source",()=>{
    const source=floralDemo(),extra=addSuggestedLeaves(source);
    expect(extra.layers.length).toBeGreaterThan(source.layers.length);
    let restored=extra;
    for(const layer of extra.layers.slice(source.layers.length))restored=removeSubject(restored,layer.id);
    expect(recomposeSubjects(restored).cross).toEqual(recomposeSubjects(source).cross);
    expect(restored.source).toBe(source.source);
  });
  it("le mode profondeur renforcée ne dessine que sur les superpositions et reste désactivable",()=>{
    const scene=floralDemo();
    const back=recomposeSubjects(scene);
    const enhanced=recomposeSubjects({...scene,depth:"renforcee"});
    expect(enhanced.cross).toEqual(back.cross);
    expect(enhanced.back.length).toBeGreaterThan(back.back.length);
    expect(recomposeSubjects({...scene,depth:"naturelle"}).back).toEqual(back.back);
  });
  it("un déplacement focal remplit exactement le même résultat que la recomposition complète",()=>{
    const scene=floralDemo();
    const first=recomposeSubjects(scene);
    const flower=scene.layers.find(l=>l.name==="Rose centrale")!;
    const moved=changeSubject(scene,flower.id,{x:flower.x+8,y:flower.y+3});
    const partial=recomposeSubjects(moved,first,affectedBounds(flower,moved.layers.find(l=>l.id===flower.id)!));
    const full=recomposeSubjects(moved);
    expect(partial.cross).toEqual(full.cross);
    expect(partial.fwd).toEqual(full.fwd);
    expect(partial.q).toEqual(full.q);
    expect(partial.back).toEqual(full.back);
    expect(partial.palette).toEqual(full.palette);
  });
  it("en mode profondeur renforcée le recalcul local garde exactement tous les contours",()=>{
    const initial={...floralDemo(),depth:"renforcee" as const};
    const before=recomposeSubjects(initial);
    const flower=initial.layers.find(l=>l.name==="Rose centrale")!;
    const next=changeSubject(initial,flower.id,{x:flower.x+3});
    const relocated=next.layers.find(l=>l.id===flower.id)!;
    const local=recomposeSubjects(next,before,affectedBounds(flower,relocated));
    const whole=recomposeSubjects(next);
    expect(local.cross).toEqual(whole.cross);
    expect(local.back).toEqual(whole.back);
  });
  it("l'ordre avant/arrière transforme visiblement les points aux zones de chevauchement",()=>{
    let scene=floralDemo();
    const original=recomposeSubjects(scene);
    // Move two flowers onto the same position so their occlusion is explicit.
    const roses=scene.layers.filter(l=>l.name.startsWith("Rose"));
    scene=changeSubject(scene,roses[1].id,{x:roses[0].x,y:roses[0].y});
    const before=recomposeSubjects(scene);
    scene=reorderSubject(scene,roses[0].id,1);
    const after=recomposeSubjects(scene);
    expect(before.cross).not.toEqual(after.cross);
    expect(filled(original)).toBeGreaterThan(0);
  });
  it("propose des feuilles seulement comme suggestion, désactivable et source inchangée",()=>{
    const original=floralDemo(),copy=recomposeSubjects(original).cross.slice();
    const suggestions=suggestLeaves(original,2);
    expect(suggestions.length).toBeGreaterThan(0);
    const filledScene=addSuggestedLeaves(original,2);
    expect(filledScene.layers.length).toBeGreaterThan(original.layers.length);
    expect(recomposeSubjects(original).cross).toEqual(copy);
  });
  it("un profil avec 4 fils DMC limite effectivement la variante stock à ces 4 références",()=>{
    const source=recomposeSubjects(floralDemo());
    const profile=defaultBrodeuseProfile();
    profile.stock={
      "310":{skeins:20,remainingMeters:0},
      "321":{skeins:20,remainingMeters:0},
      "703":{skeins:20,remainingMeters:0},
      "725":{skeins:20,remainingMeters:0}
    };
    profile.maxColors=4;
    const result=adaptPatternToProfile(source,profile,"stock");
    expect(result.report.afterColors).toBeLessThanOrEqual(4);
    expect(result.report.usedCodes.every(c=>Object.keys(profile.stock).includes(c))).toBe(true);
    expect(result.report.substitutions.length).toBeGreaterThan(0);
    expect(result.pattern.cross.length).toBe(source.cross.length);
    expect(filled(result.pattern)).toBe(filled(source));
    expect(result.pattern.adaptation?.substitutions.length).toBeGreaterThan(0);
    const reopened=fromObject(toObject(result.pattern))!;
    expect(reopened.adaptation?.mode).toBe("stock");
    expect(reopened.palette.map(i=>FLOSS[i].code)).toEqual(result.report.usedCodes);
    expect(reopened.subjectScene?.layers).toHaveLength(8);
  });
  it("un stock vide n'invente pas de couleur disponible",()=>{
    const p=recomposeSubjects(floralDemo());
    const adapted=adaptPatternToProfile(p,defaultBrodeuseProfile(),"stock");
    expect(adapted.report.warnings.join(" ")).toMatch(/aucun fil DMC/i);
    expect(adapted.pattern.cross).toEqual(p.cross);
  });
  it("une petite quantité déclarée reste insuffisante si les mètres requis dépassent le stock",()=>{
    const p=recomposeSubjects(floralDemo());
    const profile=defaultBrodeuseProfile();
    profile.stock={"310":{skeins:0,remainingMeters:.01}};
    const out=adaptPatternToProfile(p,profile,"stock");
    expect(out.report.missing.length).toBeGreaterThan(0);
    expect(out.report.warnings.join(" ")).toMatch(/insuffisant/i);
  });
  it("aperçu boutique : six variantes calculables sans paiement ni modification de la source",()=>{
    const original=recomposeSubjects(floralDemo()),old=original.cross.slice();
    const variants=previewBoutiqueVariants(original,defaultBrodeuseProfile());
    expect(variants).toHaveLength(6);
    expect(variants.map(v=>v.report.mode)).toEqual(["original","stock","debutant","expert","petit","reduite"]);
    expect(original.cross).toEqual(old);
    expect(variants[4].report.warnings.join(" ")).toMatch(/réduction/i);
  });
  it("la variante stock exporte le même Pattern en JSON et PDF",async()=>{
    const source=recomposeSubjects(floralDemo());
    const profile=defaultBrodeuseProfile();
    profile.stock={"321":{skeins:10,remainingMeters:0},"703":{skeins:10,remainingMeters:0}};
    const adapted=adaptPatternToProfile(source,profile,"stock");
    const restored=fromObject(toObject(adapted.pattern))!;
    expect(restored.cross).toEqual(adapted.pattern.cross);
    const pdf=await buildPdf(adapted.pattern,{bw:false,paper:"a4"});
    expect(pdf.type).toBe("application/pdf");
    expect(pdf.size).toBeGreaterThan(5000);
  });
});
beforeEach(()=>localStorage.removeItem("pointzero:brodeuse:profile-v1"));
describe("Profil privé brodeuse",()=>{
  it("sauvegarde et recharge stock, format, niveau, style sans déduire d'autres marques",()=>{
    const p=defaultBrodeuseProfile();
    p.stock={"321":{skeins:3,remainingMeters:2.5}};
    p.skill="debutant";p.style="botanique";p.maxColors=9;
    saveBrodeuseProfile(p);
    expect(loadBrodeuseProfile()).toEqual(p);
  });
  it("rejette les quantités aberrantes",()=>{
    const p=defaultBrodeuseProfile();
    p.stock={"321":{skeins:-10,remainingMeters:200}};
    saveBrodeuseProfile(p);
    expect(loadBrodeuseProfile().stock["321"]).toBeUndefined();
  });
});
