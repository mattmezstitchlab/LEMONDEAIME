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
try {
  const errors=[];
  for(const width of [1280,390,320]) {
    const p=await page(width);p.on('pageerror',e=>errors.push(e.message));
    await goto(p,'/studio/');await p.locator('#usages-disque').scrollIntoViewIfNeeded();
    const section=p.locator('#usages-disque');
    ok(await section.locator('img[src*="ecran-"]').count()===0,'aucune capture écran de commande');
    ok(await section.locator('.lp-scene-hote').count()===1,'un seul Point canonique dans la présentation');
    for(const name of ['Importer','Créer','Le Point','Fils','Affichage','Broder','Partager','Loupe']) {
      const mode=section.getByRole('menuitem',{name:new RegExp('^'+name+'(?:, actif)? :')});
      await mode.scrollIntoViewIfNeeded();
      if(width<700)await mode.tap();else await mode.click();
      ok(await section.locator('.usages-detail .pzh-kicker').textContent().then(t=>t.includes(name)),width+': '+name+' choisit son usage');
      const b=await mode.boundingBox();ok(b.width>=44&&b.height>=44,width+': cible Disque >=44px');
    }
    await section.getByRole('button',{name:'Recentrer la loupe',exact:true}).click();
    await section.locator('.ed-brode-vue[data-loupe]').waitFor();ok(true,width+': vraie loupe activée');
    const palette=section.getByRole('menuitem',{name:/^Fils(?:, actif)? :/});await palette.click();
    await section.getByLabel('Famille DMC').selectOption('bleus');
    ok(await section.locator('.usages-fils li').count()>0,width+': vrai nuancier consultable');
    const mode=section.getByRole('menuitem',{name:/^Créer(?:, actif)? :/});await mode.focus();await p.keyboard.press('Enter');
    await section.getByRole('button',{name:'Créer dans l’atelier',exact:true}).waitFor();ok(true,width+': activation clavier du vrai Point');
    ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),width+': sans débordement horizontal');
    await section.getByRole('button',{name:'Créer dans l’atelier',exact:true}).click();
    await p.getByRole('application',{name:/Grille de broderie/}).waitFor();ok(true,width+': commande réelle rejoint l’atelier');
    await p.context().close();
  }
  ok(errors.length===0,'pas d’erreur JS : '+errors.join('; '));console.log(`PASS ${checks} assertions usages`);
} finally {await browser.close();await new Promise(r=>server.close(r));}
