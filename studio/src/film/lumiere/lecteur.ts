/**
 * LUMIERE — le lecteur : il lit un MONTAGE (lib/cinema/montage), pas un film figé.
 *  - L'horloge maîtresse est celle de la musique quand le son joue (l'image suit ce qu'on entend, latence de sortie comprise),
 *    sinon celle de la page. Activer le son en cours de film démarre la musique À LA POSITION ACTUELLE : rien ne repart
 *    au début, l'impact ne se décale pas (il est porté par le montage, pas par le fichier).
 *  - Chaque plan est lu selon sa source : procédural (le moteur de rendu, au temps narratif), vidéo (un élément <video>
 *    calé sur le temps média, muet), image.
 *  - Robustesse : qualité adaptative (si les images deviennent lentes, la résolution baisse), reprise après perte du contexte
 *    graphique, et un journal (`window.__lumiere.journal`) pour comprendre ce qui s'est passé sur l'appareil.
 */
import { dureeMontage, musiqueA, placer, plansA, type Montage, type PlanPlace } from "../../lib/cinema/montage";
import { sceneAtterrissage, sceneDisquePrepare } from "./atterrissage";
import { Rendu, type FonctionScene } from "./rendu";
import { sceneVoyage } from "./voyage";
/** les récits procéduraux connus (le nom vient de la source du plan) */
const SCENES: Record<string, FonctionScene> = { voyage: sceneVoyage, atterrissage: sceneAtterrissage, "disque-prepare": sceneDisquePrepare };
import type { Scene } from "./partition";

export interface FichierAudio { url: string; morceau: string; /** le passage du morceau que couvre le fichier (tempsMorceau) */ debut: number; fin: number }
export interface OptionsLecteur {
  montage: Montage; toile: HTMLCanvasElement; calque: HTMLCanvasElement; video?: HTMLVideoElement | null;
  audio?: FichierAudio | null; mobile?: boolean;
  /** mouvement réduit : une seule image par plan (aucune animation), le son et le temps continuent */
  imageParPlan?: boolean;
  surImage?: (t: number, s: Scene | null, plan: PlanPlace | null) => void; surFin?: () => void; surEchec?: (raison: string) => void;
}

type Horloge = { genre: "page"; debut: number; t0: number } | { genre: "son"; debut: number; t0: number; ctx: AudioContext; sources: AudioBufferSourceNode[] };
export const journal: { t: number; quand: number; evt: string }[] = [];
const noter = (t: number, evt: string) => { journal.push({ t: Math.round(t * 1000) / 1000, quand: Math.round(performance.now()), evt }); if (journal.length > 400) journal.shift(); };

export class Lecteur {
  t = 0; lecture = false; son = false; fini = false; statique = false;
  readonly duree: number;
  private rendu: Rendu | null = null;
  private horloge: Horloge | null = null;
  private raf = 0;
  private places: PlanPlace[];
  private tampon: Promise<AudioBuffer | null> | null = null;
  private dims = { l: 0, h: 0 };
  private echelle: number; private qualite: number;
  private durees: number[] = []; private dernierRaf = 0;
  private recreations = 0;
  private dernierPlan = "";
  private detruit = false;

  constructor(private o: OptionsLecteur) {
    this.duree = dureeMontage(o.montage); this.places = placer(o.montage);
    this.echelle = o.mobile ? 0.6 : 0.75; this.qualite = o.mobile ? 4 : 6;
    this.creerRendu();
    noter(0, `lecteur prêt · ${o.montage.id} · ${this.duree.toFixed(3)} s`);
  }

