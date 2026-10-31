/**
 * Le rendu des textes éditoriaux : du texte, jamais du HTML. Deux marques seulement :
 * *italique* → <i>, et dans un titre « & » dessiné plus léger, estompé (socle AIME).
 */
import { Fragment } from "react";

export function Riche({ t }: { t: string }) {
  const morceaux = t.split(/\*([^*\n]+)\*/);
  if (morceaux.length === 1) return <>{t}</>;
  return <>{morceaux.map((m, i) => i % 2 ? <i key={i}>{m}</i> : <Fragment key={i}>{m}</Fragment>)}</>;
}

export function TitreEt({ t }: { t: string }) {
  const k = t.indexOf("&");
  if (k < 0) return <>{t}</>;
  return <>{t.slice(0, k)}<span className="hi-et">&amp;</span>{t.slice(k + 1)}</>;
}
