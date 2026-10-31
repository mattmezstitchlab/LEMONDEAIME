/**
 * .0NE — la mosaïque universelle (phase 4) : une grille de cases identiques, lue dans le registre (lib/one/univers).
 * Aucune case écrite à la main : un univers ajouté au registre (ou enregistré à l'exécution, comme l'univers de démonstration
 * avec ?demo=1) reçoit sa case. Le statut est toujours dit ; un univers « en préparation » ne s'ouvre pas.
 * En tête : le Disque de la personne (ses favoris), le même composant que la Première rencontre.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ExternalLink, X } from "lucide-react";
import DisqueOne from "../components/one/DisqueOne";
import { adresseUnivers, commandesDesUnivers } from "../components/one/commandes";
import { IconeOne } from "../components/one/icones";
import { NOMS_STATUTS, universPublics, type Univers } from "../lib/one/contrat";
import { enregistrerUnivers, suivreUnivers, tousLesUnivers, UNIVERS_DEMONSTRATION } from "../lib/one/univers";
import { appliquerOne, lireOne, themeOne } from "../lib/one/preferences";
import type { ModePoint } from "../lib/point/modes";
import "../design/aime.css";
import "./one.css";
import "./mosaique.css";

const media = (src: string) => /^https:/.test(src) ? src : import.meta.env.BASE_URL + src;

/** l'aperçu du Disque d'un univers : sa couronne (ses familles), son centre (son visuel réel, ou son pictogramme) ; décoratif, tout est dit à côté */
function MiniDisque({ u }: { u: Univers }) {
  const n = u.familles.length;
  return <div className="om-mini" aria-hidden="true" style={{ ["--om-teinte" as string]: u.teinte }}>
    {u.familles.map((f, i) => { const a = (2 * Math.PI * i) / n - Math.PI / 2; return <span key={f.id} className="om-mini-cmd" style={{ left: `${50 + 40 * Math.cos(a)}%`, top: `${50 + 40 * Math.sin(a)}%` }}><IconeOne nom={f.icone} /></span>; })}
    <span className="om-mini-centre">{u.visuel ? <img src={media(u.visuel.src)} alt="" decoding="async" /> : <IconeOne nom={u.icone} />}</span>
  </div>;
}

