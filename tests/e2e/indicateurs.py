"""Les points lumineux du Disque (Cadre-Tambour), dans le vrai navigateur, sur la version construite.
A — Guide : motif vide → Importer ; ouvrage ouvert → Fils ; fil choisi → Points ; point en main → plus de suggestion ; rien n'est choisi à sa place.
B — Remplacer un fil : aperçu sur le vrai motif (historique), décision attendue (Fils hérite), Annuler rétablit, Confirmer garde.
C — Exporter le projet : en cours, puis prêt (téléchargement réel) ; en cas d'échec, une erreur accessible, jamais une réussite fictive.
Et : l'Orbe et « À voir » quand plusieurs informations attendent ; le bouton du dock porte l'état (un état, plusieurs représentations) ;
mobile (le point sur le rond, le bouton toujours cliquable), Nuit, mouvement réduit, clavier (nom accessible).
Usage : cd studio && npx vite build && npx vite preview --port 4620, puis  python3 tests/e2e/indicateurs.py   (CAPTURES=<dossier>)"""
import os, re
from playwright.sync_api import sync_playwright
B = os.environ.get('BASE', 'http://localhost:4620'); CAP = os.environ.get('CAPTURES')
res, erreurs = [], []
def ok(c, t): res.append(bool(c)); print(('OK ' if c else 'ÉCHEC ') + t, flush=True)
def cap(pg, nom):
    if CAP: pg.screenshot(path=f'{CAP}/indicateurs-{nom}.png')
MENU = '.pzt [data-presentation][role=menu]'
def item(pg, m): return pg.locator(f'{MENU} [data-mode="{m}"]').first
def etat(pg, m): return pg.evaluate(f"() => {{ const i = document.querySelector('{MENU} [data-mode=\"{m}\"] .lp-indic'); return i ? [i.dataset.etat, !!i.dataset.herite] : null; }}")
def cartouche(pg): return pg.locator('.pzt-cartouche').text_content() or ''
def racine(pg):
    for _ in range(5):
        if pg.locator(MENU).get_attribute('data-niveau') == '0': return
        item(pg, '__retour').click(); pg.wait_for_timeout(150)
def eloigner(pg):
    """la main quitte la couronne : le cartouche revient à l'information la plus importante"""
    pg.mouse.move(5, 300); pg.wait_for_timeout(1700)
def page(b, l=1440, h=900, offerte=True, mobile=False, motion='reduce', theme=''):
    ctx = b.new_context(viewport={'width': l, 'height': h}, has_touch=mobile, is_mobile=mobile, reduced_motion=motion, accept_downloads=True)
    ctx.add_init_script("localStorage.setItem('pointzero:visite-docks:v1', 'vue'); localStorage.setItem('pointzero:essai:cadre-tambour', '1'); localStorage.setItem('pointzero:disque:presentation', 'disque')")
    pg = ctx.new_page(); pg.set_default_timeout(8000); pg.on('pageerror', lambda e: erreurs.append(str(e)))
    pg.goto(B + '/atelier' + ('?offerte=5D-12342.g21.v0.1' if offerte else '') + (('&' if offerte else '?') + 'aime=' + theme if theme else ''))
    pg.wait_for_selector('.cadre[data-pret]', timeout=20000); pg.wait_for_timeout(5200 if offerte else 1500)   # la notification d'accueil passe
    return ctx, pg
def ouvrir(pg): pg.locator('.pzs-ouvrir-tambour').click(); pg.wait_for_selector('.pzt'); pg.wait_for_timeout(500)

