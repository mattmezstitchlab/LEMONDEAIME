/** Recette locale sans secrets ni base. npm run build, puis :
 * PLAYWRIGHT_MODULE=/chemin/vers/playwright/index.mjs node tests/e2e/header-public.mjs
 * Option : AXE_SCRIPT=/chemin/vers/axe-core/axe.min.js (aucune dépendance ajoutée au projet).
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
const entries = [
  ['Accueil', '/'], ['Broderie', '/studio/'], ['Atelier', '/studio/atelier'], ['Vidéo', '/studio/fleur-du-ciel'],
];
try {
  const errors = [];
  // Suivi #46 : bouton du clip replié, pointeur/tactile et clavier, sans lancer la musique.
  for (const width of [1280, 390, 320]) for (const route of ['/studio/uptown', '/studio/fleur-du-ciel']) {
    const p = await page(width); p.on('pageerror', e => errors.push(e.message));
    await goto(p, route);
    await p.getByRole('slider', {name:'Avancer dans le clip'}).waitFor();
    const button = p.getByRole('button', { name: 'Le Disque', exact: true });
    if (!await button.count()) {
      // UPTOWN peut démarrer déployé : son action contextuelle existante replie la couronne.
      await p.getByRole('menuitem', { name: /^Replier :/ }).waitFor();
      await p.getByRole('menuitem', { name: /^Replier :/ }).click();
    }
    await button.waitFor();
    const b = await button.boundingBox(), h = await p.locator('[data-header-public]').boundingBox();
    ok(b.y >= h.y + h.height && b.y + b.height <= 844 && b.x >= 0 && b.x + b.width <= width, `${width} ${route} : bouton hors du header et dans l’écran`);
    ok(b.height >= 44, 'cible tactile >=44 px');
    ok(await button.evaluate(e => { const r=e.getBoundingClientRect(); const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return hit===e||e.contains(hit); }), 'bouton non masqué au point de contact');
    if (width < 700) await button.tap(); else await button.click();
    await p.getByRole('menuitem').first().waitFor();
    ok(await p.getByRole('menuitem').count() > 3, `${width} ${route} : ouverture par ${width<700?'toucher':'souris'}`);
    await p.getByRole('menuitem', { name: /^Replier :/ }).click();
    await button.waitFor();
    // Atteindre le bouton par Tab, sans focus() ou clic forcé.
    await p.locator('.aime-header-logo').focus();
    let reached=false;
    for(let n=0;n<20;n++) { await p.keyboard.press('Tab'); if(await button.evaluate(e=>document.activeElement===e)){reached=true;break;} }
    ok(reached, `${width} ${route} : atteignable au clavier par Tab`);
    await p.keyboard.press('Enter'); await p.getByRole('menuitem').first().waitFor();
    ok(await p.getByRole('menuitem').count()>3, 'activation Entrée déploie le Disque');
    ok(await p.getByRole('button', {name:/Lancer le clip avec le son/}).count()===1, 'lecture non déclenchée par le déploiement');
    await p.context().close();
  }

  for (const width of [1280, 390, 320]) {
    const p = await page(width); p.on('pageerror', e => errors.push(e.message));
    for (const [name, route] of entries) {
      await goto(p, route); await p.locator('[data-header-public]').waitFor();
      ok(await p.locator('[data-header-public]').count() === 1, `${width} ${route} : un header public`);
      const nav = p.getByRole('navigation', {name: 'Navigation principale', exact: true});
      if (width < 1051) {
        ok(!await nav.isVisible(), `${width} menu fermé et liens retirés du parcours clavier`);
        await p.getByRole('button', {name: 'Menu principal', exact: true}).click();
        ok(await p.evaluate(() => document.activeElement?.textContent === 'Accueil'), 'focus initial sur Accueil');
      }
      await p.evaluate(() => document.fonts.ready);
      ok(await p.locator('[data-header-public]').evaluate(e => getComputedStyle(e).fontFamily.includes('AIME Public') && document.fonts.check('17px "AIME Public"')), `${width} ${route} : police locale partagée chargée`);
      const rect = await p.locator('[data-header-public]').boundingBox();
      ok(Math.abs(rect.y) < 1 && Math.abs(rect.width - width) < 1, `${width} ${route} : même position et largeur du header`);
      for (const link of await nav.locator('a').all()) {
        const b = await link.boundingBox(); ok(b && b.height >= 44, 'cible tactile de navigation >= 44 px');
      }
      if (process.env.AXE_SCRIPT) {
        await p.addScriptTag({ path: process.env.AXE_SCRIPT });
        const violations = await p.evaluate(async () => (await window.axe.run({ include: ['[data-header-public]'] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(v => v.id));
        ok(violations.length === 0, `${width} ${route} : axe ciblé header sans violation (${violations.join(', ')})`);
      }
      const labels = await nav.locator('a').allTextContents();
      ok(JSON.stringify(labels) === JSON.stringify(entries.map(e => e[0])), `${width} ${route} : ordre exact des entrées broderie`);
      ok(await nav.locator('[aria-current="page"]').innerText() === name, `${width} ${route} : rubrique active`);
      ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width} ${route} : sans débordement`);
      if (width < 1051) {
        await p.keyboard.press('Escape');
        ok(await p.getByRole('button', {name: 'Menu principal', exact: true}).evaluate(e => document.activeElement === e), 'Échap rend le focus au bouton');
        await p.getByRole('button', {name: 'Menu principal', exact: true}).click();
      }
      const next = entries[(entries.findIndex(e => e[0] === name) + 1) % entries.length];
      await nav.getByRole('link', {name: next[0], exact: true}).click();
      await p.waitForURL(base + next[1]);
      ok(true, `lien ${next[0]} rejoint ${next[1]}`);
    }
    await p.context().close();
  }
  // Toutes les pages existantes gardent le header et l'accès aux fonctions métiers.
  for (const route of ['/projets', '/projets/brode-way', '/point-zero', '/reseau', '/reseau/matthieu-lecointre', '/boutique', '/musique', '/a-plus', '/page-inconnue', '/buro', '/entrer', '/system', '/systaime', '/studio/atelier', '/studio/uptown', '/studio/fleur-du-ciel', '/studio/one/univers', '/studio/one/premiere-rencontre', '/studio/one/terminal', '/studio/one/mosaique', '/studio/tambour']) {
    const p = await page(390); p.on('pageerror', e => errors.push(e.message));
    await goto(p, route); await p.locator('[data-header-public]').waitFor();
    ok(await p.locator('[data-header-public] nav').count() === 1, `${route} : navigation canonique unique`);
    await p.evaluate(() => document.fonts.ready);
    ok(await p.locator('[data-header-public]').evaluate(e => getComputedStyle(e).fontFamily.includes('AIME Public') && document.fonts.check('17px "AIME Public"')), `${route} : même police publique`);
    const tools = p.locator('.dock-bas, .pzs-bottom, .cv-nav');
    ok(await tools.getByRole('link', {name:'Projets à venir',exact:true}).count() === 0, `${route} : pas de copie du header en dock inférieur`);
    if (route === '/studio/atelier') {
      await p.getByRole('application', {name:/Grille de broderie/}).waitFor();
      ok(await p.getByRole('button', {name:/Importer au point zéro/}).isVisible(), 'import métier toujours disponible');
      ok(await p.getByRole('button', {name:'Réglages de confort',exact:true}).count() === 1, 'confort métier conservé');
    }
    if (['/studio/uptown', '/studio/fleur-du-ciel'].includes(route)) {
      await p.getByRole('button', {name:/Lancer le clip avec le son/}).waitFor();
      ok(await p.getByRole('slider', {name:'Avancer dans le clip'}).count() === 1, 'commandes du clip conservées');
      const deplier = p.getByRole('button', {name:'Le Disque',exact:true});
      if (await deplier.count()) {
        const b = await deplier.boundingBox(), h = await p.locator('[data-header-public]').boundingBox();
        ok(b.y >= h.height, 'commande Le Disque hors du header');
        await deplier.click();
        await p.getByRole('menuitem').first().waitFor();
        ok(await p.getByRole('menuitem').count() > 3, 'clip replié : le Disque se déploie réellement');
      }
    }
    for (const selector of ['.pzs-top', '.clip-lancer', '.clip-temps']) {
      const el = p.locator(selector).first();
      if (await el.count() && await el.isVisible()) {
        const b = await el.boundingBox(), h = await p.locator('[data-header-public]').boundingBox();
        ok(b.y >= h.height - 1, `${route} : ${selector} ne recouvre pas le header`);
      }
    }
    await p.locator('.aime-header-logo').click(); await p.waitForURL(base + '/');
    ok(true, `${route} : logo rejoint toujours l'accueil`);
    await p.context().close();
  }
  {
    const p = await page(); await goto(p, '/');
    await p.getByRole('button', {name:'Mon espace',exact:true}).click();
    await p.getByRole('dialog', {name:'Mon espace personnel'}).waitFor();
    await p.getByRole('button', {name:'Chercher dans tout AIME, et le plan du site',exact:true}).click();
    ok(await p.locator('.dock-bloc input').first().isVisible(), 'recherche du site conservée dans le panneau');
    await p.keyboard.press('Escape');
    await p.getByRole('button', {name:'Mon espace',exact:true}).click();
    await p.locator('.entrer-bloc').waitFor();
    ok(await p.locator('.entrer-bloc').isVisible(), 'connexion conservée dans le panneau');
    await p.keyboard.press('Escape');
    await p.getByRole('button', {name:'Mon espace',exact:true}).click();
    await p.getByRole('button', {name:/Paramètres et confort/}).click();
    await p.getByRole('button', {name:'Mon confort : régler chaque détail',exact:true}).click();
    ok(await p.locator('.mini-dock').isVisible(), 'réglages de confort conservés');
    await p.context().close();
  }
  {
    const p = await page(320); await goto(p, '/');
    await p.getByRole('heading', {name:'Tout commence par un point.'}).waitFor();
    ok(await p.locator('.ouv,#demonstrations').count()===0,'vidéo déplacée hors de l’accueil');
    await p.getByRole('button',{name:'Studio',exact:true}).click();
    const studio=p.getByRole('dialog',{name:'Menu du Studio'});
    ok(await studio.getByRole('link',{name:'UPTOWN',exact:true}).count()===1,'UPTOWN conservé dans le menu');
    await p.keyboard.press('Escape');
    ok(await p.locator('main a[href="/aime-wedding"],main a[href="/reseau"],footer a[href="/projets"]').count()===0, 'autres univers absents des entrées publiques');
    await p.getByRole('button',{name:'Mon espace',exact:true}).click();
    await p.getByRole('button',{name:'Chercher dans tout AIME, et le plan du site',exact:true}).click();
    const search=p.getByRole('search');
    ok(await search.locator('a[href^="/aime-wedding"],a[href^="/reseau"],a[href^="/musique"],a[href^="/projets"]').count()===0,'recherche sans autre univers');
    await p.keyboard.press('Escape'); await p.context().close();
  }
  const p = await page(); await goto(p, '/contact');
  ok(await p.getByText('Aucun message n’est envoyé depuis cette page.', {exact:false}).count() === 1, 'contact honnête, aucun formulaire factice');
  await p.context().close();
  ok(errors.length === 0, 'aucune erreur JavaScript de page : ' + errors.join('; '));
  console.log(`PASS ${checks} assertions`);
} finally { await browser.close(); await new Promise(r => server.close(r)); }