export default function Mosaique() {
  const [, setV] = useState(0);
  const [ouvert, setOuvert] = useState<string | null>(() => /^#u-/.test(window.location.hash) ? window.location.hash.slice(3) : null);
  const p = useMemo(lireOne, []);
  const theme = themeOne(p);
  useEffect(() => { appliquerOne(p); }, [p]);
  useEffect(() => suivreUnivers(() => setV(v => v + 1)), []);
  /* la preuve du registre : ?demo=1 enregistre un univers fictif, annoncé comme tel ; aucune ligne de composant en plus */
  useEffect(() => { if (new URLSearchParams(window.location.search).has("demo")) enregistrerUnivers(UNIVERS_DEMONSTRATION); }, []);
  const liste = universPublics(tousLesUnivers());
  const choisi = liste.find(u => u.id === ouvert) ?? null;
  const panneau = useRef<HTMLDivElement>(null), declencheur = useRef<HTMLElement | null>(null);
  const ouvrir = (id: string, el: HTMLElement) => { declencheur.current = el; setOuvert(id); history.replaceState(null, "", "#u-" + id); };
  const fermer = () => { setOuvert(null); history.replaceState(null, "", window.location.pathname + window.location.search); requestAnimationFrame(() => declencheur.current?.focus()); };
  useEffect(() => { if (choisi) panneau.current?.querySelector<HTMLElement>("h2")?.focus(); }, [choisi?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const prenom = p.identite.prenom.trim();
  const modes = commandesDesUnivers(liste, p.favoris);
  const familles = (u: Univers): ModePoint[] => u.familles.map(f => ({ id: "f-" + f.id, nom: f.nom, icone: <IconeOne nom={f.icone} />, groupe: "metier", aide: `${f.nom} — ouvre ${u.nom}`, ouvrir: () => window.location.assign(adresseUnivers(u)) }));

  return <div className="one one-mosaique" data-aime={theme}>
    <header className="one-tete">
      <a className="one-marque" href={import.meta.env.BASE_URL + "one/univers"}><span className="one-orbe" aria-hidden="true" />.0NE</a>
      <a className="one-bouton one-passer" href={import.meta.env.BASE_URL + "one/premiere-rencontre"}>{p.rencontre.terminee ? "Mes réglages" : "Première rencontre"}</a>
    </header>
    <main>
      <section className="om-heros" aria-labelledby="om-titre">
        <div>
          <p className="one-sur">Un socle, plusieurs univers</p>
          <h1 id="om-titre">.0NE<br /><span className="om-fondu">Tous les univers.</span></h1>
          <p className="one-chapeau">Un même objet. Une infinité de possibilités.</p>
          <p className="one-texte">{prenom ? `${prenom}, votre` : "Votre"} Disque réunit vos univers favoris. Chaque univers garde ses propres outils ; le Disque les ouvre avec les mêmes gestes.</p>
          <div className="one-pied"><a className="one-bouton one-bouton-plein" href="#om-grille">Découvrir les univers<ArrowRight aria-hidden="true" /></a>
            <a className="one-bouton" href={import.meta.env.BASE_URL + "one/premiere-rencontre"}>Première rencontre</a></div>
        </div>
        <DisqueOne contexte="one-mosaique" etiquette="Votre Disque .0NE : vos univers favoris" modes={modes} max={520}
          centre={<div className="one-apercu"><span className="one-orbe om-orbe" aria-hidden="true" /><p className="one-apercu-titre">{prenom ? `Bonjour ${prenom}` : "Votre .0NE"}</p><p>{p.favoris.length} univers favoris</p></div>} />
      </section>

      <section id="om-grille" className="om-section" aria-labelledby="om-grille-titre">
        <h2 id="om-grille-titre" className="om-titre-section">Les univers</h2>
        <p className="one-texte">Le statut de chaque univers est dit tel qu’il est : disponible, expérimental (essai privé) ou en préparation.</p>
        <ul className="om-grille">{liste.map(u => <li key={u.id} className="om-case" data-statut={u.statut} data-univers={u.id} id={"u-" + u.id}>
          <div className="om-case-tete"><span className="one-ico" style={{ color: u.teinte }}><IconeOne nom={u.icone} /></span>
            <span className={"om-statut om-" + u.statut}>{u.demonstration ? "Démonstration · " : ""}{NOMS_STATUTS[u.statut]}</span></div>
          <h3>{u.nom}</h3>
          <p>{u.phrase}</p>
          <MiniDisque u={u} />
          <button type="button" className="om-voir" aria-haspopup="dialog" onClick={e => ouvrir(u.id, e.currentTarget)}>Présentation de {u.nom}<ArrowRight aria-hidden="true" /></button>
        </li>)}</ul>
      </section>
    </main>

    {choisi && <div className="om-voile" onClick={fermer}>
      <div ref={panneau} className="om-panneau" role="dialog" aria-modal="true" aria-labelledby="om-panneau-titre" onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); fermer(); } }}>
        <button type="button" className="om-fermer" aria-label="Fermer la présentation" onClick={fermer}><X aria-hidden="true" /></button>
        <div className="om-panneau-texte">
          <span className={"om-statut om-" + choisi.statut}>{choisi.demonstration ? "Démonstration · " : ""}{NOMS_STATUTS[choisi.statut]}</span>
          <h2 id="om-panneau-titre" tabIndex={-1}>{choisi.nom}</h2>
          <p className="one-texte">{choisi.description}</p>
          <p className="om-familles">Dans la couronne : {choisi.familles.map(f => f.nom).join(", ")}.</p>
          {choisi.visuel && <p className="om-credit">Visuel : {choisi.visuel.credit}</p>}
          <div className="one-pied">
            {choisi.ouverture.type === "route" ? <a className="one-bouton one-bouton-plein" href={adresseUnivers(choisi)}>Ouvrir {choisi.nom}<ArrowRight aria-hidden="true" /></a>
              : <p className="om-prep">En préparation : rien ne s’ouvre encore.</p>}
            {choisi.ailleurs && <a className="one-bouton" href={choisi.ailleurs.chemin}>{choisi.ailleurs.nom} (hors .0NE)<ExternalLink aria-hidden="true" /></a>}
          </div>
        </div>
        <div className="om-panneau-disque">
          {choisi.ouverture.type === "route"
            ? <DisqueOne contexte={"one-univers-" + choisi.id} etiquette={`Le Disque de ${choisi.nom}`} modes={familles(choisi)} max={420}
                centre={choisi.visuel ? <img className="om-centre-media" src={media(choisi.visuel.src)} alt={choisi.visuel.alt} /> : <div className="one-apercu"><span className="one-ico om-ico-grand" style={{ color: choisi.teinte }}><IconeOne nom={choisi.icone} /></span><p className="one-apercu-titre">{choisi.nom}</p></div>} />
            : <MiniDisque u={choisi} />}
        </div>
      </div>
    </div>}
  </div>;
}
