import { useEffect, useState } from 'react';
import { Tete, Verbe, DockBas, BoutonBuro, Pied } from '../charte/Charte';
import { Lien } from '../lib/router';
import { EXEMPLES, UNION_EXEMPLE } from '../lib/reseau-exemples';
import { CarteReseau } from './Reseau';

/* AIME Wedding : le studio de l'union. Une page pour chaque personne qui la fait vivre : les mariés, les prestataires, les invités. */
const W = (s: string) => '/media/wedding/' + s + '.jpg';
const DIAPOS = [
  { src: W('piscine'), who: 'Camille & Gabriel', where: 'Piscine du motel, 18 h 12', alt: 'Un couple de mariés au bord de la piscine d’un motel dans le désert' },
  { src: W('supermarche'), who: 'Les mariés', where: 'Rayon frais, 11 h 40', alt: 'Une mariée pousse un caddie fleuri dans les rayons d’un supermarché' },
  { src: W('laverie'), who: 'Les invités', where: 'Laverie automatique, cycle 40°', alt: 'Les mariés assis sur des machines à laver, entourés d’invités' },
  { src: W('wagon'), who: 'Le maître d’hôtel', where: 'Wagon-restaurant, entre deux tunnels', alt: 'Les mariés dans un wagon-restaurant devant des montagnes enneigées' },
  { src: '/media/sous-la-mer.jpg', who: 'L’officiant', where: 'Sous la mer, 20 h', alt: 'Une cérémonie sous un dôme vitré entouré de poissons' },
  { src: '/media/scene.jpg', who: 'Le DJ', where: 'Le club, 2 h 17', alt: 'Les mariés s’embrassent au milieu d’une piste de danse éclairée en rose' },
  { src: '/media/phare.jpg', who: 'Le photographe', where: 'Le phare, marée haute', alt: 'Un couple au pied d’un phare face à la mer agitée au coucher du soleil' },
  { src: '/media/facade.jpg', who: 'Le chauffeur', where: 'Las Vegas, 23 h 59', alt: 'Une limousine blanche devant une chapelle de mariage illuminée à Las Vegas' },
];
const UNIONS = [
  { nom: UNION_EXEMPLE, ou: 'Motel dans le désert', src: W('union-camille-gabriel'), alt: 'Un couple danse sous les étoiles devant un motel du désert' },
  { nom: 'Inès & Hugo', ou: 'Toits de Paris', src: W('union-ines-hugo'), alt: 'Un couple sur un balcon face aux toits de Paris et à la tour Eiffel' },
  { nom: 'Lou & Marius', ou: 'Cinéma de quartier', src: W('union-lou-marius'), alt: 'Un couple de mariés sur la scène d’un cinéma au rideau rouge' },
];
const INVITES = [
  { nom: 'Les témoins', ou: 'Ceux qui étaient là depuis le début', src: W('invites-temoins'), alt: 'Des invités trinquent dans une cour éclairée de guirlandes' },
  { nom: 'La table 7', ou: 'Vue sur la mer', src: W('invites-table-7'), alt: 'Une longue table dressée sur une terrasse face à la mer' },
  { nom: 'Les copains de fac', ou: 'Arrivés à la dernière minute', src: W('invites-copains'), alt: 'Un groupe d’amis rit dans une rue pavée' },
];
const COLLECTIONS = [
  { nom: 'Châteaux & bals', ou: 'Pierre, lustres et feux de Bengale', src: W('collection-chateaux'), alt: 'Un bal de mariage devant un château illuminé' },
  { nom: 'Nuits électro', ou: 'Jusqu’au lever du jour', src: W('collection-electro'), alt: 'Des mariés s’embrassent sur une piste de danse aux néons' },
  { nom: 'Bord de mer', ou: 'Falaises, vent et sel', src: W('collection-mer'), alt: 'Une table de mariage près d’une bergerie au-dessus de la mer' },
  { nom: 'Forêts & jardins', ou: 'Sous les arbres', src: W('collection-forets'), alt: 'Une cérémonie dans l’allée de tilleuls d’un château' },
];
const PLACES = [
  ['01', 'J’organise', 'Les mariés', 'La page de votre union : votre histoire, votre jour, et tout ce que vous voulez partager.'],
  ['02', 'Je coordonne', 'Organisateurs, témoins', 'Chacun voit ce qui le concerne, au bon moment, sans rien perdre du reste.'],
  ['03', 'Je contribue', 'Les prestataires', 'Votre page vitrine et le module pensé pour votre métier.'],
  ['04', 'Je participe', 'Les invités', 'Votre place dans l’union : vos souvenirs, vos messages, vos photos.'],
];
const FAMILLES = ['La cérémonie', 'La table', 'La musique', 'L’image', 'La scène'];

