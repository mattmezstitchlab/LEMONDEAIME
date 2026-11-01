import { useMemo, useRef, useState } from 'react';
import { Tete, DockBas, Pied, Orbe } from '../charte/Charte';
import VerbesAccueil from '../charte/VerbesAccueil';
import { Lien } from '../lib/router';
import { useSession } from '../lib/session';
import { useProjets } from '../lib/projets';
import { CarteProjet } from './Portfolio';
import { CHEMINS, DESTINATIONS, ETATS, proposer } from '../lib/intention.mjs';

/* LA PREMIÈRE PAGE (/) : une seule entrée, quatre chemins. Rien n'est simulé : chaque chemin est un vrai lien vers une page existante,
   la zone d'intention propose (elle n'exécute rien) et dit l'état de la destination : disponible, partielle, avec connexion, ou absente. */
type Chemin = keyof typeof CHEMINS;
const ORDRE: Chemin[] = ['organiser', 'creer', 'projets', 'decouvrir'];

export default function Accueil() {
  const session = useSession();
  const projets = useProjets();
  const [texte, setTexte] = useState('');
  const [fichier, setFichier] = useState<{ name: string; type: string } | null>(null);
  const [depot, setDepot] = useState(false);
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
      <Tete courant="/" verbes={<VerbesAccueil />} />
      <main id="contenu">
        <div className="ac-cadre">
          <section className="ac-hero" id="entree" aria-labelledby="titre-entree">
            <img src="/media/union.jpg" alt="Un couple de mariés danse la nuit dans le désert, près d’une voiture ancienne et d’un tourne-disque, sous un ciel d’étoiles." />
            <div className="ac-hero-contenu">
              <p className="surtitre">LE MONDE AIME®</p>
              <h1 id="titre-entree" className="signature">Tout commence ici.</h1>
              <p className="ac-hero-sous">Un projet, une idée, une rencontre, un souvenir.</p>
            </div>
          </section>
        </div>

        <section className="section blanche" id="intention" aria-labelledby="titre-intention" style={{ marginTop: 16, borderTop: 0, paddingInline: 'var(--marge)' }}>
          <div className="ac-question">
            <div>
              <p className="surtitre">Une seule entrée</p>
              <h2 id="titre-intention" className="titre">Que souhaitez-vous faire aujourd’hui ?</h2>
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
        </section>

        <section className="section" id="decouvrir" aria-labelledby="titre-decouvrir" style={{ paddingInline: 'var(--marge)' }}>
          <div className="ac-entete">
            <h2 id="titre-decouvrir" className="grand-mot">Découvrir</h2>
            <p>Des sites et des studios conçus, dessinés et construits par AIME®.</p>
          </div>
          <div className="pf-grille" style={{ listStyle: 'none' }}>
            {(projets || []).map(pr => <CarteProjet key={pr.slug} p={pr} />)}
          </div>
          <p style={{ marginTop: 40 }}><Lien className="bouton" href="/projets">Tous les projets</Lien> <Lien className="bouton" href="/reseau">Le réseau</Lien></p>
        </section>

        <section className="section" id="uptown" aria-labelledby="titre-uptown" style={{ paddingInline: 'var(--marge)' }}>
          <div className="ac-entete">
            <p className="surtitre">Une œuvre, point par point</p>
            <h2 id="titre-uptown" className="grand-mot">UPTOWN, brodé.</h2>
            <p>Le clip de Matt à Saint-Luc, restauré puis brodé sur « Amor amour 2 », sa musique : chaque image est dessinée en 160 × 160 points, chaque point est un fil DMC.</p>
          </div>
          <p style={{ marginTop: 24 }}><a className="bouton" href="/studio/uptown">Voir le clip brodé<span className="sr-only"> (s’ouvre dans le Studio)</span></a></p>
        </section>

        <section className="ac-bande" aria-label="Une seule maison">
          <p className="surtitre" style={{ color: 'rgba(255,255,255,.7)' }}>LE MONDE AIME®</p>
          <p className="grand-mot">Une seule maison, plusieurs façons d’y entrer.</p>
          <ul className="ac-ensemble">
            <li>Une seule entrée.</li><li>Une seule identité.</li><li>Une architecture cohérente.</li><li>Plusieurs expériences adaptées.</li>
          </ul>
        </section>
      </main>
      <DockBas lieux={[['entree', 'Entrée'], ['intention', 'Question'], ['chemins', 'Chemins'], ['decouvrir', 'Découvrir'], ['uptown', 'UPTOWN']]} />
      <Pied />
    </>
  );
}
