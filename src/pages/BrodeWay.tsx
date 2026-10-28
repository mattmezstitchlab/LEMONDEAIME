import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Tete, Pied, Verbe } from '../charte/Charte';
import { Lien } from '../lib/router';
import { useConfort } from '../lib/confort';
import MESANGE_BRUT from '../lib/mesange.json';
import DMC from '../lib/dmc.json';

/* Brode Way (/) : la page de l'atelier de point de croix. Toutes les images sont des captures de l'atelier réel (/studio/atelier),
   ouvert sur « La mésange du jardin », l'un des 24 patrons des éditions. Le motif qui se brode en tête de page est ce même patron,
   lu case par case (src/lib/mesange.json), brodé fil par fil comme on le fait à la main. */

type Fil = [string, string, string];   /* code, nom, couleur */
const NUANCIER = DMC as Fil[];
const MESANGE = MESANGE_BRUT as unknown as { nom: string; w: number; h: number; fils: [string, string][]; lignes: string[] };
const NOMS = new Map(NUANCIER.map(([c, n]) => [c, n]));
const IMG = (n: string) => '/media/brodeway/' + n + '.webp';
const ATELIER = '/studio/atelier';
const PATRONS = '/studio/boutique';
const nombre = (n: number) => n.toLocaleString('fr-FR');

export function VerbesBrodeWay({ actif }: { actif?: 'parcours' | 'apropos' }) {
  return <>
    <Verbe href={ATELIER}>L’atelier</Verbe>
    <Verbe href={PATRONS}>Les patrons</Verbe>
    <Verbe href="/#parcours" actif={actif === 'parcours'}>Comment ça marche</Verbe>
    <Verbe href="/a-propos" actif={actif === 'apropos'}>À propos</Verbe>
  </>;
}

