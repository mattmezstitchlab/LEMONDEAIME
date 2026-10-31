/**
 * Les inspecteurs du Bureau : un champ par donnée de la section choisie, construit à partir des contenus eux-mêmes
 * (texte court, texte long, liste, média). Seules les données éditoriales sont exposées : les moteurs ne le sont jamais.
 */
import { useId, useRef, type KeyboardEvent, type PointerEvent } from "react";
import { adresse, LIMITES, type Media } from "../components/edition/contenus";
import type { Ecart } from "../components/edition/validation.mjs";
import { libelle } from "./sections";

const LICENCES: [Media["licence"], string][] = [["domaine-public", "Domaine public"], ["reconstitution", "Reconstitution générée"], ["capture", "Capture de l’atelier"], ["autorise", "Utilisation autorisée"]];
const court = (cle: string) => /titre|kicker|nom|libelle|bouton|url/i.test(cle);
const limiteDe = (cle: string) => court(cle) ? LIMITES.titre : /corps|note|texte|legende|question|chapeau|reaction|orbe/i.test(cle) ? LIMITES.long : LIMITES.court;
const estMedia = (v: unknown): v is Media => !!v && typeof v === "object" && "src" in v && "licence" in v;
const chemin = (c: (string | number)[]) => c.map((k, i) => typeof k === "number" ? `[${k}]` : (i ? "." : "") + k).join("");

interface Props { valeur: unknown; chemin: (string | number)[]; changer: (c: (string | number)[], v: unknown) => void; ecarts: Ecart[]; remplacer: (c: (string | number)[]) => void }

/* ——— un texte ——— */
function ChampTexte({ cle, valeur, c, changer, ecart }: { cle: string; valeur: string; c: (string | number)[]; changer: Props["changer"]; ecart?: Ecart }) {
  const id = useId(), max = limiteDe(cle), long = !court(cle) && (valeur.length > 70 || /corps|texte|note|legende|question|chapeau|reaction|orbe/i.test(cle));
  const commun = { id, value: valeur, maxLength: max, "aria-invalid": ecart ? true : undefined, "aria-describedby": id + "-aide", onChange: (e: { target: { value: string } }) => changer(c, e.target.value) };
  return <div className="bu-champ" data-chemin={chemin(c)}>
    <label htmlFor={id}>{libelle(cle)}</label>
    {long ? <textarea {...commun} rows={Math.min(8, Math.max(2, Math.ceil(valeur.length / 60)))} /> : <input type={cle === "url" ? "url" : "text"} {...commun} />}
    <p className="bu-aide" id={id + "-aide"}>{ecart ? <span className="bu-erreur">{ecart.raison}</span> : null}<span className="bu-compte">{valeur.length} / {max}</span>
      {/\{(reponse|n)\}/.test(valeur) && <span> · gardez {valeur.match(/\{(reponse|n)\}/)![0]}</span>}{/\*/.test(valeur) && <span> · *mot* = italique</span>}</p>
  </div>;
}

/* ——— le point de cadrage : cliquer ou glisser sur l'image entière, ou les flèches du clavier ; l'aperçu montre le recadrage ——— */
export function ChoixCadrage({ src, x, y, format, changer }: { src: string; x: number; y: number; format: "ordinateur" | "mobile"; changer: (x: number, y: number) => void }) {
  const zone = useRef<HTMLDivElement>(null);
  const borne = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
  const depuis = (e: PointerEvent) => { const r = zone.current!.getBoundingClientRect(); changer(borne((e.clientX - r.left) / r.width * 100), borne((e.clientY - r.top) / r.height * 100)); };
  const touche = (e: KeyboardEvent) => {
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]; if (!d) { if (e.key === "Home") { e.preventDefault(); changer(50, 50); } return; }
    e.preventDefault(); const n = e.shiftKey ? 10 : 1; changer(borne(x + d[0] * n), borne(y + d[1] * n));
  };
  const nom = format === "ordinateur" ? "Ordinateur" : "Mobile";
  return <div className={"bu-cadrage bu-cadrage-" + format}>
    <p className="bu-cadrage-nom">{nom}</p>
    <div className="bu-cadrage-corps">
      <div ref={zone} className="bu-cadrage-image" tabIndex={0} role="group" aria-roledescription="point de cadrage"
        aria-label={`Point de cadrage, ${nom.toLowerCase()} : ${x} % depuis la gauche, ${y} % depuis le haut. Flèches pour le déplacer, Maj pour dix, Début pour le centre.`}
        onKeyDown={touche} onPointerDown={e => { (e.target as Element).setPointerCapture?.(e.pointerId); depuis(e); }} onPointerMove={e => { if (e.buttons) depuis(e); }}>
        <img src={adresse(src)} alt="" draggable={false} />
        <span className="bu-cadrage-point" style={{ left: x + "%", top: y + "%" }} aria-hidden="true" />
      </div>
      <div className="bu-cadrage-resultat" aria-hidden="true"><img src={adresse(src)} alt="" style={{ objectPosition: `${x}% ${y}%` }} /></div>
    </div>
    <p className="bu-cadrage-valeurs">
      <label>X <input type="number" min={0} max={100} value={x} onChange={e => changer(borne(+e.target.value), y)} aria-label={`${nom} : point de cadrage horizontal, en pour cent`} /></label>
      <label>Y <input type="number" min={0} max={100} value={y} onChange={e => changer(x, borne(+e.target.value))} aria-label={`${nom} : point de cadrage vertical, en pour cent`} /></label>
      <button type="button" className="bu-lien" onClick={() => changer(50, 50)}>Centrer</button>
    </p>
  </div>;
}

