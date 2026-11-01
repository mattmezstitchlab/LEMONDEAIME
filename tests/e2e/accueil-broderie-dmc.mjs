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
  const p=await page(width);p.on('pageerror',e=>errors.push(e.message));const requests=[];p.on('request',r=>requests.push(r.url()));
  await goto(p,'/');await p.locator('.csh-integre .ch[data-dmc]').first().waitFor();
  ok(await p.locator('main').count()===1,width+': un seul main');
  ok(await p.locator('h1').count()===1,width+': un titre principal');
  ok(await p.locator('[data-header-public]').count()===1,width+': un seul header');
  ok(await p.locator('footer').count()===1,width+': un seul footer');
  ok(await p.locator('.csh-integre .ch').count()===8,width+': huit sections broderie sur accueil');
  ok(await p.locator('.ouv,.ouv-scene,#demonstrations,.csh-actions-contextuelles,#tout,#csh-import,#commencer').count()===0,'vidéo et derniers blocs retirés de l’accueil');
  ok(await p.locator('[data-entree-dmc]').count()===3,'grandes entrées en sections DMC');
  const sections=p.locator('.csh-integre .ch');const codes=[];
  for(const section of await sections.all()) {
   await section.scrollIntoViewIfNeeded();
   const info=await section.evaluate(e=>{const s=getComputedStyle(e);return {code:e.dataset.dmc,bg:s.backgroundColor,img:s.backgroundImage,text:s.color}});
   codes.push(info.code);ok(info.bg!=='rgba(0, 0, 0, 0)'&&info.img==='none',width+': aplat DMC '+info.code);
   ok(await section.locator('img,.ch-ecrans,.ch-ecran,.ch-fond,.ch-voile').count()===0,'aucune fenêtre ni fond image');
  }
  ok(new Set(codes).size===8,'huit références DMC distinctes');
  ok(!requests.some(u=>/ecran-.*webp|peinture-roses.webp/.test(u)),'aucune capture ou fond floral de section chargé');
  ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),width+': sans débordement');
  await p.getByRole('button',{name:'Studio',exact:true}).click();
  const dialog=p.getByRole('dialog',{name:'Menu du Studio'});await dialog.waitFor();
  ok(await dialog.locator('dt').count()===12,'catalogue complet dans le header');
  for(const name of ['Importer','Mes ouvrages','Continuer à broder','Créer un patron','Faire la visite avec Le Point','UPTOWN','La Fleur du Ciel']) ok(await dialog.getByRole('link',{name,exact:true}).count()===1,'accès conservé : '+name);
  await p.keyboard.press('Escape'); await dialog.waitFor({state:'detached'});
  await p.waitForFunction(()=>document.activeElement?.textContent==='Studio');
  ok(await p.getByRole('button',{name:'Studio',exact:true}).evaluate(e=>document.activeElement===e),'Échap restaure le focus Studio');
  await p.getByRole('button',{name:'Studio',exact:true}).click();
  await dialog.getByRole('link',{name:'Importer',exact:true}).click();
  await p.waitForURL(/\/studio\/atelier/);await p.getByRole('application',{name:/Grille de broderie/}).waitFor();ok(true,'import passe au véritable atelier');
  await p.context().close();
 }
 ok(errors.length===0,'pas d’erreur JS : '+errors.join('; '));console.log(`PASS ${checks} assertions accueil DMC`);
} finally {await browser.close();await new Promise(r=>server.close(r));}
