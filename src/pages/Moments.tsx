import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Tete, DockBas, VerbesSite, Pied } from '../charte/Charte';
import { Lecture, OngletsLectures, Patron, lectureOk, quand, resume, type LectureId } from '../charte/LecturesMoment';
import { ListeMorceaux } from '../charte/Morceaux';
import { SupportImprimable } from '../charte/Support';
import { Lien, aller, remplacer, useRecherche } from '../lib/router';
import { useProgramme, autour, avant, apres, chercher, compter, estReference, etapes, moment, momentsDe, nomLieu, nomMetier, nomEtape, parMusique, personnesDe, plageMusique, voixDe, type MomentP, type Programme } from '../lib/programme';
import { MOMENTS as MUSIQUE, mesMusiques, type Musique } from '../lib/musique';
import { useSession } from '../lib/session';

/* Les 200 moments : l'aperçu global du programme, de l'idée au premier anniversaire.
   Le bandeau des dix étapes est la navigation de la page ; une seule liste, cinq lectures, une recherche ;
   et le support imprimable, tiré du même programme. La page lit le programme du contexte : la Grille 200
   de référence ici, le programme personnalisé d'une union ailleurs. */
export default function Moments({ id }: { id?: string }) {
  const P = useProgramme();
  if (id === 'support') return <SupportImprimable />;
  const m = id ? moment(P, id) : null;
  if (id && !m) return <Introuvable />;
  return m ? <UnMoment key={m.id} m={m} /> : <TousLesMoments />;
}

function useParam(nom: string) { const q = useRecherche(); return new URLSearchParams(q).get(nom); }
export function changerParam(nom: string, v: string | null) {
  const u = new URL(location.href); if (v) u.searchParams.set(nom, v); else u.searchParams.delete(nom);
  remplacer(u.pathname + u.search + u.hash);
}
/* aller à une section : loin, on saute (un long défilement animé n'aide personne) ; près, on glisse */
function allerA(ev: { preventDefault: () => void }, id: string) {
  const el = document.getElementById(id); if (!el) return;
  ev.preventDefault();
  const loin = Math.abs(el.getBoundingClientRect().top) > window.innerHeight * 3;
  el.scrollIntoView({ behavior: loin || matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' as ScrollBehavior : 'smooth', block: 'start' });
  history.replaceState(history.state, '', '#' + id);
}
const nomQui = (P: Programme, qui: string) => P.union.personnes.find(x => x.id === qui)?.nom || nomMetier(P, qui);
const CHEVRON = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>;
const LOUPE = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></svg>;

/* l'étape sous la ligne de lecture : elle s'allume dans le bandeau et s'affiche dans le dock */
function useEtapeCourante(ids: string[]) {
  const [c, setC] = useState<string | null>(null);
  useEffect(() => {
    let raf = 0;
    const f = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => {
      let x: string | null = null; const ligne = window.innerHeight * 0.35;
      for (const id of ids) { const el = document.getElementById('etape-' + id); if (el && el.getBoundingClientRect().top <= ligne) x = id; }
      setC(x);
    }); };
    window.addEventListener('scroll', f, { passive: true }); window.addEventListener('resize', f); f();
    return () => { window.removeEventListener('scroll', f); window.removeEventListener('resize', f); cancelAnimationFrame(raf); };
  }, [ids]);
  return c;
}

