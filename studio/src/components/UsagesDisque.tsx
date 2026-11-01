/** Présentation du vrai Point : aucune copie du moteur, aucun ouvrage créé.
 * Les usages expliqués renvoient aux commandes existantes de l'atelier ; seules
 * la loupe et la consultation du nuancier agissent sur la démonstration locale.
 */
import { useState } from 'react';
import { Download, FolderOpen, Grid2x2, Import, Palette, Search, Sparkles, Spline } from 'lucide-react';
import { Disque } from './edition/Edition';
import Brode from './edition/Brode';
import { FLOSS } from '../lib/dmc';
import { FAMILLES, filsParFamille } from '../lib/famillesFils';
import type { ModePoint } from '../lib/point/modes';
import type { StitchEntry } from './CrossStitchHome';
import './UsagesDisque.css';

export const USAGES_DISQUE = [
  { id: 'ch-zero', num: 'I', titre: 'Importer', phrase: 'Une image, un PDF ou un projet, depuis le Disque.', detail: 'La commande Importer ouvre les mêmes sélecteurs que l’atelier. La conversion et le calage PDF demandent un fichier réel ; rien n’est inventé ici.' },
  { id: 'ch-docks', num: 'II', titre: 'Créer', phrase: 'Une couronne d’outils, pas deux docks concurrents.', detail: 'Points, formes, gomme, sélection, calques et composition : le Disque rassemble les commandes. Elles travaillent sur votre ouvrage dans l’atelier.' },
  { id: 'ch-point', num: 'III', titre: 'Le Point', phrase: 'Un guide, le confort et vos ouvrages.', detail: 'Le même Point que dans l’atelier : flèches pour parcourir la couronne, Entrée pour choisir, Échap pour remonter. Confort reste au premier cercle.' },
  { id: 'ch-nuancier', num: 'IV', titre: 'Fils', phrase: 'Les vraies références DMC, par familles.', detail: 'Consultez les nuances ci-dessous ; choisir une famille ne recolore pas votre ouvrage. Les couleurs écran sont indicatives, à confirmer sur une carte physique.' },
  { id: 'ch-loupe', num: 'V', titre: 'Loupe', phrase: 'Le point de croix, au plus près.', detail: 'La loupe du studio agit sur le textile de démonstration. Déplacez-la au doigt, à la souris ou avec les flèches. Aucun ouvrage personnel n’est modifié.' },
  { id: 'ch-lectures', num: 'VI', titre: 'Affichage', phrase: 'Réaliste, à plat, symboles et grille.', detail: 'Le Disque du lecteur brodé permet de changer ces lectures sur La Fleur du Ciel et UPTOWN. Dans l’atelier, les mêmes intentions s’appliquent au patron actif.' },
  { id: 'ch-broder', num: 'VII', titre: 'Broder', phrase: 'Suivre les points et les fils de son ouvrage.', detail: 'Cocher, défaire, garer l’aiguille, suivre son avancée : ces commandes nécessitent votre patron. Cette présentation n’inscrit aucune progression fictive.' },
  { id: 'ch-partager', num: 'VIII', titre: 'Partager', phrase: 'Exporter, sauvegarder ou inviter à regarder.', detail: 'PDF, image et projet se préparent depuis le Disque de l’atelier. L’invitation dépend d’un ouvrage et des services disponibles ; aucun partage n’est lancé par cette page.' },
] as const;
const ICONES = [Import, Sparkles, FolderOpen, Palette, Search, Grid2x2, Spline, Download];

