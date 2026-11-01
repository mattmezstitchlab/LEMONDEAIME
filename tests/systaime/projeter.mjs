// Écrit la version PUBLIQUE expurgée (src/systaime/publique.json) à partir du manifeste interne. Rien d’autre n’est servi au public.
//   node tests/systaime/projeter.mjs        → réécrit le fichier ; le test vérifie qu’il est identique à la projection
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { projeter } from '../../api/_systaime.mjs';
const R = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const m = JSON.parse(readFileSync(join(R, 'docs/systaime/manifeste.interne.json'), 'utf8'));
writeFileSync(join(R, 'src/systaime/publique.json'), JSON.stringify(projeter(m), null, 1) + '\n');
console.log('src/systaime/publique.json écrit');
