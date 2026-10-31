"""La convergence, testée EN LIGNE (ou en local) : une seule adresse, tout s'ouvre, rien ne casse.
Usage : BASE=https://... [PARTAGE=_vercel_share=...] python3 tests/e2e/convergence.py
PARTAGE : jeton de partage temporaire de Vercel (l'aperçu est protégé par l'authentification Vercel)."""
import os, re
from playwright.sync_api import sync_playwright
B = os.environ['BASE'].rstrip('/'); PARTAGE = os.environ.get('PARTAGE'); CAP = os.environ.get('CAPTURES')
ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
res = []
def ok(c, nom): res.append((bool(c), nom)); print(('✓ ' if c else 'ÉCHEC ') + nom)

with sync_playwright() as p:
    b = p.chromium.launch(args=ARGS)
    ctx = b.new_context(viewport={'width': 1366, 'height': 860})
    pg = ctx.new_page(); err = []
    pg.on('pageerror', lambda e: err.append(str(e)))
    if PARTAGE: pg.goto(f'{B}/?{PARTAGE}'); pg.wait_for_load_state('networkidle')

    # 1. une seule adresse : la racine ouvre le film
    pg.goto(B + '/'); pg.wait_for_selector('.lf-film', timeout=30000)
    ok(pg.url.rstrip('/').endswith('/studio/one/lumiere'), f'1. la racine ouvre le film LUMIERE ({pg.url})')
    ok(pg.get_by_role('button', name=re.compile('Passer')).is_visible(), '1. le film est facultatif : « Passer » visible dès la première image')
    if CAP: pg.screenshot(path=f'{CAP}/cv-1-film.png')

    # 2. le parcours : film → Première rencontre → .0NE → univers
    pg.wait_for_timeout(2000)
    pg.get_by_role('button', name=re.compile('Passer')).click(); pg.wait_for_selector('.one-marque', timeout=20000)
    ok('Bienvenue' in pg.locator('h1').first.text_content(), '2. Passer → la vraie Première rencontre')
    if CAP: pg.screenshot(path=f'{CAP}/cv-2-rencontre.png')
    pg.get_by_role('link', name='Continuer sans régler').click(); pg.wait_for_selector('.ac-porte', timeout=20000)
    ok(pg.url.endswith('/studio/accueil'), '2. → l’accueil de choix (le Disque ou le Cube)')
    pg.get_by_role('link', name=re.compile(r'^Le cercle \.0NE')).click(); pg.wait_for_load_state('networkidle'); pg.wait_for_timeout(800)
    ok('/one/univers' in pg.url and pg.locator('.dq .one-disque, .dq .dq-liste').count() > 0, f'2. → .0NE, le Disque universel ({pg.url})')
    if CAP: pg.screenshot(path=f'{CAP}/cv-3-univers.png')

    # 3. la navigation permanente
    ok(pg.locator('.cv-nav-bouton').count() == 0, '3. sur .0NE, le Disque est la navigation (pas de pastille par-dessus)')
    pg.goto(B + '/studio/tambour'); pg.wait_for_load_state('networkidle')
    nav = pg.locator('.cv-nav-bouton'); ok(nav.is_visible(), '3. navigation permanente visible ailleurs (Tambour)')
    nav.click(); ok(pg.locator('.cv-nav-panneau a').count() >= 4, '3. elle ouvre .0NE, Explorer, le film, les réglages')
    pg.keyboard.press('Escape'); ok(pg.locator('.cv-nav-panneau').count() == 0, '3. Échap la referme')

    # 4. Explorer : chaque accès interne s'ouvre, sans erreur et sans tomber dans la garde
    pg.goto(B + '/studio/explorer'); pg.wait_for_selector('.cv-explorer h1')
    ok(pg.locator('.cv-explorer h1').text_content() == 'Explorer les prototypes', '4. la page Explorer')
    cartes = pg.locator('a.cv-carte'); n = cartes.count()
    liens = [(cartes.nth(i).get_attribute('href'), cartes.nth(i).locator('.cv-nom').text_content(), cartes.nth(i).get_attribute('target')) for i in range(n)]
    ok(n >= 16, f'4. {n} accès directs')
    ok(pg.locator('.cv-carte .cv-statut').count() == pg.locator('.cv-carte').count(), '4. chaque accès porte son statut, en mots')
    if CAP: pg.screenshot(path=f'{CAP}/cv-4-explorer.png', full_page=True)
    for href, nom, cible in liens:
        if cible == '_blank': continue
        err.clear(); pg.goto(B + href if href.startswith('/') else href); pg.wait_for_load_state('networkidle'); pg.wait_for_timeout(1200)
        garde = pg.locator('.cv-erreur').count()
        corps = pg.evaluate('document.body.innerText.trim().length')
        ok(not garde and corps > 40 and not err, f'4. « {nom} » s’ouvre ({href}){" — " + err[0][:80] if err else ""}{" — garde" if garde else ""}')
        film = '/one/lumiere' in href or '/one/univers' in href or href.endswith('/accueil')   # le film : Passer/Quitter ; le Disque et l'accueil : ils sont la navigation
        ok(pg.locator('.cv-nav-bouton').count() == (0 if film else 1) and (not film or pg.get_by_role('button', name=re.compile('Passer|Quitter|Entrer|Univers')).count() + pg.get_by_role('link', name=re.compile('Quitter|.0NE|AIME')).count() >= 1), f'4. « {nom} » garde un retour ({"le Disque / Passer / Quitter" if film else "navigation"})')
        if CAP: pg.screenshot(path=f'{CAP}/cv-acces-{re.sub("[^a-z0-9]+", "-", nom.lower())[:30]}.png')

    # 5. une adresse inconnue ou cassée ne laisse jamais un écran vide
    pg.goto(B + '/studio/one/nexiste-pas'); pg.wait_for_load_state('networkidle'); pg.wait_for_timeout(800)
    ok(pg.locator('.cv-nav-bouton').count() == 1, '5. adresse inconnue : la navigation de retour reste là')
    ctx.close()

    # 6. téléphone
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, device_scale_factor=3)
    pg = ctx.new_page()
    if PARTAGE: pg.goto(f'{B}/?{PARTAGE}'); pg.wait_for_load_state('networkidle')
    pg.goto(B + '/studio/explorer'); pg.wait_for_selector('.cv-explorer h1')
    ok(pg.evaluate('document.documentElement.scrollWidth <= innerWidth'), '6. téléphone : Explorer sans défilement horizontal')
    bb = pg.locator('.cv-nav-bouton').bounding_box(); ok(bb and bb['height'] >= 44 and bb['width'] >= 44, '6. téléphone : navigation ≥ 44 px')
    if CAP: pg.screenshot(path=f'{CAP}/cv-6-mobile.png')
    pg.goto(B + '/studio/one/univers'); pg.wait_for_load_state('networkidle'); pg.wait_for_timeout(800)
    ok(pg.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), '6. téléphone : .0NE sans défilement horizontal')
    if CAP: pg.screenshot(path=f'{CAP}/cv-7-mobile-univers.png')
    ctx.close(); b.close()

n = sum(1 for r in res if r[0]); print(f'— {n}/{len(res)}')
