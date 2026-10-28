import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Lien } from '../lib/router';
import { ecrireDates, ecrireMonProfil, lireMonProfil, marquerLue, type Demande, type Etat, type Prestation, type Profil } from '../lib/reseau';
import { changerPhoto, reduirePhoto, useSession } from '../lib/session';
import { CarteReseau } from '../charte/CartePersonne';
import { DOMAINES, domaine } from '../lib/reseau-exemples';
import { ChoisirMorceau, ListeMorceaux } from '../charte/Morceaux';
import { mesMusiques, type Musique } from '../lib/musique';

const ETATS: [Etat, string][] = [['libre', 'Libre'], ['option', 'En option'], ['prise', 'Prise']];
const SUIVANT: Record<string, Etat | null> = { '': 'libre', libre: 'option', option: 'prise', prise: null };
const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const iso = (a: number, m: number, j: number) => a + '-' + String(m + 1).padStart(2, '0') + '-' + String(j).padStart(2, '0');

/* Mes dates : un mois à la fois ; toucher un jour le fait passer de vide à libre, en option, prise, puis vide. Enregistré aussitôt. */
function MesDates({ dates, setDates }: { dates: Record<string, Etat>; setDates: (d: Record<string, Etat>) => void }) {
  const auj = new Date(); const [mois, setMois] = useState({ a: auj.getFullYear(), m: auj.getMonth() });
  const [msg, setMsg] = useState('');
  const attente = useRef<Record<string, Etat | null>>({}), minuterie = useRef<number | undefined>(undefined);
  const premier = (new Date(mois.a, mois.m, 1).getDay() + 6) % 7, n = new Date(mois.a, mois.m + 1, 0).getDate();
  const aujIso = iso(auj.getFullYear(), auj.getMonth(), auj.getDate());
  const toucher = (j: string) => {
    const e = SUIVANT[dates[j] || ''], d = { ...dates }; if (e) d[j] = e; else delete d[j];
    setDates(d); attente.current[j] = e;
    window.clearTimeout(minuterie.current);
    minuterie.current = window.setTimeout(async () => { const lot = attente.current; attente.current = {}; const r = await ecrireDates(lot); setMsg(r.ok ? 'Dates enregistrées.' : r.raison || 'Enregistrement impossible.'); }, 700);
  };
  const aller = (k: number) => setMois(({ a, m }) => { const d = new Date(a, m + k, 1); return { a: d.getFullYear(), m: d.getMonth() }; });
  return (
    <section aria-labelledby="titre-dates" className="profil-bloc">
      <h2 id="titre-dates">Mes dates</h2>
      <p className="profil-note">Touchez un jour : libre, puis en option, puis prise, puis vide. Le public ne voit jamais votre calendrier : seulement « libre » ou non pour la date qu’on vous demande.</p>
      <div className="cal-tete">
        <button type="button" className="opt" onClick={() => aller(-1)} aria-label="Mois précédent">‹</button>
        <b aria-live="polite">{MOIS[mois.m]} {mois.a}</b>
        <button type="button" className="opt" onClick={() => aller(1)} aria-label="Mois suivant">›</button>
      </div>
      <div className="cal" role="grid" aria-label={'Mes dates, ' + MOIS[mois.m] + ' ' + mois.a}>
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((x, k) => <span key={k} className="cal-jsem" aria-hidden="true">{x}</span>)}
        {Array.from({ length: premier }, (_, k) => <span key={'v' + k} />)}
        {Array.from({ length: n }, (_, k) => {
          const j = iso(mois.a, mois.m, k + 1), e = dates[j], passe = j < aujIso;
          return <button key={j} type="button" className={'cal-j' + (e ? ' ' + e : '')} disabled={passe} onClick={() => toucher(j)}
            aria-label={(k + 1) + ' ' + MOIS[mois.m].toLowerCase() + ' : ' + (e ? ETATS.find(x => x[0] === e)![1].toLowerCase() : 'non indiqué')}>{k + 1}</button>;
        })}
      </div>
      <div className="cal-legende" aria-hidden="true">{ETATS.map(([e, l]) => <span key={e}><i className={'cal-j ' + e} />{l}</span>)}</div>
      <p role="status" aria-live="polite" className="profil-note" style={{ minHeight: 20 }}>{msg}</p>
    </section>
  );
}

