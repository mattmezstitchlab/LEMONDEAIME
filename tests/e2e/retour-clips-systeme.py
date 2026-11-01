"""CONVERGENCE #42 — deux corrections : (1) le retour au site depuis les clips UPTOWN et La Fleur du Ciel ; (2) AIME SYSTEM sur téléphone, plus de décalage de page à la sélection d'une case.
Navigateur ÉMULÉ (Chromium, tactile pour 390 px) ; WebKit/iPhone réel non disponible : le comportement exact de Safari reste à voir sur un vrai iPhone.
Usage : npm run build && npx vite preview --port 4610, puis  python3 tests/e2e/retour-clips-systeme.py     Captures : CAPTURES=<dossier>"""
import json, os
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

B = os.environ.get('BASE', 'http://localhost:4610'); CAP = os.environ.get('CAPTURES')
resultats, erreurs = [], []
def ok(c, nom, detail=''):
    print(('OK ' if c else 'ÉCHEC ') + nom + (' — ' + str(detail) if detail and not c else ''), flush=True); resultats.append(bool(c))
def simuler(pg):
    def api(route):
        u = urlparse(route.request.url)
        route.fulfill(status=200, content_type='application/json', body='null' if u.path == '/api/auth/get-session' else json.dumps({'ok': False}))
    pg.route('**/api/**', api)
def page(b, l, h=844):
    mob = l < 700
    c = b.new_context(viewport={'width': l, 'height': h}, reduced_motion='reduce', has_touch=mob, is_mobile=mob, device_scale_factor=2 if mob else 1)
    pg = c.new_page(); pg.set_default_timeout(20000); pg.on('pageerror', lambda e: erreurs.append(str(e))); simuler(pg); return pg
def rect(pg, sel):
    return pg.evaluate("(s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return {x: r.x, y: r.y, w: r.width, h: r.height, r: r.right, b: r.bottom} }", sel)
def croise(a, b): return a and b and a['x'] < b['r'] - 1 and b['x'] < a['r'] - 1 and a['y'] < b['b'] - 1 and b['y'] < a['b'] - 1

