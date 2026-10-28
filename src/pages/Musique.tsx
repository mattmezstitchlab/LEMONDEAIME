import { useEffect, useState } from 'react';
import { Tete, DockBas, VerbesSite, Pied } from '../charte/Charte';
import { EntrerBloc } from '../charte/EntrerBloc';
import { ChoisirMorceau, ListeMorceaux, enPiste } from '../charte/Morceaux';
import { MOMENTS, mesMusiques, type Moment, type Musique as M } from '../lib/musique';
import { jouerListe } from '../lib/lecteur';
import { useSession } from '../lib/session';
import { Lien } from '../lib/router';
import { PROGRAMME, parMusique, plageMusique } from '../lib/programme';

/* La journée en musique : la playlist est la timeline du Jour J. Chaque moment, dans l'ordre, avec ses morceaux à écouter. */
export default function Musique() {
  const session = useSession();
  const [musiques, setMusiques] = useState<M[] | null>(null);
  const [ouvert, setOuvert] = useState<Moment | null>(null);
  useEffect(() => { if (session) mesMusiques().then(r => setMusiques(r.ok ? r.musiques || [] : [])); else if (session === null) setMusiques([]); }, [session]);
  const dans = (m: Moment) => (musiques || []).filter(x => x.moment === m);
  const journee = MOMENTS.flatMap(([m]) => dans(m)).filter(x => !!x.deezer || x.source === 'fichier');
  return (
    <>
      <a className="lien-evitement" href="#contenu">Aller au contenu</a>
      <Tete courant="/musique" verbes={<VerbesSite />} />
      <main id="contenu" style={{ padding: '40px var(--marge) 140px' }}>
        <h1 className="grand-mot" style={{ textAlign: 'center', fontSize: 'clamp(52px, 11vw, 190px)' }}>Musique</h1>
        <p style={{ margin: '18px auto 0', maxWidth: '36rem', textAlign: 'center', fontSize: 'clamp(18px, 1.7vw, 24px)', lineHeight: 1.35 }}>La journée en musique : chaque moment du Jour J, dans l’ordre, avec ses morceaux. La playlist est la timeline.</p>
        <p className="profil-note musique-ici" style={{ margin: '14px auto 0', maxWidth: '36rem', textAlign: 'center' }}>Ici, les morceaux de votre compte. Un fichier écouté depuis le dock du bas reste sur votre appareil : il n’apparaît pas ici.</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginTop: 28 }}>
          {journee.length > 0 && <button type="button" className="bouton noir" onClick={() => jouerListe(journee.map(enPiste))}>Écouter toute la journée · {journee.length} extrait{journee.length > 1 ? 's' : ''}</button>}
        </div>
        {session === null && <div className="musique-entrer"><p className="chapeau" style={{ marginTop: 0 }}>Entrez dans AIME pour composer votre journée : vos morceaux restent dans votre espace.</p><EntrerBloc retour="/musique" /></div>}

        <ol className="journee">
          {MOMENTS.map(([m, nom, texte], k) => {
            const liste = dans(m);
            return <li key={m} id={'moment-' + m} className="moment">
              <div className="moment-tete">
                <span className="moment-num" aria-hidden="true">{String(k + 1).padStart(2, '0')}</span>
                <div><h2>{nom}</h2><p>{texte}</p><p className="moment-programme">{plageMusique(PROGRAMME, m)} · <Lien href={'/moments?lecture=musique#' + parMusique(PROGRAMME, m)[0].id}>{parMusique(PROGRAMME, m).length} moment{parMusique(PROGRAMME, m).length > 1 ? 's' : ''} du programme</Lien></p></div>
                {liste.some(x => !!x.deezer || x.source === 'fichier') && <button type="button" className="opt" onClick={() => jouerListe(liste.filter(x => !!x.deezer || x.source === 'fichier').map(enPiste))}>Écouter ce moment</button>}
              </div>
              {session && musiques && <>
                <ListeMorceaux musiques={liste} modifiable setMusiques={n => setMusiques([...musiques.filter(x => x.moment !== m), ...n])} vide="Pas encore de morceau pour ce moment." />
                {ouvert === m
                  ? <ChoisirMorceau moment={m} compact ajoute={x => setMusiques([...musiques, x])} />
                  : <button type="button" className="opt" style={{ justifySelf: 'start' }} onClick={() => setOuvert(m)}>+ Ajouter un morceau</button>}
              </>}
            </li>;
          })}
        </ol>

        <section className="musique-bientot" aria-labelledby="titre-ensemble">
          <p className="surtitre">Bientôt</p>
          <h2 id="titre-ensemble" className="titre" style={{ maxWidth: '20ch' }}>La playlist de l’union, que tout le monde nourrit.</h2>
          <p className="chapeau">Les mariés, les invités et les prestataires ajoutent leurs morceaux depuis leur carte ; tout arrive dans la playlist du DJ de l’union, rangé par moments. Le DJ garde la main : il valide, déplace, refuse. Plus besoin de rendez-vous pour faire la playlist.</p>
        </section>
        <p className="profil-note" style={{ marginTop: 32 }}>Les extraits de 30 secondes sont lus depuis Deezer, qui en garde les droits ; rien n’est copié ici. Un lien Spotify, YouTube ou Apple Music s’ouvre sur la plateforme.</p>
      </main>
      <DockBas lieux={MOMENTS.map(([m, n]) => ['moment-' + m, n] as [string, string])} label="Les moments du Jour J" />
      <Pied />
    </>
  );
}