  private creerRendu() {
    try {
      this.rendu?.detruire();
      this.rendu = new Rendu(this.o.toile, this.o.calque, { qualite: this.qualite, echelle: this.echelle, surPerte: () => this.surPerte(),
        atterrissage: this.o.montage.plans.some(p => p.source.genre === "procedural" && (p.source.scene === "atterrissage" || p.source.scene === "disque-prepare")) });
      if (this.dims.l) this.rendu.taille(this.dims.l, this.dims.h, this.dpr());
    } catch (e) { this.rendu = null; this.statique = true; noter(this.t, "rendu impossible : " + String(e)); this.o.surEchec?.("rendu"); }
  }
  /** le contexte graphique est perdu : on attend sa restauration 1,5 s, sinon on recrée le rendu (deux fois au plus) */
  private surPerte() {
    if (this.detruit) return;
    noter(this.t, "contexte graphique perdu");
    window.setTimeout(() => {
      if (this.detruit) return;
      if (this.rendu && !this.rendu.perdu) { noter(this.t, "contexte restauré"); return; }
      if (this.recreations++ < 2) { this.echelle = Math.max(0.4, this.echelle * 0.7); noter(this.t, `rendu recréé (échelle ${this.echelle.toFixed(2)})`); this.creerRendu(); }
      else { this.statique = true; noter(this.t, "passage en image fixe"); this.o.surEchec?.("contexte"); }
    }, 1500);
  }
  private dpr() { return Math.min(window.devicePixelRatio || 1, this.o.mobile ? 1.5 : 1.5); }
  taille(l: number, h: number) { this.dims = { l, h }; this.rendu?.taille(l, h, this.dpr()); this.dessiner(); }

  /* ——— le temps ——— */
  private maintenant(): number {
    const h = this.horloge; if (!h) return this.t;
    if (h.genre === "son") { const lat = (h.ctx as AudioContext & { outputLatency?: number }).outputLatency || 0; return h.t0 + Math.max(0, h.ctx.currentTime - lat - h.debut); }
    return h.t0 + (performance.now() - h.debut) / 1000;
  }

  jouer(depuis = this.t) {
    this.arreterSon(false);   /* d'abord : l'ancienne horloge ne doit pas réécrire la position demandée */
    this.t = Math.min(Math.max(0, depuis), this.duree); this.fini = false;
    this.horloge = { genre: "page", debut: performance.now(), t0: this.t };
    this.lecture = true; noter(this.t, "lecture");
    if (this.son) void this.demarrerSon(this.nouveauContexte());   /* le contexte est créé ici, dans le geste qui relance */
    cancelAnimationFrame(this.raf); this.dernierRaf = 0; this.raf = requestAnimationFrame(this.tour);
  }
  pause() { this.t = this.maintenant(); this.lecture = false; cancelAnimationFrame(this.raf); this.arreterSon(false); this.horloge = null; noter(this.t, "pause"); this.dessiner(); }
  aller(t: number) { const jouait = this.lecture; this.t = Math.min(Math.max(0, t), this.duree); if (jouait) this.jouer(this.t); else this.dessiner(); }

  private tour = (ts: number) => {
    if (!this.lecture) return;
    if (this.dernierRaf) this.adapter(ts - this.dernierRaf); this.dernierRaf = ts;
    this.t = Math.min(this.maintenant(), this.duree);
    this.dessiner();
    if (this.t >= this.duree - 1e-3) { this.lecture = false; this.fini = true; this.arreterSon(false); noter(this.t, "fin"); this.o.surFin?.(); return; }
    this.raf = requestAnimationFrame(this.tour);
  };
  /** qualité adaptative : si 8 images (ou une seconde) dépassent ~45 ms en moyenne, on baisse la résolution (jamais l'horloge) */
  private adapter(dt: number) {
    if (document.hidden) return;
    this.durees.push(dt); if (this.durees.length < 8 && this.durees.reduce((x, y) => x + y, 0) < 1000) return;
    const moy = this.durees.reduce((a, b) => a + b, 0) / this.durees.length; this.durees = [];
    if (moy > 45 && this.echelle > 0.42 && this.rendu) {
      this.echelle = Math.max(0.4, this.echelle * 0.8); if (this.echelle < 0.55) this.qualite = Math.max(3, this.qualite - 1);
      this.rendu.opts.echelle = this.echelle; this.rendu.opts.qualite = this.qualite; this.rendu.taille(this.dims.l, this.dims.h, this.dpr());
      noter(this.t, `images lentes (${moy.toFixed(0)} ms) : échelle ${this.echelle.toFixed(2)}, qualité ${this.qualite}`);
    }
  }

