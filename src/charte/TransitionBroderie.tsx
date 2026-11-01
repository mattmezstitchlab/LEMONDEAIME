import { useEffect, useRef, useState } from 'react';

/* De la photographie à la broderie : six temps, une même petite scène (un couple, un ciel d'étoiles) redessinée case par case.
   C'est une illustration de la méthode, pas une conversion de la photo du héros : la légende le dit.
   Sans JavaScript, ou si le mouvement est réduit, les six vignettes sont toutes visibles et fixes. Sinon elles apparaissent l'une après l'autre au défilement.
   Aucune dépendance, aucune image : un seul tableau de cases. */
const SCENE = [
  '..*.....*.....*.....*...', '.....*.......*.......*..', '.*.........*..........*.', '...*....*..........*....', '........bb..gg..*.......',
  '........bb..gg..........', '.tttt..bbbbgggg...tttt..', '.tttt..bbbbgggg...tttt..', '..tt...bbbbgggg....tt...', '..tt..bbbbbgggg....tt...',
  '..tt..bbbbbgggg....tt...', '..tt..bbbbbgggg....tt...', '========================', '========================', '========================',
];
const L = 24, H = 15, C = 10;
const COULEUR: Record<string, string> = { '.': '#1d2b4b', '*': '#f1e4a4', b: '#f3e9da', g: '#6e5b49', '=': '#b38b5b', t: '#5d6e3b' };
const cases = SCENE.flatMap((ligne, y) => [...ligne].map((c, x) => ({ x, y, c })));

type Temps = { nom: string; dit: string };
const TEMPS: Temps[] = [
  { nom: 'La photographie', dit: 'Une scène, avec tout ce qu’elle contient.' },
  { nom: 'Des points', dit: 'On ne garde que des points de lumière.' },
  { nom: 'Une composition', dit: 'Ce qui compte ressort, le reste s’efface.' },
  { nom: 'Une grille', dit: 'Chaque point trouve sa case.' },
  { nom: 'Des couleurs', dit: 'Chaque case reçoit un fil.' },
  { nom: 'Un motif brodé', dit: 'Chaque case devient une croix.' },
];

function Vignette({ i }: { i: number }) {
  const sujet = (c: string) => c !== '.' && c !== '*';
  return (
    <svg viewBox={`0 0 ${L * C} ${H * C}`} role="img" aria-label={TEMPS[i].nom} focusable="false">
      {i === 0 && <><defs><filter id="tb-flou"><feGaussianBlur stdDeviation="3.2" /></filter></defs><g filter="url(#tb-flou)">{cases.map(k => <rect key={k.x + '-' + k.y} x={k.x * C} y={k.y * C} width={C} height={C} fill={COULEUR[k.c]} />)}</g></>}
      {i === 1 && <><rect width={L * C} height={H * C} fill="#ecebe6" />{cases.map(k => <circle key={k.x + '-' + k.y} cx={k.x * C + C / 2} cy={k.y * C + C / 2} r="2.2" fill="#7b7b76" />)}</>}
      {i === 2 && <><rect width={L * C} height={H * C} fill="#ecebe6" />{cases.map(k => <circle key={k.x + '-' + k.y} cx={k.x * C + C / 2} cy={k.y * C + C / 2} r={sujet(k.c) ? 3.8 : 1.2} fill={sujet(k.c) ? '#1c1c1a' : '#b9b8b1'} />)}</>}
      {i === 3 && <><rect width={L * C} height={H * C} fill="#f7f6f2" />{cases.map(k => <rect key={k.x + '-' + k.y} x={k.x * C + .5} y={k.y * C + .5} width={C - 1} height={C - 1} fill={sujet(k.c) ? '#c9c8c1' : '#ecebe6'} stroke="#d6d5ce" strokeWidth=".6" />)}</>}
      {i === 4 && <>{cases.map(k => <rect key={k.x + '-' + k.y} x={k.x * C + .5} y={k.y * C + .5} width={C - 1} height={C - 1} fill={COULEUR[k.c]} />)}</>}
      {i === 5 && <><rect width={L * C} height={H * C} fill="#f4efe4" />{cases.map(k => <path key={k.x + '-' + k.y} d={`M${k.x * C + 1.6} ${k.y * C + 1.6}L${k.x * C + C - 1.6} ${k.y * C + C - 1.6}M${k.x * C + C - 1.6} ${k.y * C + 1.6}L${k.x * C + 1.6} ${k.y * C + C - 1.6}`} stroke={k.c === '.' ? '#2c3b5e' : COULEUR[k.c]} strokeWidth="2.4" strokeLinecap="round" fill="none" />)}</>}
    </svg>
  );
}

export default function TransitionBroderie() {
  const racine = useRef<HTMLOListElement>(null);
  const [anime, setAnime] = useState(false);
  const [vus, setVus] = useState<boolean[]>(() => TEMPS.map(() => false));
  useEffect(() => {
    let reduit = false;
    try { reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { /* rien */ }
    if (reduit || typeof IntersectionObserver === 'undefined' || !racine.current) return;
    setAnime(true);
    const io = new IntersectionObserver(es => {
      es.forEach(e => { if (e.isIntersecting) { const n = Number((e.target as HTMLElement).dataset.n); setVus(v => v[n] ? v : v.map((x, k) => k === n ? true : x)); io.unobserve(e.target); } });
    }, { threshold: .35 });
    racine.current.querySelectorAll('li').forEach(li => io.observe(li));
    return () => io.disconnect();
  }, []);
  return (
    <section className="section ac-broderie" id="broderie" aria-labelledby="titre-broderie" style={{ paddingInline: 'var(--marge)' }}>
      <div className="ac-entete">
        <div>
          <p className="surtitre">Broderie — L’atelier Point Zéro</p>
          <h2 id="titre-broderie" className="titre" style={{ maxWidth: '16ch' }}>Une réalité complexe devient une composition.</h2>
        </div>
        <p>Mariage : organiser les personnes, les décisions et les moments. Broderie : organiser les fils, les couleurs et les gestes. Même philosophie : donner forme à la complexité.</p>
      </div>
      <ol className={'ac-temps' + (anime ? ' ac-anime' : '')} ref={racine}>
        {TEMPS.map((t, i) => (
          <li key={t.nom} data-n={i} className={vus[i] || !anime ? 'vu' : ''} style={{ transitionDelay: anime ? i * 40 + 'ms' : undefined }}>
            <Vignette i={i} />
            <b><span>{String(i + 1).padStart(2, '0')}</span> {t.nom}</b>
            <span>{t.dit}</span>
          </li>
        ))}
      </ol>
      <p className="ac-legende-temps">Illustration de la méthode : une petite scène redessinée case par case. Ce n’est pas la conversion de la photographie ci-dessus.</p>
    </section>
  );
}
