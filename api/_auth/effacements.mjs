// AIME · les fichiers à effacer du stockage (Vercel Blob), avec reprise.
// Quand un compte est supprimé, ses fichiers audio sont d'abord INSCRITS dans la file « effacements_fichiers »,
// dans la même transaction que l'effacement de ses données : rien ne peut être oublié, même si le stockage ne répond pas.
// Puis la file est vidée : chaque fichier effacé sort de la file ; un échec y reste, avec son erreur, et sera repris
// (après la suppression suivante, et chaque jour par /api/maintenance). Un fichier déjà absent compte comme effacé.
// genre « url » : un fichier précis ; genre « prefixe » : tout un dossier (musique/<compte>/), y compris les envois jamais rattachés à un morceau.

/* La table vient de la migration db/migrations/2026-10-28-01-effacements-fichiers.sql, appliquée avant le déploiement.
   Absente : on refuse d'inscrire (et donc de supprimer le compte) plutôt que de perdre la trace d'un fichier. */
export class FileAbsente extends Error { constructor() { super('file d\'effacement absente : migration 2026-10-28-01 à appliquer'); this.code = 'EFFACEMENTS_ABSENTS'; } }
async function presente(db) { return !!(await db.query("select to_regclass('public.effacements_fichiers') as t")).rows[0].t; }

/* le stockage : Vercel Blob en vrai, injectable pour les tests */
let stockage = null;
export function _stockage(s) { stockage = s; }
async function blob() {
  if (stockage) return stockage;
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  const { del, list } = await import('@vercel/blob');
  return { del, list };
}

/** Inscrit les fichiers d'un compte dans la file (dans la transaction de l'appelant). */
export async function inscrire(c, { urls = [], prefixes = [] }) {
  if (!(await presente(c))) throw new FileAbsente();
  for (const u of [...new Set(urls)]) await c.query(`insert into effacements_fichiers (genre, cible) values ('url', $1) on conflict (genre, cible) do nothing`, [u]);
  for (const p of [...new Set(prefixes)]) await c.query(`insert into effacements_fichiers (genre, cible) values ('prefixe', $1) on conflict (genre, cible) do nothing`, [p]);
}

/** Vide la file, au plus `max` entrées. Renvoie { effaces, echecs, restants }. Sans stockage configuré : rien n'est tenté, tout reste. */
export async function reprendre(db, { max = 50 } = {}) {
  const s = await blob();
  if (!(await presente(db))) return { effaces: 0, echecs: 0, restants: 0, bloques: 0, table: false };
  const rest = async () => (await db.query('select count(*)::int as n from effacements_fichiers')).rows[0].n;
  const bloques = async () => (await db.query('select count(*)::int as n from effacements_fichiers where essais >= 5')).rows[0].n;   /* à surveiller : 5 échecs ou plus */
  if (!s) return { effaces: 0, echecs: 0, restants: await rest(), bloques: await bloques(), stockage: false };
  const { rows } = await db.query('select id, genre, cible from effacements_fichiers order by essais, id limit $1', [max]);
  let effaces = 0, echecs = 0;
  for (const r of rows) {
    try {
      if (r.genre === 'url') await s.del(r.cible).catch(e => { if (!/not.?found/i.test(String(e && (e.name || e.message)))) throw e; });
      else {
        let curseur;
        do {
          const page = await s.list({ prefix: r.cible, cursor: curseur, limit: 1000 });
          const urls = (page.blobs || []).map(b => b.url);
          if (urls.length) await s.del(urls);
          curseur = page.hasMore ? page.cursor : undefined;
        } while (curseur);
      }
      await db.query('delete from effacements_fichiers where id = $1', [r.id]);
      effaces++;
    } catch (e) {
      await db.query('update effacements_fichiers set essais = essais + 1, erreur = $2, essai_le = now() where id = $1', [r.id, String((e && e.message) || e).slice(0, 300)]);
      echecs++;
    }
  }
  return { effaces, echecs, restants: await rest(), bloques: await bloques() };
}