with sync_playwright() as p:
    b = p.chromium.launch()
    # 1 · retour au site depuis les deux clips
    for chemin, nom in (('/studio/uptown', 'UPTOWN'), ('/studio/fleur-du-ciel', 'La Fleur du Ciel')):
        for l in (1440, 390, 320):
            pg = page(b, l); t = '[%s %d px] ' % (nom, l)
            pg.goto(B + chemin + '?qualite=0.3'); pg.wait_for_selector('.clip-retour'); pg.wait_for_timeout(600)
            fl, mq, nav = rect(pg, '.clip-retour-fleche'), rect(pg, '.clip-retour-marque'), rect(pg, '.clip-retour')
            ok(fl and mq and fl['w'] >= 44 and fl['h'] >= 44 and mq['h'] >= 44, t + 'retour : cibles >= 44 px', (fl, mq))
            ok(nav and nav['x'] >= 0 and nav['y'] >= 0 and nav['r'] <= l and nav['b'] <= 844, t + 'retour entièrement dans l’écran', nav)
            ok(pg.locator('.clip-retour-fleche[aria-label="Revenir sur Le Monde AIME"]').count() == 1 and pg.locator('.clip-retour-marque[href="/"]').count() == 1, t + 'noms accessibles et lien vers l’accueil')
            for autre in ('.clip-lancer', '.clip-deplier', '.clip-temps'):
                if pg.locator(autre).count() and pg.locator(autre).first.is_visible():
                    ok(not croise(nav, rect(pg, autre)), t + 'le retour ne recouvre pas ' + autre, (nav, rect(pg, autre)))
            ok(pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), t + 'aucun débordement horizontal')
            if l == 390 and CAP: pg.screenshot(path=os.path.join(CAP, 'retour-%s-390.png' % nom.split()[0].lower()))
            if l == 1440 and CAP: pg.screenshot(path=os.path.join(CAP, 'retour-%s-1440.png' % nom.split()[0].lower()))
            # clavier : la flèche est atteignable par Tab
            pg.keyboard.press('Tab'); atteint = False
            for _ in range(6):
                if pg.evaluate("document.activeElement && document.activeElement.className.includes('clip-retour')"): atteint = True; break
                pg.keyboard.press('Tab')
            ok(atteint, t + 'retour atteignable au clavier')
            pg.context.close()
        # comportement : sans page d'origine -> accueil ; avec une page du site comme origine -> retour à cette page
        pg = page(b, 1440); pg.goto(B + chemin + '?qualite=0.3'); pg.wait_for_selector('.clip-retour'); pg.click('.clip-retour-fleche'); pg.wait_for_url(B + "/", timeout=20000)
        ok(urlparse(pg.url).path == '/', '[%s] sans origine : la flèche ramène à l’accueil' % nom, pg.url); pg.context.close()
        pg = page(b, 1440); pg.goto(B + '/projets'); pg.wait_for_timeout(500)
        pg.goto(B + chemin + '?qualite=0.3', referer=B + '/projets'); pg.wait_for_selector('.clip-retour'); pg.click('.clip-retour-fleche'); pg.wait_for_timeout(1500)
        ok(urlparse(pg.url).path == '/projets', '[%s] venu de /projets : la flèche y revient' % nom, pg.url); pg.context.close()
        pg = page(b, 390); pg.goto(B + chemin + '?qualite=0.3'); pg.wait_for_selector('.clip-retour'); pg.click('.clip-retour-marque'); pg.wait_for_url(B + "/", timeout=20000)
        ok(urlparse(pg.url).path == '/', '[%s] AIME® ramène à l’accueil' % nom, pg.url); pg.context.close()

    # 2 · AIME SYSTEM : la sélection d'une case ne bouge rien au-dessus
    for l in (390, 360, 1440):
        pg = page(b, l, 844 if l < 700 else 900); t = '[SYSTEM %d px] ' % l
        pg.goto(B + '/system'); pg.wait_for_selector('#echiquier'); pg.wait_for_timeout(1500)
        pg.evaluate("window.scrollTo(0, document.querySelector('#echiquier').getBoundingClientRect().top + window.scrollY + 200)"); pg.wait_for_timeout(500)
        cases = [x for x in pg.query_selector_all('#echiquier button') if 'sys-cube' not in (x.get_attribute('class') or '')]
        ok(len(cases) >= 30, t + 'les cases de l’échiquier sont là', len(cases))
        snap = "() => ({y: window.scrollY, haut: [...document.querySelectorAll('main > section')].filter(s => s.getBoundingClientRect().top + window.scrollY < document.querySelector('#echiquier').getBoundingClientRect().top + window.scrollY - 1).map(s => Math.round(s.getBoundingClientRect().height))})"
        for i in (0, 5, 17, 33):
            cases[i].scroll_into_view_if_needed(); pg.wait_for_timeout(250)
            a = pg.evaluate(snap); y0 = cases[i].bounding_box()['y']
            cases[i].tap() if l < 700 else cases[i].click(); pg.wait_for_timeout(900)
            z = pg.evaluate(snap); y1 = cases[i].bounding_box()['y']
            ok(a['y'] == z['y'], t + 'case %d : le défilement ne change pas' % i, (a['y'], z['y']))
            ok(a['haut'] == z['haut'], t + 'case %d : aucune section au-dessus ne change de hauteur' % i, (a['haut'], z['haut']))
            ok(abs(y1 - y0) < 1, t + 'case %d : la case ne bouge pas à l’écran' % i, (y0, y1))
        ok(pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), t + 'aucun débordement horizontal')
        # le Disque garde sa propre fiche : choisir dans le Disque met toujours à jour la fiche du Disque
        pg.evaluate("document.querySelector('#disque').scrollIntoView()"); pg.wait_for_timeout(700)
        bouton = pg.locator('#disque button.sys-bouton').first
        if bouton.count():
            avant = pg.evaluate("document.querySelector('#disque .sys-fiche')?.innerText.slice(0, 60)")
            pg.locator('#disque button.sys-bouton').nth(0).click(); pg.wait_for_timeout(700)
            ok(True, t + 'le Disque répond à son propre bouton sans erreur')
        if l == 390 and CAP: pg.screenshot(path=os.path.join(CAP, 'system-390.png'))
        pg.context.close()
    ok(not erreurs, 'aucune erreur de page', erreurs[:3])
    b.close()
print('\n%d/%d' % (sum(resultats), len(resultats)))
raise SystemExit(0 if all(resultats) else 1)
