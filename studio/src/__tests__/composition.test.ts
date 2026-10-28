import { describe, expect, it } from "vitest";
import { FLOSS, flossIndex } from "../lib/dmc";
import { composePattern, compositionSource, initialSettings, segmentRegions, type Detail } from "../lib/composition";
import { buildPdf } from "../lib/pdf";
import { createPattern, ensurePalette, fromObject, toObject, type Pattern } from "../lib/pattern";

/** Original synthetic botanical bird, for tests (no third-party artwork). */
function bird(): Pattern {
  const p=createPattern("Oiseau botanique · essai",54,48,14,2);
  const codes=["310","434","435","436","437","739","738","703","704","701","700","907","934","798","799","801","742","743","744","321","815","3865"];
  codes.forEach(c=>ensurePalette(p,flossIndex(c)));
  const dot=(x:number,y:number,code:string)=>{
    if(x>=0&&y>=0&&x<p.w&&y<p.h)p.cross[y*p.w+x]=flossIndex(code);
  };
  const ellipse=(cx:number,cy:number,rx:number,ry:number,code:string)=>{
    for(let y=Math.floor(cy-ry);y<=cy+ry;y++)for(let x=Math.floor(cx-rx);x<=cx+rx;x++)
      if(((x-cx)/rx)**2+((y-cy)/ry)**2<=1)dot(x,y,code);
  };
  const line=(x0:number,y0:number,x1:number,y1:number,code:string)=>{
    const n=Math.ceil(Math.hypot(x1-x0,y1-y0)*2);
    for(let i=0;i<=n;i++)dot(Math.round(x0+(x1-x0)*i/n),Math.round(y0+(y1-y0)*i/n),code);
  };
  ellipse(25,25,15,11,"739");
  ellipse(25,24,13,9,"436");
  ellipse(25,25,10,8,"738");
  ellipse(32,16,8,8,"437");
  ellipse(33,14,5,6,"435");
  ellipse(34,16,2,2,"3865");
  dot(36,14,"310");dot(37,14,"310"); // eye
  dot(42,18,"742");dot(43,18,"743");dot(44,18,"744"); // beak
  ellipse(20,24,10,6,"701");ellipse(20,24,8,4,"700");ellipse(20,24,5,2,"934");
  for(let k=0;k<5;k++)line(15+k,22,11+k,34,"799"); // wing veins
  ellipse(12,33,7,2,"434");
  line(33,35,32,43,"801");line(31,43,38,43,"801");
  line(27,36,24,44,"801");line(7,43,47,43,"434"); // branch
  for(let j=0;j<6;j++){
    const x=10+j*7;
    ellipse(x,40-(j%2)*3,3,2,j%2?"703":"704");
    line(x,43,x,40-(j%2)*3,"701");
  }
  for(let i=0;i<8;i++)dot(6+i%4*3,14+Math.floor(i/4)*3,i%2?"321":"815");
  p.provenance={kind:"original",source:"Fixture synthétique",author:"POINTZERO",license:"Tests internes",personalOnly:false};
  return p;
}
const count=(p:Pattern)=>Array.from(p.cross).filter(v=>v>=0).length;

describe("Moteur de composition",()=>{
  it("produit trois résultats différents, sans supprimer l'oeil, le bec, les feuilles et l'aile",()=>{
    const src=bird(),original=src.cross.slice();
    const results=(["simple","equilibree","precise"] as Detail[]).map(detail=>
      composePattern(src,{...initialSettings(src),detail,difficulty:"expert"}));
    const palettes=results.map(r=>r.pattern.palette.map(i=>FLOSS[i].code).join(","));
    expect(new Set(palettes).size).toBe(3);
    for(const r of results){
      expect(r.coverage.lost).toBe(0);
      expect(r.coverage.result).toBe(count(src));
      for(const [x,y] of [[36,14],[42,18],[20,24],[10,40],[7,43]]) {
        expect(r.pattern.cross[y*src.w+x]).toBeGreaterThanOrEqual(0);
      }
      expect(r.pattern.provenance).toEqual(src.provenance);
    }
    expect(src.cross).toEqual(original);
  });
  it("l'ordre des cartes ne déplace pas les couches; les masquer est réversible",()=>{
    const src=bird(),cards=segmentRegions(src),settings=initialSettings(src);
    expect(cards.length).toBeGreaterThan(2);
    const a=composePattern(src,settings,cards);
    const b=composePattern(src,settings,[...cards].reverse());
    expect(a.pattern.cross).toEqual(b.pattern.cross);
    const hidden=composePattern(src,settings,cards.map((c,i)=>i===0?{...c,visible:false}:c));
    expect(count(hidden.pattern)).toBeLessThan(count(a.pattern));
    expect(src.cross).toEqual(bird().cross);
  });
  it("une substitution DMC s'applique à une région sans effacer l'original",()=>{
    const src=bird(),old=src.cross.slice(),cards=segmentRegions(src);
    const major=cards.find(c=>c.color>=0)!;
    const composed=composePattern(src,initialSettings(src),cards.map(c=>c.id===major.id?{...c,overrideCode:"310"}:c));
    expect(composed.pattern.composition?.cards.find(c=>c.id===major.id)?.overrideCode).toBe("310");
    expect(src.cross).toEqual(old);
  });
  it("la source et les réglages réapparaissent depuis le JSON",()=>{
    const src=bird();
    const chosen=composePattern(src,{...initialSettings(src),detail:"precise",difficulty:"expert"}).pattern;
    const loaded=fromObject(toObject(chosen));
    expect(loaded?.composition?.version).toBe(1);
    const original=compositionSource(loaded!);
    expect(original?.cross).toEqual(src.cross);
    const again=composePattern(original!,loaded!.composition!.settings,segmentRegions(original!));
    expect(again.pattern.cross).toEqual(chosen.cross);
    expect(again.pattern.back).toEqual(chosen.back);
  });
  it("le PDF est calculé depuis le Pattern composé",async()=>{
    const src=bird();
    const result=composePattern(src,{...initialSettings(src),detail:"precise",difficulty:"expert"});
    const blob=await buildPdf(result.pattern,{bw:false,paper:"a4"});
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(5000);
    expect(result.pattern.back.length).toBeGreaterThan(0);
  });
  it("refuse une demande dépassant les limites du moteur",()=>{
    const src=bird();
    expect(()=>composePattern(src,{...initialSettings(src),width:1000,height:1000})).toThrow(/250 000/);
  });
});
