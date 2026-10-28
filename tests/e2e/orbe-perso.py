"""LE MONDE AIME, Mon orbe (l'éditeur de l'orbe), côté interface, sans serveur ni API.
Usage : npm run build && npx vite preview --port 4610, puis  python3 tests/e2e/orbe-perso.py
Captures (facultatif) : CAPTURES=<dossier> python3 tests/e2e/orbe-perso.py"""
import json, os, sys
from playwright.sync_api import sync_playwright

B = os.environ.get('BASE', 'http://localhost:4610')
CAP = os.environ.get('CAPTURES')
resultats = []
def ok(c, nom):
    print(('OK ' if c else 'ÉCHEC ') + nom, flush=True); resultats.append(bool(c))
def capture(pg, nom):
    if CAP: os.makedirs(CAP, exist_ok=True); pg.screenshot(path=os.path.join(CAP, nom + '.png'))

def stockee(pg):
    return pg.evaluate("localStorage.getItem('aime-mon-orbe')")
def regler_couleur(pg, i, valeur):
    pg.evaluate("""([i, v]) => { const el = document.querySelectorAll('.editeur-orbe input[type=color]')[i];
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }""", [i, valeur])
def ouvrir_editeur(pg):
    if not pg.locator('#bloc-dock').count(): pg.click('button.carre-orbe')   # le bloc reste ouvert après un choix d'orbe ou « Garder »
    pg.click('button[aria-label^="Mon orbe :"]')
    pg.wait_for_selector('.editeur-orbe')

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1440, 'height': 900}, reduced_motion='reduce')
    pg = ctx.new_page(); pg.set_default_timeout(5000)
    erreurs = []
    pg.on('pageerror', lambda e: erreurs.append(str(e)))
    pg.goto(B + '/point-zero'); pg.wait_for_selector('button.carre-orbe')

    ok(stockee(pg) is None, 'au départ : aucune orbe personnelle gardée')
    ouvrir_editeur(pg)
    ok(pg.locator('.editeur-orbe').is_visible(), 'l’éditeur s’ouvre depuis l’orbe du dock du haut')
    ok(pg.locator('.apercu-orbes figure').count() == 2, 'l’aperçu montre les deux docks')
    ok(pg.evaluate("document.activeElement && document.activeElement.type") == 'range', 'le focus arrive sur le premier réglage')
    capture(pg, 'editeur-ouvert')

    # une couleur trop sombre pour le dock : refusée, avec la raison, et le bouton Garder annonce qu'il est inactif
    regler_couleur(pg, 0, '#222222')
    pg.wait_for_selector('.verdict-orbe.alerte')
    ok('trop sombre' in pg.inner_text('.verdict-orbe'), 'une couleur trop sombre est refusée avec sa raison')
    ok(pg.get_attribute('button:has-text("Garder mon orbe")', 'aria-disabled') == 'true', 'Garder mon orbe est marqué inactif')
    pg.click('button:has-text("Garder mon orbe")', force=True)   # aria-disabled : on peut toujours cliquer, rien n'est gardé
    ok(stockee(pg) is None and pg.locator('.editeur-orbe').is_visible(), 'Garder ne garde rien tant que le contraste est insuffisant')
    capture(pg, 'editeur-refus')

    # une couleur lisible : on garde
    regler_couleur(pg, 0, '#ff9a3c')
    pg.wait_for_selector('.verdict-orbe:not(.alerte)')
    pg.fill('.editeur-orbe input[type=range] >> nth=0', '7')
    pg.click('button:has-text("Garder mon orbe")')
    d = json.loads(stockee(pg) or 'null')
    ok(bool(d) and d['n'] == 7 and d['couleurs'][0] == '#ff9a3c', 'Mon orbe est gardée sur l’appareil (7 arcs, première couleur orange)')
    ok(pg.locator('button.carre-orbe.perso').count() == 1, 'le carré du dock du haut montre l’orbe personnelle')
    ok(pg.locator('button.carre-orbe').get_attribute('aria-label').endswith('orbe personnelle'), 'le nom accessible annonce l’orbe personnelle')
    ok(not pg.locator('.editeur-orbe').is_visible(), 'l’éditeur se referme après avoir gardé')

    # le dock du bas reprend la couleur
    teinte = pg.evaluate("[...document.querySelectorAll('.orbe-dock svg path')].some(x => x.getAttribute('stroke').toLowerCase() === '#ff9a3c')")
    ok(teinte, 'le dock du bas reprend la première couleur de l’orbe')
    capture(pg, 'orbe-gardee')

    # elle survit au rechargement ; Échap referme sans rien perdre
    pg.reload(); pg.wait_for_selector('button.carre-orbe.perso')
    ok(pg.locator('button.carre-orbe.perso').count() == 1, 'l’orbe personnelle survit au rechargement')
    ouvrir_editeur(pg)
    pg.keyboard.press('Escape')
    ok(not pg.locator('#bloc-dock').is_visible() if pg.locator('#bloc-dock').count() else True, 'Échap referme le bloc')
    ok(stockee(pg) is not None, 'Échap ne retire pas l’orbe gardée')

    # choisir une des six orbes d’origine remplace Mon orbe ; Retirer fait de même
    if not pg.locator('#bloc-dock').count(): pg.click('button.carre-orbe')
    pg.click('button[aria-label^="Orbe Calme"]')
    ok(stockee(pg) is None and pg.locator('button.carre-orbe.perso').count() == 0, 'choisir une orbe d’origine remplace Mon orbe')
    ouvrir_editeur(pg); pg.click('button:has-text("Garder mon orbe")')
    ouvrir_editeur(pg)
    pg.click('button:has-text("Retirer mon orbe")')
    ok(stockee(pg) is None, 'Retirer mon orbe revient aux orbes d’origine')

    # une valeur abîmée dans le stockage est ignorée, sans erreur
    pg.evaluate("localStorage.setItem('aime-mon-orbe', JSON.stringify({n: 3, w: 3, couleurs: ['#111111']}))")
    pg.reload(); pg.wait_for_selector('button.carre-orbe')
    ok(pg.locator('button.carre-orbe.perso').count() == 0, 'une orbe illisible sur le dock, relue du stockage, est ignorée')

    # téléphone : l'éditeur reste utilisable, sans défilement horizontal de la page
    m = b.new_context(viewport={'width': 375, 'height': 760}, reduced_motion='reduce'); mp = m.new_page(); mp.set_default_timeout(5000)
    mp.goto(B + '/point-zero'); mp.wait_for_selector('button.carre-orbe'); ouvrir_editeur(mp)
    ok(mp.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), 'à 375 px, aucun défilement horizontal avec l’éditeur ouvert')
    capture(mp, 'editeur-telephone')

    # texte à 130 % et contraste renforcé : l'éditeur reste dans la page, sans défilement horizontal
    g = b.new_context(viewport={'width': 1024, 'height': 760}, reduced_motion='reduce'); gp = g.new_page(); gp.set_default_timeout(5000)
    gp.add_init_script("localStorage.setItem('aime-mon-confort', JSON.stringify({taille: 130, espace: 'aere', contraste: 'renforce', mouvement: 'reduit', sons: 'off'}))")
    gp.goto(B + '/point-zero'); gp.wait_for_selector('button.carre-orbe'); ouvrir_editeur(gp)
    ok(gp.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), 'texte à 130 % : aucun défilement horizontal avec l’éditeur ouvert')
    capture(gp, 'editeur-130')
    ok(not erreurs, 'aucune erreur de page' + ('' if not erreurs else ' : ' + '; '.join(erreurs)))
    b.close()

print('%d/%d' % (sum(resultats), len(resultats)))
sys.exit(0 if all(resultats) else 1)
