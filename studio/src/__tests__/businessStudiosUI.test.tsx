import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BudgetStudio from "../components/BudgetStudio";
import ProgrammeStudio from "../components/ProgrammeStudio";
import AdminStudio from "../components/AdminStudio";

let root:Root|null=null,host:HTMLDivElement|null=null;
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT:boolean }).IS_REACT_ACT_ENVIRONMENT=true;
beforeEach(()=>localStorage.clear());
afterEach(()=>{
  act(()=>root?.unmount());host?.remove();root=null;host=null;
  vi.restoreAllMocks();
  localStorage.clear();
});
function mount(component:React.ReactNode){
  host=document.createElement("div");document.body.appendChild(host);
  root=createRoot(host);
  act(()=>root!.render(component));
  return host;
}
function clickText(text:string){
  const button=Array.from(host?.querySelectorAll<HTMLButtonElement>("button")??[]).find(b=>b.textContent?.includes(text));
  expect(button,text).toBeTruthy();
  act(()=>button?.dispatchEvent(new MouseEvent("click",{bubbles:true})));
}
describe("POINTZERO — trois nouveaux studios",()=>{
  it("Budget affiche les espaces, les plafonds et le panneau d'opération",()=>{
    const h=mount(<BudgetStudio onBack={vi.fn()}/>);
    expect(h.querySelector('[aria-label="Espace Budget"]')).toBeTruthy();
    expect(h.querySelector('[aria-label="Espaces du budget"]')).toBeTruthy();
    expect(h.querySelector('[aria-label="Ajouter une opération"]')).toBeTruthy();
    expect(h.textContent).toContain("Budget personnel");
    expect(h.textContent).toContain("Catégories et plafonds");
    clickText("Catégorie");
    expect(h.querySelector('[aria-label="Nom de nouvelle catégorie"]')).toBeTruthy();
    clickText("Projet");
    expect(h.textContent).toContain("Budget projet");
  });
  it("Programme génère une séance éditable et affiche un support imprimable",()=>{
    const h=mount(<ProgrammeStudio onBack={vi.fn()}/>);
    clickText("Créer");
    expect(h.querySelector('[aria-label="Programme imprimable"]')).toBeTruthy();
    clickText("Ajouter une séance");
    expect(h.querySelector('[aria-label="Titre de séance"]')).toBeTruthy();
    expect(h.querySelector('[aria-label="Durée de séance"]')).toBeTruthy();
    expect(h.textContent).toContain("Nouvelle séance");
  });
  it("Admin ouvre un devis A4 et prépare une facture sans écraser le devis",()=>{
    vi.spyOn(window,"confirm").mockReturnValue(true);
    const h=mount(<AdminStudio onBack={vi.fn()}/>);
    clickText("Nouveau document");
    expect(h.querySelector('[aria-label="Aperçu A4 du document"]')).toBeTruthy();
    expect(h.querySelector('[aria-label="Taux de TVA"]')).toBeTruthy();
    clickText("Créer une facture brouillon");
    expect(h.textContent).toContain("Facture brouillon créée");
    const library=h.querySelector('[aria-label="Bibliothèque de documents"]');
    expect(library?.textContent).toContain("Devis");
    expect(library?.textContent).toContain("Facture");
    expect(h.querySelectorAll('button[aria-pressed="true"]').length).toBeGreaterThan(0);
  });
});
