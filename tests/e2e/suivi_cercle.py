"""Le suivi de broderie dans le cercle, dans le vrai navigateur, sur la version construite.
La couleur choisie (Broder › Couleurs à broder) : son avancée sur le bois et en toutes lettres dans le cartouche ;
le prochain point montré dans la toile (le geste, jamais l'action) ; il suit la main ; hors du cercle, une flèche l'amène au centre ;
Broder › Prochain point fait de même au clavier ; le Guide désactivé le retire. Sur téléphone, en contenu étendu, il reste visible.
Usage : cd studio && npx vite build && npx vite preview --port 4620, puis  python3 tests/e2e/suivi_cercle.py   (CAPTURES=<dossier>)"""
import os, re, math
from playwright.sync_api import sync_playwright
B = os.environ.get('BASE', 'http://localhost:4620'); CAP = os.environ.get('CAPTURES')
res, erreurs = [], []
def ok(c, t): res.append(bool(c)); print(('OK ' if c else 'ÉCHEC ') + t, flush=True)
def cap(pg, nom):
    if CAP: pg.screenshot(path=f'{CAP}/suivi-{nom}.png')
MENU = '.pzt [data-presentation][role=menu]'
def item(pg, m): return pg.locator(f'{MENU} [data-mode="{m}"]').first
def racine(pg):
    for _ in range(6):
        if not pg.locator(MENU).count() or pg.locator(MENU).get_attribute('data-niveau') == '0': return
        item(pg, '__retour').click(); pg.wait_for_timeout(150)
def famille(pg, fam, cible):
    racine(pg); item(pg, fam).click(); pg.wait_for_timeout(220)
    for _ in range(3):
        if pg.locator(f'{MENU} [data-mode="{cible}"]').count(): break
        pg.locator(f'{MENU} [data-mode="__suite"]').click(); pg.wait_for_timeout(220)
    item(pg, cible).click(); pg.wait_for_timeout(250)
def eloigner(pg): pg.mouse.move(5, 300); pg.wait_for_timeout(1700)
def cartouche(pg): return pg.locator('.pzt-cartouche').text_content() or ''
def reste(pg):
    m = re.search(r'(\d+) points? à broder sur (\d+)', cartouche(pg)); return (int(m.group(1)), int(m.group(2))) if m else None
def centre(pg): return pg.evaluate("() => { const s = getComputedStyle(document.querySelector('.pzt')); return [parseFloat(s.getPropertyValue('--pzt-x')), parseFloat(s.getPropertyValue('--pzt-y')), parseFloat(s.getPropertyValue('--pzt-r'))]; }")
def dans(pg):
    b = pg.locator('.pzt-prochain').bounding_box(); cx, cy, r = centre(pg)
    return b and math.hypot(b['x'] + b['width'] / 2 - cx, b['y'] + b['height'] / 2 - cy) < r

