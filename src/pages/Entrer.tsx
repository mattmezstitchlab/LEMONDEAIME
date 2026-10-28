import { useEffect, useState, type FormEvent } from 'react';
import { Tete, Pied } from '../charte/Charte';
import { Lien } from '../lib/router';
import { demanderLien, entrerAvecGoogle, lireFournisseurs, useSession, type Fournisseurs } from '../lib/session';
import { clesPossibles, entrerAvecCle } from '../lib/cles';

const GOOGLE = <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z" /><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" /><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" /></svg>;

/* Entrer dans AIME : Google en un clic, une clé d'accès (visage, empreinte) pour revenir, le lien e-mail en secours. */
export default function Entrer() {
  const session = useSession();
  const [f, setF] = useState<Fournisseurs | null>(null);
  const [etat, setEtat] = useState<{ envoi?: string; ok?: boolean; raison?: string }>({});
  useEffect(() => {
    lireFournisseurs().then(setF);
    if (new URLSearchParams(window.location.search).get('erreur') === 'google') setEtat({ ok: false, raison: 'Google n’a pas pu vous connecter : réessayez, ou utilisez un lien e-mail.' });
  }, []);
  const lien = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get('email') || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEtat({ ok: false, raison: 'Cette adresse e-mail ne semble pas complète.' }); return; }
    setEtat({ envoi: 'lien' });
    const r = await demanderLien(email, '/buro');
    setEtat(r.ok ? { ok: true, raison: 'Lien envoyé : ouvrez votre messagerie.' } : { ok: false, raison: r.raison });
  };
  const google = async () => { setEtat({ envoi: 'google' }); const r = await entrerAvecGoogle('/buro'); if (!r.ok) setEtat({ ok: false, raison: r.raison }); };
  const cle = async () => { setEtat({ envoi: 'cle' }); const r = await entrerAvecCle(); if (r.ok) { window.location.assign('/buro'); } else setEtat({ ok: false, raison: r.raison }); };
  const grand = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, width: '100%', height: 56, borderRadius: 14, fontSize: 17, fontWeight: 600 } as const;
  return (
    <>
      <a className="lien-evitement" href="#contenu">Aller au contenu</a>
      <Tete courant="/entrer" />
      <main id="contenu" style={{ padding: 'clamp(64px, 10vw, 140px) var(--marge) 140px', maxWidth: 900 }}>
        <p className="surtitre">Un seul compte pour tous les studios</p>
        <h1 className="titre" style={{ fontSize: 'clamp(48px, 7vw, 108px)', lineHeight: .9, textTransform: 'uppercase' }}>Entrer dans AIME</h1>
        {session
          ? <p className="chapeau">Vous êtes entré·e{session.email ? ' avec ' + session.email : ''}. <Lien href="/buro">Ouvrir mon BurO</Lien> ou <Lien href="/point-zero">commencer au Point Zéro</Lien>.</p>
          : <div style={{ marginTop: 40, display: 'grid', gap: 12, maxWidth: 460 }}>
            {f && !f.comptes && <p className="chapeau" style={{ marginTop: 0 }}>Les comptes ne sont pas encore ouverts sur cette version du site.</p>}
            {f?.google && <button type="button" onClick={google} disabled={!!etat.envoi} style={{ ...grand, border: '1px solid #0B0B0C', background: '#fff' }}>{GOOGLE}{etat.envoi === 'google' ? 'Ouverture de Google…' : 'Continuer avec Google'}</button>}
            {f?.cle && clesPossibles() && <button type="button" onClick={cle} disabled={!!etat.envoi} style={{ ...grand, border: 0, background: '#0B0B0C', color: '#fff' }}>{etat.envoi === 'cle' ? 'Vérification…' : 'Avec ma clé d’accès (visage, empreinte)'}</button>}
            {f?.lien && <details style={{ marginTop: 8 }} open={!f.google}>
              <summary style={{ cursor: 'pointer', fontSize: 16, fontWeight: 600, minHeight: 44, display: 'flex', alignItems: 'center' }}>Recevoir un lien par e-mail</summary>
              <form onSubmit={lien} style={{ display: 'grid', gap: 10, marginTop: 8 }}>
                <label htmlFor="email" className="sr-only">Votre adresse e-mail</label>
                <input id="email" name="email" type="email" autoComplete="email webauthn" placeholder="vous@exemple.fr" required className="champ" />
                <button className="bouton" type="submit" disabled={!!etat.envoi} style={{ justifySelf: 'start' }}>{etat.envoi === 'lien' ? 'Envoi…' : 'Recevoir mon lien'}</button>
              </form>
            </details>}
            <p role="status" aria-live="polite" style={{ margin: '8px 0 0', minHeight: 24, fontSize: 17, fontWeight: 600 }}>{etat.raison}</p>
            {f?.comptes && <p style={{ margin: 0, fontSize: 15, color: '#3A3A3F' }}>Une fois entré·e, enregistrez une clé d’accès : la prochaine fois, votre visage ou votre empreinte suffiront.</p>}
          </div>}
      </main>
      <Pied />
    </>
  );
}
