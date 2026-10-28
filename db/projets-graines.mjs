/* Écrit la partie « graines » de la migration des projets à partir de DEFAUTS (api/_projets.mjs), pour qu'elles restent identiques.
   Usage : node db/projets-graines.mjs   (affiche le SQL ; tests/server/projets.test.mjs vérifie que la migration le contient) */
import { DEFAUTS } from '../api/_projets.mjs';
const q = s => "'" + String(s).replace(/'/g, "''") + "'";
export const graines = () => DEFAUTS.map(p => {
  const { slug, ordre, publie, ...data } = p;
  return `insert into projets (slug, data, publie, ordre) values (${q(slug)}, ${q(JSON.stringify(data))}::jsonb, ${publie}, ${ordre}) on conflict (slug) do nothing;`;
}).join('\n');
if (import.meta.url === 'file://' + process.argv[1]) console.log(graines());