/* ——— un média : l'image, son remplacement, ses crédits, son cadrage ——— */
function ChampMedia({ m, c, changer, ecarts, remplacer, cle }: { m: Media; c: (string | number)[]; changer: Props["changer"]; ecarts: Ecart[]; remplacer: Props["remplacer"]; cle: string }) {
  const id = useId(), ecart = ecarts.find(e => e.chemin === chemin(c));
  const sous = (k: string) => ecarts.find(e => e.chemin === chemin([...c, k]));
  return <fieldset className="bu-media" data-chemin={chemin(c)}>
    <legend>{libelle(cle)}</legend>
    {ecart && <p className="bu-erreur" role="alert">{ecart.raison}</p>}
    <div className="bu-media-tete">
      <img src={adresse(m.src)} alt="" className="bu-media-vignette" />
      <div><p className="bu-media-src">{m.src.split("/").pop()}</p>
        <p className="bu-media-statut">{LICENCES.find(l => l[0] === m.licence)?.[1]}{m.reconstitution ? " · annoncée comme reconstitution" : ""}</p>
        <button type="button" className="bu-btn" onClick={() => remplacer(c)}>Remplacer l’image…</button></div>
    </div>
    <ChampTexte cle="alt" valeur={m.alt} c={[...c, "alt"]} changer={changer} ecart={sous("alt")} />
    <ChampTexte cle="legende" valeur={m.legende} c={[...c, "legende"]} changer={changer} ecart={sous("legende")} />
    <div className="bu-ligne">
      <div className="bu-champ"><label htmlFor={id + "-l"}>Licence</label>
        <select id={id + "-l"} value={m.licence} onChange={e => changer([...c, "licence"], e.target.value)}>{LICENCES.map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select></div>
      <label className="bu-case"><input type="checkbox" checked={m.reconstitution} onChange={e => changer([...c, "reconstitution"], e.target.checked)} /> Reconstitution générée</label>
    </div>
    <ChampTexte cle="provenance" valeur={m.provenance} c={[...c, "provenance"]} changer={changer} ecart={sous("provenance")} />
    {m.cadrage && <div className="bu-cadrages" role="group" aria-label="Cadrage du grand fond">
      <p className="bu-sous-titre">Cadrage : le point qui reste visible quand l’image est recadrée</p>
      {(["ordinateur", "mobile"] as const).map(f => <ChoixCadrage key={f} src={m.src} format={f} x={m.cadrage![f].x} y={m.cadrage![f].y}
        changer={(x, y) => changer([...c, "cadrage", f], { x, y })} />)}
    </div>}
  </fieldset>;
}

/** L'inspecteur d'une valeur : il se construit selon sa forme. */
export default function Inspecteur({ valeur, chemin: c, changer, ecarts, remplacer }: Props) {
  const cle = String(c[c.length - 1] ?? "");
  if (typeof valeur === "string") return <ChampTexte cle={cle} valeur={valeur} c={c} changer={changer} ecart={ecarts.find(e => e.chemin === chemin(c))} />;
  if (estMedia(valeur)) return <ChampMedia m={valeur} c={c} changer={changer} ecarts={ecarts} remplacer={remplacer} cle={cle} />;
  if (Array.isArray(valeur)) return <fieldset className="bu-liste"><legend>{libelle(cle)}</legend>
    {valeur.map((v, i) => <Inspecteur key={i} valeur={v} chemin={[...c, i]} changer={changer} ecarts={ecarts} remplacer={remplacer} />)}</fieldset>;
  if (valeur && typeof valeur === "object") {
    const champs = Object.entries(valeur as Record<string, unknown>).filter(([k]) => k !== "cadrage");
    const corps = champs.map(([k, v]) => <Inspecteur key={k} valeur={v} chemin={[...c, k]} changer={changer} ecarts={ecarts} remplacer={remplacer} />);
    return c.length <= 2 ? <>{corps}</> : <fieldset className="bu-groupe"><legend>{libelle(cle)}</legend>{corps}</fieldset>;
  }
  return null;
}
