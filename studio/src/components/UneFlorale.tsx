/**
 * La une de Point Zéro : un fond floral photographique, net, et sous la loupe (un cercle net qui suit la souris)
 * la même image en points de croix sur sa grille (choix de Matt, 29 octobre, 10 h 43).
 * La broderie est celle du studio (Brode : conversion en fils DMC, loupe au clavier comprise).
 */
import type { ReactNode } from "react";
import Brode from "./edition/Brode";
import "./edition/Histoire.css";
import "./RosaceUne.css";

const IMG = import.meta.env.BASE_URL + "images/";

export default function UneFlorale({ titre, children }: { titre: string; children?: ReactNode }) {
  return <section className="ru ru-florale" aria-labelledby="ru-titre">
    <div className="ru-fond">
      <Brode src={IMG + "histoire/met-palampore-2010-337.webp"} cols={120} maxFils={18}
        alt="Un palampore de la côte de Coromandel : un grand arbre fleuri en rouges de garance et en bleus. Sous la loupe, il devient points de croix aux fils DMC."
        legende="Palampore, côte de Coromandel (Inde), XVIIIᵉ siècle. The Metropolitan Museum of Art, 2010.337, domaine public. Brodé sous la loupe par le studio."
        cadrage={{ ordinateur: { x: 50, y: 40 }, mobile: { x: 55, y: 35 } }} />
    </div>
    <div className="ru-texte">
      <h1 id="ru-titre">{titre}</h1>
      {children}
    </div>
  </section>;
}
