import { useEffect } from 'react';
import { Tete, VerbesSite } from './Charte';
import { Lien, remplacer, useRecherche } from '../lib/router';
import { useLienProgramme } from './ProgrammeUnion';
import { useProgramme, construireSupport, nomMetier, type Programme } from '../lib/programme';

/* Le support imprimable : le même programme, mis en page pour l'A4 et pour un public (l'équipe, les mariés, un métier).
   Seuls les moments de ce public et les champs qui lui sont autorisés (construireSupport) y figurent. */
const CONTENUS: [string, string][] = [['jour', 'Le Jour J'], ['autour', 'De la veille au lendemain'], ['tout', 'Tout le programme']];
const dateLongue = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

function publics(P: Programme) {
  const ids = [...new Set(P.moments.filter(m => m.etape === 'day').flatMap(m => m.metiers))];
  return [['tous', 'Toute l’équipe'], ['maries', 'Les mariés'], ...ids.map(id => [id, nomMetier(P, id)]).sort((a, b) => a[1].localeCompare(b[1], 'fr'))];
}

export function SupportImprimable() {
  const P = useProgramme(), L = useLienProgramme();
  const q = new URLSearchParams(useRecherche());
  const liste = publics(P);
  const pour = liste.some(x => x[0] === q.get('pour')) ? q.get('pour')! : 'tous';
  const contenu = CONTENUS.some(x => x[0] === q.get('contenu')) ? q.get('contenu') as 'jour' | 'autour' | 'tout' : 'jour';
  const s = construireSupport(P, { pour, contenu });
  const changer = (k: string, v: string) => { const u = new URL(location.href); u.searchParams.set(k, v); remplacer(u.pathname + u.search); };
  useEffect(() => { document.title = 'Support · ' + s.pour + ' · ' + s.titre; }, [s.pour, s.titre]);
  const avec = (c: string) => s.champs.includes(c);
  const colonne = avec('metiers') ? 'Avec' : avec('personnes') ? 'Qui' : 'Responsables';
  return (
    <>
      <div className="ecran-seul"><Tete courant="/moments" verbes={<VerbesSite />} /></div>
      <main id="contenu" className="support-page">
        <div className="support-outils ecran-seul">
          <Lien href={L('/moments')} className="opt">‹ Les moments</Lien>
          <label>Pour<select className="champ" value={pour} onChange={e => changer('pour', e.target.value)}>{liste.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select></label>
          <label>Contenu<select className="champ" value={contenu} onChange={e => changer('contenu', e.target.value)}>{CONTENUS.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select></label>
          <button type="button" className="bouton noir" onClick={() => window.print()}>Imprimer ou enregistrer en PDF</button>
        </div>
        <article className="feuille" aria-label={'Support imprimable : ' + s.pour}>
          <header className="feuille-tete">
            <p className="feuille-sur">{s.reference ? 'Grille 200 de référence · union d’exemple' : 'Programme de l’union'}</p>
            <h1>{s.titre}</h1>
            <p className="feuille-ou">{s.lieu} · {dateLongue(s.jour)}</p>
            <dl className="feuille-infos"><div><dt>Support</dt><dd>{s.pour}</dd></div><div><dt>Contenu</dt><dd>{CONTENUS.find(x => x[0] === contenu)![1]}</dd></div><div><dt>Moments</dt><dd>{s.total}</dd></div></dl>
          </header>
          {s.sections.map(sec => <section key={sec.id} className="feuille-section" aria-labelledby={'f-' + sec.id}>
            <h2 id={'f-' + sec.id}>{sec.nom}<span>{sec.repere} · {sec.moments.length} moment{sec.moments.length > 1 ? 's' : ''}</span></h2>
            <table>
              <thead><tr><th scope="col">Heure</th><th scope="col">Moment</th><th scope="col">Lieu</th><th scope="col">{colonne}</th></tr></thead>
              <tbody>{sec.moments.map(l => <tr key={l.id}>
                <td className="f-h">{l.heure}</td>
                <td className="f-t"><b>{l.titre}</b>{l.description && <span>{l.description}</span>}{l.consignes && <ul>{l.consignes.map(c => <li key={c}>{c}</li>)}</ul>}</td>
                <td className="f-l">{l.lieu}</td>
                <td className="f-q">{(l.metiers || l.personnes || l.responsables || []).join(', ')}</td>
              </tr>)}</tbody>
            </table>
          </section>)}
          {!s.total && <p>Aucun moment pour ce public dans ce contenu.</p>}
          <footer className="feuille-pied">{s.reference ? 'Union d’exemple, horaires illustratifs : à adapter à chaque union. ' : ''}LE MONDE AIME · lemondeaime.com</footer>
        </article>
      </main>
    </>
  );
}
