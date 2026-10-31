/**
 * La bague du temps : DES CHIFFRES, DES POINTS, UN CERCLE (lib/temps/echelles pour le calcul).
 * Les chiffres de la période (mois, jours, heures…) sont disposés en cercle ; un point marque ceux qui portent des éléments.
 * La période choisie est toujours en haut, sous le repère, et son nom est au centre.
 * Tourner : au pointeur ou au doigt (on tire la bague), au clavier (flèches), ou d'un clic sur un chiffre.
 * Pendant qu'on tourne, le centre dit la période visée ; au relâchement, elle est choisie et ses éléments apparaissent.
 * Entrée : une échelle plus fine ; Échap ou Retour arrière : plus large. Mouvement réduit : la bague saute, sans glisser.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { anneau, approximatifs, dans, NOM_ECHELLE, nomPeriode, plusFine, plusLarge, vers, type Periode } from "../../lib/temps/echelles";
import type { Element } from "../../lib/present/projets";
import "./BagueTemps.css";

const reduit = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.pzMotion === "reduce";

export default function BagueTemps({ periode, elements, taille, aujourdhui, choisir, ouvrir }: {
  periode: Periode; elements: Element[]; taille: number; aujourdhui: Date;
  /** une période choisie (au relâchement, au clavier, au clic) */
  choisir: (p: Periode) => void;
  /** voir les éléments de la période, en grand */
  ouvrir: (p: Periode) => void;
}) {
  const items = useMemo(() => anneau(periode, elements, aujourdhui), [periode.echelle, periode.cle, elements, aujourdhui]); // eslint-disable-line react-hooks/exhaustive-deps
  const n = Math.max(1, items.length), pas = 360 / n;
  const sel = Math.max(0, items.findIndex(i => i.cle === periode.cle));
  /* la rotation de la bague, en degrés (la période choisie en haut) ; pendant un geste, elle suit le doigt */
  const [rot, setRot] = useState(sel * pas), [vise, setVise] = useState<number | null>(null), [geste, setGeste] = useState(false);
  const depart = useRef<{ a: number; rot: number; x: number; y: number; i: number | null } | null>(null), svg = useRef<SVGSVGElement>(null);
  /* la période change (clavier, clic, échelle) : la bague tourne par le plus court chemin */
  const rotRef = useRef(rot); rotRef.current = rot;
  useEffect(() => {
    setVise(null);
    const de = rotRef.current, d = ((sel * pas - de) % 360 + 540) % 360 - 180, vers_ = de + d;
    if (reduit() || Math.abs(d) < 0.5) { setRot(vers_); return; }
    let t0 = 0, raf = 0; const duree = 280;
    const pas_ = (t: number) => { if (!t0) t0 = t; const k = Math.min(1, (t - t0) / duree), e = 1 - Math.pow(1 - k, 3); setRot(de + d * e); if (k < 1) raf = requestAnimationFrame(pas_); };
    raf = requestAnimationFrame(pas_); return () => cancelAnimationFrame(raf);
  }, [sel, pas, periode.echelle]);

  const c = taille / 2, R = taille * 0.4, rp = taille * 0.31, fs = Math.max(11, Math.min(16, taille / (n > 24 ? 30 : 24)));
  /* petit cadran (téléphone) : on n'écrit pas tous les chiffres s'ils se toucheraient ; restent écrits la période choisie, celles qui portent
     des éléments et un repère régulier ; les autres deviennent des traits, toujours touchables */
  const saut = Math.max(1, Math.ceil((n * fs * 1.7) / (2 * Math.PI * R))), ecrit = (i: number) => saut === 1 || i % saut === 0;
  const pos = (i: number, r: number) => { const a = ((i * pas - rot) - 90) * Math.PI / 180; return [c + r * Math.cos(a), c + r * Math.sin(a)] as const; };
  const visee = vise ?? sel, cible: Periode = { echelle: periode.echelle, cle: items[visee]?.cle ?? periode.cle };
  const angle = (e: React.PointerEvent) => { const b = svg.current!.getBoundingClientRect(); return Math.atan2(e.clientX - b.left - b.width / 2, -(e.clientY - b.top - b.height / 2)) * 180 / Math.PI; };
  const proche = (r: number) => ((Math.round(r / pas) % n) + n) % n;

  const aller = (i: number) => { const it = items[((i % n) + n) % n]; if (it) choisir({ echelle: periode.echelle, cle: it.cle }); };
  const echelle = (vers_: "fine" | "large") => {
    const e = vers_ === "fine" ? plusFine[periode.echelle] : plusLarge[periode.echelle]; if (!e) return;
    if (e === "moment" && !elements.some(x => dans(x, periode))) return;   /* pas de moment sans élément à l'heure près */
    choisir(vers(periode, e, elements, aujourdhui));
  };
  const clavier = (e: React.KeyboardEvent) => {
    const k = e.key;
    if (k === "ArrowRight" || k === "ArrowDown") aller(sel + 1);
    else if (k === "ArrowLeft" || k === "ArrowUp") aller(sel - 1);
    else if (k === "Home") aller(0); else if (k === "End") aller(n - 1);
    else if (k === "Enter" || k === " ") echelle("fine");
    else if (k === "Escape" || k === "Backspace") { if (!plusLarge[periode.echelle]) return; echelle("large"); }
    else return;
    e.preventDefault(); e.stopPropagation();
  };
  const ici = elements.filter(x => dans(x, periode)), approx = approximatifs(elements, periode);
  const nomCible = nomPeriode(cible, elements);

  return <div className={"bt" + (geste || reduit() ? " bt-direct" : "") + (taille < 260 ? " bt-petit" : "")} style={{ width: taille, height: taille }} data-echelle={periode.echelle}>
    <svg ref={svg} className="bt-svg" width={taille} height={taille} viewBox={`0 0 ${taille} ${taille}`}
      role="slider" tabIndex={0} aria-label={`La bague du temps, échelle ${NOM_ECHELLE[periode.echelle]}. Flèches pour tourner, Entrée pour une échelle plus fine, Échap pour plus large.`}
      aria-valuemin={1} aria-valuemax={n} aria-valuenow={visee + 1} aria-valuetext={`${nomCible}${items[visee]?.compte ? `, ${items[visee].compte} élément${items[visee].compte > 1 ? "s" : ""}` : ", aucun élément"}`}
      onKeyDown={clavier}
      onPointerDown={e => { const t = (e.target as HTMLElement).closest?.(".bt-cible"); e.currentTarget.setPointerCapture?.(e.pointerId); depart.current = { a: angle(e), rot, x: e.clientX, y: e.clientY, i: t ? Number(t.getAttribute("data-i")) : null }; setGeste(true); }}
      onPointerMove={e => { const g = depart.current; if (!g || Math.hypot(e.clientX - g.x, e.clientY - g.y) < 6) return; g.i = null; const d = angle(e) - g.a, r = g.rot - d; setRot(r); setVise(proche(r)); }}
      onPointerUp={e => { const g = depart.current; if (!g) return; depart.current = null; setGeste(false);
        /* un toucher (sans glisser) sur l'anneau choisit le chiffre le plus proche par l'angle : précis même quand les chiffres sont serrés (téléphone) */
        const b = svg.current!.getBoundingClientRect(), d = Math.hypot(e.clientX - b.left - b.width / 2, e.clientY - b.top - b.height / 2);
        const touche = g.i !== null ? (d > b.width * 0.3 ? proche(angle(e) + rot) : g.i) : null;
        const i = touche ?? vise ?? sel; setVise(null); if (i !== sel) aller(i); else setRot(sel * pas); }}
      onPointerCancel={() => { depart.current = null; setGeste(false); setVise(null); setRot(sel * pas); }}>
      <circle className="bt-cercle" cx={c} cy={c} r={R + fs * 1.1} />
      <circle className="bt-sillon" cx={c} cy={c} r={rp} />
      <path className="bt-repere" d={`M${c - 6} ${c - R - fs * 1.9}L${c + 6} ${c - R - fs * 1.9}L${c} ${c - R - fs * 1.3}z`} />
      {items.map((it, i) => { const [x, y] = pos(i, R), [px, py] = pos(i, rp), on = i === visee;
        return <g key={it.cle}>
          {/* la cible du doigt : un disque invisible autour du chiffre, aussi large que l'arc le permet */}
          <circle className="bt-cible" cx={x} cy={y} r={Math.max(14, Math.min(22, Math.PI * R / n))} data-cle={it.cle} data-i={i} aria-hidden="true" />
          {on || it.compte > 0 || ecrit(i)
            ? <text className={"bt-chiffre" + (on ? " bt-on" : "")} x={x} y={y} fontSize={on ? fs * 1.25 : fs} textAnchor="middle" dominantBaseline="central" aria-hidden="true">{it.chiffre}</text>
            : <circle className="bt-trait" cx={x} cy={y} r={1.6} aria-hidden="true" />}
          {it.compte > 0 && <circle className={"bt-point" + (on ? " bt-on" : "")} cx={px} cy={py} r={Math.min(6, 2.5 + it.compte)} data-etat="info" aria-hidden="true" />}
        </g>; })}
    </svg>
    <div className="bt-centre" aria-live="polite">
      <p className="bt-echelle">{NOM_ECHELLE[periode.echelle]}</p>
      {/* petit cadran : le nom de la période est lui-même le bouton « Voir » (trois boutons ne tiennent pas côte à côte) */}
      {taille < 260 && vise === null && (ici.length > 0 || approx.length > 0)
        ? <button type="button" className="bt-nom bt-nom-voir" onClick={() => ouvrir(periode)} aria-label={`Voir ${nomCible}`}>{nomCible}</button>
        : <p className="bt-nom">{nomCible}</p>}
      {vise === null && <>
        <p className="bt-compte">{ici.length ? `${ici.length} élément${ici.length > 1 ? "s" : ""}` : "aucun élément"}{approx.length ? ` · ${approx.length} sans date assez précise` : ""}</p>
        {periode.echelle === "moment" && ici[0]
          ? <p className="bt-el bt-source">{ici[0].precision === "minute" ? "date exacte" : "date approximative"} · {ici[0].source}</p>
          : ici.slice(0, 2).map(x => <p key={x.id} className="bt-el">{x.titre}</p>)}
        <div className="bt-actions">
          {plusLarge[periode.echelle] && <button type="button" className="bt-btn" onClick={() => echelle("large")} aria-label={`Échelle plus large : ${NOM_ECHELLE[plusLarge[periode.echelle]!]}`}>−</button>}
          {taille >= 260 && (ici.length > 0 || approx.length > 0) && <button type="button" className="bt-btn bt-voir" onClick={() => ouvrir(periode)}>Voir</button>}
          {plusFine[periode.echelle] && <button type="button" className="bt-btn" onClick={() => echelle("fine")} aria-label={`Échelle plus fine : ${NOM_ECHELLE[plusFine[periode.echelle]!]}`}>+</button>}
        </div>
      </>}
    </div>
  </div>;
}