function TousLesMoments() {
  const P = useProgramme();
  const lecture = lectureOk(useParam('lecture'));
  const qui = useParam('qui');
  const q = useParam('q') || '';
  const [saisie, setSaisie] = useState(q);
  useEffect(() => { const t = setTimeout(() => { if (saisie.trim() !== q) changerParam('q', saisie.trim() || null); }, 200); return () => clearTimeout(t); }, [saisie, q]);
  const session = useSession();
  const [mes, setMes] = useState<Musique[] | null>(null);
  useEffect(() => { if (session) mesMusiques().then(r => setMes(r.ok ? r.musiques || [] : [])); }, [session]);
  const E = etapes(P);
  const ids = useMemo(() => E.map(e => e.id), [E.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const courante = useEtapeCourante(ids);
  const visibles = useMemo(() => {
    const parQui = new Set((qui ? momentsDe(P, qui) : P.moments).map(x => x.id));
    return new Set(chercher(P, q).filter(x => parQui.has(x.id)).map(x => x.id));
  }, [P, qui, q]);
  const filtre = !!qui || !!q;
  useEffect(() => { if (location.hash) requestAnimationFrame(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: 'center' })); }, []);
  const ec = E.find(e => e.id === courante);
  return (
    <>
      <a className="lien-evitement" href="#contenu">Aller au contenu</a>
      <Tete courant="/moments" verbes={<VerbesSite />} />
      <main id="contenu" className="m200">
        <header className="m200-tete">
          <p className="surtitre">{estReference(P) ? 'La Grille 200 · programme de référence' : 'Le programme de ' + P.union.nom}</p>
          <h1 className="grand-mot">{P.moments.length} moments</h1>
          <p className="chapeau">Tous les métiers, une seule histoire. Dix étapes, du premier rêve au premier anniversaire de {P.union.nom} : chaque moment a ses métiers, sa musique et son patron à broder.</p>
        </header>

        <nav id="etapes" aria-label="Les dix étapes" className="m200-etapes">
          <ol>{E.map((e, k) => {
            const n = filtre ? e.moments.filter(x => visibles.has(x.id)).length : e.n;
            return <li key={e.id}><a href={'#etape-' + e.id} onClick={ev => allerA(ev, 'etape-' + e.id)} aria-current={courante === e.id ? 'location' : undefined} className={(e.id === 'day' ? 'jour' : '') + (n ? '' : ' vide')}>
              <span className="num" aria-hidden="true">{k + 1}</span>
              <b>{e.nom}</b>
              <span className="repere">{e.id === 'day' ? '06:00 → 06:00' : e.repere}</span>
              <span className="compte">{filtre ? n + ' sur ' + e.n : e.n} moment{(filtre ? n : e.n) > 1 ? 's' : ''}</span>
            </a></li>;
          })}</ol>
        </nav>

        <div className="m200-outils">
          <OngletsLectures actif={lecture} choisir={l => changerParam('lecture', l === 'chrono' ? null : l)} ids="liste" />
          <label className="m200-recherche">{LOUPE}<span className="sr-only">Rechercher un moment, un métier, un lieu, une personne</span>
            <input type="search" value={saisie} onChange={e => setSaisie(e.target.value)} placeholder="Rechercher un moment, un métier, un lieu…" autoComplete="off" />
          </label>
        </div>
        <p className="m200-etat" role="status" aria-live="polite">{filtre && <>
          {visibles.size ? visibles.size + ' moment' + (visibles.size > 1 ? 's' : '') : 'Aucun moment'}{qui && <> {deQui(P, qui)}</>}{q && <> pour « {q} »</>}
          {' · '}<button type="button" className="opt" onClick={() => { setSaisie(''); const u = new URL(location.href); u.searchParams.delete('q'); u.searchParams.delete('qui'); remplacer(u.pathname + u.search); }}>Tout afficher</button>
        </>}</p>

        <div className="m200-grille">
          <div className="m200-liste" id="liste-panneau" role="tabpanel" aria-labelledby={'liste-onglet-' + lecture}>
            {E.map(e => {
              const ms = e.moments.filter(x => visibles.has(x.id));
              if (!ms.length) return null;
              return <section key={e.id} id={'etape-' + e.id} aria-labelledby={'t-' + e.id} className="m200-etape">
                <div className="m200-etape-tete"><h2 id={'t-' + e.id}>{e.nom}</h2><span>{filtre ? ms.length + ' sur ' : ''}{e.n} moments · {e.id === 'day' ? '06:00 → 06:00' : e.repere}</span></div>
                <ol>{ms.map((x, k) => <Ligne key={x.id} m={x} lecture={lecture} mes={mes} debutMusique={lecture === 'musique' && !!x.musique && ms[k - 1]?.musique !== x.musique} />)}</ol>
              </section>;
            })}
            {!visibles.size && <p className="chapeau">Rien ne correspond. Essayez un métier (« DJ »), un lieu (« piscine ») ou une personne (« Malik »).</p>}
          </div>
          <Aside />
        </div>
        <p className="profil-note" style={{ marginTop: 32 }}>{P.note}</p>
      </main>
      <DockBas label="Le programme">
        <a className="lieu" href="#etapes" onClick={ev => allerA(ev, 'etapes')} aria-current={ec ? 'true' : 'false'}>{ec ? 'Étape ' + (E.indexOf(ec) + 1) + ' sur ' + E.length + ' · ' + ec.nom : 'Les dix étapes'}</a>
      </DockBas>
      <Pied />
    </>
  );
}
const deQui = (P: Programme, qui: string) => { const n = nomQui(P, qui); return P.union.personnes.some(x => x.id === qui) ? 'de ' + n : 'du métier « ' + n + ' »'; };

