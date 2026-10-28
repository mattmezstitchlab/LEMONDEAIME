import { describe, expect, it } from "vitest";
import { blankSession, hoursFor, makeProgramme, programmeToHTML, programmeToICS, programmesToCSV, repeatNextWeek, safeProgrammeStore, sortedSessions } from "../lib/programmeCore";

describe("POINTZERO Programme — séances et parcours",()=>{
  it("organise un programme de formation avec des séances et des durées",()=>{
    const p=makeProgramme("Initiation","formation","prj-1");
    const first={...blankSession(),date:"2026-10-20",minutes:90,start:"09:00",title:"Les bases"};
    const second={...blankSession(),date:"2026-10-13",minutes:120,title:"Accueil"};
    const cancelled={...blankSession(),date:"2026-10-27",minutes:120,status:"annulée" as const};
    p.sessions=[first,second,cancelled];
    expect(hoursFor(p)).toBe(3.5);
    expect(sortedSessions(p)[0].title).toBe("Accueil");
    expect(safeProgrammeStore({version:1,programmes:[p]})).not.toBeNull();
  });
  it("duplique une séance exactement sept jours plus tard en préservant l’heure",()=>{
    const base={...blankSession(),title:"Atelier répétitif",date:"2026-10-30",start:"14:30",status:"réalisée" as const};
    const copy=repeatNextWeek(base);
    expect(copy.date).toBe("2026-11-06");
    expect(copy.start).toBe("14:30");
    expect(copy.id).not.toBe(base.id);
    expect(copy.status).toBe("prévue");
  });
  it("exporte un calendrier et un programme A4 sans interpréter du HTML libre",()=>{
    const p=makeProgramme("<script>bad()</script>","cours");
    p.sessions=[{...blankSession(),date:"2026-10-20",start:"09:00",title:"Théorie, pratique",objective:"Un; deux\nTrois",description:"<iframe>non</iframe>"}];
    const html=programmeToHTML(p);
    expect(html).toContain("@page{size:A4");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<iframe>");
    const ics=programmeToICS(p);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("SUMMARY:Théorie\\, pratique");
    expect(ics).toContain("Un\\; deux\\nTrois");
    expect(programmesToCSV(p)).toContain('"Théorie, pratique"');
  });
  it("refuse les durées invalides et une bibliothèque trop grande",()=>{
    const p=makeProgramme();
    p.sessions=[{...blankSession(),minutes:0}];
    expect(safeProgrammeStore({version:1,programmes:[p]})).toBeNull();
    p.sessions=[{...blankSession(),minutes:75}];
    expect(safeProgrammeStore({version:1,programmes:[p]})).not.toBeNull();
  });
});
