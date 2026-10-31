"""L'orbe flottante (« Naviguer », en bas à droite de toutes les pages) : seulement l'orbe nacré, sur fond transparent.
Contrôle : aucun fond, bordure, ombre ni flou sur le bouton ; l'orbe garde sa taille (18 px), son dégradé et son halo ; la zone tactile reste de 44 px au moins ;
le nom accessible « Naviguer » reste ; le menu s'ouvre au clic, au toucher et au clavier, Échap le referme et rend le focus ; l'anneau de focus clavier est visible.
Usage : npm run build && npx vite preview --port 4610, puis  python3 tests/e2e/orbe-flottante.py"""
import os, sys
from playwright.sync_api import sync_playwright
B = os.environ.get('BASE', 'http://localhost:4610')
res, erreurs = [], []
def ok(c, nom, d=''):
    print(('OK ' if c else 'ÉCHEC ') + nom + ((' — ' + str(d)) if (d and not c) else ''), flush=True); res.append(bool(c))
PAGES = ['/', '/buro', '/projets', '/aime-wedding', '/reseau', '/boutique', '/entrer']
with sync_playwright() as p:
    b = p.chromium.launch()
    for nom, l in (('téléphone', 390), ('ordinateur', 1440)):
        mob = l < 700
        ctx = b.new_context(viewport={'width': l, 'height': 844 if mob else 900}, has_touch=mob, is_mobile=mob); pg = ctx.new_page(); pg.set_default_timeout(6000)
        pg.on('pageerror', lambda e: erreurs.append(str(e)))
        pg.route('**/api/**', lambda r: r.fulfill(status=200, content_type='application/json', body='null'))
        for ch in PAGES:
            t = f'{nom} · {ch} · '
            pg.goto(B + ch); pg.wait_for_selector('.cv-nav-bouton')
            s = pg.eval_on_selector('.cv-nav-bouton', 'e => { const c = getComputedStyle(e), r = e.getBoundingClientRect(); return { bg: c.backgroundColor, bord: c.borderTopWidth, ombre: c.boxShadow, flou: c.backdropFilter, w: r.width, h: r.height } }')
            ok(s['bg'] == 'rgba(0, 0, 0, 0)' and s['bord'] == '0px' and s['ombre'] == 'none' and s['flou'] == 'none', t + 'le bouton n’a ni fond, ni bordure, ni ombre, ni flou', s)
            ok(s['w'] >= 44 and s['h'] >= 44, t + 'zone tactile >= 44 x 44 px (invisible)', s)
            o = pg.eval_on_selector('.cv-orbe', 'e => { const c = getComputedStyle(e), r = e.getBoundingClientRect(); return { w: r.width, h: r.height, img: c.backgroundImage.slice(0, 15), ombre: c.boxShadow !== "none" } }')
            ok(o['w'] == 18 and o['h'] == 18 and o['img'] == 'radial-gradient' and o['ombre'], t + 'l’orbe garde sa taille (18 px), son dégradé nacré et son halo', o)
            ok(pg.get_by_role('button', name='Naviguer').count() == 1, t + 'nom accessible « Naviguer »')
            ok(pg.evaluate('document.documentElement.scrollWidth <= innerWidth'), t + 'pas de défilement horizontal')
        pg.goto(B + '/'); pg.wait_for_selector('.cv-nav-bouton')
        btn = pg.locator('.cv-nav-bouton')
        # le menu : toucher / clic
        (btn.tap() if mob else btn.click()); pg.wait_for_selector('.cv-nav-panneau')
        n = pg.locator('.cv-nav-panneau a').count(); ok(n >= 3 and btn.get_attribute('aria-expanded') == 'true', f'{nom} · le menu s’ouvre ({n} liens)')
        panneau = pg.locator('.cv-nav-panneau').bounding_box(); bb = btn.bounding_box()
        ok(panneau['y'] + panneau['height'] <= bb['y'] + 1 and panneau['x'] + panneau['width'] <= l, f'{nom} · le menu se pose au-dessus de l’orbe, dans l’écran')
        pg.keyboard.press('Escape'); pg.wait_for_selector('.cv-nav-panneau', state='detached')
        ok(pg.evaluate('document.activeElement && document.activeElement.classList.contains("cv-nav-bouton")'), f'{nom} · Échap referme le menu et rend le focus à l’orbe')
        # le clavier : Tab jusqu'à l'orbe, anneau visible, Entrée ouvre
        pg.goto(B + '/'); pg.wait_for_selector('.cv-nav-bouton')
        pg.evaluate('document.querySelector(".cv-nav-bouton").focus()'); pg.keyboard.press('Shift+Tab'); pg.keyboard.press('Tab')
        ring = pg.eval_on_selector('.cv-nav-bouton', 'e => { const c = getComputedStyle(e); return c.outlineStyle + " " + c.outlineWidth }')
        ok(pg.evaluate('document.activeElement.classList.contains("cv-nav-bouton")') and ring.startswith('solid') and ring.endswith('3px'), f'{nom} · focus clavier : anneau visible autour de l’orbe', ring)
        pg.keyboard.press('Enter'); pg.wait_for_selector('.cv-nav-panneau'); ok(True, f'{nom} · Entrée ouvre le menu')
        pg.keyboard.press('Escape')
        # « Mon confort » (l'orbe du dock du haut) fonctionne toujours
        pg.get_by_role('button', name='Menu AIME et Mon confort', exact=False).first.click(); pg.wait_for_selector('#bloc-dock')
        ok('confort' in pg.inner_text('#bloc-dock').lower(), f'{nom} · Mon confort s’ouvre toujours depuis le dock du haut')
        ctx.close()
    b.close()
ok(not erreurs, 'aucune erreur JavaScript non gérée', erreurs)
n = sum(res); print(f'\n{n}/{len(res)} contrôles réussis'); sys.exit(0 if n == len(res) else 1)
