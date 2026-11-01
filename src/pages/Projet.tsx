import { useEffect, useState } from 'react';
import {Tete, Pied } from '../charte/Charte';
import { Lien } from '../lib/router';
import { ETATS, externe, lireProjet, useAdmin, useProjets, type Projet as P } from '../lib/projets';
import { CarteProjet, Visiter } from './Portfolio';
import { ENTREES_BRODERIE, estBroderie, ouvrageARepris, ROSACE } from '../lib/entreesBroderie.mjs';

/* /projets/<slug> : la page de présentation d'un projet, à la manière d'Awwwards. Le titre, l'accroche, la fiche (catégorie,
   année, état, rôle) et « Visiter le site » ; la grande image, le texte, la galerie ; puis le projet suivant. */
export default function Projet({ slug }: { slug: string }) {
  const [p, setP] = useState<P | null | undefined>(undefined);
  const tous = useProjets();
  const [reprise] = useState(() => { try { return ouvrageARepris(window.localStorage); } catch { return null; } });
  const admin = useAdmin();
  useEffect(() => { let vivant = true; setP(undefined); lireProjet(slug).then(x => { if (vivant) setP(x); }); return () => { vivant = false; }; }, [slug, admin]);
  useEffect(() => { document.title = p ? p.titre + ' — LE MONDE AIME' : p === null ? 'LE MONDE AIME — Projet introuvable' : 'LE MONDE AIME'; }, [p]);
  const liste = tous || [];
  const k = p ? liste.findIndex(x => x.slug === p.slug) : -1;
  const suivant = liste.length > 1 ? liste[(k + 1) % liste.length] : null;
  return (
    <>
      <a className="lien-evitement" href="#contenu">Aller au contenu</a>
      <Tete courant={'/projets/' + slug} />
      <main id="contenu">
        {p === undefined && <p className="pf-attente" role="status">Chargement du projet…</p>}
        {p === null && <section className="pf-tete" aria-labelledby="titre-introuvable">
          <p className="surtitre">Projet</p>
          <h1 id="titre-introuvable" className="titre">Ce projet n’existe pas, ou n’est pas encore publié.</h1>
          <p className="chapeau"><Lien href="/projets#projets">Voir tous les projets</Lien></p>
        </section>}
        {p && <>
          <section aria-labelledby="titre-projet" className="pf-tete">
            {!p.publie && <p className="pf-brouillon" role="note">Brouillon : seule l’administration voit cette page.</p>}
            <p className="surtitre"><Lien href="/projets#projets" style={{ color: 'inherit' }}>Projets</Lien> · {p.categorie}</p>
            <h1 id="titre-projet" className="pf-titre-projet">{p.titre}</h1>
            {p.accroche && <p className="chapeau" style={{ maxWidth: '40ch' }}>{p.accroche}</p>}
            <dl className="pf-fiche">
              <div><dt>Catégorie</dt><dd>{p.categorie}</dd></div>
              <div><dt>Année</dt><dd>{p.annee}</dd></div>
              <div><dt>État</dt><dd>{ETATS[p.statut] || p.statut}</dd></div>
              {p.role && <div><dt>Rôle</dt><dd>{p.role}</dd></div>}
            </dl>
            <div className="pf-boutons">
              {p.slug === 'brode-way' && <Lien className="bouton noir" href={ROSACE}>Découvrir ROSACE</Lien>}
              <Visiter p={p} className={p.slug === 'brode-way' ? 'bouton' : 'bouton noir'} />
              {(p.liens || []).map(l => externe(l.href)
                ? <a key={l.href} className="bouton" href={l.href} target="_blank" rel="noopener">{l.libelle}<span className="sr-only"> ({p.titre}, nouvel onglet)</span></a>
                : <Lien key={l.href} className="bouton" href={l.href}>{l.libelle}</Lien>)}
              <Lien className="bouton" href="/projets#projets">Tous les projets</Lien>
              {admin && <Lien className="bouton" href={'/admin?projet=' + p.slug}>Modifier</Lien>}
            </div>
          </section>
          {estBroderie(p) && <section aria-labelledby="titre-entrees" className="section" style={{ paddingInline: 'var(--marge)' }}>
            <h2 id="titre-entrees" className="surtitre">Entrer dans l’atelier</h2>
            <ul className="ac-chemins" aria-label="Entrées directes dans l’atelier de broderie">
              {ENTREES_BRODERIE.map(e => {
                const vide = e.id === 'reprendre' && !reprise;
                const sub = e.id === 'reprendre' ? (reprise ? 'Reprendre « ' + reprise.nom + ' », tel que vous l’avez laissé sur cet appareil.' : 'Aucun ouvrage sur cet appareil pour l’instant. Créez un motif ou importez un patron : il s’ouvrira ici ensuite.') : e.sub;
                return vide
                  ? <li key={e.id}><span className="ac-chemin" data-entree={e.id} data-vide="true" aria-disabled="true" style={{ opacity: .72 }}><span style={{ margin: 0 }}><b>{e.nom}</b><span>{sub}</span></span><em>Aucun ouvrage</em></span></li>
                  : <li key={e.id}><a className="ac-chemin" href={e.href} data-entree={e.id}><span style={{ margin: 0 }}><b>{e.nom}</b><span>{sub}</span></span><em>Atelier Brode Way<span className="sr-only"> (s’ouvre dans le Studio)</span></em></a></li>;
              })}
            </ul>
          </section>}
          {p.couverture && <figure className="pf-couverture"><img src={p.couverture} alt={p.alt} /></figure>}
          {p.description && <section aria-label="Le projet" className="section blanche">
            <div className="pf-description">{p.description.split(/\n{2,}/).map((t, n) => <p key={n} className="texte">{t}</p>)}</div>
          </section>}
          {p.galerie.length > 0 && <section aria-labelledby="titre-galerie" className="section">
            <h2 id="titre-galerie" className="surtitre">Galerie</h2>
            <ul className="pf-galerie">{p.galerie.map(g => <li key={g.src}><img src={g.src} alt={g.alt} loading="lazy" /></li>)}</ul>
          </section>}
          {suivant && suivant.slug !== p.slug && <section aria-labelledby="titre-suivant" className="section blanche">
            <h2 id="titre-suivant" className="surtitre">Projet suivant</h2>
            <div style={{ maxWidth: 640 }}><CarteProjet p={suivant} /></div>
          </section>}
        </>}
      </main>
      <Pied />
    </>
  );
}