function Figure({ x, ratio = '4 / 5' }: { x: { nom: string; ou: string; src: string; alt: string }; ratio?: string }) {
  return (
    <figure style={{ margin: 0 }}>
      <div style={{ aspectRatio: ratio, borderRadius: 10, overflow: 'hidden', background: '#E4E4E1' }}><img src={x.src} alt={x.alt} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>
      <figcaption style={{ marginTop: 14 }}><span style={{ display: 'block', fontSize: 22, fontWeight: 600, letterSpacing: '-0.03em' }}>{x.nom}</span><span style={{ fontSize: 15, color: '#55555A' }}>{x.ou}</span></figcaption>
    </figure>
  );
}
function Entete({ id, sur, titre, texte, lien }: { id: string; sur: string; titre: string; texte: string; lien?: [string, string] }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 24, flexWrap: 'wrap', marginBottom: 40 }}>
      <div><p className="surtitre">{sur}</p><h2 id={id} className="titre">{titre}</h2><p className="chapeau" style={{ marginTop: 14 }}>{texte}</p></div>
      {lien && <Lien className="bouton" href={lien[1]}>{lien[0]}</Lien>}
    </div>
  );
}

export default function AimeWedding() {
  const [i, setI] = useState(0);
  const [lecture, setLecture] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [famille, setFamille] = useState<string | null>(null);
  useEffect(() => { if (!lecture) return; const t = setInterval(() => setI(n => (n + 1) % DIAPOS.length), 6000); return () => clearInterval(t); }, [lecture]);
  const d = DIAPOS[i];
  const presta = EXEMPLES.filter(e => e.domaine === 'mariage' && (!famille || e.famille === famille));
  const bouton = { height: 44, padding: '0 16px', borderRadius: 22, border: '1px solid rgba(255,255,255,.7)', background: 'rgba(11,11,12,.35)', color: '#fff', fontWeight: 600 } as const;
  return (
    <>
      <a className="lien-evitement" href="#contenu">Aller au contenu</a>
      <Tete courant="/aime-wedding" verbes={<><Verbe href="/point-zero?q=Nous%20nous%20marions">Créer ma page</Verbe><Verbe href="/reseau?domaine=mariage">Réseau</Verbe></>} />
      <main id="contenu">
        <section aria-labelledby="titre-wedding" style={{ padding: '40px var(--marge) 0', textAlign: 'center' }}>
          <p style={{ margin: '0 0 18px', fontSize: 16 }}>Une union d’exemple · <b style={{ fontWeight: 600 }}>{UNION_EXEMPLE}</b></p>
          <h1 id="titre-wedding" className="signature" style={{ fontSize: 'clamp(56px, 12.6vw, 216px)' }}>AIME Wedding</h1>
          <p style={{ margin: '22px auto 0', maxWidth: '40rem', fontSize: 'clamp(17px, 1.5vw, 21px)', lineHeight: 1.45, color: '#3A3A3F' }}>Le site officiel de l’union. Une page pour chaque personne qui la fait vivre : les mariés, les prestataires, les invités.</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 22, flexWrap: 'wrap' }}>
            <span aria-hidden="true" style={{ display: 'flex' }}>{EXEMPLES.slice(0, 5).map((e, k) => <img key={e.slug} src={e.photo} alt="" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', objectPosition: 'center 22%', border: '2px solid #F6F6F4', marginLeft: k ? -10 : 0 }} />)}</span>
            <a href="#prestataires" style={{ fontSize: 18, fontWeight: 600, textUnderlineOffset: 4 }}>Les mariés et toute l’équipe de l’union</a>
          </div>
          <div style={{ position: 'relative', marginTop: 44, height: 'clamp(24rem, 54vw, 50rem)', borderRadius: 10, overflow: 'hidden', background: '#111', textAlign: 'left' }}>
            {DIAPOS.map((x, k) => <img key={x.src} src={x.src} alt={k === i ? x.alt : ''} aria-hidden={k !== i} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: k === i ? 1 : 0, transition: 'opacity .9s ease' }} />)}
            <div aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '46%', background: 'linear-gradient(to top, rgba(0,0,0,.65), rgba(0,0,0,0))' }} />
            <div style={{ position: 'absolute', left: 'clamp(16px, 3vw, 40px)', right: 'clamp(16px, 3vw, 40px)', bottom: 'clamp(18px, 3vw, 36px)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', color: '#fff' }}>
              <p aria-live="polite" style={{ margin: 0 }}><span style={{ display: 'block', fontSize: 13, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase' }}>{String(i + 1).padStart(2, '0')} / {String(DIAPOS.length).padStart(2, '0')} · {d.who}</span><span style={{ display: 'block', marginTop: 6, fontSize: 'clamp(22px, 2.6vw, 38px)', fontWeight: 600, letterSpacing: '-0.02em' }}>{d.where}</span></p>
              <span style={{ display: 'flex', gap: 8 }}>
                <button type="button" style={bouton} onClick={() => setI((i - 1 + DIAPOS.length) % DIAPOS.length)}>Précédent</button>
                <button type="button" style={bouton} aria-pressed={!lecture} onClick={() => setLecture(l => !l)}>{lecture ? 'Pause' : 'Lecture'}</button>
                <button type="button" style={bouton} onClick={() => setI((i + 1) % DIAPOS.length)}>Suivant</button>
              </span>
            </div>
          </div>
        </section>

        <section id="unions" aria-labelledby="titre-unions" className="section" style={{ borderTop: 0 }}>
          <Entete id="titre-unions" sur="Unions" titre="Les pages des mariés" texte="Chaque couple raconte son union à sa façon. Ce sont des exemples : la vôtre commence au Point Zéro." lien={['Créer la page de notre union', '/point-zero?q=Nous%20nous%20marions']} />
          <div className="grille-auto" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '40px 24px' }}>{UNIONS.map(u => <Figure key={u.nom} x={u} />)}</div>
        </section>

        <section id="prestataires" aria-labelledby="titre-presta" className="section blanche">
          <Entete id="titre-presta" sur="Prestataires" titre="Une page et un module pour chaque métier" texte="Chaque prestataire a sa page dans le Réseau, avec son module : les briques qu’il voit, qu’il fait et qu’il partage." lien={['Tout le Réseau mariage', '/reseau?domaine=mariage']} />
          <div role="group" aria-label="Filtrer par famille" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 32 }}>
            {[null, ...FAMILLES].map(f => { const on = famille === f, n = EXEMPLES.filter(e => e.domaine === 'mariage' && (!f || e.famille === f)).length;
              return <button key={f || 'tous'} type="button" aria-pressed={on} onClick={() => setFamille(f)} style={{ minHeight: 44, padding: '0 18px', borderRadius: 999, border: '1px solid #0B0B0C', background: on ? '#0B0B0C' : '#fff', color: on ? '#fff' : '#0B0B0C', fontSize: 15, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>{f || 'Tous'}<span style={{ fontSize: 12 }}>{n}</span></button>; })}
          </div>
          <ul className="cartes ligne" tabIndex={0} aria-label="Les prestataires, à faire défiler">
            {presta.map(e => <li key={e.slug} style={{ flexBasis: 'min(70vw, 280px)' }}><CarteReseau c={{ href: '/reseau/' + e.slug, nom: e.nom, etiquette: e.famille, photo: e.photo, alt: e.alt, exemple: true, credit: e.union ? 'Crédité dans ' + UNION_EXEMPLE : null }} /></li>)}
          </ul>
        </section>

        <section id="invites" aria-labelledby="titre-invites" className="section">
          <Entete id="titre-invites" sur="Invités" titre="Chaque invité a sa page" texte="Les témoins, la table 7, les copains de fac : ses souvenirs et sa place dans l’histoire." />
          <div className="grille-auto" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '40px 24px' }}>{INVITES.map(u => <Figure key={u.nom} x={u} ratio="4 / 3" />)}</div>
        </section>

        <section id="collections" aria-labelledby="titre-collections" className="section blanche">
          <Entete id="titre-collections" sur="Collections" titre="Explorer les unions par univers" texte="Châteaux, nuits électro, bord de mer, forêts : chaque union rejoint son univers." />
          <ul className="cartes ligne" tabIndex={0} aria-label="Les collections, à faire défiler">{COLLECTIONS.map(c => <li key={c.nom}><Figure x={c} ratio="4 / 3" /></li>)}</ul>
        </section>

        <section id="chacun" aria-labelledby="titre-chacun" className="section">
          <p className="surtitre">Une page pour chacun</p>
          <h2 id="titre-chacun" className="titre" style={{ maxWidth: '22ch' }}>On ne peut pas tout être au même moment. Mais on peut être bien plus qu’une seule chose.</h2>
          <ol style={{ listStyle: 'none', margin: '56px 0 0', padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: '40px 32px' }}>
            {PLACES.map(([n, t, q, x]) => <li key={n} style={{ borderTop: '1px solid #0B0B0C', paddingTop: 18 }}><p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#55555A' }}>{n} · {q}</p><h3 style={{ margin: '6px 0 10px', fontSize: 24, fontWeight: 600 }}>{t}</h3><p className="texte">{x}</p></li>)}
          </ol>
        </section>

        <section id="espace" aria-labelledby="titre-espace" className="section blanche" style={{ paddingBottom: 160 }}>
          <p className="surtitre">L’espace AIME Wedding</p>
          <h2 id="titre-espace" className="titre" style={{ maxWidth: '20ch' }}>Après le « + », chacun retrouve son espace.</h2>
          <p className="chapeau">Son union, ses invités, ses documents, et ce qu’on lui partage. En haut, des verbes ; en bas, des lieux : projets, partagés avec moi, archives. Chaque projet choisit qui le voit : privé, restreint, par lien ou public.</p>
          <div style={{ marginTop: 28, display: 'flex', gap: 10, flexWrap: 'wrap' }}><Lien className="bouton noir" href="/buro">Ouvrir mon espace</Lien><Lien className="bouton" href="/#docks">Comprendre les deux docks</Lien></div>
        </section>
      </main>
      <DockBas lieux={[['unions', 'Unions'], ['prestataires', 'Prestataires'], ['invites', 'Invités'], ['collections', 'Collections'], ['chacun', 'Pour chacun'], ['espace', 'Votre espace']]} />
      <Pied />
      <BoutonBuro />
    </>
  );
}