export default function UsagesDisque({ onOpen, onImport, onOuvrages, onVisite }: {
  onOpen: (entry: StitchEntry) => void; onImport: (file: File) => void;
  onOuvrages: () => void; onVisite: () => void;
}) {
  const [choix, setChoix] = useState(0), [loupe, setLoupe] = useState(0), [famille, setFamille] = useState('rouges');
  const usage = USAGES_DISQUE[choix];
  const choisir = (i: number) => { setChoix(i); if (i === 4) setLoupe(v => v + 1); };
  const modes: ModePoint[] = USAGES_DISQUE.map((u, i) => {
    const Icone = ICONES[i];
    return { id: u.id, nom: u.titre, aide: u.phrase, groupe: 'metier', icone: <Icone aria-hidden="true" />, actif: choix === i, annonceEnPropre: true,
      ouvrir: () => choisir(i) };
  });
  const recevoir = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) onImport(file); };
  return <section id="usages-disque" className="usages-disque" aria-labelledby="usages-titre">
    <header><p className="pzh-kicker">Un seul moteur, plusieurs usages</p><h2 id="usages-titre">Tout passe par le Disque.</h2>
      <p>Choisissez une intention sur la couronne. La présentation montre ce qu’elle fait et vous mène au bon outil, sans créer ni remplacer vos ouvrages.</p></header>
    <div className="usages-grille">
      <div className="usages-couronne"><Disque contexte="presentation-broderie" modes={modes} etiquette="Les usages du vrai Disque de broderie" /></div>
      <div className="usages-detail" aria-label="Usage choisi">
        <div role="status" aria-live="polite" aria-atomic="true"><p className="pzh-kicker">{usage.num} · {usage.titre}</p><h3>{usage.phrase}</h3><p>{usage.detail}</p></div>
        {choix === 0 && <label className="pzh-btn pzh-btn-primary usages-import">Choisir mon fichier<input type="file" aria-label="Importer depuis le Disque de présentation" accept="image/png,image/jpeg,image/webp,.pdf,.json,.oxs" onChange={recevoir} /></label>}
        {choix === 1 && <button className="pzh-btn pzh-btn-primary" onClick={() => onOpen('create')}>Créer dans l’atelier</button>}
        {choix === 2 && <div className="usages-actions"><button className="pzh-btn pzh-btn-primary" onClick={onVisite}>Faire la visite avec Le Point</button><button className="pzh-btn" onClick={onOuvrages}>Mes ouvrages de broderie</button></div>}
        {choix === 3 && <><label className="usages-famille">Famille DMC<select value={famille} onChange={e => setFamille(e.target.value)}>{FAMILLES.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}</select></label><ul className="usages-fils" aria-label="Nuances DMC">{(filsParFamille().get(famille) ?? []).map(i => <li key={FLOSS[i].code}><span aria-hidden="true" style={{ background: FLOSS[i].hex }} />DMC {FLOSS[i].code}</li>)}</ul><button className="pzh-btn" onClick={() => onOpen('prepare')}>Choisir les fils dans l’atelier</button></>}
        {choix === 4 && <><Brode src={import.meta.env.BASE_URL + 'images/histoire/met-palampore-2010-337.webp'} cols={90} maxFils={18} loupeDemandee={loupe}
          alt="Palampore : déplacer la loupe pour regarder les points de croix" legende="Palampore, côte de Coromandel, XVIIIᵉ siècle. The Met, 2010.337, domaine public. Conversion par le studio, sans enregistrement." />
          <button className="pzh-btn" onClick={() => setLoupe(v => v + 1)}>Recentrer la loupe</button></>}
        {choix === 5 && <div className="usages-actions"><a className="pzh-btn" href={import.meta.env.BASE_URL + 'fleur-du-ciel'}>Explorer La Fleur du Ciel</a><a className="pzh-btn" href={import.meta.env.BASE_URL + 'uptown'}>Explorer UPTOWN</a><button className="pzh-btn" onClick={() => onOpen('prepare')}>Afficher mon patron dans l’atelier</button></div>}
        {choix === 6 && <button className="pzh-btn pzh-btn-primary" onClick={() => onOpen('stitch')}>Reprendre dans l’atelier</button>}
        {choix === 7 && <button className="pzh-btn pzh-btn-primary" onClick={() => onOpen('stitch')}>Ouvrir l’atelier pour exporter ou partager</button>}
      </div>
    </div>
    <nav className="usages-index" aria-label="Tous les usages du Disque">{USAGES_DISQUE.map((u,i) => <button key={u.id} id={u.id} type="button" aria-pressed={choix === i} onClick={() => choisir(i)}>{u.titre}</button>)}</nav>
    <p className="pzh-fine">Le nuancier et la loupe sont consultables ici. Dessiner, suivre un ouvrage, exporter et partager se font dans le véritable atelier, pas dans un faux écran.</p>
  </section>;
}
