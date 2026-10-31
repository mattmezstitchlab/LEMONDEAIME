"""Le site Point Zéro (broderie seule) ne mélange rien : aucun mot ni lien des autres concepts, aucun appel au serveur AIME,
les anciennes adresses ramènent à l'accueil, la couronne de l'atelier garde Importer (PDF, Mes ouvrages) et Composer une rosace.
Usage : BASE=http://localhost:4700 python3 tests/e2e/point-zero/fuites.py"""
import os, re
from playwright.sync_api import sync_playwright
B = os.environ['BASE'].rstrip('/'); R = [0, 0]
def ok(c, m): R[0 if c else 1] += 1; print(('✓ ' if c else 'ÉCHEC ') + m, flush=True)
MOTS = re.compile(r'\.0NE|\.ONE|ATLAS|LUMIERE|Galerie|AIME Wedding|Le Monde AIME|lemondeaime|Naviguer|Entrer dans AIME|compte AIME|Explorer', re.I)
M = '[data-presentation][role=menu]'
with sync_playwright() as p:
    b = p.chromium.launch()
    for appareil, kw in (('ordinateur', {'viewport': {'width': 1440, 'height': 900}}), ('téléphone', {'viewport': {'width': 390, 'height': 844}, 'is_mobile': True, 'has_touch': True})):
        ctx = b.new_context(**kw); ctx.add_init_script("localStorage.setItem('pointzero:visite-docks:v1','vue')")
        pg = ctx.new_page(); api = []; err = []
        pg.on('request', lambda r: '/api/' in r.url and api.append(r.url)); pg.on('pageerror', lambda e: err.append(str(e)[:120]))
        for u, attendu in (('/', '/'), ('/atelier', '/atelier'), ('/tambour', '/tambour'), ('/galerie', '/'), ('/one/univers', '/'), ('/lumiere', '/')):
            pg.goto(B + u); pg.wait_for_timeout(3000)
            t = pg.locator('body').inner_text(); vus = sorted(set(m.group(0) for m in MOTS.finditer(t)))
            liens = pg.evaluate("[...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href'))")
            internes = sorted(set(l for l in liens if l and l.startswith('/') and l.split('?')[0] not in ('/', '/atelier', '/tambour')))
            ok(pg.url.replace(B, '').split('?')[0] == attendu and not vus and not internes, f'[{appareil}] {u} → {pg.url.replace(B, "")} · mots {vus or "aucun"} · liens hors broderie {internes or "aucun"}')
        pg.goto(B + '/atelier'); pg.wait_for_timeout(2500)
        modes = lambda: [x.get_attribute('data-mode') for x in pg.locator(f'{M} [data-mode]').all()]
        if appareil == 'ordinateur':
            ok('galerie' not in modes() and 'importer' in modes() and 'creer' in modes(), f'[{appareil}] couronne de l’atelier sans Galerie ({modes()})')
            pg.locator(f'{M} [data-mode="importer"]').first.click(); pg.wait_for_timeout(400)
            ok({'imp-pdf', 'imp-ouvrages', 'imp-rosace'} <= set(modes()), f'[{appareil}] Importer : Patron PDF, Mes ouvrages, Composer une rosace')
        ok(not api, f'[{appareil}] aucun appel au serveur AIME {api[:3]}')
        ok(not err, f'[{appareil}] aucune erreur {err[:2]}')
    b.close()
print(f'— {R[0]}/{R[0] + R[1]}')
