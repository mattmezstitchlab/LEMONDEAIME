"""La carte vivante (essai privé /essai-carte), dans un vrai navigateur : clavier, toucher, téléphone, texte agrandi, mouvement réduit.
Usage : cd studio && npx vite build && npx vite preview --port 4630, puis  python3 tests/e2e/carte.py   (BASE=…, CAPTURES=<dossier>)"""
import os
from playwright.sync_api import sync_playwright

B = os.environ.get('BASE', 'http://localhost:4630'); CAP = os.environ.get('CAPTURES')
res = []
def ok(c, t): res.append((bool(c), t)); print(('OK ' if c else 'ÉCHEC ') + t)

with sync_playwright() as p:
    b = p.chromium.launch(); erreurs = []
    def page(**kw):
        ctx = b.new_context(**kw); pg = ctx.new_page()
        pg.on('pageerror', lambda e: erreurs.append(str(e))); pg.on('console', lambda m: erreurs.append(m.text) if m.type == 'error' else None)
        pg.goto(B + '/essai-carte'); pg.wait_for_selector('.cv'); pg.wait_for_timeout(400); return pg
    actif = lambda pg: pg.evaluate("() => { const a = document.activeElement; return a ? (a.closest('.cv-recto') ? 'recto' : a.closest('.cv-verso') ? 'verso' : a.className || a.tagName) : null }")

    # — au clavier, sur ordinateur —
    pg = page(viewport={'width': 1280, 'height': 900})
    for f in ['Ronde', 'Carrée', 'Verticale']:
        pg.get_by_role('button', name=f, exact=True).click(); pg.wait_for_timeout(200)
        ok(pg.locator(f'.cv-{ {"Ronde": "ronde", "Carrée": "carree", "Verticale": "verticale"}[f]}').count() == 1, f'forme {f} : la même carte')
    pg.locator('.cv-recto .cv-carrousel').focus()
    vus = set()
    for _ in range(14): pg.keyboard.press('Tab'); vus.add(actif(pg))
    ok('verso' not in vus, 'Tab ne passe jamais dans le verso caché (inert)')
    pg.get_by_role('button', name='Retourner la carte : voir le verso').focus(); pg.keyboard.press('Enter'); pg.wait_for_timeout(700)
    ok(pg.evaluate("() => document.activeElement.classList.contains('cv-verso-titre')"), 'Entrée sur Retourner : le focus arrive au titre du verso')
    vus = set()
    for _ in range(12): pg.keyboard.press('Tab'); vus.add(actif(pg))
    ok('recto' not in vus and 'verso' in vus, 'au verso : Tab parcourt le verso, jamais le recto caché')
    pg.get_by_role('button', name='Retourner la carte : revenir au recto').click(); pg.wait_for_timeout(700)
    pg.locator('.cv-recto .cv-carrousel').focus(); src0 = pg.locator('.cv-recto .cv-media').get_attribute('src')
    pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(150)
    ok(pg.locator('.cv-recto .cv-media').get_attribute('src') != src0, 'flèche droite : média suivant')
    pg.wait_for_timeout(2500)
    src1 = pg.locator('.cv-recto .cv-media').get_attribute('src')
    pg.wait_for_timeout(2500)
    ok(pg.locator('.cv-recto .cv-media').get_attribute('src') == src1, 'aucun défilement automatique')
    pg.get_by_role('button', name='Voir toute la carte').click(); pg.wait_for_timeout(400)
    ok(pg.url.endswith('/essai-carte') and pg.locator('article.cv.cv-page').count() == 1, 'la carte devient sa page, sans changer d’adresse')
    ok(pg.locator('.cv-page .cv-media').get_attribute('src') == src1, 'la page garde le média affiché')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    ok(pg.locator('.cv-verticale').count() == 1 and pg.evaluate("() => document.activeElement.textContent") == 'Voir toute la carte', 'Échap : retour à la forme d’avant, le focus sur « Voir toute la carte »')
    pg.get_by_role('button', name='Client', exact=True).click(); pg.wait_for_timeout(200)
    pg.get_by_role('button', name='Page', exact=True).click(); pg.wait_for_timeout(300)
    ok(pg.locator('.cv-page [data-module="contact"]').count() == 1, 'rôle client : le contact apparaît')
    pg.get_by_role('button', name='Visiteur', exact=True).click(); pg.wait_for_timeout(200)
    ok(pg.locator('.cv-page [data-module="contact"]').count() == 0, 'rôle visiteur : le contact réservé aux clients disparaît')
    if CAP: pg.screenshot(path=f'{CAP}/carte-page.png', full_page=True)

    # — au doigt, sur téléphone —
    for L in (390, 320):
        pg = page(viewport={'width': L, 'height': 760}, has_touch=True, is_mobile=True, device_scale_factor=2)
        large = pg.evaluate("() => document.documentElement.scrollWidth <= innerWidth")
        ok(large, f'{L} px : pas de défilement horizontal')
        box = pg.locator('.cv-recto .cv-carrousel').bounding_box(); s0 = pg.locator('.cv-recto .cv-media').get_attribute('src')
        y = box['y'] + box['height'] / 2
        pg.dispatch_event('.cv-recto .cv-carrousel', 'pointerdown', {'clientX': box['x'] + box['width'] * .8, 'clientY': y, 'pointerType': 'touch', 'bubbles': True})
        pg.dispatch_event('.cv-recto .cv-carrousel', 'pointerup', {'clientX': box['x'] + box['width'] * .2, 'clientY': y, 'pointerType': 'touch', 'bubbles': True})
        pg.wait_for_timeout(150)
        ok(pg.locator('.cv-recto .cv-media').get_attribute('src') != s0, f'{L} px : glisser vers la gauche montre le média suivant')
        cibles = pg.evaluate("() => [...document.querySelectorAll('.cv button:not([inert] button), .ec button')].filter(b => !b.closest('[inert]') && b.offsetParent).map(b => { const r = b.getBoundingClientRect(); return Math.min(r.width, r.height) })")
        ok(min(cibles) >= 24, f'{L} px : chaque bouton visible fait au moins 24 px ({min(cibles):.0f})')
        for f in ['Ronde', 'Carrée', 'Verticale']:
            pg.get_by_role('button', name=f, exact=True).tap(); pg.wait_for_timeout(200)
            w = pg.locator('.cv-plateau').bounding_box()['width']
            ok(w <= L - 16, f'{L} px : la forme {f} tient dans l’écran ({w:.0f} px)')
        if CAP: pg.screenshot(path=f'{CAP}/carte-{L}.png', full_page=True)

    # — texte agrandi (200 %) et mouvement réduit —
    pg = page(viewport={'width': 390, 'height': 800}, reduced_motion='reduce')
    pg.add_style_tag(content='html { font-size: 200% !important } .cv, .ec { font-size: 200% }')
    pg.wait_for_timeout(200)
    ok(pg.evaluate("() => document.documentElement.scrollWidth <= innerWidth + 1"), 'texte à 200 % : pas de défilement horizontal')
    pg.get_by_role('button', name='Retourner la carte : voir le verso').click(); pg.wait_for_timeout(100)
    t = pg.evaluate("() => getComputedStyle(document.querySelector('.cv-faces')).transform")
    ok(t in ('none', 'matrix(1, 0, 0, 1, 0, 0)') and pg.locator('.cv-verso').is_visible(), 'mouvement réduit : le verso s’affiche sans rotation')
    ok(not erreurs, f'aucune erreur dans la page {erreurs[:3]}')
    b.close()

n = sum(1 for c, _ in res if c); print(f"— {n}/{len(res)}")
