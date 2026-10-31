"""Le Tambour vivant, lot B (Patron → Toile), dans un vrai navigateur avec une caméra simulée qui filme une toile Aida dans son tambour.
Un ouvrage est d'abord dans Mes ouvrages (la rosace offerte). Puis : passer en « Superposer un patron », filmer la toile,
le patron se pose ; glisser un coin à la souris, en régler un au clavier ; le calque suit (perspective par quatre coins) ;
un coin qui retournerait le patron est refusé ; affichages, opacité, « à faire » ; l'alignement est retenu après rechargement ;
Recentrer ; retour à « Créer depuis la caméra » ; mobile 390 px.
Usage : cd studio && npx vite build && npx vite preview --port 4620, puis  CAMERA=<toile .y4m> python3 tests/e2e/superposer.py   (CAPTURES=<dossier>)"""
import os, re
from playwright.sync_api import sync_playwright
B = os.environ.get('BASE', 'http://localhost:4620'); CAP = os.environ.get('CAPTURES'); CAMERA = os.environ['CAMERA']
res, erreurs = [], []
def ok(c, t): res.append(bool(c)); print(('OK ' if c else 'ÉCHEC ') + t, flush=True)
def cap(pg, nom):
    if CAP: pg.screenshot(path=f'{CAP}/superposer-{nom}.png')
MENU = '[data-presentation][role=menu]'
def item(pg, m): return pg.locator(f'{MENU} [data-mode="{m}"]').first
def etat(pg): return pg.locator('[data-tambour=etat]').inner_text()
def chemin(pg, *ids):
    if not pg.locator(MENU).count(): pg.locator('.lp-bloc .lp-point').first.click(); pg.wait_for_timeout(200)
    for m in ids: item(pg, m).click(); pg.wait_for_timeout(250)
def fermer(pg):
    for _ in range(5):
        if not pg.locator(MENU).count(): break
        pg.keyboard.press('Escape'); pg.wait_for_timeout(100)
def coins(pg): return pg.evaluate("() => [...document.querySelectorAll('.tb-coin')].map(b => { const r = b.getBoundingClientRect(); return [Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)]; })")
def bornes(pg): return pg.evaluate("() => { const r = document.querySelector('.tb-calque').getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; }")
def colle(pg, tol=3):
    """le calque transformé occupe exactement le quadrilatère des quatre coins (ses bornes = celles des coins)"""
    q, b = coins(pg), bornes(pg); xs, ys = [p[0] for p in q], [p[1] for p in q]
    return all(abs(a - c) <= tol for a, c in zip(b, [min(xs), min(ys), max(xs), max(ys)]))
