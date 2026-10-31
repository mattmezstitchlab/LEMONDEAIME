/**
 * La séquence historique, en ouverture de l'édition : des indiennes et des teintures anciennes jusqu'au fil DMC.
 * Tout est rendu en broderie par la conversion du studio, et une loupe voit à travers : la grille, les symboles, le fil.
 * Deux étoffes sont de vraies pièces de musée (The Met, domaine public) ; les autres images sont des reconstitutions générées,
 * annoncées comme telles. Les faits sont sourcés en bas de la séquence.
 */
import { useState, type ReactNode } from "react";
import { BookOpen, Compass, FileText, FileUp, Folder, Image as ImageIcon, Palette, PenLine, Search, Sparkles, FileJson } from "lucide-react";
import type { ModePoint } from "../../lib/point/modes";
import { FLOSS } from "../../lib/dmc";
import Brode, { type Broderie } from "./Brode";
import { adresse, useContenus } from "./contenus";
import { Riche, TitreEt } from "./Riche";

export const CHAPITRES_HISTOIRE = [
  { id: "hi-origine", num: "01", titre: "L’origine" },
  { id: "hi-indiennes", num: "02", titre: "Les indiennes" },
  { id: "hi-mulhouse", num: "03", titre: "Mulhouse, 1746" },
  { id: "hi-brodeuses", num: "04", titre: "Les brodeuses" },
] as const;

export interface ActionsHistoire {
  ouvrir: (entree: "create" | "library" | "stitch") => void;
  visite: () => void;
  choisirFichier: (accept: string) => void;
  aller: (id: string) => void;
}

/* le fil le plus présent d'une teinte (rouge, bleu) dans une broderie : dit honnêtement « proche, à l'écran » */
function dominant(b: Broderie, teinte: "rouge" | "bleu") {
  const ok = (hex: string) => { const n = parseInt(hex.slice(1), 16), r = n >> 16 & 255, g = n >> 8 & 255, bl = n & 255;
    return teinte === "rouge" ? r > g + 25 && r > bl + 15 : bl > r + 25 && bl >= g; };
  return b.palette.find(f => ok(FLOSS[f].hex)) ?? null;
}
function Fil({ idx, nom, texte }: { idx: number | null; nom: string; texte: ReactNode }) {
  const f = idx === null ? null : FLOSS[idx];
  return <div className="hi-fil">
    <span className="hi-fil-pastille" style={{ background: f?.hex ?? "#ccc" }} aria-hidden="true" />
    <div><p className="hi-fil-nom">{nom}</p><p className="hi-fil-texte">{texte}</p>
      {f && <p className="hi-fil-dmc">À l’écran, proche de <b>DMC {f.code}</b> ({f.name}) — indicatif</p>}</div>
  </div>;
}

