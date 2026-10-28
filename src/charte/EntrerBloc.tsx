import { useEffect, useId, useState, type FormEvent } from 'react';
import { demanderLien, entrerAvecGoogle, lireFournisseurs, type Fournisseurs } from '../lib/session';
import { clesPossibles, entrerAvecCle } from '../lib/cles';

export const GOOGLE = <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z" /><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" /><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" /></svg>;

/* Entrer dans AIME, partout : la même chose sous le rond du profil (dans le dock) et sur la page /entrer.
   Le champ e-mail d'abord (un lien, sans mot de passe), puis la clé d'accès et Google quand ils sont ouverts.
   « retour » : la page où l'on revient une fois entré·e (dans le dock, la page où l'on est). */
export function EntrerBloc({ retour, compact = false, erreur }: { retour: string; compact?: boolean; erreur?: string }) {
  const id = useId().replace(/:/g, '');
  const [f, setF] = useState<Fournisseurs | null>(null);
  const [etat, setEtat] = useState<{ envoi?: string; ok?: boolean; raison?: string }>(erreur ? { ok: false, raison: erreur } : {});
  useEffect(() => { lireFournisseurs().then(setF); }, []);
  const lien = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get('email') || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEtat({ ok: false, raison: 'Cette adresse e-mail ne semble pas complète.' }); return; }
    setEtat({ envoi: 'lien' });
    const r = await demanderLien(email, retour);
    setEtat(r.ok ? { ok: true, raison: 'Lien envoyé à ' + email + ' : ouvrez votre messagerie, le lien vous ramène ici.' } : { ok: false, raison: r.raison });
  };
  const google = async () => { setEtat({ envoi: 'google' }); const r = await entrerAvecGoogle(retour); if (!r.ok) setEtat({ ok: false, raison: r.raison }); };
  const cle = async () => { setEtat({ envoi: 'cle' }); const r = await entrerAvecCle(); if (r.ok) window.location.assign(retour); else setEtat({ ok: false, raison: r.raison }); };
  const fermes = f && !f.comptes;
  return (
    <div className={'entrer-bloc' + (compact ? ' compact' : '')}>
      {fermes && <p className="bloc-note" style={{ margin: 0 }}>Les comptes ne sont pas encore ouverts sur cette version du site.</p>}
      {(!f || f.lien) && <form onSubmit={lien} className="entrer-lien">
        <label htmlFor={'email-' + id}>Votre adresse e-mail</label>
        <div className="entrer-ligne">
          <input id={'email-' + id} name="email" type="email" autoComplete="email webauthn" placeholder="vous@exemple.fr" required className="champ" disabled={!!fermes} />
          <button className="bouton noir" type="submit" disabled={!!etat.envoi || !!fermes}>{etat.envoi === 'lien' ? 'Envoi…' : 'Recevoir mon lien'}</button>
        </div>
      </form>}
      {(f?.google || (f?.cle && clesPossibles())) && <div className="entrer-autres">
        {f?.cle && clesPossibles() && <button type="button" className="entrer-alt" onClick={cle} disabled={!!etat.envoi}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="8" cy="12" r="4" /><path d="M12 12h9M18 12v3M21 12v2" /></svg>
          {etat.envoi === 'cle' ? 'Vérification…' : 'Ma clé d’accès'}
        </button>}
        {f?.google && <button type="button" className="entrer-alt" onClick={google} disabled={!!etat.envoi}>{GOOGLE}{etat.envoi === 'google' ? 'Ouverture de Google…' : 'Continuer avec Google'}</button>}
      </div>}
      <p role="status" aria-live="polite" className={'entrer-etat' + (etat.ok === false ? ' erreur' : '')}>{etat.raison}</p>
    </div>
  );
}
