/* Les domaines de la fiche contextuelle raccordés à la page /system : deux métiers, une seule architecture.
   Chaque domaine reçoit ses SOURCES RÉELLES (le profil de l'atelier ; le manifeste public) : rien n'est recopié. */
import { declarerDomaine } from "../../studio/src/lib/fiche/registre";
import { domaineDmc, sourcesDeLAtelier } from "../../studio/src/lib/fiche/dmc";
import { domaineSyst, epinglesDeLAppareil } from "../../studio/src/lib/fiche/syst";
import { MANIFESTE_PUBLIC } from "./lecture";

let fait = false;
/** à appeler une fois ; un second appel (rechargement à chaud) ne déclare rien de plus */
export function raccorderDomaines(): void {
  if (fait) return;
  fait = true;
  declarerDomaine(domaineDmc(sourcesDeLAtelier));
  declarerDomaine(domaineSyst({ manifeste: () => MANIFESTE_PUBLIC, ...epinglesDeLAppareil() }));
}
