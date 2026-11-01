import { useMemo, useState } from 'react';
import {Tete, DockBas, Pied } from '../charte/Charte';
import { Lien } from '../lib/router';
import { CREATIONS, FACONS, UNIVERS, ecrireSelection, lireSelection, type Creation, type Facon, type Univers } from '../lib/boutique';

/* Une création : la photo, l'univers et la façon (acheter, louer, sur mesure, patron), le créateur et son profil, garder dans ma sélection. */
export function CarteCreation({ c, gardee, garder }: { c: Creation; gardee?: boolean; garder?: () => void }) {
  return (
    <article style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ position: 'relative', aspectRatio: '4 / 5', borderRadius: 10, overflow: 'hidden', background: c.contenir ? '#fff' : '#E4E4E1' }}>
        <img src={c.photo} alt={c.alt} loading="lazy" style={{ width: '100%', height: '100%', objectFit: c.contenir ? 'contain' : 'cover', padding: c.contenir ? 18 : 0 }} />
        <span style={{ position: 'absolute', top: 10, left: 10, padding: '4px 9px', borderRadius: 999, background: 'rgba(255,255,255,.92)', fontSize: 12, fontWeight: 600 }}>{FACONS.find(f => f[0] === c.facon)![1]}</span>
        {garder && <button type="button" onClick={garder} aria-pressed={!!gardee} aria-label={(gardee ? 'Retirer de ma sélection : ' : 'Garder dans ma sélection : ') + c.nom}
          style={{ position: 'absolute', top: 8, right: 8, width: 44, height: 44, borderRadius: '50%', border: 0, background: gardee ? '#0B0B0C' : 'rgba(255,255,255,.92)', color: gardee ? '#fff' : '#0B0B0C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill={gardee ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg>
        </button>}
      </div>
      <div>
        <span style={{ display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: '#55555A' }}>{UNIVERS.find(u => u[0] === c.univers)![1]}</span>
        <span style={{ display: 'block', marginTop: 3, fontSize: 21, fontWeight: 600, letterSpacing: '-0.025em' }}>{c.nom}</span>
        <span style={{ fontSize: 15, color: '#3A3A3F' }}>par {c.fiche ? <Lien href={'/reseau/' + c.fiche} style={{ textUnderlineOffset: 3 }}>{c.par.charAt(0).toLowerCase() + c.par.slice(1)}</Lien> : c.par.charAt(0).toLowerCase() + c.par.slice(1)}</span>
      </div>
    </article>
  );
}

