"""Phase E, première scène : le Point traverse la page (/essai-traversee), dans le vrai navigateur, sur la version construite.
Un seul Point : fermé dans le héros, déployé en Disque dans la scène « 01 · L'origine », ses commandes changent avec le lieu ;
chaque commande fait une vraie chose (la loupe brode, le nuancier dit les fils de l'image). Sur ordinateur, le curseur d'assistance
accompagne la souris sans capter un clic, et se désactive ; mouvement réduit : rien ne voyage ; téléphone : rien ne suit le doigt.
Usage : cd studio && npx vite build && npx vite preview --port 4620, puis  python3 tests/e2e/traversee.py   (CAPTURES=<dossier>)"""
import os
from playwright.sync_api import sync_playwright
B = os.environ.get('BASE', 'http://localhost:4620'); CAP = os.environ.get('CAPTURES')
res, erreurs = [], []
def ok(c, t): res.append(bool(c)); print(('OK ' if c else 'ÉCHEC ') + t, flush=True)
MENU = '[data-presentation][role=menu]'
def ids(pg): return pg.evaluate(f"() => [...document.querySelectorAll('{MENU} [role=menuitem]')].map(e => e.dataset.mode)")
def item(pg, m): return pg.locator(f'{MENU} [data-mode="{m}"]').first
def un_seul_point(pg): return pg.locator('.lp-contexte').count() == 1

