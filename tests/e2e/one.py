""".0NE — la Première rencontre et la mosaïque, dans le vrai navigateur, sur la version construite.
Preuves : un réglage change réellement le Disque (aperçu, géométrie) et se retrouve après rechargement ; le parcours est
facultatif, interrompable et reprenable ; aucun diagnostic n'est enregistré ; la mosaïque est lue dans le registre (un univers de
démonstration y entre sans composant de plus) ; les statuts sont dits ; un univers en préparation ne s'ouvre pas.
Usage : cd studio && npx vite build && npx vite preview --port 4620, puis  python3 tests/e2e/one.py   (CAPTURES=<dossier>)"""
import os, re, json
from playwright.sync_api import sync_playwright
B = os.environ.get('BASE', 'http://localhost:4620'); CAP = os.environ.get('CAPTURES')
res, erreurs = [], []
def ok(c, t): res.append(bool(c)); print(('OK ' if c else 'ÉCHEC ') + t, flush=True)
def cap(pg, nom):
    if CAP: pg.screenshot(path=f'{CAP}/one-{nom}.png')
MENU = '.one-disque [role=menu]'
def ids(pg): return pg.evaluate(f"() => [...document.querySelectorAll('{MENU} [role=menuitem]')].map(e => e.dataset.mode)")
def taille_titre(pg): return pg.evaluate("parseFloat(getComputedStyle(document.querySelector('.one-apercu-titre')).fontSize)")
def rond(pg): return pg.evaluate(f"document.querySelector('{MENU} [data-mode=confort] .lp-rond').getBoundingClientRect().width")
def bouton(pg, nom): return pg.get_by_role('button', name=nom, exact=True).first
def continuer(pg): bouton(pg, 'Continuer').click(); pg.wait_for_timeout(350)

