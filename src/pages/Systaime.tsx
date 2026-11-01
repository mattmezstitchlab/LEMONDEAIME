import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Tete, DockBas, VerbesProjets, Pied } from '../charte/Charte';
import { Lien } from '../lib/router';
import { useSession } from '../lib/session';
import { useTheme, CHOIX_THEMES } from '../../studio/src/design/theme';
import '../../studio/src/design/aime.css';
import '../systaime/systaime.css';
import PUBLIQUE from '../systaime/publique.json';

/* SYST'AIME : la source de vérité de LE MONDE AIME — ce que le code, les tests et les décisions humaines prouvent, et ce qu'ils ne prouvent pas.
   Version publique : expurgée (pas de chemins, pas de détails de sécurité), embarquée dans la page.
   Détail interne : servi par /api/systaime aux seules adresses de l'administration (vérifié par le serveur) ; jamais dans le bundle.
   Les couleurs viennent de aime.css ([data-aime]) ; aucun jeton nouveau. Une couleur ne porte jamais seule un état : chaque état a aussi un signe et un trait. */

type Cas = { id: string; type: string; theme: string | null; couche: string | null; nom: string; resume: string | null; etat: string };
type Axe = { etat: string; [k: string]: unknown };
type Interne = {
  id: string; name: string; role: string; kind: string;
  canonique: { repo: string; path: string; commit: string | null } | null;
  existence: Axe & { fichiers: { path: string; blob: string }[]; note?: string };
  couverture: Axe & { mesure: string; tests: { path: string; blob: string }[] };
  derniere_execution: Axe & { date?: string; commit?: string; commande?: string; detail?: string };
  validation_fonctionnelle: Axe & { par: string | null; date: string | null; portee: string | null };
  appreciation_audit: { statut: string; justification: string };
  contradicts: string[];
};
type Composant = { id: string; nom: string; inventaire: string; fichiers: string[]; justification: string; verification: { type: string; motif?: string; chemin?: string } };
type Dependance = { de: string; a: string; type: string; note?: string; justification?: string; statut?: string; force?: string };
type Detail = { version: string; approuve_manifeste: boolean; empreintes_prises_sur: string; fraicheur_enregistree?: { etat: string; verifie_le: string }; responsabilite: { fonctionnel: { nom: string; statut: string; approuve: boolean } }; rules: Interne[]; composants: Composant[]; dependances: Dependance[] };

const THEMES: [string, string, string][] = [
  ['visuel', 'Visuel', 'Ce que l’on voit : couleurs, typographie, composants, thèmes Nuit et Jour.'],
  ['interaction', 'Interaction', 'Ce que l’on fait : gestes, clavier, Disque, Point.'],
  ['donnees', 'Données', 'Ce qui est gardé : formats, contrats, sérialisation.'],
  ['relations', 'Relations', 'Ce qui relie : personnes, droits, mémoire partagée.'],
  ['restitution', 'Restitution', 'Ce qui sort : PDF, SVG, exports.'],
  ['memoire', 'Mémoire', 'Ce qui revient : reprise, versions, historique.'],
];
const COUCHES: [string, string, string][] = [
  ['principes', 'Principes', 'La règle écrite.'], ['tokens', 'Tokens', 'Les valeurs de base.'], ['composants', 'Composants', 'Les pièces qui existent.'],
  ['contrats', 'Contrats', 'Ce qui est promis entre pièces.'], ['tests', 'Tests', 'Ce qui est rejoué.'], ['versions', 'Versions', 'Ce qui change et se retrouve.'],
];
const GLYPHE: Record<string, string> = { validee: 'V', 'a-reverifier': 'R', 'test-echoue': '!', 'teste-reussi': 'T', 'teste-non-rejoue': 't', 'present-sans-test': 'P', 'hors-depot': 'H', rien: '∅', reserve: '◌' };
const ORDRE = ['validee', 'teste-reussi', 'teste-non-rejoue', 'present-sans-test', 'a-reverifier', 'test-echoue', 'hors-depot', 'rien', 'reserve'];
const INVENTAIRE: Record<string, [string, string]> = {
  utilise: ['Utilisé', 'Atteint par une route ou un import réel.'],
  'existant-inaccessible': ['Existant mais inaccessible', 'Le code existe, mais aucune adresse publique n’y mène.'],
  'prototype-non-raccorde': ['Prototype non raccordé', 'Le code existe, rien ne le charge.'],
  'doublon-potentiel': ['Doublon potentiel', 'Plusieurs pièces semblent faire la même chose.'],
  abandonne: ['Abandonné', 'Décidé comme tel par une personne : aucun élément n’est classé ainsi pour l’instant.'],
  'a-construire': ['À construire', 'Étudié ou voulu, pas encore écrit.'],
};
const TYPE_DEP: Record<string, string> = { import_technique: 'Import technique', partage_de_donnees: 'Partage de données', dependance_metier: 'Dépendance métier' };
const lib = (k: string) => (PUBLIQUE.libelles as Record<string, { titre: string; texte: string }>)[k];
const cases = PUBLIQUE.cases as Cas[];

