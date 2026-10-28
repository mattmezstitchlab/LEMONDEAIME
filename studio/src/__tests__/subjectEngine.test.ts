import {describe,it,expect} from "vitest";
import {FLOSS,flossIndex} from "../lib/dmc";
import {quantizePixels} from "../lib/quantize";
import {buildPdf} from "../lib/pdf";
import {createPattern,ensurePalette,fromObject,toObject} from "../lib/pattern";
import {multiSubjectDemo} from "../lib/subjectDemo";
import {
  affectedBounds, attachSubject, changeSubject, detectSubjects, duplicateSubject, mergeSubjects,
  recomposeSubjects, reorderSubject, sceneFromPattern, splitSubject, spriteForExport,
} from "../lib/subjectEngine";

const occupied=(p:ReturnType<typeof createPattern>)=>Array.from(p.cross).filter(x=>x>=0).length;
const hasCode=(p:ReturnType<typeof createPattern>,code:string)=>p.palette.includes(flossIndex(code));

describe("Moteur sujets POINTZERO · scène multi-sujets",()=>{
  it("détecte trois sujets et conserve le fond et les petits accents sans perte",()=>{
    const source=multiSubjectDemo(),old=source.cross.slice();
    const analysis=detectSubjects(source,10);
    expect(analysis.detected).toBe(3);
    expect(analysis.residual).toBeGreaterThanOrEqual(2);
    const recomposed=recomposeSubjects(analysis.scene);
    expect(recomposed.cross).toEqual(source.cross);
    expect(occupied(recomposed)).toBe(occupied(source));
    expect(recomposed.w).toBe(120);expect(recomposed.h).toBe(75);
    expect(recomposed.provenance).toEqual(source.provenance);
    expect(source.cross).toEqual(old);
  });
  it("part de pixels RGBA multi-sujets, convertit en DMC et extrait 3 composants",()=>{
    const sample=multiSubjectDemo();
    const pixels=new Uint8ClampedArray(sample.w*sample.h*4);
    for(let i=0;i<sample.cross.length;i++){
      const color=FLOSS[sample.cross[i]]?.rgb??[255,255,255];
      pixels.set([...color,255],i*4);
    }
    const converted=quantizePixels(pixels,sample.w,sample.h,{maxColors:36,dropWhite:true,confetti:false});
    const imported=createPattern("Image RGBA importée",sample.w,sample.h);
    imported.cross=converted.cross;imported.palette=converted.palette;
    const found=detectSubjects(imported);
    expect(found.detected).toBe(3);
    expect(recomposeSubjects(found.scene).cross).toEqual(imported.cross);
  });
  it("les drapeaux de progression sont conservés dans les sprites recomposés",()=>{
    const source=multiSubjectDemo();
    const index=43*source.w+24;
    source.done[index]=1;
    const scene=detectSubjects(source).scene;
    const reassembled=recomposeSubjects(scene);
    expect(reassembled.done[index]).toBe(1);
  });
  it("déplacement réellement recomposé : efface ancienne position et pose la nouvelle",()=>{
    const source=multiSubjectDemo(),scene=detectSubjects(source).scene;
    const bird=scene.layers.find(x=>x.x<45)!;
    const original=recomposeSubjects(scene);
    const moved=changeSubject(scene,bird.id,{x:bird.x+6,y:bird.y-4});
    const result=recomposeSubjects(moved);
    expect(result.cross).not.toEqual(original.cross);
    expect(scene.layers.find(x=>x.id===bird.id)?.x).toBe(bird.x);
    const reset=changeSubject(moved,bird.id,{x:bird.x,y:bird.y});
    expect(recomposeSubjects(reset).cross).toEqual(original.cross);
  });
  it("masquer, dupliquer et réordonner n'altèrent jamais l'original",()=>{
    const scene=detectSubjects(multiSubjectDemo()).scene;
    const id=scene.layers[0].id;
    const initial=recomposeSubjects(scene);
    const hidden=recomposeSubjects(changeSubject(scene,id,{visible:false}));
    expect(occupied(hidden)).toBeLessThan(occupied(initial));
    expect(duplicateSubject(scene,id).layers).toHaveLength(4);
    const reordered=reorderSubject(scene,id,1);
    expect(reordered.layers[1].id).toBe(id);
    expect(recomposeSubjects(scene).cross).toEqual(initial.cross);
  });
  it("fusionner deux sujets produit un composant autonome sans perdre leurs couleurs",()=>{
    const original=detectSubjects(multiSubjectDemo()).scene;
    const a=original.layers[0],b=original.layers[1];
    const merged=mergeSubjects(original,a.id,b.id);
    expect(merged.layers).toHaveLength(2);
    expect(recomposeSubjects(merged).cross).toEqual(recomposeSubjects(original).cross);
  });
  it("séparer une zone conserve les deux parties et les données brodables",()=>{
    const scene=detectSubjects(multiSubjectDemo()).scene;
    const chosen=scene.layers.find(l=>l.x<45)!;
    const sprite=fromObject(JSON.parse(chosen.sprite))!;
    const rect={x:0,y:0,w:Math.floor(sprite.w*.55),h:sprite.h};
    const split=splitSubject(scene,chosen.id,rect);
    expect(split.layers).toHaveLength(4);
    expect(recomposeSubjects(split).cross).toEqual(recomposeSubjects(scene).cross);
  });
  it("le recalcul par rectangle modifié est identique à une recomposition intégrale",()=>{
    const source=multiSubjectDemo(),scene=detectSubjects(source).scene;
    const original=recomposeSubjects(scene),bird=scene.layers[0];
    const changed=changeSubject(scene,bird.id,{x:bird.x+5,y:bird.y-3,tint:"321"});
    const dirty=affectedBounds(bird,changed.layers[0]);
    const incremental=recomposeSubjects(changed,original,dirty);
    const full=recomposeSubjects(changed);
    expect(incremental.cross).toEqual(full.cross);
    expect(incremental.fwd).toEqual(full.fwd);
    expect(incremental.bwd).toEqual(full.bwd);
    expect(incremental.q).toEqual(full.q);
    expect(incremental.back).toEqual(full.back);
    expect(incremental.palette.slice().sort((a,b)=>a-b)).toEqual(full.palette.slice().sort((a,b)=>a-b));
    const reset=changeSubject(changed,bird.id,{x:bird.x,y:bird.y,tint:undefined});
    const restored=recomposeSubjects(reset,incremental,affectedBounds(changed.layers[0],bird));
    expect(restored.cross).toEqual(original.cross);
  });
  it("cacher un sujet par recomposition locale restitue exactement le fond",()=>{
    const scene=detectSubjects(multiSubjectDemo()).scene,prev=recomposeSubjects(scene);
    const old=scene.layers[1],changed=changeSubject(scene,old.id,{visible:false});
    const part=recomposeSubjects(changed,prev,affectedBounds(old,changed.layers[1]));
    const full=recomposeSubjects(changed);
    expect(part.cross).toEqual(full.cross);
    expect(part.back).toEqual(full.back);
  });
  it("supporte les teintes DMC dans un sujet isolé",()=>{
    const scene=detectSubjects(multiSubjectDemo()).scene;
    const recolored=changeSubject(scene,scene.layers[0].id,{tint:"321"});
    const result=recomposeSubjects(recolored);
    expect(occupied(result)).toBe(occupied(recomposeSubjects(scene)));
    expect(result.palette.length).toBeGreaterThan(0);
  });
  it("réutilise un sprite externe dans une autre scène sans modifier les codes DMC de la source",()=>{
    const scene=detectSubjects(multiSubjectDemo()).scene;
    const component=spriteForExport(scene.layers[0]);
    const other=createPattern("Composition",120,75);
    const blank=detectSubjects(other).scene;
    const added=attachSubject(blank,component,20,20);
    expect(added.layers).toHaveLength(1);
    const result=recomposeSubjects(added);
    expect(occupied(result)).toBeGreaterThan(50);
    expect(result.palette.every(i=>i>=0)).toBe(true);
  });
  it("réimporte le projet JSON natif avec tous les sujets éditables",()=>{
    const scene=detectSubjects(multiSubjectDemo()).scene;
    const result=recomposeSubjects(scene);
    const json=toObject(result);
    const restored=fromObject(json)!;
    const opened=sceneFromPattern(restored);
    expect(opened?.layers).toHaveLength(3);
    expect(recomposeSubjects(opened!).cross).toEqual(result.cross);
    expect(fromObject(JSON.parse(opened!.source))?.subjectScene).toBeUndefined();
    expect(hasCode(restored,"310")).toBe(true);
  });
  it("les fractions et points arrière existants se déplacent avec leur objet",()=>{
    const source=createPattern("Fraction",40,30),red=flossIndex("321");
    for(let y=7;y<15;y++)for(let x=7;x<17;x++)source.cross[y*40+x]=red;
    for(let y=7;y<15;y++)for(let x=27;x<36;x++)source.cross[y*40+x]=red;
    source.fwd[10*40+10]=red;source.q[0][11*40+11]=red;
    source.back.push({x1:9,y1:9,x2:12,y2:9,c:red});
    ensurePalette(source,red);
    const scene=detectSubjects(source).scene;
    expect(scene.layers).toHaveLength(2);
    const original=recomposeSubjects(scene);
    expect(original.fwd).toEqual(source.fwd);
    expect(original.q[0]).toEqual(source.q[0]);
    expect(original.back).toEqual(source.back);
    const changed=changeSubject(scene,scene.layers[0].id,{x:scene.layers[0].x+3});
    const moved=recomposeSubjects(changed);
    expect(moved.fwd).not.toEqual(original.fwd);
    expect(moved.q[0]).not.toEqual(original.q[0]);
    expect(moved.back).not.toEqual(original.back);
  });
  it("produit un PDF natif sur la scène composée sans moteur d'export secondaire",async()=>{
    const output=recomposeSubjects(detectSubjects(multiSubjectDemo()).scene);
    const pdf=await buildPdf(output,{bw:false,paper:"a4"});
    expect(pdf.type).toBe("application/pdf");
    expect(pdf.size).toBeGreaterThan(5000);
    expect(output.subjectScene?.layers).toHaveLength(3);
  });
  it("refuse un projet hors limites sans altérer l'existant",()=>{
    const p=multiSubjectDemo(),before=p.cross.slice(),scene=detectSubjects(p).scene;
    const one=changeSubject(scene,scene.layers[0].id,{x:-1000});
    const out=recomposeSubjects(one);
    expect(out.subjectScene?.warnings.join(" ")).toContain("hors de la grille");
    expect(p.cross).toEqual(before);
  });
});