/* ——— le motif qui se brode : la mésange, fil par fil ——— */
type Croix = { x: number; y: number };
function fonce(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16), f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return 'rgb(' + f(n >> 16) + ',' + f((n >> 8) & 255) + ',' + f(n & 255) + ')';
}
function Broderie({ reduit }: { reduit: boolean }) {
  const toile = useRef<HTMLCanvasElement>(null);
  const { w, h, fils, lignes } = MESANGE;
  /* les croix de chaque fil, dans l'ordre où on les brode : un fil à la fois, du plus présent au plus discret, rang par rang en serpentin */
  const ordre = useMemo(() => {
    const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const par: Croix[][] = fils.map(() => []);
    lignes.forEach((l, y) => { const xs = [...l].map((_, i) => (y % 2 ? l.length - 1 - i : i)); for (const x of xs) { const k = A.indexOf(l[x]); if (k >= 0) par[k].push({ x, y }); } });
    return par.map((croix, k) => ({ code: fils[k][0], hex: fils[k][1] || '#888888', croix })).filter(f => f.croix.length).sort((a, b) => b.croix.length - a.croix.length);
  }, [fils, lignes]);
  const total = useMemo(() => ordre.reduce((s, f) => s + f.croix.length, 0), [ordre]);
  const [etat, setEtat] = useState({ fil: 0, faites: reduit ? total : 0 });
  const [tour, setTour] = useState(0);

  useEffect(() => {
    const c = toile.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let pas = 0;
    const regler = () => {
      const largeur = c.clientWidth; pas = largeur / w;
      c.width = Math.round(largeur * dpr); c.height = Math.round(pas * h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const croix = (x: number, y: number, hex: string) => {
      const m = pas * 0.16, x0 = x * pas + m, y0 = y * pas + m, x1 = (x + 1) * pas - m, y1 = (y + 1) * pas - m;
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(1, pas * 0.3);
      ctx.strokeStyle = fonce(hex, 0.86);
      ctx.beginPath(); ctx.moveTo(x0, y1); ctx.lineTo(x1, y0); ctx.stroke();   /* le premier passage, dessous */
      ctx.strokeStyle = hex;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();   /* le second, dessus */
    };
    const tout = (jusqua: number) => {
      ctx.clearRect(0, 0, c.width, c.height);
      let n = 0;
      for (const f of ordre) for (const p of f.croix) { if (n++ >= jusqua) return; croix(p.x, p.y, f.hex); }
    };
    regler();
    let fait = reduit ? total : 0, raf = 0, fin = false;
    tout(fait);
    const dessiner = () => {
      if (fin) return;
      const avant = fait;
      fait = Math.min(total, fait + Math.max(18, Math.round(total / 420)));   /* environ sept secondes en tout */
      let n = 0;
      for (const f of ordre) for (const p of f.croix) { if (n >= avant && n < fait) croix(p.x, p.y, f.hex); n++; }
      let cumul = 0, k = 0; for (; k < ordre.length; k++) { cumul += ordre[k].croix.length; if (fait <= cumul) break; }
      setEtat({ fil: Math.min(k, ordre.length - 1), faites: fait });
      if (fait < total) raf = requestAnimationFrame(dessiner);
    };
    if (!reduit) raf = requestAnimationFrame(dessiner); else setEtat({ fil: ordre.length - 1, faites: total });
    const taille = () => { regler(); tout(fait); };
    window.addEventListener('resize', taille);
    return () => { fin = true; cancelAnimationFrame(raf); window.removeEventListener('resize', taille); };
  }, [ordre, total, reduit, tour, w, h]);

  const f = ordre[etat.fil];
  const fini = etat.faites >= total;
  const part = etat.faites / total;
  return (
    <figure className="bw-broderie">
      <div className="bw-toile" style={{ aspectRatio: w + ' / ' + h }}>
        <canvas ref={toile} role="img" aria-label={'La mésange du jardin, patron de ' + w + ' × ' + h + ' points en ' + ordre.length + ' fils DMC, brodée croix par croix'} />
      </div>
      <figcaption className="bw-fil" aria-live="off">
        <span className="bw-bobine" aria-hidden="true">
          <svg className="bw-anneau" viewBox="0 0 36 36"><circle cx="18" cy="18" r="15" /><circle cx="18" cy="18" r="15" style={{ strokeDasharray: (part * 94.25).toFixed(2) + ' 94.25' }} /></svg>
          {!fini && <span className="bw-pastille" style={{ background: f.hex }} />}
        </span>
        <span className="bw-fil-texte">
          {fini
            ? <><b>La mésange du jardin</b><span>{w} × {h} points, {ordre.length} fils, {nombre(total)} croix</span></>
            : <><b>DMC {f.code}</b><span>{NOMS.get(f.code) || ''}, {nombre(etat.faites)} croix sur {nombre(total)}</span></>}
        </span>
        {fini && !reduit && <button type="button" className="bw-rebroder" onClick={() => setTour(t => t + 1)}>Rebroder</button>}
      </figcaption>
    </figure>
  );
}

/* ——— un écran de l'atelier ——— */
function Ecran({ src, alt, prioritaire }: { src: string; alt: string; prioritaire?: boolean }) {
  return <div className="bw-ecran"><img src={src} alt={alt} width={2000} height={1250} loading={prioritaire ? 'eager' : 'lazy'} decoding="async" /></div>;
}

/* ——— trois lectures de la même grille (onglets) ——— */
const LECTURES = [
  { id: 'realiste', nom: 'Réaliste', texte: 'Les croix comme sur la toile, avec le relief du fil.', alt: 'L’atelier en lecture réaliste : la mésange brodée, croix par croix, vue de près' },
  { id: 'a-plat', nom: 'À plat', texte: 'Les couleurs pleines, pour voir le dessin d’un coup d’œil.', alt: 'L’atelier en lecture à plat : la mésange en aplats de couleur' },
  { id: 'patron', nom: 'Patron', texte: 'Un symbole par fil, en noir et blanc, comme sur un patron imprimé.', alt: 'L’atelier en lecture patron : chaque case porte le symbole de son fil' },
];
function Lectures() {
  const [k, setK] = useState(0);
  const onglets = useRef<(HTMLButtonElement | null)[]>([]);
  const touche = (e: KeyboardEvent) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d) return;
    e.preventDefault(); const n = (k + d + LECTURES.length) % LECTURES.length; setK(n); onglets.current[n]?.focus();
  };
  return (
    <div className="bw-lectures">
      <div role="tablist" aria-label="Lectures de la grille" className="bw-onglets" onKeyDown={touche}>
        {LECTURES.map((l, n) => <button key={l.id} ref={el => { onglets.current[n] = el; }} type="button" role="tab" id={'onglet-' + l.id} aria-controls="panneau-lecture" aria-selected={n === k} tabIndex={n === k ? 0 : -1} onClick={() => setK(n)}>
          <b>{l.nom}</b><span>{l.texte}</span>
        </button>)}
      </div>
      <div id="panneau-lecture" role="tabpanel" aria-labelledby={'onglet-' + LECTURES[k].id} className="bw-lecture-ecran">
        {LECTURES.map((l, n) => <img key={l.id} src={IMG('lecture-' + l.id)} alt={n === k ? l.alt : ''} aria-hidden={n !== k} loading="lazy" style={{ opacity: n === k ? 1 : 0 }} />)}
      </div>
    </div>
  );
}

