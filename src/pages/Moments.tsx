import { useEffect, useMemo, useState } from 'react';
import { Tete, DockBas, VerbesSite, Pied } from '../charte/Charte';
import { ChiffresProgramme } from '../charte/Programme';
import { LECTURES, Lecture, OngletsLectures, Patron, lectureOk, quand, resume, type LectureId } from '../charte/LecturesMoment';
import { ListeMorceaux, enPiste } from '../charte/Morceaux';
import { Lien, aller, remplacer, useRecherche } from '../lib/router';
import { PROGRAMME as P, autour, etapes, moment, momentsDe, nomLieu, nomMetier, nomEtape, parMusique, personnesDe, plageMusique, voixDe, type MomentP } from '../lib/programme';
import { MOMENTS as MUSIQUE, mesMusiques, jouable, type Musique } from '../lib/musique';
import { jouerListe } from '../lib/lecteur';
import { useSession } from '../lib/session';

/* Les 200 moments : la grande page verticale du programme, de l'idée au premier anniversaire.
   Une seule liste, cinq lectures (les mêmes que pour un moment ouvert). */
export default function Moments({ id }: { id?: string }) {
  const m = id ? moment(P, id) : null;
  if (id && !m) return <Introuvable />;
  return m ? <UnMoment key={m.id} m={m} /> : <TousLesMoments />;
}

function useParam(nom: string) { const q = useRecherche(); return new URLSearchParams(q).get(nom); }
function changerParam(nom: string, v: string | null) {
  const u = new URL(location.href); if (v) u.searchParams.set(nom, v); else u.searchParams.delete(nom);
  remplacer(u.pathname + u.search + u.hash);
}
function nomQui(qui: string) { return P.union.personnes.find(x => x.id === qui)?.nom || nomMetier(P, qui); }

function TousLesMoments() {
  const lecture = lectureOk(useParam('lecture'));
  const qui = useParam('qui');
  const session = useSession();
  const [mes, setMes] = useState<Musique[] | null>(null);
  useEffect(() => { if (session) mesMusiques().then(r => setMes(r.ok ? r.musiques || [] : [])); }, [session]);
  const E = etapes(P);
  const visibles = useMemo(() => new Set((qui ? momentsDe(P, qui) : P.moments).map(x => x.id)), [qui]);
  const journee = MUSIQUE.flatMap(([k]) => (mes || []).filter(x => x.moment === k)).filter(jouable);
  useEffect(() => { if (location.hash) requestAnimationFrame(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: 'center' })); }, []);
  return (
    <>
      <a className="lien-evitement" href="#contenu">Aller au contenu</a>
      <Tete courant="/moments" verbes={<VerbesSite />} />
      <main id="contenu" style={{ padding: '40px var(--marge) 140px' }}>
        <header className="moments-tete">
          <p className="surtitre">Le programme · union d’exemple, {P.union.nom} · {P.union.lieu.toLowerCase()}</p>
          <h1 className="grand-mot">{P.moments.length} moments</h1>
          <p className="chapeau">Du premier rêve au premier anniversaire, dans l’ordre. Chaque moment a ses métiers, sa musique et son patron à broder : la playlist est la timeline.</p>
          <ChiffresProgramme />
          <div className="moments-actions">
            <OngletsLectures actif={lecture} choisir={l => changerParam('lecture', l === 'chrono' ? null : l)} ids="liste" />
            {journee.length > 0 && <button type="button" className="bouton noir" onClick={() => jouerListe(journee.map(enPiste))}>Écouter toute la journée · {journee.length} extrait{journee.length > 1 ? 's' : ''}</button>}
          </div>
          {qui && <p className="filtre-qui" role="status">Seulement les {visibles.size} moments {deQui(qui)} · <button type="button" className="opt" onClick={() => changerParam('qui', null)}>Tout afficher</button></p>}
        </header>

        <div className="moments-grille" id="liste-panneau" role="tabpanel" aria-labelledby={'liste-onglet-' + lecture}>
          <nav aria-label="Les dix étapes" className="moments-etapes">
            <ol>{E.map((e, k) => <li key={e.id}><a href={'#etape-' + e.id}><span className="num">{k + 1}</span><span><b>{e.nom}</b><span>{e.id === 'day' ? '06:00 → 06:00' : e.repere} · {e.n} moments</span></span></a></li>)}</ol>
          </nav>
          <div style={{ minWidth: 0 }}>
            {E.map(e => {
              const ms = e.moments.filter(x => visibles.has(x.id));
              if (!ms.length) return null;
              return <section key={e.id} id={'etape-' + e.id} aria-labelledby={'t-' + e.id} className="moments-etape">
                <div className="moments-etape-tete"><h2 id={'t-' + e.id}>{e.nom}</h2><span>{e.n} moments · {e.id === 'day' ? '06:00 → 06:00' : e.repere} · moments {e.premier} à {e.dernier}</span></div>
                <ol className="moments-liste">{ms.map((x, k) => <Ligne key={x.id} m={x} lecture={lecture} mes={mes} debutMusique={!!x.musique && ms[k - 1]?.musique !== x.musique} />)}</ol>
              </section>;
            })}
          </div>
        </div>
        <p className="profil-note" style={{ marginTop: 32 }}>{P.note}</p>
      </main>
      <DockBas lieux={E.map(e => ['etape-' + e.id, e.nom] as [string, string])} label="Les dix étapes" />
      <Pied />
    </>
  );
}
const deQui = (qui: string) => { const n = nomQui(qui); return /^[A-ZÉ][a-zé]+$/.test(n) && P.union.personnes.some(x => x.id === qui) ? 'de ' + n : 'du métier « ' + n + ' »'; };

