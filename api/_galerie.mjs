// La Galerie des Vivants (lot G1) : ce qu'on accepte d'une œuvre exposée, et le dépôt Postgres.
// Règles (doc « La Galerie des Vivants — audit et MVP », décisions de Matt du 29 octobre) :
//  - exposer est un geste explicite, réservé aux comptes AIME, avec deux attestations non précochées ;
//  - l'œuvre exposée est une COPIE figée : l'ouvrage privé n'est jamais lu par la galerie ; seuls des champs de motif sont gardés
//    (ni notes, ni photo, ni progression, ni stock, ni séances) ;
//  - un import tiers (PDF, OXS, « usage personnel ») ne peut pas être exposé ;
//  - autorisations toutes à faux (aucun droit de reproduction), auteur ≠ brodeuse (realisations vide) ;
//  - le public ne voit que les œuvres visibles, un pseudonyme, jamais d'e-mail ni d'identifiant de compte ;
//  - votes : une voix par compte et par œuvre, visibles par tous, jamais pour soi ;
//  - modération : signaler (tout le monde), masquer et démasquer (administration), retirer (l'auteur, à tout moment, votes effacés).

export const LIMITES = { cote: 500, contenu: 1_000_000, apercu: 160_000, titre: 120, pseudo: 40, description: 600, histoire: 1200, signalement: 300, liste: 60 };
export const AUTORISATIONS = Object.freeze({ edition_cartes: false, tirage: false, patron_vendu: false, broderie_commandee: false });
export const RAISONS_SIGNALEMENT = ['droits', 'contenu', 'autre'];
/* les champs d'un ouvrage (studio/src/lib/pattern.ts toObject) qu'une œuvre exposée garde ; tout le reste est privé */
export const CHAMPS_MOTIF = ['v', 'name', 'w', 'h', 'count', 'strands', 'cross', 'fwd', 'bwd', 'q0', 'q1', 'q2', 'q3', 'back', 'long', 'knots', 'palette', 'flossCodes', 'recette', 'composition', 'fabric', 'symbolMap', 'beadMap'];
/* jamais exposables : les imports de patrons tiers, les œuvres reprises de la galerie, les motifs de démonstration ;
   une création « originale » (dessin libre, photo convertie, rosace du moteur 5D) l'est, même marquée « usage personnel » par le moteur */
const TIERS = ['pdf', 'oxs', 'galerie', 'demo'];

const ligne = (v, n) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const texte = (v, n) => String(v ?? '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').replace(/\n{3,}/g, '\n\n').trim().slice(0, n);
export const idOk = v => /^[a-z0-9]{12}$/.test(String(v ?? ''));
export function nouvelId() { const a = 'abcdefghijklmnopqrstuvwxyz0123456789'; let s = ''; for (const b of crypto.getRandomValues(new Uint8Array(12))) s += a[b % 36]; return s; }

