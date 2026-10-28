import { describe, expect, it } from "vitest";
import { allowedFragmentUrl, demoFragments, readFragments, reorderFragments, updateFragment } from "../lib/fragmentGrid";

describe("AIME Métamorphose — grille universelle",()=>{
  it("importe des fragments sans toucher au schéma des points DMC",()=>{
    const collection=readFragments({fragments:[{id:"a",title:"Titre",sourceUrl:"https://exemple.fr/",image:"https://exemple.fr/image.png",kind:"section",span:2,crop:{x:10,y:90,zoom:175}}]});
    expect(collection?.fragments[0].span).toBe(2);
    expect(collection?.fragments[0].crop).toEqual({x:10,y:90,zoom:175});
    expect(collection?.fragments[0].sourceUrl).toBe("https://exemple.fr/");
  });
  it("protège les fragments verrouillés de toute édition ou permutation",()=>{
    let collection=demoFragments();
    const id=collection.fragments[0].id;
    collection={...collection,fragments:collection.fragments.map((f,i)=>i===0?{...f,locked:true}:f)};
    expect(updateFragment(collection,id,{span:4})).toEqual(collection);
    expect(reorderFragments(collection,id,collection.fragments[3].id)).toEqual(collection);
    expect(collection.fragments[0].title).toBe("RIPPLECIRCLE");
  });
  it("agrandit une case sans toucher à la source et peut réordonner",()=>{
    const first=demoFragments(),id=first.fragments[1].id;
    const enlarged=updateFragment(first,id,{span:3});
    expect(enlarged.fragments[1].span).toBe(3);
    expect(first.fragments[1].span).toBe(1);
    expect(enlarged.fragments[1].sourceUrl).toBe(first.fragments[1].sourceUrl);
    const moved=reorderFragments(enlarged,id,first.fragments[0].id);
    expect(moved.fragments[0].id).toBe(id);
  });
  it("rejette les destinations non HTTPS et limite les entrées importées",()=>{
    expect(allowedFragmentUrl("javascript:alert(1)")).toBe("");
    expect(allowedFragmentUrl("https://127.0.0.1/path")).toBe("");
    expect(allowedFragmentUrl("http://exemple.fr")).toBe("");
    expect(readFragments({fragments:Array.from({length:121},(_,i)=>({id:String(i)}))})).toBeNull();
  });
});