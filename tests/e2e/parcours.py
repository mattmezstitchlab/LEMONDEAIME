"""Le Point contextuel comme dock radial : les trois parcours et le critère final, dans le vrai navigateur.
1. Point → Points → Croix / Demi-point / Point arrière / Gomme → l'outil réel.
2. Point → Fils → famille de couleurs → nuance DMC → le fil réel.
3. Point → Affichage → Symboles / À plat / Réaliste / Patron / Grille visible ou masquée.
Chaque parcours au clavier (ordinateur), au toucher (téléphone 390 px) et au toucher avec texte à 150 % (320 px).
Critère final : préparer et broder un motif uniquement avec le Point, sans dock du bas.
Usage : cd studio && npx vite build && npx vite preview --port 4620, puis  python3 tests/e2e/parcours.py   (CAPTURES=<dossier>)"""
import os, sys, re
from playwright.sync_api import sync_playwright
B = os.environ.get('BASE', 'http://localhost:4620'); CAP = os.environ.get('CAPTURES')
resultats, erreurs = [], []
def ok(c, nom): print(('OK ' if c else 'ÉCHEC ') + nom, flush=True); resultats.append(bool(c))
TEXTE_150 = "localStorage.setItem('pointzero:accessibility:v1', JSON.stringify({version:1,theme:'system',vision:'standard',fontScale:1.5,lineHeight:1.5,spacing:0,contrast:'normal',reduceMotion:true,enhancedFocus:false,readingGuide:false,privacyBlur:false,accent:'#7562ce'}));"

def ouvrir(b, l, h, toucher=False, texte=False):
    ctx = b.new_context(viewport={'width': l, 'height': h}, has_touch=toucher, is_mobile=toucher, reduced_motion='reduce')
    ctx.add_init_script("localStorage.setItem('pointzero:visite-docks:v1','vue');localStorage.setItem('pointzero:essai:outils-sur-le-bloc','1');" + (TEXTE_150 if texte else ''))
    pg = ctx.new_page(); pg.set_default_timeout(6000); pg.on('pageerror', lambda e: erreurs.append(str(e)))
    pg.goto(B + '/atelier'); pg.wait_for_selector('.lp-point'); pg.wait_for_timeout(500)
    return ctx, pg

MENU = '[data-presentation][role=menu]'
def item(pg, m): return pg.locator(f'{MENU} [data-mode="{m}"]').first
def niveau_visible(pg):
    """Tous les choix du niveau sont entiers dans l'écran, assez grands pour le doigt (24 px au moins, WCAG 2.5.8)."""
    return pg.evaluate("""() => [...document.querySelectorAll('[data-presentation][role=menu] [role=menuitem]')].every(e => { const r = e.getBoundingClientRect();
        return r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight && r.width >= 24 && r.height >= 24; })""")
def libelle(pg, m): return item(pg, m).get_attribute('aria-label') or ''

class Main:
    """Le doigt (tap) ou la souris (clic) ; compte les niveaux vérifiés."""
    def __init__(s, pg, toucher): s.pg, s.toucher, s.niveaux_ok = pg, toucher, True
    def presser(s, loc):
        loc.tap() if s.toucher else loc.click(); s.pg.wait_for_timeout(220)
        if s.pg.locator(MENU).count(): s.niveaux_ok &= niveau_visible(s.pg)
    def ouvrir(s):
        if not s.pg.locator(MENU).count(): s.presser(s.pg.locator('.lp-point').first)
    def chemin(s, *ids):
        s.ouvrir()
        for m in ids:
            for _ in range(4):
                if item(s.pg, m).count(): break
                s.presser(item(s.pg, '__suite'))
            s.presser(item(s.pg, m))
    def fermer(s):
        for _ in range(4):
            if not s.pg.locator(MENU).count(): break
            s.pg.keyboard.press('Escape'); s.pg.wait_for_timeout(120)

class Clavier:
    """Uniquement des touches : le focus sur le Point, Entrée, les flèches jusqu'au choix, Entrée."""
    def __init__(s, pg): s.pg, s.niveaux_ok = pg, True
    def vers(s, m):
        for _ in range(40):
            if s.pg.evaluate("() => document.activeElement?.dataset?.mode") == m: break
            if m != '__suite' and not item(s.pg, m).count() and item(s.pg, '__suite').count(): s.vers('__suite'); continue
            s.pg.keyboard.press('ArrowRight')
        s.pg.keyboard.press('Enter'); s.pg.wait_for_timeout(220)
        if s.pg.locator(MENU).count(): s.niveaux_ok &= niveau_visible(s.pg)
    def ouvrir(s):
        if not s.pg.locator(MENU).count():
            s.pg.locator('.lp-point').first.focus(); s.pg.keyboard.press('Enter'); s.pg.wait_for_timeout(250)
    def chemin(s, *ids):
        s.ouvrir()
        for m in ids: s.vers(m)
    def fermer(s):
        for _ in range(4):
            if not s.pg.locator(MENU).count(): break
            s.pg.keyboard.press('Escape'); s.pg.wait_for_timeout(120)

