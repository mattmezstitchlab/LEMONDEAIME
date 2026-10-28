import {writeStoredJSON} from "../lib/storageSafety";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, Download, FileText, LockKeyhole, Search, ShoppingBag, X } from "lucide-react";
import { CATALOGUE, fabriquerPatron, type ProduitPatron, type ThemeMotif } from "../lib/catalogue";
import { FLOSS } from "../lib/dmc";
import { buildPdf, pdfFileName } from "../lib/pdf";
import { downloadBlob } from "../lib/io";
import { saveLibrary } from "../lib/library";
import type { Pattern } from "../lib/pattern";

const DEMO_KEY = "pointzero:shop-demo-unlocks:v1";
const euro = (cents: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cents / 100);
const THEMES: Array<"Tous" | ThemeMotif> = ["Tous", "Fleurs", "Animaux", "Maison", "Saisons", "Cadeaux"];

function demoUnlocks(): string[] {
  try {
    const item: unknown = JSON.parse(localStorage.getItem(DEMO_KEY) ?? "[]");
    return Array.isArray(item) ? item.filter((id): id is string => typeof id === "string" && CATALOGUE.some(p => p.id === id)) : [];
  } catch { return []; }
}

function Preview({ patron, large = false }: { patron: Pattern; large?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    const step = 6;
    el.width = patron.w * step;
    el.height = patron.h * step;
    ctx.fillStyle = "#fcfaf5";
    ctx.fillRect(0, 0, el.width, el.height);
    ctx.strokeStyle = "rgba(82, 66, 49, 0.07)";
    ctx.lineWidth = .35;
    for (let x = 0; x <= patron.w; x++) { ctx.beginPath(); ctx.moveTo(x * step, 0); ctx.lineTo(x * step, el.height); ctx.stroke(); }
    for (let y = 0; y <= patron.h; y++) { ctx.beginPath(); ctx.moveTo(0, y * step); ctx.lineTo(el.width, y * step); ctx.stroke(); }
    for (let y = 0; y < patron.h; y++) for (let x = 0; x < patron.w; x++) {
      const idx = patron.cross[y * patron.w + x];
      if (idx < 0) continue;
      ctx.strokeStyle = FLOSS[idx]?.hex ?? "#555";
      ctx.lineWidth = 1.65;
      ctx.lineCap = "round";
      const l = x * step, t = y * step;
      ctx.beginPath();
      ctx.moveTo(l + 1.2, t + 1.2); ctx.lineTo(l + step - 1.2, t + step - 1.2);
      ctx.moveTo(l + step - 1.2, t + 1.2); ctx.lineTo(l + 1.2, t + step - 1.2);
      ctx.stroke();
    }
  }, [patron]);
  return <canvas ref={canvas} className={"block aspect-square h-auto w-full object-contain " + (large ? "max-w-[390px]" : "")} aria-label={"Aperçu du vrai patron à broder « " + patron.name + " »"} />;
}

function ProductCard({ produit, unlocked, onChoose }: { produit: ProduitPatron; unlocked: boolean; onChoose: () => void }) {
  const patron = useMemo(() => fabriquerPatron(produit.id), [produit.id]);
  return (
    <button type="button" className="group overflow-hidden rounded-lg border border-black/10 bg-white text-left transition hover:border-black/30 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-[#6c55a7]" onClick={onChoose}>
      <div className="relative grid aspect-square place-items-center overflow-hidden bg-[#f8f5ee] p-4">
        <Preview patron={patron} />
        <span className="absolute left-3 top-3 rounded-md bg-white/90 px-2 py-1 text-[11px] font-medium text-[#2b2b2b]">{produit.theme}</span>
        {unlocked && <span className="absolute right-3 top-3 flex items-center gap-1 rounded-md bg-[#e9f7eb] px-2 py-1 text-[11px] font-medium text-[#205c35]"><Check size={12} /> Débloqué en démo</span>}
      </div>
      <div className="space-y-1.5 p-3">
        <p className="text-[15px] font-semibold text-[#161616]">{produit.titre}</p>
        <p className="min-h-8 text-xs leading-relaxed text-[#666]">{produit.sousTitre}</p>
        <div className="flex items-center justify-between gap-2 pt-1"><span className="font-semibold text-[#171717]">{euro(produit.prixCents)}</span><span className="text-xs text-[#555]">{produit.niveau}</span></div>
      </div>
    </button>
  );
}

