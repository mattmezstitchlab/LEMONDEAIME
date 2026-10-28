import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Tete, DockBas, VerbesSite, Pied } from '../charte/Charte';
import { EntrerBloc } from '../charte/EntrerBloc';
import { Lien, remplacer, useRecherche } from '../lib/router';
import publique from '../data/systeme-public.json';
import { ETATS, NATURES, RESOLUTIONS, STATUTS, noeud, preuveDe, voisins, type Entree, type Etat, type Noeud, type Preuve, type Reseau } from '../../cartographie/outils.mjs';
import { REFERENCE, decaler, heure } from '../lib/programme';

/* LE MONDE AIME — le système nerveux. Une carte de ce qui existe réellement dans le dépôt : chaque point est un élément
   identifié, chaque liaison porte son état. La lecture publique montre le fonctionnement ; la lecture d'inspection
   (servie par /api/systeme aux seules personnes autorisées) ajoute les modules, les données, les tests et les doublons. */
type Inspection = { reseau: Reseau; inventaire: { serveur: { fichier: string; route: string | null; methodes: string[]; actions: string[]; tables: string[]; ecrit: string[]; session: boolean; quotas: string[] }[] }; preuves: Record<string, Preuve>; entrees: Entree[]; comptes: Record<string, number> };
type EtatInspection = { etat: 'ferme' | 'chargement' | 'entrer' | 'refuse' | 'indisponible' | 'ouvert'; donnees?: Inspection; raison?: string };
type Vue = 'carte' | 'parcours' | 'causalite' | 'inventaire';
const PUBLIC = publique as unknown as Reseau;
const VUES: [Vue, string][] = [['carte', 'Carte'], ['parcours', 'Parcours'], ['causalite', 'Causalité'], ['inventaire', 'Inventaire']];

function useParam(nom: string) { return new URLSearchParams(useRecherche()).get(nom); }
function changer(params: Record<string, string | null>) {
  const u = new URL(location.href);
  for (const [k, v] of Object.entries(params)) { if (v) u.searchParams.set(k, v); else u.searchParams.delete(k); }
  remplacer(u.pathname + u.search + u.hash);
}

