"""Essai : un bloc Image piloté par le même Point (noyau inchangé). Dans le vrai navigateur :
- sélectionner l'image dans son Cadre, ouvrir son Point, recadrer, ajuster les couleurs, changer les dimensions, afficher, exporter, importer ;
- au clavier (ordinateur), au toucher (390 px), au toucher avec texte à 150 % (320 px) ;
- l'effet réel est vérifié sur les pixels de la toile et sur le fichier exporté.
Usage : cd studio && npx vite build && npx vite preview --port 4620, puis  python3 tests/e2e/image.py   (CAPTURES=<dossier>)"""
import os, sys, re, tempfile
from playwright.sync_api import sync_playwright
B = os.environ.get('BASE', 'http://localhost:4620'); CAP = os.environ.get('CAPTURES')
resultats, erreurs = [], []
def ok(c, nom): print(('OK ' if c else 'ÉCHEC ') + nom, flush=True); resultats.append(bool(c))
TEXTE_150 = "localStorage.setItem('pointzero:accessibility:v1', JSON.stringify({version:1,theme:'system',vision:'standard',fontScale:1.5,lineHeight:1.5,spacing:0,contrast:'normal',reduceMotion:true,enhancedFocus:false,readingGuide:false,privacyBlur:false,accent:'#7562ce'}));"
MENU = '[data-presentation][role=menu]'
def item(pg, m): return pg.locator(f'{MENU} [data-mode="{m}"]').first
def etat(pg): return pg.locator('[data-essai=etat]').inner_text()
def visible(pg):
    return pg.evaluate("""() => [...document.querySelectorAll('[data-presentation][role=menu] [role=menuitem]')].every(e => { const r = e.getBoundingClientRect();
        return r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight && r.width >= 24 && r.height >= 24; })""")
def moyenne(pg):
    """La clarté moyenne de la toile (0 à 255) : la preuve que le réglage agit sur l'image elle-même."""
    return pg.evaluate("""() => { const c = document.querySelector('.ei-toile'), x = c.getContext('2d'), d = x.getImageData(0, 0, c.width, c.height).data; let s = 0;
        for (let i = 0; i < d.length; i += 4 * 97) s += (d[i] + d[i + 1] + d[i + 2]) / 3; return s / (d.length / (4 * 97)); }""")

def ouvrir(b, l, h, toucher=False, texte=False):
    ctx = b.new_context(viewport={'width': l, 'height': h}, has_touch=toucher, is_mobile=toucher, reduced_motion='reduce', accept_downloads=True)
    if texte: ctx.add_init_script(TEXTE_150)
    pg = ctx.new_page(); pg.set_default_timeout(6000); pg.on('pageerror', lambda e: erreurs.append(str(e)))
    pg.goto(B + '/essai-image'); pg.wait_for_selector('.ei-cadre'); pg.wait_for_timeout(400)
    return ctx, pg

class Doigt:
    def __init__(s, pg, toucher): s.pg, s.t, s.vus = pg, toucher, True
    def presser(s, loc): (loc.tap() if s.t else loc.click()); s.pg.wait_for_timeout(200); s.vus &= (not s.pg.locator(MENU).count()) or visible(s.pg)
    def selectionner(s): s.presser(s.pg.locator('.ei-cadre'))
    def chemin(s, *ids):
        if not s.pg.locator(MENU).count(): s.presser(s.pg.locator('.lp-point').first)
        for m in ids: s.presser(item(s.pg, m))
    def fermer(s):
        for _ in range(5):
            if not s.pg.locator(MENU).count(): break
            s.pg.keyboard.press('Escape'); s.pg.wait_for_timeout(100)

class Clavier:
    def __init__(s, pg): s.pg, s.vus = pg, True
    def selectionner(s):
        s.pg.locator('.ei-cadre').focus(); s.pg.keyboard.press('Enter'); s.pg.wait_for_timeout(300)
    def vers(s, m):
        for _ in range(30):
            if s.pg.evaluate("() => document.activeElement?.dataset?.mode") == m: break
            s.pg.keyboard.press('ArrowRight')
        s.pg.keyboard.press('Enter'); s.pg.wait_for_timeout(200); s.vus &= (not s.pg.locator(MENU).count()) or visible(s.pg)
    def chemin(s, *ids):
        if not s.pg.locator(MENU).count():
            s.pg.keyboard.press('Tab'); s.pg.wait_for_timeout(100)
            if s.pg.evaluate("() => document.activeElement?.classList.contains('lp-point')") is False: s.pg.locator('.lp-point').first.focus()
            s.pg.keyboard.press('Enter'); s.pg.wait_for_timeout(250)
        for m in ids: s.vers(m)
    def fermer(s):
        for _ in range(5):
            if not s.pg.locator(MENU).count(): break
            s.pg.keyboard.press('Escape'); s.pg.wait_for_timeout(100)

