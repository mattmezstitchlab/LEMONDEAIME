/* Le Disque de la page /system : la même pièce que l'atelier (DisqueFiches → DisqueOne + Point), deux domaines raccordés,
   la fiche entière à côté. Chargé à la demande : la page reste légère tant que le Disque n'est pas à l'écran. */
import { useCallback, useMemo, useRef } from "react";
import DisqueFiches, { type GroupeFiches } from "../../studio/src/components/fiche/DisqueFiches";
import FicheContextuelle from "../../studio/src/components/fiche/FicheContextuelle";
import { BASE_FLOSS } from "../../studio/src/lib/dmc";
import { adresse } from "../../studio/src/lib/fiche/registre";
import { NOMS_THEMES } from "../../studio/src/lib/fiche/syst";
import { MANIFESTE_PUBLIC } from "./lecture";
import { raccorderDomaines } from "./domaines";

raccorderDomaines();

const Pastille = ({ d }: { d: string }) => <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;

/** quelques fils pour commencer : ils existent tous dans la table (le test le vérifie) ; les autres s'atteignent par les relations de la fiche */
export const FILS_DE_DEPART = ["310", "321", "666", "703", "798", "3799"];
const ROLE = "proprietaire" as const;   // la personne devant son propre appareil : ses données locales sont les siennes

export default function DisqueDemo({ courante, onChoisir }: { courante: string; onChoisir: (a: string) => void }) {
  const panneau = useRef<HTMLDivElement>(null);
  const groupes = useMemo<GroupeFiches[]>(() => [
    { id: "dmc", nom: "Fils DMC", icone: <Pastille d="M12 3a9 9 0 1 0 0 18c1.7 0 2-1 1.4-2-.7-1.2 0-2.5 1.6-2.5H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z" />, aide: "quelques fils de la table DMC",
      elements: FILS_DE_DEPART.flatMap(c => { const f = BASE_FLOSS.find(x => x.code === c); return f ? [{ adresse: adresse("dmc", c), nom: `DMC ${c}`, couleur: f.hex, aide: `la fiche du fil DMC ${c} · ${f.name}` }] : []; }) },
    { id: "syst", nom: "SYST'AIME", icone: <Pastille d="m12 3 9 5-9 5-9-5zM3 13l9 5 9-5" />, aide: "les six thèmes du manifeste",
      elements: (MANIFESTE_PUBLIC.themes as string[]).map(t => ({
        adresse: adresse("syst", `${t}.principes`), nom: NOMS_THEMES[t] ?? t, aide: `la fiche « ${NOMS_THEMES[t] ?? t} × Principes » (les cinq autres couches sont reliées dans la fiche)`,
        contient: (a: string) => a.startsWith(`syst-${t}.`),
      })) },
  ], []);
  const toutVoir = useCallback(() => {
    const h = panneau.current?.querySelector<HTMLElement>("h2");
    panneau.current?.scrollIntoView({ block: "start", behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    h?.focus({ preventScroll: true });
  }, []);

  return <div className="sys-disque-grille">
    <div className="sys-disque-col">
      <DisqueFiches groupes={groupes} courante={courante} onChoisir={onChoisir} role={ROLE} max={480} etiquette="Le Disque : fils DMC et éléments SYST'AIME" onToutVoir={toutVoir} />
      <div className="sys-essais" role="group" aria-label="Choisir sans le Disque">
        <span>Essayer :</span>
        <button type="button" className="sys-bouton" aria-pressed={courante.startsWith("dmc-")} onClick={() => onChoisir(adresse("dmc", "310"))}>Un fil DMC</button>
        <button type="button" className="sys-bouton" aria-pressed={courante.startsWith("syst-")} onClick={() => onChoisir(adresse("syst", "visuel.tokens"))}>Un élément SYST'AIME</button>
      </div>
    </div>
    <div className="sys-fiche" ref={panneau}>
      <FicheContextuelle adresse={courante} role={ROLE} presentation="etendu" onNaviguer={onChoisir} />
    </div>
  </div>;
}
