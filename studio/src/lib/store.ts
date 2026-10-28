import {writeStoredJSON} from "./storageSafety";
import { createPattern, fromObject, toObject, type Pattern } from "./pattern";

/**
 * Historique annulable : un trait complet (pointerdown → pointerup) = une seule entrée.
 * begin  : sauvegarde l'état avant le trait
 * live   : met à jour le présent sans historique (pendant le trait)
 * end    : valide (changed) ou annule l'entrée (rien n'a changé)
 */
export interface StoreState {
  past: Pattern[];
  present: Pattern;
  future: Pattern[];
  pending: boolean;
}

export type Action =
  | { type: "begin" }
  | { type: "live"; pattern: Pattern }
  | { type: "end"; changed: boolean }
  | { type: "set"; pattern: Pattern }
  | { type: "quiet"; pattern: Pattern }
  | { type: "load"; pattern: Pattern }
  | { type: "undo" }
  | { type: "redo" };

const historyLimit = (p: Pattern) => Math.min(120, Math.max(3, Math.floor(64 * 1024 * 1024 / (p.w * p.h * 15))));
const KEY = "point-zero:motif:v1";
const pendingFuture = new WeakMap<Pattern, Pattern[]>();

export function initState(p: Pattern): StoreState {
  return { past: [], present: p, future: [], pending: false };
}

export function reducer(s: StoreState, a: Action): StoreState {
  switch (a.type) {
    case "begin":
      if (s.pending) return s;
      pendingFuture.set(s.present, s.future);
      return {
        past: [...s.past.slice(-(historyLimit(s.present) - 1)), s.present],
        present: s.present,
        future: [],
        pending: true,
      };
    case "live":
      return s.present === a.pattern ? s : { ...s, present: a.pattern };
    case "end": {
      if (!s.pending) return s;
      const past = a.changed ? s.past : s.past.slice(0, -1);
      const previous = s.past[s.past.length - 1];
      return { ...s, past, future: a.changed ? [] : pendingFuture.get(previous) ?? [], pending: false };
    }
    case "set":
      return {
        past: [...s.past.slice(-(historyLimit(s.present) - 1)), s.present],
        present: a.pattern,
        future: [],
        pending: false,
      };
    case "quiet":
      return { ...s, present: a.pattern };
    case "load":
      return initState(a.pattern);
    case "undo": {
      if (s.pending || !s.past.length) return s;
      const prev = s.past[s.past.length - 1];
      return { past: s.past.slice(0, -1), present: prev, future: [s.present, ...s.future], pending: false };
    }
    case "redo": {
      if (s.pending || !s.future.length) return s;
      const next = s.future[0];
      return { past: [...s.past, s.present], present: next, future: s.future.slice(1), pending: false };
    }
    default:
      return s;
  }
}

export function loadStored(): Pattern | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const restored = fromObject(JSON.parse(raw));
    // Read-only: original bytes remain available for explicit recovery.
    return restored;
  } catch {
    return null;
  }
}

export function saveStored(p: Pattern): boolean {
  try {
    writeStoredJSON(KEY, JSON.stringify(toObject(p)),fromObject);
    return true;
  } catch {
    return false;
  }
}

export function blankPattern() {
  return createPattern("Nouveau motif", 80, 80, 14, 2);
}
