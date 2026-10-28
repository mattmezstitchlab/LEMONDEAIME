import { useState, type FormEvent } from 'react';
import { dateLisible } from '../../api/_orbe-local.mjs';
import { useCritereDate } from '../lib/critereDate';

/* Dire d'où vient la date de recherche, et laisser la changer ou l'effacer pour cette recherche. */
export function CritereDate() {
  const c = useCritereDate();
  const [ouvert, setOuvert] = useState(false);
  const [jour, setJour] = useState(c.date || '');
  const valider = (e: FormEvent) => { e.preventDefault(); if (jour) { c.changer(jour); setOuvert(false); } };
  return (
    <div className="critere-date" role="group" aria-labelledby="critere-date-titre">
      <p id="critere-date-titre" className="critere-date-texte" aria-live="polite">
        {c.source === 'metamorphose' && <><b>Date de recherche : le {dateLisible(c.date!)}.</b> Reprise de votre Métamorphose (« {c.texteMeta.trim()} »), gardée sur cet appareil. Ce n’est pas la date officielle d’une union.</>}
        {c.source === 'recherche' && <><b>Date de recherche : le {dateLisible(c.date!)}.</b> Choisie pour cette recherche{c.texteMeta.trim() ? ' ; votre Métamorphose n’est pas modifiée' : ''}.</>}
        {c.source === 'aucune' && (c.texteMeta.trim() && c.metaLisible
          ? <>Aucune date pour cette recherche. Votre Métamorphose garde « {c.texteMeta.trim()} ».</>
          : c.texteMeta.trim()
            ? <>Votre Métamorphose dit « {c.texteMeta.trim()} », qui ne se lit pas comme une date : la recherche n’utilise aucune date.</>
            : <>Aucune date de recherche. Choisissez-en une pour voir qui est libre ce jour-là.</>)}
      </p>
      {ouvert
        ? <form className="critere-date-form" onSubmit={valider}>
          <label className="etiquette-champ">Date à chercher<input className="champ" type="date" value={jour} onChange={e => setJour(e.target.value)} required /></label>
          <button className="bouton noir" type="submit">Chercher à cette date</button>
          <button className="opt" type="button" onClick={() => setOuvert(false)}>Annuler</button>
        </form>
        : <div className="critere-date-actions">
          <button className="opt" type="button" onClick={() => { setJour(c.date || ''); setOuvert(true); }}>{c.date ? 'Changer la date' : 'Choisir une date'}</button>
          {c.date && <button className="opt" type="button" onClick={c.sansDate}>Chercher sans date</button>}
          {c.source !== 'metamorphose' && c.metaLisible && <button className="opt" type="button" onClick={c.reprendre}>Reprendre la date de ma Métamorphose</button>}
        </div>}
    </div>
  );
}
