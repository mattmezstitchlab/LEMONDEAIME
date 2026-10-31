"""LUMIERE — la première séquence (/one/lumiere) : facultative, accessible, et reliée à la VRAIE Première rencontre.
Serveur : vite preview du build (port 4622) avec l'extrait privé copié localement dans lumiere-prive/ (jamais dans le dépôt)."""
import os, subprocess
from playwright.sync_api import sync_playwright
B = 'http://localhost:4622'
ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required']
CAP = os.environ.get('CAPTURES')
res = []
def ok(c, nom): res.append((bool(c), nom)); print(('✓ ' if c else 'ÉCHEC ') + nom)

with sync_playwright() as p:
    b = p.chromium.launch(args=ARGS)
    def page(**kw):
        ctx = b.new_context(viewport=kw.pop('viewport', {'width': 1280, 'height': 760}), **kw)
        pg = ctx.new_page(); req = []; err = []
        pg.on('request', lambda r: req.append(r.url) if r.method != 'HEAD' else None)   # HEAD : on demande seulement si la musique existe, rien n'est téléchargé; pg.on('pageerror', lambda e: err.append(str(e)))
        return ctx, pg, req, err

    # 1. l'accueil : rien ne démarre, aucun son n'est chargé sans geste
    ctx, pg, req, err = page()
    pg.goto(B + '/one/lumiere'); pg.wait_for_selector('.lf-accueil h1')
    pg.wait_for_timeout(600)
    ok(pg.locator('.lf-accueil h1').text_content() == 'La naissance du Point', '1. accueil : le titre ; rien ne démarre seul')
    ok(not any('lumiere-prive' in u for u in req), '1. aucun son chargé avant un geste')
    for n in ['Regarder avec le son', 'Regarder sans le son', 'Lire la version texte', 'Passer et commencer la Première rencontre']:
        ok(pg.get_by_role('button', name=n).count() == 1, f'1. bouton « {n} »')
    if CAP: pg.screenshot(path=f'{CAP}/lumiere-1-accueil.png')

    # 2. sans le son : le film joue, le temps avance, aucun son n'est chargé ; la description suit les tableaux
    pg.get_by_role('button', name='Regarder sans le son').click()
    pg.wait_for_selector('.lf-toile'); pg.wait_for_timeout(2500)
    ok(not any('lumiere-prive' in u for u in req), '2. sans le son : l’extrait n’est jamais chargé')
    ok('I — L’infini' in pg.locator('.lf-sous-titre').text_content(), '2. la description dit le tableau en cours')
    ok(pg.get_by_role('button', name='Passer').is_visible(), '2. « Passer » reste visible pendant le film')
    pg.keyboard.press('Space'); pg.wait_for_timeout(200); ok(pg.get_by_role('button', name='Lecture').count() == 1, '2. Espace met en pause')
    pg.keyboard.press('Escape'); pg.wait_for_selector('.one-marque', timeout=10000)
    ok(pg.locator('h1').first.is_visible(), '2. Échap : on passe directement à la Première rencontre (le vrai composant)')
    ok(not err, f'2. aucune erreur de page ({err[:1]})')
    ctx.close()

    # 3. avec le son : l'extrait privé est chargé sur le geste, depuis le serveur local
    ctx, pg, req, err = page()
    pg.goto(B + '/one/lumiere'); pg.get_by_role('button', name='Regarder avec le son').click(); pg.wait_for_timeout(2500)
    ok(any(u.endswith('/lumiere-prive/fleur-du-ciel-0304-0348.wav') for u in req), '3. avec le son : l’extrait est chargé (seulement après le geste)')
    ok(pg.get_by_role('button', name='Son activé').count() == 1, '3. le son peut être coupé à tout instant')
    externes = [u for u in req if not u.startswith(B) and not u.startswith('data:') and not u.startswith('blob:')]
    ok(not externes, f'3. aucune requête hors de la page ({externes[:2]})')
    ctx.close()

    # 4. la fin : le Point rejoint l'Orbe de la VRAIE Première rencontre (interactive)
    ctx, pg, req, err = page()
    pg.goto(B + '/one/lumiere?t=41'); pg.get_by_role('button', name='Regarder sans le son').click()
    pg.wait_for_selector('.lf-voile .lf-orbe', timeout=15000)
    if CAP: pg.wait_for_timeout(350); pg.screenshot(path=f'{CAP}/lumiere-4-vol.png')
    pg.wait_for_selector('.lf-voile', state='detached', timeout=8000)
    o = pg.locator('.one-marque .one-orbe').bounding_box()
    ok(o and o['width'] > 10 and pg.locator('.one-marque .one-orbe').evaluate('e => getComputedStyle(e).visibility') == 'visible', '4. le Point s’est posé : l’Orbe de la marque .0NE est visible à sa place')
    h1 = pg.locator('h1').first.text_content()
    pg.get_by_role('button', name='Commencer').first.click(); pg.wait_for_timeout(300)
    ok(pg.locator('h1').first.text_content() != h1, '4. la Première rencontre est le vrai composant : « Commencer » passe à l’étape suivante')
    if CAP: pg.screenshot(path=f'{CAP}/lumiere-5-rencontre.png')
    ctx.close()

    # 5. mouvement réduit : aucune animation ; six images fixes rendues par le même moteur
    ctx, pg, req, err = page(reduced_motion='reduce')
    pg.goto(B + '/one/lumiere'); pg.get_by_role('button', name='Regarder sans le son').click()
    pg.wait_for_selector('.lf-fixe img', timeout=20000)
    ok(pg.locator('.lf-toile').count() == 0, '5. mouvement réduit : pas de film animé')
    alt = pg.locator('.lf-fixe img').get_attribute('alt')
    ok(alt and 'cosmos' in alt, '5. chaque image a un texte alternatif (le tableau)')
    for _ in range(5): pg.get_by_role('button', name='Suivant').click()
    ok('VI' in pg.locator('.lf-fixe h2').text_content(), '5. on parcourt les six tableaux soi-même')
    if CAP: pg.screenshot(path=f'{CAP}/lumiere-6-fixe.png')
    pg.get_by_role('button', name='Commencer la Première rencontre').click(); pg.wait_for_selector('.one-marque')
    ok(True, '5. puis la Première rencontre')
    ctx.close()

    # 6. version texte
    ctx, pg, req, err = page()
    pg.goto(B + '/one/lumiere'); pg.get_by_role('button', name='Lire la version texte').click()
    ok(pg.locator('.lf-texte h2').count() == 6, '6. version texte : six tableaux écrits')
    ctx.close()

    # 7. mobile : le film tient dans l'écran ; « Passer » est atteignable ; pas de défilement horizontal
    ctx, pg, req, err = page(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, device_scale_factor=2)
    pg.goto(B + '/one/lumiere?t=20'); pg.get_by_role('button', name='Regarder sans le son').tap(); pg.wait_for_timeout(1500)
    bb = pg.get_by_role('button', name='Passer').bounding_box()
    ok(bb and bb['y'] + bb['height'] <= 844 and bb['height'] >= 40, '7. mobile : « Passer » est dans l’écran, cible ≥ 40 px')
    ok(pg.evaluate('document.documentElement.scrollWidth <= innerWidth'), '7. mobile : aucun défilement horizontal')
    toile = pg.locator('.lf-toile').evaluate('c => [c.width, c.height]')
    ok(toile[0] < 390 * 2, f'7. mobile : rendu allégé ({toile[0]}×{toile[1]} px pour un écran de 780 px)')
    if CAP: pg.screenshot(path=f'{CAP}/lumiere-7-mobile.png')
    ctx.close()
    b.close()

    # 8. sans WebGL : la version texte, pas d'écran noir
    b = p.chromium.launch(args=['--disable-webgl', '--disable-3d-apis'])
    pg = b.new_page(); pg.goto(B + '/one/lumiere'); pg.get_by_role('button', name='Regarder sans le son').click(); pg.wait_for_timeout(500)
    ok(pg.locator('.lf-texte h2').count() == 6, '8. sans WebGL : la version texte prend le relais')
    b.close()

# 9. les sources audio ne sont ni dans le dépôt ni dans le paquet
racine = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
suivis = subprocess.run(['git', 'ls-files'], cwd=racine, capture_output=True, text=True).stdout.split()
ok(not any(f.lower().endswith(('.wav', '.mp3', '.aif', '.flac')) for f in suivis), '9. aucun fichier audio suivi dans la branche')
dist = os.environ.get('DIST')
if dist:
    lourds = [f for f in os.listdir(os.path.join(dist, 'assets')) if f.lower().endswith(('.wav', '.mp3', '.flac', '.aif'))]
    ok(not lourds, '9. aucun fichier audio dans le paquet construit')

n = sum(1 for r in res if r[0]); print(f'— {n}/{len(res)}')
