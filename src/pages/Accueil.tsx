import { useMemo, useRef, useState } from 'react';
import { Tete, DockBas, Pied, Orbe } from '../charte/Charte';
import { Lien } from '../lib/router';
import { useSession } from '../lib/session';
import { useProjets } from '../lib/projets';
import { CarteProjet } from './Portfolio';
import { CHEMINS, DESTINATIONS, ETATS, proposer } from '../lib/intention.mjs';
import TransitionBroderie from '../charte/TransitionBroderie';
import { importerPdfHref } from '../lib/pointzero';

/* LA PREMIÈRE PAGE (/) : Porte 1 d'AIME Wedding, livraison A1 : deux panneaux égaux, Mariage et Broderie, puis la transition photographie → broderie.
   Mariage garde le h1 et ses deux vraies actions. Broderie : « Importer mon patron PDF » reste indisponible (« Bientôt ») tant que Point Zéro est protégé (lib/pointzero.ts) ; « Explorer la broderie » mène à la section de cette page.
   Avant A1, le héros disait la promesse du mariage et porte deux vraies actions
   (Créer notre mariage → /buro?creer=mariage, Retrouver notre mariage → /buro) ; une section dit ce qui existe aujourd'hui, et seulement cela.
   La zone d'intention et les quatre chemins (moteur inchangé, lib/intention.mjs) sont repliés plus bas : ils ne concurrencent plus le mariage.
   Rien n'est simulé : chaque lien mène à une page existante ; la zone d'intention propose (elle n'exécute rien). */
type Chemin = keyof typeof CHEMINS;
const ORDRE: Chemin[] = ['organiser', 'creer', 'projets', 'decouvrir'];

