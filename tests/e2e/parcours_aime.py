"""Le parcours AIME de bout en bout : film → Première rencontre → accueil de choix → Disque .0NE | Cube ATLAS.
Usage : BASE=http://localhost:4631 NAVIGATEURS=chromium,webkit python3 tests/e2e/parcours_aime.py"""
import os, re
from playwright.sync_api import sync_playwright
B = os.environ['BASE'].rstrip('/'); NAVS = os.environ.get('NAVIGATEURS', 'chromium').split(',')
ATLAS = 'https://atlas-de-pique-de-coeur.vercel.app/'
res = []
def ok(c, nom): res.append((bool(c), nom)); print(('✓ ' if c else 'ÉCHEC ') + nom)
def args(n): return ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] if n == 'chromium' else []

with sync_playwright() as p:
    for n in NAVS:
        b = getattr(p, n).launch(args=args(n)); N = f'[{n}]'
        ctx = b.new_context(viewport={'width': 1366, 'height': 820}); pg = ctx.new_page(); err = []
        pg.on('pageerror', lambda e: err.append(str(e)))
        # 1. le film, puis « Passer » : la Première rencontre (préférences pas encore enregistrées)
        pg.goto(B + '/'); pg.get_by_role('button', name=re.compile('Passer')).click(timeout=60000)
        pg.wait_for_selector('.one-marque', timeout=20000)
        ok('/one/premiere-rencontre' in pg.url, f'{N} film → « Passer » → la Première rencontre')
        # 2. la Première rencontre jusqu'au bout → l'accueil de choix
        pg.get_by_role('button', name='Commencer').click()
        for _ in range(6): pg.get_by_role('button', name='Continuer').click(); pg.wait_for_timeout(150)
        pg.get_by_role('link', name=re.compile('Continuer vers l’accueil')).click(); pg.wait_for_selector('.ac-porte', timeout=20000)
        ok(pg.url.endswith('/studio/accueil'), f'{N} la Première rencontre terminée → l’accueil de choix')
        ok(pg.evaluate("JSON.parse(localStorage.getItem('aime:one:preferences:v1')).rencontre.terminee") is True, f'{N} les préférences sont enregistrées')
        # 3. l'accueil : deux objets, deux vraies destinations, des liens explicites
        one = pg.get_by_role('link', name=re.compile(r'^Le cercle \.0NE')); atlas = pg.get_by_role('link', name=re.compile(r'^Le carré ATLAS'))
        ok(one.count() == 1 and one.get_attribute('href').endswith('/studio/one/univers'), f'{N} le Disque mène à .0NE ({one.get_attribute("href")})')
        ok(atlas.get_attribute('href') == ATLAS and atlas.get_attribute('target') == '_blank' and 'noopener' in (atlas.get_attribute('rel') or ''), f'{N} le Cube mène au vrai ATLAS, nouvel onglet ({atlas.get_attribute("href")})')
        ok('nouvel onglet' in atlas.inner_text(), f'{N} le lien ATLAS annonce le nouvel onglet')
        ok(pg.get_by_role('link', name='Modifier mes préférences').count() == 1, f'{N} « Modifier mes préférences » est proposé')
        # 4. le Disque, puis retour au choix
        one.click(); pg.wait_for_selector('.dq', timeout=20000)
        ok('/studio/one/univers' in pg.url, f'{N} clic sur le Disque → le vrai .0NE')
        pg.get_by_role('link', name='Accueil AIME').click(); pg.wait_for_selector('.ac-porte', timeout=20000)
        ok(pg.url.endswith('/studio/accueil'), f'{N} « Accueil AIME » depuis le Disque → retour au choix')
        pg.go_back(); pg.wait_for_selector('.dq', timeout=20000); pg.go_back(); pg.wait_for_selector('.ac-porte', timeout=20000)
        ok(pg.url.endswith('/studio/accueil'), f'{N} le bouton Retour du navigateur fonctionne (Disque ↔ accueil)')
        # 5. le Cube : le vrai ATLAS s'ouvre dans un nouvel onglet
        with ctx.expect_page() as nouvelle: pg.get_by_role('link', name=re.compile(r'^Le carré ATLAS')).click()
        onglet = nouvelle.value; onglet.wait_for_load_state('commit', timeout=20000)
        ok(onglet.url.startswith(ATLAS), f'{N} clic sur le Cube → ATLAS ({onglet.url})'); onglet.close()
        ok(pg.url.endswith('/studio/accueil'), f'{N} l’accueil reste ouvert derrière ATLAS')
        # 6. revenir plus tard : le film, puis directement le choix (préférences déjà enregistrées)
        pg.goto(B + '/'); pg.get_by_role('button', name=re.compile('Passer')).click(timeout=60000)
        pg.wait_for_url(re.compile(r'/studio/accueil$'), timeout=20000)
        ok(True, f'{N} préférences enregistrées : film → « Passer » → directement le choix')
        # 7. modifier ses préférences : la Première rencontre reste accessible
        pg.get_by_role('link', name='Modifier mes préférences').click(); pg.wait_for_selector('.one-marque', timeout=20000); pg.wait_for_timeout(800)
        ok('/one/premiere-rencontre' in pg.url and pg.get_by_role('button', name='Revoir mes réglages').count() == 1, f'{N} « Modifier mes préférences » ouvre la Première rencontre (pas de redirection)')
        # 8. le thème : Nuit, gardé au rechargement
        pg.goto(B + '/studio/accueil'); pg.get_by_role('button', name='Nuit').click(); pg.reload(); pg.wait_for_selector('.ac')
        ok(pg.evaluate("document.querySelector('.ac').dataset.aime") == 'nuit', f'{N} le thème Nuit est gardé')
        pg.get_by_role('button', name='Jour').click()
        # 9. les adresses courtes et le registre
        r = pg.request.get(B + '/atlas', max_redirects=0)
        ok(r.status in (301, 302, 307, 308) and r.headers.get('location', '').startswith(ATLAS), f'{N} /atlas redirige vers ATLAS ({r.status})')
        pg.goto(B + '/accueil'); pg.wait_for_selector('.ac-porte'); ok(pg.url.endswith('/studio/accueil'), f'{N} /accueil → l’accueil de choix')
        pg.goto(B + '/studio/explorer'); pg.wait_for_timeout(1200)
        ok(pg.locator(f'a[href="{ATLAS}"]').count() >= 1 and pg.locator('a[href$="/studio/accueil"]').count() >= 1, f'{N} « Tous les accès » montre l’accueil et ATLAS')
        ok(not err, f'{N} aucune erreur de page ({err[:1]})')
        ctx.close()
        # 10. téléphone
        dev = p.devices['iPhone 14'] if n == 'webkit' else {'viewport': {'width': 390, 'height': 844}, 'is_mobile': True, 'has_touch': True, 'device_scale_factor': 3}
        ctx = b.new_context(**dev); pg = ctx.new_page(); pg.goto(B + '/studio/accueil'); pg.wait_for_selector('.ac-porte')
        ok(pg.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'{N} téléphone : aucun défilement horizontal')
        bb = [pg.locator('.ac-porte .ac-bouton').nth(i).bounding_box() for i in range(2)]
        ok(all(x and x['height'] >= 44 and x['x'] >= 0 and x['x'] + x['width'] <= 390 for x in bb), f'{N} téléphone : les deux boutons visibles, ≥ 44 px')
        pg.locator('.ac-porte').first.click(); pg.wait_for_selector('.dq', timeout=20000)
        a = pg.get_by_role('link', name='Accueil AIME'); bx = a.bounding_box()
        ok(a.is_visible() and bx['x'] + bx['width'] <= 390, f'{N} téléphone : « Accueil AIME » visible dans le Disque')
        ctx.close(); b.close()

n = sum(1 for r in res if r[0]); print(f'— {n}/{len(res)}')
