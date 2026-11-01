/* La fiche (carte compacte) posée à côté de l'échiquier : même registre, même rôle que celle du Disque. Chargée avec le Disque. */
import FicheContextuelle from "../../studio/src/components/fiche/FicheContextuelle";
import { raccorderDomaines } from "./domaines";

raccorderDomaines();

export default function FicheEchiquier({ courante, onChoisir }: { courante: string; onChoisir: (a: string) => void }) {
  return <FicheContextuelle adresse={courante} role="proprietaire" presentation="carte" onNaviguer={onChoisir} />;
}
