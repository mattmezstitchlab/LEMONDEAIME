import { useMemo, useState } from 'react';
import { generer } from '../../studio/src/lib/motif5d/generer';
import { recetteDe, RECETTES } from '../../studio/src/lib/motif5d/recettes';
import { FLOSS } from '../../studio/src/lib/dmc';

/** Démonstration réelle du moteur, indépendante des ouvrages sauvegardés. */
export default function ApercuMotif() {
  const [taille, setTaille] = useState(64);
  const [code, setCode] = useState(RECETTES[4].code);
  const motif = useMemo(() => generer({ ...recetteDe(code), w: taille, h: taille }), [code, taille]);
  const traces = useMemo(() => {
    const groupes = new Map<number, string[]>();
    motif.pattern.cross.forEach((couleur, i) => {
      if (couleur < 0) return;
      const x = i % taille, y = Math.floor(i / taille);
      if (!groupes.has(couleur)) groupes.set(couleur, []);
      groupes.get(couleur)!.push(`M${x + .15},${y + .15}l.7,.7m0,-.7l-.7,.7`);
    });
    return [...groupes].map(([couleur, d]) => ({ couleur: FLOSS[couleur].hex, d: d.join('') }));
  }, [motif, taille]);
  return <div className="br-demo">
    <svg viewBox={`0 0 ${taille} ${taille}`} role="img" aria-label={`Motif recalculé en ${taille} par ${taille} points`}>
      {traces.map(t => <path key={t.couleur} d={t.d} stroke={t.couleur} strokeWidth=".22" fill="none" />)}
    </svg>
    <label htmlFor="br-recette">Choisir une recette</label>
    <select id="br-recette" value={code} onChange={e => setCode(e.target.value)}>{RECETTES.slice(0, 6).map(r => <option key={r.code} value={r.code}>{r.nom}</option>)}</select>
    <fieldset><legend>Changer le format</legend><div className="br-formats">{[48, 64, 80].map(n => <button type="button" key={n} aria-pressed={taille === n} onClick={() => setTaille(n)}>{n} × {n}</button>)}</div></fieldset>
    <p role="status">{motif.controle.croix} croix · {motif.controle.fils} fils DMC · {taille} × {taille} points</p>
    <p className="br-note">Généré par le moteur de l’atelier. Cet essai ne modifie aucun de vos ouvrages. Les couleurs à l’écran sont indicatives.</p>
    <a href={'/studio/atelier?rosace=' + encodeURIComponent(code)}>Ouvrir cette recette dans l’atelier →</a>
    <p className="br-note">La recette s’ouvre au format par défaut du compositeur ; vous pourrez ajuster son cadre dans l’atelier.</p>
  </div>;
}
