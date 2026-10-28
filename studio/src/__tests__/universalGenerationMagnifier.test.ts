import { describe, expect, it } from "vitest";
import { createPattern } from "../lib/pattern";
import { stitchAt, clampFocus } from "../components/StitchMagnifier";
import { siteDraftFromPrompt } from "../components/GenerationStudio";
import { validDataImage } from "../lib/designStudio";
import { safeMiniSite, miniSiteToHTML } from "../lib/miniSiteCore";

describe("POINTZERO — génération et inspection visuelle",()=>{
  it("localise exactement le point inspecté et son fil DMC",()=>{
    const p=createPattern("Test",12,12);
    p.cross[3*12+5]=0;
    p.fwd[3*12+5]=0;
    p.q[0][3*12+5]=0;
    const v=stitchAt(p,{x:5,y:3});
    expect(v.x).toBe(5);expect(v.y).toBe(3);
    expect(v.cross).toBe(0);
    expect(v.forward).toBe(0);
    expect(v.quarters[0]).toBe(0);
    expect(v.color).toBeTruthy();
    expect(clampFocus(p,{x:-20,y:999})).toEqual({x:0,y:11});
  });
  it("crée une structure de mini-site à partir d'une intention sans altérer le modèle source",()=>{
    const doc=siteDraftFromPrompt("Un atelier floral moderne, élégant et local");
    expect(doc.kind).toBe("presentation");
    expect(doc.title).toBe("Un atelier floral moderne, élégant et local");
    expect(doc.sections.length).toBeGreaterThanOrEqual(3);
    expect(safeMiniSite(doc)).not.toBeNull();
    const html=miniSiteToHTML(doc);
    expect(html).toContain("Un atelier floral moderne");
    expect(html).not.toContain("<script");
  });
  it("rejette une illustration externe non encodée avant transmission aux studios",()=>{
    expect(validDataImage("https://image.pollinations.ai/prompt/test")).toBe(false);
    const doc=siteDraftFromPrompt("<script>bonjour</script>","https://outside.test/image.png");
    expect(doc.heroImage).toBe("");
    expect(miniSiteToHTML(doc)).toContain("&lt;script&gt;");
  });
});
