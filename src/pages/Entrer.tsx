import { useState, type FormEvent } from 'react';
import { Tete, Pied } from '../charte/Charte';
import { Lien } from '../lib/router';
import { demanderLien, useSession } from '../lib/session';

/* Entrer dans AIME : une adresse e-mail suffit, pour tous les studios. Un lien de connexion arrive par e-mail. */
export default function Entrer() {
  const session = useSession();
  const [etat, setEtat] = useState<{ envoi?: boolean; ok?: boolean; raison?: string }>({});
  const envoyer = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get('email') || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEtat({ ok: false, raison: 'Cette adresse e-mail ne semble pas complète.' }); return; }
    setEtat({ envoi: true });
    const r = await demanderLien(email, '/buro');
    setEtat(r.ok ? { ok: true } : { ok: false, raison: r.raison });
  };
  return (
    <>
      <a className="lien-evitement" href="#contenu">Aller au contenu</a>
      <Tete courant="/entrer" />
      <main id="contenu" style={{ padding: 'clamp(64px, 10vw, 140px) var(--marge) 140px', maxWidth: 900 }}>
        <p className="surtitre">Un seul compte pour tous les studios</p>
        <h1 className="titre" style={{ fontSize: 'clamp(48px, 7vw, 108px)', lineHeight: .9, textTransform: 'uppercase' }}>Entrer dans AIME</h1>
        {session
          ? <p className="chapeau">Vous êtes entré·e{session.email ? ' avec ' + session.email : ''}. <Lien href="/buro">Ouvrir mon BurO</Lien> ou <Lien href="/point-zero">commencer au Point Zéro</Lien>.</p>
          : <>
            <p className="chapeau">Une adresse e-mail suffit. Vous recevez un lien de connexion, valable 15 minutes, sans mot de passe.</p>
            <form onSubmit={envoyer} style={{ marginTop: 40, display: 'grid', gap: 14, maxWidth: 520 }}>
              <label htmlFor="email" style={{ fontWeight: 600 }}>Votre adresse e-mail</label>
              <input id="email" name="email" type="email" autoComplete="email" required className="champ" />
              <button className="bouton noir" type="submit" disabled={etat.envoi} style={{ justifySelf: 'start' }}>{etat.envoi ? 'Envoi…' : 'Recevoir mon lien'}</button>
              <p role="status" aria-live="polite" style={{ margin: 0, minHeight: 24, fontSize: 17, fontWeight: 600 }}>
                {etat.ok === true && 'Lien envoyé : ouvrez votre messagerie.'}
                {etat.ok === false && etat.raison}
              </p>
            </form>
          </>}
      </main>
      <Pied />
    </>
  );
}
