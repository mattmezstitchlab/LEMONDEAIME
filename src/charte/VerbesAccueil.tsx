import { Verbe } from './Charte';
import { DESTINATIONS } from '../lib/intention.mjs';

/* Les verbes du dock du haut de la première page (/), partagés avec /system et /systaime : même dock, mêmes gestes, mêmes mots.
   Le dock lui-même reste LE composant Tete de la charte : rien n'est recréé ici. */
export default function VerbesAccueil() {
  return <>
    <Verbe href={DESTINATIONS.organiser.href}>Organiser</Verbe>
    <Verbe href={DESTINATIONS.creer.href}>Créer</Verbe>
    <Verbe href={DESTINATIONS.projets.href}>Mes projets</Verbe>
    <Verbe href={DESTINATIONS.decouvrir.href}>Découvrir</Verbe>
  </>;
}