/** { oeuvre } ou { raison, code } — b : { titre, pseudo, description, histoire, contenu (JSON du studio), apercu (PNG en data URL), attestations: { auteur, public } } */
export function nettoyerExposition(b) {
  if (!b || typeof b !== 'object') return { raison: 'Exposition illisible.' };
  if (b.attestations?.auteur !== true || b.attestations?.public !== true)
    return { raison: 'Cochez les deux cases : vous êtes l’auteur de ce motif (ou avez le droit de le montrer), et vous acceptez qu’il soit visible par tous.' };
  const titre = ligne(b.titre, LIMITES.titre), pseudo = ligne(b.pseudo, LIMITES.pseudo);
  if (!titre) return { raison: 'Donnez un titre à votre œuvre.' };
  if (!pseudo) return { raison: 'Choisissez un pseudonyme d’artiste (votre e-mail n’est jamais montré).' };
  if (typeof b.contenu !== 'string' || !b.contenu) return { raison: 'Motif manquant.' };
  if (b.contenu.length > LIMITES.contenu) return { raison: 'Motif trop lourd pour la galerie (plus de 1 Mo).', code: 413 };
  let o; try { o = JSON.parse(b.contenu); } catch { return { raison: 'Motif illisible.' }; }
  if (!o || typeof o !== 'object' || Array.isArray(o)) return { raison: 'Motif illisible.' };
  const prov = o.provenance && typeof o.provenance === 'object' ? o.provenance : null;
  if (prov && (TIERS.includes(prov.kind) || (prov.personalOnly === true && prov.kind !== 'original')))
    return { raison: 'Ce motif vient d’un patron importé, d’une œuvre de la galerie ou d’une démonstration : il est pour votre usage personnel et ne peut pas être exposé.', code: 422 };
  const w = Math.trunc(Number(o.w)), h = Math.trunc(Number(o.h));
  if (!(w >= 1 && w <= LIMITES.cote && h >= 1 && h <= LIMITES.cote)) return { raison: `Grille trop grande pour la galerie (au plus ${LIMITES.cote} × ${LIMITES.cote}).` };
  if (!Array.isArray(o.cross) || o.cross.length !== w * h || !o.cross.every(n => Number.isInteger(n) && n >= -1 && n < 2000)) return { raison: 'Points du motif invalides.' };
  if (!Array.isArray(o.palette) || o.palette.length > 400 || !o.palette.every(n => Number.isInteger(n) && n >= 0 && n < 2000)) return { raison: 'Palette invalide.' };
  if (!o.cross.some(n => n >= 0)) return { raison: 'Le motif est vide : il n’y a encore aucun point à montrer.' };
  const motif = {}; for (const k of CHAMPS_MOTIF) if (o[k] !== undefined) motif[k] = o[k];
  motif.name = titre;
  const recette = typeof o.recette === 'string' && /^5D-\d{5}\.g\d{1,6}\.v\d+\.\d+$/.test(o.recette) ? o.recette : (o.recette && typeof o.recette.code === 'string' && /^5D-/.test(o.recette.code) ? o.recette.code.slice(0, 40) : null);
  const codes = Array.isArray(o.flossCodes) ? o.flossCodes : null;
  const fils = [...new Set(o.cross.filter(n => n >= 0))].slice(0, 200).map(i => String(codes ? codes[i] ?? i : i).slice(0, 12));
  const apercu = typeof b.apercu === 'string' && b.apercu.length <= LIMITES.apercu && /^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/=]+$/.test(b.apercu) ? b.apercu : null;
  if (!apercu) return { raison: 'Aperçu manquant ou trop lourd.' };
  return { oeuvre: { titre, pseudo, description: texte(b.description, LIMITES.description), histoire: texte(b.histoire, LIMITES.histoire), w, h, fils, recette, apercu, contenu: JSON.stringify(motif) } };
}

/* ce que le public voit d'une œuvre : jamais l'auteur (identifiant), jamais d'e-mail */
export function publique(r, moi) {
  return { id: r.id, titre: r.titre, pseudo: r.pseudo, description: r.description, histoire: r.histoire, w: r.w, h: r.h, fils: r.fils, recette: r.recette,
    apercu: r.apercu, votes: Number(r.votes || 0), autorisations: AUTORISATIONS, realisations: [], expose_le: r.cree_le,
    ...(moi ? { mienne: r.auteur === moi, jaiVote: !!r.jai_vote } : {}) };
}