with sync_playwright() as p:
    b = p.chromium.launch()
    try:
        ctx = b.new_context(viewport={'width': 1440, 'height': 900})
        pg = ctx.new_page(); pg.set_default_timeout(8000); pg.on('pageerror', lambda e: erreurs.append(str(e)))
        pg.goto(B + '/one/premiere-rencontre'); pg.wait_for_selector('.one-disque .pzt'); pg.wait_for_timeout(400)
        ok(pg.get_by_role('heading', name='Bienvenue dans .0NE.').count() == 1 and pg.get_by_role('link', name='Continuer sans régler').count() == 1, 'accueil : Bienvenue dans .0NE ; Commencer ou Continuer sans régler (aucun compte)')
        ok(set(['confort', 'u-broderie', 'u-bureau', 'tous-les-univers', 'premiere-rencontre']) <= set(ids(pg)), f'le Disque réel au centre de la page : {", ".join(ids(pg))}')
        cap(pg, '0-accueil')
        bouton(pg, 'Commencer').click(); pg.wait_for_timeout(400)
        # A — un réglage change réellement l'aperçu et la géométrie du Disque
        t0, r0 = taille_titre(pg), rond(pg)
        bouton(pg, '150 %').click(); pg.wait_for_timeout(300)
        ok(taille_titre(pg) > t0 * 1.4, f'Taille des caractères 150 % : l’aperçu au centre grandit ({round(t0)} → {round(taille_titre(pg))} px)')
        bouton(pg, 'Très grandes').click(); pg.wait_for_timeout(400)
        ok(rond(pg) > r0 * 1.2, f'Taille des commandes : les commandes de la couronne grandissent ({round(r0)} → {round(rond(pg))} px)')
        ok(pg.evaluate("""() => { const d = document.querySelector('.one-disque .pzt'), s = getComputedStyle(d); const x = parseFloat(s.getPropertyValue('--pzt-x')), y = parseFloat(s.getPropertyValue('--pzt-y')), R = parseFloat(s.getPropertyValue('--pzt-ro'));
            return [...document.querySelectorAll('.one-disque [role=menuitem] .lp-rond')].every(e => { const b = e.getBoundingClientRect(), o = d.getBoundingClientRect();
              return [[b.left, b.top], [b.right, b.top], [b.left, b.bottom], [b.right, b.bottom]].every(([px, py]) => Math.hypot(px - o.left - x, py - o.top - y) <= R + 1); }); }"""),
           'tout reste dans la couronne, même avec de très grandes commandes')
        bouton(pg, 'Nuit').click(); bouton(pg, 'Renforcé').click(); pg.wait_for_timeout(300)
        ok(pg.locator('.one').get_attribute('data-aime') == 'nuit' and pg.evaluate("document.documentElement.dataset.pzContrast") == 'strong', 'Thème Nuit et contraste renforcé : appliqués à la page')
        cap(pg, '1-confort-visuel')
        pg.reload(); pg.wait_for_selector('.one-disque .pzt'); pg.wait_for_timeout(400)
        ok(pg.locator('#one-etape').text_content().startswith('01') and taille_titre(pg) > t0 * 1.4 and rond(pg) > r0 * 1.2 and pg.locator('.one').get_attribute('data-aime') == 'nuit',
           'après rechargement : la même étape, les mêmes réglages, le même Disque (reprenable)')
        bouton(pg, '100 %').click(); bouton(pg, 'Standard').click(); bouton(pg, 'Jour').click(); bouton(pg, 'Normal').click(); pg.wait_for_timeout(200)
        continuer(pg)
        # B — sonore : sans diagnostic, un signal visuel toujours
        bouton(pg, 'Écouter un exemple').click(); pg.wait_for_timeout(200)
        ok(pg.locator('.one-signal').count() == 1 and 'pas un test auditif' in pg.content(), 'Confort sonore : l’exemple montre un signal visuel ; ce n’est pas un test auditif')
        continuer(pg)
        # C — interaction : la validation en deux temps, réellement
        bouton(pg, 'Confirmer avant d’agir').click(); pg.wait_for_timeout(200)
        pg.locator('.one-centre').get_by_role('button', name='Agir').click(); pg.wait_for_timeout(150)
        attente = pg.locator('.one-centre').get_by_role('button', name='Confirmer').count() == 1
        pg.locator('.one-centre').get_by_role('button', name='Confirmer').click(); pg.wait_for_timeout(150)
        ok(attente and 'Fait 1 fois' in pg.locator('.one-centre').text_content(), 'Interaction : « Confirmer avant d’agir » demande un second geste dans l’aperçu')
        bouton(pg, 'En liste écrite').click(); pg.wait_for_timeout(200)
        ok(pg.evaluate("localStorage.getItem('pointzero:point:presentation')") == 'liste', 'Menu du Point en liste écrite : la préférence du Point (la même clé que l’atelier)')
        continuer(pg)
        # D — besoins concrets, jamais un diagnostic
        pg.get_by_role('checkbox', name='J’ai besoin de commandes plus grandes.').click()
        bouton(pg, 'Appliquer ces propositions').click(); pg.wait_for_timeout(300)
        stocke = pg.evaluate("JSON.stringify(localStorage)")
        ok(pg.evaluate("document.documentElement.dataset.oneCibles") == 'grandes' and 'commandes-grandes' in stocke, 'Besoins : « commandes plus grandes » propose et applique des cibles plus grandes')
        ok(not any(m in stocke.lower() for m in ['sla', 'sclérose', 'handicap', 'naissance', 'diagnostic']), 'rien de médical ni de date de naissance n’est enregistré')
        continuer(pg)
        pg.get_by_label('Prénom ou pseudonyme').fill('Camille'); pg.wait_for_timeout(200)
        ok('Bonjour Camille' in pg.locator('.one-centre').text_content(), 'Vous : le prénom apparaît au centre du Disque (facultatif, local)')
        continuer(pg)
        # F — le Disque se compose des univers choisis
        pg.get_by_role('checkbox', name='Culture').click(); pg.wait_for_timeout(300)
        ok('u-culture' in ids(pg), 'Vos univers : Culture rejoint la couronne')
        cap(pg, '2-univers')
        continuer(pg)
        ok(pg.get_by_role('heading', name='Camille, tout est prêt.').count() == 1 and 'cet appareil seulement' in pg.locator('.one-resume').text_content(), 'Prêt : résumé réel ; la synchronisation est dite locale')
        cap(pg, '3-pret')
        pg.get_by_role('link', name=re.compile('^Continuer vers (l’accueil|\\.0NE)')).click(); pg.wait_for_selector('.ac-porte, .dq')
        if pg.locator('.ac-porte').count(): pg.get_by_role('link', name=re.compile(r'^Le cercle \.0NE')).click()   # aperçu privé : l'accueil du Disque et du Cube
        pg.wait_for_selector('.dq'); ok('/one/univers' in pg.url, '« Continuer vers l’accueil » puis le Disque : le Disque universel')
        pg.goto(B + '/one/mosaique'); pg.wait_for_selector('.om-grille'); pg.wait_for_timeout(500)   # l'ancienne mosaïque, gardée
        ok('u-culture' in ids(pg) and 'Bonjour Camille' in pg.locator('.one-disque').first.text_content(), 'Entrer dans mon .0NE : le même Disque, les mêmes réglages, sur la mosaïque')
        # la mosaïque : lue dans le registre
        n = pg.locator('.om-case').count()
        prives = pg.locator('.om-case[data-univers=galerie], .om-case[data-univers=carte-vivante]').count()   # la Galerie et la Carte vivante : aperçus privés seulement
        ok(n >= (14 if prives else 12) and pg.locator('.om-case[data-statut=disponible]').count() >= 1 and pg.locator('.om-case .om-statut').count() == n, f'mosaïque : {n} cases, chacune avec son statut')
        pg.goto(B + '/one/mosaique?demo=1'); pg.wait_for_selector('.om-grille'); pg.wait_for_timeout(300)
        ok(pg.locator('.om-case').count() == n + 1 and 'Démonstration' in pg.locator('[data-univers=jardin-demo]').text_content(), 'un univers de démonstration ajouté au registre reçoit sa case, annoncé comme tel')
        pg.locator('[data-univers=mariage] .om-voir').click(); pg.wait_for_timeout(300)
        d = pg.get_by_role('dialog')
        ok(d.count() == 1 and 'En préparation' in d.text_content() and d.get_by_role('link', name='Ouvrir Mariage').count() == 0 and 'hors .0NE' in d.text_content(), 'Mariage : en préparation, rien ne s’ouvre ; le site AIME Wedding est signalé hors de .0NE')
        pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
        ok(pg.get_by_role('dialog').count() == 0 and pg.evaluate("document.activeElement?.classList.contains('om-voir')"), 'Échap ferme la présentation ; le focus revient à la case')
        pg.locator('[data-univers=broderie] .om-voir').click(); pg.wait_for_timeout(400)
        ok(pg.get_by_role('link', name='Ouvrir Broderie').get_attribute('href').endswith('/atelier') and pg.locator('.om-panneau .one-disque .pzt').count() == 1, 'Broderie : disponible, son Disque réel, et l’atelier s’ouvre')
        cap(pg, '4-presentation')
        ctx.close()
        # téléphone : la rencontre et la mosaïque restent lisibles
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True)
        pg = ctx.new_page(); pg.on('pageerror', lambda e: erreurs.append(str(e)))
        pg.goto(B + '/one/premiere-rencontre'); pg.wait_for_selector('.one-disque .pzt'); pg.wait_for_timeout(400)
        ok(pg.evaluate("document.documentElement.scrollWidth <= 390"), 'téléphone : aucune barre de défilement horizontale (rencontre)')
        pg.goto(B + '/one/mosaique'); pg.wait_for_selector('.om-grille'); pg.wait_for_timeout(400)
        ok(pg.evaluate("document.documentElement.scrollWidth <= 390"), 'téléphone : aucune barre de défilement horizontale (mosaïque)')
        cap(pg, '5-mobile')
        ctx.close()
    finally:
        b.close()
ok(not erreurs, 'aucune erreur de page ' + str(erreurs[:3]))
n = sum(res); print(f'— {n}/{len(res)}'); raise SystemExit(0 if n == len(res) else 1)