with sync_playwright() as p:
    b = p.chromium.launch()
    try:
        # —— A : le Guide lumineux ——
        ctx, pg = page(b, offerte=False); ouvrir(pg)
        ok(etat(pg, 'importer') == ['guide', False] and 'Commencez par choisir une photographie ou un motif.' in cartouche(pg), 'A. motif vide : le point d’Importer s’allume (violet), le cartouche dit pourquoi')
        ok(pg.locator('#pzs-bloc').count() == 0 and pg.locator(MENU).get_attribute('data-niveau') == '0', 'A. rien n’est ouvert ni choisi à la place de la personne')
        ok('suggestion : Commencez par choisir' in (item(pg, 'importer').get_attribute('aria-label') or ''), 'A. le lecteur d’écran entend la suggestion avec la commande')
        cap(pg, '1-guide-importer'); ctx.close()
        ctx, pg = page(b); ouvrir(pg)
        ok(etat(pg, 'fils') == ['guide', False] and 'Choisissez les couleurs de votre ouvrage.' in cartouche(pg), 'A. un ouvrage ouvert : le Guide passe à Fils')
        ok(etat(pg, 'importer') is None or etat(pg, 'importer')[0] == 'repos', 'A. Importer redevient neutre')
        item(pg, 'fils').click(); pg.wait_for_timeout(250); pg.locator(f'{MENU} [data-mode^="famille-"]').first.click(); pg.wait_for_timeout(250)
        pg.locator(f'{MENU} [data-mode^="dmc-"]').first.click(); pg.wait_for_timeout(300); racine(pg); eloigner(pg)
        ok(etat(pg, 'points') == ['guide', False] and 'Choisissez un point' in cartouche(pg), 'A. un fil choisi : le Guide propose Points')
        item(pg, 'points').click(); pg.wait_for_timeout(250); item(pg, 'o-cross').click(); pg.wait_for_timeout(300); racine(pg); eloigner(pg)
        ok(pg.locator(f'{MENU} .lp-indic[data-etat="guide"]').count() == 0, 'A. un point en main : plus de suggestion, le Guide se tait')
        # la personne peut couper les suggestions
        pg.evaluate("localStorage.removeItem('pointzero:disque:suggestions')")
        # —— B : remplacer un fil, avec décision ——
        annuler_avant = pg.locator('[aria-label="Annuler"]').is_enabled()
        item(pg, 'fils').click(); pg.wait_for_timeout(200); item(pg, 'remplacer').click(); pg.wait_for_timeout(200)
        de = pg.locator(f'{MENU} [data-mode^="rempl-de-"]').first; de_code = de.get_attribute('data-mode').split('-')[-1]; de.click(); pg.wait_for_timeout(200)
        pg.locator(f'{MENU} [data-mode^="rempl-fam-"]').nth(1).click(); pg.wait_for_timeout(250)
        vers = pg.locator(f'{MENU} [data-mode^="rempl-vers-"]').nth(2); vers_code = vers.get_attribute('data-mode').split('-')[-1]; vers.click(); pg.wait_for_timeout(400)
        racine(pg); eloigner(pg)
        ok(etat(pg, 'fils') == ['action', True] and f'DMC {de_code} remplacé par DMC {vers_code}' in cartouche(pg), f'B. aperçu appliqué : décision attendue, Fils la signale (hérité), le cartouche dit DMC {de_code} → {vers_code}')
        ok(pg.locator('[aria-label="Annuler"]').is_enabled() and pg.locator('.pzt-cartouche').get_attribute('data-etat') == 'action', 'B. le vrai motif a changé (historique) ; la décision reste en attente')
        cap(pg, '2-decision')
        item(pg, 'fils').click(); pg.wait_for_timeout(200)
        ok([pg.locator(f'{MENU} [role=menuitem]').nth(k).get_attribute('data-mode') for k in (1, 2)] == ['remplacer-confirmer', 'remplacer-annuler'] and etat(pg, 'remplacer-confirmer') == ['action', False], 'B. Confirmer et Annuler en tête de Fils')
        item(pg, 'remplacer-annuler').click(); pg.wait_for_timeout(400); racine(pg); eloigner(pg)
        ok((etat(pg, 'fils') or ['?'])[0] in ('info', 'repos') and 'Remplacement annulé' in cartouche(pg) and pg.locator('[aria-label="Annuler"]').is_enabled() == annuler_avant, 'B. Annuler : l’aperçu est défait par l’historique, l’indicateur revient à une information')
        item(pg, 'fils').click(); pg.wait_for_timeout(200); item(pg, 'remplacer').click(); pg.wait_for_timeout(200)
        pg.locator(f'{MENU} [data-mode^="rempl-de-"]').first.click(); pg.wait_for_timeout(200); pg.locator(f'{MENU} [data-mode^="rempl-fam-"]').nth(1).click(); pg.wait_for_timeout(250)
        pg.locator(f'{MENU} [data-mode^="rempl-vers-"]').nth(2).click(); pg.wait_for_timeout(300); racine(pg)
        item(pg, 'fils').click(); pg.wait_for_timeout(200); item(pg, 'remplacer-confirmer').click(); pg.wait_for_timeout(400); racine(pg); eloigner(pg)
        ok('Remplacement confirmé' in cartouche(pg) and pg.locator('[aria-label="Annuler"]').is_enabled(), 'B. Confirmer : le remplacement est gardé (et reste annulable par l’historique)')
        # —— C : exporter le projet ——
        with pg.expect_download() as dl:
            item(pg, 'exporter').click(); pg.wait_for_timeout(200); item(pg, 'exp-projet').click()
            pg.wait_for_timeout(20); en_cours = etat(pg, 'exp-projet')
        fichier = dl.value.suggested_filename; pg.wait_for_timeout(300)
        ok(en_cours and en_cours[0] == 'encours', 'C. l’export commence : le point d’Exporter montre « en cours »')
        ok(fichier.endswith('.pointzero.json') and etat(pg, 'exp-projet') == ['reussite', False], f'C. le fichier est réellement prêt ({fichier}) : seulement alors, « terminé »')
        cap(pg, '3-export-pret'); racine(pg)
        pg.evaluate("() => { URL.createObjectURL = () => { throw new Error('stockage du navigateur indisponible'); }; }")
        item(pg, 'exporter').click(); pg.wait_for_timeout(200); item(pg, 'exp-projet').click(); pg.wait_for_timeout(500)
        ok(etat(pg, 'exp-projet') == ['erreur', False] and 'stockage du navigateur indisponible' in (item(pg, 'exp-projet').get_attribute('aria-label') or ''), 'C. échec réel : une erreur accessible (losange), aucune réussite annoncée')
        racine(pg); eloigner(pg)
        ok(etat(pg, 'exporter') == ['erreur', True] and 'L’export n’a pas abouti' in cartouche(pg), 'C. Exporter signale l’erreur de son sous-menu ; le cartouche la dit')
        # —— l'Orbe et « À voir » : une erreur et une décision attendent en même temps ——
        item(pg, 'fils').click(); pg.wait_for_timeout(200); item(pg, 'remplacer').click(); pg.wait_for_timeout(200)
        pg.locator(f'{MENU} [data-mode^="rempl-de-"]').first.click(); pg.wait_for_timeout(200); pg.locator(f'{MENU} [data-mode^="rempl-fam-"]').nth(1).click(); pg.wait_for_timeout(250)
        pg.locator(f'{MENU} [data-mode^="rempl-vers-"]').nth(4).click(); pg.wait_for_timeout(300); racine(pg); eloigner(pg)
        ok(pg.evaluate("() => document.querySelector('.pzt').classList.contains('pzt-attention')") and item(pg, 'a-voir').count() == 1, 'plusieurs informations attendent : l’Orbe le signale, « À voir » les rassemble')
        n_voir = pg.evaluate(f"() => document.querySelector('{MENU} [data-mode=\"a-voir\"]').textContent")
        cap(pg, '4-a-voir')
        item(pg, 'a-voir').click(); pg.wait_for_timeout(250)
        lignes = pg.locator(f'{MENU} [data-mode^="voir-"]'); nb = lignes.count()
        for k in range(nb): pg.locator(f'{MENU} [data-mode^="voir-"]').first.click() if pg.locator(f'{MENU} [data-mode^="voir-"]').count() else None; pg.wait_for_timeout(150)
        racine(pg); pg.wait_for_timeout(200)
        ok(nb >= 2 and not pg.evaluate("() => document.querySelector('.pzt').classList.contains('pzt-attention')"), f'consultées depuis « À voir » ({nb}) : l’Orbe s’apaise ; les états restent attachés à leurs commandes')
        ok(etat(pg, 'exporter') is not None and etat(pg, 'exporter')[0] == 'erreur', 'une erreur consultée reste visible sur sa commande tant qu’elle n’est pas résolue')
        # le dock porte le même état (hors du cercle)
        item(pg, 'retracter').click(); pg.wait_for_timeout(500)
        ok(pg.locator('.pzs-ouvrir-tambour .lp-indic[data-etat="erreur"]').count() == 1 and 'à voir' in (pg.locator('.pzs-ouvrir-tambour').get_attribute('aria-label') or '') or pg.locator('.pzs-ouvrir-tambour .lp-indic[data-etat="erreur"]').count() == 1, 'hors du cercle : le bouton Tambour du dock porte le même état')
        cap(pg, '5-dock'); ctx.close()

        # —— mobile, Nuit, mouvement réduit, animation ——
        ctx, pg = page(b, 390, 844, mobile=True); ouvrir(pg)
        JS = """() => { const i = document.querySelector('MENU [data-mode="fils"] .lp-indic'), r = i.getBoundingClientRect(), b = i.closest('[role=menuitem]').getBoundingClientRect();
          const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return [i.dataset.etat, r.left >= b.left - 1 && r.right <= b.right + 1 && r.top >= b.top - 1, !!e && !!e.closest('[data-mode="fils"]')]; }""".replace('MENU', MENU)
        d = pg.evaluate(JS)
        print('mobile', d)
        ok(d == ['guide', True, True], 'mobile : le point se pose sur le rond de Fils, et n’empêche jamais de toucher le bouton')
        cap(pg, '6-mobile'); ctx.close()
        ctx, pg = page(b, theme='nuit'); ouvrir(pg)
        ok(pg.evaluate("document.documentElement.dataset.aimeStudio") == 'nuit' and etat(pg, 'fils') == ['guide', False], 'Nuit : les mêmes états')
        cap(pg, '7-nuit'); ctx.close()
        ctx, pg = page(b, motion='no-preference'); ouvrir(pg); pg.wait_for_timeout(100)
        anim = pg.evaluate(f"() => getComputedStyle(document.querySelector('{MENU} [data-mode=\"fils\"] .lp-indic')).animationName")
        ok(anim == 'lp-indic-monte', 'mouvement normal : une montée courte à l’apparition, puis une lumière fixe (pas de boucle)')
        ok(pg.evaluate(f"() => getComputedStyle(document.querySelector('{MENU} [data-mode=\"fils\"] .lp-indic')).animationIterationCount") == '1', 'aucune pulsation permanente')
        ctx.close()
        ctx, pg = page(b, motion='reduce'); pg.evaluate("() => document.documentElement.setAttribute('data-pz-motion', 'reduce')"); ouvrir(pg)
        ok(pg.evaluate(f"() => getComputedStyle(document.querySelector('{MENU} [data-mode=\"fils\"] .lp-indic')).animationName") == 'none', 'mouvement réduit (Confort) : aucune animation')
        ctx.close()
    finally:
        b.close()
ok(not erreurs, 'aucune erreur de page ' + str(erreurs[:3]))
n = sum(res); print(f'— {n}/{len(res)}'); raise SystemExit(0 if n == len(res) else 1)