with sync_playwright() as p:
    b = p.chromium.launch()
    try:
        ctx = b.new_context(viewport={'width': 1440, 'height': 900}, reduced_motion='reduce')
        ctx.add_init_script("localStorage.setItem('pointzero:visite-docks:v1', 'vue'); localStorage.setItem('pointzero:essai:cadre-tambour', '1'); localStorage.setItem('pointzero:disque:presentation', 'disque')")
        pg = ctx.new_page(); pg.set_default_timeout(10000); pg.on('pageerror', lambda e: erreurs.append(str(e)))
        pg.goto(B + '/atelier?offerte=5D-12342.g21.v0.1'); pg.wait_for_selector('.cadre[data-pret]', timeout=20000); pg.wait_for_timeout(5000)
        pg.locator('.pzs-ouvrir-tambour').click(); pg.wait_for_selector('.pzt'); pg.wait_for_timeout(400)
        famille(pg, 'broder', 'a-broder')
        code = pg.locator(f'{MENU} [role=menuitem]:not([data-mode^="__"])').first.get_attribute('data-mode').split('-')[-1]
        pg.locator(f'{MENU} [role=menuitem]:not([data-mode^="__"])').first.click(); pg.wait_for_timeout(700); eloigner(pg)
        r0 = reste(pg)
        ok(r0 and f'DMC {code}' in cartouche(pg), f'Couleurs à broder : DMC {code} choisi ; le cartouche le dit en toutes lettres ({cartouche(pg)})')
        ok(pg.locator('.pzt-suivi-arc').count() == 1 and pg.locator('.pzt-suivi').get_attribute('aria-hidden') == 'true', 'l’avancée de la couleur sur le bois (décorative ; le texte est dans le cartouche et la commande)')
        ok(pg.locator('.pzt-prochain').count() == 1 and dans(pg), 'le prochain point est montré dans la toile, au plus près du centre')
        ok(pg.locator('.pzt-prochain').evaluate("e => getComputedStyle(e).pointerEvents") == 'none' and pg.locator('.pzt-prochain').evaluate("e => getComputedStyle(e).animationName") == 'none',
           'l’anneau laisse passer les clics ; immobile quand les animations sont réduites')
        cap(pg, '1-prochain')
        # cocher ce point : le suivi avance, le prochain point suit la main
        x0, y0 = int(pg.locator('.pzt-prochain').get_attribute('data-x')), int(pg.locator('.pzt-prochain').get_attribute('data-y'))
        bb = pg.locator('.pzt-prochain').bounding_box(); pg.mouse.click(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2); pg.wait_for_timeout(900); eloigner(pg)
        x1, y1 = int(pg.locator('.pzt-prochain').get_attribute('data-x')), int(pg.locator('.pzt-prochain').get_attribute('data-y'))
        ok(reste(pg) == (r0[0] - 1, r0[1]), f'un point coché dans le cercle : {r0[0]} → {reste(pg)[0] if reste(pg) else "?"} à broder')
        ok((x1, y1) != (x0, y0) and math.hypot(x1 - x0, y1 - y0) <= 2, f'le prochain point suit la main : ({x0},{y0}) → ({x1},{y1})')
        ok('Sauvegardé' not in cartouche(pg), 'la sauvegarde ordinaire ne prend pas la place du suivi dans le cartouche')
        # hors du cercle : la flèche, qui ramène le point au centre
        pg.evaluate("() => window.dispatchEvent(new CustomEvent('pointzero:canvas', { detail: { action: 'ancrer', x: 60, y: 60 } }))"); pg.wait_for_timeout(600)
        ok(pg.locator('.pzt-prochain').count() == 0 and pg.locator('.pzt-prochain-fleche').count() == 1, 'la toile déplacée : le point est hors du cercle, une flèche sur le bois indique sa direction')
        cap(pg, '2-fleche')
        ok('hors du cercle' in (pg.locator('.pzt-prochain-fleche').get_attribute('aria-label') or ''), 'la flèche a un nom accessible')
        pg.locator('.pzt-prochain-fleche').click(); pg.wait_for_timeout(600)
        ok(pg.locator('.pzt-prochain').count() == 1 and dans(pg), 'la flèche touchée : le prochain point revient au centre (la vue seulement)')
        ok(reste(pg) == (r0[0] - 1, r0[1]), 'rien n’a été coché à la place de la personne')
        # au clavier : Broder › Prochain point
        pg.evaluate("() => window.dispatchEvent(new CustomEvent('pointzero:canvas', { detail: { action: 'ancrer', x: -60, y: 40 } }))"); pg.wait_for_timeout(500)
        famille(pg, 'broder', 'prochain-point'); pg.wait_for_timeout(500)
        ok(pg.locator('.pzt-prochain').count() == 1 and dans(pg), 'Broder › Prochain point : le même geste, au clavier et au lecteur d’écran')
        # le Guide désactivé : plus d'anneau ; le suivi (cartouche, arc) reste
        famille(pg, 'guide', 'guide-suggestions'); racine(pg); eloigner(pg)
        ok(pg.locator('.pzt-prochain, .pzt-prochain-fleche').count() == 0 and pg.locator('.pzt-suivi-arc').count() == 1 and reste(pg), 'Suggestions : non — le prochain point n’est plus montré ; l’avancée reste')
        famille(pg, 'guide', 'guide-suggestions'); racine(pg)
        ctx.close()
        # téléphone : en contenu étendu, le suivi reste là
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True, reduced_motion='reduce')
        ctx.add_init_script("localStorage.setItem('pointzero:visite-docks:v1', 'vue'); localStorage.setItem('pointzero:essai:cadre-tambour', '1')")
        pg = ctx.new_page(); pg.on('pageerror', lambda e: erreurs.append(str(e)))
        pg.goto(B + '/atelier?offerte=5D-12342.g21.v0.1'); pg.wait_for_selector('.cadre[data-pret]', timeout=20000); pg.wait_for_timeout(1500)
        pg.locator('.pzs-ouvrir-tambour').tap(); pg.wait_for_selector('.pzt'); pg.wait_for_timeout(300)
        pg.locator('.pzt-deployer').tap(); pg.wait_for_timeout(300); famille(pg, 'broder', 'a-broder')
        pg.locator(f'{MENU} [role=menuitem]:not([data-mode^="__"])').first.tap(); pg.wait_for_timeout(500)
        racine(pg); item(pg, 'replier').tap(); pg.wait_for_timeout(700)
        ok(pg.locator(MENU).count() == 0 and pg.locator('.pzt-prochain, .pzt-prochain-fleche').count() == 1 and pg.locator('.pzt-suivi-arc').count() == 1 and 'à broder sur' in cartouche(pg), 'téléphone, contenu étendu : le prochain point, l’avancée et son texte restent visibles')
        cap(pg, '3-mobile')
        ctx.close()
    finally:
        b.close()
ok(not erreurs, 'aucune erreur de page ' + str(erreurs[:3]))
n = sum(res); print(f'— {n}/{len(res)}'); raise SystemExit(0 if n == len(res) else 1)