/* ——— le parcours : une étape par écran ; sur grand écran, l'image reste en place et change avec l'étape lue ——— */
const ETAPES = [
  { id: 'commencer', titre: 'Commencer', img: 'ouvrages', texte: 'Ouvrez un patron des éditions, ou déposez le vôtre : une image, un PDF, un fichier .json ou .oxs. Un patron en plusieurs pages PDF se recompose en une seule grille.', alt: 'Mes ouvrages : déposer un fichier, la mésange du jardin, un nouveau motif' },
  { id: 'dessiner', titre: 'Dessiner', img: 'dessiner', texte: 'Croix, gomme, remplissage, pipette, sélection : les outils tiennent dans le dock du haut, et treize autres attendent juste à côté.', alt: 'Le mode Dessiner : les outils dans le dock du haut, au-dessus de la mésange' },
  { id: 'fils', titre: 'Préparer les fils', img: 'nuancier', texte: 'Le nuancier compte les 489 fils DMC. Ceux du motif s’alignent dans le dock du bas, et se trient d’un geste : utilisés, en stock, manquants.', alt: 'Le nuancier DMC ouvert à droite, les fils du motif dans le dock du bas' },
  { id: 'broder', titre: 'Broder', img: 'broder', texte: 'Marquez les croix brodées sans toucher au patron, fil par fil si vous le voulez. Le parking garde vos aiguilles en attente, et le journal retient où vous en étiez.', alt: 'Le mode Broder : le panneau « Marquer sans modifier le patron », le parking et le journal' },
  { id: 'partager', titre: 'Partager', img: 'partager', texte: 'Invitez quelqu’un à regarder votre ouvrage en direct, depuis son appareil. La connexion est directe et chiffrée entre vos deux navigateurs, et vous gardez la main sur le patron.', alt: 'Le panneau Lecture partagée : présenter mon patron, rejoindre, créer une invitation' },
];
function Parcours() {
  const [actif, setActif] = useState(0);
  const refs = useRef<(HTMLLIElement | null)[]>([]);
  useEffect(() => {
    const io = new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting) setActif(Number((e.target as HTMLElement).dataset.n)); }, { rootMargin: '-45% 0px -45% 0px' });
    refs.current.forEach(el => el && io.observe(el));
    return () => io.disconnect();
  }, []);
  return (
    <div className="bw-parcours">
      <ol className="bw-etapes">
        {ETAPES.map((e, n) => <li key={e.id} ref={el => { refs.current[n] = el; }} data-n={n} aria-current={n === actif ? 'step' : undefined}>
          <span className="bw-num" aria-hidden="true">{n + 1}</span>
          <h3>{e.titre}</h3>
          <p>{e.texte}</p>
          <div className="bw-etape-ecran"><Ecran src={IMG(e.img)} alt={e.alt} /></div>
        </li>)}
      </ol>
      <div className="bw-colle" aria-hidden="true">
        <div className="bw-ecran">{ETAPES.map((e, n) => <img key={e.id} src={IMG(e.img)} alt="" loading="lazy" style={{ opacity: n === actif ? 1 : 0 }} />)}</div>
        <p className="bw-colle-legende">Étape {actif + 1} sur {ETAPES.length} : {ETAPES[actif].titre}</p>
      </div>
    </div>
  );
}