  /** dessiner l'instant courant (le plan vidéo prend la place du rendu procédural) */
  dessiner() {
    const actifs = plansA(this.o.montage, this.t, this.places).filter(x => x.plan.piste === "video");
    const a = actifs[actifs.length - 1] ?? plansA(this.o.montage, Math.max(0, this.t - 1e-3), this.places).find(x => x.plan.piste === "video");
    let s: Scene | null = null;
    const v = this.o.video;
    if (a && a.plan.source.genre === "video" && v) {
      if (!v.src.endsWith(a.plan.source.url)) { v.src = a.plan.source.url; v.muted = true; v.playsInline = true; noter(this.t, "plan vidéo : " + a.plan.titre); }
      v.hidden = false; this.o.toile.style.visibility = "hidden";
      if (Math.abs(v.currentTime - a.tMedia!) > 0.12) v.currentTime = Math.max(0, a.tMedia!);
      if (this.lecture && v.paused) void v.play().catch(() => {}); if (!this.lecture && !v.paused) v.pause();
    } else {
      if (v && !v.hidden) { v.pause(); v.hidden = true; } this.o.toile.style.visibility = "";
      if (a && a.tNarratif !== undefined && this.rendu && !this.statique) {
        /* mouvement réduit : l'image du milieu du plan, une seule fois par plan */
        const f = a.plan.source.genre === "procedural" ? SCENES[a.plan.source.scene] : undefined;
        if (!this.o.imageParPlan) s = this.rendu.rendre(a.tNarratif, this.t, f);
        else if (this.dernierPlan !== a.plan.id) { this.dernierPlan = a.plan.id; const src = a.plan.source; if (src.genre === "procedural") { const mid = src.narratif[Math.floor(src.narratif.length / 2)]; s = this.rendu.rendre((src.narratif[0][1] + src.narratif[src.narratif.length - 1][1]) / 2 || mid[1], this.t, f); } }
      }
    }
    this.o.surImage?.(this.t, s, a?.plan ?? null);
  }

  /** l'attente : l'image du récit reste à `t` (rien n'avance), seul le scintillement vit, au temps de la page */
  respirer() {
    const a = plansA(this.o.montage, this.t, this.places).find(x => x.plan.piste === "video");
    if (!a || a.tNarratif === undefined || !this.rendu || this.statique || a.plan.source.genre !== "procedural") return;
    this.rendu.rendre(a.tNarratif, performance.now() / 1000, SCENES[a.plan.source.scene]);
  }

