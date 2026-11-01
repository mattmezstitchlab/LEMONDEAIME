import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import ToileRosace from './ToileRosace';
import { COLLECTION_ROSACES, type RosaceCollection } from './collection';
import { genererRosace } from './modele';

/** Une vignette n'est calculée que lorsqu'elle approche de l'écran. */
function Vignette({ entree, active, choisir }: { entree: RosaceCollection; active: boolean; choisir: (r: RosaceCollection) => void }) {
  const hote = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = hote.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    const io = new IntersectionObserver(es => {
      if (es.some(e => e.isIntersecting)) { setVisible(true); io.disconnect(); }
    }, { rootMargin: '300px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const resultat = useMemo(() => visible ? genererRosace(entree.recette) : null, [visible, entree]);
  const numero = String(entree.numero).padStart(2, '0');
  return <li className="ros-galerie-item">
    <button ref={hote} type="button" className={'ros-galerie-figure ros-galerie-figure-' + ((entree.numero - 1) % 4)}
      onClick={() => choisir(entree)} data-code={entree.code} data-rosace-numero={entree.numero} aria-pressed={active}
      aria-label={`Explorer ${entree.nom}, numéro ${numero} sur 64, recette ${entree.code}`}>
      <span className="ros-galerie-index" aria-hidden="true">{numero} / 64</span>
      <span className="ros-galerie-cercle" aria-hidden="true">{resultat && <ToileRosace pattern={resultat.pattern} etiquette={`Rosace ${entree.nom} calculée par le moteur 5D`} marge={.88} />}</span>
      <span className="ros-galerie-plus" aria-hidden="true">↗</span>
    </button>
    <div className="ros-galerie-legende"><h3>{entree.nom}</h3><span aria-hidden="true">{entree.code.split('.')[0]}</span></div>
  </li>;
}

export default function GalerieRosaces({ choisir, codeActif }: { choisir: (r: RosaceCollection) => void; codeActif: string }) {
  const deplacer = (e: KeyboardEvent<HTMLOListElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return;
    const boutons = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('button[data-rosace-numero]'));
    const i = boutons.indexOf(e.target as HTMLButtonElement);
    if (i < 0) return;
    const colonnes = getComputedStyle(e.currentTarget).gridTemplateColumns.trim().split(/\s+/).length || 1;
    const suivant = e.key === 'Home' ? 0 : e.key === 'End' ? boutons.length - 1
      : i + (e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowDown' ? colonnes : -colonnes);
    e.preventDefault();
    boutons[Math.max(0, Math.min(boutons.length - 1, suivant))]?.focus();
  };
  return <ol className="ros-galerie-grille" aria-label="Collection de 64 rosaces" onKeyDown={deplacer}>
    {COLLECTION_ROSACES.map(r => <Vignette key={r.code} entree={r} active={r.code === codeActif} choisir={choisir} />)}
  </ol>;
}