def attendre(pg, cond, ms=8000):
    for _ in range(ms // 200):
        if cond(): return True
        pg.wait_for_timeout(200)
    return cond()

with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', f'--use-file-for-fake-video-capture={CAMERA}'])
    try:
        ctx = b.new_context(viewport={'width': 1440, 'height': 900}, permissions=['camera'], reduced_motion='reduce')
        ctx.add_init_script("localStorage.setItem('pointzero:visite-docks:v1', 'vue')")
        pg = ctx.new_page(); pg.set_default_timeout(8000); pg.on('pageerror', lambda e: erreurs.append(str(e)))
        # un ouvrage dans Mes ouvrages : la rosace offerte
        pg.goto(B + '/atelier?offerte=5D-12342.g21.v0.1'); pg.wait_for_selector('.lp-point', timeout=20000); pg.wait_for_timeout(2500)
        # le Tambour, puis « Superposer un patron »
        pg.goto(B + '/tambour'); pg.wait_for_selector('.tb-tambour'); pg.wait_for_timeout(400)
        chemin(pg, 'superposer'); pg.wait_for_timeout(600)
        ok('mode=superposer' in pg.url and 'le patron posé dessus' in pg.locator('h1').inner_text(), 'le Point mène à « Superposer un patron »')
        ok(attendre(pg, lambda: 'Ma rosace offerte' in etat(pg) and '61 × 61' in etat(pg)), 'le dernier ouvrage de Mes ouvrages est posé d’office')
        pg.get_by_role('button', name='Filmer ma toile').click()
        ok(attendre(pg, lambda: 'caméra en direct' in etat(pg)), 'la caméra filme la toile dans le tambour')
        ok(pg.locator('.tb-calque').evaluate("c => getComputedStyle(c).transform.startsWith('matrix')") and colle(pg), 'le patron est posé, sa perspective tient sur les quatre coins')
        cap(pg, '1-pose')
        # glisser un coin à la souris : la perspective suit
        q0 = coins(pg); x, y = q0[2]
        pg.mouse.move(x, y); pg.mouse.down(); pg.mouse.move(x + 40, y + 25, steps=6); pg.mouse.up(); pg.wait_for_timeout(300)
        q1 = coins(pg)
        ok(abs(q1[2][0] - (x + 40)) <= 3 and abs(q1[2][1] - (y + 25)) <= 3 and q1[0] == q0[0], 'glisser le coin bas droite le déplace, les autres restent')
        ok(colle(pg), 'le calque suit : un vrai quadrilatère en perspective')
        # au clavier : Tab jusqu'au coin, flèches (Maj pour aller plus vite)
        pg.locator('.tb-coin[data-coin="0"]').focus()
        for _ in range(3): pg.keyboard.press('Shift+ArrowRight')
        pg.keyboard.press('ArrowDown'); pg.wait_for_timeout(200)
        q2 = coins(pg); d = pg.evaluate("document.querySelector('.tb-calque-fenetre').clientWidth")
        ok(abs((q2[0][0] - q1[0][0]) - .06 * d) <= 2 and abs((q2[0][1] - q1[0][1]) - .002 * d) <= 2, f'au clavier : Maj + flèche avance de 2 %, flèche seule de 0,2 % ({q2[0][0] - q1[0][0]} px)')
        # un coin qui retournerait le patron est refusé
        x, y = q2[0]; xb, yb = q2[2]
        pg.mouse.move(x, y); pg.mouse.down(); pg.mouse.move(xb + 30, yb + 30, steps=8); pg.mouse.up(); pg.wait_for_timeout(300)
        q3 = coins(pg)
        ok(pg.evaluate("""() => { const q = [...document.querySelectorAll('.tb-coin')].map(b => { const r = b.getBoundingClientRect(); return { x: r.left, y: r.top }; });
            let s = 0; for (let i = 0; i < 4; i++) { const a = q[i], b = q[(i + 1) % 4], c = q[(i + 2) % 4]; const z = Math.sign((b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x)); if (!s) s = z; else if (z !== s) return false; } return true; }""") and colle(pg), 'un coin tiré au-delà du coin opposé ne retourne jamais le patron')
        cap(pg, '2-aligne')
        # affichages, opacité, à faire
        chemin(pg, 'affichage', 'aff-symboles'); ok('symboles' in etat(pg), 'affichage : symboles')
        item(pg, 'aff-grille').click(); pg.wait_for_timeout(250); ok('grille seule' in etat(pg), 'affichage : la grille seule')
        item(pg, 'aff-couleur').click(); pg.wait_for_timeout(250); item(pg, 'aff-couleur').count() or None
        pg.locator(f'{MENU} [data-mode^="coul-"]').first.click(); pg.wait_for_timeout(300); ok(re.search(r'DMC \w+ seul', etat(pg)), 'affichage : une seule couleur DMC'); fermer(pg)
        cap(pg, '3-couleur')
        chemin(pg, 'opacite', 'opacite-75'); pg.wait_for_timeout(200)
        ok(pg.locator('.tb-calque').evaluate("c => getComputedStyle(c).opacity") == '0.75' and 'opacité 75 %' in etat(pg), 'opacité 75 %'); fermer(pg)
        chemin(pg, 'afaire'); pg.wait_for_timeout(300); ok(re.search(r'\d+ points à faire', etat(pg)), 'À faire : seulement les points qui restent (suivi de l’ouvrage)'); fermer(pg)
        # l'alignement est retenu pour cet ouvrage, sur cet appareil
        avant = coins(pg); pg.wait_for_timeout(700); pg.reload(); pg.wait_for_selector('.tb-coin', timeout=10000); pg.wait_for_timeout(800)
        ok(all(abs(a[0] - c[0]) <= 2 and abs(a[1] - c[1]) <= 2 for a, c in zip(avant, coins(pg))), 'après rechargement, l’alignement de cet ouvrage est retrouvé')
        chemin(pg, 'coins', 'coins-depart'); pg.wait_for_timeout(300); q = coins(pg); fermer(pg)
        ok(abs((q[0][0] + q[2][0]) / 2 - (q[1][0] + q[3][0]) / 2) <= 2 and colle(pg), 'Recentrer remet le patron droit, au centre du tambour')
        chemin(pg, 'creer'); pg.wait_for_timeout(500)
        ok('mode=' not in pg.url and pg.locator('.tb-calque').count() == 0 and 'en points de croix' in pg.locator('h1').inner_text(), 'retour à « Créer depuis la caméra »')
        ctx.close()

        # mobile 390 px
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True, permissions=['camera'], reduced_motion='reduce')
        ctx.add_init_script("localStorage.setItem('pointzero:visite-docks:v1', 'vue')")
        pg = ctx.new_page(); pg.on('pageerror', lambda e: erreurs.append(str(e)))
        pg.goto(B + '/atelier?offerte=5D-12342.g21.v0.1'); pg.wait_for_selector('.lp-point', timeout=20000); pg.wait_for_timeout(2500)
        pg.goto(B + '/tambour?mode=superposer'); pg.wait_for_selector('.tb-tambour'); pg.get_by_role('button', name='Filmer ma toile').tap()
        ok(attendre(pg, lambda: 'caméra en direct' in etat(pg) and pg.locator('.tb-coin').count() == 4), 'mobile : la toile filmée, le patron et ses quatre coins')
        ok(pg.evaluate("() => [...document.querySelectorAll('.tb-coin')].every(b => { const r = b.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.width >= 44; })"), 'mobile : les coins tiennent dans l’écran, cibles de 44 px')
        ok(pg.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'mobile : pas de défilement horizontal')
        cap(pg, '4-mobile'); ctx.close()
    finally:
        b.close()
ok(not erreurs, 'aucune erreur de page ' + str(erreurs[:3]))
n = sum(res); print(f'— {n}/{len(res)}'); raise SystemExit(0 if n == len(res) else 1)
