import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motifTrail, stepsForTrail, type ExpressionMood, type MusicStep, type Point, type ScaleName } from "../lib/slame";
import { slameToMidi } from "../lib/slameMidi";
import type { Pattern } from "../lib/pattern";

export type GrilleMode = "toile" | "musique" | "parole";

interface Props {
  mode: GrilleMode;
  pattern: Pattern | null;
  trail: Point[];
  onPoint: (point: Point) => void;
  onTrail: (trail: Point[]) => void;
  onMode: (mode: GrilleMode) => void;
  onAdvanced: () => void;
}

const styles = {
  button: "min-h-10 rounded-md border border-black/15 bg-white px-3 py-2 text-sm text-black hover:bg-black/5 disabled:opacity-40",
  selected: "min-h-10 rounded-md border border-[#5c4c90] bg-[#ebe5ff] px-3 py-2 text-sm font-semibold text-[#3d2a75]",
  input: "w-full rounded-md border border-black/20 bg-white px-3 py-2 text-sm text-black",
};
const phrases = ["Je t’aime", "Pardon", "Merci", "Oui", "Non", "J’ai besoin d’aide", "Arrêtez, s’il vous plaît"];
const download = (file: Blob, name: string) => {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
};

export default function HomeSlamePanel({ mode, pattern, trail, onPoint, onTrail, onMode, onAdvanced }: Props) {
  const [scale, setScale] = useState<ScaleName>("pentatonic");
  const [mood, setMood] = useState<ExpressionMood>("tender");
  const [bpm, setBpm] = useState(96);
  const [loop, setLoop] = useState(false);
  const [text, setText] = useState("Je t’aime");
  const [log, setLog] = useState<{ at: string; text: string }[]>([]);
  const [status, setStatus] = useState("Cliquez sur les cases de la toile pour dessiner votre musique.");
  const [playing, setPlaying] = useState(false);
  const [help, setHelp] = useState(false);
  const [cursor, setCursor] = useState<Point>({ x: 0, y: 0 });
  const [scan, setScan] = useState(false);
  const [scanPhase, setScanPhase] = useState<"row" | "col">("row");
  const [scanIndex, setScanIndex] = useState(0);
  const [scanRow, setScanRow] = useState(0);
  const ctx = useRef<AudioContext | null>(null);
  const bus = useRef<GainNode | null>(null);
  const timer = useRef<number | null>(null);
  const events = useMemo(() => pattern ? stepsForTrail(pattern, trail, scale, mood) : [], [pattern, trail, scale, mood]);
  const stop = useCallback(() => {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
    if (bus.current && ctx.current) bus.current.gain.setTargetAtTime(0, ctx.current.currentTime, .01);
    bus.current = null;
    setPlaying(false);
  }, []);
  useEffect(() => () => {
    if (timer.current !== null) window.clearInterval(timer.current);
    if (ctx.current) void ctx.current.close();
    if ("speechSynthesis" in window) speechSynthesis.cancel();
  }, []);
  useEffect(() => { stop(); }, [mode, stop]);
  useEffect(() => {
    if (pattern) setCursor({ x: Math.floor(pattern.w / 2), y: Math.floor(pattern.h / 2) });
  }, [pattern?.w, pattern?.h]);

  const play = async (notes: MusicStep[]) => {
    if (!notes.length) { setStatus("Commencez par sélectionner des cases, ou écoutez tout le motif."); return; }
    stop();
    try {
      const audio = ctx.current ?? new AudioContext();
      ctx.current = audio;
      await audio.resume();
      const output = audio.createGain();
      output.gain.value = .16;
      output.connect(audio.destination);
      bus.current = output;
      let i = 0, when = audio.currentTime + .08;
      const tick = () => {
        while (when < audio.currentTime + .16) {
          if (i >= notes.length) {
            if (!loop) {
              if (timer.current !== null) window.clearInterval(timer.current);
              timer.current = null;
              setPlaying(false);
              return;
            }
            i = 0;
          }
          const note = notes[i++];
          const duration = 60 / bpm * note.duration;
          if (note.midi !== null) {
            const osc = audio.createOscillator();
            const gain = audio.createGain();
            osc.type = note.kind === "knot" ? "square" : "triangle";
            osc.frequency.value = 440 * Math.pow(2, (note.midi - 69) / 12);
            gain.gain.setValueAtTime(.0001, when);
            gain.gain.linearRampToValueAtTime(Math.max(.03, note.velocity * .7), when + .012);
            gain.gain.exponentialRampToValueAtTime(.0001, when + Math.max(.07, duration * .84));
            osc.connect(gain).connect(output);
            osc.start(when);
            osc.stop(when + Math.max(.08, duration * .86));
            osc.onended = () => { osc.disconnect(); gain.disconnect(); };
          }
          when += duration;
        }
      };
      tick();
      timer.current = window.setInterval(tick, 60);
      setPlaying(true);
      setStatus("Lecture de votre grille en cours. Les cases vides deviennent des silences.");
    } catch {
      stop();
      setStatus("L’audio n’est pas disponible dans ce navigateur.");
    }
  };
  const listenPattern = () => {
    if (!pattern) { setStatus("Décrivez un motif ou importez un PDF sur la toile."); return; }
    const path = motifTrail(pattern, 512);
    if (!path.length) { setStatus("Aucun point coloré à écouter sur la toile."); return; }
    onTrail(path);
    void play(stepsForTrail(pattern, path, scale, mood));
  };
  const say = () => {
    if (!text.trim()) return;
    if (!("speechSynthesis" in window)) { setStatus("Voix indisponible sur ce navigateur."); return; }
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.trim());
    utterance.lang = "fr-FR";
    const voices = speechSynthesis.getVoices().filter(v => v.lang.toLowerCase().startsWith("fr"));
    utterance.voice = voices.find(v => v.localService) ?? voices[0] ?? null;
    speechSynthesis.speak(utterance);
    setLog(old => [...old, { at: new Date().toISOString(), text: text.trim() }]);
    setStatus("Expression prononcée localement, sans envoi à des contacts.");
  };
  const validateScan = useCallback(() => {
    if (!pattern) return;
    if (scanPhase === "row") {
      setScanRow(scanIndex); setScanIndex(0); setScanPhase("col");
    } else {
      onPoint({ x: scanIndex, y: scanRow }); setScanIndex(0); setScanPhase("row");
    }
  }, [pattern, scanPhase, scanIndex, scanRow, onPoint]);
  useEffect(() => {
    if (!scan || mode !== "musique" || !pattern) return;
    const id = window.setInterval(() => setScanIndex(index => (index + 1) % (scanPhase === "row" ? pattern.h : pattern.w)), 1200);
    return () => window.clearInterval(id);
  }, [scan, mode, pattern?.w, pattern?.h, scanPhase]);
  useEffect(() => {
    if (mode !== "musique" || !pattern) return;
    const keys = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input,textarea,select,button,[contenteditable]")) return;
      if (scan && e.code === "Space") { e.preventDefault(); validateScan(); return; }
      if (scan) return;
      const movements: Record<string, Point> = {
        ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
        ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }
      };
      const move = movements[e.key];
      if (move) {
        e.preventDefault();
        setCursor(c => ({ x: Math.min(pattern.w - 1, Math.max(0, c.x + move.x)), y: Math.min(pattern.h - 1, Math.max(0, c.y + move.y)) }));
      } else if (e.key === "Enter") { e.preventDefault(); onPoint(cursor); }
      else if (e.key === "Backspace") { e.preventDefault(); onTrail(trail.slice(0, -1)); }
    };
    window.addEventListener("keydown", keys);
    return () => window.removeEventListener("keydown", keys);
  }, [mode, pattern, scan, cursor, trail, onPoint, onTrail, validateScan]);

  const exportMidi = () => {
    if (!events.length) { setStatus("Aucun trajet à exporter."); return; }
    download(new Blob([Uint8Array.from(slameToMidi(events, bpm))], { type: "audio/midi" }), "pointzero-slame.mid");
  };
  const exportJson = () => {
    download(new Blob([JSON.stringify({ format: "aime-slame", version: 2, at: new Date().toISOString(), motif: pattern?.name, trail, scale, mood, bpm, notes: events, expressions: log }, null, 2)], { type: "application/json" }), "pointzero-slame.json");
  };

  if (mode === "toile") return null;
  return (
    <aside data-scroll-interne className="fixed bottom-24 right-3 top-[76px] z-[75] flex w-[min(350px,calc(100vw-24px))] flex-col overflow-y-auto rounded-lg border border-black/15 bg-[#fffffff2] p-4 text-left text-[#17171a] shadow-[0_14px_55px_#0002] backdrop-blur-xl" aria-label={mode === "musique" ? "Musique sur la toile" : "Parole depuis la toile"}>
      <div className="flex items-start justify-between gap-2">
        <div><p className="text-[11px] font-semibold uppercase tracking-[.13em] text-black/50">POINT ZÉRO / SLÂME</p><h2 className="text-xl font-semibold">{mode === "musique" ? "Écouter la grille" : "Exprimer mes mots"}</h2></div>
        <button className={styles.button} onClick={() => onMode("toile")} aria-label="Masquer les outils">×</button>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-black/65">{mode === "musique" ? "Touchez les cases de la toile derrière ce panneau : c’est la même grille, pas un second atelier." : "Exprimez une phrase avec la voix disponible sur votre appareil, indépendamment de la musique."}</p>
      {mode === "musique" ? (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button className={styles.selected} onClick={listenPattern}>♫ Écouter l’ouvrage</button>
            <button className={styles.button} onClick={() => void play(events)} disabled={!events.length}>{playing ? "Rejouer" : "▶ Jouer le trajet"}</button>
            <button className={styles.button} onClick={stop}>■ Arrêter</button>
            <button className={styles.button} onClick={() => onTrail(trail.slice(0, -1))} disabled={!trail.length}>↶ Annuler un pas</button>
            <button className={styles.button} onClick={() => { stop(); onTrail([]); }} disabled={!trail.length}>Effacer le trajet</button>
            <button className={styles.button} onClick={exportMidi} disabled={!events.length}>Exporter MIDI</button>
          </div>
          <p className="text-xs text-black/65">{trail.length} cases traversées · {events.filter(x => x.midi !== null).length} notes</p>
          <label className="block text-xs font-medium">Gamme
            <select className={styles.input + " mt-1"} value={scale} onChange={e => setScale(e.target.value as ScaleName)}>
              <option value="pentatonic">Pentatonique</option><option value="major">Majeure</option><option value="minor">Mineure</option><option value="dorian">Dorienne</option>
            </select>
          </label>
          <label className="block text-xs font-medium">Tempo · {bpm} BPM
            <input className="mt-2 w-full accent-[#6a59a7]" type="range" min="45" max="180" value={bpm} onChange={e => setBpm(Number(e.target.value))}/>
          </label>
          <label className="block text-xs font-medium">Expression musicale choisie
            <select className={styles.input + " mt-1"} value={mood} onChange={e => setMood(e.target.value as ExpressionMood)}>
              <option value="tender">Tendresse</option><option value="joy">Joie</option><option value="calm">Calme</option><option value="sad">Mélancolie</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={loop} onChange={e => setLoop(e.target.checked)}/> Jouer en boucle</label>
          <div className="border-t border-black/10 pt-3">
            <button className={styles.button + " w-full"} onClick={() => { setScan(!scan); setScanPhase("row"); setScanIndex(0); }} aria-pressed={scan}>Balayage à un contacteur · {scan ? "actif" : "inactif"}</button>
            {scan && <button className={styles.selected + " mt-2 w-full"} onClick={validateScan}>Valider {scanPhase === "row" ? "la rangée" : "la colonne"} {scanIndex + 1}</button>}
            <p className="mt-2 text-xs text-black/60">Clavier : flèches pour déplacer le curseur, Entrée pour sélectionner. Contacteur : Espace pour valider le balayage.</p>
            <button className={styles.button + " mt-2"} onClick={() => onPoint(cursor)} disabled={!pattern}>Poser le curseur : {cursor.x + 1}, {cursor.y + 1}</button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">{phrases.map(phrase => <button key={phrase} className={text === phrase ? styles.selected : styles.button} onClick={() => setText(phrase)}>{phrase}</button>)}</div>
          <label className="block text-xs font-medium">Ma phrase
            <textarea className={styles.input + " mt-1 min-h-24"} maxLength={500} value={text} onChange={e => setText(e.target.value)}/>
          </label>
          <button className={styles.selected + " w-full"} onClick={say} disabled={!text.trim()}>Prononcer ma phrase</button>
          <button className={styles.button + " w-full"} onClick={() => { if ("speechSynthesis" in window) speechSynthesis.cancel(); }}>Arrêter la voix</button>
          <p className="text-xs text-black/60">La parole n’envoie aucun message, n’alerte personne et ne remplace pas un dispositif d’urgence.</p>
          {log.length > 0 && <div className="border-t border-black/10 pt-3 text-xs"><h3 className="font-semibold">Historique de cette session</h3>{log.slice(-3).reverse().map((entry, i) => <p className="mt-2" key={i}>{new Date(entry.at).toLocaleTimeString("fr-FR")} · {entry.text}</p>)}</div>}
        </div>
      )}
      <div className="mt-4 space-y-2 border-t border-black/10 pt-3">
        <button className={styles.button + " w-full"} onClick={exportJson}>Exporter le projet JSON</button>
        <button className={styles.button + " w-full"} onClick={() => setHelp(!help)} aria-expanded={help}>Mode d’emploi {help ? "−" : "+"}</button>
        {help && <p className="text-xs leading-relaxed text-black/65">1. Décrivez un motif depuis le centre de la toile ou importez un PDF. 2. Activez Musique en bas, puis touchez les cases pour créer votre trajet. 3. Écoutez et exportez. 4. Activez Parole pour choisir une phrase et la faire prononcer. Aucun destinataire n’est contacté. Pour les essais de webcam et de souffle, le prototype avancé reste accessible.</p>}
        <button className="text-xs text-black/55 underline" onClick={onAdvanced}>Ouvrir les commandes expérimentales (caméra / souffle)</button>
        <p role="status" aria-live="polite" className="text-xs leading-relaxed text-[#554576]">{status}</p>
      </div>
    </aside>
  );
}