/* l'échiquier : 6 × 6 croisements dans le coin, les 28 garde-fous en L autour (2 colonnes à droite, 2 lignes en bas) = 8 × 8 */
function placer(): (Cas | null)[][] {
  const g: (Cas | null)[][] = Array.from({ length: 8 }, () => Array<Cas | null>(8).fill(null));
  THEMES.forEach(([t], i) => COUCHES.forEach(([c], j) => { g[i][j] = cases.find(x => x.theme === t && x.couche === c) || null; }));
  cases.filter(x => x.type === 'garde-fou').forEach((x, k) => { if (k < 12) g[Math.floor(k / 2)][6 + (k % 2)] = x; else { const n = k - 12; g[6 + Math.floor(n / 8)][n % 8] = x; } });
  return g;
}
const COURT = (s: string) => (s.length > 9 ? s.slice(0, 8) + '…' : s);

function Echiquier({ choisi, onChoisir, filtre }: { choisi: string; onChoisir: (id: string) => void; filtre: string }) {
  const grille = useMemo(placer, []);
  const [pos, setPos] = useState<[number, number]>([0, 0]);
  const refs = useRef<(HTMLButtonElement | null)[][]>(Array.from({ length: 8 }, () => Array(8).fill(null)));
  const aller = (r: number, c: number) => { const nr = Math.max(0, Math.min(7, r)), nc = Math.max(0, Math.min(7, c)); setPos([nr, nc]); refs.current[nr][nc]?.focus(); };
  function touche(e: KeyboardEvent, r: number, c: number) {
    const k = e.key; const m: Record<string, [number, number]> = { ArrowRight: [r, c + 1], ArrowLeft: [r, c - 1], ArrowDown: [r + 1, c], ArrowUp: [r - 1, c], Home: [r, 0], End: [r, 7], PageUp: [0, c], PageDown: [7, c] };
    if (m[k]) { e.preventDefault(); aller(...m[k]); }
  }
  return (
    <table className="sy-table" role="grid" aria-label="Échiquier de 64 cases : six thèmes par six couches, entourés des 28 garde-fous. Flèches pour se déplacer, Entrée pour lire une case." aria-rowcount={9} aria-colcount={9}>
      <thead><tr><td className="sy-coin" />{COUCHES.map(([id, nom]) => <th key={id} scope="col" className="sy-ent" abbr={nom}><span className="sy-long">{nom}</span><span className="sy-court">{nom.slice(0, 3)}</span></th>)}<th scope="col" colSpan={2} className="sy-ent sy-gf">Garde-fous</th></tr></thead>
      <tbody>{grille.map((ligne, r) => (
        <tr key={r}>
          <th scope="row" className="sy-ent sy-ent-l">{r < 6 ? <><span className="sy-long">{THEMES[r][1]}</span><span className="sy-court">{THEMES[r][1].slice(0, 3)}</span></> : <span className="sy-gf" aria-label="Garde-fous"><span className="sy-long">Garde-fous</span><span className="sy-court">G</span></span>}</th>
          {ligne.map((x, c) => {
            if (!x) return <td key={c} />;
            const att = filtre && x.etat !== filtre;
            return (
              <td key={c} role="gridcell" aria-selected={choisi === x.id} className={'sy-td' + (x.type === 'garde-fou' ? ' gf' : '')}>
                <button ref={el => { refs.current[r][c] = el; }} type="button" tabIndex={pos[0] === r && pos[1] === c ? 0 : -1} data-etat={x.etat} data-att={att ? '1' : undefined} aria-current={choisi === x.id ? 'true' : undefined}
                  aria-label={x.nom + ' — ' + lib(x.etat).titre} onFocus={() => setPos([r, c])} onKeyDown={e => touche(e, r, c)} onClick={() => onChoisir(x.id)} className="sy-case">
                  <span className="sy-g" aria-hidden="true">{GLYPHE[x.etat]}</span>
                  {x.type === 'garde-fou' && <span className="sy-n" aria-hidden="true">{COURT(x.nom)}</span>}
                </button>
              </td>
            );
          })}
        </tr>
      ))}</tbody>
    </table>
  );
}

