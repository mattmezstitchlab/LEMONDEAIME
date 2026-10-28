import { useEffect, useState } from 'react';
import { Tete, DockBas, VerbesSite, Pied } from '../charte/Charte';
import { Lien } from '../lib/router';
import { useSession } from '../lib/session';
import { lireReseau, photoProfil, type Profil } from '../lib/reseau';
import { CarteReseau, type Carte } from '../charte/CartePersonne';
import { useCritereDate } from '../lib/critereDate';
import { CritereDate } from '../charte/CritereDate';
import { DOMAINES, FICHES, UNION_EXEMPLE, domaine } from '../lib/reseau-exemples';

export { CarteReseau, type Carte } from '../charte/CartePersonne';
const deProfil = (p: Profil, date: string | null): Carte & { domaine: string } => ({ href: '/reseau/' + p.ref, nom: p.nom, etiquette: [domaine(p.domaine)?.label, p.metier].filter(Boolean).join(' · '), domaine: p.domaine,
  ref: p.ref, photo: p.photo && p.ref ? photoProfil(p.ref) : undefined, alt: p.photo ? 'Photo de ' + p.nom : undefined, etat: p.etat || null, date });

export default function Reseau() {
  const session = useSession();
  const [profils, setProfils] = useState<Profil[] | null>(null);
  const [filtre, setFiltre] = useState<string | null>(() => { const d = new URLSearchParams(window.location.search).get('domaine'); return d && domaine(d) ? d : null; });
  const critere = useCritereDate();
  const date = critere.date;
  useEffect(() => { lireReseau(date).then(r => setProfils(r.ok ? r.profils || [] : [])); }, [date]);
  const cartes = [
    ...FICHES.filter(e => e.vrai).map(e => ({ href: '/reseau/' + e.slug, nom: e.nom, etiquette: domaine(e.domaine)!.label + ' · ' + e.famille, photo: e.photo, alt: e.alt, domaine: e.domaine, fiche: { nom: e.nom, metier: e.titre, bio: e.texte } })),
    ...(profils || []).filter(p => p.ref).map(p => ({ ...deProfil(p, date), href: deProfil(p, date).href + critere.suffixe })),
    ...FICHES.filter(e => !e.vrai).map(e => ({ href: '/reseau/' + e.slug, nom: e.nom, etiquette: e.famille, photo: e.photo, alt: e.alt, exemple: true, fiche: { nom: e.nom, bio: e.texte }, credit: e.domaine === 'mariage' ? (e.union ? 'Crédité dans ' + UNION_EXEMPLE : null) : undefined, domaine: e.domaine })),
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
        <CritereDate />
        <p aria-live="polite" style={{ margin: '0 0 20px', fontSize: 15, color: '#55555A' }}>{profils === null ? 'Chargement…' : liste.length + (liste.length > 1 ? ' profils' : ' profil')}</p>
        {liste.length
          ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 250px), 1fr))', gap: '44px 24px' }}>{liste.map(c => <CarteReseau key={c.href} c={c} />)}</div>
          : <div style={{ padding: 'clamp(28px, 4vw, 48px)', borderRadius: 24, border: '2px dashed #BDBDB8', maxWidth: 760 }}>
            <h2 style={{ margin: 0, fontSize: 28, fontWeight: 600 }}>Personne ici pour l’instant.</h2>
            <p className="texte" style={{ marginTop: 12 }}>Ce domaine attend ses premiers profils. Le vôtre, peut-être : créez-le depuis votre espace.</p>
          </div>}
      </main>
      <Pied />
      <DockBas />
    </>
  );
}
