/* La démonstration broderie : un motif 5D ORIGINAL, généré par le moteur de Point Zéro (generer) à partir d'une recette.
   Provenance vérifiable : le même code redonne la même empreinte (on régénère, on compare). Aucun patron tiers, aucun export, aucune boutique. */
import { useMemo, useState } from "react";
import Rosace from "../../studio/src/one/disque/Rosace";
import { RECETTES, recetteDe } from "../../studio/src/lib/motif5d/recettes";
import { VERSION } from "../../studio/src/lib/motif5d/code";
import { empreinteCroix, formatParDefaut, generer } from "../../studio/src/lib/motif5d/generer";

const hex8 = (n: number) => n.toString(16).padStart(8, "0");

export default function DemoBroderie() {
  const [code, setCode] = useState(RECETTES[4].code);
  const nom = RECETTES.find(r => r.code === code)?.nom ?? code;
  const preuve = useMemo(() => {
    const r = recetteDe(code), [w, h] = formatParDefaut(r.signature);
    const a = generer({ ...r, w, h }), b = generer({ ...r, w, h });
    const ea = empreinteCroix(a.pattern), eb = empreinteCroix(b.pattern);
    return { w, h, ea, identique: ea === eb && a.pattern.recette?.empreinte === ea, croix: a.controle.croix, fils: a.controle.fils, graine: r.graine,
      licence: a.pattern.provenance?.license ?? "non renseignée", auteur: a.pattern.provenance?.author ?? "non renseigné", source: a.pattern.provenance?.source ?? "non renseignée" };
  }, [code]);
  return <div className="sys-broderie">
    <div className="sys-broderie-motif"><Rosace code={code} taille={280} etiquette={`Rosace « ${nom} », générée par le moteur 5D (${code})`} /></div>
    <div className="sys-broderie-texte">
      <div className="sys-puces" role="group" aria-label="Choisir une recette 5D">
        {RECETTES.map(r => <button key={r.code} type="button" className="sys-puce" aria-pressed={r.code === code} onClick={() => setCode(r.code)}>{r.nom}</button>)}
      </div>
      <h4>Provenance de « {nom} »</h4>
      <dl className="sys-prov">
        <div><dt>Recette</dt><dd><code>{code}</code> · graine {preuve.graine}</dd></div>
        <div><dt>Moteur</dt><dd>5D, version {VERSION} (Point Zéro)</dd></div>
        <div><dt>Motif</dt><dd>{preuve.w} × {preuve.h} cases · {preuve.croix} croix · {preuve.fils} fils DMC</dd></div>
        <div><dt>Empreinte</dt><dd><code>{hex8(preuve.ea)}</code></dd></div>
        <div><dt>Vérification</dt><dd><span aria-hidden="true">{preuve.identique ? "✓ " : "! "}</span>{preuve.identique ? "Régénéré depuis le code : empreinte identique." : "Régénéré depuis le code : l'empreinte diffère."}</dd></div>
        <div><dt>Origine</dt><dd>{preuve.source}, par {preuve.auteur}</dd></div>
        <div><dt>Droits</dt><dd>{preuve.licence}</dd></div>
      </dl>
    </div>
  </div>;
}