  /* ——— le son : toujours sur un geste ; calé sur la position actuelle ——— */
  prechargerSon(): Promise<AudioBuffer | null> {
    const f = this.o.audio; if (!f) return Promise.resolve(null);
    if (!this.tampon) this.tampon = (async () => {
      try {
        const r = await fetch(f.url); const type = r.headers.get("content-type") ?? "";
        if (!r.ok || /text\/html/.test(type)) { noter(this.t, "musique absente ici"); return null; }
        const donnees = await r.arrayBuffer();
        const C = window.OfflineAudioContext ?? (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;
        const ctx = new C(2, 48000, 48000);
        const b = await new Promise<AudioBuffer>((ok, ko) => { const p = ctx.decodeAudioData(donnees, ok, ko); if (p) p.then(ok, ko); });
        noter(this.t, `musique prête (${b.duration.toFixed(2)} s)`); return b;
      } catch (e) { noter(this.t, "musique illisible : " + String(e)); return null; }
    })();
    return this.tampon;
  }
  /** Le premier geste (ou la lecture automatique autorisée) : le film et sa musique partent ensemble, depuis `depuis` (0 = le début).
      Rien n'a avancé pendant l'attente : aucune relance brutale. */
  async lancerAvecSon(ctx: AudioContext, depuis = 0): Promise<boolean> {
    this.arreterSon(false); cancelAnimationFrame(this.raf);
    this.horloge = null; this.t = depuis; this.fini = false; this.lecture = true; this.son = true;
    const ok = await this.demarrerSon(ctx);
    if (!ok) { this.son = false; this.jouer(depuis); return false; }
    noter(this.t, "lancement avec la musique"); this.dernierRaf = 0; this.raf = requestAnimationFrame(this.tour); return true;
  }
  /** le son, avec un contexte audio déjà autorisé (lecture automatique acceptée par le navigateur) */
  activerSonAvec(ctx: AudioContext): Promise<boolean> { this.son = true; return this.demarrerSon(ctx); }
  /** à appeler DANS le geste de la personne (clic, toucher) */
  activerSon(): Promise<boolean> {
    this.son = true;
    try { (navigator as Navigator & { audioSession?: { type: string } }).audioSession && ((navigator as Navigator & { audioSession: { type: string } }).audioSession.type = "playback"); } catch { /* Safari < 16.4 */ }
    return this.demarrerSon(this.nouveauContexte());
  }
  /** créé et repris dans le geste (exigence de l'iPhone) */
  private nouveauContexte() {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new C({ latencyHint: "playback" }); void ctx.resume(); return ctx;
  }
  couperSon() { this.son = false; this.arreterSon(true); noter(this.t, "son coupé"); }
  private async demarrerSon(ctxDonne?: AudioContext): Promise<boolean> {
    const b = await this.prechargerSon(); const f = this.o.audio;
    if (!b || !f || !this.son) { ctxDonne?.close(); if (!b) this.son = false; return false; }
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = ctxDonne ?? new C({ latencyHint: "playback" });
    if (ctx.state !== "running") await ctx.resume().catch(() => {});
    if (!this.lecture) { this.horlogeSon(ctx, [], this.t); return true; }
    /* la position APRÈS le décodage : l'image a continué pendant ce temps */
    /* depuis l'attente (aucune horloge) : la musique et l'image partent ENSEMBLE de la position exacte ; sinon, la position actuelle */
    const t0 = this.horloge ? this.maintenant() + 0.06 : this.t, quand = ctx.currentTime + 0.06;
    const sources: AudioBufferSourceNode[] = [];
    for (const c of this.o.montage.musique) {
      const finFilm = c.position + (c.fin - c.debut); if (c.morceau !== f.morceau || finFilm <= t0) continue;
      const entre = Math.max(t0, c.position), decalageFichier = c.debut + (entre - c.position) - f.debut, reste = finFilm - entre;
      if (decalageFichier < 0 || decalageFichier >= b.duration) continue;
      const src = ctx.createBufferSource(), g = ctx.createGain(); src.buffer = b; src.connect(g).connect(ctx.destination);
      const a0 = quand + (entre - t0);
      /* les fondus du montage, appliqués à la lecture (le fichier reste intact) */
      const fe = c.fondus?.entree ?? 0, fs = c.fondus?.sortie ?? 0, dans = entre - c.position;
      g.gain.setValueAtTime(fe && dans < fe ? dans / fe : 1, a0);
      if (fe && dans < fe) g.gain.linearRampToValueAtTime(1, a0 + (fe - dans));
      if (fs) { const debutSortie = a0 + Math.max(0, reste - fs); g.gain.setValueAtTime(Math.min(1, reste / fs), debutSortie); g.gain.linearRampToValueAtTime(0, a0 + reste); }
      src.start(a0, decalageFichier, Math.min(reste, b.duration - decalageFichier)); sources.push(src);
    }
    this.arreterSon(false);
    this.horlogeSon(ctx, sources, t0, quand);
    noter(t0, `son à ${t0.toFixed(3)} s (fichier ${(t0 + (this.o.montage.musique[0]?.debut ?? 0) - f.debut).toFixed(3)} s)`);
    return true;
  }
  private horlogeSon(ctx: AudioContext, sources: AudioBufferSourceNode[], t0: number, debut = ctx.currentTime) { this.horloge = { genre: "son", ctx, sources, t0, debut }; }
  private arreterSon(garderHorloge: boolean) {
    const h = this.horloge; if (!h || h.genre !== "son") return;
    const t = this.maintenant();
    for (const s of h.sources) { try { s.stop(); } catch { /* déjà arrêtée */ } }
    void h.ctx.close();
    this.horloge = garderHorloge && this.lecture ? { genre: "page", debut: performance.now(), t0: t } : null;
    if (!garderHorloge) this.t = t;
  }
  /** l'état de la musique à l'instant courant (pour le contrôle) */
  musique() { return musiqueA(this.o.montage, this.t); }
  detruire() { this.detruit = true; this.lecture = false; cancelAnimationFrame(this.raf); this.arreterSon(false); this.rendu?.detruire(); }
}
