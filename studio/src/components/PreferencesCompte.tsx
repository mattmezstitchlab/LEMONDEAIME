/**
 * Dans « Mes ouvrages », quand on est connecté : où sont vos préférences du Point, et le choix quand le compte en a d'autres.
 * Jamais d'écrasement sans confirmation (lib/preferencesCompte.ts).
 */
import { useEffect, useState } from "react";
import { compteCourant } from "../lib/aimeSync";
import { enregistrer, instantane, lien, lireEtat, resume, suivreChangements, utiliserCompte, type Etat } from "../lib/preferencesCompte";

export default function PreferencesCompte() {
  const [compte, setCompte] = useState<string | null>(null), [etat, setEtat] = useState<Etat | null>(null), [occupe, setOccupe] = useState(false), [dit, setDit] = useState("");
  useEffect(() => { let vivant = true; void compteCourant().then(c => { if (!vivant || !c) return; setCompte(c); void lireEtat(c).then(e => vivant && setEtat(e)); }); return () => { vivant = false; }; }, []);
  useEffect(() => (compte ? suivreChangements(compte, setEtat) : undefined), [compte]);
  if (!compte || !etat) return null;
  const agir = async (f: () => Promise<Etat> | Etat, phrase: string) => { setOccupe(true); const e = await f(); setEtat(e); setOccupe(false); if (e.etat === "a-jour") setDit(phrase); };
  const lie = lien(compte) !== null;

  return <section className="pzs-prefs" aria-labelledby="pzs-prefs-titre">
    <p id="pzs-prefs-titre" className="pzs-prefs-titre">Préférences du Point</p>
    {etat.etat === "indisponible" && <p className="pzs-note">{etat.raison}</p>}
    {etat.etat === "absent" && <>
      <p className="pzs-note">Elles sont sur cet appareil seulement ({resume(instantane())}).</p>
      <button type="button" disabled={occupe} onClick={() => agir(() => enregistrer(compte, null), "Préférences enregistrées sur votre compte.")}>Enregistrer sur mon compte</button>
    </>}
    {etat.etat === "a-jour" && <p className="pzs-note">{lie ? "Sur votre compte et sur cet appareil : elles vous suivent." : "Identiques sur votre compte et sur cet appareil."} ({resume(instantane())})</p>}
    {etat.etat === "different" && <div role="group" aria-label="Choisir les préférences">
      <p className="pzs-note">Votre compte a d’autres préférences ({resume(etat.compte)}) que cet appareil ({resume(instantane())}). Rien n’est changé sans votre choix.</p>
      <div className="pzs-prefs-choix">
        <button type="button" disabled={occupe} onClick={() => agir(() => { utiliserCompte(compte, etat.compte, etat.maj); return { etat: "a-jour", maj: etat.maj }; }, "Les préférences de votre compte s’appliquent sur cet appareil.")}>Utiliser celles du compte</button>
        <button type="button" disabled={occupe} onClick={() => agir(() => enregistrer(compte, etat.maj), "Les préférences de cet appareil remplacent celles du compte.")}>Garder celles de cet appareil</button>
      </div>
    </div>}
    <span className="sr-only" role="status">{dit}</span>
  </section>;
}
