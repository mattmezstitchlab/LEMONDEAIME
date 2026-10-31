"""Le Tambour vivant, lot A (Caméra → Broderie), dans un vrai navigateur avec une caméra simulée (une vidéo de fleurs).
La preuve demandée, pas à pas :
 1. je filme une fleur, elle apparaît dans le tambour ;   2. je bascule en aperçu point de croix ;
 3. je passe de 8 à 16 couleurs, puis à 6 ;                4. je remplace une nuance DMC ;
 5. je prends la photo et j'ouvre le résultat dans le vrai atelier ;   6. je retrouve le même motif après réouverture.
Et : le centre du Point ferme la caméra ; un refus de la caméra laisse tout utilisable (une photo suffit) ; mobile 390 px.
Usage : cd studio && npx vite build && npx vite preview --port 4620 (le serveur de développement n'affiche pas la grille de l'atelier en navigateur sans écran), puis
  CAMERA=<fichier .y4m> python3 tests/e2e/tambour.py   (CAPTURES=<dossier>)"""
import os, re
from playwright.sync_api import sync_playwright
B = os.environ.get('BASE', 'http://localhost:4620'); CAP = os.environ.get('CAPTURES'); CAMERA = os.environ['CAMERA']
PHOTO = os.path.join(os.path.dirname(__file__), '../../studio/public/images/histoire/met-palampore-2010-337.webp')
res, erreurs = [], []
def ok(c, t): res.append(bool(c)); print(('OK ' if c else 'ÉCHEC ') + t, flush=True)
def cap(pg, nom):
    if CAP: pg.screenshot(path=f'{CAP}/tambour-{nom}.png')
MENU = '[data-presentation][role=menu]'
def item(pg, m): return pg.locator(f'{MENU} [data-mode="{m}"]').first
def etat(pg): return pg.locator('[data-tambour=etat]').inner_text()
def fils(pg): m = re.search(r'(\d+) fils DMC', etat(pg)); return int(m.group(1)) if m else -1
def chemin(pg, *ids):
    if not pg.locator(MENU).count(): pg.locator('.lp-bloc .lp-point').first.click(); pg.wait_for_timeout(200)
    for m in ids: item(pg, m).click(); pg.wait_for_timeout(200)
def fermer(pg):
    for _ in range(5):
        if not pg.locator(MENU).count(): break
        pg.keyboard.press('Escape'); pg.wait_for_timeout(100)
def couleurs_toile(pg):
    """le nombre de couleurs distinctes dans le tambour (échantillon) : une image, pas une toile vide"""
    return pg.evaluate("""() => { const c = document.querySelector('.tb-toile'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, s = new Set();
        for (let i = 0; i < d.length; i += 4 * 211) s.add((d[i] >> 4) + ',' + (d[i+1] >> 4) + ',' + (d[i+2] >> 4)); return s.size; }""")