/** Le dépôt Postgres (même contrat que le dépôt en mémoire des tests). */
export function depotPg(db) {
  const choisir = `select o.*, (select count(*) from votes_oeuvres v where v.oeuvre = o.id)::int as votes, exists(select 1 from votes_oeuvres v where v.oeuvre = o.id and v.compte = $1) as jai_vote from oeuvres_exposees o`;
  return {
    async liste({ moi = null, limite = LIMITES.liste, avant = null } = {}) {
      const r = await db.query(`${choisir} where o.statut = 'visible' ${avant ? 'and o.cree_le < $3' : ''} order by o.cree_le desc limit $2`, avant ? [moi, limite, avant] : [moi, limite]);
      return r.rows;
    },
    async fiche(id, moi = null) {
      const r = await db.query(`${choisir} where o.id = $2`, [moi, id]); return r.rows[0] || null;
    },
    async contenu(id) { const r = await db.query(`select contenu, titre, pseudo from oeuvres_exposees where id = $1 and statut = 'visible'`, [id]); return r.rows[0] || null; },
    async mesOeuvres(auteur) { const r = await db.query(`${choisir} where o.auteur = $1 and o.statut <> 'retiree' order by o.cree_le desc limit 200`, [auteur]); return r.rows; },
    async exposer(auteur, o) {
      const id = nouvelId();
      await db.query(`insert into oeuvres_exposees (id, auteur, pseudo, titre, description, histoire, w, h, fils, recette, apercu, contenu, autorisations)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13::jsonb)`, [id, auteur, o.pseudo, o.titre, o.description, o.histoire, o.w, o.h, JSON.stringify(o.fils), o.recette, o.apercu, o.contenu, JSON.stringify(AUTORISATIONS)]);
      return id;
    },
    /* retirer : seulement son œuvre ; ses votes partent avec (la copie aussi : rien ne reste exposé) */
    async retirer(auteur, id) {
      const r = await db.query(`update oeuvres_exposees set statut = 'retiree', retiree_le = now(), contenu = '', apercu = '' where id = $1 and auteur = $2 and statut <> 'retiree' returning id`, [id, auteur]);
      if (r.rowCount) await db.query('delete from votes_oeuvres where oeuvre = $1', [id]);
      return r.rowCount > 0;
    },
    async voter(compte, id, oui) {
      const o = await db.query(`select auteur from oeuvres_exposees where id = $1 and statut = 'visible'`, [id]);
      if (!o.rows[0]) return 'introuvable';
      if (o.rows[0].auteur === compte) return 'soi';
      if (oui) await db.query('insert into votes_oeuvres (oeuvre, compte) values ($1, $2) on conflict do nothing', [id, compte]);
      else await db.query('delete from votes_oeuvres where oeuvre = $1 and compte = $2', [id, compte]);
      const n = await db.query('select count(*)::int as n from votes_oeuvres where oeuvre = $1', [id]);
      return n.rows[0].n;
    },
    async signaler(id, empreinte, raison, mot) {
      const o = await db.query(`select 1 from oeuvres_exposees where id = $1 and statut = 'visible'`, [id]); if (!o.rowCount) return false;
      await db.query(`insert into signalements_oeuvres (oeuvre, empreinte, raison, texte) values ($1,$2,$3,$4) on conflict (oeuvre, empreinte) do nothing`, [id, empreinte, raison, mot]);
      return true;
    },
    async signalements() {
      const r = await db.query(`select s.oeuvre, o.titre, o.pseudo, o.statut, count(*)::int as n, array_agg(distinct s.raison) as raisons, max(s.quand) as dernier,
        array_remove(array_agg(nullif(s.texte, '')), null) as textes from signalements_oeuvres s join oeuvres_exposees o on o.id = s.oeuvre group by s.oeuvre, o.titre, o.pseudo, o.statut order by max(s.quand) desc limit 200`);
      return r.rows;
    },
    async masquer(id, oui, motif) {
      const r = await db.query(oui ? `update oeuvres_exposees set statut = 'masquee', masquee_le = now(), motif_masquage = $2 where id = $1 and statut = 'visible' returning id`
        : `update oeuvres_exposees set statut = 'visible', masquee_le = null, motif_masquage = '' where id = $1 and statut = 'masquee' returning id`, oui ? [id, motif] : [id]);
      return r.rowCount > 0;
    },
  };
}