export default function Accueil() {
  const importer = importerPdfHref();
  const session = useSession();
  const projets = useProjets();
  const [texte, setTexte] = useState('');
  const [fichier, setFichier] = useState<{ name: string; type: string } | null>(null);
  const [depot, setDepot] = useState(false);
  const [ouvert, setOuvert] = useState(false);
  const entree = useRef<HTMLInputElement>(null);
  const champ = useRef<HTMLInputElement>(null);
  const p = useMemo(() => proposer(texte, fichier), [texte, fichier]);
  const etatChemin = (c: Chemin) => {
    const e = DESTINATIONS[c].etat as keyof typeof ETATS;
    if (c === 'projets') return session === undefined ? 'Vérification de la connexion…' : session ? 'Connecté : votre espace s’ouvre.' : 'Connexion nécessaire';
    return ETATS[e];
  };
  const etatProp = (e: string) => e === 'connexion' ? (session ? 'Connecté' : session === undefined ? 'Vérification…' : ETATS.connexion) : ETATS[e as keyof typeof ETATS];
  return (
    <>
      <a className="lien-evitement" href="#contenu">Aller au contenu</a>
      <Tete courant="/" />
      <main id="contenu">
        <div className="ac-cadre ac-deux" id="entree">
          <section className="ac-pan ac-pan-mariage" aria-labelledby="titre-entree">
            <img src="/media/union.jpg" alt="Un couple de mariés danse la nuit dans le désert, près d’une voiture ancienne et d’un tourne-disque, sous un ciel d’étoiles." />
            <div className="ac-pan-contenu">
              <p className="surtitre">LE MONDE AIME® · Mariage</p>
              <h1 id="titre-entree" className="signature">{'Vous imaginez votre mariage.\nAIME lui donne forme.'}</h1>
              <p className="ac-hero-sous">Tout votre mariage, au même endroit.</p>
              <p className="ac-hero-actions">
                <Lien className="bouton ac-cta" href="/buro?creer=mariage" data-action="creer">Créer notre mariage</Lien>
                <Lien className="bouton ac-cta ac-cta-calme" href="/buro" data-action="retrouver">Retrouver notre mariage</Lien>
              </p>
            </div>
          </section>
          <section className="ac-pan ac-pan-broderie" aria-labelledby="titre-broderie-pan">
            <img src="/media/broderie.jpg" alt="Une brodeuse tient une tablette où s’affiche une grille de broderie, et un tambour brodé d’une rose." />
            <div className="ac-pan-contenu">
              <p className="surtitre">Broderie — L’atelier Point Zéro</p>
              <h2 id="titre-broderie-pan" className="signature">{'Votre patron.\nVotre toile.\nVotre création.'}</h2>
              <p className="ac-hero-sous">Importez, dessinez, brodez.</p>
              <p className="ac-hero-actions">
                {importer
                  ? <a className="bouton ac-cta" href={importer} data-action="importer" target="_blank" rel="noopener">Importer mon patron PDF</a>
                  : <button type="button" className="bouton ac-cta ac-cta-indispo" aria-disabled="true" aria-describedby="pz-note" data-action="importer" onClick={e => e.preventDefault()}>Importer mon patron PDF<span className="ac-bientot">Bientôt</span></button>}
                <a className="bouton ac-cta ac-cta-calme" href="#broderie" data-action="explorer">Explorer la broderie</a>
              </p>
              {!importer && <p className="ac-pz-note" id="pz-note">L’atelier Point Zéro est en accès privé pour l’instant. L’import s’ouvrira ici dès qu’il sera public.</p>}
            </div>
          </section>
        </div>

        <TransitionBroderie />

        <section className="section ac-aujourdhui" id="aujourdhui" aria-labelledby="titre-aujourdhui" style={{ paddingInline: 'var(--marge)' }}>
          <div className="ac-entete">
            <div>
              <p className="surtitre">Ce que votre couple peut faire aujourd’hui</p>
              <h2 id="titre-aujourdhui" className="titre" style={{ maxWidth: '18ch' }}>Trois choses, déjà possibles.</h2>
            </div>
          </div>
          <ol className="ac-faire">
            <li><b>Créer la fiche de votre mariage</b><span>Les deux noms, la date et le lieu, enregistrés dans votre espace AIME. La date et le lieu peuvent attendre.</span></li>
            <li><b>La retrouver et la modifier</b><span>Sur tous vos appareils, en entrant dans votre espace. <Lien href="/buro">Retrouver notre mariage</Lien></span></li>
            <li><b>Parcourir les prestataires</b><span>Musiciens, photographes, lieux et plus, dans le réseau AIME. Certaines fiches sont des exemples, signalées comme telles. <Lien href="/reseau?domaine=mariage">Voir les prestataires</Lien></span></li>
          </ol>
          <p className="ac-pas-encore"><b>Pas encore disponible :</b> inviter l’autre personne dans la fiche, le budget, les réponses des invités, les devis, la coordination du jour J. <Lien href="/aime-wedding">Voir à quoi ressemble la page d’une union</Lien></p>
        </section>

        <section className="section blanche ac-repli" id="intention" aria-label="Autre chose en tête" style={{ borderTop: 0, paddingInline: 'var(--marge)' }}>
         <details className="ac-details" open={ouvert} onToggle={e => setOuvert((e.currentTarget as HTMLDetailsElement).open)}>
          <summary><span id="titre-intention">Que souhaitez-vous faire aujourd’hui ?</span><em>Autre chose en tête : un projet, une idée, une adresse web, un fichier</em></summary>
          <div className="ac-question">
            <div>
              <p className="surtitre">Une seule entrée</p>
              <p className="chapeau">Une phrase, une adresse web ou un fichier. La page propose le chemin le plus proche et dit s’il existe. Elle ne lance rien.</p>
            </div>
            <form className={'ac-zone' + (depot ? ' depot' : '')} autoComplete="off" onSubmit={e => e.preventDefault()}
              onDragOver={e => { e.preventDefault(); setDepot(true); }} onDragLeave={() => setDepot(false)}
              onDrop={e => { e.preventDefault(); setDepot(false); const f = e.dataTransfer.files?.[0]; if (f) setFichier({ name: f.name, type: f.type }); }}>
              <label htmlFor="q">Votre intention</label>
              <div className="ac-ligne">
                <input ref={champ} className="champ" type="text" id="q" value={texte} onChange={e => setTexte(e.target.value)} placeholder="Une phrase, une adresse web, ou déposez un fichier" aria-describedby="resultat" />
                <input ref={entree} type="file" className="sr-only" tabIndex={-1} aria-label="Joindre un fichier" onChange={e => { const f = e.target.files?.[0]; setFichier(f ? { name: f.name, type: f.type } : null); }} />
                <button type="button" className="bouton" onClick={() => entree.current?.click()}>Joindre un fichier</button>
                {fichier && <span className="ac-puce"><span>{fichier.name}</span><button type="button" aria-label="Retirer le fichier" onClick={() => { if (entree.current) entree.current.value = ''; setFichier(null); champ.current?.focus(); }}>×</button></span>}
              </div>
              <div className="ac-resultat" id="resultat" aria-live="polite" data-testid="resultat">
                {!p && <><p className="note">Écrivez ce que vous avez en tête, collez une adresse ou déposez un fichier.</p><p className="note">Rien n’est envoyé. Tout reste dans votre navigateur.</p></>}
                {p && !p.chemin && <><p className="type">{p.type}</p><p className="note">Je ne reconnais pas d’intention précise. Choisissez un des quatre chemins.</p><p className="note">Rien n’est envoyé. Rien n’a été lancé.</p></>}
                {p && p.chemin && p.destination && <>
                  <p className="type">{p.type}</p>
                  <p className="chemin"><Orbe taille={26} /><span>Chemin le plus proche : <b>{CHEMINS[p.chemin as Chemin].nom}</b></span></p>
                  <p className="note"><span className="ac-etat-puce" data-etat={p.destination.etat}>{etatProp(p.destination.etat)}</span> {p.destination.cible}</p>
                  <p className="note">{p.pourquoi} {p.destination.note}</p>
                  <p className="note">C’est une proposition : rien n’a été exécuté, rien n’est envoyé.</p>
                  <div className="ac-actions">
                    {p.destination.href && <Lien className="bouton noir" href={p.destination.href}>Ouvrir : {p.destination.cible}</Lien>}
                    {'alternative' in p.destination && p.destination.alternative && <Lien className="bouton" href={p.destination.alternative.href}>Ouvrir plutôt : {p.destination.alternative.cible}</Lien>}
                  </div>
                </>}
              </div>
            </form>
          </div>

          <ul className="ac-chemins" id="chemins" aria-label="Quatre chemins">
            {ORDRE.map(c => (
              <li key={c}>
                <Lien className="ac-chemin" href={DESTINATIONS[c].href} data-chemin={c} data-conseil={String(p?.chemin === c)}>
                  <span style={{ margin: 0 }}><b>{CHEMINS[c].nom}</b><span>{CHEMINS[c].sub}</span></span>
                  <em>{etatChemin(c)} · {DESTINATIONS[c].cible}</em>
                </Lien>
              </li>
            ))}
          </ul>
         </details>
        </section>

        <section className="section" id="projets-creations" aria-labelledby="titre-decouvrir" style={{ paddingInline: 'var(--marge)' }}>
          <div className="ac-entete">
            <h2 id="titre-decouvrir" className="grand-mot">Projets &amp; Créations</h2>
            <p>Des sites et des studios conçus, dessinés et construits par AIME®. Les autres univers d’AIME se trouvent sur la page des projets.</p>
          </div>
          <div className="pf-grille" style={{ listStyle: 'none' }}>
            {(projets || []).map(pr => <CarteProjet key={pr.slug} p={pr} />)}
          </div>
          <p style={{ marginTop: 40 }}><Lien className="bouton" href="/projets">Tous les projets et créations</Lien> <Lien className="bouton" href="/reseau">Le réseau</Lien></p>
        </section>

        <section className="ac-bande" aria-label="Une seule maison">
          <p className="surtitre" style={{ color: 'rgba(255,255,255,.7)' }}>LE MONDE AIME®</p>
          <p className="grand-mot">Une seule maison, plusieurs façons d’y entrer.</p>
          <ul className="ac-ensemble">
            <li>Une seule entrée.</li><li>Une seule identité.</li><li>Une architecture cohérente.</li><li>Plusieurs expériences adaptées.</li>
          </ul>
        </section>
      </main>
      <DockBas lieux={[['entree', 'Entrée'], ['aujourdhui', 'Aujourd’hui'], ['intention', 'Question'], ['projets-creations', 'Projets']]} />
      <Pied />
    </>
  );
}
