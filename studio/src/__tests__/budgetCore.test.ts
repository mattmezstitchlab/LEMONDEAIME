import { describe, expect, it } from "vitest";
import { budgetReport, eurosToCents, loadProjectOptions, makeBudget, newId, safeBudget, transactionsToCSV, type BudgetEntry } from "../lib/budgetCore";

describe("POINTZERO Budget — calculs et données privées",()=>{
  it("convertit en centimes sans approximation en virgule flottante",()=>{
    expect(eurosToCents("1 234,56")).toBe(123456);
    expect(eurosToCents("4.20")).toBe(420);
    expect(eurosToCents(-1)).toBeNull();
    expect(eurosToCents("invalide")).toBeNull();
  });
  it("sépare projets et dépenses personnelles, et signale les plafonds dépassés",()=>{
    const data=makeBudget();
    const cat=data.categories.find(c=>c.scope==="personal"&&c.kind==="expense")!;
    cat.limitCents=1500;
    const tx:BudgetEntry={id:newId(),date:"2026-10-12",label:"Courses",cents:1800,kind:"expense",categoryId:cat.id,scope:"personal",projectId:"",note:""};
    const received=data.categories.find(c=>c.scope==="personal"&&c.kind==="income")!;
    data.entries=[tx,{...tx,id:newId(),label:"Salaire",kind:"income",categoryId:received.id,cents:6000}];
    const report=budgetReport(data,"2026-10","personal");
    expect(report.income).toBe(6000);
    expect(report.spent).toBe(1800);
    expect(report.net).toBe(4200);
    expect(report.available).toBe(-300);
    expect(report.over.map(c=>c.id)).toContain(cat.id);
    expect(budgetReport(data,"2026-09","personal").spent).toBe(0);
    expect(budgetReport(data,"2026-10","project","project-42").spent).toBe(0);
  });
  it("restitue les catégories et les transactions en JSON validé",()=>{
    const state=makeBudget();
    expect(safeBudget(JSON.parse(JSON.stringify(state)))).not.toBeNull();
    expect(safeBudget({...state,version:2})).toBeNull();
    expect(safeBudget({...state,categories:[{...state.categories[0],color:"url(javascript:evil)"}]})).toBeNull();
    const cat=state.categories[0];
    expect(safeBudget({...state,entries:[{id:"tx",date:"2026-10-20",label:"non liée",cents:123,kind:"income",categoryId:cat.id,scope:"project",projectId:"",note:""}]})).toBeNull();
  });
  it("échappe les virgules et les guillemets dans l’export CSV",()=>{
    const state=makeBudget(),cat=state.categories[0];
    const entries=[{id:newId(),date:"2026-10-14",label:'Tissu, "rose"',cents:1290,kind:cat.kind,categoryId:cat.id,scope:cat.scope,projectId:cat.projectId,note:""}];
    const csv=transactionsToCSV(entries,state.categories);
    expect(csv).toContain('"Tissu, ""rose"""');
    expect(csv).toContain('"12.90"');
  });
  it("récupère les projets de documents existants sans accéder au réseau",()=>{
    localStorage.setItem("pointzero:design-current:v1",JSON.stringify({id:"art-1",name:"Affiche pilote"}));
    expect(loadProjectOptions()).toEqual([{id:"art-1",name:"Affiche pilote"}]);
    localStorage.removeItem("pointzero:design-current:v1");
  });
});
