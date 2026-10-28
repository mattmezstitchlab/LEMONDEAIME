import { describe, expect, it } from "vitest";
import { avecBase, entryStudio, isStudioRoute, sansBase } from "../lib/entryNavigation";

describe("POINTZERO — navigation publique non destructive",()=>{
 it("affiche le studio point de croix à la racine, et conserve AIME explicitement",()=>{
  expect(entryStudio("","")).toBe("stitch-home");
  expect(entryStudio("?utm_source=share","")).toBe("stitch-home");
  expect(entryStudio("","","/aime")).toBe("aime-home");
  expect(entryStudio("?studio=aime-home","")).toBe("aime-home");
  expect(entryStudio("?page=manifest","")).toBe("manifest");
  expect(entryStudio("","","/pointzero")).toBe("manifest");
  expect(entryStudio("","","/atelier")).toBe("embroidery");
  expect(entryStudio("?studio=design","","/atelier")).toBe("design");
  expect(entryStudio("","","/le-monde-aime")).toBe("aime-landing");
  expect(entryStudio("","","/univers")).toBe("universe-index");
  expect(entryStudio("","","/univers/mariage")).toBe("universe-detail");
  expect(entryStudio("","","/studios/game")).toBe("studio-detail");
  expect(entryStudio("","","/vision")).toBe("vision");
 });
 it("préserve les liens directs historiques et l'Atelier",()=>{
  expect(entryStudio("?site=le-monde-aime","")).toBe("aime-landing");
  expect(entryStudio("?page=atelier","")).toBe("design");
  expect(entryStudio("","#atelier")).toBe("design");
  expect(entryStudio("?studio=embroidery","")).toBe("embroidery");
  expect(entryStudio("?studio=mini-site","")).toBe("mini-site");
  expect(entryStudio("?studio=academy","")).toBe("academy");
  expect(entryStudio("?studio=ripplecircle","")).toBe("ripplecircle");
 });
 it("ne permet pas une navigation par route non reconnue ou par accès direct à l'administration du manifeste",()=>{
  expect(entryStudio("?studio=not-a-real-studio","")).toBe("stitch-home");
  expect(entryStudio("?studio=manifest-admin","")).toBe("stitch-home");
  expect(isStudioRoute("not-a-real-studio")).toBe(false);
 });
});
describe("AIME — le studio servi sous /studio/",()=>{
 it("lit les adresses sous la base comme à la racine, et y ramène les liens internes",()=>{
  expect(sansBase("/studio","/studio")).toBe("/");
  expect(sansBase("/studio/atelier","/studio")).toBe("/atelier");
  expect(sansBase("/studios/game","/studio")).toBe("/studios/game");
  expect(avecBase("/atelier?studio=design","/studio")).toBe("/studio/atelier?studio=design");
  expect(avecBase("/studio/buro","/studio")).toBe("/studio/buro");
  expect(avecBase("https://ailleurs.fr/x","/studio")).toBe("https://ailleurs.fr/x");
  expect(avecBase("/atelier","")).toBe("/atelier");
 });
});