export default function SystemeNerveux() {
  const vueParam = useParam('vue') as Vue | null;
  const selection = useParam('noeud');
  const veutInspection = useParam('lecture') === 'inspection';
  const [ins, setIns] = useState<EtatInspection>({ etat: 'ferme' });
  useEffect(() => {
    if (!veutInspection) { setIns({ etat: 'ferme' }); return; }
    setIns({ etat: 'chargement' });
    fetch('/api/systeme', { credentials: 'same-origin' }).then(async r => {
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) setIns({ etat: 'ouvert', donnees: j });
      else setIns({ etat: r.status === 401 ? 'entrer' : r.status === 403 ? 'refuse' : 'indisponible', raison: j.raison });
    }).catch(() => setIns({ etat: 'indisponible', raison: 'Connexion impossible.' }));
  }, [veutInspection]);
  const R = ins.etat === 'ouvert' ? ins.donnees!.reseau : PUBLIC;
  const vue: Vue = VUES.some(v => v[0] === vueParam) && (vueParam !== 'inventaire' || ins.etat === 'ouvert') ? vueParam! : 'carte';
  const choisir = useCallback((id: string | null) => changer({ noeud: id }), []);
  const c = useMemo(() => { const x = { verifie: 0, 'a-verifier': 0, prevu: 0 } as Record<Etat, number>; R.noeuds.forEach(n => x[n.etat]++); return x; }, [R]);
  return (
    <>
      <a className="lien-evitement" href="#contenu">Aller au contenu</a>
      <Tete courant="/systeme-nerveux" verbes={<VerbesSite />} />
      <main id="contenu" className="sn">
        <header className="sn-tete">
          <p className="surtitre">LE MONDE AIME · phase de cristallisation</p>
          <h1 className="grand-mot">Système nerveux</h1>
          <p className="chapeau">Comment les pages, les docks, les moteurs et les données communiquent réellement. Chaque point est un élément identifié dans le code ; chaque liaison dit si elle est vérifiée.</p>
          <p className="sn-perimetre">{R.perimetre}</p>
          <ul className="sn-legende" aria-label="Les états">
            {(Object.keys(ETATS) as Etat[]).map(e => <li key={e}><span className={'sn-etat ' + e} aria-hidden="true" />{ETATS[e]} · {c[e]}</li>)}
          </ul>
        </header>

        <div className="sn-barre">
          <div role="tablist" aria-label="Regarder le système" className="lectures">
            {VUES.filter(([v]) => v !== 'inventaire' || ins.etat === 'ouvert').map(([v, n]) =>
              <button key={v} role="tab" aria-selected={vue === v} aria-controls="sn-panneau" id={'sn-onglet-' + v} onClick={() => changer({ vue: v === 'carte' ? null : v })}>{n}</button>)}
          </div>
          <div role="group" aria-label="Lecture" className="sn-lecture">
            <button type="button" className="opt" aria-pressed={!veutInspection} onClick={() => changer({ lecture: null, vue: vue === 'inventaire' ? null : vue })}>Lecture publique</button>
            <button type="button" className="opt" aria-pressed={veutInspection} onClick={() => changer({ lecture: 'inspection' })}>Inspection</button>
          </div>
        </div>
        {veutInspection && ins.etat !== 'ouvert' && <AccesInspection ins={ins} />}

        <section id="sn-panneau" role="tabpanel" aria-labelledby={'sn-onglet-' + vue} className="sn-panneau">
          {vue === 'carte' && <Carte R={R} ins={ins.etat === 'ouvert' ? ins.donnees! : null} selection={selection} choisir={choisir} />}
          {vue === 'parcours' && <Parcours R={R} ins={ins.etat === 'ouvert' ? ins.donnees! : null} />}
          {vue === 'causalite' && <Causalite />}
          {vue === 'inventaire' && ins.etat === 'ouvert' && <Inventaire d={ins.donnees!} />}
        </section>

        <aside className="sn-gel" aria-labelledby="sn-gel-titre">
          <h2 id="sn-gel-titre">Ne plus ajouter. Faire fonctionner ensemble.</h2>
          <p>Une fonction · un moteur de référence · une donnée canonique · plusieurs usages autorisés.</p>
          <ol>{[['Examiner', 'cartographier ce qui existe'], ['Trier', 'utile, doublon, démonstration, incomplet'], ['Rassembler', 'mutualiser sans détruire'], ['Vérifier', 'chaque parcours, avec les bons rôles'], ['Stabiliser', 'retirer seulement les doublons démontrés']].map(([t, x], k) =>
            <li key={t}><span>{String(k + 1).padStart(2, '0')}</span><b>{t}</b><span>{x}</span></li>)}</ol>
        </aside>
      </main>
      <DockBas label="Le système nerveux" lieux={vue === 'carte' ? R.familles.map(f => ['famille-' + f.id, f.nom] as [string, string]) : []} />
      <Pied />
    </>
  );
}

function AccesInspection({ ins }: { ins: EtatInspection }) {
  if (ins.etat === 'chargement') return <p className="sn-acces" role="status">Ouverture de la lecture d’inspection…</p>;
  if (ins.etat === 'entrer') return <div className="sn-acces"><p>La lecture d’inspection est réservée aux personnes autorisées. Entrez d’abord dans AIME.</p><EntrerBloc compact retour="/systeme-nerveux" /></div>;
  if (ins.etat === 'refuse') return <p className="sn-acces" role="status">{ins.raison || 'La lecture d’inspection est réservée aux personnes autorisées.'} La lecture publique reste ouverte.</p>;
  return <p className="sn-acces" role="status">{ins.raison || 'La lecture d’inspection n’est pas disponible ici.'} La lecture publique reste ouverte.</p>;
}