/* ——— le nuancier : les 489 fils, rangés par teinte ——— */
function teinte(hex: string) {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (d < 0.07) return [1000 + (1 - l) * 100, l];   /* les gris et les neutres, à la fin, du clair au foncé */
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360;
  return [Math.round(h / 12) * 12 + (1 - l), l];
}
function Nuancier() {
  const [seuls, setSeuls] = useState(false);
  const fils = useMemo(() => [...NUANCIER].sort((a, b) => teinte(a[2])[0] - teinte(b[2])[0]), []);
  const du = useMemo(() => new Set(MESANGE.fils.map(f => f[0])), []);
  return (
    <div className="bw-nuancier-bloc">
      <div className={'bw-nuancier' + (seuls ? ' filtre' : '')} role="img" aria-label={'Les ' + fils.length + ' fils DMC rangés par teinte' + (seuls ? ', les ' + du.size + ' fils de la mésange mis en avant' : '')}>
        {fils.map(([c, n, hex]) => <span key={c} title={'DMC ' + c + ' · ' + n} className={du.has(c) ? 'du-motif' : undefined} style={{ background: hex }} />)}
      </div>
      <div className="bw-nuancier-pied">
        <button type="button" className="bw-bascule" aria-pressed={seuls} onClick={() => setSeuls(s => !s)}>{seuls ? 'Montrer tout le nuancier' : 'Montrer les ' + du.size + ' fils de la mésange'}</button>
        <p>Couleurs indicatives, d’après craft-color-codes (MakeBead), licence CC BY 4.0. Vérifiez sur une carte de fils avant un achat important.</p>
      </div>
    </div>
  );
}