def verifier(g, chemin, mot):
    """On rouvre le Point et on suit le même chemin : le choix doit être dit « actif » (lu sur l'état réel de l'atelier)."""
    g.fermer(); g.chemin(*chemin[:-1])
    for _ in range(4):
        if item(g.pg, chemin[-1]).count(): break
        g.presser(item(g.pg, '__suite')) if isinstance(g, Main) else g.vers('__suite')
    bon = re.match(re.escape(mot) + r', actif', libelle(g.pg, chemin[-1])) is not None
    g.fermer(); return bon

def parcours(b, nom, l, h, mode, texte=False):
    toucher = mode == 'toucher'
    ctx, pg = ouvrir(b, l, h, toucher, texte)
    g = Clavier(pg) if mode == 'clavier' else Main(pg, toucher)
    try:
        # 1 · Points
        for m, mot in (('o-half', 'Demi-point'), ('o-back', 'Point arrière'), ('o-erase', 'Gomme'), ('o-cross', 'Croix')):
            g.chemin('points', m)
            ok(pg.locator(MENU).count() == 0 and verifier(g, ['points', m], mot), f'{nom} · Points → {mot} : l’outil réel est choisi')
        # l'annonce d'un niveau, pour le lecteur d'écran
        g.chemin('points'); annonce = pg.locator('.lp-annonce').first.inner_text()
        ok('Points' in annonce and 'choix' in annonce, f'{nom} · l’ouverture d’une famille est annoncée (« {annonce} »)')
        ok(pg.locator(MENU).get_attribute('aria-label') == 'Le Point · Points', f'{nom} · le menu dit où l’on est (« Le Point · Points »)')
        g.fermer()
        # 2 · Fils
        g.chemin('fils', 'famille-bleus')
        if CAP: pg.screenshot(path=f'{CAP}/{nom}-fils-bleus.png')
        nuance = pg.evaluate("() => [...document.querySelectorAll('[data-presentation][role=menu] [data-mode^=\"dmc-\"]')][3]?.dataset.mode")
        g.chemin(nuance)
        ok(nuance and verifier(g, ['fils', 'famille-bleus', nuance], 'DMC ' + nuance[4:]), f'{nom} · Fils → Bleus → {nuance} : le fil réel devient le fil actif')
        # 3 · Affichage
        g.chemin('affichage')
        if CAP: pg.screenshot(path=f'{CAP}/{nom}-affichage.png')
        for m, mot in (('symboles', 'Symboles'), ('vue-flat', 'À plat'), ('vue-real', 'Réaliste'), ('vue-pattern', 'Patron')):
            g.chemin(m) if isinstance(g, Main) else g.vers(m)
            ok(pg.locator(MENU).count() == 1 and libelle(pg, m).startswith(mot + ', actif'), f'{nom} · Affichage → {mot} : appliqué, le menu reste ouvert')
        g.chemin('grille') if isinstance(g, Main) else g.vers('grille')
        ok(pg.evaluate("() => localStorage.getItem('pointzero:grille')") == 'masquee' and 'masquée' in item(pg, 'grille').inner_text(), f'{nom} · Affichage → Grille masquée')
        g.chemin('grille') if isinstance(g, Main) else g.vers('grille')
        ok(pg.evaluate("() => localStorage.getItem('pointzero:grille')") == 'visible', f'{nom} · Affichage → Grille visible')
        g.fermer()
        ok(g.niveaux_ok, f'{nom} · chaque niveau s’ouvre entier dans l’écran, cibles d’au moins 24 px')
        ok(pg.locator('.pzs-bottom').count() == 0, f'{nom} · sans dock du bas')
    except Exception as e:
        ok(False, f'{nom} · parcours interrompu : ' + str(e).split('\n')[0][:160])
    ctx.close()

