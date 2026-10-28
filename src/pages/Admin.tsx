import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Tete, VerbesProjets } from '../charte/Charte';
import { Lien, useRecherche } from '../lib/router';
import { useSession } from '../lib/session';
import { slugDe } from '../../api/_projets.mjs';
import { ETATS, VIDE, envoyerImage, enregistrer, lireTout, ordonner, supprimer, type Projet } from '../lib/projets';

/* /admin : l'administration des projets de LE MONDE AIME. Réservée aux adresses listées dans AIME_ADMIN (vérifié par le serveur).
   À gauche, les projets dans leur ordre (monter, descendre) ; à droite, la fiche du projet choisi ou d'un nouveau projet. */
type Etat = 'chargement' | 'sans-compte' | 'refuse' | 'pret' | 'erreur';

function Champ({ id, label, aide, children }: { id: string; label: string; aide?: string; children: ReactNode }) {
  return <div className="ad-champ"><label htmlFor={id}>{label}</label>{children}{aide && <p className="ad-aide" id={id + '-aide'}>{aide}</p>}</div>;
}

export default function Admin() {
  const session = useSession();
  const recherche = useRecherche();
  const [etat, setEtat] = useState<Etat>('chargement');
  const [liste, setListe] = useState<Projet[]>([]);
  const [table, setTable] = useState(true);
  const [f, setF] = useState<Projet | null>(null);          /* la fiche en cours */
  const [ancien, setAncien] = useState<string | null>(null); /* son adresse enregistrée (null : nouveau projet) */
  const [slugTouche, setSlugTouche] = useState(false);
  const [annonce, setAnnonce] = useState('');
  const [erreur, setErreur] = useState('');
  const [occupe, setOccupe] = useState(false);
  const [envoi, setEnvoi] = useState<number | null>(null);
  const [confirmer, setConfirmer] = useState(false);
  const titre = useRef<HTMLHeadingElement>(null);

  async function charger(choix?: string | null) {
    const j = await lireTout();
    if (!j.ok) { setEtat(j.raison && /Réservé/.test(j.raison) ? 'refuse' : 'erreur'); setErreur(j.raison || ''); return; }
    const l = (j.projets || []) as Projet[];
    setListe(l); setTable(!!j.table); setEtat('pret');
    const voulu = choix !== undefined ? choix : new URLSearchParams(recherche).get('projet');
    const p = voulu ? l.find(x => x.slug === voulu) : null;
    if (p) ouvrir(p); else if (choix === null) { setF(null); setAncien(null); }
  }
  useEffect(() => { document.title = 'LE MONDE AIME — Administration'; }, []);
  useEffect(() => { if (session === null) setEtat('sans-compte'); else if (session) void charger(); /* eslint-disable-next-line */ }, [session]);

  function ouvrir(p: Projet) { setF({ ...VIDE, ...p, galerie: [...(p.galerie || [])] }); setAncien(p.slug); setSlugTouche(true); setErreur(''); setConfirmer(false); requestAnimationFrame(() => titre.current?.focus()); }
  function nouveau() { setF({ ...VIDE, ordre: liste.length + 1 }); setAncien(null); setSlugTouche(false); setErreur(''); setConfirmer(false); requestAnimationFrame(() => titre.current?.focus()); }
  const maj = <K extends keyof Projet>(k: K, v: Projet[K]) => setF(x => {
    if (!x) return x; const n = { ...x, [k]: v };
    if (k === 'titre' && !slugTouche && ancien === null) n.slug = slugDe(String(v));
    return n;
  });

  async function sauver() {
    if (!f) return;
    setOccupe(true); setErreur(''); setAnnonce('');
    const r = await enregistrer(f, ancien);
    setOccupe(false);
    if (!r.ok) { setErreur(r.raison || 'Enregistrement impossible.'); return; }
    setAnnonce('« ' + f.titre + ' » est enregistré' + (f.publie ? ' et publié.' : ' (brouillon).'));
    await charger(r.slug || f.slug);
  }
  async function effacer() {
    if (!f || ancien === null) return;
    setOccupe(true); const r = await supprimer(ancien); setOccupe(false); setConfirmer(false);
    if (!r.ok) { setErreur(r.raison || 'Suppression impossible.'); return; }
    setAnnonce('« ' + f.titre + ' » est supprimé.'); await charger(null);
  }
  async function deplacer(k: number, d: -1 | 1) {
    const l = [...liste]; const j = k + d; if (j < 0 || j >= l.length) return;
    [l[k], l[j]] = [l[j], l[k]]; setListe(l);
    const r = await ordonner(l.map(p => p.slug));
    if (!r.ok) { setErreur(r.raison || 'Ordre non enregistré.'); await charger(); return; }
    setAnnonce('« ' + l[j].titre + ' » est maintenant en position ' + (j + 1) + '.');
    if (f) setF({ ...f, ordre: l.findIndex(p => p.slug === f.slug) + 1 || f.ordre });
  }
  async function image(fichier: File | undefined, ou: 'couverture' | 'galerie') {
    if (!f || !fichier) return;
    setErreur(''); setEnvoi(0);
    try {
      const url = await envoyerImage(f.slug || slugDe(f.titre) || 'nouveau', fichier, setEnvoi);
      if (ou === 'couverture') maj('couverture', url); else maj('galerie', [...f.galerie, { src: url, alt: '' }]);
      setAnnonce('Image envoyée. Pensez à la décrire, puis à enregistrer.');
    } catch { setErreur('Envoi refusé : une image JPEG, PNG, WebP ou AVIF de 8 Mo au plus.'); }
    setEnvoi(null);
  }
  const galerie = (g: Projet['galerie']) => maj('galerie', g);

  return (
    <>
      <a className="lien-evitement" href="#contenu">Aller au contenu</a>
      <Tete courant="/admin" verbes={<VerbesProjets />} />
      <main id="contenu" className="ad">
        <p className="surtitre">LE MONDE AIME</p>
        <h1 className="titre">Administration des projets</h1>
        <p className="sr-only" aria-live="polite">{annonce}</p>

        {etat === 'chargement' && <p className="texte" role="status">Vérification de votre accès…</p>}
        {etat === 'sans-compte' && <p className="chapeau">Entrez dans AIME avec le compte de l’administration. <Lien href="/entrer">Entrer</Lien></p>}
        {etat === 'refuse' && <p className="chapeau">Cette page est réservée à l’administration du site.</p>}
        {etat === 'erreur' && <p className="chapeau" role="alert">{erreur || 'L’administration ne répond pas : réessayez.'}</p>}

        {etat === 'pret' && <>
          {!table && <p className="ad-alerte" role="alert">La table des projets n’existe pas encore sur cette base : vous voyez les projets d’origine, et rien ne peut être enregistré tant que la migration 2026-10-28-02 n’est pas appliquée.</p>}
          {annonce && <p className="ad-ok" aria-hidden="true">{annonce}</p>}
          <div className="ad-grille">
            <nav aria-label="Les projets" className="ad-liste">
              <button type="button" className="bouton noir" onClick={nouveau} style={{ width: '100%', justifyContent: 'center' }}>Nouveau projet</button>
              <ol>
                {liste.map((p, k) => <li key={p.slug} aria-current={ancien === p.slug ? 'true' : undefined}>
                  <button type="button" className="ad-choisir" onClick={() => ouvrir(p)}>
                    <b>{p.titre}</b><span>{p.publie ? 'Publié' : 'Brouillon'}{p.une ? ' · À la une' : ''} · {ETATS[p.statut]}</span>
                  </button>
                  <span className="ad-fleches">
                    <button type="button" aria-label={'Monter ' + p.titre} disabled={k === 0} onClick={() => deplacer(k, -1)}>↑</button>
                    <button type="button" aria-label={'Descendre ' + p.titre} disabled={k === liste.length - 1} onClick={() => deplacer(k, 1)}>↓</button>
                  </span>
                </li>)}
              </ol>
              {!liste.length && <p className="ad-aide">Aucun projet : créez le premier.</p>}
            </nav>

            {!f && <p className="texte">Choisissez un projet à gauche, ou créez-en un nouveau.</p>}
            {f && <form className="ad-fiche" onSubmit={e => { e.preventDefault(); void sauver(); }} aria-labelledby="ad-titre-fiche">
              <h2 id="ad-titre-fiche" ref={titre} tabIndex={-1} className="ad-titre">{ancien === null ? 'Nouveau projet' : f.titre || 'Projet'}</h2>
              <Champ id="ad-titre" label="Titre"><input id="ad-titre" className="champ" required maxLength={80} value={f.titre} onChange={e => maj('titre', e.target.value)} /></Champ>
              <Champ id="ad-slug" label="Adresse de la page" aide={'lemondeaime.com/projets/' + (f.slug || '…') + ' · minuscules, chiffres et tirets'}>
                <input id="ad-slug" className="champ" required maxLength={60} pattern="[a-z0-9]([a-z0-9-]*[a-z0-9])?" aria-describedby="ad-slug-aide" value={f.slug} onChange={e => { setSlugTouche(true); maj('slug', e.target.value.toLowerCase()); }} />
              </Champ>
              <Champ id="ad-accroche" label="Accroche" aide="Une phrase, sous le titre et sur la carte."><input id="ad-accroche" className="champ" maxLength={200} aria-describedby="ad-accroche-aide" value={f.accroche} onChange={e => maj('accroche', e.target.value)} /></Champ>
              <div className="ad-ligne">
                <Champ id="ad-cat" label="Catégorie"><input id="ad-cat" className="champ" list="ad-cats" maxLength={40} value={f.categorie} onChange={e => maj('categorie', e.target.value)} /><datalist id="ad-cats">{[...new Set(liste.map(p => p.categorie))].map(c => <option key={c} value={c} />)}</datalist></Champ>
                <Champ id="ad-annee" label="Année"><input id="ad-annee" className="champ" type="number" min={1990} max={2100} required value={f.annee} onChange={e => maj('annee', Number(e.target.value))} /></Champ>
                <Champ id="ad-etat" label="État"><select id="ad-etat" className="champ" value={f.statut} onChange={e => maj('statut', e.target.value as Projet['statut'])}>{Object.entries(ETATS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Champ>
              </div>
              <Champ id="ad-role" label="Rôle"><input id="ad-role" className="champ" maxLength={120} value={f.role} onChange={e => maj('role', e.target.value)} placeholder="Conception, design et développement" /></Champ>
              <Champ id="ad-lien" label="Lien « Visiter le site »" aide="Une page du site (/studio/atelier) ou une adresse https. Vide : pas de bouton.">
                <input id="ad-lien" className="champ" maxLength={300} aria-describedby="ad-lien-aide" value={f.lien} onChange={e => maj('lien', e.target.value.trim())} />
              </Champ>

              <fieldset className="ad-bloc">
                <legend>Image de couverture</legend>
                {f.couverture ? <img className="ad-apercu" src={f.couverture} alt="" /> : <p className="ad-aide">Aucune image.</p>}
                <div className="ad-ligne-boutons">
                  <label className="bouton">{f.couverture ? 'Remplacer' : 'Envoyer une image'}<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={e => { void image(e.target.files?.[0], 'couverture'); e.target.value = ''; }} /></label>
                  {f.couverture && <button type="button" className="bouton" onClick={() => maj('couverture', '')}>Retirer</button>}
                </div>
                <Champ id="ad-alt" label="Description de l’image" aide="Ce que montre l’image, pour qui ne la voit pas."><input id="ad-alt" className="champ" maxLength={200} aria-describedby="ad-alt-aide" value={f.alt} onChange={e => maj('alt', e.target.value)} /></Champ>
              </fieldset>

              <fieldset className="ad-bloc">
                <legend>Galerie ({f.galerie.length} / 12)</legend>
                <ol className="ad-galerie">
                  {f.galerie.map((g, k) => <li key={g.src + k}>
                    <img src={g.src} alt="" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <label className="sr-only" htmlFor={'ad-g-' + k}>Description de l’image {k + 1}</label>
                      <input id={'ad-g-' + k} className="champ" maxLength={200} placeholder="Description de l’image" value={g.alt} onChange={e => galerie(f.galerie.map((x, j) => j === k ? { ...x, alt: e.target.value } : x))} />
                      <span className="ad-fleches">
                        <button type="button" aria-label={'Monter l’image ' + (k + 1)} disabled={k === 0} onClick={() => { const l = [...f.galerie]; [l[k - 1], l[k]] = [l[k], l[k - 1]]; galerie(l); }}>↑</button>
                        <button type="button" aria-label={'Descendre l’image ' + (k + 1)} disabled={k === f.galerie.length - 1} onClick={() => { const l = [...f.galerie]; [l[k + 1], l[k]] = [l[k], l[k + 1]]; galerie(l); }}>↓</button>
                        <button type="button" aria-label={'Retirer l’image ' + (k + 1)} onClick={() => galerie(f.galerie.filter((_, j) => j !== k))}>Retirer</button>
                      </span>
                    </div>
                  </li>)}
                </ol>
                {f.galerie.length < 12 && <label className="bouton">Ajouter une image<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={e => { void image(e.target.files?.[0], 'galerie'); e.target.value = ''; }} /></label>}
              </fieldset>
              {envoi !== null && <p className="ad-aide" role="status">Envoi de l’image… {Math.round(envoi)} %</p>}

              <Champ id="ad-desc" label="Présentation" aide="Séparez les paragraphes par une ligne vide."><textarea id="ad-desc" className="champ ad-texte" maxLength={6000} rows={9} aria-describedby="ad-desc-aide" value={f.description} onChange={e => maj('description', e.target.value)} /></Champ>

              <div className="ad-cases">
                <label><input type="checkbox" checked={f.publie} onChange={e => maj('publie', e.target.checked)} /> Publié (visible de tous)</label>
                <label><input type="checkbox" checked={f.une} onChange={e => maj('une', e.target.checked)} /> À la une (un seul projet à la fois)</label>
              </div>

              {erreur && <p className="ad-alerte" role="alert">{erreur}</p>}
              <div className="ad-ligne-boutons">
                <button type="submit" className="bouton noir" disabled={occupe || !table || envoi !== null}>{occupe ? 'Enregistrement…' : 'Enregistrer'}</button>
                {ancien !== null && f.publie && <Lien className="bouton" href={'/projets/' + ancien}>Voir la page</Lien>}
                {ancien !== null && !confirmer && <button type="button" className="bouton" disabled={!table} onClick={() => setConfirmer(true)}>Supprimer</button>}
                {confirmer && <span className="ad-confirmer" role="group" aria-label="Confirmer la suppression">
                  Supprimer « {f.titre} » définitivement ?
                  <button type="button" className="bouton noir" onClick={() => void effacer()}>Oui, supprimer</button>
                  <button type="button" className="bouton" onClick={() => setConfirmer(false)}>Non</button>
                </span>}
              </div>
            </form>}
          </div>
        </>}
      </main>
    </>
  );
}