export default function BrodeWay() {
  const confort = useConfort();
  const reduit = confort.mouvement === 'reduit' || (typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  return (
    <div className="bw">
      <a className="lien-evitement" href="#contenu">Aller au contenu</a>
      <Tete courant="/" verbes={<VerbesBrodeWay />} />
      <main id="contenu">
        <section className="bw-ouverture" aria-labelledby="titre-brodeway">
          <div className="bw-ouverture-texte">
            <h1 id="titre-brodeway" className="bw-titre">Brode Way</h1>
            <p className="bw-chapeau">L’atelier de point de croix, dans le navigateur. Choisissez un patron ou dessinez le vôtre, préparez vos fils DMC, puis brodez en suivant la grille, croix par croix.</p>
            <div className="bw-actions">
              <Lien className="bouton noir bw-grand" href={ATELIER}>Ouvrir l’atelier</Lien>
              <Lien className="bouton bw-grand" href={PATRONS}>Voir les patrons</Lien>
            </div>
            <ul className="bw-faits">
              <li>Sans compte</li>
              <li>Vos ouvrages restent sur votre appareil</li>
              <li>Hors ligne une fois chargé</li>
            </ul>
          </div>
          <Broderie reduit={reduit} />
        </section>

        <section className="bw-section bw-papier" aria-labelledby="titre-atelier">
          <div className="bw-entete">
            <h2 id="titre-atelier" className="bw-h2">L’atelier, tel qu’il est</h2>
            <p className="bw-texte">Chaque image de cette page est une capture de l’atelier, ouvert sur La mésange du jardin, l’un des 24 patrons des éditions.</p>
          </div>
          <Ecran src={IMG('atelier')} alt="L’atelier ouvert sur la mésange du jardin : le dock du haut (Dessiner, Broder, Fils, Partager), la grille, le dock du bas (Réaliste, À plat, Patron, Symboles)" prioritaire />
        </section>

        <section className="bw-section" aria-labelledby="titre-lectures">
          <div className="bw-entete">
            <h2 id="titre-lectures" className="bw-h2">Trois façons de lire la même grille</h2>
            <p className="bw-texte">Passez d’une lecture à l’autre depuis le dock du bas, sans perdre votre place.</p>
          </div>
          <Lectures />
        </section>

        <section id="parcours" className="bw-section bw-papier" aria-labelledby="titre-parcours">
          <div className="bw-entete">
            <h2 id="titre-parcours" className="bw-h2">Du patron à la dernière croix</h2>
            <p className="bw-texte">Tout se passe sur la même grille, avec deux docks : en haut ce que vous faites, en bas ce que vous regardez.</p>
          </div>
          <Parcours />
        </section>

        <section id="nuancier" className="bw-section bw-sombre" aria-labelledby="titre-nuancier">
          <div className="bw-entete">
            <h2 id="titre-nuancier" className="bw-h2">{NUANCIER.length} fils DMC</h2>
            <p className="bw-texte">Tout le Mouliné Spécial, rangé par teinte. L’atelier cherche le fil le plus proche de chaque couleur, et vous dit ce qu’il vous manque.</p>
          </div>
          <Nuancier />
        </section>

        <section id="editions" className="bw-section" aria-labelledby="titre-editions">
          <div className="bw-editions">
            <div>
              <h2 id="titre-editions" className="bw-h2">Les éditions</h2>
              <p className="bw-texte">24 patrons originaux, dessinés case par case, en six collections. Chacun s’ouvre directement dans l’atelier.</p>
              <ul className="bw-collections">{['Félins', 'Oiseaux', 'Céleste', 'Objets & Maison', 'Monogrammes', 'Signature'].map(c => <li key={c}>{c}</li>)}</ul>
              <p className="bw-note">La vente n’est pas encore ouverte.</p>
              <Lien className="bouton noir bw-grand" href={PATRONS}>Voir les patrons</Lien>
            </div>
            <Ecran src={IMG('editions')} alt="Les éditions : le chat à la fenêtre, le rouge-gorge d’hiver, lune de minuit, la machine à écrire" />
          </div>
        </section>

        <section className="bw-section bw-papier" aria-labelledby="titre-avous">
          <div className="bw-entete">
            <h2 id="titre-avous" className="bw-h2">Votre ouvrage reste à vous</h2>
          </div>
          <div className="bw-trois">
            <div><h3>Sans compte</h3><p>Ouvrez l’atelier et commencez : rien à créer, rien à remplir.</p></div>
            <div><h3>Sur votre appareil</h3><p>Vos ouvrages sont enregistrés dans votre navigateur, et l’atelier fonctionne hors ligne une fois chargé.</p></div>
            <div><h3>Avec un compte AIME</h3><p>Si vous le voulez, vos ouvrages se rangent dans votre espace et vous suivent d’un appareil à l’autre.</p></div>
          </div>
        </section>

        <section className="bw-fin" aria-labelledby="titre-fin">
          <h2 id="titre-fin" className="sr-only">Commencer</h2>
          <Lien className="bw-fin-lien" href={ATELIER}>Ouvrir l’atelier</Lien>
          <p>La mésange vous attend, avec 23 autres patrons.</p>
        </section>
      </main>
      <Pied />
    </div>
  );
}