def critere_final(b):
    """Préparer (fil, croix, dessin, patron) puis broder (Marquer) : uniquement avec le Point du bloc."""
    ctx, pg = ouvrir(b, 1280, 860); g = Main(pg, False)
    try:
        g.chemin('fils', 'famille-rouges', 'dmc-321')
        g.chemin('points', 'o-cross')
        cadre = pg.evaluate("""() => { const c = getComputedStyle(document.querySelector('.cadre')), v = k => parseFloat(c.getPropertyValue(k));
            return { x: v('--fx0'), y: v('--fy0'), w: v('--fw'), h: v('--fh') }; }""")
        y = cadre['y'] + cadre['h'] * 0.12; x0 = cadre['x'] + cadre['w'] * 0.12; x1 = cadre['x'] + cadre['w'] * 0.4
        pg.mouse.move(x0, y); pg.mouse.down(); pg.mouse.move(x1, y, steps=12); pg.mouse.up(); pg.wait_for_timeout(400)
        g.chemin('fils')
        ok(item(pg, 'fils-motif').count() == 1, 'critère · le dessin à la croix est fait : « Fils du motif » apparaît')
        g.chemin('fils-motif'); ok(libelle(pg, 'dmc-321').startswith('DMC 321, actif'), 'critère · le motif est en DMC 321')
        g.fermer()
        g.chemin('affichage', 'vue-pattern'); g.fermer()
        g.chemin('broder', 'b-mark')
        pg.mouse.move(x0, y); pg.mouse.down(); pg.mouse.move(x1, y, steps=12); pg.mouse.up(); pg.wait_for_timeout(400)
        etiquette = pg.locator('.lp-point').first.get_attribute('aria-label') or ''
        m = re.search(r'patron brodé à (\d+) %', etiquette)
        ok(m and int(m.group(1)) == 100, f'critère · les cases dessinées sont brodées : le Point dit « {m.group(0) if m else etiquette[-60:]} »')
        g.chemin('broder', 'suivi'); pg.wait_for_timeout(300)
        ok(pg.locator('.pzs-bottom').count() == 0, 'critère · le dock du bas n’a jamais servi (il est absent)')
        if CAP: pg.screenshot(path=f'{CAP}/critere-final.png')
    except Exception as e:
        ok(False, 'critère · interrompu : ' + str(e).split('\n')[0][:160])
    ctx.close()

def favoris_rapides(b):
    """Fluidité : après un premier usage, le dernier outil, le dernier fil et le dernier affichage reviennent par Favoris, en trois gestes."""
    ctx, pg = ouvrir(b, 1440, 900); g = Main(pg, False)
    try:
        g.chemin('points', 'o-back'); g.chemin('fils', 'famille-rouges', 'dmc-321'); g.chemin('affichage', 'vue-pattern'); g.fermer()
        g.chemin('points', 'o-cross'); g.chemin('affichage', 'vue-real'); g.fermer()
        for cle, mot in (('fav-fils~famille-rouges~dmc-321', 'DMC 321'), ('fav-affichage~vue-pattern', 'Patron'), ('fav-points~o-back', 'Point arrière')):
            n0 = 0
            pg.locator('.lp-point').first.click(); n0 += 1; pg.wait_for_timeout(200)
            item(pg, '__favoris').click(); n0 += 1; pg.wait_for_timeout(200)
            ok(item(pg, cle).count() == 1, f'favoris · {mot} est proposé')
            item(pg, cle).click(); n0 += 1; pg.wait_for_timeout(220); g.fermer()
            chemin = cle[4:].split('~')
            ok(verifier(g, chemin, mot) and n0 == 3, f'favoris · {mot} rétabli en {n0} gestes, par sa vraie action')
        etat = pg.evaluate("() => Object.keys(localStorage).filter(k => k.startsWith('pointzero:point:usage:'))")
        ok(etat == ['pointzero:point:usage:bloc-broderie'], f'favoris · retenus sur l’appareil, sous une seule clé ({etat})')
    except Exception as e:
        ok(False, 'favoris · interrompu : ' + str(e).split('\n')[0][:160])
    ctx.close()

with sync_playwright() as p:
    b = p.chromium.launch()
    parcours(b, 'ordinateur-clavier', 1440, 900, 'clavier')
    parcours(b, 'ordinateur-souris', 1440, 900, 'souris')
    parcours(b, 'telephone-toucher', 390, 844, 'toucher')
    parcours(b, 'telephone-320-texte-150', 320, 740, 'toucher', texte=True)
    critere_final(b)
    favoris_rapides(b)
    b.close()
ok(not erreurs, 'aucune erreur dans la page ' + str(erreurs[:2]))
print(f'— {sum(resultats)}/{len(resultats)}')
sys.exit(0 if all(resultats) else 1)
