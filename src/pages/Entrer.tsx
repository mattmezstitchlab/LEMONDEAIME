import { Tete, Pied } from '../charte/Charte';
import { EntrerBloc } from '../charte/EntrerBloc';
import { Lien } from '../lib/router';
import { useSession } from '../lib/session';

/* Entrer dans AIME : la page de secours (lien e-mail expiré, Google refusé). Au quotidien, on entre depuis le rond du profil, dans le dock. */
function erreurDepuisAdresse() {
  const q = new URLSearchParams(window.location.search), e = q.get('erreur');
  if (e === 'google') return 'Google n’a pas pu vous connecter : réessayez, ou utilisez un lien e-mail.';
  if (e === 'lien') return q.get('error') === 'EXPIRED_TOKEN' ? 'Ce lien a expiré (15 minutes) : demandez-en un nouveau.' : 'Ce lien ne fonctionne plus (déjà utilisé, expiré ou incomplet) : demandez-en un nouveau ci-dessous.';
  return undefined;
}
export default function Entrer() {
  const session = useSession();
  return (
    <>
      <a className="lien-evitement" href="#contenu">Aller au contenu</a>
      <Tete courant="/entrer" />
      <main id="contenu" style={{ padding: 'clamp(64px, 10vw, 140px) var(--marge) 140px', maxWidth: 900 }}>
        <p className="surtitre">Un seul compte pour tous les studios</p>
        <h1 className="titre" style={{ fontSize: 'clamp(48px, 7vw, 108px)', lineHeight: .9, textTransform: 'uppercase' }}>Entrer dans AIME</h1>
        {session
          ? <p className="chapeau">Vous êtes entré·e{session.email ? ' avec ' + session.email : ''}. <Lien href="/buro">Ouvrir mon espace</Lien> ou <Lien href="/point-zero">commencer au Point Zéro</Lien>.</p>
          : <div style={{ marginTop: 40, maxWidth: 520 }}>
            <EntrerBloc retour="/buro" erreur={erreurDepuisAdresse()} />
            <p style={{ margin: '12px 0 0', fontSize: 15, color: '#3A3A3F' }}>Une fois entré·e, enregistrez une clé d’accès : la prochaine fois, votre visage ou votre empreinte suffiront.</p>
          </div>}
      </main>
      <Pied />
    </>
  );
}
