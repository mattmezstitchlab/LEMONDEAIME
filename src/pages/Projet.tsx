import { useEffect, useState } from 'react';
import { Tete, VerbesProjets, Pied } from '../charte/Charte';
import { Lien } from '../lib/router';
import { ETATS, lireProjet, useAdmin, useProjets, type Projet as P } from '../lib/projets';
import { CarteProjet, Visiter } from './Portfolio';

/* /projets/<slug> : la page de présentation d'un projet, à la manière d'Awwwards. Le titre, l'accroche, la fiche (catégorie,
   année, état, rôle) et « Visiter le site » ; la grande image, le texte, la galerie ; puis le projet suivant. */
export default function Projet({ slug }: { slug: string }) {
  const [p, setP] = useState<P | null | undefined>(undefined);
  const tous = useProjets();
  const admin = useAdmin();
  useEffect(() => { let vivant = true; setP(undefined); lireProjet(slug).then(x => { if (vivant) setP(x); }); return () => { vivant = false; }; }, [slug, admin]);
  useEffect(() => { document.title = p ? p.titre + ' — LE MONDE AIME' : p === null ? 'LE MONDE AIME — Projet introuvable' : 'LE MONDE AIME'; }, [p]);
  const liste = tous || [];
  const k = p ? liste.findIndex(x => x.slug === p.slug) : -1;
  const suivant = liste.length > 1 ? liste[(k + 1) % liste.length] : null;
  return (
    <>
      <a className="lien-evitement" href="#contenu">Aller au contenu</a>
      <Tete courant={'/projets/' + slug} verbes={<VerbesProjets actif="projets" />} />
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
              <Visiter p={p} className="bouton noir" />
              <Lien className="bouton" href="/projets#projets">Tous les projets</Lien>
              {admin && <Lien className="bouton" href={'/admin?projet=' + p.slug}>Modifier</Lien>}
            </div>
          </section>
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
