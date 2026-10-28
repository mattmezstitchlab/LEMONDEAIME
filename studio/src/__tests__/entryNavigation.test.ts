import { describe, expect, it } from "vitest";
import { avecBase, entryStudio, isStudioRoute, publicPathFor, sansBase, STUDIO_ROUTES } from "../lib/entryNavigation";

describe("Studio de broderie — navigation",()=>{
 it("trois écrans, chacun à son adresse",()=>{
  expect([...STUDIO_ROUTES]).toEqual(["stitch-home","embroidery","buro"]);
  expect(entryStudio("","")).toBe("stitch-home");
  expect(entryStudio("?utm_source=share","")).toBe("stitch-home");
  expect(entryStudio("","","/atelier")).toBe("embroidery");
  expect(entryStudio("?ouvrage=abc","","/atelier")).toBe("embroidery");
  expect(entryStudio("","","/boutique")).toBe("stitch-home"); // les éditions sont retirées
  expect(entryStudio("","","/buro")).toBe("buro");
  for(const r of STUDIO_ROUTES)expect(entryStudio("","",publicPathFor(r))).toBe(r);
 });
 it("les anciens liens mènent à l'atelier ou à l'accueil",()=>{
  expect(entryStudio("?studio=embroidery","")).toBe("embroidery");
  expect(entryStudio("?page=atelier","")).toBe("embroidery");
  expect(entryStudio("","#atelier")).toBe("embroidery");
  for(const vieux of ["/aime","/pointzero","/le-monde-aime","/vision","/dossier","/espace","/univers","/univers/mariage","/studios/game"])
   expect(entryStudio("","",vieux)).toBe("stitch-home");
  for(const vieux of ["design","mini-site","academy","manifest-admin","not-a-real-studio"]){
   expect(entryStudio("?studio="+vieux,"")).toBe("stitch-home");
   expect(entryStudio("?studio="+vieux,"","/atelier")).toBe("embroidery");
  }
  expect(isStudioRoute("design")).toBe(false);
 });
});
describe("AIME — le studio servi sous /studio/",()=>{
 it("lit les adresses sous la base comme à la racine, et y ramène les liens internes",()=>{
  expect(sansBase("/studio","/studio")).toBe("/");
  expect(sansBase("/studio/atelier","/studio")).toBe("/atelier");
  expect(avecBase("/atelier","/studio")).toBe("/studio/atelier");
  expect(avecBase("/studio/buro","/studio")).toBe("/studio/buro");
  expect(avecBase("https://ailleurs.fr/x","/studio")).toBe("https://ailleurs.fr/x");
  expect(avecBase("/atelier","")).toBe("/atelier");
 });
});