/* Une ligne : l'heure, la couleur de sa voix, le titre et le lieu, puis ce que la lecture montre */
function Ligne({ m, lecture, mes, debutMusique }: { m: MomentP; lecture: LectureId; mes: Musique[] | null; debutMusique: boolean }) {
  const P = useProgramme();
  const suffixe = lecture === 'chrono' ? '' : '?lecture=' + lecture;
  const v = voixDe(P, m);
  let cote: ReactNode = null;
  if (lecture === 'chrono') cote = <>{m.metiers.slice(0, 3).map(t => <span key={t} className="pastille">{nomMetier(P, t)}</span>)}{m.metiers.length > 3 && <span className="pastille">+{m.metiers.length - 3}</span>}</>;
  if (lecture === 'metiers') cote = <>{m.metiers.map(t => <span key={t} className={'pastille' + (m.responsables.includes(t) ? ' forte' : '')}>{nomMetier(P, t)}</span>)}{m.possibles.length > 0 && <span className="m200-plus">+{m.possibles.length} possibles</span>}</>;
  if (lecture === 'musique') cote = m.musique ? <span className="m200-plus">{MUSIQUE.find(x => x[0] === m.musique)![1]}</span> : null;
  if (lecture === 'patron') cote = <><Patron m={m} petit /><span className="m200-plus">{v.map(x => 'DMC ' + x.dmc).join(' · ')}</span></>;
  if (lecture === 'personnes') cote = personnesDe(P, m).map(x => <span key={x.id} className={'pastille' + (x.type === 'personne' ? ' forte' : '')}>{x.nom}</span>);
  return (
    <li id={m.id} className="m200-item">
      {debutMusique && <SegmentMusique cle={m.musique!} mes={mes} />}
      <Lien href={'/moments/' + m.id + suffixe} className="m200-ligne">
        <span className="h">{quand(P, m)}</span>
        <span className="voix" style={{ background: v[0]?.hex }} title={v[0] ? 'DMC ' + v[0].dmc + ' · ' + v[0].nom : undefined} aria-hidden="true" />
        <span className="corps"><b>{m.titre}</b><span>{nomLieu(P, m.lieu)}{m.horaireChange && ' · horaire changé'}</span></span>
        <span className="cote">{cote}</span>
        <span className="fleche">{CHEVRON}</span>
      </Lien>
    </li>
  );
}

/* Dans la lecture Musique : un bandeau par moment de /musique, avec ses morceaux ; on les ajoute sur /musique */
function SegmentMusique({ cle, mes }: { cle: string; mes: Musique[] | null }) {
  const P = useProgramme();
  const [, nom, texte] = MUSIQUE.find(x => x[0] === cle)!;
  const liste = (mes || []).filter(x => x.moment === cle);
  return <div className="segment-musique">
    <div><b>{nom}</b><span>{plageMusique(P, cle)} · {parMusique(P, cle).length} moments · {texte}</span></div>
    {mes && liste.length > 0 && <ListeMorceaux musiques={liste} />}
    <Lien href={'/musique#moment-' + cle} className="opt">{mes && liste.length ? 'Changer les morceaux' : '+ Ajouter un morceau'}</Lien>
  </div>;
}

