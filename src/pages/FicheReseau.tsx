import { useEffect, useState, type FormEvent } from 'react';
import {Tete, DockBas, Pied } from '../charte/Charte';
import { Lien } from '../lib/router';
import data from '../lib/briques.json';
import { envoyerDemande, lireProfil, photoProfil, type Profil, type ProjetPublic } from '../lib/reseau';
import { CarteReseau, type Carte } from '../charte/CartePersonne';
import { EntrerBloc } from '../charte/EntrerBloc';
import { useSession } from '../lib/session';
import { useMeta } from '../lib/metamorphose';
import { dateLisible, lireDate } from '../../api/_orbe-local.mjs';
import { EXEMPLES, FICHES, UNION_EXEMPLE, domaine, exemple, type Exemple } from '../lib/reseau-exemples';

type Brique = { n: string; name: string; fam: string; does: string; w: string; b: string; c: string; cl: string };
const B = data.briques as unknown as Record<string, Brique>;
const G = data.grille as string[][];
type Role = 'voit' | 'fait' | 'partage';

/* La Grille 44 en petit : les briques du module s'allument, le Point Zéro au centre. */
export function MiniGrille({ allumees, label }: { allumees: Record<string, Role | true>; label: string }) {
  const n = Object.keys(allumees).length;
  return (
    <div role="img" aria-label={label + ' : ' + n + ' brique' + (n > 1 ? 's' : '') + ' allumée' + (n > 1 ? 's' : '') + ' sur 44.'} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 'clamp(3px, .5vw, 6px)', width: '100%', maxWidth: 520 }}>
      {G.flat().map((id, i) => {
        if (id === 'VIDE') return <span key={i} />;
        if (id === 'PZ') return <span key={i} title="Point Zéro : importer" style={{ aspectRatio: '1', borderRadius: 'clamp(4px, .8vw, 9px)', background: '#fff', boxShadow: 'inset 0 0 0 1px #DCDCD8', color: '#0B0B0C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="46%" height="46%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14" /></svg></span>;
        const b = B[id], on = !!allumees[id];
        return <span key={i} title={b?.name} style={{ aspectRatio: '1', borderRadius: 'clamp(4px, .8vw, 9px)', background: on ? b.c : '#ECECE8', display: 'flex', alignItems: 'flex-end', padding: 'clamp(2px, .4vw, 5px)', overflow: 'hidden', transition: 'background .4s ease' }}>
          <span className="mini-nom" style={{ fontSize: 'clamp(7px, .75vw, 10.5px)', lineHeight: 1.05, fontWeight: 600, color: on ? '#0B0B0C' : '#8A8A86', overflowWrap: 'anywhere' }}>{on ? b.name : b.n}</span>
        </span>;
      })}
    </div>
  );
}

function Module({ titre, colonnes, monde }: { titre: string; colonnes: [string, string[]][]; monde: 'w' | 'b' }) {
  const allumees: Record<string, true> = {};
  colonnes.forEach(([, ids]) => ids.forEach(id => { allumees[id] = true; }));
  const total = Object.keys(allumees).length;
  return (
    <section id="module" aria-labelledby="titre-module" className="section blanche" style={{ margin: '80px calc(-1 * var(--marge)) 0' }}>
      <p className="surtitre">{titre}</p>
      <h2 id="titre-module" className="titre" style={{ maxWidth: '20ch' }}>{total} brique{total > 1 ? 's' : ''} de la Grille 44</h2>
      <div style={{ marginTop: 48, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: '48px clamp(32px, 5vw, 80px)', alignItems: 'start' }}>
        <MiniGrille allumees={allumees} label="Son module dans la Grille 44" />
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 36 }}>
          {colonnes.map(([t, ids], i) => <li key={t}>
            <h3 style={{ margin: '0 0 14px', display: 'flex', alignItems: 'baseline', gap: 12, fontSize: 22, fontWeight: 600 }}><span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.12em', color: '#55555A' }}>{String(i + 1).padStart(2, '0')}</span>{t}</h3>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
              {ids.map(id => { const b = B[id]; return <li key={id} style={{ display: 'grid', gridTemplateColumns: '14px 1fr', gap: 12, alignItems: 'start', padding: '12px 14px', borderRadius: 14, background: b.cl, border: '1px solid rgba(11,11,12,.08)' }}>
                <span aria-hidden="true" style={{ width: 14, height: 14, marginTop: 4, borderRadius: 4, background: b.c, boxShadow: 'inset 0 0 0 1px rgba(11,11,12,.25)' }} />
                <span><b style={{ fontWeight: 600, fontSize: 17 }}>{b.name}</b><span style={{ color: '#55555A', fontSize: 13, fontWeight: 600, marginLeft: 8 }}>{b.fam} · {b.n}</span>
                  <span style={{ display: 'block', marginTop: 2, fontSize: 15.5, lineHeight: 1.45, color: '#3A3A3F' }}>{b.does}. <span style={{ color: '#0B0B0C' }}>Ici : {b[monde]}.</span></span></span>
              </li>; })}
            </ul>
          </li>)}
        </ol>
      </div>
    </section>
  );
}