const court = (h: string) => h.slice(0, 7);
function FicheInterne({ r }: { r: Interne }) {
  const v = r.validation_fonctionnelle, x = r.derniere_execution;
  return (
    <dl className="sy-axes">
      <div><dt>1 · Le code existe ?</dt><dd><b>{r.existence.etat}</b>{r.existence.fichiers.length ? <ul>{r.existence.fichiers.map(f => <li key={f.path}><code>{f.path}</code> <small>empreinte {court(f.blob)}</small></li>)}</ul> : <p>{r.existence.note || 'Aucun fichier.'}</p>}</dd></div>
      <div><dt>2 · Des tests y sont reliés ?</dt><dd><b>{r.couverture.etat}</b><p>{r.couverture.mesure}</p>{r.couverture.tests.length > 0 && <ul>{r.couverture.tests.map(t => <li key={t.path}><code>{t.path}</code></li>)}</ul>}</dd></div>
      <div><dt>3 · Dernière exécution</dt><dd><b>{x.etat}</b>{x.date ? <p>{x.date} · commit <code>{court(String(x.commit))}</code> · <code>{x.commande}</code>{x.detail ? ' — ' + x.detail : ''}</p> : <p>{x.detail || 'Non rejouée.'}</p>}</dd></div>
      <div><dt>4 · Validé par une personne ?</dt><dd><b>{v.etat}</b><p>{v.etat === 'validee' ? `${v.par} · ${v.date} · ${v.portee}` : 'Personne n’a encore validé ce point. Un test réussi n’en tient pas lieu.'}</p></dd></div>
      <div><dt>Appréciation de l’audit</dt><dd><b>{r.appreciation_audit.statut}</b>{r.appreciation_audit.justification && <p>{r.appreciation_audit.justification}</p>}</dd></div>
      {r.canonique && <div><dt>Source canonique</dt><dd><code>{r.canonique.repo}:{r.canonique.path}</code></dd></div>}
      {r.contradicts.length > 0 && <div><dt>Contredit</dt><dd>{r.contradicts.join(', ')}</dd></div>}
    </dl>
  );
}

