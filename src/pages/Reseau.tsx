import { useEffect, useState } from 'react';
import { Tete, VerbesSite, BoutonBuro, Pied } from '../charte/Charte';
import { Lien } from '../lib/router';
import { useSession } from '../lib/session';
import { initiales, lireReseau, type Profil } from '../lib/reseau';
import { DOMAINES, FICHES, UNION_EXEMPLE, domaine } from '../lib/reseau-exemples';

/* Une carte du Réseau : la même que l'Annuaire d'AIME Wedding (photo 4:5, famille, nom, crédit). */
export type Carte = { href: string; nom: string; etiquette: string; photo?: string; alt?: string; exemple?: boolean; credit?: string | null };
export function CarteReseau({ c }: { c: Carte }) {
  return (
    <article style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Lien className="carte-reseau" href={c.href} style={{ display: 'flex', flexDirection: 'column', gap: 14, textDecoration: 'none', color: 'inherit' }}>
        <div className="ph" style={{ position: 'relative', aspectRatio: '4 / 5', borderRadius: 10, overflow: 'hidden', background: c.photo ? '#E4E4E1' : 'var(--nacre)' }}>
          {c.photo
            ? <img src={c.photo} alt={c.alt || ''} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 28%', display: 'block' }} />
            : <span aria-hidden="true" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'clamp(48px, 6vw, 80px)', fontWeight: 600, letterSpacing: '-0.04em' }}>{initiales(c.nom)}</span>}
          {c.exemple && <span style={{ position: 'absolute', top: 10, left: 10, padding: '4px 9px', borderRadius: 999, background: 'rgba(255,255,255,.92)', fontSize: 12, fontWeight: 600 }}>Exemple</span>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: '#55555A' }}>{c.etiquette}</span>
          <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.03em' }}>{c.nom}</span>
        </div>
      </Lien>
      {c.credit !== undefined && (c.credit
        ? <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#3A3A3F' }}><span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: '#3B6FD8', flex: 'none' }} />{c.credit}</p>
        : <p style={{ margin: 0, fontSize: 14, color: '#55555A' }}>Pas encore crédité dans une union</p>)}
    </article>
  );
}
const deProfil = (p: Profil): Carte & { domaine: string } => ({ href: '/reseau/' + p.ref, nom: p.nom, etiquette: [domaine(p.domaine)?.label, p.metier].filter(Boolean).join(' · '), domaine: p.domaine });

export default function Reseau() {
  const session = useSession();
  const [profils, setProfils] = useState<Profil[] | null>(null);
  const [filtre, setFiltre] = useState<string | null>(() => { const d = new URLSearchParams(window.location.search).get('domaine'); return d && domaine(d) ? d : null; });
  useEffect(() => { lireReseau().then(r => setProfils(r.ok ? r.profils || [] : [])); }, []);
  const cartes = [
    ...FICHES.filter(e => e.vrai).map(e => ({ href: '/reseau/' + e.slug, nom: e.nom, etiquette: domaine(e.domaine)!.label + ' · ' + e.famille, photo: e.photo, alt: e.alt, domaine: e.domaine })),
    ...(profils || []).filter(p => p.ref).map(deProfil),
    ...FICHES.filter(e => !e.vrai).map(e => ({ href: '/reseau/' + e.slug, nom: e.nom, etiquette: e.famille, photo: e.photo, alt: e.alt, exemple: true, credit: e.domaine === 'mariage' ? (e.union ? 'Crédité dans ' + UNION_EXEMPLE : null) : undefined, domaine: e.domaine })),
  ];
  const liste = cartes.filter(c => !filtre || c.domaine === filtre);
  const d = filtre ? domaine(filtre) : null;
  return (
    <>
      <a className="lien-evitement" href="#contenu">Aller au contenu</a>
      <Tete courant="/reseau" verbes={<VerbesSite actif="prestataires" />} />
      <main id="contenu" style={{ padding: '40px var(--marge) 140px' }}>
        <h1 style={{ margin: 0, textAlign: 'center', fontSize: 'clamp(56px, 12vw, 200px)', lineHeight: .86, fontWeight: 600, letterSpacing: '-0.045em', textTransform: 'uppercase' }}>Réseau</h1>
        <p style={{ margin: '20px auto 0', maxWidth: '36rem', textAlign: 'center', fontSize: 'clamp(18px, 1.7vw, 24px)', lineHeight: 1.35 }}>Les personnes et les studios du Monde AIME. Chaque page montre son module : les briques qu’elle utilise, et avec qui.</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginTop: 28 }}>
          {session ? <Lien className="bouton noir" href="/buro?lieu=profil">Mon profil</Lien> : <Lien className="bouton noir" href="/entrer">+ Entrer pour rejoindre le Réseau</Lien>}
        </div>
        <div role="group" aria-label="Filtrer par domaine" style={{ margin: '40px 0 12px', display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[null, ...DOMAINES.map(x => x.id)].map(id => {
            const n = cartes.filter(c => !id || c.domaine === id).length, on = filtre === id;
            return <button key={id || 'tous'} type="button" aria-pressed={on} onClick={() => setFiltre(id)} style={{ minHeight: 44, padding: '0 18px', borderRadius: 999, border: '1px solid #0B0B0C', background: on ? '#0B0B0C' : '#fff', color: on ? '#fff' : '#0B0B0C', fontSize: 15, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>{id ? domaine(id)!.label : 'Tous'}<span style={{ fontSize: 12 }}>{n}</span></button>;
          })}
        </div>
        <p style={{ margin: '0 auto 40px', textAlign: 'center', maxWidth: '40rem', fontSize: 16, color: '#3A3A3F', minHeight: 24 }}>{d ? d.texte : 'Un filtre par domaine, le plus large possible : chaque domaine réunit tous ses métiers.'}</p>
        <p aria-live="polite" style={{ margin: '0 0 20px', fontSize: 15, color: '#55555A' }}>{profils === null ? 'Chargement…' : liste.length + (liste.length > 1 ? ' profils' : ' profil')}</p>
        {liste.length
          ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 250px), 1fr))', gap: '44px 24px' }}>{liste.map(c => <CarteReseau key={c.href} c={c} />)}</div>
          : <div style={{ padding: 'clamp(28px, 4vw, 48px)', borderRadius: 24, border: '2px dashed #BDBDB8', maxWidth: 760 }}>
            <h2 style={{ margin: 0, fontSize: 28, fontWeight: 600 }}>Personne ici pour l’instant.</h2>
            <p className="texte" style={{ marginTop: 12 }}>Ce domaine attend ses premiers profils. Le vôtre, peut-être : créez-le depuis votre espace.</p>
          </div>}
      </main>
      <Pied />
      <BoutonBuro />
    </>
  );
}
