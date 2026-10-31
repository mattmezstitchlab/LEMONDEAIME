"""LES DEUX DOCKS (lot 1) : un dock du haut identique partout, un dock du bas contextuel, une marge basse commune.
Prouve, sur ordinateur (1440) et iPhone (390) : mêmes quatre entrées partout (et bonne entrée active) ; téléphone : bouton Menu explicite,
rien ne déborde, le menu s'ouvre, se ferme avec Échap ; les docks du bas vides ont disparu (reste « Remonter ») ;
le lecteur garde son état d'une page à l'autre et ses commandes restent accessibles sans dock contextuel ; le pied de page laisse la marge basse commune.
Les API sont simulées. Usage : npm run build && npx vite preview --port 4610, puis  python3 tests/e2e/docks.py     Captures : CAPTURES=<dossier>"""
import json, os, struct, tempfile, wave
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

B = os.environ.get('BASE', 'http://localhost:4610')
CAP = os.environ.get('CAPTURES')
resultats, erreurs = [], []
def ok(c, nom, detail=''):
    print(('OK ' if c else 'ÉCHEC ') + nom + (' — ' + str(detail) if detail and not c else ''), flush=True); resultats.append(bool(c))
ENTREES = ['Mariage|/aime-wedding', 'Prestataires|/reseau?domaine=mariage', 'Projets & Créations|/projets', 'Mon espace|/buro']
# page → (entrée active attendue, dock du bas attendu : 'contexte' ou 'aucun')
PAGES = {'/': (None, 'contexte'), '/aime-wedding': ('Mariage', 'contexte'), '/projets': ('Projets & Créations', 'contexte'), '/musique': ('Projets & Créations', 'contexte'),
         '/boutique': ('Projets & Créations', 'contexte'), '/reseau': ('Prestataires', 'aucun'), '/point-zero': ('Projets & Créations', 'aucun'),
         '/a-propos': (None, 'aucun'), '/a-plus': ('Projets & Créations', 'aucun'), '/buro': ('Mon espace', 'aucun'), '/entrer': ('Mon espace', 'aucun')}

def simuler(pg):
    def api(route):
        u = urlparse(route.request.url)
        rep = lambda code, o: route.fulfill(status=code, content_type='application/json', body=json.dumps(o))
        if u.path == '/api/auth/get-session': return rep(200, None)
        return rep(200, {'ok': False})
    pg.route('**/api/**', api)
def page(b, largeur):
    mobile = largeur < 700
    ctx = b.new_context(viewport={'width': largeur, 'height': 844 if mobile else 900}, reduced_motion='reduce', has_touch=mobile, is_mobile=mobile, device_scale_factor=2 if mobile else 1)
    pg = ctx.new_page(); pg.set_default_timeout(6000)
    pg.on('pageerror', lambda e: erreurs.append(str(e)))
    simuler(pg); return pg