/* Le parcours d'un vrai profil : son texte, ses domaines, sa phrase. */
function Parcours({ e }: { e: Exemple }) {
  return (
    <section aria-labelledby="titre-parcours" style={{ marginTop: 'clamp(64px, 8vw, 120px)' }}>
      <div className="grille-auto" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: '32px 64px' }}>
        <div><p className="surtitre">Parcours</p><h2 id="titre-parcours" className="titre">{e.titre}</h2></div>
        <div style={{ display: 'grid', gap: 16 }}>{e.paragraphes!.map((t, k) => <p key={k} className="texte">{t}</p>)}</div>
      </div>
      {e.points && <ul style={{ listStyle: 'none', margin: '56px 0 0', padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: 16 }}>
        {e.points.map(([t, d]) => <li key={t} style={{ padding: '22px 22px 24px', borderRadius: 20, background: '#fff', border: '1px solid #E2E2DE' }}><h3 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 600 }}>{t}</h3><p style={{ margin: 0, fontSize: 16, lineHeight: 1.55, color: '#3A3A3F' }}>{d}</p></li>)}
      </ul>}
      {e.citation && <figure style={{ margin: '24px 0 0', padding: 'clamp(28px, 4vw, 56px)', borderRadius: 24, background: '#0B0B0C', color: '#fff' }}>
        <blockquote style={{ margin: 0, fontSize: 'clamp(24px, 2.8vw, 40px)', lineHeight: 1.2, fontWeight: 600, letterSpacing: '-0.025em' }}>« {e.citation} »</blockquote>
        <figcaption style={{ marginTop: 22, fontSize: 13, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase', color: '#BDBDB8' }}>{e.nom}</figcaption>
      </figure>}
    </section>
  );
}
function FicheExemple({ e }: { e: Exemple }) {
  const i = EXEMPLES.indexOf(e), suivant = FICHES[(FICHES.indexOf(e) + 1) % FICHES.length];
  const d = domaine(e.domaine)!, pr = e.elle ? 'elle' : 'il', Pr = e.elle ? 'Elle' : 'Il';
  const qu = 'Ce qu’' + pr + ' ';
  useEffect(() => { document.title = 'AIME — Réseau · ' + e.nom; }, [e]);
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 'clamp(28px, 4vw, 64px)', alignItems: 'end' }}>
        <div style={{ aspectRatio: '4 / 5', borderRadius: 14, overflow: 'hidden', background: '#E4E4E1', maxHeight: '78vh' }}>
          <img src={e.photo} alt={e.alt} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 28%' }} />
        </div>
        <div>
          <p className="surtitre">{d.label} · {e.famille}{e.vrai ? '' : ' · ' + String(i + 1).padStart(2, '0') + ' / ' + EXEMPLES.length}</p>
          <h1 className="titre" style={{ fontSize: 'clamp(48px, 7vw, 112px)', lineHeight: .9 }}>{e.nom}</h1>
          <p className="chapeau">{e.titre || e.texte}</p>
          <dl style={{ margin: '36px 0 0', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '12px 24px', fontSize: 17 }}>
            {!e.vrai && <><dt style={{ fontWeight: 600 }}>Profil</dt><dd style={{ margin: 0 }}><span className="bientot" style={{ background: '#fff', color: '#0B0B0C', border: '1px solid #0B0B0C' }}>Exemple</span> <span style={{ color: '#3A3A3F' }}>ce que verra {e.nom.toLowerCase()} dans AIME</span></dd></>}
            <dt style={{ fontWeight: 600 }}>Domaine</dt><dd style={{ margin: 0 }}>{d.label} · {e.famille}</dd>
            {e.avec.length > 0 && <><dt style={{ fontWeight: 600 }}>Travaille avec</dt><dd style={{ margin: 0 }}>{e.domaine === 'mariage' ? 'Les mariés · ' : ''}{e.avec.map((s, k) => { const x = exemple(s)!; return <span key={s}>{k > 0 && ' · '}<Lien href={'/reseau/' + s}>{x.nom}</Lien></span>; })}</dd></>}
            {e.domaine === 'mariage' && <><dt style={{ fontWeight: 600 }}>Ses unions</dt><dd style={{ margin: 0 }}>{e.union ? <>{e.elle ? 'Créditée' : 'Crédité'} dans <b style={{ fontWeight: 600 }}>{UNION_EXEMPLE}</b> · {e.union}</> : <span style={{ color: '#55555A' }}>Pas encore {e.elle ? 'créditée' : 'crédité'} dans une union</span>}</dd></>}
          </dl>
          <div style={{ marginTop: 32, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a className="bouton noir" href="#module">Voir son module</a>
            {!e.vrai && <Lien className="bouton" href={'/point-zero?q=' + encodeURIComponent(e.texte)}>Commencer au Point Zéro</Lien>}
          </div>
        </div>
      </div>
      {e.paragraphes && <Parcours e={e} />}
      <Module titre={'Son module · ' + Pr + ' voit, ' + pr + ' fait, ' + pr + ' partage'} monde={e.domaine === 'broderie' ? 'b' : 'w'}
        colonnes={[[qu + 'voit', e.voit], [qu + 'fait', e.fait], [qu + 'partage', e.partage]]} />
      <nav aria-label="Profil suivant" style={{ marginTop: 64, display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <Lien href="/reseau" style={{ fontSize: 17, fontWeight: 600 }}>Tout le Réseau</Lien>
        <Lien href={'/reseau/' + suivant.slug} style={{ display: 'flex', alignItems: 'center', gap: 16, textDecoration: 'none', color: 'inherit' }}>
          <span style={{ textAlign: 'right' }}><span style={{ display: 'block', fontSize: 13, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: '#55555A' }}>Personne suivante</span><span style={{ fontSize: 'clamp(24px, 3vw, 40px)', fontWeight: 600, letterSpacing: '-0.03em' }}>{suivant.nom}</span></span>
          <img src={suivant.photo} alt="" style={{ width: 72, height: 90, objectFit: 'cover', borderRadius: 8 }} />
        </Lien>
      </nav>
    </>
  );
}

/* Écrire à la personne depuis sa fiche : date, lieu, invités, message. Elle reçoit la demande dans son espace, avec mon nom et mon e-mail. */
function Demander({ p, dateCherchee }: { p: Profil; dateCherchee: string | null }) {
  const session = useSession();
  const [etat, setEtat] = useState<{ envoi?: boolean; ok?: boolean; raison?: string }>({});
  const prenom = p.nom.split(' ')[0];
  const envoyer = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    setEtat({ envoi: true });
    const r = await envoyerDemande(p.ref!, { jour: String(f.get('jour') || ''), lieu: String(f.get('lieu') || ''), invites: String(f.get('invites') || ''), message: String(f.get('message') || '') });
    setEtat(r.ok ? { ok: true, raison: 'Demande envoyée : ' + prenom + ' la retrouve dans son espace et vous répond par e-mail.' } : { ok: false, raison: r.raison || 'Envoi impossible.' });
  };
  return (
    <section id="demande" aria-labelledby="titre-demande" className="section blanche" style={{ margin: '80px calc(-1 * var(--marge)) 0' }}>
      <p className="surtitre">Demande</p>
      <h2 id="titre-demande" className="titre" style={{ maxWidth: '20ch' }}>Écrire à {prenom}</h2>
      {!session
        ? <div style={{ marginTop: 24, maxWidth: 520 }}><p className="chapeau" style={{ marginTop: 0 }}>Entrez dans AIME pour envoyer une demande : {prenom} pourra vous répondre, sans que votre adresse soit publique.</p><EntrerBloc retour={'/reseau/' + p.ref} /></div>
        : etat.ok ? <p className="chapeau" role="status">{etat.raison}</p>
        : <form onSubmit={envoyer} style={{ marginTop: 32, display: 'grid', gap: 16, maxWidth: 620 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            <label className="etiquette-champ">Date<input className="champ" type="date" name="jour" defaultValue={dateCherchee || ''} /></label>
            <label className="etiquette-champ">Lieu<input className="champ" name="lieu" maxLength={120} placeholder="Ville, domaine…" /></label>
            <label className="etiquette-champ">Invités<input className="champ" name="invites" type="number" min={1} max={99999} inputMode="numeric" /></label>
          </div>
          <label className="etiquette-champ">Votre message<textarea className="champ" name="message" required minLength={5} maxLength={1000} rows={5} style={{ height: 'auto', padding: 14, lineHeight: 1.5 }} placeholder={'Bonjour ' + prenom + ', …'} /></label>
          <p className="profil-note">{prenom} verra votre nom et votre adresse e-mail ({session.email}) pour vous répondre.</p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="bouton noir" type="submit" disabled={etat.envoi}>{etat.envoi ? 'Envoi…' : 'Envoyer ma demande'}</button>
            <p role="status" aria-live="polite" style={{ margin: 0, fontWeight: 600, color: '#A3122A' }}>{etat.ok === false ? etat.raison : ''}</p>
          </div>
        </form>}
    </section>
  );
}

function FicheProfil({ refPublique }: { refPublique: string }) {
  const [meta] = useMeta();
  const date = lireDate(meta.date);
  const [p, setP] = useState<Profil | null | undefined>(undefined);
  const [projets, setProjets] = useState<ProjetPublic[]>([]);
  useEffect(() => { lireProfil(refPublique, date).then(r => { setP(r.ok ? r.profil || null : null); setProjets(r.projets || []); if (r.profil) document.title = 'AIME — Réseau · ' + r.profil.nom; }); }, [refPublique, date]);
  if (p === undefined) return <p style={{ fontSize: 18 }}>Chargement…</p>;
  if (p === null) return <><h1 className="titre">Profil introuvable</h1><p className="chapeau">Ce profil n’existe pas, ou la personne a choisi de ne plus apparaître. <Lien href="/reseau">Retour au Réseau</Lien></p></>;
  const d = domaine(p.domaine);
  const briques = [...new Set(projets.flatMap(x => x.briques))];
  const carte: Carte = { href: '/reseau/' + p.ref, nom: p.nom, etiquette: [d?.label, p.metier].filter(Boolean).join(' · '), ref: p.ref, photo: p.photo ? photoProfil(p.ref!) : undefined, alt: 'Photo de ' + p.nom, etat: p.etat || null, date };
  const prest = p.prestations || [];
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 'clamp(28px, 4vw, 64px)', alignItems: 'end' }}>
        <div style={{ maxWidth: 460 }}><CarteReseau c={carte} /></div>
        <div>
          <p className="surtitre">{[d?.label, p.metier, p.ville].filter(Boolean).join(' · ')}</p>
          <h1 className="titre" style={{ fontSize: 'clamp(48px, 7vw, 112px)', lineHeight: .9 }}>{p.nom}</h1>
          {p.bio && <p className="chapeau" style={{ whiteSpace: 'pre-line' }}>{p.bio}</p>}
          {p.etat && date && <p className={'pastille-fiche ' + p.etat}>{{ libre: 'Libre', option: 'En option', prise: 'Pas libre' }[p.etat]} le {dateLisible(date)}</p>}
          <dl className="fiche-faits">
            {p.zone && <><dt>Intervient</dt><dd>{p.zone}</dd></>}
            {p.langues && <><dt>Langues</dt><dd>{p.langues}</dd></>}
            {p.tarif && <><dt>Tarif</dt><dd>{p.tarif}</dd></>}
          </dl>
          {(p.site || (p.liens || []).length > 0) && <p style={{ marginTop: 24, fontSize: 18, fontWeight: 600, display: 'flex', gap: '8px 20px', flexWrap: 'wrap' }}>{[p.site, ...(p.liens || [])].filter(Boolean).map(u => <a key={u} href={u} target="_blank" rel="noopener nofollow ugc">{u!.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}<span className="sr-only"> (nouvel onglet)</span></a>)}</p>}
          <div style={{ marginTop: 32, display: 'flex', gap: 10, flexWrap: 'wrap' }}><a className="bouton noir" href="#demande">Écrire à {p.nom.split(' ')[0]}</a>{projets.length > 0 && <a className="bouton" href="#module">Voir son module</a>}</div>
        </div>
      </div>
      {prest.length > 0 && <section aria-labelledby="titre-prest" style={{ marginTop: 'clamp(64px, 8vw, 120px)' }}>
        <p className="surtitre">Prestations</p><h2 id="titre-prest" className="titre">Ce que {p.nom.split(' ')[0]} propose</h2>
        <ul className="fiche-prest">{prest.map(x => <li key={x.titre}><b>{x.titre}</b>{x.texte && <span>{x.texte}</span>}</li>)}</ul>
      </section>}
      {briques.length
        ? <Module titre={'Son module · ' + projets.length + ' projet' + (projets.length > 1 ? 's' : '') + ' public' + (projets.length > 1 ? 's' : '') + ' : ' + projets.slice(0, 3).map(x => x.titre).join(', ')} monde={p.domaine === 'broderie' ? 'b' : 'w'} colonnes={[['Ses briques', briques]]} />
        : <section className="section blanche" style={{ margin: '80px calc(-1 * var(--marge)) 0' }}><p className="surtitre">Son module</p><h2 className="titre" style={{ maxWidth: '22ch' }}>Il s’allumera avec ses projets publics.</h2><div style={{ marginTop: 40 }}><MiniGrille allumees={{}} label="Son module dans la Grille 44" /></div></section>}
      <Demander p={p} dateCherchee={date} />
    </>
  );
}

/* La page derrière chaque carte du Réseau : /reseau/<exemple> ou /reseau/<référence publique>. */
export default function FicheReseau({ cle }: { cle: string }) {
  const e = exemple(cle);
  return (
    <>
      <a className="lien-evitement" href="#contenu">Aller au contenu</a>
      <Tete courant="/reseau" />
      <main id="contenu" style={{ padding: '32px var(--marge) 140px' }}>
        <nav aria-label="Fil d’Ariane" style={{ marginBottom: 32, fontSize: 15, fontWeight: 600 }}><Lien href="/reseau">Réseau</Lien> <span aria-hidden="true" style={{ color: '#8A8A86' }}>›</span> <span aria-current="page">{e ? e.nom : 'Profil'}</span></nav>
        {e ? <FicheExemple e={e} /> : /^[a-f0-9]{12}$/.test(cle) ? <FicheProfil refPublique={cle} /> : <><h1 className="titre">Profil introuvable</h1><p className="chapeau"><Lien href="/reseau">Retour au Réseau</Lien></p></>}
      </main>
      <Pied />
      <DockBas />
    </>
  );
}
