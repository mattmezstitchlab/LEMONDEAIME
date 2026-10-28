import { describe, expect, it } from "vitest";
import { createAdminDocument, docKinds, docToHTML, documentTotals, duplicateAsInvoice, safeAdminStore } from "../lib/adminCore";

describe("POINTZERO Admin — documents A4 et montants",()=>{
  it("propose cinq modèles administratifs sans identité imposée",()=>{
    expect(docKinds.map(x=>x.id)).toEqual(["devis","facture","contrat","attestation","courrier"]);
    const doc=createAdminDocument("devis","prj-12");
    expect(doc.projectId).toBe("prj-12");
    expect(doc.issuer).toBe("");
    expect(doc.state).toBe("brouillon");
    expect(safeAdminStore({version:1,documents:[doc]})).not.toBeNull();
  });
  it("calcule sous-total, TVA et montant final en centimes",()=>{
    const doc=createAdminDocument("devis");
    doc.items=[{id:"a",title:"Shooting",quantity:2,unitCents:12555},{id:"b",title:"Photo",quantity:1,unitCents:3900}];
    doc.vatRate=20;
    const result=documentTotals(doc);
    expect(result).toEqual({subtotal:29010,vat:5802,total:34812});
  });
  it("convertit un devis en facture brouillon sans modifier la source",()=>{
    const quote=createAdminDocument("devis","a");
    quote.recipient="Client";
    quote.items=[{id:"a",title:"Création",quantity:1,unitCents:25000}];
    const invoice=duplicateAsInvoice(quote);
    expect(invoice.kind).toBe("facture");
    expect(invoice.state).toBe("brouillon");
    expect(invoice.sourceId).toBe(quote.id);
    expect(invoice.recipient).toBe("Client");
    expect(invoice.items[0].id).not.toBe(quote.items[0].id);
    expect(quote.kind).toBe("devis");
  });
  it("génère un HTML A4 échappé, sans exécuter le texte de l’utilisateur",()=>{
    const doc=createAdminDocument("courrier");
    doc.subject='<script>alert("bad")</script>';
    doc.body='<img src=x onerror=alert(1)> & utile';
    const html=docToHTML(doc);
    expect(html).toContain("@page{size:A4");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&amp; utile");
  });
  it("rejette les faux montants, taxes et types",()=>{
    const d=createAdminDocument("facture");
    expect(safeAdminStore({version:1,documents:[{...d,vatRate:100}]})).toBeNull();
    expect(safeAdminStore({version:1,documents:[{...d,kind:"virus"}]})).toBeNull();
    expect(safeAdminStore({version:1,documents:[{...d,items:[{id:"x",title:"x",quantity:-1,unitCents:10}]}]})).toBeNull();
  });
});
