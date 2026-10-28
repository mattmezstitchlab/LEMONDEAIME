import { useRef } from 'react';
import { Lien } from '../lib/router';
import { MEDIAS } from '../lib/medias';
/* Les projets du Monde AIME, tels qu'ils apparaissent dans la galerie (et en aperçu sur l'accueil). */
const PROJETS = [
  { nom: 'Point Zéro', genre: 'L’étape 0', href: '/point-zero', texte: 'Là où tout projet commence : importer, décrire, annoncer. Les briques s’allument sous vos yeux, puis se rangent dans votre espace.', noir: true },
  { nom: 'AIME Wedding', genre: 'Studio', href: '/aime-wedding', media: MEDIAS.union, texte: 'Le site de l’union : les couples, les prestataires, les invités, et un espace pour tout préparer.' },
  { nom: 'Brode Way', genre: 'Studio', href: 'https://pointzero-zeta.vercel.app/', media: MEDIAS.broderie, texte: 'Le studio de la broderie : importer, dessiner sa grille point par point, broder et partager.' },
  { nom: 'Présentation', genre: 'Charte · doc', href: null, media: MEDIAS.scene, texte: 'D’un document à une présentation en deux docks : les diapositives en bas, le Point qui accompagne l’orateur.' },
  { nom: 'Habillage', genre: 'Charte · site', href: null, media: MEDIAS.facade, texte: 'Votre site, tel qu’il est, habillé des deux docks et du Point qui guide. Ou refait de zéro.' },
];
export function Projets({ ligne }: { ligne?: boolean } = {}) {
  const rail = useRef<HTMLUListElement>(null);
  const glisser = (sens: number) => rail.current?.scrollBy({ left: sens * Math.min(rail.current.clientWidth * .8, 470), behavior: 'smooth' });
  const liste = (
    <ul ref={rail} className={ligne ? 'cartes ligne' : 'cartes'} tabIndex={ligne ? 0 : undefined} aria-label={ligne ? 'Les studios, à faire défiler' : undefined}>
      {PROJETS.map(p => {
        const cadre = p.noir
          ? <div className="cadre" style={{ background: '#0B0B0C', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 18, padding: '0 clamp(20px, 3vw, 40px)' }}>
              <span aria-hidden="true" style={{ fontSize: 'clamp(30px, 3.4vw, 46px)', lineHeight: .9, fontWeight: 900, letterSpacing: '-0.05em', textTransform: 'uppercase', color: '#fff' }}>Point<br />Zéro</span>
              <span aria-hidden="true" style={{ display: 'flex', alignItems: 'center', gap: 10, height: 52, padding: '0 6px', borderRadius: 26, background: '#fff' }}><span className="orbe" style={{ width: 40, height: 40 }} /><span style={{ fontSize: 17, color: '#55555A' }}>Tout commence ici…</span></span>
            </div>
          : <div className="cadre"><img src={p.media!.src} alt={p.media!.alt} loading="lazy" /></div>;
        const corps = <>{cadre}<h3>{p.nom}<small>{p.href ? p.genre : <span className="bientot">Bientôt</span>}</small></h3><p>{p.texte}</p></>;
        const ext = p.href?.startsWith('http');
        return <li key={p.nom}>{p.href ? <Lien className="carte-projet" href={p.href} target={ext ? '_blank' : undefined} rel={ext ? 'noopener' : undefined}>{corps}{ext && <span className="sr-only"> (nouvel onglet)</span>}</Lien> : <div className="carte-projet">{corps}</div>}</li>;
      })}
      <li><div className="carte-projet"><div className="cadre" style={{ background: 'transparent', border: '2px dashed #CFCFCB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="orbe" style={{ width: 64, height: 64 }} /></div><h3 style={{ color: '#55555A' }}>D’autres projets<small><span className="bientot">Bientôt</span></small></h3><p>Chaque nouveau studio rejoindra cette galerie, avec sa propre page.</p></div></li>
    </ul>
  );
  if (!ligne) return liste;
  return (
    <>
      {liste}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button type="button" className="bouton" onClick={() => glisser(-1)}>Précédent</button>
        <button type="button" className="bouton" onClick={() => glisser(1)}>Suivant</button>
      </div>
    </>
  );
}