def parcours(b, nom, l, h, mode, texte=False):
    ctx, pg = ouvrir(b, l, h, mode == 'toucher', texte)
    g = Clavier(pg) if mode == 'clavier' else Doigt(pg, mode == 'toucher')
    try:
        ok(pg.locator('.lp-point').count() == 0, f'{nom} · pas de Point tant que l’image n’est pas sélectionnée')
        g.selectionner()
        ok(pg.locator('.lp-point').count() == 1 and pg.locator('.ei-cadre').get_attribute('aria-pressed') == 'true', f'{nom} · l’image sélectionnée, son Point apparaît au bord du Cadre')
        g.chemin()
        racine = pg.evaluate("() => [...document.querySelectorAll('[data-presentation] [role=menuitem]')].map(e => e.dataset.mode)")
        ok(racine == ['confort', 'affichage', 'recadrer', 'couleurs', 'dimensions', 'exporter', 'importer'], f'{nom} · le premier cercle de l’image : {racine}')
        g.fermer()
        g.chemin('recadrer', 'cadre-16x9'); ok('recadrée 16:9' in etat(pg) and '960 × 540' in etat(pg), f'{nom} · Recadrer → 16:9 : {etat(pg)[:60]}')
        g.fermer(); avant = moyenne(pg)
        g.chemin('couleurs', 'luminosite', 'luminosite-40'); apres = moyenne(pg)
        ok('luminosité +40' in etat(pg) and apres > avant + 10, f'{nom} · Couleurs → Luminosité +40 : la toile s’éclaircit ({avant:.0f} → {apres:.0f})')
        g.fermer(); g.chemin('couleurs', 'nb')
        couleur = pg.evaluate("() => { const c = document.querySelector('.ei-toile'), d = c.getContext('2d').getImageData(c.width/2|0, c.height*0.85|0, 1, 1).data; return Math.max(Math.abs(d[0]-d[1]), Math.abs(d[1]-d[2])); }")
        ok('noir et blanc' in etat(pg) and couleur <= 2, f'{nom} · Couleurs → Noir et blanc : plus aucune teinte (écart {couleur})')
        g.fermer(); g.chemin('dimensions', 'echelle-50')
        ok(pg.evaluate("() => [document.querySelector('.ei-toile').width, document.querySelector('.ei-toile').height]") == [480, 270], f'{nom} · Dimensions → 50 % : la toile mesure 480 × 270 px')
        g.fermer(); g.chemin('affichage', 'tiers'); g.chemin('fond') if False else None
        ok(pg.locator('.ei-tiers').count() == 1, f'{nom} · Affichage → Grille des tiers')
        g.fermer()
        with pg.expect_download() as tele: g.chemin('exporter', 'export-png')
        f = tele.value; chemin = os.path.join(tempfile.mkdtemp(), f.suggested_filename); f.save_as(chemin)
        entete = open(chemin, 'rb').read(8)
        ok(f.suggested_filename == 'image-essai-480x270.png' and entete[:4] == b'\x89PNG', f'{nom} · Exporter → PNG : {f.suggested_filename}, un vrai PNG')
        g.fermer()
        if CAP: pg.screenshot(path=f'{CAP}/image-{nom}.png')
        # Importer : le fichier exporté revient comme nouvelle image
        with pg.expect_file_chooser() as fc: g.chemin('importer')
        fc.value.set_files(chemin); pg.wait_for_timeout(500)
        ok('480 × 270 px' in etat(pg) and 'image entière' in etat(pg) and 'image-essai' in etat(pg), f'{nom} · Importer : {etat(pg)[:70]}')
        g.chemin(); ok(item(pg, '__favoris').count() == 1, f'{nom} · Favoris apparaît après usage'); g.fermer()
        ok(g.vus, f'{nom} · chaque niveau s’ouvre entier dans l’écran, cibles d’au moins 24 px')
    except Exception as e:
        ok(False, f'{nom} · interrompu : ' + str(e).split('\n')[0][:160])
    ctx.close()

with sync_playwright() as p:
    b = p.chromium.launch()
    parcours(b, 'ordinateur-clavier', 1440, 900, 'clavier')
    parcours(b, 'ordinateur-souris', 1440, 900, 'souris')
    parcours(b, 'telephone-toucher', 390, 844, 'toucher')
    parcours(b, 'telephone-320-texte-150', 320, 740, 'toucher', texte=True)
    b.close()
ok(not erreurs, 'aucune erreur dans la page ' + str(erreurs[:2]))
print(f'— {sum(resultats)}/{len(resultats)}')
sys.exit(0 if all(resultats) else 1)