export default function Systaime() {
  const { choix, theme, choisir } = useTheme();
  const session = useSession();
  const [choisi, setChoisi] = useState('visuel.tokens');
  const [filtre, setFiltre] = useState('');
  const [detail, setDetail] = useState<Detail | null>(null);
  const [acces, setAcces] = useState<'public' | 'chargement' | 'interne' | 'refuse'>('public');
  useEffect(() => { document.title = 'SYST’AIME — la source de vérité de LE MONDE AIME'; }, []);
  useEffect(() => {
    if (!session) { setDetail(null); setAcces('public'); return; }
    let vivant = true; setAcces('chargement');
    fetch('/api/systaime', { credentials: 'same-origin', cache: 'no-store' }).then(async r => {
      if (!vivant) return;
      if (r.ok) { const j = await r.json(); setDetail(j.manifeste as Detail); setAcces('interne'); } else { setDetail(null); setAcces('refuse'); }
    }).catch(() => { if (vivant) setAcces('public'); });
    return () => { vivant = false; };
  }, [session]);

  const cas = cases.find(x => x.id === choisi) || cases[0];
  const interne = detail && detail.rules.find(x => x.id === cas.id);
  const n = filtre ? cases.filter(x => x.etat === filtre).length : cases.length;
  const decompte = PUBLIQUE.decompte as Record<string, number>;
  const inv = PUBLIQUE.inventaire.par_categorie as Record<string, number>;
  const gardeFous = cases.filter(x => x.type === 'garde-fou');

  return (
    <>
      <a className="lien-evitement" href="#contenu">Aller au contenu</a>
      <Tete courant="/systaime" verbes={<VerbesProjets />} />
      <div data-aime={theme} className="sy">
        <main id="contenu" className="sy-in">
          <header className="sy-tete">
            <p className="sy-sur">SYST’AIME · version {PUBLIQUE.version}</p>
            <h1>Ce que LE MONDE AIME sait vraiment de lui-même.</h1>
            <p className="sy-chapeau">Une source de vérité fondée sur le code, les preuves, les contrats et les décisions humaines : pas une documentation. Chaque case dit ce qui existe, ce qui est testé, ce qui a été rejoué — et ce que personne n’a encore validé.</p>
            <div className="sy-barre">
              <div role="radiogroup" aria-label="Thème d’affichage" className="sy-seg">
                {CHOIX_THEMES.map(t => <button key={t.id} type="button" role="radio" aria-checked={choix === t.id} onClick={() => choisir(t.id)}>{t.nom}</button>)}
              </div>
              <p className="sy-acces" role="status">
                {acces === 'interne' ? 'Vue administration : le détail interne est affiché.' : acces === 'chargement' ? 'Vérification de votre accès…' : 'Vue publique expurgée : ni chemins, ni détails de sécurité.'}
                {acces === 'refuse' && ' Votre compte n’a pas accès au détail.'}
                {!session && <> <Lien href="/entrer">Entrer</Lien> pour demander le détail.</>}
              </p>
            </div>
          </header>

          <section aria-labelledby="sy-etats" className="sy-bloc">
            <h2 id="sy-etats">Neuf façons d’être « vrai »</h2>
            <p className="sy-note">Le libellé de chaque case est <b>calculé</b> à partir de quatre constats séparés : le code existe, des tests y sont reliés, la dernière exécution, la validation par une personne. Il n’est jamais saisi à la main. Filtrez par état :</p>
            <div className="sy-filtre" role="group" aria-label="Filtrer l’échiquier par état">
              <button type="button" aria-pressed={filtre === ''} onClick={() => setFiltre('')}>Toutes <span>{cases.length}</span></button>
              {ORDRE.filter(k => decompte[k]).map(k => <button key={k} type="button" data-etat={k} aria-pressed={filtre === k} onClick={() => setFiltre(filtre === k ? '' : k)}><span className="sy-g" aria-hidden="true">{GLYPHE[k]}</span> {lib(k).titre} <span>{decompte[k]}</span></button>)}
            </div>
            <p className="sr-only" role="status" aria-live="polite">{n} case{n > 1 ? 's' : ''} affichée{n > 1 ? 's' : ''} sur 64.</p>
          </section>

          <section aria-labelledby="sy-echiquier" className="sy-bloc sy-duo">
            <div>
              <h2 id="sy-echiquier">L’échiquier de 64 cases</h2>
              <Echiquier choisi={choisi} onChoisir={setChoisi} filtre={filtre} />
              <p className="sy-note">36 croisements (6 thèmes × 6 couches) et 28 garde-fous. Aucune case n’est « validée » : cela exige une personne, une date, un commit et une portée.</p>
            </div>
            <aside className="sy-fiche" aria-labelledby="sy-fiche-t" aria-live="polite">
              <p className="sy-sur">{cas.type === 'garde-fou' ? 'Garde-fou' : 'Croisement'}</p>
              <h3 id="sy-fiche-t">{cas.nom}</h3>
              <p className="sy-etat" data-etat={cas.etat}><span className="sy-g" aria-hidden="true">{GLYPHE[cas.etat]}</span> <b>{lib(cas.etat).titre}</b></p>
              <p>{lib(cas.etat).texte}</p>
              {cas.resume && <p className="sy-note">{cas.resume}</p>}
              {interne ? <FicheInterne r={interne} /> : <p className="sy-note">Le détail (fichiers, tests, exécutions, justification) est réservé à l’administration.</p>}
              <p className="sy-limite"><b>Ce que cet état ne dit pas.</b> Un test réussi ne prouve pas que toutes les règles du composant sont satisfaites ; un fichier présent n’est pas une fonction prouvée.</p>
            </aside>
          </section>

          <section aria-labelledby="sy-six" className="sy-bloc">
            <h2 id="sy-six">Six thèmes, six couches</h2>
            <div className="sy-deux">
              <dl>{THEMES.map(([id, nom, txt]) => <div key={id}><dt>{nom}</dt><dd>{txt}</dd></div>)}</dl>
              <dl>{COUCHES.map(([id, nom, txt]) => <div key={id}><dt>{nom}</dt><dd>{txt}</dd></div>)}</dl>
            </div>
          </section>

          <section aria-labelledby="sy-gf" className="sy-bloc">
            <h2 id="sy-gf">Les 28 garde-fous</h2>
            <ul className="sy-liste">{gardeFous.map(g => <li key={g.id}><button type="button" data-etat={g.etat} onClick={() => { setChoisi(g.id); document.getElementById('sy-echiquier')?.scrollIntoView({ block: 'start' }); }}><span className="sy-g" aria-hidden="true">{GLYPHE[g.etat]}</span> {g.nom}<span className="sr-only"> — {lib(g.etat).titre}</span></button></li>)}</ul>
            <p className="sy-note">Les garde-fous de sécurité et d’exploitation affichent « détail réservé » : leur état précis n’est pas public.</p>
          </section>

          <section aria-labelledby="sy-oublis" className="sy-bloc">
            <h2 id="sy-oublis">Les créations à retrouver</h2>
            <p className="sy-note">SYST’AIME inventorie ce qui existe déjà sans être raccordé. <b>Rien n’est réactivé automatiquement.</b> {PUBLIQUE.inventaire.total} éléments sont classés pour cette première version.</p>
            <ul className="sy-inv">{Object.entries(INVENTAIRE).map(([k, [nom, txt]]) => <li key={k}><b>{nom}</b> <span className="sy-compte">{inv[k] || 0}</span><span>{txt}</span></li>)}</ul>
            {detail ? (
              <div className="sy-tab" role="region" aria-label="Inventaire détaillé" tabIndex={0}>
                <table><caption>Composants inventoriés (détail interne)</caption><thead><tr><th scope="col">Composant</th><th scope="col">Classement</th><th scope="col">Pourquoi, et comment la machine le vérifie</th></tr></thead>
                  <tbody>{detail.composants.map(c => <tr key={c.id}><th scope="row">{c.nom}</th><td>{INVENTAIRE[c.inventaire][0]}</td><td>{c.justification}<br /><small>{c.fichiers.map(f => <code key={f}>{f} </code>)}</small></td></tr>)}</tbody></table>
              </div>
            ) : <p className="sy-note">Le détail des éléments est réservé à l’administration.</p>}
          </section>

          {detail && (
            <section aria-labelledby="sy-dep" className="sy-bloc">
              <h2 id="sy-dep">Dépendances (détail interne)</h2>
              <p className="sy-note">Trois sortes de liens, jamais mélangées : un <b>import technique</b> est relu dans le code ; un <b>partage de données</b> a une preuve plus ou moins forte ; une <b>dépendance métier</b> est une proposition tant qu’une personne ne l’a pas validée.</p>
              <div className="sy-tab" role="region" aria-label="Dépendances" tabIndex={0}>
                <table><thead><tr><th scope="col">Type</th><th scope="col">De</th><th scope="col">Vers</th><th scope="col">Statut</th></tr></thead>
                  <tbody>{detail.dependances.map((d, i) => <tr key={i}><th scope="row">{TYPE_DEP[d.type]}</th><td><code>{d.de}</code></td><td><code>{d.a}</code></td><td>{d.type === 'dependance_metier' ? 'proposée, non validée' : d.type === 'partage_de_donnees' ? 'preuve ' + d.force : 'relu dans le code'}</td></tr>)}</tbody></table>
              </div>
            </section>
          )}

          <section aria-labelledby="sy-ne" className="sy-bloc">
            <h2 id="sy-ne">Ce que SYST’AIME ne prouve pas</h2>
            <ul className="sy-puces">
              <li>Il ne remplace pas une relecture : une empreinte différente dit « ce fichier a changé », pas « le changement compte ».</li>
              <li>Il ne mesure pas la couverture de lignes : « test relié » veut dire qu’un test est cité comme preuve, et que son fichier existe.</li>
              <li>Il ne dit rien de l’usage sur téléphone ou lecteur d’écran tant que cela n’a pas été essayé.</li>
              <li>Il n’est pas approuvé : {detail ? `responsable fonctionnel proposé, ${detail.responsabilite.fonctionnel.nom}, à titre provisoire, sous réserve de son approbation.` : 'le manifeste attend l’approbation de son responsable fonctionnel.'}</li>
            </ul>
          </section>
        </main>
      </div>
      <Pied />
      <DockBas />
    </>
  );
}
