import { useMemo, useState } from 'react';
import {Tete, DockBas, Pied } from '../charte/Charte';
import { Lien } from '../lib/router';
import { FONDATEUR } from '../lib/reseau-exemples';
import { CarteReseau } from './Reseau';
import { ETATS, categories, externe, useAdmin, useProjets, type Projet } from '../lib/projets';

/* LE MONDE AIME (/) : le portfolio des projets d'AIME, à la manière d'Awwwards. Le projet à la une en grand, puis tous les projets
   en cartes (filtrables par catégorie), chacune ouvrant sa page de présentation ; enfin le fondateur. */

/* Les autres univers d'AIME, avec l'état réel de chacun. Des liens vers des pages qui existent ; A+ n'ouvre pas encore. */
const UNIVERS: { nom: string; sub: string; href: string | null; etat: string }[] = [
  { nom: 'Point Zéro', sub: 'La Grille 44 : ce qu’on écrit allume les briques et leurs causalités.', href: '/point-zero', etat: 'Disponible' },
  { nom: 'L’atelier de broderie', sub: 'Le Studio : composer et broder un point de croix.', href: '/studio/atelier', etat: 'Disponible' },
  { nom: '.0NE', sub: 'La mosaïque universelle du Studio.', href: '/studio/one/univers', etat: 'Disponible' },
  { nom: 'La journée en musique', sub: 'Les morceaux d’une journée de mariage.', href: '/musique', etat: 'Avec connexion' },
  { nom: 'La boutique', sub: 'Des créations montrées en exemples ; la commande n’est pas encore ouverte.', href: '/boutique', etat: 'Exemples' },
  { nom: 'Le réseau', sub: 'Prestataires, artistes et organisations du Monde AIME.', href: '/reseau', etat: 'Disponible · avec des fiches d’exemple' },
  { nom: 'A+', sub: 'Une vitrine, des devis, des factures pour les professionnels.', href: null, etat: 'Bientôt' },
];

/* « Visiter le site » : une page du site s'ouvre ici ; une adresse https s'ouvre à côté */
export function Visiter({ p, className = 'bouton' }: { p: Projet; className?: string }) {
  if (!p.lien) return null;
  return externe(p.lien)
    ? <a className={className} href={p.lien} target="_blank" rel="noopener">Visiter le site<span className="sr-only"> {p.titre} (nouvel onglet)</span></a>
    : <Lien className={className} href={p.lien}>Visiter le site<span className="sr-only"> {p.titre}</span></Lien>;
}
export const Etat = ({ s }: { s: Projet['statut'] }) => <span className={'pf-etat ' + s}>{ETATS[s] || s}</span>;

export function CarteProjet({ p, titre = 'h3' }: { p: Projet; titre?: 'h2' | 'h3' }) {
  const T = titre;
  return (
    <article className="pf-carte">
      <Lien href={'/projets/' + p.slug} className="pf-carte-lien">
        <div className="pf-image">{p.couverture ? <img src={p.couverture} alt={p.alt} loading="lazy" /> : <span aria-hidden="true">{p.titre.slice(0, 1)}</span>}</div>
        <div className="pf-carte-texte">
          <T className="pf-carte-titre">{p.titre}</T>
          <Etat s={p.statut} />
        </div>
      </Lien>
      <p className="pf-meta">{p.categorie} · {p.annee}</p>
      {p.accroche && <p className="pf-accroche">{p.accroche}</p>}
    </article>
  );
}

