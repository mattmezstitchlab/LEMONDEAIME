import { FLOSS } from "./dmc";
import { getMotifPreset } from "./motifPresets";

export type DesignFormat = "affiche" | "flyer" | "story" | "banniere" | "faire-part" | "maquette" | "mini-site";
export type DesignElement =
  | { id: string; kind: "text"; x: number; y: number; w: number; h: number; text: string; size: number; weight: number; color: string; align: "left" | "center" | "right" }
  | { id: string; kind: "shape"; x: number; y: number; w: number; h: number; shape: "rectangle" | "ellipse"; color: string }
  | { id: string; kind: "motif"; x: number; y: number; w: number; h: number; presetId: string }
  | { id: string; kind: "image"; x: number; y: number; w: number; h: number; dataUrl: string };

export interface DesignDocument {
  version: 1;
  id: string;
  name: string;
  format: DesignFormat;
  width: number;
  height: number;
  background: string;
  elements: DesignElement[];
}
export interface FormatSpec {
  id: DesignFormat;
  label: string;
  width: number;
  height: number;
  description: string;
  printable: boolean;
}
export const FORMATS: FormatSpec[] = [
  { id: "affiche", label: "Affiche", width: 900, height: 1272, description: "Portrait · A4", printable: true },
  { id: "flyer", label: "Flyer", width: 800, height: 1131, description: "Portrait · A5", printable: true },
  { id: "story", label: "Story", width: 540, height: 960, description: "Vertical · 9:16", printable: false },
  { id: "banniere", label: "Bannière", width: 1200, height: 400, description: "Horizontal · 3:1", printable: false },
  { id: "faire-part", label: "Faire-part", width: 800, height: 1100, description: "Portrait · invitation", printable: true },
  { id: "maquette", label: "Maquette web", width: 1200, height: 750, description: "Interface · desktop", printable: false },
  { id: "mini-site", label: "Mini-site", width: 960, height: 1400, description: "Maquette HTML · statique", printable: false },
];
const unique = () => globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
export const specFor = (id: DesignFormat): FormatSpec => FORMATS.find(f => f.id === id) ?? FORMATS[0];
const clamp = (value: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, value));
export const colorOK = (hex: string): boolean => /^#[\da-fA-F]{6}$/.test(hex);
export const validDataImage = (uri: string): boolean => /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(uri) && uri.length <= 5_800_000;
export function createDesign(format: DesignFormat): DesignDocument {
  const spec = specFor(format), w = spec.width, h = spec.height, short = h < w;
  const text = (value: string, y: number, size: number, weight: number, color: string, height: number): DesignElement =>
    ({ id: unique(), kind: "text", x: w * .10, y, w: w * .80, h: height, text: value, size, weight, color, align: "center" });
  const title = format === "faire-part" ? "UN BEAU JOUR" : format === "maquette" || format === "mini-site" ? "Votre univers, à votre image." : "CRÉEZ L'INATTENDU";
  const titleY = short ? h * .29 : h * .29;
  const elements: DesignElement[] = [
    text("POINTZERO  ·  STUDIO", short ? h * .17 : h * .19, short ? 24 : 22, 600, "#7b6555", 38),
    text(title, titleY, short ? 54 : 58, 700, "#242126", short ? h * .22 : h * .16),
    text(format === "faire-part" ? "Camille & Gabriel\n14 juin · 17h" : "Une composition, tous les formats.", short ? h * .66 : h * .73, short ? 22 : 25, 400, "#6c635d", short ? h * .20 : h * .12),
    { id: unique(), kind: "motif", x: w * (short ? .44 : .35), y: h * (short ? .07 : .46), w: w * (short ? .12 : .30), h: h * (short ? .16 : .24), presetId: "fleur-rose" },
  ];
  return { version: 1, id: unique(), name: spec.label + " sans titre", format, width: w, height: h, background: "#f8f4ee", elements };
}
export function duplicateDesign(document: DesignDocument, format: DesignFormat): DesignDocument {
  const target = specFor(format), sx = target.width / document.width, sy = target.height / document.height;
  const typeScale = Math.sqrt(sx * sy);
  return {
    ...document, id: unique(), name: document.name + " · " + target.label,
    format, width: target.width, height: target.height,
    elements: document.elements.map(e => ({
      ...e, id: unique(), x: Math.round(e.x * sx), y: Math.round(e.y * sy),
      w: Math.max(1, Math.round(e.w * sx)), h: Math.max(1, Math.round(e.h * sy)),
      ...(e.kind === "text" ? { size: clamp(Math.round(e.size * typeScale), 10, 180) } : {}),
    })) as DesignElement[],
  };
}
export function addDesignElement(doc: DesignDocument, kind: "text" | "shape" | "motif", presetId = "fleur-rose", at?: { x: number; y: number }): DesignDocument {
  const w = kind === "text" ? doc.width * .5 : doc.width * .24;
  const h = kind === "text" ? doc.height * .12 : doc.height * .18;
  const x = clamp(Math.round(at?.x ?? (doc.width - w) / 2), 0, doc.width - 1);
  const y = clamp(Math.round(at?.y ?? (doc.height - h) / 2), 0, doc.height - 1);
  let element: DesignElement;
  if (kind === "text") element = { id: unique(), kind, x, y, w, h, text: "Votre texte", size: 42, weight: 600, color: "#252228", align: "left" };
  else if (kind === "shape") element = { id: unique(), kind, x, y, w, h, shape: "rectangle", color: "#e2c8bd" };
  else element = { id: unique(), kind, x, y, w, h, presetId };
  return { ...doc, elements: [...doc.elements, element] };
}
export function safeDesign(raw: unknown): DesignDocument | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.version !== 1 || typeof o.format !== "string" || !FORMATS.some(f => f.id === o.format) ||
    typeof o.name !== "string" || o.name.length > 180 ||
    typeof o.width !== "number" || typeof o.height !== "number" ||
    o.width < 10 || o.height < 10 || o.width > 4000 || o.height > 4000 ||
    typeof o.background !== "string" || !colorOK(o.background) ||
    !Array.isArray(o.elements) || o.elements.length > 150) return null;
  for (const item of o.elements) {
    if (!item || typeof item !== "object") return null;
    const e = item as Record<string, unknown>;
    if (typeof e.id !== "string" || e.id.length > 100 || !["text", "shape", "motif", "image"].includes(String(e.kind)) ||
      !["x","y","w","h"].every(k => typeof e[k] === "number" && Number.isFinite(e[k]) && Math.abs(e[k] as number) < 10000)) return null;
    if ((e.w as number) < 1 || (e.h as number) < 1) return null;
    if (e.kind === "text" && (typeof e.text !== "string" || e.text.length > 3000 || typeof e.color !== "string" || !colorOK(e.color) ||
      typeof e.size !== "number" || e.size < 8 || e.size > 300 || ![400,600,700].includes(Number(e.weight)) || !["left","center","right"].includes(String(e.align)))) return null;
    if (e.kind === "shape" && (!["rectangle","ellipse"].includes(String(e.shape)) || typeof e.color !== "string" || !colorOK(e.color))) return null;
    if (e.kind === "motif" && (typeof e.presetId !== "string" || !getMotifPreset(e.presetId))) return null;
    if (e.kind === "image" && (typeof e.dataUrl !== "string" || !validDataImage(e.dataUrl))) return null;
  }
  return o as unknown as DesignDocument;
}
const xml = (text: string): string => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
function renderMotif(presetId: string, box: DesignElement): string {
  const pattern = getMotifPreset(presetId);
  if (!pattern) return "";
  const squares: string[] = [];
  for (let i = 0; i < pattern.cross.length; i++) {
    const code = pattern.cross[i];
    if (code < 0) continue;
    const color = FLOSS[code]?.hex ?? "#222222";
    squares.push('<rect x="' + i % pattern.w + '" y="' + Math.floor(i / pattern.w) + '" width="1.01" height="1.01" fill="' + color + '"/>');
  }
  for (const s of pattern.back) {
    const fill = FLOSS[s.c]?.hex ?? "#333333";
    squares.push('<path d="M' + s.x1 + " " + s.y1 + " L" + s.x2 + " " + s.y2 + '" stroke="' + fill + '" fill="none" stroke-width=".35"/>');
  }
  return '<svg x="' + box.x + '" y="' + box.y + '" width="' + box.w + '" height="' + box.h +
    '" viewBox="0 0 ' + pattern.w + ' ' + pattern.h + '" preserveAspectRatio="xMidYMid meet">' + squares.join("") + "</svg>";
}
export function designToSVG(doc: DesignDocument, transparent = false): string {
  const pieces: string[] = [];
  if (!transparent) pieces.push('<rect x="0" y="0" width="' + doc.width + '" height="' + doc.height + '" fill="' + doc.background + '"/>');
  for (const e of doc.elements) {
    if (e.kind === "shape") pieces.push('<' + (e.shape === "ellipse" ? "ellipse" : "rect") +
      (e.shape === "ellipse" ? ' cx="' + (e.x + e.w/2) + '" cy="' + (e.y + e.h/2) + '" rx="' + e.w/2 + '" ry="' + e.h/2 + '"' :
        ' x="' + e.x + '" y="' + e.y + '" width="' + e.w + '" height="' + e.h + '"') + ' fill="' + e.color + '"/>');
    if (e.kind === "motif") pieces.push(renderMotif(e.presetId, e));
    if (e.kind === "image" && validDataImage(e.dataUrl))
      pieces.push('<image x="' + e.x + '" y="' + e.y + '" width="' + e.w + '" height="' + e.h +
        '" preserveAspectRatio="xMidYMid meet" href="' + e.dataUrl + '"/>');
    if (e.kind === "text") {
      const anchor = e.align === "center" ? "middle" : e.align === "right" ? "end" : "start";
      const x = e.x + (e.align === "center" ? e.w/2 : e.align === "right" ? e.w : 0);
      const lines = e.text.split("\n").slice(0, 25);
      pieces.push('<text font-family="Arial,Helvetica,sans-serif" font-size="' + e.size + '" font-weight="' + e.weight +
        '" fill="' + e.color + '" text-anchor="' + anchor + '">');
      for (const [i,line] of lines.entries()) pieces.push('<tspan x="' + x + '" y="' + (e.y + e.size*(i*1.2 + 1)) + '">' + xml(line) + "</tspan>");
      pieces.push("</text>");
    }
  }
  return '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="' + doc.width +
    '" height="' + doc.height + '" viewBox="0 0 ' + doc.width + " " + doc.height + '" role="img" aria-label="' +
    xml(doc.name) + '">' + pieces.join("") + "</svg>";
}
export function designToHTML(doc: DesignDocument): string {
  const svg = designToSVG(doc);
  return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="description" content="Composition statique réalisée avec POINTZERO">' +
    '<title>' + xml(doc.name) + '</title><style>*{box-sizing:border-box}body{margin:0;min-height:100dvh;background:#111;color:#fff;font-family:Arial,sans-serif}' +
    'main{max-width:' + doc.width + 'px;margin:0 auto}svg{display:block;width:100%;height:auto}footer{text-align:center;font-size:12px;padding:16px;color:#bbb}</style>' +
    '</head><body><main>' + svg + '</main><footer>Maquette statique · POINTZERO</footer></body></html>';
}