const sans = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const Puce = ({ on, onClick, children, n }: { on: boolean; onClick: () => void; children: React.ReactNode; n?: number }) =>
  <button type="button" aria-pressed={on} onClick={onClick} style={{ minHeight: 44, padding: '0 16px', borderRadius: 999, border: '1px solid ' + (on ? '#0B0B0C' : '#CFCFCB'), background: on ? '#0B0B0C' : '#fff', color: on ? '#fff' : '#0B0B0C', fontSize: 15, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>{children}{n !== undefined && <span style={{ fontSize: 12, opacity: .8 }}>{n}</span>}</button>;

export default function Boutique() {
  const [univers, setUnivers] = useState<Univers | null>(() => { const u = new URLSearchParams(window.location.search).get('univers'); return UNIVERS.some(x => x[0] === u) ? u as Univers : null; });
  const [facons, setFacons] = useState<Facon[]>([]);
  const [q, setQ] = useState('');
  const [selection, setSelection] = useState(lireSelection);
  const [seulement, setSeulement] = useState(false);
  const garder = (id: string) => { const n = selection.includes(id) ? selection.filter(x => x !== id) : [...selection, id]; setSelection(n); ecrireSelection(n); };
  const base = (c: Creation) => (!seulement || selection.includes(c.id)) && (!q.trim() || sans(c.nom + ' ' + c.par + ' ' + c.univers).includes(sans(q.trim())));
  const liste = useMemo(() => CREATIONS.filter(c => base(c) && (!univers || c.univers === univers) && (!facons.length || facons.includes(c.facon))), [univers, facons, q, selection, seulement]); // eslint-disable-line react-hooks/exhaustive-deps
  const compte = (u: Univers | null) => CREATIONS.filter(c => base(c) && (!u || c.univers === u) && (!facons.length || facons.includes(c.facon))).length;
  return (
    <>
      <a className="lien-evitement" href="#contenu">Aller au contenu</a>
      <Tete courant="/boutique" />
      <main id="contenu">
        <section id="catalogue" aria-labelledby="titre-boutique" style={{ padding: '40px var(--marge) 120px' }}>
          <h1 id="titre-boutique" className="grand-mot" style={{ textAlign: 'center', fontSize: 'clamp(56px, 12vw, 200px)' }}>Boutique</h1>
          <p style={{ margin: '18px auto 0', maxWidth: '34rem', textAlign: 'center', fontSize: 'clamp(18px, 1.7vw, 24px)', lineHeight: 1.35 }}>Ce que les artisans de l’union créent, vendent ou louent. Tout se choisit ici, et chaque création mène à la page de celle ou celui qui la fait.</p>

          <div style={{ marginTop: 48, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <label htmlFor="cherche-boutique" className="sr-only">Chercher une création</label>
              <input id="cherche-boutique" className="champ" type="search" placeholder="Chercher : lin, initiales, arche…" value={q} onChange={e => setQ(e.target.value)} style={{ flex: '1 1 260px', maxWidth: 420 }} />
              <Puce on={seulement} onClick={() => setSeulement(s => !s)} n={selection.length}>Ma sélection</Puce>
            </div>
            <div role="group" aria-label="Univers" className="rangee-puces">
              <Puce on={!univers} onClick={() => setUnivers(null)} n={compte(null)}>Tout</Puce>
              {UNIVERS.map(([u, l]) => <Puce key={u} on={univers === u} onClick={() => setUnivers(univers === u ? null : u)} n={compte(u)}>{l}</Puce>)}
            </div>
            <div role="group" aria-label="Façon" className="rangee-puces">
              {FACONS.map(([f, l]) => <Puce key={f} on={facons.includes(f)} onClick={() => setFacons(facons.includes(f) ? facons.filter(x => x !== f) : [...facons, f])}>{l}</Puce>)}
            </div>
          </div>

          <p role="status" aria-live="polite" style={{ margin: '28px 0 20px', fontSize: 16, color: '#3A3A3F' }}>{liste.length ? liste.length + ' création' + (liste.length > 1 ? 's' : '') : seulement ? 'Rien dans votre sélection pour l’instant : touchez le cœur d’une création pour la garder.' : 'Rien ne correspond. Essayez un autre univers ou une autre façon.'}</p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 250px), 1fr))', gap: '48px 24px' }}>
            {liste.map(c => <li key={c.id}><CarteCreation c={c} gardee={selection.includes(c.id)} garder={() => garder(c.id)} /></li>)}
          </ul>
          <p style={{ margin: '48px 0 0', fontSize: 15, color: '#55555A' }}>Les créations montrées ici sont des exemples. La commande et la location arrivent avec les comptes vendeurs ; votre sélection reste sur cet appareil.</p>
        </section>

        <section id="vendre" aria-labelledby="titre-vendre" className="section blanche">
          <p className="surtitre">A+</p>
          <h2 id="titre-vendre" className="titre" style={{ maxWidth: '18ch' }}>Vous créez pour les unions ?</h2>
          <p className="chapeau">Vendez ou louez vos créations depuis votre page vitrine. Chaque création est reliée à votre profil, et votre profil aux unions où vous êtes crédité.</p>
          <Lien className="bouton noir" href="/a-plus" style={{ marginTop: 28 }}>Découvrir A+</Lien>
        </section>
      </main>
      <DockBas lieux={[['catalogue', 'Les créations'], ['vendre', 'Vendre ici']]} />
      <Pied />
    </>
  );
}