/* ——— La carte : une branche verticale, six familles, des ramifications fines ——— */
function Carte({ R, ins, selection, choisir }: { R: Reseau; ins: Inspection | null; selection: string | null; choisir: (id: string | null) => void }) {
  const arbre = useRef<HTMLDivElement>(null);
  const points = useRef(new Map<string, HTMLButtonElement>());
  const [traits, setTraits] = useState<{ d: string; etat: Etat; sens: 'entrant' | 'sortant' }[]>([]);
  const sel = selection ? noeud(R, selection) : null;
  const v = useMemo(() => sel ? voisins(R, sel.id) : null, [R, sel]);
  const lies = useMemo(() => new Set(v ? [...v.entrants.map(l => l.de), ...v.sortants.map(l => l.vers)] : []), [v]);
  const dessiner = useCallback(() => {
    const a = arbre.current; if (!a || !sel || !v) { setTraits([]); return; }
    const o = a.getBoundingClientRect();
    const centre = (id: string) => { const b = points.current.get(id)?.querySelector('.sn-etat')?.getBoundingClientRect(); return b ? { x: b.left - o.left + b.width / 2, y: b.top - o.top + b.height / 2 } : null; };
    const s = centre(sel.id); if (!s) return;
    const t: typeof traits = [];
    for (const [l, sens] of [...v.entrants.map(l => [l, 'entrant'] as const), ...v.sortants.map(l => [l, 'sortant'] as const)]) {
      const autre = centre(sens === 'entrant' ? l.de : l.vers); if (!autre) continue;
      /* les connexions courent dans la marge, entre le tronc et les points : elles ne traversent jamais le texte */
      const bombe = Math.min(s.x - 14, 26 + Math.abs(autre.y - s.y) / 10);
      t.push({ d: `M${s.x},${s.y} C${s.x - bombe},${s.y} ${autre.x - bombe},${autre.y} ${autre.x},${autre.y}`, etat: l.etat, sens });
    }
    setTraits(t);
  }, [sel, v]);
  useLayoutEffect(() => { dessiner(); }, [dessiner]);
  useEffect(() => { const f = () => dessiner(); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, [dessiner]);
  useEffect(() => { if (selection) points.current.get(selection)?.scrollIntoView({ block: 'nearest' }); }, [selection]);
  return (
    <div className={'sn-carte' + (sel ? ' avec-fiche' : '')}>
      <div className={'sn-arbre' + (sel ? ' attenue' : '')} ref={arbre}>
        <svg className="sn-liens" aria-hidden="true">{traits.map((t, k) => <path key={k + t.d} d={t.d} className={'trait ' + t.etat + ' ' + t.sens} />)}</svg>
        {R.familles.map(f => {
          const ns = R.noeuds.filter(n => n.famille === f.id);
          return <section key={f.id} id={'famille-' + f.id} className="sn-famille" aria-labelledby={'f-' + f.id}>
            <div className="sn-famille-tete"><span className="sn-noeud-tronc" aria-hidden="true" /><h2 id={'f-' + f.id}>{f.nom}</h2><p>{f.texte} · {ns.length}</p></div>
            <ul>{ns.map(n => <li key={n.id} className={(sel?.id === n.id ? 'choisi' : '') + (lies.has(n.id) ? ' lie' : '')}>
              <button type="button" ref={el => { if (el) points.current.set(n.id, el); else points.current.delete(n.id); }} aria-pressed={sel?.id === n.id} onClick={() => choisir(sel?.id === n.id ? null : n.id)}
                aria-label={n.nom + ', ' + ETATS[n.etat] + (lies.has(n.id) ? ', relié au point choisi' : '')}>
                <span className={'sn-etat ' + n.etat} aria-hidden="true" />
                <span className="sn-nom"><b>{n.nom}</b><span>{n.fonction}</span></span>
              </button>
            </li>)}</ul>
          </section>;
        })}
      </div>
      {sel && <Fiche R={R} n={sel} ins={ins} choisir={choisir} />}
    </div>
  );
}

function Fiche({ R, n, ins, choisir }: { R: Reseau; n: Noeud; ins: Inspection | null; choisir: (id: string | null) => void }) {
  const v = voisins(R, n.id);
  const famille = R.familles.find(f => f.id === n.famille)!;
  const titre = useRef<HTMLHeadingElement>(null);
  useEffect(() => { titre.current?.focus(); }, [n.id]);
  const lienNoeud = (id: string, nature: string, etat: Etat, sens: string) => { const x = noeud(R, id); return x && <li key={sens + id + nature}>
    <span className={'sn-etat petit ' + etat} aria-hidden="true" /><span className="sn-nature">{NATURES[nature] || nature}</span>
    <button type="button" className="sn-lien-noeud" onClick={() => choisir(id)}>{x.nom}</button><span className="sr-only"> ({ETATS[etat]})</span></li>; };
  return (
    <aside className="sn-fiche" aria-labelledby="sn-fiche-titre">
      <div className="sn-fiche-haut">
        <p className="sn-fiche-sur">{famille.nom} · <span className={'sn-etat petit ' + n.etat} aria-hidden="true" /> {ETATS[n.etat]}</p>
        <button type="button" className="opt" aria-label="Fermer la fiche" onClick={() => choisir(null)}>×</button>
      </div>
      <h3 id="sn-fiche-titre" ref={titre} tabIndex={-1}>{n.nom}</h3>
      <p className="sn-fonction">{n.fonction}</p>
      {n.pages.length > 0 && <Bloc titre="Utilisé par">{n.pages.includes('*') ? <p>Toutes les pages du site</p> : <ul className="sn-pages">{n.pages.map(p => <li key={p}>{p.includes(':') || p.includes('*') ? <code>{p}</code> : <Lien href={p}>{p}</Lien>}</li>)}</ul>}</Bloc>}
      <Bloc titre={'Reçoit de · ' + v.entrants.length}>{v.entrants.length ? <ul className="sn-relations">{v.entrants.map(l => lienNoeud(l.de, l.nature, l.etat, 'e'))}</ul> : <p>Rien : c’est un point de départ.</p>}</Bloc>
      <Bloc titre={'Mène à · ' + v.sortants.length}>{v.sortants.length ? <ul className="sn-relations">{v.sortants.map(l => lienNoeud(l.vers, l.nature, l.etat, 's'))}</ul> : <p>Rien : c’est un point d’arrivée.</p>}</Bloc>
      {ins ? <InspectionNoeud R={R} n={n} ins={ins} /> : <p className="sn-reserve">Modules, données, rôles et tests : dans la lecture d’inspection, réservée aux personnes autorisées.</p>}
    </aside>
  );
}
const Bloc = ({ titre, children }: { titre: string; children: ReactNode }) => <div className="sn-bloc"><h4>{titre}</h4>{children}</div>;

function InspectionNoeud({ R, n, ins }: { R: Reseau; n: Noeud; ins: Inspection }) {
  const depot = (R.depot || '') + '/blob/' + (R.branche || 'main') + '/';
  const nom = (id: string) => noeud(R, id)?.nom || id;
  const audits = (R.audit || []).filter(a => a.moteur === n.id);
  return <>
    {n.note && <p className="sn-note">{n.note}</p>}
    {n.stockage && <Bloc titre="Stockage"><p>{n.stockage}</p></Bloc>}
    <Bloc titre="Modules du dépôt">{n.sources?.length ? <ul className="sn-pages">{n.sources.map(s => <li key={s.fichier + s.symbole}><a href={depot + s.fichier} target="_blank" rel="noopener"><code>{s.fichier}</code></a> · <code>{s.symbole}</code></li>)}</ul> : <p>Aucun : pas encore construit.</p>}</Bloc>
    <Bloc titre="Données">{n.donnees && (n.donnees.lit.length || n.donnees.ecrit.length) ? <p>{n.donnees.lit.length > 0 && <>Lit : {n.donnees.lit.map(nom).join(', ')}. </>}{n.donnees.ecrit.length > 0 && <>Écrit : {n.donnees.ecrit.map(nom).join(', ')}.</>}</p> : <p>Aucune donnée lue ni écrite.</p>}</Bloc>
    <Bloc titre="Rôles">{n.roles?.length ? <p>{n.roles.map(nom).join(', ')}</p> : <p>—</p>}</Bloc>
    <Bloc titre={'Tests · ' + (n.tests?.length || 0)}>{n.tests?.length ? <ul className="sn-tests">{n.tests.map(t => { const p = preuveDe(ins.preuves, t);
      return <li key={t.fichier + t.nom}><span className={'sn-etat petit ' + (p?.ok ? 'verifie' : 'a-verifier')} aria-hidden="true" /><span><b>{t.nom}</b><span><a href={depot + t.fichier} target="_blank" rel="noopener"><code>{t.fichier}</code></a>{p ? (p.ok ? ' · réussi le ' + p.date + ' (commit ' + p.commit + ')' : ' · en échec le ' + p.date) : ' · pas encore enregistré'}</span></span></li>; })}</ul> : <p>Aucun test : l’état ne peut pas être « vérifié ».</p>}</Bloc>
    {audits.map(a => <Bloc key={a.id} titre={'Audit · ' + STATUTS[a.statut]}><p><b>{a.fonction}.</b> {a.raison}</p></Bloc>)}
  </>;
}

/* ——— Les parcours : des branches réelles, de l'interface à la donnée ——— */
function Parcours({ R, ins }: { R: Reseau; ins: Inspection | null }) {
  return <>{R.parcours.map(p => <UnParcours key={p.id} R={R} p={p} ins={ins} />)}</>;
}
function UnParcours({ R, p, ins }: { R: Reseau; p: Reseau['parcours'][number]; ins: Inspection | null }) {
  const etapes = p.etapes.map(id => noeud(R, id)!);
  const ok = etapes.filter(n => n.etat === 'verifie').length;
  return <div className="sn-parcours">
    <h2 className="sn-h2">{p.nom}</h2>
    <p className="sn-texte">{p.texte}</p>
    <p className="sn-bilan" role="status"><b>{ok} étapes vérifiées sur {etapes.length}.</b> {ok < etapes.length && <>Reste à vérifier : {etapes.filter(n => n.etat !== 'verifie').map(n => n.nom.toLowerCase()).join(', ')}.</>}</p>
    <ol className="sn-etapes">{etapes.map((n, k) => {
      const suivant = etapes[k + 1];
      const l = suivant && R.liens.find(x => (x.de === n.id && x.vers === suivant.id) || (x.vers === n.id && x.de === suivant.id));
      return <li key={n.id}>
        <span className={'sn-etat ' + n.etat} aria-hidden="true" />
        <div><span className="sn-num">{String(k + 1).padStart(2, '0')} · {R.familles.find(f => f.id === n.famille)!.nom} · {ETATS[n.etat]}</span><b>{n.nom}</b><p>{n.fonction}</p>
          {ins && n.note && <p className="sn-note">{n.note}</p>}
          <Lien href={'/systeme-nerveux?noeud=' + n.id + (ins ? '&lecture=inspection' : '')} className="sn-voir">Voir sur la carte</Lien></div>
        {suivant && <span className="sn-passage">{l ? (NATURES[l.nature] || l.nature) : 'mène à'}</span>}
      </li>;
    })}</ol>
  </div>;
}

/* ——— Causalité : une simulation pédagogique sur la Grille 200 de référence ——— */
const DECALAGES = [10, 15, 30, 45, 60, -15];
function Causalite() {
  const jour = REFERENCE.moments.filter(m => m.etape === 'day');
  const [id, setId] = useState('day-couple-entrance');
  const [min, setMin] = useState(30);
  const r = useMemo(() => decaler(REFERENCE, id, min), [id, min]);
  const signe = (n: number) => (n > 0 ? '+' : '−') + Math.abs(n) + ' min';
  return <div className="sn-causalite">
    <h2 className="sn-h2">Décaler un moment du Jour J</h2>
    <p className="sn-avertissement"><b>Simulation pédagogique.</b> Elle calcule sur la Grille 200 de référence (l’union d’exemple) : rien n’est enregistré, rien n’est envoyé. Le décalage suit les prérequis écrits dans le programme ; les notifications n’existent pas encore.</p>
    <div className="sn-choix">
      <label>Le moment<select className="champ" value={id} onChange={e => setId(e.target.value)}>{jour.map(m => <option key={m.id} value={m.id}>{heure(m)} · {m.titre}</option>)}</select></label>
      <label>Décalage<select className="champ" value={min} onChange={e => setMin(Number(e.target.value))}>{DECALAGES.map(d => <option key={d} value={d}>{signe(d)}</option>)}</select></label>
    </div>
    <ol className="sn-etapes sn-chaine" aria-live="polite">
      <li><span className="sn-etat verifie" aria-hidden="true" /><div><span className="sn-num">01 · Action</span><b>« {r.moment.titre} » passe de {r.moment.avant} à {r.moment.apres}</b><p>{signe(r.moment.minutes)}.</p></div></li>
      <li><span className="sn-etat verifie" aria-hidden="true" /><div><span className="sn-num">02 · Programme · calculé</span><b>{r.decales.length ? r.decales.length + ' moment' + (r.decales.length > 1 ? 's' : '') + ' repoussé' + (r.decales.length > 1 ? 's' : '') : 'Aucun autre moment ne bouge'}</b>
        {min < 0 && <p>Avancer un moment ne rapproche pas les suivants : il faudra le décider.</p>}
        {r.decales.length > 0 && <ul className="sn-decales">{r.decales.map(d => <li key={d.id}><span>{d.avant} → <b>{d.apres}</b></span><span>{d.titre}</span><span className="sn-cause">après {d.cause.join(', ')}</span></li>)}</ul>}</div></li>
      <li><span className="sn-etat verifie" aria-hidden="true" /><div><span className="sn-num">03 · Métiers · calculé</span><b>{r.metiers.length} métier{r.metiers.length > 1 ? 's' : ''} concerné{r.metiers.length > 1 ? 's' : ''}</b><p className="sn-pastilles">{r.metiers.map(t => <span key={t.id} className="pastille">{t.nom}</span>)}</p></div></li>
      <li><span className="sn-etat verifie" aria-hidden="true" /><div><span className="sn-num">04 · Personnes · calculé</span><b>{r.personnes.length ? r.personnes.map(p => p.nom).join(', ') : 'Aucune personne de l’union nommée'}</b>{r.personnes.length > 0 && <p>{r.personnes.map(p => p.nom + ' (' + p.role.toLowerCase() + ')').join(' · ')}</p>}</div></li>
      <li><span className="sn-etat verifie" aria-hidden="true" /><div><span className="sn-num">05 · Supports · calculé</span><b>{r.supports.length} support{r.supports.length > 1 ? 's' : ''} à réimprimer</b><p className="sn-pastilles">{r.supports.map(s => <Lien key={s.pour} className="pastille" href={'/moments/support?pour=' + s.pour}>{s.nom}</Lien>)}</p></div></li>
      <li className="prevu"><span className="sn-etat prevu" aria-hidden="true" /><div><span className="sn-num">06 · Notifications · prévu</span><b>{r.notifications.destinataires} destinataires seraient prévenus</b><p>Ce mécanisme n’existe pas encore : aucune notification n’est envoyée.</p></div></li>
    </ol>
  </div>;
}

/* ——— Inventaire (inspection) : les points d'entrée, les doublons, les fonctions serveur, les preuves ——— */
function Inventaire({ d }: { d: Inspection }) {
  const R = d.reseau;
  const doublons = d.entrees.filter(e => e.doublonDock || e.libellesDifferents);
  return <div className="sn-inventaire">
    <h2 className="sn-h2">Audit des doublons</h2>
    <p className="sn-texte">Plusieurs accès à un même moteur ne font pas un doublon : seules les fonctions réellement dupliquées sont corrigées. « Résolu » demande un test réussi et enregistré ; sinon la décision reste « décidée » ou « à vérifier ».</p>
    <p className="sn-bilan">{(['resolu', 'decide', 'a-verifier'] as const).map(e => (R.audit || []).filter(a => a.resolution?.etat === e).length + ' ' + RESOLUTIONS[e].toLowerCase()).join(' · ')}</p>
    <div className="sn-table"><table>
      <thead><tr><th scope="col">Fonction</th><th scope="col">Moteur</th><th scope="col">Points d’entrée</th><th scope="col">Statut</th><th scope="col">Constat</th><th scope="col">Décision appliquée</th></tr></thead>
      <tbody>{(R.audit || []).map(a => { const e = d.entrees.filter(x => a.destinations.some(dd => x.cible === dd || x.cible.startsWith(dd + '/') || x.cible.startsWith(dd + '?')));
        return <tr key={a.id}><th scope="row">{a.fonction}</th><td>{noeud(R, a.moteur)?.nom}</td><td>{e.length ? e.reduce((t, x) => t + x.total, 0) + ' liens, dont ' + e.reduce((t, x) => t + x.docks, 0) + ' dans les docks' : (a.points || []).length + ' endroits du code'}</td><td><span className={'sn-statut ' + a.statut}>{STATUTS[a.statut]}</span></td><td>{a.raison}</td>
          <td>{a.resolution ? <><span className={'sn-resolution ' + a.resolution.etat}>{RESOLUTIONS[a.resolution.etat]}</span> {a.resolution.decision}
            {a.resolution.tests.length > 0 && <span className="sn-preuve-ligne">{(() => { const p = a.resolution!.tests.map(t => preuveDe(d.preuves, t)); const ok = p.filter(x => x?.ok).length; const x = p.find(Boolean);
              return ok + '/' + p.length + ' preuves réussies' + (x ? ' le ' + x.date + ' (commit ' + x.commit + ')' : ''); })()}</span>}</> : '—'}</td></tr>; })}</tbody>
    </table></div>

    <h2 className="sn-h2">Points d’entrée par destination</h2>
    <p className="sn-texte">Tirés du code par le scanner : {d.entrees.reduce((t, e) => t + e.total, 0)} liens internes vers {d.entrees.length} destinations. Signalé : plusieurs entrées dans les docks, ou des libellés différents.</p>
    <ul className="sn-entrees">{doublons.map(e => <li key={e.cible}><details><summary><code>{e.cible}</code><span>{e.total} liens · {e.docks} dans les docks{e.libellesDifferents ? ' · ' + e.libelles.length + ' libellés' : ''}</span></summary>
      <p className="sn-pastilles">{e.libelles.map(l => <span key={l} className="pastille">{l}</span>)}</p>
      <ul>{e.points.map(p => <li key={p.fichier + p.ligne + (p.libelle || '')}><a href={(R.depot || '') + '/blob/' + (R.branche || 'main') + '/' + p.fichier + '#L' + p.ligne} target="_blank" rel="noopener"><code>{p.fichier}:{p.ligne}</code></a> {p.composant && <>· {p.composant}</>} {p.libelle && <>· « {p.libelle} »</>}</li>)}</ul>
    </details></li>)}</ul>

    <h2 className="sn-h2">Fonctions serveur</h2>
    <div className="sn-table"><table>
      <thead><tr><th scope="col">Route</th><th scope="col">Méthodes</th><th scope="col">Actions</th><th scope="col">Tables lues</th><th scope="col">Tables écrites</th><th scope="col">Session</th></tr></thead>
      <tbody>{d.inventaire.serveur.filter(s => s.route).map(s => <tr key={s.fichier}><th scope="row"><code>{s.route}</code></th><td>{s.methodes.join(', ')}</td><td>{s.actions.join(', ') || '—'}</td><td>{s.tables.join(', ') || '—'}</td><td>{s.ecrit.join(', ') || '—'}</td><td>{s.session ? 'oui' : 'non'}</td></tr>)}</tbody>
    </table></div>

    <h2 className="sn-h2">Preuves des parcours</h2>
    <ul className="sn-preuves">{Object.entries(d.preuves).map(([f, p]) => { const ok = p.resultats.filter(x => x.ok).length;
      return <li key={f}><code>{f}</code> · {ok}/{p.resultats.length} réussis le {p.date} (commit {p.commit}{p.code_modifie_depuis_le_commit ? ', code modifié depuis' : ''}) · {p.environnement}</li>; })}</ul>
  </div>;
}
