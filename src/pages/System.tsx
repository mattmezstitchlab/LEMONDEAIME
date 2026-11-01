import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Tete, DockBas, Pied } from '../charte/Charte';
import { Lien } from '../lib/router';
import { ROSACE } from '../lib/entreesBroderie.mjs';
import { useConfortPartage } from '../rosace/useConfortPartage';
import { useTheme, CHOIX_THEMES } from '../../studio/src/design/theme';
import '../../studio/src/design/aime.css';
import '../system/system.css';
import C from '../system/contenu.json';
import { CASES, GLYPHE, MANIFESTE_PUBLIC, ORDRE, VERSION_MANIFESTE, placer } from '../system/lecture';
import { NOMS_COUCHES, NOMS_THEMES } from '../../studio/src/lib/fiche/syst';

/* AIME SYSTEM : la page qui présente ce que LE MONDE AIME sait faire, avec l'état réel de chaque chose.
   Source canonique : la version publique du manifeste SYST'AIME, la même que lit /systaime (src/systaime/publique.json).
   Le texte des sections vit dans src/system/contenu.json : un test y interdit les prix et exige une preuve pour tout « réel ».
   Le Disque et la démo broderie sont chargés à la demande. Page préparatoire : non indexée. */

const DisqueDemo = lazy(() => import('../system/DisqueDemo'));
const FicheEchiquier = lazy(() => import('../system/FicheEchiquier'));
const DemoBroderie = lazy(() => import('../system/DemoBroderie'));

type Statut = keyof typeof C.statuts;
const DEPART = 'dmc-310';
const lib = (k: string) => (MANIFESTE_PUBLIC.libelles[k] ?? { titre: k, texte: '' });

function Statut({ s }: { s: string }) {
  const st = C.statuts[s as Statut];
  return <span className="sys-statut" data-statut={s}><span className="sys-statut-g" aria-hidden="true">{st.glyphe}</span>{st.nom}</span>;
}
function Section({ id, titre, statut, texte, children, large }: { id: string; titre: string; statut?: string; texte?: string; children?: ReactNode; large?: boolean }) {
  return <section className={'sys-section' + (large ? ' large' : '')} aria-labelledby={id + '-t'} id={id}>
    <header className="sys-section-tete">
      {statut && <Statut s={statut} />}
      <h2 id={id + '-t'} tabIndex={-1}>{titre}</h2>
      {texte && <p className="sys-texte">{texte}</p>}
    </header>
    {children}
  </section>;
}
const Attente = ({ nom }: { nom: string }) => <p className="sys-attente" role="status">Chargement : {nom}…</p>;

/* le choix courant vit dans l'adresse (?o=dmc-310) : un lien partage exactement la fiche regardée */
function lireChoix(): string {
  try { const o = new URLSearchParams(window.location.search).get('o'); if (o && /^(dmc|syst)-[A-Za-z0-9._-]{1,76}$/.test(o)) return o; } catch { /* adresse illisible */ }
  return DEPART;
}

