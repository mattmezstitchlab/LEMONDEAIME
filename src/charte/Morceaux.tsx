import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { MOMENTS, ajouterMusique, chercherMorceau, retirerMusique, changerMoment, envoyerFichier, jouable as estJouable, type Moment, type Musique } from '../lib/musique';
import { useSession } from '../lib/session';
import { jouerListe, useLecteur, type Piste } from '../lib/lecteur';

export const enPiste = (m: Musique): Piste => ({ nom: m.titre, artiste: m.artiste, pochette: m.pochette, deezer: m.deezer, lien: m.lien, source: m.source, url: m.source === 'fichier' ? m.lien : undefined });
const PLAY = <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5l11 7-11 7z" /></svg>;

/* Ajouter un morceau : chercher par titre ou artiste (extrait de 30 s par Deezer), ou coller un lien d'une autre plateforme. */
export function ChoisirMorceau({ moment: momentInitial, ajoute, compact }: { moment?: Moment; ajoute: (m: Musique) => void; compact?: boolean }) {
  const id = useId().replace(/:/g, '');
  const [q, setQ] = useState('');
  const [res, setRes] = useState<Musique[] | null>(null);
  const [moment, setMoment] = useState<Moment>(momentInitial || 'soiree');
  const [lien, setLien] = useState<{ url: string; titre: string; artiste: string } | null>(null);
  const [msg, setMsg] = useState('');
  const minuterie = useRef<number | undefined>(undefined);
  useEffect(() => {
    window.clearTimeout(minuterie.current);
    const t = q.trim();
    if (/^https:\/\//i.test(t)) { setRes(null); if (!/deezer\.com\/.*track\//.test(t)) setLien(l => ({ url: t, titre: l?.titre || '', artiste: l?.artiste || '' })); else setLien(null); return; }
    setLien(null);
    if (t.length < 2) { setRes(null); return; }
    minuterie.current = window.setTimeout(async () => { const r = await chercherMorceau(t); setRes(r.ok ? r.resultats || [] : []); if (!r.ok) setMsg(r.raison || 'La recherche ne répond pas.'); }, 350);
  }, [q]);
  const garder = async (corps: Parameters<typeof ajouterMusique>[0]) => {
    setMsg('Ajout…'); const r = await ajouterMusique(corps);
    if (r.ok && r.musique) { ajoute(r.musique); setMsg('« ' + r.musique.titre + ' » ajouté.'); setQ(''); setRes(null); setLien(null); }
    else setMsg(r.raison || 'Ajout impossible.');
  };
  const deezerColle = /^https:\/\/(www\.)?deezer\.com\/.*track\/(\d+)/.exec(q.trim());
  const envoyerLien = (e: FormEvent) => { e.preventDefault(); if (deezerColle) void garder({ deezer: Number(deezerColle[2]), moment }); else if (lien) void garder({ lien: lien.url, titre: lien.titre, artiste: lien.artiste, moment }); };
  return (
    <div className={'choisir' + (compact ? ' compact' : '')}>
      <div className="choisir-ligne">
        <label htmlFor={'q-' + id} className="sr-only">Chercher un morceau, ou coller un lien</label>
        <input id={'q-' + id} className="champ" value={q} onChange={e => setQ(e.target.value)} placeholder="Titre, artiste, ou lien d’une plateforme" autoComplete="off" />
        <label htmlFor={'m-' + id} className="sr-only">Moment du Jour J</label>
        {!momentInitial && <select id={'m-' + id} className="champ" value={moment} onChange={e => setMoment(e.target.value as Moment)}>{MOMENTS.map(([m, l]) => <option key={m} value={m}>{l}</option>)}</select>}
      </div>
      {(deezerColle || lien) && <form className="choisir-lien" onSubmit={envoyerLien}>
        {lien && !deezerColle && <>
          <input className="champ" required maxLength={120} placeholder="Titre du morceau" value={lien.titre} onChange={e => setLien({ ...lien, titre: e.target.value })} aria-label="Titre du morceau" />
          <input className="champ" maxLength={120} placeholder="Artiste" value={lien.artiste} onChange={e => setLien({ ...lien, artiste: e.target.value })} aria-label="Artiste" />
        </>}
        <button className="bouton noir" type="submit">Ajouter ce lien</button>
      </form>}
      {res && <ul className="choisir-res" aria-label="Résultats">
        {res.length ? res.map(m => <li key={m.deezer!}>
          {m.pochette ? <img src={m.pochette} alt="" width={44} height={44} loading="lazy" /> : <span className="pochette-vide" aria-hidden="true" />}
          <span className="choisir-nom"><b>{m.titre}</b><span>{m.artiste}</span></span>
          <button type="button" className="opt" aria-label={'Écouter l’extrait : ' + m.titre} onClick={() => jouerListe([enPiste(m)])}>{PLAY}</button>
          <button type="button" className="bouton noir" onClick={() => void garder({ deezer: m.deezer!, moment })}>Ajouter</button>
        </li>) : <li className="profil-note">Rien trouvé : essayez un autre mot, ou collez un lien.</li>}
      </ul>}
      <EnvoyerFichier moment={moment} ajoute={ajoute} />
      <p className="profil-note" role="status" aria-live="polite" style={{ minHeight: 20 }}>{msg || 'Extraits de 30 secondes par Deezer. Un lien Spotify, YouTube ou Apple Music s’ouvre chez eux.'}</p>
    </div>
  );
}

/* Envoyer sa propre musique (MP3, M4A, WAV, OGG ; 20 Mo) : seulement ses créations, la case « droits » est obligatoire. */
function EnvoyerFichier({ moment, ajoute }: { moment: Moment; ajoute: (m: Musique) => void }) {
  const session = useSession();
  const id = useId().replace(/:/g, '');
  const [ouvert, setOuvert] = useState(false);
  const [f, setF] = useState<File | null>(null);
  const [titre, setTitre] = useState(''); const [artiste, setArtiste] = useState(''); const [droits, setDroits] = useState(false);
  const [etat, setEtat] = useState<{ envoi?: number; msg?: string }>({});
  if (!session) return null;
  if (!ouvert) return <button type="button" className="opt" style={{ justifySelf: 'start' }} onClick={() => setOuvert(true)}>Envoyer ma propre musique (MP3)</button>;
  const envoyer = async (e: FormEvent) => {
    e.preventDefault(); if (!f) return;
    setEtat({ envoi: 0 });
    const r = await envoyerFichier(f, session.id, { titre: titre.trim(), artiste: artiste.trim(), moment }, p => setEtat({ envoi: Math.round(p) }));
    if (r.ok && r.musique) { ajoute(r.musique); setF(null); setTitre(''); setArtiste(''); setDroits(false); setEtat({ msg: '« ' + r.musique.titre + ' » envoyé.' }); }
    else setEtat({ msg: r.raison });
  };
  return (
    <form className="envoi-fichier" onSubmit={envoyer}>
      <label htmlFor={'f-' + id} className="etiquette-champ">Mon fichier audio (MP3, M4A, WAV, OGG · 20 Mo)
        <input id={'f-' + id} type="file" accept="audio/*,.mp3,.m4a,.wav,.ogg" required onChange={e => { const x = e.target.files?.[0] || null; setF(x); if (x && !titre) setTitre(x.name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ')); }} />
      </label>
      <div className="choisir-lien">
        <input className="champ" required maxLength={120} placeholder="Titre" aria-label="Titre" value={titre} onChange={e => setTitre(e.target.value)} />
        <input className="champ" maxLength={120} placeholder="Artiste (vous, votre groupe…)" aria-label="Artiste" value={artiste} onChange={e => setArtiste(e.target.value)} />
      </div>
      <label className="case-droits"><input type="checkbox" required checked={droits} onChange={e => setDroits(e.target.checked)} /><span>C’est ma création (ou j’en ai les droits) : je peux la faire écouter ici. Un titre connu ne s’envoie pas, il s’ajoute par la recherche ou par un lien.</span></label>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="bouton noir" type="submit" disabled={!f || !droits || etat.envoi !== undefined}>{etat.envoi !== undefined ? 'Envoi… ' + etat.envoi + ' %' : 'Envoyer'}</button>
        <button type="button" className="opt" onClick={() => setOuvert(false)}>Fermer</button>
        <span role="status" aria-live="polite" className="profil-note">{etat.msg}</span>
      </div>
    </form>
  );
}

/* Une liste de morceaux : écouter, changer de moment, retirer (si c'est la mienne). */
export function ListeMorceaux({ musiques, setMusiques, modifiable, vide }: { musiques: Musique[]; setMusiques?: (m: Musique[]) => void; modifiable?: boolean; vide?: string }) {
  const lect = useLecteur();
  const jouable = musiques.filter(estJouable);
  if (!musiques.length) return <p className="profil-note">{vide || 'Aucun morceau pour l’instant.'}</p>;
  return (
    <ul className="morceaux">
      {musiques.map(m => {
        const p = lect.pistes[lect.i], enCours = lect.joue && !!p && (m.deezer ? p.deezer === m.deezer : m.source === 'fichier' && p.url === m.lien);
        return <li key={m.id || m.titre}>
          {m.pochette ? <img src={m.pochette} alt="" width={44} height={44} loading="lazy" /> : <span className="pochette-vide" aria-hidden="true" />}
          <span className="choisir-nom"><b>{m.titre}</b><span>{m.artiste}</span></span>
          {estJouable(m)
            ? <button type="button" className="opt" aria-pressed={enCours} aria-label={'Écouter l’extrait : ' + m.titre} onClick={() => jouerListe(jouable.map(enPiste), jouable.indexOf(m))}>{PLAY}</button>
            : <a className="opt" href={m.lien} target="_blank" rel="noopener nofollow">Écouter<span className="sr-only"> (nouvel onglet)</span></a>}
          {modifiable && setMusiques && m.id && <>
            <select className="champ moment-mini" aria-label={'Moment de ' + m.titre} value={m.moment} onChange={async e => { const v = e.target.value as Moment; setMusiques(musiques.map(x => x.id === m.id ? { ...x, moment: v } : x)); await changerMoment(m.id!, v); }}>
              {MOMENTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <button type="button" className="opt" aria-label={'Retirer ' + m.titre} onClick={async () => { setMusiques(musiques.filter(x => x.id !== m.id)); await retirerMusique(m.id!); }}>×</button>
          </>}
        </li>;
      })}
    </ul>
  );
}