with sync_playwright() as p:
    b = p.chromium.launch()
    try:
        ctx = b.new_context(viewport={'width': 1440, 'height': 900})
        pg = ctx.new_page(); pg.set_default_timeout(8000); pg.on('pageerror', lambda e: erreurs.append(str(e)))
        pg.goto(B + '/essai-traversee'); pg.wait_for_timeout(2500)
        ok(pg.locator('.tv-voyageur[data-forme=point] .lp-point').count() == 1 and un_seul_point(pg), 'héros : le Point apparaît (fermé) ; un seul Point dans la page')
        pg.locator('.tv-voyageur .lp-point').click(); pg.wait_for_timeout(300)
        ok(set(['commencer', 'atelier', 'curseur']) <= set(ids(pg)), f'héros : ses commandes ({", ".join(ids(pg))})')
        ok(pg.locator('.tv-curseur').count() == 0 and pg.locator('.tv-invite').count() == 1, 'curseur d’assistance : proposé au premier lancement, jamais imposé')
        item(pg, 'commencer').click(); pg.wait_for_timeout(350)
        ok(pg.locator('.tv-voyageur[data-forme=disque] .lp-anneau').count() == 1 and un_seul_point(pg) and pg.locator('main').get_attribute('data-lieu') == 'origine', 'Commencer l’histoire : saut direct, le Point est déjà déployé dans la scène (sans rejouer le voyage)')
        ok(pg.evaluate("parseFloat(getComputedStyle(document.querySelector('.tv-scene .hi-texte > *')).opacity)") == 1, 'le texte de la scène est entièrement opaque (lisibilité)')
        pg.wait_for_selector('.tv-scene .ed-brode[data-pret=oui]', timeout=15000); pg.wait_for_timeout(500)
        ok(set(['loupe', 'nuancier', 'atelier', 'haut']) <= set(ids(pg)) and 'commencer' not in ids(pg), f'L’origine : les commandes ont changé avec le lieu ({", ".join(ids(pg))})')
        if CAP: pg.screenshot(path=f'{CAP}/traversee-1-scene.png')
        item(pg, 'loupe').click(); pg.wait_for_timeout(500)
        ok(pg.locator('.tv-scene .ed-brode-fil').count() == 1, 'Loupe : la loupe se pose au centre, l’image se brode et dit son fil')
        item(pg, 'nuancier').click(); pg.wait_for_timeout(250)
        f = pg.locator(f'{MENU} [data-mode^="fil-"]').first; code = f.get_attribute('data-mode')[4:]; f.click(); pg.wait_for_timeout(300)
        ok(f'DMC {code}' in (pg.locator('.tv-fil').text_content() or ''), f'Nuancier : les fils réels de l’image ; DMC {code} est dit en toutes lettres')
        item(pg, '__retour').click(); pg.wait_for_timeout(200)
        # le curseur d'assistance : activé explicitement, il accompagne, ne capte rien, dit ce que le Point propose
        pg.evaluate("window.scrollTo(0, 0)"); pg.wait_for_timeout(300); pg.get_by_role('button', name='L’activer').click(); pg.wait_for_timeout(200)
        ok(pg.locator('.tv-invite').count() == 0 and pg.evaluate("localStorage.getItem('pointzero:essai:curseur-assistance')") == '1', 'activation explicite, puis préférence mémorisée')
        pg.locator('.tv-voyageur .lp-point').click(); pg.wait_for_timeout(200); item(pg, 'commencer').click(); pg.wait_for_timeout(400)
        pg.mouse.move(300, 450); pg.wait_for_timeout(200); pg.mouse.move(320, 470); pg.wait_for_timeout(600)
        c = pg.locator('.tv-curseur')
        ok(c.count() == 1 and c.evaluate("e => getComputedStyle(e).pointerEvents") == 'none' and c.get_attribute('aria-hidden') == 'true', 'curseur d’assistance : présent sur ordinateur, transparent aux clics, caché aux lecteurs d’écran')
        ok(pg.evaluate("() => !document.documentElement.style.cursor && getComputedStyle(document.body).cursor !== 'none'"), 'le pointeur du système reste le vôtre')
        ok('loupe' in (c.text_content() or '').lower(), f'sous la main, il dit ce que le Point propose ({c.text_content()})')
        bb = c.bounding_box(); dessous = pg.evaluate(f"() => document.elementFromPoint({bb['x'] + 5}, {bb['y'] + 5})?.className || ''")
        ok('tv-curseur' not in str(dessous), 'un clic là où passe l’anneau atteint la page')
        item(pg, 'curseur').click(); pg.wait_for_timeout(300)
        ok(pg.locator('.tv-curseur').count() == 0, 'Curseur d’assistance : non — il disparaît (le choix est retenu)')
        item(pg, 'haut').click(); pg.wait_for_timeout(350)
        ok(pg.locator('.tv-voyageur[data-forme=point]').count() == 1, 'Revenir à la une : le Disque redevient le Point')
        pg.reload(); pg.wait_for_timeout(1500)
        ok(pg.locator('.tv-curseur').count() == 0, 'après rechargement : le curseur reste désactivé')
        ctx.close()
        # mouvement réduit : rien ne voyage ; chaque scène a son Point, posé à sa place
        ctx = b.new_context(viewport={'width': 1440, 'height': 900}, reduced_motion='reduce')
        pg = ctx.new_page(); pg.on('pageerror', lambda e: erreurs.append(str(e))); pg.goto(B + '/essai-traversee'); pg.wait_for_timeout(1500)
        ok(pg.locator('.tv-voyageur, .tv-curseur').count() == 0 and pg.locator('.tv-ancre-une .lp-point').count() == 1 and pg.locator('.tv-ancre-scene .lp-anneau').count() == 1,
           'mouvement réduit : aucun voyage ni curseur ; le Point est posé dans le héros, le Disque dans la scène')
        ctx.close()
        # téléphone : rien ne voyage sur les titres ; le Point et le Disque sont posés dans leurs zones ; composition blanche
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True)
        pg = ctx.new_page(); pg.on('pageerror', lambda e: erreurs.append(str(e))); pg.goto(B + '/essai-traversee'); pg.wait_for_timeout(1800)
        ok(pg.locator('.tv-curseur, .tv-voyageur, .tv-invite').count() == 0, 'téléphone : ni curseur, ni voyage')
        pg.locator('.tv-ancre-une .lp-point').tap(); pg.wait_for_timeout(300)
        ok('commencer' in ids(pg), 'téléphone : le Point s’ouvre au toucher, dans sa zone')
        item(pg, 'commencer').tap(); pg.wait_for_timeout(600)
        ok(pg.locator('.tv-ancre-scene .lp-anneau').count() == 1 and pg.evaluate("getComputedStyle(document.querySelector('.tv-scene .hi-texte')).backgroundColor") == 'rgb(255, 255, 255)',
           'téléphone : le Disque posé dans la zone de la scène ; texte sur fond blanc')
        if CAP: pg.screenshot(path=f'{CAP}/traversee-2-mobile.png')
        ctx.close()
    finally:
        b.close()
ok(not erreurs, 'aucune erreur de page ' + str(erreurs[:3]))
n = sum(res); print(f'— {n}/{len(res)}'); raise SystemExit(0 if n == len(res) else 1)