function Echiquier({ courante, onChoisir }: { courante: string; onChoisir: (a: string) => void }) {
  const grille = useMemo(() => placer(CASES, MANIFESTE_PUBLIC.themes, MANIFESTE_PUBLIC.couches), []);
  const [pos, setPos] = useState<[number, number]>([0, 0]);
  const refs = useRef<(HTMLButtonElement | null)[][]>(Array.from({ length: 8 }, () => Array(8).fill(null)));
  const aller = (r: number, c: number) => { const nr = Math.max(0, Math.min(7, r)), nc = Math.max(0, Math.min(7, c)); setPos([nr, nc]); refs.current[nr][nc]?.focus(); };
  const touche = (e: KeyboardEvent, r: number, c: number) => {
    const m: Record<string, [number, number]> = { ArrowRight: [r, c + 1], ArrowLeft: [r, c - 1], ArrowDown: [r + 1, c], ArrowUp: [r - 1, c], Home: [r, 0], End: [r, 7] };
    if (m[e.key]) { e.preventDefault(); aller(...m[e.key]); }
  };
  return <div className="sys-tab" role="region" aria-label="Échiquier des 64 cases" tabIndex={0}>
    <table className="sys-echiquier" role="grid" aria-label="64 cases : six thèmes par six couches, et 28 garde-fous. Flèches pour se déplacer, Entrée pour ouvrir la fiche.">
      <thead><tr><td />{MANIFESTE_PUBLIC.couches.map(c => <th key={c} scope="col">{(NOMS_COUCHES[c] ?? c).slice(0, 4)}</th>)}<th scope="col" colSpan={2}>Garde-fous</th></tr></thead>
      <tbody>{grille.map((ligne, r) => <tr key={r}>
        <th scope="row">{r < 6 ? (NOMS_THEMES[MANIFESTE_PUBLIC.themes[r]] ?? '').slice(0, 5) : 'G'}</th>
        {ligne.map((x, c) => !x ? <td key={c} /> : <td key={c} role="gridcell" aria-selected={courante === 'syst-' + x.id}>
          <button ref={el => { refs.current[r][c] = el; }} type="button" tabIndex={pos[0] === r && pos[1] === c ? 0 : -1} data-etat={x.etat}
            aria-current={courante === 'syst-' + x.id ? 'true' : undefined} aria-label={`${x.nom} — ${lib(x.etat).titre}`}
            onFocus={() => setPos([r, c])} onKeyDown={e => touche(e, r, c)} onClick={() => onChoisir('syst-' + x.id)}>
            <span aria-hidden="true">{GLYPHE[x.etat]}</span>
          </button></td>)}
      </tr>)}</tbody>
    </table>
  </div>;
}

