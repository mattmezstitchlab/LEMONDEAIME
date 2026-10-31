import { codeSignature, enClair, type Signature } from "../lib/motif5d/code";

/**
 * Le sceau : la signature qu'on peut voir. Le Point au centre, puis un anneau par geste, du centre vers le bord,
 * dans l'ordre des questions. Quatre anneaux se lisent par leur forme (en rouge DMC 321) ; le cinquième porte les vrais fils.
 * `faits` = nombre d'anneaux dessinés (pendant le parcours) ; à 5, le sceau est complet.
 */
export const ENCRE = "#a0172e";
const GRIS = "rgba(28,28,32,.14)";

export default function Sceau({ signature, faits = 5, couleurs = [], taille = 160, code, graine, onde }: {
  signature: Partial<Signature>; faits?: number; couleurs?: string[]; taille?: number;
  /** le code complet sous le sceau (fin du parcours, PDF) */ code?: string; graine?: number;
  /** une clé qui change à chaque choix : une onde part du Point */ onde?: number;
}) {
  const s = signature, c = 90, k = (n: number) => n;
  const complet = faits >= 5 && s.structure !== undefined && s.trace !== undefined && s.densite !== undefined && s.echelle !== undefined && s.palette !== undefined;
  const nom = complet ? `Sceau ${codeSignature(s as Signature)}${graine ? ", graine " + graine : ""} : ${enClair(s as Signature)}` : `Sceau en cours : ${faits} anneau${faits > 1 ? "x" : ""} sur 5`;
  const pts = (n: number, r: number, f: (x: number, y: number, i: number) => React.ReactNode) => Array.from({ length: n }, (_, i) => { const t = (i / n) * Math.PI * 2 - Math.PI / 2; return f(c + r * Math.cos(t), c + r * Math.sin(t), i); });
  const anneau1 = () => {
    const r = 22;
    if (s.structure === 0) return pts(8, r, (x, y, i) => <circle key={i} cx={x} cy={y} r={5} fill={ENCRE} />);
    if (s.structure === 1) return <g fill="none" stroke={ENCRE} strokeWidth={2}><circle cx={c} cy={c} r={r - 3} /><circle cx={c} cy={c} r={r + 3} /></g>;
    if (s.structure === 2) return pts(12, r, (x, y, i) => { const dx = (x - c) / r, dy = (y - c) / r; return <line key={i} x1={x - dx * 4} y1={y - dy * 4} x2={x + dx * 4} y2={y + dy * 4} stroke={ENCRE} strokeWidth={3} strokeLinecap="round" />; });
    return pts(12, r, (x, y, i) => <rect key={i} x={x - 3} y={y - 3} width={6} height={6} fill={ENCRE} />);
  };
  const anneau2 = () => {
    const r = 34;
    if (s.trace === 0) return <rect x={c - r * 0.8} y={c - r * 0.8} width={r * 1.6} height={r * 1.6} fill="none" stroke={ENCRE} strokeWidth={3} />;
    if (s.trace === 1) return <polygon points={`${c},${c - r} ${c + r},${c} ${c},${c + r} ${c - r},${c}`} fill="none" stroke={ENCRE} strokeWidth={3} />;
    if (s.trace === 2) return <circle cx={c} cy={c} r={r} fill="none" stroke={ENCRE} strokeWidth={3} />;
    return pts(20, r, (x, y, i) => { const z = i % 2 ? 2.6 : 4.2; return <rect key={i} x={x - z} y={y - z} width={z * 2} height={z * 2} fill={ENCRE} />; });
  };
  const anneau3 = () => {
    const r = 46, part = [0.25, 0.5, 0.75, 1][s.densite ?? 0], L = 2 * Math.PI * r;
    return <circle cx={c} cy={c} r={r} fill="none" stroke={ENCRE} strokeWidth={6} strokeDasharray={`${L * part} ${L}`} transform={`rotate(-90 ${c} ${c})`} strokeLinecap={part < 1 ? "round" : "butt"} />;
  };
  const anneau4 = () => {
    const [n, z] = [[8, 5], [16, 3.4], [24, 2.4], [36, 1.5]][s.echelle ?? 0];
    return pts(n, 58, (x, y, i) => <circle key={i} cx={x} cy={y} r={z} fill={ENCRE} />);
  };
  const anneau5 = () => {
    const r = 70, n = Math.max(1, couleurs.length), L = 2 * Math.PI * r, seg = L / n;
    return couleurs.map((col, i) => <circle key={i} cx={c} cy={c} r={r} fill="none" stroke={col} strokeWidth={9} strokeDasharray={`${Math.max(0, seg - 4)} ${L}`} strokeDashoffset={-i * seg} transform={`rotate(-90 ${c} ${c})`} />);
  };
  const dessins = [anneau1, anneau2, anneau3, anneau4, anneau5];
  return <figure className="sceau" style={{ width: taille }}>
    <svg viewBox="0 0 180 180" width={taille} height={taille} role="img" aria-label={nom}>
      {[22, 34, 46, 58, 70].map(r => <circle key={r} cx={c} cy={c} r={k(r)} fill="none" stroke={GRIS} strokeWidth={1} />)}
      {dessins.slice(0, Math.min(5, faits)).map((f, i) => <g key={i} className="sceau-anneau">{f()}</g>)}
      {onde !== undefined && <circle key={"onde-" + onde} className="sceau-onde" cx={c} cy={c} r={12} fill="none" stroke={ENCRE} strokeWidth={1.5} />}
      <circle cx={c} cy={c} r={9} fill={ENCRE} />
    </svg>
    {code && <figcaption className="sceau-code">{code.replace(/\.(?=[gv])/g, " · ")}</figcaption>}
  </figure>;
}