def wav():
    f = os.path.join(tempfile.mkdtemp(), 'essai.wav')
    with wave.open(f, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(8000); w.writeframes(struct.pack('<h', 0) * 8000 * 3)
    return f

with sync_playwright() as p:
    b = p.chromium.launch()
    for largeur in (1440, 390):
        tag = ('[ordinateur] ' if largeur > 700 else '[iPhone] ')
        pg = page(b, largeur)
        for chemin, (actif, dock) in PAGES.items():
            pg.goto(B + chemin); pg.wait_for_selector('.dock-haut'); pg.wait_for_timeout(250)
            t = tag + chemin + ' : '
            entrees = pg.eval_on_selector_all('.dock-haut .rangee a.outil', 'els => els.map(e => e.textContent.trim() + "|" + e.getAttribute("href"))')
            ok(entrees == ENTREES, t + 'le dock du haut a les mêmes quatre entrées', entrees)
            cur = pg.eval_on_selector_all('.dock-haut .rangee a.outil[aria-current="page"]', 'els => els.map(e => e.textContent.trim())')
            ok(cur == ([actif] if actif else []), t + 'entrée active', cur)
            ok(pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), t + 'aucun débordement horizontal')
            ok(pg.locator('.carre-orbe').count() == 1 and pg.locator('.loupe').count() == 1 and pg.locator('.profil').count() == 1 and pg.locator('.dock-haut a[aria-label="AIME, accueil"]').count() == 1, t + 'logo, orbe, recherche et profil sont là')
            if largeur < 700:
                m = pg.locator('.dock-haut .menu-mobile')
                bx = m.bounding_box(); ok(m.is_visible() and bx and bx['x'] + bx['width'] <= largeur and bx['height'] >= 44, t + 'le bouton Menu est visible, entier, >= 44 px', bx)
                ok(all(pg.locator('.dock-haut ' + s).bounding_box()['x'] + pg.locator('.dock-haut ' + s).bounding_box()['width'] <= largeur for s in ('.loupe', '.profil')), t + 'recherche et profil restent dans l’écran')
            # le dock du bas est contextuel
            pg.evaluate("window.scrollTo(0, 0)")
            if dock == 'contexte':
                ok(pg.locator('.dock-bas .orbe-dock').count() == 1, t + 'dock du bas contextuel présent')
            else:
                ok(pg.locator('.dock-bas').count() == 0, t + 'pas de dock du bas vide')
                if chemin in ('/reseau', '/point-zero', '/a-propos', '/a-plus') and pg.evaluate('document.documentElement.scrollHeight') > pg.evaluate('window.innerHeight') * 1.6:
                    pg.evaluate("window.scrollTo(0, window.innerHeight * 1.2)"); pg.wait_for_timeout(300)
                    ok(pg.locator('.dock-bas-seul .remonter').count() == 1, t + '« Remonter » reste disponible après défilement')
                    pg.locator('.dock-bas-seul .remonter').click(); pg.wait_for_timeout(400)
                    ok(pg.evaluate("window.scrollY") < 5, t + '« Remonter » remonte')
            # marge basse commune : le pied de page laisse la place des éléments fixes
            pb = pg.evaluate("(() => { const e = document.querySelector('.pied'); return e ? parseFloat(getComputedStyle(e).paddingBottom) : null; })()")
            ok(pb is None or pb >= 96 + 36, t + 'marge basse commune sous le pied de page', pb)
            if CAP and chemin in ('/', '/reseau', '/projets', '/buro'):
                os.makedirs(CAP, exist_ok=True); pg.evaluate("window.scrollTo(0, 0)"); pg.screenshot(path=os.path.join(CAP, ('o' if largeur > 700 else 'i') + '-' + (chemin.strip('/') or 'accueil') + '.png'))
        # le menu sur téléphone, d'une page à l'autre, au clavier
        if largeur < 700:
            pg.goto(B + '/reseau'); pg.wait_for_selector('.menu-mobile')
            pg.locator('.menu-mobile').focus(); pg.keyboard.press('Enter'); pg.wait_for_selector('.bloc-entrees')
            ok(pg.locator('.menu-mobile').get_attribute('aria-expanded') == 'true', tag + 'le bouton Menu annonce « ouvert »')
            ok(pg.evaluate("document.activeElement.closest('.bloc-entrees') !== null"), tag + 'le focus passe dans le menu')
            ok(pg.locator('.bloc-entrees a[aria-current="page"]').inner_text().strip() == 'Prestataires', tag + 'le menu signale l’entrée courante')
            if CAP: pg.screenshot(path=os.path.join(CAP, 'i-menu-ouvert.png'))
            pg.keyboard.press('Escape'); pg.wait_for_selector('.bloc-entrees', state='detached')
            ok(pg.evaluate("document.activeElement.classList.contains('menu-mobile')"), tag + 'Échap referme et rend le focus')
            pg.locator('.menu-mobile').click(); pg.locator('.bloc-entrees a', has_text='Projets').click(); pg.wait_for_url('**/projets')
            ok(pg.locator('.bloc-entrees').count() == 0, tag + 'choisir une entrée referme le menu et change de page')
        # le lecteur garde son état d'une page à l'autre ; ses commandes restent accessibles sans dock contextuel
        pg.goto(B + '/musique'); pg.wait_for_selector('.orbe-dock')
        pg.locator('.orbe-dock').click(); pg.get_by_role('button', name='Musique').click()
        pg.locator('input[type=file]').set_input_files(wav()); pg.wait_for_timeout(600)
        pg.get_by_role('link', name='Prestataires').first.click() if largeur > 700 else (pg.locator('.menu-mobile').click(), pg.locator('.bloc-entrees a', has_text='Prestataires').click())
        pg.wait_for_url('**/reseau**'); pg.wait_for_timeout(400)
        ok(pg.locator('.dock-bas .orbe-dock').count() == 1, tag + 'sur une page sans dock de contexte, le lecteur garde son dock')
        ok(pg.locator('.dock-bas button[aria-label="Pause"], .dock-bas button[aria-label="Lecture"]').count() == 1 and 'essai' in pg.locator('.dock-bas .piste-dock').inner_text(), tag + 'même morceau, commandes accessibles après changement de page')
        if CAP and largeur < 700: pg.screenshot(path=os.path.join(CAP, 'i-lecteur-reseau.png'))
        pg.context.close()
    b.close()
ok(not erreurs, 'aucune erreur de page', erreurs[:3])
print('%d/%d contrôles réussis' % (sum(resultats), len(resultats))); raise SystemExit(0 if all(resultats) else 1)