export default function System() {
  useConfortPartage(true);
  const { choix, theme, choisir } = useTheme();
  const [courante, setCourante] = useState(lireChoix);
  /* la fiche du Disque ne suit que les choix faits dans le Disque : choisir une case plus bas ne change pas la hauteur d'une zone située au-dessus (décalage de 58 px sur téléphone) */
  const [courDisque, setCourDisque] = useState(courante);
  const vu = useRef(false);
  const [disqueVu, setDisqueVu] = useState(false);
  const [broderieVue, setBroderieVue] = useState(false);
  const disqueRef = useRef<HTMLDivElement>(null);
  const broderieRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = 'AIME SYSTEM — l’intelligence qui relie ce que vous créez';
    const m = document.createElement('meta'); m.name = 'robots'; m.content = 'noindex, nofollow'; document.head.appendChild(m);
    return () => { m.remove(); };
  }, []);
  const choisirFiche = useCallback((a: string) => {
    setCourante(a);
    try { const u = new URL(window.location.href); u.searchParams.set('o', a); window.history.replaceState(null, '', u.pathname + u.search + u.hash); } catch { /* adresse non modifiable */ }
  }, []);
  const choisirDisque = useCallback((a: string) => { setCourDisque(a); choisirFiche(a); }, [choisirFiche]);
  useEffect(() => { if (!vu.current) { vu.current = true; if (new URLSearchParams(window.location.search).get('o')) setDisqueVu(true); } }, []);
  useEffect(() => {   // le Disque et la broderie ne se chargent que lorsqu'ils approchent de l'écran
    if (typeof IntersectionObserver === 'undefined') { setDisqueVu(true); setBroderieVue(true); return; }
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { if (e.target === disqueRef.current) setDisqueVu(true); if (e.target === broderieRef.current) setBroderieVue(true); } }), { rootMargin: '300px' });
    if (disqueRef.current) io.observe(disqueRef.current); if (broderieRef.current) io.observe(broderieRef.current);
    return () => io.disconnect();
  }, []);

  const decompte = MANIFESTE_PUBLIC.decompte;
  const S = C.sections;
  const nomChoisi = CASES.find(x => 'syst-' + x.id === courante)?.nom;

  return <>
    <a className="lien-evitement" href="#contenu">Aller au contenu</a>
    <Tete courant="/system" />
    <div data-aime={theme} className="sys">
      <main id="contenu" className="sys-in">
        <header className="sys-hero">
          <span className="sys-orbe" aria-hidden="true" />
          <p className="sys-sur">{C.hero.sur} · SYST’AIME {VERSION_MANIFESTE}</p>
          <h1>{C.hero.titre} <span className="sys-fondu">{C.hero.titreFondu}</span></h1>
          <p className="sys-chapeau">{C.hero.texte}</p>
          <div className="sys-actions">
            <a className="sys-bouton primaire" href="#disque" onClick={() => setDisqueVu(true)}>{C.hero.actions[0][0]}</a>
            <Lien className="sys-bouton" href={C.hero.actions[1][1]}>{C.hero.actions[1][0]}</Lien>
            <a className="sys-bouton" href="#rosace">{S.rosace.ancre}</a>
          </div>
          <div className="sys-barre">
            <div role="radiogroup" aria-label="Thème d’affichage" className="sys-seg">
              {CHOIX_THEMES.map(t => <button key={t.id} type="button" role="radio" aria-checked={choix === t.id} onClick={() => choisir(t.id)}>{t.nom}</button>)}
            </div>
            <details className="sys-legende">
              <summary>Les quatre états</summary>
              <ul>{(Object.keys(C.statuts) as Statut[]).map(k => <li key={k}><Statut s={k} /><span>{C.statuts[k].sens}</span></li>)}</ul>
            </details>
          </div>
        </header>

        <Section id="disque" large titre={S.disque.titre} statut={S.disque.statut} texte={S.disque.texte}>
          <div ref={disqueRef} className="sys-reserve">
            {disqueVu ? <Suspense fallback={<Attente nom="le Disque" />}><DisqueDemo courante={courDisque} onChoisir={choisirDisque} /></Suspense> : <Attente nom="le Disque" />}
          </div>
        </Section>

        <Section id="rosace" large titre={S.rosace.titre} statut={S.rosace.statut} texte={S.rosace.texte}>
          <div className="sys-rosace-actions">
            <p className="sys-note" id="sys-rosace-guide">{S.rosace.cadre}</p>
            <Lien className="sys-bouton" href={ROSACE}>{S.rosace.ouvrir}</Lien>
          </div>
          {/* La page canonique, isolée dans son propre document : pas de copie du moteur,
              ni de conflit d'ancres, de styles ou de Points avec le Disque SYST'AIME. */}
          <iframe className="sys-rosace-cadre" src={ROSACE + '&apercu=system'} title="Page ROSACE complète et interactive" aria-describedby="sys-rosace-guide" loading="lazy" />
        </Section>

        <Section id="capacites" titre={S.capacites.titre} texte={S.capacites.texte}>
          <ul className="sys-cartes">{C.capacites.map(k => <li key={k.id} className="sys-carte" data-statut={k.statut}>
            <Statut s={k.statut} /><h3>{k.nom}</h3><p>{k.promesse}</p>
            <dl><div><dt>Existe</dt><dd>{k.reel}</dd></div><div><dt>Reste</dt><dd>{k.reste}</dd></div>
              {'preuve' in k && k.preuve && <div><dt>Preuve</dt><dd><code>{k.preuve.fichier}</code></dd></div>}</dl>
          </li>)}</ul>
        </Section>

        <Section id="echiquier" titre={S.echiquier.titre} statut={S.echiquier.statut} texte={S.echiquier.texte}>
          <div className="sys-echiquier-grille">
            <div className="sys-echiquier-col">
              <ul className="sys-cubes" aria-label="Les six thèmes">{MANIFESTE_PUBLIC.themes.map(t => <li key={t}>
                <button type="button" className="sys-cube" aria-pressed={courante.startsWith(`syst-${t}.`)} onClick={() => choisirFiche(`syst-${t}.principes`)}>
                  <b>{NOMS_THEMES[t] ?? t}</b><span>{CASES.filter(x => x.theme === t).length} cases</span></button></li>)}</ul>
              <Echiquier courante={courante} onChoisir={choisirFiche} />
              <ul className="sys-compte" aria-label="Décompte des états du manifeste">
                {ORDRE.filter(k => decompte[k]).map(k => <li key={k} data-etat={k}><span aria-hidden="true" className="sys-g">{GLYPHE[k]}</span>{lib(k).titre}<b>{decompte[k]}</b></li>)}
              </ul>
            </div>
            <div className="sys-fiche sys-fiche-collante" role="region" aria-label="Fiche de l'élément choisi">
              <Suspense fallback={<Attente nom="la fiche" />}><FicheEchiquier courante={courante} onChoisir={choisirFiche} /></Suspense>
            </div>
          </div>
          <p className="sr-only" role="status" aria-live="polite">{nomChoisi ? `Case choisie : ${nomChoisi}.` : ''}</p>
        </Section>

        <Section id="sources" titre={S.sources.titre} statut={S.sources.statut} texte={S.sources.texte}>
          <ol className="sys-etats">{C.jumeau.etats.map(([n, t]) => <li key={n}><b>{n}</b><span>{t}</span></li>)}</ol>
          <p className="sys-note">{C.jumeau.regle}</p>
        </Section>

        <Section id="ripple" titre={S.ripple.titre} statut={S.ripple.statut} texte={S.ripple.texte}>
          <div className="sys-duo">
            <div><h3>Ce qu’une conséquence peut être</h3><ul>{C.ripple.separations.map(s => <li key={s}>{s}</li>)}</ul></div>
            <div><h3>Quel degré de preuve</h3><dl>{C.ripple.preuves.map(([n, t]) => <div key={n}><dt>{n}</dt><dd>{t}</dd></div>)}</dl></div>
          </div>
          <p className="sys-note">{C.ripple.regle}</p>
        </Section>

        <Section id="demos" titre={S.demos.titre} texte={S.demos.texte}>
          <div className="sys-demos">{C.demos.map(d => <article key={d.id} className="sys-demo" data-statut={d.statut}>
            <header><Statut s={d.statut} /><h3>{d.nom}</h3><p>{d.texte}</p></header>
            {d.id === 'broderie' && <div ref={broderieRef} className="sys-reserve">
              {broderieVue ? <Suspense fallback={<Attente nom="le motif" />}><DemoBroderie /></Suspense> : <Attente nom="le motif" />}</div>}
            {(d as { etapes?: string[] }).etapes?.length ? <ol className="sys-etapes">{(d as { etapes: string[] }).etapes.map(e => <li key={e}>{e}</li>)}</ol> : null}
            <p className="sys-reste"><b>Ce qui reste.</b> {d.reste}</p>
          </article>)}</div>
        </Section>

        <Section id="documentation" titre={S.documentation.titre} statut={S.documentation.statut} texte={S.documentation.texte}>
          <ul className="sys-liens">{C.documentation.liens.map(([n, h, t]) => <li key={h}><Lien href={h}>{n}</Lien><span>{t}</span></li>)}</ul>
          <p className="sys-note"><Statut s={C.documentation.connecteurs.statut} /> {C.documentation.connecteurs.texte}</p>
        </Section>

        <Section id="invitation" titre={S.invitation.titre} texte={S.invitation.texte}>
          <p><Lien className="sys-bouton primaire" href={S.invitation.lien[1]}>{S.invitation.lien[0]}</Lien></p>
        </Section>
        <p className="sys-pied">{C.pied}</p>
      </main>
    </div>
    <Pied />
    <DockBas lieux={[['disque', 'Disque'], ['rosace', 'ROSACE'], ['capacites', 'Capacités'], ['echiquier', 'Échiquier'], ['demos', 'Démos']]} />
  </>;
}
