import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Lien } from '../lib/router';
import { PROGRAMME as P, avant, apres, moment, heure, nomEtape, nomLieu, nomMetier, metiersDe, patron, personnesDe, momentsDe, parMusique, plageMusique, voixDuMetier, type MomentP } from '../lib/programme';
import { MOMENTS as MUSIQUE, mesMusiques, type Musique } from '../lib/musique';
import { useSession } from '../lib/session';
import { EXEMPLES, UNION_EXEMPLE } from '../lib/reseau-exemples';
import { CarteReseau } from './CartePersonne';
import { ListeMorceaux, ChoisirMorceau } from './Morceaux';

/* Un seul programme, cinq lectures. Chaque lecture lit le même moment du même programme : rien n'est recopié. */
export type LectureId = 'chrono' | 'musique' | 'metiers' | 'patron' | 'personnes';
export const LECTURES: [LectureId, string][] = [['chrono', 'Chronologie'], ['musique', 'Musique'], ['metiers', 'Métiers'], ['patron', 'Patron'], ['personnes', 'Personnes']];
export const lectureOk = (x: string | null): LectureId => (LECTURES.some(l => l[0] === x) ? x : 'chrono') as LectureId;

/* « 22:36 » pour le Jour J, le repère de l'étape sinon (« M − 9 mois ») */
export const quand = (m: MomentP) => m.etape === 'day' ? heure(m) : P.etapes.find(e => e.id === m.etape)!.repere;
const duree = (n: number) => n >= 60 ? (n % 60 ? Math.floor(n / 60) + ' h ' + (n % 60) : Math.floor(n / 60) + ' h') : n + ' minutes';
const listeNoms = (ids: string[]) => ids.map(id => id === 'couple' ? 'les mariés' : id === 'temoins' ? 'les témoins' : nomMetier(P, id)).join(', ');
export const resume = (m: MomentP) => ['Moment ' + m.n + ' sur ' + P.moments.length, duree(m.duree), nomLieu(P, m.lieu), m.responsables.length ? 'Responsables : ' + listeNoms(m.responsables) : ''].filter(Boolean).join(' · ');

