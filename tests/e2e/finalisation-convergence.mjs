/** Recette locale sans secrets ni base. npm run build, puis :
 * PLAYWRIGHT_MODULE=/chemin/vers/playwright/index.mjs node tests/e2e/finalisation-convergence.mjs
 * Chromium réel, API simulées (aucune preuve de fonctionnement serveur/connexion).
 * Les données, minutages et rendu WebGL du film restent les fichiers originaux.
 */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const dist = fileURLToPath(new URL('../../dist/', import.meta.url));
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.m4a': 'audio/mp4', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  const p = decodeURI(new URL(req.url, 'http://localhost').pathname);
  const file = p === '/studio' ? '/studio/index.html' : p.endsWith('/') ? p + 'index.html' : p;
  try { const b = await readFile(path.join(dist, file)); res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream'); res.end(b); }
  catch { if (!path.extname(p)) { res.setHeader('Content-Type', 'text/html'); res.end(await readFile(path.join(dist, p.startsWith('/studio/') ? 'studio/index.html' : 'index.html'))); } else { res.statusCode = 404; res.end(); } }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
let checks = 0;
const ok = (v, msg) => { assert.ok(v, msg); checks++; console.log('OK', msg); };
const pause = ms => new Promise(r => setTimeout(r, ms));
async function page(width = 1280) {
  const c = await browser.newContext({ viewport: { width, height: 844 }, isMobile: width < 700, hasTouch: width < 700, reducedMotion: 'reduce', serviceWorkers: 'block' });
  const p = await c.newPage();
  await p.route('**/api/**', r => r.fulfill({ json: r.request().url().includes('get-session') ? null : { ok: false } }));
  await p.addInitScript(() => {
    // Le GPU est logiciel dans ce banc : faible densité, viewport inchangé (pas une mesure de performance).
    Object.defineProperty(window, 'devicePixelRatio', { value: 0.25 });
    window.__audio = []; window.__plays = 0; window.__draws = 0;
    const A = window.Audio; window.Audio = function(...args) { const a = new A(...args); window.__audio.push(a); const play = a.play.bind(a); a.play = () => { window.__plays++; return play(); }; return a; };
    const draw = WebGL2RenderingContext.prototype.drawArrays;
    WebGL2RenderingContext.prototype.drawArrays = function(...args) { window.__draws++; return draw.apply(this, args); };
  });
  p.setDefaultTimeout(15000); return p;
}
const goto = (p, route) => p.goto(base + route, { waitUntil: 'domcontentloaded' });
try {
  // Retard initial : passer ou démonter pendant clip.json OU le premier bloc, y compris une erreur tardive.
  for (const resource of ['clip.json', 'fils-000.bin.gz']) for (const sortie of ['fermer', 'quitter', 'erreur-tardive']) {
    const p = await page(); let release, reached;
    const gate = new Promise(r => release = r), request = new Promise(r => reached = r);
    await p.route('**/studio/clip/fleur-du-ciel/' + resource, async r => { reached(); await gate; if (sortie === 'erreur-tardive') await r.abort(); else await r.continue(); });
    await goto(p, '/?ouverture=1'); await p.getByRole('button', { name: /Lancer avec le son/ }).click(); await request;
    if (sortie === 'quitter') { await p.locator('.aime-header-liens a[href="/projets-a-venir"]').first().click(); }
    else await p.getByRole('button', { name: 'Passer l’introduction' }).click();
    release(); await pause(900);
    ok(await p.evaluate(() => window.__plays === 0 && window.__draws === 0), `${resource}/${sortie} : ni audio ni rendu après sortie`);
    if (sortie !== 'quitter') ok(await p.getByRole('button', { name: 'Revoir l’ouverture', exact: true }).count() === 1, 'la fermeture reste effective après résolution tardive');
    await p.context().close();
  }
  // Une promesse play() encore en attente ne doit pas relancer le moteur après fermeture.
  {
    const p = await page();
    await p.addInitScript(() => {
      HTMLMediaElement.prototype.play = function() {
        return new Promise(resolve => { window.__finPlay = resolve; });
      };
    });
    await goto(p, '/?ouverture=1'); await p.getByRole('button', { name: /Lancer avec le son/ }).click();
    await p.waitForFunction(() => !!window.__finPlay);
    await p.getByRole('button', { name: 'Passer l’introduction' }).click();
    await p.evaluate(() => window.__finPlay()); await pause(200);
    ok(await p.evaluate(() => window.__draws === 0 && window.__audio.every(a => a.paused && !a.getAttribute('src'))), 'play() tardif : aucun rendu et audio libéré');
    await p.context().close();
  }
  // Erreur réseau pendant l'initialisation : secours existant puis fermeture sans lecture.
  {
    const p = await page(); await p.route('**/fils-000.bin.gz', r => r.abort());
    await goto(p, '/?ouverture=1'); await p.getByRole('button', { name: /Lancer avec le son/ }).click();
    await p.getByText('Ce navigateur ne peut pas dessiner la broderie.', { exact: false }).waitFor();
    ok(await p.evaluate(() => window.__plays === 0), 'erreur réseau : secours sans démarrage audio');
    await p.getByRole('button', { name: 'Passer l’introduction' }).click(); await p.context().close();
  }
  for (const width of [1280, 390]) {
    const p = await page(width); await goto(p, '/?ouverture=1');
    ok(await p.locator('.ouv-couverture').isVisible(), `${width} : ouverture affichée avant lecture`);
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width} : aucun débordement`);
    await p.getByRole('button', { name: /Lancer avec le son/ }).click(); await p.getByRole('button', { name: 'Pause', exact: true }).waitFor();
    await p.waitForFunction(() => window.__draws > 1);
    await p.getByRole('button', { name: 'Passer l’introduction' }).click(); await pause(100);
    const before = await p.evaluate(() => window.__draws); await pause(450);
    ok(await p.evaluate(() => window.__audio.every(a => a.paused && !a.getAttribute('src'))), `${width} : audio arrêté et source libérée`);
    ok(await p.evaluate(() => window.__draws) === before, `${width} : rendu arrêté après fermeture`);
    await p.getByRole('button', { name: 'Revoir l’ouverture', exact: true }).click();
    await p.getByRole('button', { name: /Lancer avec le son/ }).click(); await p.getByRole('button', { name: 'Pause', exact: true }).waitFor();
    ok(await p.evaluate(() => window.__plays === 2), `${width} : rejeu possible après libération`);
    await p.context().close();
  }
  // Studio : lien direct, rechargement, retour accueil, puis site -> studio -> site.
  for (const route of ['/studio/', '/studio/atelier', '/studio/uptown', '/studio/fleur-du-ciel']) {
    const p = await page(390); await goto(p, route); await p.reload({ waitUntil: 'domcontentloaded' });
    const link = p.locator('.aime-header-logo');
    await link.waitFor(); await link.click();
    await p.waitForURL(base + '/'); ok(true, `${route} : accès direct + rechargement + retour accueil`);
    await p.context().close();
  }
  for (const route of ['/', '/aime-wedding', '/point-zero', '/buro', '/projets', '/reseau', '/system', '/systaime']) {
    const p = await page(); const r = await goto(p, route); await p.locator('main').waitFor();
    ok(r.status() === 200, `route ${route} : shell 200 et main rendu (API simulées)`);
    for (const label of ['Accueil', 'Broderie', 'Atelier', 'Vidéo']) ok(await p.locator('.aime-header-public').getByRole('link', { name: label, exact: true }).count() > 0, `${route} : chemin ${label}`);
    await p.context().close();
  }
  for (const width of [390, 360]) {
    const p = await page(width); await goto(p, '/system'); await p.locator('#echiquier').waitFor(); await pause(1500);
    const cases = p.locator('#echiquier button:not(.sys-cube)');
    for (const i of [0, 5, 17, 33]) {
      const cell = cases.nth(i); await cell.scrollIntoViewIfNeeded(); await pause(500);
      const y = await p.evaluate(() => scrollY); const box = await cell.boundingBox(); await cell.tap(); await pause(200);
      const y1 = await p.evaluate(() => scrollY), box1 = await cell.boundingBox();
      ok(y1 === y && Math.abs(box1.y - box.y) < 1, `SYSTEM ${width} : case ${i} sans décalage (scroll ${y}->${y1}, case ${box.y}->${box1.y})`);
    }
    await p.context().close();
  }
  console.log(`PASS ${checks} assertions`);
} finally { await browser.close(); await new Promise(r => server.close(r)); }
