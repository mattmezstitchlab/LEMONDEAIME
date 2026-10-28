import {beforeEach,describe,it,expect} from "vitest";
import {detectSubjects, spriteForExport} from "../lib/subjectEngine";
import {multiSubjectDemo} from "../lib/subjectDemo";
import {deleteLibrarySubject,loadSubjectLibrary,openLibrarySubject,storeSubject} from "../lib/subjectLibrary";
import {FLOSS} from "../lib/dmc";

beforeEach(()=>localStorage.removeItem("pointzero:components:v1"));

describe("Bibliothèque privée de composants brodables",()=>{
  it("enregistre un sujet natif réutilisable, sans publier ni perdre ses fils",()=>{
    const extracted=detectSubjects(multiSubjectDemo()).scene.layers[0];
    const original=spriteForExport(extracted);
    const list=storeSubject(original);
    expect(list).toHaveLength(1);
    expect(list[0].personalOnly).toBe(true);
    const restored=openLibrarySubject(loadSubjectLibrary()[0]);
    expect(restored.w).toBe(original.w);
    expect(restored.h).toBe(original.h);
    expect(restored.cross).toEqual(original.cross);
    expect(restored.palette.map(c=>FLOSS[c].code)).toEqual(original.palette.map(c=>FLOSS[c].code));
    expect(restored.provenance?.personalOnly).toBe(true);
  });
  it("la suppression ne touche pas le patron source d'origine",()=>{
    const base=multiSubjectDemo(),copy=base.cross.slice();
    const subject=spriteForExport(detectSubjects(base).scene.layers[0]);
    const items=storeSubject(subject);
    expect(deleteLibrarySubject(items[0].id)).toHaveLength(0);
    expect(loadSubjectLibrary()).toHaveLength(0);
    expect(base.cross).toEqual(copy);
  });
  it("n'exécute pas du contenu JSON malformé",()=>{
    localStorage.setItem("pointzero:components:v1",JSON.stringify([{name:"strange",id:"a",updated:1,sprite:{},personalOnly:true}]));
    expect(loadSubjectLibrary()).toEqual([]);
  });
});