def attendre(pg, cond, ms=8000):
    for _ in range(ms // 200):
        if cond(): return True
        pg.wait_for_timeout(200)
    return cond()
def page(b, l, h, camera=True, mobile=False):
    """camera=False : un navigateur sans caméra simulée, où l'accès est refusé"""
    ctx = b.new_context(viewport={'width': l, 'height': h}, has_touch=mobile, is_mobile=mobile, permissions=['camera'] if camera else [], reduced_motion='reduce')
    ctx.add_init_script("localStorage.setItem('pointzero:visite-docks:v1', 'vue')")
    pg = ctx.new_page(); pg.set_default_timeout(8000); pg.on('pageerror', lambda e: erreurs.append(str(e)))
    pg.goto(B + '/tambour'); pg.wait_for_selector('.tb-tambour'); pg.wait_for_timeout(500)
    return ctx, pg

with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', f'--use-file-for-fake-video-capture={CAMERA}'])
    try:
        ctx, pg = page(b, 1440, 900)
        ok('pas encore d’image' in etat(pg) and pg.get_by_role('button', name='Ouvrir la caméra').is_visible(), 'au départ : la caméra est fermée, rien n’est demandé sans geste')
        cap(pg, '0-depart')
        # 1. je filme une fleur
        pg.get_by_role('button', name='Ouvrir la caméra').click()
        ok(attendre(pg, lambda: 'caméra en direct' in etat(pg) and fils(pg) > 0), '1. la caméra filme : la fleur apparaît dans le tambour, convertie en fils DMC')
        ok(couleurs_toile(pg) >= 4, '1. le tambour montre bien une image (plusieurs couleurs)')
        # 2. points de croix (la vue par défaut), puis la photo, puis comparer, puis retour aux points
        chemin(pg, 'vues', 'vue-photo'); pg.wait_for_timeout(300); ok('vue photo' in etat(pg), '2. la vue photo')
        item(pg, 'vue-comparer').click(); pg.wait_for_timeout(400); ok('vue comparée' in etat(pg), '2. comparer : la photo et les points côte à côte'); cap(pg, '1-comparer')
        item(pg, 'vue-points').click(); pg.wait_for_timeout(400); ok('vue points' in etat(pg), '2. l’aperçu point de croix'); fermer(pg)
        # 3. 8 → 16 → 6 couleurs
        ok(0 < fils(pg) <= 8, f'3. 8 couleurs au plus au départ ({fils(pg)})')
        chemin(pg, 'couleurs', 'couleurs-16'); ok(attendre(pg, lambda: '(16 au plus)' in etat(pg) and 8 < fils(pg) <= 16), f'3. 16 couleurs : plus de nuances ({fils(pg)})')
        item(pg, 'couleurs-6').click(); ok(attendre(pg, lambda: '(6 au plus)' in etat(pg) and 0 < fils(pg) <= 6), f'3. 6 couleurs ({fils(pg)})'); fermer(pg)
        # figer, pour régler tranquillement
        chemin(pg, 'figer'); pg.wait_for_timeout(500); ok('image figée' in etat(pg), 'Figer garde l’image'); fermer(pg)
        # 4. je remplace une nuance DMC
        chemin(pg, 'fils'); premier = pg.locator(f'{MENU} [data-mode^="fil-"]').first; avant = premier.get_attribute('aria-label')
        premier.click(); pg.wait_for_timeout(200); vers = pg.locator(f'{MENU} [data-mode^="vers-"]').first; nom_vers = vers.get_attribute('aria-label'); vers.click(); pg.wait_for_timeout(500)
        ok('1 fil échangé' in etat(pg), f'4. une nuance remplacée ({avant.split(",")[0]} → {nom_vers.split(",")[0]})'); fermer(pg)
        cap(pg, '2-fige')
        code_vers = re.search(r'DMC (\w+)', nom_vers).group(1)
        # le centre du Point ferme la caméra (raccourci du mode Tambour)
        pg.locator('.lp-bloc .lp-point').first.click(); pg.wait_for_timeout(200)
        ok(pg.locator(f'{MENU} .lp-centre-action').count() == 1, 'le centre du Point est l’accès caméra (dans ce mode seulement)'); cap(pg, '3-point')
        pg.locator(f'{MENU} .lp-centre-action').click(); pg.wait_for_timeout(400)
        ok(pg.locator('.tb-video').evaluate('v => !v.srcObject'), 'le centre ferme la caméra : plus aucun flux'); fermer(pg)
        ok('image figée' in etat(pg), 'l’image figée reste, sans caméra')
        # 5. Broder ce motif → l'atelier (la toile de l'atelier montre bien des points)
        chemin(pg, 'capturer'); pg.wait_for_url(re.compile(r'/atelier'), timeout=20000); pg.wait_for_selector('.lp-point', timeout=20000); pg.wait_for_timeout(2500)
        corps = pg.locator('body').inner_text()
        ok('Mon tambour vivant' in corps and re.search(r'64\s*×\s*64', corps), '5. le motif s’ouvre dans le vrai atelier (64 × 64 points)')
        ok(pg.evaluate("() => { const c = document.querySelector('canvas'), d = c.getContext('2d').getImageData(c.width/2 - 150, c.height/2 - 150, 300, 300).data, s = new Set(); for (let i = 0; i < d.length; i += 4 * 37) s.add(d[i] + ',' + d[i+1] + ',' + d[i+2]); return s.size; }") > 6, '5. la toile de l’atelier montre les points du motif')
        ok('Votre motif du Tambour est dans l’atelier' in corps, '5. l’atelier le dit, et l’ouvrage est enregistré sur l’appareil')
        code_de = re.search(r'DMC (\w+)', avant).group(1)
        pg.get_by_role('button', name=re.compile(r'^Fils')).first.click(); pg.wait_for_timeout(500); pg.get_by_text(re.compile(r'^Dans le motif')).first.click(); pg.wait_for_timeout(500)
        panneau = pg.locator('body').inner_text().split('Dans le motif')[1]
        ok(re.search(rf'\b{code_vers}\b', panneau) and not re.search(rf'\b{code_de}\b', panneau), f'5. dans les fils de l’ouvrage : DMC {code_vers} est là, DMC {code_de} n’y est plus')
        pg.keyboard.press('Escape')
        ok(pg.evaluate("() => !location.search.includes('tambour') && !sessionStorage.getItem('pointzero:tambour:capture:v1')"), '5. le dépôt est effacé après usage')
        cap(pg, '4-atelier')
        # 6. réouverture
        pg.reload(); pg.wait_for_selector('.lp-point', timeout=20000); pg.wait_for_timeout(2000)
        ok('Mon tambour vivant' in pg.locator('body').inner_text(), '6. après réouverture, le même motif est là')
        ctx.close()

        # un refus de la caméra : tout reste utilisable, une photo suffit
        b2 = p.chromium.launch(); ctx, pg = page(b2, 1440, 900, camera=False)
        pg.get_by_role('button', name='Ouvrir la caméra').click(); pg.wait_for_timeout(1200)
        ok('refusé' in pg.locator('.tb-note').inner_text() or 'Aucune caméra' in pg.locator('.tb-note').inner_text(), 'refus : la page le dit clairement')
        pg.set_input_files('input[type=file]', PHOTO)
        ok(attendre(pg, lambda: 'photo' in etat(pg) and fils(pg) > 0), 'refus : une photo de l’appareil suffit, convertie dans le tambour'); cap(pg, '5-photo')
        ctx.close(); b2.close()

        # mobile 390 px
        ctx, pg = page(b, 390, 844, mobile=True)
        pg.get_by_role('button', name='Ouvrir la caméra').tap()
        ok(attendre(pg, lambda: 'caméra en direct' in etat(pg) and fils(pg) > 0), 'mobile : la caméra filme dans le tambour')
        pg.locator('.lp-bloc .lp-point').first.tap(); pg.wait_for_timeout(300)
        ok(pg.evaluate("""() => [...document.querySelectorAll('[data-presentation][role=menu] [role=menuitem]')].every(e => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight && r.height >= 24; })"""), 'mobile : le menu du Point tient dans l’écran')
        cap(pg, '6-mobile'); fermer(pg)
        ok(pg.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'mobile : pas de défilement horizontal')
        ctx.close()
    finally:
        b.close()
ok(not erreurs, 'aucune erreur de page ' + str(erreurs[:3]))
n = sum(res); print(f'— {n}/{len(res)}'); raise SystemExit(0 if n == len(res) else 1)