/* Les onglets des lectures : flèches gauche/droite, Début, Fin */
export function OngletsLectures({ actif, choisir, ids }: { actif: LectureId; choisir: (l: LectureId) => void; ids: string }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const clavier = (e: KeyboardEvent, k: number) => {
    const n = LECTURES.length, cible = e.key === 'ArrowRight' ? (k + 1) % n : e.key === 'ArrowLeft' ? (k - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
    if (cible < 0) return; e.preventDefault(); choisir(LECTURES[cible][0]); refs.current[cible]?.focus();
  };
  return (
    <div role="tablist" aria-label="Lire ce moment par" className="lectures">
      {LECTURES.map(([id, nom], k) => <button key={id} ref={el => { refs.current[k] = el; }} role="tab" id={ids + '-onglet-' + id} aria-controls={ids + '-panneau'} aria-selected={actif === id} tabIndex={actif === id ? 0 : -1}
        onKeyDown={e => clavier(e, k)} onClick={() => choisir(id)}>{nom}</button>)}
    </div>
  );
}

export function Lecture({ m, l }: { m: MomentP; l: LectureId }) {
  if (l === 'musique') return <LectureMusique m={m} />;
  if (l === 'metiers') return <LectureMetiers m={m} />;
  if (l === 'patron') return <LecturePatron m={m} />;
  if (l === 'personnes') return <LecturePersonnes m={m} />;
  return <LectureChrono m={m} />;
}

const LienMoment = ({ m }: { m: MomentP }) => <Lien href={'/moments/' + m.id + location.search}>{m.titre}</Lien>;

function LectureChrono({ m }: { m: MomentP }) {
  const a = avant(P, m.id), b = apres(P, m.id);
  const E = P.etapes.findIndex(e => e.id === m.etape);
  const prerequis = m.prerequis.map(id => moment(P, id)!).filter(Boolean);
  const suites = P.moments.filter(x => x.prerequis.includes(m.id));
  return <>
    <h2 className="lecture-titre">Sa place dans le programme</h2>
    <p className="lecture-texte">Étape {E + 1} sur {P.etapes.length} · {nomEtape(P, m.etape)}{m.tranche ? ' · tranche ' + m.tranche : ''}.{' '}
      {a && <>Juste après <LienMoment m={a} /> ({quand(a)})</>}{a && b && ', '}{b && <>juste avant <LienMoment m={b} /> ({quand(b)})</>}.</p>
    <div className="lecture-cases">
      <div><b>Il faut d’abord</b>{prerequis.length ? <ul>{prerequis.map(x => <li key={x.id}><LienMoment m={x} /> · {quand(x)}</li>)}</ul> : <p>Rien : ce moment peut commencer seul.</p>}</div>
      <div><b>Il ouvre la voie à</b>{suites.length ? <ul>{suites.map(x => <li key={x.id}><LienMoment m={x} /> · {quand(x)}</li>)}</ul> : <p>Aucun moment n’attend celui-ci.</p>}</div>
      {m.consignes && <div><b>Les consignes</b><ul>{[...m.consignes.taches, ...m.consignes.repli.map(t => 'Plan B : ' + t)].map(t => <li key={t}>{t}</li>)}</ul></div>}
    </div>
    <p className="profil-note" style={{ marginTop: 18 }}>Horaires d’exemple, à adapter à chaque union.</p>
  </>;
}

/* La musique : le moment du programme appartient à un moment de /musique ; on y retrouve ses propres morceaux */
function LectureMusique({ m }: { m: MomentP }) {
  const session = useSession();
  const [mes, setMes] = useState<Musique[] | null>(null);
  const [ajout, setAjout] = useState(false);
  useEffect(() => { if (session && m.musique) mesMusiques().then(r => setMes(r.ok ? r.musiques || [] : [])); }, [session, m.musique]);
  if (!m.musique) return <>
    <h2 className="lecture-titre">La musique du moment</h2>
    <p className="lecture-texte">La playlist suit le Jour J. Ce moment-ci, {nomEtape(P, m.etape).toLowerCase()}, se vit sans bande-son.</p>
    {(m.id === 'conception-music' || m.id === 'preparation-music') && <p className="lecture-texte">C’est ici qu’elle se prépare : <Lien href="/musique">composer la journée en musique</Lien>.</p>}
  </>;
  const [, nom, texte] = MUSIQUE.find(x => x[0] === m.musique)!;
  const meme = parMusique(P, m.musique);
  const liste = (mes || []).filter(x => x.moment === m.musique);
  return <>
    <h2 className="lecture-titre">La musique du moment</h2>
    <p className="lecture-texte">Ce moment fait partie de <b>{nom.toLowerCase()}</b> ({plageMusique(P, m.musique)}) : {texte.charAt(0).toLowerCase() + texte.slice(1)}</p>
    <div className="lecture-bloc">
      {session === null && <p style={{ margin: 0 }}>Vos morceaux de {nom.toLowerCase()} apparaissent ici. <Lien href="/musique">Composer ma journée en musique</Lien></p>}
      {session && mes && <>
        <ListeMorceaux musiques={liste} modifiable setMusiques={n => setMes([...mes.filter(x => x.moment !== m.musique), ...n])} vide={'Pas encore de morceau pour ' + nom.toLowerCase() + '.'} />
        {ajout ? <ChoisirMorceau moment={m.musique} compact ajoute={x => setMes([...mes, x])} /> : <button type="button" className="opt" style={{ justifySelf: 'start' }} onClick={() => setAjout(true)}>+ Ajouter un morceau</button>}
      </>}
    </div>
    <p className="surtitre" style={{ margin: '26px 0 10px' }}>Les {meme.length} moments sur cette musique</p>
    <ol className="lecture-liste">{meme.map(x => <li key={x.id} aria-current={x.id === m.id ? 'true' : undefined}><b>{heure(x)}</b><LienMoment m={x} /></li>)}</ol>
    <p className="profil-note" style={{ marginTop: 14 }}>La même musique que sur <Lien href={'/musique#moment-' + m.musique}>la journée en musique</Lien> : les deux pages lisent le même programme.</p>
  </>;
}

function LectureMetiers({ m }: { m: MomentP }) {
  const { principaux, possibles } = metiersDe(P, m);
  const familles = [...new Set(possibles.map(x => x.famille))];
  return <>
    <h2 className="lecture-titre">Les métiers du moment</h2>
    <ul className="lecture-metiers">
      {principaux.map(t => {
        const e = t.reseau.map(s => EXEMPLES.find(x => x.slug === s)).find(Boolean);
        const role = t.responsable ? 'Responsable du moment' : 'Y participe';
        return <li key={t.id}>{e
          ? <CarteReseau c={{ href: '/reseau/' + e.slug, nom: e.nom, etiquette: t.nom + ' · ' + role, photo: e.photo, alt: e.alt, exemple: true, fiche: { nom: e.nom, bio: e.texte }, credit: e.union ? 'Crédité dans ' + UNION_EXEMPLE : null }} />
          : <div className="metier-carte"><span className="fil" style={{ background: voixDuMetier(P, t.id)?.hex }} aria-hidden="true" /><b>{t.nom}</b><span>{P.familles[t.famille]} · {role}</span><Lien href={'/moments?qui=' + t.id}>Ses {momentsDe(P, t.id).length} moments</Lien></div>}</li>;
      })}
    </ul>
    {possibles.length > 0 && <>
      <p className="surtitre" style={{ margin: '28px 0 10px' }}>Peuvent aussi tenir ce moment · {possibles.length}</p>
      {familles.map(f => <div key={f} className="rangee-pastilles"><span className="pastille-famille">{P.familles[f]}</span>{possibles.filter(x => x.famille === f).map(x => <span key={x.id} className="pastille">{x.nom}</span>)}</div>)}
    </>}
  </>;
}

/* Le patron du moment : une grille brodée avec les fils (DMC) des voix qui font vivre le moment */
export function Patron({ m, petit }: { m: MomentP; petit?: boolean }) {
  const t = patron(P, m);
  return <div role="img" aria-label={'Le patron du moment, ' + t.taille + ' par ' + t.taille + ' points, ' + t.voix.length + ' fil' + (t.voix.length > 1 ? 's' : '') + ' : ' + t.voix.map(v => v.nom).join(', ')} className={'patron' + (petit ? ' petit' : '')} style={{ gridTemplateColumns: 'repeat(' + t.taille + ', minmax(0, 1fr))' }}>
    {t.points.map((v, k) => <span key={k} style={v >= 0 ? { background: t.voix[v].hex } : undefined} />)}
  </div>;
}
function LecturePatron({ m }: { m: MomentP }) {
  const t = patron(P, m);
  return <div className="lecture-patron">
    <Patron m={m} />
    <div>
      <h2 className="lecture-titre">Le patron du moment</h2>
      <p className="lecture-texte">{t.taille} × {t.taille} points, {t.voix.length} fil{t.voix.length > 1 ? 's' : ''} : chaque voix qui fait vivre le moment a sa couleur.</p>
      <ul className="voix-liste">{t.voix.map(v => <li key={v.id}><span style={{ background: v.hex }} aria-hidden="true" /><b>DMC {v.dmc}</b><span>{v.nom}</span></li>)}</ul>
      <p className="profil-note" style={{ marginTop: 14 }}>Couleurs d’écran approchées ; vérifiez sur une carte de fils DMC avant d’acheter. <Lien href="/studio/atelier">Ouvrir le Studio</Lien></p>
    </div>
  </div>;
}

function LecturePersonnes({ m }: { m: MomentP }) {
  const gens = personnesDe(P, m);
  return <>
    <h2 className="lecture-titre">Les personnes du moment</h2>
    <p className="lecture-texte">Touchez une personne pour ne voir que ses moments, sur les {P.moments.length}.</p>
    <ul className="lecture-personnes">
      {gens.map(x => {
        const e = x.reseau?.map(s => EXEMPLES.find(y => y.slug === s)).find(Boolean);
        return <li key={x.id}><Lien href={'/moments?qui=' + x.id + '#' + m.id}>
          {e ? <img src={e.photo} alt="" /> : <span className={'rond' + (x.type === 'personne' ? ' nacre' : '')} aria-hidden="true">{x.nom.replace(/^(L[ea]s?\s|L’)/, '').slice(0, 2)}</span>}
          <span><b>{x.nom}</b><span>{x.role} · {momentsDe(P, x.id).length} moments</span></span>
        </Lien></li>;
      })}
    </ul>
  </>;
}
