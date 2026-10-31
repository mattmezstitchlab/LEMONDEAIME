/**
 * Un appareil qui montre l'atelier : ordinateur, iPad ou iPhone, dessinés en CSS (aucune image de marque).
 * L'écran est une vraie capture de l'atelier actuel, faite par tests/e2e/captures-appareils.py. src : l'adresse servie (contenus.adresse).
 */
import "./Appareil.css";

export default function Appareil({ type, src, alt, className = "" }: { type: "ordinateur" | "ipad" | "iphone"; src: string; alt: string; className?: string }) {
  return <figure className={`ap ap-${type} ${className}`}>
    <div className="ap-cadre"><img className="ap-ecran" src={src} alt={alt} loading="lazy" decoding="async" /></div>
    {type === "ordinateur" && <div className="ap-socle" aria-hidden="true" />}
  </figure>;
}
