import { Lien } from '../lib/router';
import { PROGRAMME, compter, etapes } from '../lib/programme';

/* La bande des 200 moments (accueil) : les dix étapes, à l'échelle de leur nombre de moments. Tout est compté sur le programme. */
export function BandeEtapes() {
  const E = etapes(PROGRAMME);
  const c = compter(PROGRAMME);
  const jour = E.find(e => e.id === 'day')!;
  return (
    <>
      <ol className="etapes200" aria-label="Les dix étapes du programme">
        {E.map(e => <li key={e.id}>
          <Lien href={'/moments#etape-' + e.id} className={e.id === 'day' ? 'jour' : ''} style={{ ['--n' as string]: e.n }}>
            <span className="etape-quand">{e.id === 'day' ? '06:00 → 06:00' : e.repere}</span>
            <span className="etape-nom">{e.nom}</span>
            <span className="etape-n">{e.n}</span>
            <span className="etape-unite">moment{e.n > 1 ? 's' : ''}</span>
          </Lien>
        </li>)}
      </ol>
      <div className="barre200" aria-hidden="true">{E.map((e, k) => <span key={e.id} style={{ flex: e.n + ' 1 0', background: e.id === 'day' ? 'var(--encre)' : TEINTES[k % TEINTES.length] }} />)}</div>
      <p className="profil-note" style={{ marginTop: 10 }}>La barre est à l’échelle : le Jour J compte à lui seul {jour.n} des {c.moments} moments.</p>
    </>
  );
}
const TEINTES = ['#E9E9E4', '#E1E1DB', '#D8D8D1', '#CFCFC8', '#D8D8D1', '#E1E1DB'];

/* Les chiffres du programme, en une ligne (page des moments) */
export function ChiffresProgramme() {
  const c = compter(PROGRAMME);
  const L: [string, number][] = [['Moments', c.moments], ['Étapes', c.etapes], ['Métiers', c.metiers], ['Fils DMC', c.voix]];
  return <dl className="chiffres200">{L.map(([t, n]) => <div key={t}><dt>{t}</dt><dd>{n}</dd></div>)}</dl>;
}
