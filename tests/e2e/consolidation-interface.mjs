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
  for(const width of [1280,390,320]) for(const route of ['/', '/studio/atelier']) {
    const p=await page(width);p.on('pageerror',e=>errors.push(e.message));
    // État de compte fictif, API lecture simulée : aucun parcours d'authentification distant.
    await p.route('**/api/auth/get-session',r=>r.fulfill({json:{user:{id:'recette',email:'recette@example.invalid',name:'Recette'}}}));
    await p.route('**/api/buro',r=>r.fulfill({json:{ok:true,projets:[{role:'owner',archive:false},{role:'member',archive:false},{role:'owner',archive:true}]}}));
    await goto(p,route);await p.getByRole('button',{name:'Mon espace',exact:true}).click();
    const dialog=p.getByRole('dialog',{name:'Mon espace personnel'});await dialog.waitFor();
    for(const name of ['Projets','Partagés avec moi','Archives','Profil']) await dialog.getByRole('link',{name:new RegExp(name)}).first().waitFor();
    ok(await dialog.locator('.bloc-dossiers a').count()===4,`${width} ${route}: même panneau quatre dossiers`);
    ok(await dialog.getByRole('button',{name:/Paramètres et confort/}).count()===1,'paramètres dans le panneau');
    await p.keyboard.press('Escape'); await dialog.waitFor({state:'detached'}); await p.waitForFunction(()=>document.activeElement?.textContent==='Mon espace');
    ok(!await dialog.count()&&await p.getByRole('button',{name:'Mon espace',exact:true}).evaluate(e=>document.activeElement===e),'Échap ferme et restaure le focus');
    ok(await p.locator('.dock-bas,.pzh-bottom').count()===0,'pas de dock de navigation flottant');
    if(route==='/studio/atelier') {
      const show=p.getByRole('button',{name:'Déployer les outils du tambour'});if(await show.count())await show.click();
      await p.getByRole('menuitem',{name:/Fils :/}).waitFor();
      ok(await p.getByRole('menuitem',{name:/Bureau :|Dossiers :|Profil :|Archives :/}).count()===0,'aucun panneau personnel dans le Disque');
      await p.getByRole('button',{name:'Bibliothèque de l’atelier',exact:true}).click();
      await p.locator('#pzs-bloc').waitFor();ok(true,'bibliothèque locale conservée hors Disque');
    }
    await p.context().close();
  }
  for(const width of [1280,390,320]) {
    const p=await page(width);p.on('pageerror',e=>errors.push(e.message));const req=[];p.on('request',r=>req.push(r.url()));
    await goto(p,'/?ouverture=1');await p.getByRole('button',{name:/Lancer avec le son/}).waitFor();
    ok(!req.some(u=>u.includes('/studio/clip/fleur-du-ciel/')),'aucun média Fleur avant geste');
    await p.getByRole('button',{name:/Lancer avec le son/}).click();
    await p.locator('.clip-integre[data-lecture="oui"]').waitFor();
    ok(await p.locator('.clip-integre canvas').count()===1,'une seule toile du lecteur partagé');
    await p.getByRole('button',{name:/Pause/}).click();
    ok(await p.locator('.clip-integre audio').evaluate(a=>a.paused),'pause arrête le son');
    await p.getByRole('button',{name:'Couper le son',exact:true}).click();
    ok(await p.locator('.clip-integre audio').evaluate(a=>a.muted),'commande son conservée');
    await p.getByRole('button',{name:'Remettre le son',exact:true}).click();
    await p.getByRole('button',{name:'Reprendre',exact:true}).click();
    await p.locator('.clip-integre audio').evaluate(a=>{a.currentTime=11});
    await p.locator('.clip-integre[data-replie="oui"]').waitFor();
    await p.locator('.clip-integre').getByRole('button',{name:'Le Disque',exact:true}).click();
    await p.locator('.clip-integre[data-replie="non"]').waitFor();
    ok(await p.locator('.clip-integre .pzt-point').count()===1,'un seul vrai Disque dans l’ouverture');
    const loupe=p.locator('.clip-integre [data-mode="loupe"]');await loupe.click();
    await p.locator('.clip-integre [data-mode="fils"]').click();
    await p.locator('.clip-integre [data-mode="fils-tout"]').waitFor();
    ok(true,`${width}: Loupe et Fils du vrai Disque répondent`);
    await p.evaluate(()=>{window.__previousAudio=document.querySelector('.clip-integre audio')});
    await p.getByRole('button',{name:/Passer l’introduction/}).click();await p.locator('.ouv-bande').waitFor();
    ok(await p.evaluate(()=>window.__previousAudio.paused&&!window.__previousAudio.getAttribute('src')),'fermeture: audio arrêté et src libérée');
    await p.waitForTimeout(300);ok(await p.locator('.clip-integre').count()===0,'pas de lecteur persistant après fermeture');
    await p.context().close();
  }
  {
    const p=await page(390);await p.emulateMedia({reducedMotion:'no-preference'});p.on('pageerror',e=>errors.push(e.message));
    await goto(p,'/?ouverture=1');await p.getByRole('button',{name:/Lancer avec le son/}).click();
    await p.locator('.clip-integre[data-lecture="oui"]').waitFor();
    for(const [t,phase] of [[1.5,'broder'],[3.2,'fils'],[4.2,'couleur'],[7,'loupe'],[11,'termine']]) {
      await p.locator('.clip-integre audio').evaluate((a,t)=>{a.currentTime=t},t);
      await p.locator('.clip-integre[data-guide="'+phase+'"]').waitFor();
      ok(true,'#43 : phase '+phase+' suit le temps audio');
    }
    ok(await p.locator('.clip-integre[data-replie="oui"]').count()===1,'scénario se replie après la démonstration');
    await p.getByRole('button',{name:/Passer l’introduction/}).click();await p.context().close();
  }
  for(const resource of ['clip.json','fils-000.bin.gz']) {
    const p=await page();let release,reach;const gate=new Promise(r=>release=r),seen=new Promise(r=>reach=r);
    await p.route('**/studio/clip/fleur-du-ciel/'+resource,async r=>{reach();await gate;await r.continue().catch(()=>{});});
    await goto(p,'/?ouverture=1');await p.getByRole('button',{name:/Lancer avec le son/}).click();await seen;
    await p.getByRole('button',{name:/Passer l’introduction/}).click();release();await pause(900);
    ok(await p.locator('.ouv-bande').count()===1&&await p.locator('.clip-integre').count()===0,resource+': annulation tardive préservée');
    await p.context().close();
  }
  ok(errors.length===0,'aucune erreur JS: '+errors.join('; '));console.log(`PASS ${checks} assertions consolidation`);
} finally {await browser.close();await new Promise(r=>server.close(r));}