export default function Histoire({ actions, Disque, entre = {}, objet }: { entre?: Record<string, ReactNode>; objet?: ReactNode; actions: ActionsHistoire; Disque: (p: { contexte: string; modes: ModePoint[]; etiquette: string; max?: number }) => ReactNode }) {
  const C = useContenus().histoire;
  const [loupe, setLoupe] = useState(0);
  const [rouge, setRouge] = useState<number | null>(null), [bleu, setBleu] = useState<number | null>(null);
  const modes: ModePoint[] = [
    { id: "histoire", nom: "Histoire", icone: <BookOpen aria-hidden="true" />, aide: "les indiennes, Mulhouse, les brodeuses", groupe: "socle", ouvrir: () => {}, enfants: () => [
      { id: "hi-2", nom: "Les indiennes", icone: <BookOpen aria-hidden="true" />, aide: "des étoffes venues d’Inde", groupe: "socle", ouvrir: () => actions.aller("hi-indiennes") },
      { id: "hi-3", nom: "Mulhouse, 1746", icone: <BookOpen aria-hidden="true" />, aide: "une manufacture, un nouveau chapitre", groupe: "socle", ouvrir: () => actions.aller("hi-mulhouse") },
      { id: "hi-4", nom: "Les brodeuses", icone: <BookOpen aria-hidden="true" />, aide: "des gestes transmis", groupe: "socle", ouvrir: () => actions.aller("hi-brodeuses") },
    ] },
    { id: "loupe", nom: "Loupe", icone: <Search aria-hidden="true" />, aide: "voir à travers la broderie : la grille, les symboles, le fil", groupe: "socle", ouvrir: () => setLoupe(n => n + 1) },
    { id: "nuancier", nom: "Nuancier", icone: <Palette aria-hidden="true" />, aide: "les 489 fils DMC, plus bas", groupe: "metier", ouvrir: () => actions.aller("ed-fils") },
    { id: "creer", nom: "Créer", icone: <PenLine aria-hidden="true" />, aide: "un nouveau motif, une rosace, une image", groupe: "metier", ouvrir: () => {}, enfants: () => [
      { id: "creer-motif", nom: "Nouveau motif", icone: <PenLine aria-hidden="true" />, aide: "ouvrir l’atelier sur une grille vierge", groupe: "metier", ouvrir: () => actions.ouvrir("create") },
      { id: "creer-rosace", nom: "Une rosace", icone: <Sparkles aria-hidden="true" />, aide: "le compositeur, plus bas", groupe: "metier", ouvrir: () => actions.aller("ed-rosace") },
      { id: "creer-image", nom: "Depuis une image", icone: <ImageIcon aria-hidden="true" />, aide: "une photo convertie en fils DMC", groupe: "metier", ouvrir: () => actions.choisirFichier("image/png,image/jpeg,image/webp") },
    ] },
    { id: "importer", nom: "Importer", icone: <FileUp aria-hidden="true" />, aide: "une image, un patron PDF, un projet", groupe: "creation", ouvrir: () => {}, enfants: () => [
      { id: "imp-image", nom: "Image", icone: <ImageIcon aria-hidden="true" />, aide: "PNG, JPEG, WebP", groupe: "creation", ouvrir: () => actions.choisirFichier("image/png,image/jpeg,image/webp") },
      { id: "imp-pdf", nom: "Patron PDF", icone: <FileText aria-hidden="true" />, aide: "un patron sur plusieurs pages, recomposé", groupe: "creation", ouvrir: () => actions.choisirFichier(".pdf,application/pdf") },
      { id: "imp-projet", nom: "Projet", icone: <FileJson aria-hidden="true" />, aide: "une sauvegarde JSON ou un fichier OXS", groupe: "creation", ouvrir: () => actions.choisirFichier(".json,.oxs,application/json") },
    ] },
    { id: "ouvrages", nom: "Mes ouvrages", icone: <Folder aria-hidden="true" />, aide: "les ouvrages rangés sur cet appareil", groupe: "creation", ouvrir: () => actions.ouvrir("library") },
    { id: "guide", nom: "Guide", icone: <Compass aria-hidden="true" />, aide: "la visite de l’atelier avec le Point", groupe: "socle", ouvrir: actions.visite },
  ];

  return <div className="hi">
    <section id="hi-origine" className="ed-scene hi-scene hi-sombre" aria-labelledby="hi-origine-titre">
      <div className="ed-plateau hi-plateau">
        <Brode src={adresse(C.origine.media.src)} cols={84} maxFils={16} loupeDemandee={loupe} alt={C.origine.media.alt} legende={C.origine.media.legende} cadrage={C.origine.media.cadrage} />
        <div className="hi-texte">
          <p className="ed-num">{C.origine.kicker}</p>
          <h2 id="hi-origine-titre" tabIndex={-1}><TitreEt t={C.origine.titre} /></h2>
          <p className="hi-sous">{C.origine.sous}</p>
          <p className="hi-corps"><Riche t={C.origine.corps} /></p>
          <p className="hi-geste">{C.origine.geste}</p>
        </div>
        <div className="hi-disque"><Disque contexte="edition-histoire" modes={modes} etiquette="Le Point de Point Zéro : l’histoire, la loupe, le nuancier, l’atelier" max={1} /></div>
      </div>
    </section>
    {entre["hi-origine"]}

    <section id="hi-indiennes" className="ed-scene hi-scene hi-sombre" aria-labelledby="hi-indiennes-titre">
      <div className="ed-plateau hi-plateau hi-deux">
        <div className="hi-moitie hi-moitie-rouge">
          <Brode src={adresse(C.indiennes.rouge.media.src)} cols={84} maxFils={18} surFils={b => setRouge(dominant(b, "rouge"))} alt={C.indiennes.rouge.media.alt} legende={C.indiennes.rouge.media.legende} cadrage={C.indiennes.rouge.media.cadrage} />
          <Fil idx={rouge} nom={C.indiennes.rouge.nom} texte={<Riche t={C.indiennes.rouge.texte} />} />
        </div>
        <div className="hi-moitie hi-moitie-bleue">
          <Brode src={adresse(C.indiennes.bleu.media.src)} cols={56} maxFils={10} surFils={b => setBleu(dominant(b, "bleu"))} alt={C.indiennes.bleu.media.alt} legende={C.indiennes.bleu.media.legende} cadrage={C.indiennes.bleu.media.cadrage} />
          <Fil idx={bleu} nom={C.indiennes.bleu.nom} texte={<Riche t={C.indiennes.bleu.texte} />} />
        </div>
        <div className="hi-texte">
          <p className="ed-num">{C.indiennes.kicker}</p>
          <h2 id="hi-indiennes-titre" tabIndex={-1}><TitreEt t={C.indiennes.titre} /></h2>
          <p className="hi-sous">{C.indiennes.sous}</p>
          <p className="hi-corps"><Riche t={C.indiennes.corps} /></p>
        </div>
      </div>
    </section>
    {entre["hi-indiennes"]}

    <section id="hi-mulhouse" className="ed-scene hi-scene hi-sombre" aria-labelledby="hi-mulhouse-titre">
      <div className="ed-plateau hi-plateau">
        <Brode src={adresse(C.mulhouse.media.src)} cols={150} maxFils={16} alt={C.mulhouse.media.alt} legende={C.mulhouse.media.legende} cadrage={C.mulhouse.media.cadrage} />
        <div className="hi-texte">
          <p className="ed-num">{C.mulhouse.kicker}</p>
          <h2 id="hi-mulhouse-titre" tabIndex={-1}><TitreEt t={C.mulhouse.titre} /></h2>
          <p className="hi-sous">{C.mulhouse.sous}</p>
          <p className="hi-corps"><Riche t={C.mulhouse.corps} /></p>
        </div>
        <p className="hi-aparte" aria-hidden="true">{C.mulhouse.aparte[0]}<br />{C.mulhouse.aparte[1]}</p>
      </div>
    </section>
    {entre["hi-mulhouse"]}

    <section id="hi-brodeuses" className="ed-scene hi-scene hi-sombre" aria-labelledby="hi-brodeuses-titre">
      <div className="ed-plateau hi-plateau">
        <Brode src={adresse(C.brodeuses.media.src)} cols={120} maxFils={18} alt={C.brodeuses.media.alt} legende={C.brodeuses.media.legende} cadrage={C.brodeuses.media.cadrage} />
        <div className="hi-texte">
          <p className="ed-num">{C.brodeuses.kicker}</p>
          <h2 id="hi-brodeuses-titre" tabIndex={-1}><TitreEt t={C.brodeuses.titre} /></h2>
          <p className="hi-sous">{C.brodeuses.sous}</p>
          <p className="hi-corps"><Riche t={C.brodeuses.corps} /></p>
        </div>
        {objet}
      </div>
    </section>
    {entre["hi-brodeuses"]}
    <details className="hi-sources">
      <summary>{C.sources.titre}</summary>
      <ul>
        {C.sources.liens.map(l => <li key={l.url}><a href={l.url} target="_blank" rel="noreferrer">{l.libelle}</a></li>)}
      </ul>
    </details>
  </div>;
}