/* Mon profil, dans mon espace : ce que le Réseau montre de moi, et seulement si je le décide. */
export default function MonProfil() {
  const session = useSession();
  const [p, setP] = useState<Profil | null>(null);
  const [dates, setDates] = useState<Record<string, Etat>>({});
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [questions, setQuestions] = useState<{ question: string; cree_le: string }[]>([]);
  const [msg, setMsg] = useState('');
  const [msgPhoto, setMsgPhoto] = useState('');
  const [musiques, setMusiques] = useState<Musique[]>([]);
  useEffect(() => { mesMusiques().then(r => { if (r.ok) setMusiques(r.musiques || []); }); }, []);
  const [envoi, setEnvoi] = useState(false);
  useEffect(() => { lireMonProfil().then(r => {
    setP(r.profil || { nom: r.suggestion?.nom || '', domaine: '', metier: '', ville: '', bio: '', site: '', visible: false });
    setDates(r.dates || {}); setDemandes(r.demandes || []); setQuestions(r.questions || []);
    if (!r.ok) setMsg(r.raison || '');
  }); }, []);
  if (!p) return <p style={{ marginTop: 24, fontSize: 18 }}>Chargement…</p>;
  const champ = (k: keyof Profil) => ({ value: String(p[k] ?? ''), onChange: (e: { target: { value: string } }) => setP({ ...p, [k]: e.target.value }) });
  const prest = p.prestations || [], liens = p.liens || [];
  const majPrest = (k: number, v: Partial<Prestation>) => setP({ ...p, prestations: prest.map((x, i) => i === k ? { ...x, ...v } : x) });
  const envoyer = async (e: FormEvent) => {
    e.preventDefault(); setEnvoi(true);
    const r = await ecrireMonProfil({ ...p, prestations: prest.filter(x => x.titre.trim()), liens: liens.filter(x => x.trim()) }); setEnvoi(false); if (r.ok && r.profil) setP({ ...p, ref: r.profil.ref });
    setMsg(r.ok ? (p.visible ? 'Profil enregistré : il apparaît dans le Réseau.' : 'Profil enregistré. Il reste caché tant que vous ne le rendez pas visible.') : (r.raison || 'Enregistrement impossible.'));
  };
  const photo = async (f: File | undefined) => {
    if (!f) return; setMsgPhoto('Préparation…');
    try { const d = await reduirePhoto(f); const r = await changerPhoto(d); setMsgPhoto(r.ok ? 'Photo enregistrée.' : r.raison || ''); }
    catch { setMsgPhoto('Cette image n’a pas pu être lue : essayez une photo JPEG ou PNG.'); }
  };
  const etiquette = { display: 'grid', gap: 6, fontSize: 16, fontWeight: 600 } as const;
  const facultatif = (t = 'facultatif') => <span style={{ fontWeight: 400, color: '#55555A' }}>({t})</span>;
  const nonLues = demandes.filter(d => !d.lue).length;
  return (
    <div style={{ marginTop: 'clamp(32px, 4vw, 56px)', display: 'grid', gap: 56 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: 40, alignItems: 'start' }}>
        <form onSubmit={envoyer} style={{ display: 'grid', gap: 18, maxWidth: 560 }} aria-labelledby="titre-profil">
          <h2 id="titre-profil" style={{ margin: 0, fontSize: 28, fontWeight: 600 }}>Mon profil</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span className="profil-photo">{session?.image ? <img src={session.image} alt="Ma photo" /> : <span aria-hidden="true">{(p.nom || '·').slice(0, 1).toUpperCase()}</span>}</span>
            <label className="bouton" style={{ cursor: 'pointer' }}>{session?.image ? 'Changer ma photo' : 'Ajouter ma photo'}<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={e => { void photo(e.target.files?.[0]); e.target.value = ''; }} /></label>
            {session?.image && <button type="button" className="opt" onClick={async () => { const r = await changerPhoto(null); setMsgPhoto(r.ok ? 'Photo retirée.' : r.raison || ''); }}>Retirer</button>}
            <span role="status" aria-live="polite" className="profil-note">{msgPhoto}</span>
          </div>
          <label style={etiquette}>Nom affiché<input className="champ" required maxLength={60} autoComplete="name" {...champ('nom')} /></label>
          <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
            <legend style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Mon domaine</legend>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {DOMAINES.map(d => <label key={d.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 44, padding: '0 14px', borderRadius: 999, border: '1px solid #0B0B0C', background: p.domaine === d.id ? '#0B0B0C' : '#fff', color: p.domaine === d.id ? '#fff' : '#0B0B0C', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                <input type="radio" name="domaine" value={d.id} required checked={p.domaine === d.id} onChange={() => setP({ ...p, domaine: d.id })} style={{ accentColor: '#fff', margin: 0 }} />{d.label}
              </label>)}
            </div>
          </fieldset>
          <label style={etiquette}><span>Mon métier {facultatif('en un ou deux mots : fleuriste, DJ, brodeuse…')}</span><input className="champ" required maxLength={40} {...champ('metier')} /></label>
          <label style={etiquette}><span>Ville ou région {facultatif()}</span><input className="champ" maxLength={60} autoComplete="address-level2" {...champ('ville')} /></label>
          <label style={etiquette}><span>Où j’interviens {facultatif('ex. : toute la Bretagne, Paris et 100 km')}</span><input className="champ" maxLength={80} {...champ('zone')} /></label>
          <label style={etiquette}><span>Langues {facultatif('ex. : français, anglais')}</span><input className="champ" maxLength={60} {...champ('langues')} /></label>
          <label style={etiquette}><span>En quelques mots {facultatif('400 caractères')}</span><textarea className="champ" maxLength={400} rows={4} style={{ height: 'auto', padding: 14, lineHeight: 1.5, resize: 'vertical' }} {...champ('bio')} /></label>
          <fieldset style={{ border: 0, margin: 0, padding: 0, display: 'grid', gap: 10 }}>
            <legend style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Mes prestations <span style={{ fontWeight: 400, color: '#55555A' }}>(8 au plus)</span></legend>
            {prest.map((x, k) => <div key={k} className="prest-ligne">
              <input className="champ" aria-label={'Prestation ' + (k + 1) + ' : titre'} placeholder="Bouquet de mariée" maxLength={60} value={x.titre} onChange={e => majPrest(k, { titre: e.target.value })} />
              <input className="champ" aria-label={'Prestation ' + (k + 1) + ' : en quelques mots'} placeholder="En quelques mots (facultatif)" maxLength={160} value={x.texte} onChange={e => majPrest(k, { texte: e.target.value })} />
              <button type="button" className="opt" aria-label={'Retirer la prestation ' + (x.titre || k + 1)} onClick={() => setP({ ...p, prestations: prest.filter((_, i) => i !== k) })}>×</button>
            </div>)}
            {prest.length < 8 && <button type="button" className="opt" style={{ justifySelf: 'start' }} onClick={() => setP({ ...p, prestations: [...prest, { titre: '', texte: '' }] })}>+ Ajouter une prestation</button>}
          </fieldset>
          <label style={etiquette}><span>Mon tarif {facultatif('vos mots, ex. : à partir de … €')}</span><input className="champ" maxLength={80} {...champ('tarif')} /><span className="profil-note" style={{ fontWeight: 400 }}>Affiché sur votre fiche et repris par votre orbe, seulement si vous l’écrivez.</span></label>
          <label style={etiquette}><span>Mon site {facultatif()}</span><input className="champ" type="url" inputMode="url" maxLength={200} placeholder="https://" {...champ('site')} /></label>
          <fieldset style={{ border: 0, margin: 0, padding: 0, display: 'grid', gap: 8 }}>
            <legend style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Autres liens <span style={{ fontWeight: 400, color: '#55555A' }}>(Instagram, portfolio… 4 au plus)</span></legend>
            {liens.map((x, k) => <div key={k} className="prest-ligne">
              <input className="champ" type="url" inputMode="url" aria-label={'Lien ' + (k + 1)} placeholder="https://" maxLength={200} value={x} onChange={e => setP({ ...p, liens: liens.map((y, i) => i === k ? e.target.value : y) })} />
              <button type="button" className="opt" aria-label={'Retirer le lien ' + (k + 1)} onClick={() => setP({ ...p, liens: liens.filter((_, i) => i !== k) })}>×</button>
            </div>)}
            {liens.length < 4 && <button type="button" className="opt" style={{ justifySelf: 'start' }} onClick={() => setP({ ...p, liens: [...liens, ''] })}>+ Ajouter un lien</button>}
          </fieldset>
          <label style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: 16, borderRadius: 14, background: '#fff', border: '1px solid #E2E2DE', fontSize: 17, lineHeight: 1.45, cursor: 'pointer' }}>
            <input type="checkbox" checked={!!p.visible} onChange={e => setP({ ...p, visible: e.target.checked })} style={{ width: 22, height: 22, marginTop: 2, accentColor: '#0B0B0C', flex: 'none' }} />
            <span><b style={{ fontWeight: 600 }}>Apparaître dans le Réseau.</b> Votre photo, votre nom, ce que vous faites et proposez, votre zone, vos mots et vos liens. Jamais votre adresse e-mail.</span>
          </label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="bouton noir" type="submit" disabled={envoi}>{envoi ? 'Enregistrement…' : 'Enregistrer'}</button>
            <Lien className="bouton" href="/reseau">Voir le Réseau</Lien>
          </div>
          <p role="status" aria-live="polite" style={{ margin: 0, minHeight: 24, fontSize: 16, fontWeight: 600 }}>{msg}</p>
        </form>
        <div aria-label="Aperçu de mon profil" role="region" style={{ position: 'sticky', top: 120 }}>
          <p className="surtitre">Aperçu{p.visible ? '' : ' · caché'}</p>
          <div style={{ maxWidth: 300 }}><CarteReseau c={{ href: p.ref && p.visible ? '/reseau/' + p.ref : '/reseau', nom: p.nom || 'Votre nom', photo: session?.image || undefined, alt: 'Ma photo',
            etiquette: [domaine(p.domaine)?.label, p.metier].filter(Boolean).join(' · ') || 'Votre domaine · votre métier',
            musiques, fiche: { nom: p.nom || 'Vous', metier: p.metier, ville: p.ville, zone: p.zone, langues: p.langues, tarif: p.tarif, bio: p.bio, prestations: prest.filter(x => x.titre.trim()) } }} /></div>
          <p className="profil-note" style={{ maxWidth: 300, marginTop: 12 }}>Touchez l’orbe de la carte : c’est ce que votre assistant saura répondre avec votre fiche.</p>
        </div>
      </div>

      <section aria-labelledby="titre-musique" className="profil-bloc">
        <h2 id="titre-musique">Ma musique</h2>
        <p className="profil-note">Vos morceaux, rangés par moment du Jour J. On les écoute au dos de votre carte (Play) et dans le dock du bas. Pour un DJ ou un musicien, c’est votre vitrine.</p>
        <ListeMorceaux musiques={musiques} setMusiques={setMusiques} modifiable vide="Aucun morceau pour l’instant." />
        <ChoisirMorceau ajoute={m => setMusiques([...musiques, m])} />
      </section>

      <MesDates dates={dates} setDates={setDates} />

      <section aria-labelledby="titre-demandes" className="profil-bloc">
        <h2 id="titre-demandes">Demandes reçues{nonLues ? ' · ' + nonLues + ' nouvelle' + (nonLues > 1 ? 's' : '') : ''}</h2>
        {demandes.length
          ? <ul className="demandes">{demandes.map(d => <li key={d.id} className={d.lue ? '' : 'nouvelle'}>
            <div className="demande-tete"><b>{d.de_nom || 'Quelqu’un'}</b><span>{new Date(d.cree_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</span></div>
            <p className="profil-note" style={{ margin: 0 }}>{[d.jour ? 'Le ' + new Date(d.jour + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '', d.lieu, d.invites ? d.invites + ' invités' : ''].filter(Boolean).join(' · ')}</p>
            <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{d.message}</p>
            {!d.de_email && d.de_nom === 'Compte supprimé' && <p className="profil-note" style={{ margin: 0 }}>Son auteur a supprimé son compte : son nom et son adresse ont été retirés, et son message a été nettoyé automatiquement. Ce nettoyage n’est pas garanti : le message peut encore permettre de le reconnaître. Elle sera effacée à la fin de sa durée de conservation.</p>}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {d.de_email && <a className="bouton noir" href={'mailto:' + d.de_email + '?subject=' + encodeURIComponent('Votre demande sur AIME')}>Répondre par e-mail</a>}
              {!d.lue && <button type="button" className="opt" onClick={async () => { await marquerLue(d.id); setDemandes(ds => ds.map(x => x.id === d.id ? { ...x, lue: true } : x)); }}>Marquer comme lue</button>}
            </div>
          </li>)}</ul>
          : <p className="profil-note">Aucune demande pour l’instant. Elles arrivent ici quand quelqu’un vous écrit depuis votre carte ou votre fiche.</p>}
      </section>

      <section aria-labelledby="titre-questions" className="profil-bloc">
        <h2 id="titre-questions">On a demandé à votre orbe</h2>
        <p className="profil-note">Les questions auxquelles votre fiche n’a pas su répondre. Complétez-la : votre orbe saura la prochaine fois.</p>
        {questions.length
          ? <ul className="questions">{questions.map((q, k) => <li key={k}>« {q.question} » <span>{new Date(q.cree_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</span></li>)}</ul>
          : <p className="profil-note">Rien pour l’instant.</p>}
      </section>
    </div>
  );
}
