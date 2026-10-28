import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Tete, DockBas, VerbesSite, Pied, Visuel } from '../charte/Charte';
import { Lien } from '../lib/router';
import { useSession } from '../lib/session';
import { ecrireBuro } from '../lib/buro';
import { MEDIAS } from '../lib/medias';
import Moteur from '../lib/moteur.js';
import data from '../lib/briques.json';

type Brique = { n: string; name: string; fam: string; does: string; w: string; b: string; feeds: string[]; c: string; cl: string };
type Raison = { q: string; s?: number; e?: number };
type Analyse = { domaine: string; label: string; studio: string; certitude: number; sujet?: string | null; autre?: string | null; resume?: string; chemin: string[]; raisons: Record<string, Raison[]>; ecartees: Record<string, string>; entites: Record<string, { v: string | number }[]> };
const D = data.briques as unknown as Record<string, Brique>;
const G = data.grille as string[][];
const FEEDS = Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v.feeds]));
const HREF: Record<string, string> = { union: '/', broderie: '/studio/atelier', sal: '/studio/atelier', formation: '/studio/', presentation: '/studio/', site: '/studio/' };
const EXEMPLES = ['Nous nous marions en juin, à la campagne', 'Je veux broder le portrait de mon chat', 'Je prépare une formation sur le point de croix', 'J’organise un concert entre amis'];
const reduit = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Point Zéro : la Grille 44. Ce qu'on écrit allume les briques ; le fil part du centre et suit les causalités. */
export default function PointZero() {
  const session = useSession();
  const [an, setAn] = useState<Analyse | null>(null);
  const [source, setSource] = useState('');
  const [note, setNote] = useState('');
  const [vus, setVus] = useState(0);
  const [sel, setSel] = useState<string | null>(null);
  const [attente, setAttente] = useState(false);
  const [msg, setMsg] = useState('');
  const champ = useRef<HTMLTextAreaElement>(null);
  const titre = useRef<HTMLHeadingElement>(null);

  const montrer = (a: Analyse, texte: string, n: string) => {
    setAn(a); setSource(texte); setNote(n); setSel(a.chemin[0] || null); setMsg(''); setVus(reduit() ? a.chemin.length : 0);
    setTimeout(() => { titre.current?.focus({ preventScroll: true }); titre.current?.scrollIntoView({ behavior: reduit() ? 'auto' : 'smooth', block: 'start' }); }, 60);
  };
  const lancer = async (texte: string) => {
    setAttente(true);
    try {
      const r = await fetch('/api/analyse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texte, mode: 'decrire' }) });
      const j = await r.json();
      if (r.ok && Array.isArray(j.chemin) && j.chemin.length) { montrer(j, texte, 'Analysé par Claude'); return; }
      montrer(Moteur.analyse(texte, { feeds: FEEDS }) as unknown as Analyse, texte, 'Moteur local' + (j && j.error ? ' · ' + j.error : ''));
    } catch { montrer(Moteur.analyse(texte, { feeds: FEEDS }) as unknown as Analyse, texte, 'Moteur local'); }
    finally { setAttente(false); }
  };
  useEffect(() => {
    let q = new URLSearchParams(window.location.search).get('q') || '';
    try { q = q || sessionStorage.getItem('aime-intention') || ''; sessionStorage.removeItem('aime-intention'); } catch { /* rien */ }
    if (q) { if (champ.current) champ.current.value = q; lancer(q); }
  }, []);
  useEffect(() => {
    if (!an || vus >= an.chemin.length) return;
    const t = setTimeout(() => setVus(v => v + 1), 420); return () => clearTimeout(t);
  }, [an, vus]);

  const fini = !!an && vus >= an.chemin.length;
  const chemin = an ? an.chemin.slice(0, vus) : [];
  const { eclairees, decoule } = useMemo(() => {
    const e: string[] = [], d: Record<string, string[]> = {};
    if (an && fini) an.chemin.forEach(k => (FEEDS[k] || []).forEach(f => { if (!an.chemin.includes(f) && !an.ecartees[f]) { if (!e.includes(f)) e.push(f); (d[f] = d[f] || []).push(k); } }));
    return { eclairees: e, decoule: d };
  }, [an, fini]);
  const pos: Record<string, [number, number]> = {};
  G.forEach((rang, r) => rang.forEach((k, c) => { pos[k] = [c + 0.5, r + 0.5]; }));
  const fil = chemin.length ? ['3.5,3.5', ...chemin.map(k => pos[k].join(','))].join(' ') : '';
  const envoyer = (e: FormEvent) => { e.preventDefault(); const v = champ.current?.value.trim() || ''; if (!v) { setMsg('Écrivez quelques mots pour commencer.'); champ.current?.focus(); return; } lancer(v); };
  const ranger = async () => {
    if (!an) return;
    if (!session) { setMsg('Entrez dans AIME pour ranger ce projet dans votre espace.'); return; }
    let nom = source.replace(/\s+/g, ' ').trim(); if (nom.length > 60) nom = nom.slice(0, 58).trim() + '…';
    const r = await ecrireBuro({ titre: nom.charAt(0).toUpperCase() + nom.slice(1), briques: an.chemin, studio: an.studio, intention: source });
    setMsg(r.ok ? 'Rangé dans votre espace : ' + an.chemin.length + ' briques.' : (r.raison || 'Rangement impossible.'));
  };
  const s = sel ? D[sel] : null;
  const pourquoi = !s || !an ? '' : an.raisons[sel!] ? 'Pourquoi : « ' + [...new Set(an.raisons[sel!].map(r => r.q))].slice(0, 4).join(' », « ') + ' »' : decoule[sel!] ? 'Découle de : ' + decoule[sel!].map(k => D[k].name).join(', ') : an.chemin.includes(sel!) ? 'Fait partie de la recette « ' + an.label + ' »' : an.ecartees[sel!] ? 'Écartée : « ' + an.ecartees[sel!] + ' »' : 'Pas concernée par ce projet.';
  const cert = !an ? '' : an.certitude >= 1 ? 'sûr' : an.certitude >= .6 ? 'probable' : an.certitude > 0 ? 'à confirmer' : 'à préciser';
  const ents = !an ? [] : [['Date', 'dates'], ['Montant', 'montants'], ['Personnes', 'personnes'], ['Lieu', 'lieux'], ['Lien', 'liens']].flatMap(([k, f]) => (an.entites[f] || []).map(x => [k, f === 'montants' ? Math.round(Number(x.v)).toLocaleString('fr-FR') + ' €' : String(x.v)]));
  const href = an ? HREF[an.domaine] || '/' : '/';

  return (
    <>
      <a className="lien-evitement" href="#contenu">Aller au contenu</a>
      <Tete courant="/point-zero" verbes={<VerbesSite />} />
      <main id="contenu" style={{ padding: 'clamp(48px, 7vw, 96px) var(--marge) 160px' }}>
        <p className="surtitre">L’étape 0 · au centre de la grille</p>
        <h1 className="signature" style={{ fontSize: 'clamp(56px, 12vw, 200px)' }}>Point Zéro</h1>
        <p className="chapeau" style={{ maxWidth: '44ch' }}>Comme en broderie, tout part du centre. Écrivez ce que vous voulez faire : les briques concernées s’allument, et le fil montre ce qui en découle.</p>
        <div style={{ marginTop: 40 }}><Visuel m={MEDIAS['pz-hero']} hauteur="clamp(16rem, 32vw, 28rem)" /></div>
        <form onSubmit={envoyer} style={{ marginTop: 48, maxWidth: 820 }}>
          <label htmlFor="pz-texte" style={{ display: 'block', marginBottom: 12, fontSize: 15, fontWeight: 600 }}>Décrivez ce que vous voulez faire</label>
          <div style={{ display: 'flex', gap: 12, padding: 10, borderRadius: 26, background: '#fff', border: '1px solid #0B0B0C' }}>
            <span className="orbe" aria-hidden="true" style={{ width: 54, height: 54 }} />
            <textarea id="pz-texte" ref={champ} rows={3} placeholder="Tout commence ici…" style={{ flex: 1, minWidth: 0, minHeight: 96, resize: 'vertical', border: 0, background: 'transparent', font: 'inherit', fontSize: 'clamp(18px, 1.6vw, 21px)', lineHeight: 1.45, outline: 'none', padding: '14px 4px' }} />
          </div>
          <div role="group" aria-label="Exemples" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
            {EXEMPLES.map(t => <button key={t} type="button" onClick={() => { if (champ.current) champ.current.value = t; lancer(t); }} style={{ minHeight: 44, padding: '0 14px', borderRadius: 999, border: '1px solid #CFCFCB', background: '#F1F1EE', fontSize: 15 }}>{t}</button>)}
          </div>
          <button className="bouton noir" type="submit" disabled={attente} style={{ marginTop: 22 }}>{attente ? 'Lecture…' : 'Allumer la grille'}</button>
        </form>

        <section aria-labelledby="titre-grille" style={{ marginTop: 56 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, flexWrap: 'wrap', borderTop: '1px solid #0B0B0C', paddingTop: 18, marginBottom: 24 }}>
            <h2 id="titre-grille" ref={titre} tabIndex={-1} style={{ margin: 0, fontSize: 22, fontWeight: 600, outline: 'none' }}>La Grille 44</h2>
            <p style={{ margin: 0, fontSize: 15, color: '#55555A' }}>44 briques universelles · 2 briques métier · le Point Zéro au centre</p>
          </div>
          <div className="g44" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 360px)', gap: 32, alignItems: 'start' }}>
            <div style={{ position: 'relative', maxWidth: 820, aspectRatio: '1 / 1' }}>
              <ul aria-label="Les briques, rangées autour du Point Zéro" style={{ listStyle: 'none', margin: 0, padding: 0, position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gridTemplateRows: 'repeat(7, minmax(0, 1fr))', gap: 6 }}>
                {G.flat().map((k, i) => {
                  if (k === 'PZ') return <li key={i}><button type="button" onClick={() => champ.current?.focus()} aria-label="Point Zéro : écrire" style={{ width: '100%', height: '100%', borderRadius: '50%', border: '2px solid #0B0B0C', background: '#0B0B0C', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}><span className="orbe" style={{ width: '44%', height: 'auto', aspectRatio: '1 / 1' }} /><span className="g44-nom" style={{ fontSize: 'clamp(9px, .9vw, 12px)', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>Point Zéro</span></button></li>;
                  if (k === 'VIDE') return <li key={i}><div style={{ width: '100%', height: '100%', borderRadius: 10, border: '1px dashed #CFCFCB', display: 'flex', alignItems: 'flex-end', padding: '6px 7px' }}><span className="g44-nom" style={{ fontSize: 11, fontWeight: 600, color: '#55555A' }}>Bientôt</span></div></li>;
                  const d = D[k], allume = an ? chemin.includes(k) : false, eclaire = eclairees.includes(k), on = sel === k, etape = chemin.indexOf(k) + 1, bg = allume ? d.c : eclaire ? d.cl : an ? '#F1F1EE' : '#FFFFFF';
                  return <li key={i}><button type="button" aria-pressed={on} onClick={() => setSel(k)} aria-label={d.n + ' ' + d.name + ', ' + d.fam + (allume ? ', allumée' : eclaire ? ', éclairée par conséquence' : '') + (etape ? ', étape ' + etape : '')}
                    style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-start', padding: '6px 7px', borderRadius: 10, border: on ? '3px solid #0B0B0C' : allume ? '2px solid #0B0B0C' : eclaire ? '1px dashed #55555A' : '1px solid #E2E2DE', background: bg, color: allume || eclaire || !an ? '#0B0B0C' : '#55555A', boxShadow: allume ? '0 0 0 4px ' + d.c + ', 0 10px 24px rgba(11,11,12,.18)' : 'none', textAlign: 'left', overflow: 'hidden', transition: 'background-color .35s, box-shadow .35s' }}>
                    {!allume && !eclaire && <span aria-hidden="true" style={{ position: 'absolute', inset: '0 0 auto 0', height: 5, background: d.c }} />}
                    <span aria-hidden="true" style={{ position: 'relative', zIndex: 2, marginTop: 3, fontSize: 11, fontWeight: 700, background: bg, padding: '0 3px', marginLeft: -3, borderRadius: 4 }}>{d.n}</span>
                    <span className="g44-nom" aria-hidden="true" style={{ position: 'relative', zIndex: 2, fontSize: 'clamp(10px, 1.05vw, 13.5px)', fontWeight: allume ? 700 : 500, lineHeight: 1.1, background: bg, padding: '1px 3px', marginLeft: -3, borderRadius: 4, maxWidth: '100%' }}>{d.name}</span>
                    {etape > 0 && <span className="g44-etape" aria-hidden="true" style={{ position: 'absolute', zIndex: 2, top: 7, right: 6, minWidth: 18, height: 18, padding: '0 4px', borderRadius: 9, background: '#0B0B0C', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{etape}</span>}
                  </button></li>;
                })}
              </ul>
              <svg aria-hidden="true" viewBox="0 0 7 7" preserveAspectRatio="none" style={{ position: 'absolute', zIndex: 1, inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                <polyline points={fil} fill="none" stroke="#0B0B0C" strokeWidth={2} strokeDasharray="7 5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" opacity={.85} />
              </svg>
            </div>
            <aside aria-labelledby="titre-fil" style={{ padding: 22, borderRadius: 22, background: '#fff', border: '1px solid #E2E2DE' }}>
              <h3 id="titre-fil" style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Le fil</h3>
              <p role="status" aria-live="polite" style={{ margin: '6px 0 0', fontSize: 15, lineHeight: 1.5, color: '#3A3A3F' }}>
                {attente ? 'Lecture de votre projet…' : !an ? 'Écrivez au Point Zéro : les briques concernées s’allumeront ici, dans l’ordre.' : fini ? an.chemin.length + ' briques allumées, ' + eclairees.length + ' éclairées par conséquence. Studio proposé : ' + an.studio + '.' : 'Le fil avance… ' + vus + ' / ' + an.chemin.length}
              </p>
              {an && fini && <div style={{ marginTop: 14, padding: '14px 16px', borderRadius: 16, background: '#F6F6F4' }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#55555A' }}>Ce que le moteur a compris</p>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#3A3A3F' }}>{note}</p>
                <p style={{ margin: '6px 0 0', fontSize: 17, fontWeight: 600 }}>{an.label} <span style={{ fontWeight: 500, color: '#3A3A3F' }}>· {cert}</span></p>
                {an.sujet && an.sujet !== an.label && <p style={{ margin: '2px 0 0', fontSize: 14, color: '#3A3A3F' }}>Sur le sujet : {an.sujet}.</p>}
                {an.resume && <p style={{ margin: '6px 0 0', fontSize: 15, lineHeight: 1.5 }}>{an.resume}</p>}
                {ents.length > 0 && <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'flex', flexWrap: 'wrap', gap: 6 }}>{ents.map(([k, v], i) => <li key={i} style={{ padding: '5px 10px', borderRadius: 999, background: '#fff', border: '1px solid #E2E2DE', fontSize: 14 }}><b style={{ fontWeight: 600 }}>{k}</b> {v}</li>)}</ul>}
                {Object.keys(an.ecartees).length > 0 && <p style={{ margin: '10px 0 0', fontSize: 14 }}><b style={{ fontWeight: 600 }}>Écartées :</b> {Object.entries(an.ecartees).map(([k, q]) => (D[k]?.name || k) + ' (« ' + q + ' »)').join(', ')}</p>}
              </div>}
              {chemin.length > 0 && <ol style={{ listStyle: 'none', margin: '14px 0 0', padding: 0, display: 'grid', gap: 6 }}>
                {chemin.map((k, i) => <li key={k}><button type="button" aria-current={sel === k ? 'true' : undefined} onClick={() => setSel(k)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', minHeight: 44, padding: '0 10px', borderRadius: 10, border: sel === k ? '2px solid #0B0B0C' : '1px solid #E2E2DE', background: sel === k ? D[k].cl : '#fff', fontSize: 15, textAlign: 'left' }}><span aria-hidden="true" style={{ flex: 'none', width: 22, height: 22, borderRadius: '50%', background: '#0B0B0C', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>{D[k].name}</button></li>)}
              </ol>}
              {s && <div style={{ marginTop: 18, padding: 16, borderRadius: 16, background: s.cl }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#3A3A3F' }}>{s.n} · {s.fam}</p>
                <h4 style={{ margin: '4px 0 6px', fontSize: 22, fontWeight: 600 }}>{s.name}</h4>
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}>{s.does}</p>
                {pourquoi && <p style={{ margin: '8px 0 0', fontSize: 14, fontWeight: 600 }}>{pourquoi}</p>}
                <dl style={{ margin: '12px 0 0', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 10px', fontSize: 14 }}>
                  <dt style={{ fontWeight: 600 }}>AIME Wedding</dt><dd style={{ margin: 0 }}>{s.w}</dd>
                  <dt style={{ fontWeight: 600 }}>Brode Way</dt><dd style={{ margin: 0 }}>{s.b}</dd>
                  <dt style={{ fontWeight: 600 }}>Nourrit</dt><dd style={{ margin: 0 }}>{s.feeds.map(f => D[f].name).join(', ') || '—'}</dd>
                </dl>
              </div>}
              {an && fini && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 18 }}>
                <button className="bouton noir" type="button" onClick={ranger} style={{ height: 48 }}>Ranger dans mon espace</button>
                <Lien className="bouton" href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener" style={{ height: 48 }}>{href === '/' ? 'Voir Le Monde AIME' : href === '/studio/atelier' ? 'Ouvrir l’atelier de broderie' : 'Ouvrir le StudiO'}{href.startsWith('http') && <span className="sr-only"> (nouvel onglet)</span>}</Lien>
              </div>}
              <p role="status" style={{ margin: '10px 0 0', minHeight: 20, fontSize: 14, fontWeight: 600 }}>{msg}{msg.startsWith('Entrez') && <> <Lien href="/entrer">+ Entrer</Lien></>}</p>
            </aside>
          </div>
        </section>
      </main>
      <Pied />
      <DockBas />
    </>
  );
}
