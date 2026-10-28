import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Lien } from '../lib/router';
import { Orbe } from './Charte';
import { demanderOrbe, initiales, type Etat, type Prestation } from '../lib/reseau';
import { dateLisible, repondreLocal } from '../../api/_orbe-local.mjs';

/* Une carte du Réseau. Face avant : la photo, le métier, le nom (et « libre le … » quand on cherche une date).
   Le petit bouton orbe la retourne : au dos, l'assistant de la personne, qui ne répond qu'avec sa fiche. */
export type FicheOrbe = { nom: string; metier?: string; ville?: string; zone?: string; langues?: string; tarif?: string; bio?: string; prestations?: Prestation[] };
export type Carte = { href: string; nom: string; etiquette: string; photo?: string; alt?: string; exemple?: boolean; credit?: string | null;
  ref?: string; fiche?: FicheOrbe; etat?: Etat | null; date?: string | null };
const ETIQUETTE: Record<Etat, string> = { libre: 'Libre le', option: 'En option le', prise: 'Pris le' };
const court = (d: string) => dateLisible(d).replace(/ \d{4}$/, '');

function Dos({ c, retourner, ouvert }: { c: Carte; retourner: () => void; ouvert: boolean }) {
  const id = useId().replace(/:/g, '');
  const [q, setQ] = useState('');
  const [fil, setFil] = useState<{ q: string; r: string; trouve: boolean }[]>([]);
  const [envoi, setEnvoi] = useState(false);
  const champ = useRef<HTMLInputElement>(null), bas = useRef<HTMLDivElement>(null);
  const prenom = /^(le|la|les|l’|l')\s?/i.test(c.nom) ? c.nom.charAt(0).toLowerCase() + c.nom.slice(1) : c.nom.split(' ')[0];
  useEffect(() => { if (ouvert) champ.current?.focus({ preventScroll: true }); }, [ouvert]);
  useEffect(() => { bas.current?.scrollTo({ top: bas.current.scrollHeight }); }, [fil]);
  const idees = [c.date ? 'Libre le ' + court(c.date) + ' ?' : 'Libre le 12 juin ?', 'Quelles prestations ?', 'Où intervenez-vous ?'];
  const demander = async (question: string) => {
    const t = question.trim(); if (!t || envoi) return;
    setQ(''); setEnvoi(true);
    let r: { reponse: string; trouve: boolean };
    if (c.ref) { const x = await demanderOrbe(c.ref, t); r = x.ok && x.reponse ? { reponse: x.reponse, trouve: !!x.trouve } : { reponse: x.raison || 'L’orbe ne répond pas pour le moment.', trouve: false }; }
    else r = repondreLocal(c.fiche || { nom: c.nom }, t, () => null);
    setFil(f => [...f, { q: t, r: r.reponse, trouve: r.trouve }].slice(-4)); setEnvoi(false);
  };
  const envoyer = (e: FormEvent) => { e.preventDefault(); void demander(q); };
  return (
    <div className="face dos" aria-hidden={!ouvert} inert={!ouvert}>
      <div className="dos-haut">
        <span className="dos-titre">L’assistant de {prenom}</span>
        <button type="button" className="dos-retour" onClick={retourner} aria-label={'Retourner la carte de ' + c.nom}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12a8 8 0 0 1 14-5.3M20 4v4h-4M20 12a8 8 0 0 1-14 5.3M4 20v-4h4" /></svg>
        </button>
      </div>
      <div className="dos-fil" ref={bas} aria-live="polite">
        {!fil.length && <div className="dos-orbe"><Orbe taille={72} /><p>Posez une question : l’orbe connaît la fiche de {prenom}, et seulement elle.</p></div>}
        {fil.map((m, k) => <div key={k} className="dos-echange"><p className="dos-q">{m.q}</p><p className="dos-r">{m.r}</p></div>)}
        {envoi && <p className="dos-r dos-attente">…</p>}
      </div>
      {!fil.length && <div className="dos-idees">{idees.map(i => <button key={i} type="button" onClick={() => void demander(i)}>{i}</button>)}</div>}
      <form className="dos-champ" onSubmit={envoyer}>
        <label htmlFor={'q-' + id} className="sr-only">Votre question à l’assistant de {c.nom}</label>
        <input ref={champ} id={'q-' + id} value={q} onChange={e => setQ(e.target.value)} placeholder="Votre question…" maxLength={300} autoComplete="off" />
        <button type="submit" disabled={envoi || !q.trim()} aria-label="Envoyer la question"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></button>
      </form>
      <Lien className="dos-demande" href={c.href + (c.exemple ? '' : '#demande')}>{c.exemple ? 'Voir la fiche' : 'Envoyer une demande à ' + prenom}</Lien>
      {c.exemple && <p className="dos-note">Exemple : sur un vrai profil, l’orbe répond avec sa fiche, ses dates et ses prestations.</p>}
    </div>
  );
}

export function CarteReseau({ c }: { c: Carte }) {
  const [retournee, setRetournee] = useState(false);
  const bouton = useRef<HTMLButtonElement>(null);
  const retourner = () => { setRetournee(false); requestAnimationFrame(() => bouton.current?.focus()); };
  const orbe = !!(c.ref || c.fiche);
  return (
    <article style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className={'carte-flip' + (retournee ? ' retournee' : '')}>
        <div className="face avant" aria-hidden={retournee} inert={retournee}>
          <Lien className="carte-reseau" href={c.href} style={{ display: 'flex', flexDirection: 'column', gap: 14, textDecoration: 'none', color: 'inherit' }}>
            <div className="ph" style={{ position: 'relative', aspectRatio: '4 / 5', borderRadius: 10, overflow: 'hidden', background: c.photo ? '#E4E4E1' : 'var(--nacre)' }}>
              {c.photo
                ? <img src={c.photo} alt={c.alt || ''} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 28%', display: 'block' }} />
                : <span aria-hidden="true" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'clamp(48px, 6vw, 80px)', fontWeight: 600, letterSpacing: '-0.04em' }}>{initiales(c.nom)}</span>}
              {c.exemple && <span style={{ position: 'absolute', top: 10, left: 10, padding: '4px 9px', borderRadius: 999, background: 'rgba(255,255,255,.92)', fontSize: 12, fontWeight: 600 }}>Exemple</span>}
              {c.etat && c.date && <span className={'pastille-date ' + c.etat}>{ETIQUETTE[c.etat]} {court(c.date)}</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: '#55555A' }}>{c.etiquette}</span>
              <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.03em' }}>{c.nom}</span>
            </div>
          </Lien>
          {orbe && <button ref={bouton} type="button" className="carte-orbe" aria-label={'Retourner la carte : poser une question à l’assistant de ' + c.nom} title="Poser une question" onClick={() => setRetournee(true)}><Orbe taille={26} /></button>}
        </div>
        {orbe && <Dos c={c} ouvert={retournee} retourner={retourner} />}
      </div>
      {c.credit !== undefined && (c.credit
        ? <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#3A3A3F' }}><span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: '#3B6FD8', flex: 'none' }} />{c.credit}</p>
        : <p style={{ margin: 0, fontSize: 14, color: '#55555A' }}>Pas encore crédité dans une union</p>)}
    </article>
  );
}