export default function BoutiquePatrons({ onClose, onOpenPattern }: {
  onClose: () => void;
  onOpenPattern: (pattern: Pattern) => void;
}) {
  const [theme, setTheme] = useState<"Tous" | ThemeMotif>("Tous");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState<string[]>(demoUnlocks);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState("");
  const products = useMemo(() => CATALOGUE.filter(p =>
    (theme === "Tous" || theme === p.theme) &&
    (p.titre + " " + p.sousTitre + " " + p.theme).toLocaleLowerCase("fr").includes(query.toLocaleLowerCase("fr"))
  ), [theme, query]);
  const produit = CATALOGUE.find(p => p.id === selected) ?? null;
  const pattern = useMemo(() => produit ? fabriquerPatron(produit.id) : null, [produit?.id]);
  const allowed = produit !== null && unlocked.includes(produit.id);
  const openInAtelier = async () => {
    if (!pattern || !allowed) return;
    setWorking(true);
    try {
      await saveLibrary(pattern);
    } catch {
      // L'atelier utilise aussi la sauvegarde courante : ne pas cacher l'échec IndexedDB.
      setNotice("Le catalogue s’ouvre, mais l’enregistrement en bibliothèque a échoué sur cet appareil. Exportez le projet depuis l’atelier.");
    } finally { setWorking(false); }
    onOpenPattern(pattern);
  };
  const unlockDemo = async () => {
    if (!produit || allowed) return;
    // IMPORTANT : ce bouton n'est PAS un achat. Il n'encode aucune preuve de paiement.
    const next = [...unlocked, produit.id];
    try { writeStoredJSON(DEMO_KEY, JSON.stringify(next),v=>Array.isArray(v)&&v.every(x=>typeof x==="string")); }
    catch { setNotice("Stockage local indisponible : le déblocage de démonstration ne sera pas conservé."); }
    setUnlocked(next);
    setNotice("Patron débloqué pour l’essai, sans paiement. Ouvrez-le dans l’atelier ou exportez son PDF.");
  };
  const exportPdf = async (bw: boolean) => {
    if (!pattern || !allowed || working) return;
    setWorking(true);
    setNotice("Production du vrai PDF : couverture, grille, symboles et fils DMC…");
    try {
      const options = { bw, paper: "a4" as const, overlap: true };
      const blob = await buildPdf(pattern, options);
      downloadBlob(blob, pdfFileName(pattern, options));
      setNotice("PDF prêt. Le fichier a été généré à partir des cases réelles du patron.");
    } catch (error) {
      setNotice("Impossible de générer le PDF : " + (error instanceof Error ? error.message : "erreur inconnue"));
    } finally { setWorking(false); }
  };
  return (
    <div className="fixed inset-0 z-[110] overflow-y-auto bg-[#f6f5f2] text-[#171717]" data-scroll-interne role="dialog" aria-modal="true" aria-label="Boutique des patrons POINT ZÉRO">
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 border-b border-black/10 bg-[#f6f5f2]/95 px-4 py-3 backdrop-blur-xl sm:px-8">
        <div className="flex items-center gap-3">
          <ShoppingBag size={21} aria-hidden="true"/>
          <div><p className="text-[11px] uppercase tracking-[.13em] text-black/55">POINT ZÉRO</p><h2 className="text-lg font-semibold tracking-tight">La boutique des patrons</h2></div>
        </div>
        <button type="button" className="flex min-h-10 items-center gap-2 rounded-md border border-black/15 bg-white px-3 text-sm hover:bg-[#ecebea]" onClick={onClose}><X size={15}/> Revenir à la grille</button>
      </header>
      <div className="mx-auto max-w-[1360px] px-4 pb-20 pt-7 sm:px-8">
        {!produit ? (
          <>
            <div className="mb-7 max-w-2xl space-y-3">
              <span className="text-xs font-semibold uppercase tracking-[.18em] text-[#655677]">Collection originale · édition numérique</span>
              <h3 className="text-3xl font-semibold tracking-tight sm:text-5xl">Choisissez. Ouvrez. Brodez.</h3>
              <p className="text-sm leading-relaxed text-[#5d5d5d] sm:text-base">Plus de PDF à importer ni de grille à recalibrer. Chaque création contient déjà ses vrais points de croix, les couleurs DMC et le PDF imprimable. Le patron s’ouvre directement dans votre atelier.</p>
            </div>
            <div className="mb-3 rounded-md border border-[#cabfab] bg-[#fffaf0] px-4 py-3 text-sm text-[#554939]"><strong>Boutique en démonstration :</strong> les prix sont indicatifs. Le déblocage est gratuit pendant ce test. Aucun paiement ni achat réel n’est effectué.</div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <nav className="flex flex-wrap gap-1" aria-label="Filtrer les patrons">{THEMES.map(item => <button type="button" key={item} className={"rounded-md px-3 py-2 text-sm " + (theme === item ? "bg-[#171719] font-semibold text-white" : "border border-black/10 bg-white hover:bg-black/5")} aria-pressed={theme === item} onClick={() => setTheme(item)}>{item}</button>)}</nav>
              <label className="flex min-h-10 w-full max-w-[280px] items-center gap-2 rounded-md border border-black/15 bg-white px-3 text-sm"><Search size={16} aria-hidden="true"/><input className="w-full bg-transparent outline-none" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Chercher un motif" aria-label="Chercher un motif"/></label>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-5">
              {products.map(item => <ProductCard key={item.id} produit={item} unlocked={unlocked.includes(item.id)} onChoose={() => { setSelected(item.id); setNotice(""); }} />)}
            </div>
            {!products.length && <p role="status" className="p-8 text-center text-sm text-[#666]">Aucun motif dans cette catégorie.</p>}
            <p className="mt-8 text-xs leading-relaxed text-[#6a6a6a]">Collection de démonstration : 8 dessins géométriques originaux. La personnalisation, la validation éditoriale des patrons et les paiements sécurisés restent à mettre en place avant la commercialisation.</p>
          </>
        ) : pattern && (
          <>
            <button type="button" onClick={() => { setSelected(null); setNotice(""); }} className="mb-6 flex items-center gap-1 text-sm font-medium text-[#555] hover:text-black"><ChevronLeft size={18}/> Tous les patrons</button>
            <div className="grid gap-7 lg:grid-cols-[minmax(300px,1.1fr)_minmax(320px,.9fr)]">
              <div className="relative grid place-items-center rounded-lg border border-black/10 bg-[#fbf9f3] p-7 sm:p-14">
                <Preview patron={pattern} large/>
                {!allowed && <p className="absolute bottom-3 left-3 right-3 rounded-md bg-white/90 px-3 py-2 text-center text-[11px] text-[#665e52]">Aperçu du motif · PDF complet réservé au déblocage</p>}
              </div>
              <div className="space-y-5">
                <p className="text-xs font-semibold uppercase tracking-[.15em] text-[#6d5c81]">{produit.theme} · {produit.niveau}</p>
                <h3 className="text-3xl font-semibold tracking-tight">{produit.titre}</h3>
                <p className="text-sm text-[#666]">{produit.sousTitre}</p>
                <p className="text-2xl font-semibold">{euro(produit.prixCents)} <span className="text-xs font-normal text-[#777]">prix envisagé, non encaissé</span></p>
                <div className="grid grid-cols-2 gap-3 border-y border-black/10 py-4 text-sm">
                  <div><span className="text-[#888]">Format du patron</span><p className="font-medium">{pattern.w} × {pattern.h} points</p></div>
                  <div><span className="text-[#888]">Toile recommandée</span><p className="font-medium">{produit.toile}</p></div>
                  <div><span className="text-[#888]">Surface brodée estimée</span><p className="font-medium">{(pattern.w * 2.54 / 14).toFixed(1).replace(".", ",")} × {(pattern.h * 2.54 / 14).toFixed(1).replace(".", ",")} cm</p></div>
                  <div><span className="text-[#888]">Couleurs réelles</span><p className="font-medium">{pattern.palette.length} fils DMC</p></div>
                </div>
                <p className="text-sm leading-relaxed text-[#606060]">Inclus : le projet de broderie éditable, la grille imprimable, les symboles, la légende et la liste de fils. Vous pourrez adapter les couleurs ou le tissu dans l’atelier.</p>
                {!allowed ? (
                  <button type="button" disabled={working} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-[#19191b] px-5 font-semibold text-white hover:bg-[#333]" onClick={() => void unlockDemo()}><LockKeyhole size={17}/> Tester le déblocage gratuit</button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-[#27623c]"><Check size={17}/> Débloqué en démonstration · aucun paiement</div>
                    <button type="button" disabled={working} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-[#18181b] px-5 font-semibold text-white hover:bg-[#333] disabled:opacity-40" onClick={() => void openInAtelier()}><ShoppingBag size={17}/> Ouvrir directement dans l’atelier</button>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" disabled={working} className="flex min-h-12 items-center justify-center gap-2 rounded-md border border-black/15 bg-white px-2 text-sm font-medium hover:bg-black/5 disabled:opacity-40" onClick={() => void exportPdf(false)}><Download size={16}/> PDF couleur</button>
                      <button type="button" disabled={working} className="flex min-h-12 items-center justify-center gap-2 rounded-md border border-black/15 bg-white px-2 text-sm font-medium hover:bg-black/5 disabled:opacity-40" onClick={() => void exportPdf(true)}><FileText size={16}/> PDF symboles</button>
                    </div>
                  </div>
                )}
                <p className="text-xs leading-relaxed text-[#777]">Démonstration sans paiement : les déblocages sont uniquement mémorisés dans ce navigateur. Un futur vrai achat nécessitera une confirmation de paiement côté serveur et un accès lié au compte utilisateur.</p>
                {notice && <p className="rounded-md border border-black/10 bg-white p-3 text-sm text-[#514b5e]" role="status" aria-live="polite">{notice}</p>}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