/* Une ligne du programme : l'heure, le titre, le lieu, puis ce que la lecture choisie montre */
function Ligne({ m, lecture, mes, debutMusique }: { m: MomentP; lecture: LectureId; mes: Musique[] | null; debutMusique: boolean }) {
  const q = lecture === 'chrono' ? '' : '?lecture=' + lecture;
  return (
    <li id={m.id} className="moment-ligne">
      {lecture === 'musique' && debutMusique && <SegmentMusique cle={m.musique!} mes={mes} />}
      <Lien href={'/moments/' + m.id + q} className="moment-lien">
        <span className="moment-h">{quand(m)}</span>
        <span className="moment-corps"><b>{m.titre}</b><span>{nomLieu(P, m.lieu)} · n° {m.n}</span></span>
        <span className="moment-cote">
          {lecture === 'chrono' && <span className="moment-desc">{m.description}</span>}
          {lecture === 'metiers' && m.metiers.map(t => <span key={t} className="pastille">{nomMetier(P, t)}</span>)}
          {lecture === 'musique' && <span className="moment-desc">{m.musique ? m.description : 'Sans musique : la playlist suit le Jour J.'}</span>}
          {lecture === 'patron' && <><Patron m={m} petit /><span className="voix-mini">{voixDe(P, m).map(v => <span key={v.id} title={'DMC ' + v.dmc + ' · ' + v.nom} style={{ background: v.hex }} />)}</span></>}
          {lecture === 'personnes' && personnesDe(P, m).map(x => <span key={x.id} className="pastille">{x.nom}</span>)}
        </span>
      </Lien>
    </li>
  );
}

function SegmentMusique({ cle, mes }: { cle: string; mes: Musique[] | null }) {
  const [, nom, texte] = MUSIQUE.find(x => x[0] === cle)!;
  const liste = (mes || []).filter(x => x.moment === cle);
  return <div className="segment-musique">
    <div><b>{nom}</b><span>{plageMusique(P, cle)} · {parMusique(P, cle).length} moments · {texte}</span></div>
    {mes ? <ListeMorceaux musiques={liste} vide="Pas encore de morceau ici." /> : <Lien href={'/musique#moment-' + cle} className="opt">Choisir les morceaux</Lien>}
  </div>;
}

function UnMoment({ m }: { m: MomentP }) {
  const lecture = lectureOk(useParam('lecture'));
  const choisir = (l: LectureId) => changerParam('lecture', l === 'chrono' ? null : l);
  const voisins = autour(P, m.id, 3);
  const q = lecture === 'chrono' ? '' : '?lecture=' + lecture;
  useEffect(() => { document.title = m.titre + ' — ' + P.union.nom + ' · LE MONDE AIME'; }, [m]);
  return (
    <>
      <a className="lien-evitement" href="#contenu">Aller au contenu</a>
      <Tete courant="/moments" verbes={<VerbesSite />} />
      <main id="contenu" style={{ padding: '40px var(--marge) 140px' }}>
        <header className="moment-tete-page">
          <p className="fil-ariane"><Lien href={'/moments#' + m.id}>{P.moments.length} moments</Lien> › <Lien href={'/moments#etape-' + m.etape}>{nomEtape(P, m.etape)}</Lien> › {quand(m)}</p>
          <h1>{m.titre}</h1>
          <p className="moment-resume">{resume(m)}</p>
          <p className="chapeau">{m.description}</p>
        </header>
        <OngletsLectures actif={lecture} choisir={choisir} ids="moment" />
        <div className="moment-grille">
          <ol aria-label="Les moments autour" className="moments-autour">
            {voisins.map(x => <li key={x.id}><Lien href={'/moments/' + x.id + q} aria-current={x.id === m.id ? 'page' : undefined}><span>{quand(x)}</span><span>{x.titre}</span></Lien></li>)}
          </ol>
          <section role="tabpanel" id="moment-panneau" aria-labelledby={'moment-onglet-' + lecture} className="lecture-panneau" tabIndex={0}>
            <Lecture m={m} l={lecture} />
          </section>
        </div>
        <p className="profil-note" style={{ marginTop: 18 }}>{P.note}</p>
      </main>
      <DockBas label="Les lectures du moment" modes={[]}>
        {LECTURES.map(([lid, nom]) => <button key={lid} type="button" className="lieu" aria-current={lid === lecture ? 'true' : 'false'} onClick={() => choisir(lid)}>{nom}</button>)}
        {m.n > 1 && <button type="button" className="lieu" onClick={() => aller('/moments/' + P.moments[m.n - 2].id + q)}>‹ Précédent</button>}
        {m.n < P.moments.length && <button type="button" className="lieu" onClick={() => aller('/moments/' + P.moments[m.n].id + q)}>Suivant ›</button>}
      </DockBas>
      <Pied />
    </>
  );
}

function Introuvable() {
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
