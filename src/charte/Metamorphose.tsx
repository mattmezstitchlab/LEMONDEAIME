import { useEffect, useRef } from 'react';
import { EXEMPLES } from '../lib/reseau-exemples';
import { SECTIONS, type Meta, type SectionId } from '../lib/metamorphose';

/* Le panneau de la Métamorphose : tout se voit en direct sur l'accueil, rien ne change pour les autres. */
export type UniversM = { id: string; nom: string; vignette: string };
export function Metamorphose({ m, set, univers, fermer }: { m: Meta; set: (m: Meta | null) => void; univers: UniversM[]; fermer: () => void }) {
  const titre = useRef<HTMLHeadingElement>(null);
  useEffect(() => { titre.current?.focus(); }, []);
  const maj = (p: Partial<Meta>) => set({ ...m, ...p });
  const bouger = (id: SectionId, d: -1 | 1) => { const o = [...m.ordre], i = o.indexOf(id), j = i + d; if (j < 0 || j >= o.length) return; [o[i], o[j]] = [o[j], o[i]]; maj({ ordre: o }); };
  const nom = (id: SectionId) => SECTIONS.find(s => s[0] === id)![1];
  const metiers = EXEMPLES.filter(e => e.domaine === 'mariage');
  return (
    <section className="metamorphose" role="dialog" aria-modal="false" aria-labelledby="meta-titre" onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); fermer(); } }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <h2 id="meta-titre" ref={titre} tabIndex={-1} style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: '-0.03em', outline: 'none' }}>Métamorphose</h2>
          <p style={{ margin: '4px 0 0', fontSize: 15, lineHeight: 1.45, color: '#3A3A3F' }}>Transformez l’accueil pour vous, en direct. Personne d’autre ne voit ces changements : ils restent sur cet appareil.</p>
        </div>
        <button type="button" className="opt" aria-label="Fermer la Métamorphose" onClick={fermer} style={{ flex: 'none', width: 44, minWidth: 44, padding: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>

      <fieldset className="meta-bloc">
        <legend>Le titre devient vos noms</legend>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center' }}>
          <label className="sr-only" htmlFor="meta-a">Premier prénom</label>
          <input id="meta-a" className="champ" placeholder="Camille" value={m.a} onChange={e => maj({ a: e.target.value })} autoComplete="off" />
          <span aria-hidden="true" style={{ fontSize: 20, fontWeight: 600 }}>&amp;</span>
          <label className="sr-only" htmlFor="meta-b">Second prénom</label>
          <input id="meta-b" className="champ" placeholder="Gabriel" value={m.b} onChange={e => maj({ b: e.target.value })} autoComplete="off" />
        </div>
        <label htmlFor="meta-date" style={{ display: 'block', margin: '10px 0 6px', fontSize: 14, color: '#55555A' }}>Une date, un lieu (facultatif)</label>
        <input id="meta-date" className="champ" placeholder="Le 12 juin, au bord de la mer" value={m.date} onChange={e => maj({ date: e.target.value })} autoComplete="off" aria-describedby="meta-date-note" />
        <p id="meta-date-note" className="meta-note">Si cette phrase contient une date, le Réseau la reprend pour montrer qui est libre ce jour-là ; vous pourrez l’y changer ou l’effacer. Ce n’est pas la date officielle d’une union.</p>
      </fieldset>

      <fieldset className="meta-bloc">
        <legend>Votre univers, en tête du diaporama</legend>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 8 }}>
          {univers.map(u => { const on = m.univers === u.id;
            return <button key={u.id} type="button" aria-pressed={on} onClick={() => maj({ univers: on ? null : u.id })} className="meta-univers">
              <img src={u.vignette} alt="" /><span>{u.nom}</span>
            </button>; })}
        </div>
      </fieldset>

      <fieldset className="meta-bloc">
        <legend>Les prestataires que vous cherchez</legend>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {metiers.map(e => { const on = m.presta.includes(e.slug);
            return <button key={e.slug} type="button" className="opt" aria-pressed={on} style={{ minWidth: 0 }} onClick={() => maj({ presta: on ? m.presta.filter(x => x !== e.slug) : [...m.presta, e.slug] })}>{e.nom}</button>; })}
        </div>
      </fieldset>

      <fieldset className="meta-bloc">
        <legend>Les sections, dans votre ordre</legend>
        <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {m.ordre.map((id, k) => { const vue = !m.cachees.includes(id);
            return <li key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 52, borderTop: k ? '1px solid #ECECE8' : 0 }}>
              <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, fontSize: 16, fontWeight: vue ? 600 : 400, color: vue ? '#0B0B0C' : '#55555A' }}>
                <input type="checkbox" checked={vue} onChange={() => maj({ cachees: vue ? [...m.cachees, id] : m.cachees.filter(x => x !== id) })} style={{ width: 20, height: 20, accentColor: '#0B0B0C' }} />{nom(id)}
              </label>
              <button type="button" className="opt" style={{ minWidth: 44, width: 44, padding: 0 }} disabled={k === 0} aria-label={'Monter ' + nom(id)} onClick={() => bouger(id, -1)}>↑</button>
              <button type="button" className="opt" style={{ minWidth: 44, width: 44, padding: 0 }} disabled={k === m.ordre.length - 1} aria-label={'Descendre ' + nom(id)} onClick={() => bouger(id, 1)}>↓</button>
            </li>; })}
        </ol>
      </fieldset>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'space-between', paddingTop: 16, borderTop: '1px solid #E6E6E2' }}>
        <button type="button" className="opt" style={{ fontWeight: 600, border: '1px solid #0B0B0C' }} onClick={() => set(null)}>Revenir à la page de tous</button>
        <button type="button" className="opt" aria-pressed="true" style={{ fontWeight: 700 }} onClick={fermer}>Voir ma page</button>
      </div>
    </section>
  );
}