/* La colonne : l'union, ses chiffres, le support imprimable */
function Aside() {
  const P = useProgramme();
  const c = compter(P);
  const metiers = useMemo(() => [...new Set(P.moments.filter(m => m.etape === 'day').flatMap(m => m.metiers))].map(id => [id, nomMetier(P, id)]).sort((a, b) => a[1].localeCompare(b[1], 'fr')), [P]);
  const [pour, setPour] = useState('tous');
  const [contenu, setContenu] = useState('jour');
  return <aside className="m200-aside" aria-label="L’union et son support">
    <div className="m200-carte">
      <div className="m200-photo"><img src="/media/wedding/union-camille-gabriel.jpg" alt="" /><p>{estReference(P) ? 'Votre union prend forme' : P.union.nom}</p></div>
      <dl>{([['Moments', c.moments], ['Étapes', c.etapes], ['Métiers', c.metiers], ['Fils DMC', c.voix]] as [string, number][]).map(([t, n]) => <div key={t}><dt>{t}</dt><dd>{n}</dd></div>)}</dl>
      <div className="m200-carte-bas"><Lien className="bouton noir" href="/point-zero?q=Nous%20nous%20marions">Commencer mon union</Lien></div>
    </div>
    <div className="m200-carte m200-support">
      <h2>Le support du jour J</h2>
      <p>Le programme à imprimer et à emporter, en A4. Chacun ne reçoit que ses moments.</p>
      <label>Pour<select className="champ" value={pour} onChange={e => setPour(e.target.value)}>
        <option value="tous">Toute l’équipe</option><option value="maries">Les mariés</option>
        <optgroup label="Un métier">{metiers.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</optgroup>
      </select></label>
      <label>Contenu<select className="champ" value={contenu} onChange={e => setContenu(e.target.value)}>
        <option value="jour">Le Jour J</option><option value="autour">De la veille au lendemain</option><option value="tout">Tout le programme</option>
      </select></label>
      <Lien className="bouton" href={'/moments/support?pour=' + pour + '&contenu=' + contenu}>Version imprimable</Lien>
      {estReference(P) && <p className="profil-note">Ici, la Grille 200 de référence. Le support d’une vraie union ne reprendra que les moments qu’elle a choisis et les informations autorisées.</p>}
    </div>
  </aside>;
}

function UnMoment({ m }: { m: MomentP }) {
  const P = useProgramme();
  const lecture = lectureOk(useParam('lecture'));
  const choisir = (l: LectureId) => changerParam('lecture', l === 'chrono' ? null : l);
  const voisins = autour(P, m.id, 3);
  const q = lecture === 'chrono' ? '' : '?lecture=' + lecture;
  const a = avant(P, m.id), b = apres(P, m.id);
  useEffect(() => { document.title = m.titre + ' — ' + P.union.nom + ' · LE MONDE AIME'; }, [m, P]);
  return (
    <>
      <a className="lien-evitement" href="#contenu">Aller au contenu</a>
      <Tete courant="/moments" verbes={<VerbesSite />} />
      <main id="contenu" style={{ padding: '40px var(--marge) 140px' }}>
        <header className="moment-tete-page">
          <p className="fil-ariane"><Lien href={'/moments#' + m.id}>{P.moments.length} moments</Lien> › <Lien href={'/moments#etape-' + m.etape}>{nomEtape(P, m.etape)}</Lien> › {quand(P, m)}</p>
          <h1>{m.titre}</h1>
          <p className="moment-resume">{resume(P, m)}</p>
          <p className="chapeau">{m.description}</p>
        </header>
        <OngletsLectures actif={lecture} choisir={choisir} ids="moment" />
        <div className="moment-grille">
          <ol aria-label="Les moments autour" className="moments-autour">
            {voisins.map(x => <li key={x.id}><Lien href={'/moments/' + x.id + q} aria-current={x.id === m.id ? 'page' : undefined}><span>{quand(P, x)}</span><span>{x.titre}</span></Lien></li>)}
          </ol>
          <section role="tabpanel" id="moment-panneau" aria-labelledby={'moment-onglet-' + lecture} className="lecture-panneau" tabIndex={0}>
            <Lecture m={m} l={lecture} />
          </section>
        </div>
        <p className="profil-note" style={{ marginTop: 18 }}>{P.note}</p>
      </main>
      <DockBas label="D’un moment à l’autre">
        {a && <button type="button" className="lieu" onClick={() => aller('/moments/' + a.id + q)}>‹ {quand(P, a)} · {a.titre}</button>}
        <a className="lieu" href={'/moments#' + m.id} aria-current="true" onClick={e => { e.preventDefault(); aller('/moments#' + m.id); }}>{P.moments.indexOf(m) + 1} / {P.moments.length}</a>
        {b && <button type="button" className="lieu" onClick={() => aller('/moments/' + b.id + q)}>{quand(P, b)} · {b.titre} ›</button>}
      </DockBas>
      <Pied />
    </>
  );
}

function Introuvable() {
  const P = useProgramme();
  return <>
    <Tete courant="/moments" verbes={<VerbesSite />} />
    <main id="contenu" style={{ padding: '80px var(--marge) 140px', textAlign: 'center' }}>
      <h1 className="titre">Ce moment n’existe pas.</h1>
      <p className="chapeau" style={{ margin: '20px auto 0' }}>Il a peut-être changé de nom. Les {P.moments.length} moments sont tous sur la même page.</p>
      <Lien className="bouton noir" href="/moments" style={{ marginTop: 28 }}>Voir les moments</Lien>
    </main>
    <Pied />
  </>;
}