export default function Portfolio() {
  const projets = useProjets();
  const admin = useAdmin();
  const [cat, setCat] = useState<string | null>(null);
  const liste = useMemo(() => projets || [], [projets]);
  const une = liste.find(p => p.une) || liste[0];
  const cats = categories(liste);
  const vus = liste.filter(p => !cat || p.categorie === cat);
  return (
    <>
      <a className="lien-evitement" href="#contenu">Aller au contenu</a>
      <Tete courant="/projets" />
      <main id="contenu">
        <section aria-labelledby="titre-monde" className="pf-tete">
          <p className="surtitre">Les projets de {FONDATEUR.nom}</p>
          <h1 id="titre-monde" className="signature">Le Monde AIME</h1>
          <p className="chapeau" style={{ maxWidth: '36ch' }}>Des sites et des studios conçus, dessinés et construits par AIME®. Chacun a sa page : ce qu’il fait, comment, et où le visiter.</p>
          {import.meta.env.VITE_PROTOTYPES === '1'
            ? <p className="pf-autres"><a href="/studio/one/lumiere">Voir le film LUMIERE</a> · <a href="/studio/one/univers">Entrer dans .0NE</a> · <a href="/studio/explorer">Tout explorer</a></p>
            : <p className="pf-autres"><a href="/studio/">L’atelier de broderie</a> · <a href="/studio/one/univers">Entrer dans .0NE</a></p>}
          {admin && <p style={{ marginTop: 20 }}><Lien className="bouton" href="/admin">Administrer les projets</Lien></p>}
        </section>

        {projets === null && <p className="pf-attente" role="status">Chargement des projets…</p>}

        {une && <section id="une" aria-labelledby="titre-une" className="pf-une-section">
          <h2 id="titre-une" className="sr-only">À la une</h2>
          <article className="pf-une">
            {une.couverture && <img src={une.couverture} alt={une.alt} />}
            <div className="pf-une-voile" aria-hidden="true" />
            <div className="pf-une-texte">
              <p className="pf-une-sur">À la une · {une.categorie} · {une.annee}</p>
              <h3 className="pf-une-titre">{une.titre}</h3>
              {une.accroche && <p className="pf-une-accroche">{une.accroche}</p>}
              <div className="pf-boutons">
                <Lien className="bouton noir pf-sur-image" href={'/projets/' + une.slug}>Voir le projet<span className="sr-only"> {une.titre}</span></Lien>
                <Visiter p={une} className="bouton pf-sur-image clair" />
              </div>
            </div>
          </article>
        </section>}

        {projets !== null && <section id="projets" aria-labelledby="titre-projets" className="section blanche pf-projets">
          <div className="pf-entete">
            <h2 id="titre-projets" className="titre">Projets <span className="pf-compte">{liste.length}</span></h2>
            {cats.length > 1 && <div role="group" aria-label="Filtrer par catégorie" className="rangee-puces">
              {[null, ...cats].map(c => { const on = cat === c, n = liste.filter(p => !c || p.categorie === c).length;
                return <button key={c || 'tous'} type="button" className="pf-puce" aria-pressed={on} onClick={() => setCat(c)}>{c || 'Tous'}<span>{n}</span></button>; })}
            </div>}
          </div>
          {vus.length
            ? <ul className="pf-grille" aria-label={cat ? 'Projets : ' + cat : 'Tous les projets'}>{vus.map(p => <li key={p.slug}><CarteProjet p={p} /></li>)}</ul>
            : <p className="texte">Aucun projet publié pour l’instant.</p>}
        </section>}


        <section id="univers" aria-labelledby="titre-univers" className="section pf-univers">
          <p className="surtitre">Projets &amp; Créations</p>
          <h2 id="titre-univers" className="titre" style={{ maxWidth: '18ch' }}>Les autres univers d’AIME</h2>
          <p className="chapeau" style={{ maxWidth: '46ch' }}>Chacun garde sa page et son moteur. Ces liens mènent aux univers qui existent aujourd’hui.</p>
          <ul className="pf-univers-liste" aria-label="Autres univers d’AIME">
            {UNIVERS.map(u => <li key={u.nom}>{u.href
              ? <Lien href={u.href}><span style={{ margin: 0 }}><b>{u.nom}</b><span>{u.sub}</span></span><em>{u.etat}</em></Lien>
              : <div className="pf-univers-bientot"><span style={{ margin: 0 }}><b>{u.nom}</b><span>{u.sub}</span></span><em>{u.etat}</em></div>}</li>)}
          </ul>
        </section>

        <section id="fondateur" aria-labelledby="titre-fondateur" className="section">
          <div className="pf-fondateur">
            <div style={{ maxWidth: 340 }}><CarteReseau c={{ href: '/reseau/' + FONDATEUR.slug, nom: FONDATEUR.nom, etiquette: FONDATEUR.famille, photo: FONDATEUR.photo, alt: FONDATEUR.alt }} /></div>
            <div>
              <p className="surtitre">Le fondateur</p>
              <h2 id="titre-fondateur" className="titre" style={{ maxWidth: '16ch' }}>{FONDATEUR.titre}</h2>
              <p className="chapeau">{FONDATEUR.texte}</p>
              <div style={{ marginTop: 28, display: 'flex', gap: 10, flexWrap: 'wrap' }}><Lien className="bouton noir" href={'/reseau/' + FONDATEUR.slug}>Voir son profil</Lien><Lien className="bouton" href="/a-propos">À propos d’AIME</Lien></div>
            </div>
          </div>
        </section>
      </main>
      <DockBas lieux={[...(une ? [['une', 'À la une'] as [string, string]] : []), ['projets', 'Projets'], ['univers', 'Univers'], ['fondateur', 'Fondateur']]} />
      <Pied />
    </>
  );
}
