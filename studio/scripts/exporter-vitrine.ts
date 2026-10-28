/* Écrit ../src/lib/oiseaux-botaniques.json (la page Brode Way du site) à partir des vrais dessins des éditions.
   Usage (depuis studio/) : npx esbuild scripts/exporter-vitrine.ts --bundle --platform=node --format=esm --outfile=/tmp/vitrine.mjs && node /tmp/vitrine.mjs */
import { writeFileSync } from "node:fs";
import { vitrineBotanique } from "../src/lib/editions/vitrine";
const sortie = new URL("../../src/lib/oiseaux-botaniques.json", import.meta.url.replace(/\/[^/]*$/, "/") ).pathname;
writeFileSync(process.argv[2] || sortie, JSON.stringify(vitrineBotanique()));
console.log("vitrine écrite :", process.argv[2] || sortie);
