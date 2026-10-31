"""Lot 1 et 2 : la landing participative et le cadeau, vécus comme une personne qui ne brode pas.
1. descendre dans la landing (le défilement ne choisit jamais) ; 2. cinq rencontres avec l'Orbe ; 3. cinq choix (dont un au clavier) ;
4. la rosace évolue à chaque choix (vrai moteur, même recette) ; 5. le cadeau ; 6. l'atelier l'ouvre dans son cadre ;
7. dessiner dessus ; 8. recharger sans rien perdre ; 9. pas de doublon si l'on revient par le même lien ; et au téléphone.
Usage : cd studio && npx vite build && npx vite preview --port 4620, puis  python3 tests/e2e/participation.py   (CAPTURES=<dossier>)"""
import os, sys, json
from playwright.sync_api import sync_playwright
B = os.environ.get('BASE', 'http://localhost:4620'); CAP = os.environ.get('CAPTURES')
resultats, erreurs = [], []
def ok(c, nom): print(('OK ' if c else 'ÉCHEC ') + nom, flush=True); resultats.append(bool(c))
def page(b, l, h, mobile=False, reduit=False):
    ctx = b.new_context(viewport={'width': l, 'height': h}, has_touch=mobile, is_mobile=mobile, reduced_motion='reduce' if reduit else 'no-preference', accept_downloads=True)
    pg = ctx.new_page(); pg.set_default_timeout(8000)
    pg.on('pageerror', lambda e: erreurs.append(str(e))); pg.on('console', lambda m: erreurs.append(m.text) if m.type == 'error' and 'favicon' not in m.text else None)
    return ctx, pg
def aller(pg, sid, f=0.0):
    pg.evaluate(f"() => {{ const e = document.getElementById('{sid}'); scrollTo(0, e.getBoundingClientRect().top + scrollY + Math.max(0, e.offsetHeight - innerHeight) * {f}); }}"); pg.wait_for_timeout(350)
creation = lambda pg: pg.evaluate("() => JSON.parse(localStorage.getItem('pointzero:creation-visite:v1') || 'null')")
code = lambda pg: pg.locator('#ed-rosace .ed-recette code').inner_text()

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx, pg = page(b, 1440, 900)
    pg.goto(B + '/?edition'); pg.wait_for_timeout(900)
    ok(pg.locator('[data-rencontre]').count() == 5, 'cinq rencontres avec l’Orbe, réparties dans la visite')
    ordre = pg.evaluate("() => [...document.querySelectorAll('.ed-scene, [data-rencontre]')].map(e => e.id)")
    ok(ordre == ['hi-origine', 'hi-indiennes', 'or-forme', 'hi-mulhouse', 'or-lignes', 'hi-brodeuses', 'or-finesse', 'ed-fils', 'or-couleurs', 'ed-rosace', 'or-plein'], f'chaque rencontre suit le chapitre qui l’amène : {ordre}')
    # le défilement seul ne choisit rien
    pg.evaluate("async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise(r => requestAnimationFrame(r)); } }"); pg.wait_for_timeout(300)
    ok(creation(pg) is None and pg.locator('.or-pastille').count() == 0, 'tout défiler ne choisit rien : aucune réponse, pas de « Ma rosace »')
    ok('Choisir pour moi' in pg.locator('#ed-cadeau').inner_text(), 'sans choix, le cadeau propose de faire les choix, ou de laisser l’Orbe choisir')
    codes = [code(pg)]
    # 1 · la forme (cartes)
    aller(pg, 'or-forme'); pg.locator('[data-reponse="structure-1"]').click(); pg.wait_for_timeout(300)
    ok(pg.locator('#or-forme [role=radio][aria-checked=true]').get_attribute('data-reponse') == 'structure-1', 'rencontre 1 : Anneaux est choisi')
    ok('votre création existe déjà' in pg.locator('#or-forme .or-reaction').inner_text(), 'l’Orbe répond, et la création existe dès le premier choix')
    ok(pg.locator('.or-pastille').count() == 1 and '1/5' in pg.locator('.or-pastille').inner_text(), '« Ma rosace » apparaît : 1/5')
    codes.append(code(pg))
    # 2 · les lignes (le disque)
    aller(pg, 'or-lignes'); pg.locator('#or-lignes [data-mode="trace-3"]').click(); pg.wait_for_timeout(300); codes.append(code(pg))
    ok(pg.locator('#or-lignes [data-mode="trace-3"]').get_attribute('aria-label').startswith('Itératif, actif'), 'rencontre 2, dans le disque : Itératif est actif')
    # 3 · la finesse, au clavier seulement
    aller(pg, 'or-finesse'); pg.locator('#or-finesse [role=radio][tabindex="0"]').focus()
    pg.keyboard.press('ArrowRight'); pg.keyboard.press('ArrowRight'); pg.keyboard.press('Space'); pg.wait_for_timeout(300); codes.append(code(pg))
    ok(pg.locator('[data-reponse="echelle-2"]').get_attribute('aria-checked') == 'true', 'rencontre 3 au clavier : flèches puis Espace choisissent Fin')
    # 4 · les couleurs (écheveaux)
    aller(pg, 'or-couleurs'); pg.locator('[data-reponse="palette-0"]').click(); pg.wait_for_timeout(300); codes.append(code(pg))
    # 5 · le plein, sous la grande rosace
    aller(pg, 'ed-rosace', 0.95); pg.locator('[data-reponse="densite-0"]').click(); pg.wait_for_timeout(300); codes.append(code(pg))
    ok(len(set(codes)) == len(codes), f'la rosace change à chaque choix : {codes}')
    c = creation(pg)
    ok(c and c['choix'] == {'structure': 1, 'trace': 3, 'echelle': 2, 'palette': 0, 'densite': 0}, f'une recette unique, gardée : {c and c["choix"]}')
    ok(codes[-1].startswith('5D-24131.g'), f'la recette suit l’ordre du moteur (structure, tracé, densité, échelle, palette) : {codes[-1]}')
    # revenir modifier, depuis « Ma rosace »
    pg.locator('.or-pastille').click(); pg.wait_for_timeout(200)
    ok(pg.locator('.or-panneau').count() == 1 and pg.locator('.or-panneau li[data-etat="choisi"]').count() == 5, 'Ma rosace : les cinq choix, l’historique, la reprise')
    pg.locator('.or-panneau li').nth(3).locator('button').click(); pg.wait_for_timeout(500)
    pg.locator('[data-reponse="palette-2"]').click(); pg.wait_for_timeout(300)
    ok(creation(pg)['choix']['palette'] == 2 and len(creation(pg)['historique']) == 6, 'on revient modifier une réponse ; l’historique la garde')
    # le cadeau
    aller(pg, 'ed-cadeau'); pg.wait_for_timeout(300)
    ok(pg.locator('#ed-cadeau h2').inner_text() == 'Cette rosace est la vôtre.', 'le cadeau : « Cette rosace est la vôtre. »')
    cad = pg.locator('#ed-cadeau .cd-recette code').inner_text(); ok(cad == code(pg), f'le cadeau est la même recette que la rosace de la visite ({cad})')
    ok('Vous ne brodez pas' in pg.locator('#ed-cadeau').inner_text() and 'sans compte' in pg.locator('#ed-cadeau').inner_text(), 'pas besoin de broder ; pas de compte ; la conservation est dite sans promesse')
    with pg.expect_download() as d: pg.locator('#ed-cadeau button:has-text("Télécharger l’image")').click()
    ok(d.value.suggested_filename.endswith('.png'), f'télécharger l’image : {d.value.suggested_filename}')
    if CAP: pg.screenshot(path=f'{CAP}/participation-cadeau.png')
    # dans l'atelier
    pg.locator('#ed-cadeau button:has-text("Ouvrir ma rosace")').click(); pg.wait_for_url('**/atelier*'); pg.wait_for_timeout(2500)
    ok('offerte' not in pg.url, 'l’adresse est nettoyée après l’ouverture (pas de seconde ouverture au rechargement)')
    ok(pg.locator('.cadre-nom').inner_text() == 'Ma rosace offerte', 'l’atelier ouvre la rosace dans son Cadre')
    ok(pg.evaluate("() => localStorage.getItem('pointzero:rosace-offerte:v1')") == cad, 'la recette passée est bien celle du cadeau')
    if CAP: pg.screenshot(path=f'{CAP}/participation-atelier.png')
    # dessiner dessus : la croix, une case dans le coin du cadre
    box = pg.evaluate("() => { const c = getComputedStyle(document.querySelector('.cadre')), v = k => parseFloat(c.getPropertyValue(k)); return { x: v('--fx0'), y: v('--fy0'), w: v('--fw'), h: v('--fh') }; }")
    vue_a_plat = lambda: (pg.locator('.pzs-seg button:has-text("À plat")').first.click(), pg.mouse.move(5, 450), pg.wait_for_timeout(400))
    # la visite guidée s'ouvre à la première entrée : on la ferme, comme une personne, avant de dessiner
    if pg.get_by_role('button', name='Passer la visite').count(): pg.get_by_role('button', name='Passer la visite').first.click(); pg.wait_for_timeout(300)
    vue_a_plat(); pg.keyboard.press('x'); pg.wait_for_timeout(200)
    X, Y = box['x'] + box['w'] * 0.03, box['y'] + box['h'] * 0.03
    avant = pg.screenshot(clip={'x': X - 3, 'y': Y - 3, 'width': 6, 'height': 6})
    pg.mouse.click(X, Y); pg.mouse.move(5, 450); pg.wait_for_timeout(1500)
    apres = pg.screenshot(clip={'x': X - 3, 'y': Y - 3, 'width': 6, 'height': 6})
    ok(avant != apres, 'dessiner sur la rosace offerte : une croix posée')
    pg.wait_for_timeout(2500); pg.reload(); pg.wait_for_timeout(3000); vue_a_plat()
    box2 = pg.evaluate("() => { const c = getComputedStyle(document.querySelector('.cadre')), v = k => parseFloat(c.getPropertyValue(k)); return { x: v('--fx0'), y: v('--fy0'), w: v('--fw'), h: v('--fh') }; }")
    rel = pg.screenshot(clip={'x': box2['x'] + box2['w'] * 0.03 - 3, 'y': box2['y'] + box2['h'] * 0.03 - 3, 'width': 6, 'height': 6})
    ok(pg.locator('.cadre-nom').inner_text() == 'Ma rosace offerte' and rel == apres, 'après rechargement : la rosace et la croix ajoutée sont toujours là (stockage de cet appareil)')
    pg.goto(B + '/atelier?offerte=' + cad); pg.wait_for_timeout(2000)
    ok('déjà dans Mes ouvrages' in pg.locator('body').inner_text(), 'revenir par le même lien n’ajoute pas un second exemplaire')
    ctx.close()

    # au téléphone, au toucher, et en mouvement réduit
    ctx, pg = page(b, 390, 844, mobile=True, reduit=True)
    pg.goto(B + '/?edition'); pg.wait_for_timeout(900)
    for sid, sel in (('or-forme', '[data-reponse="structure-0"]'), ('or-lignes', '#or-lignes [data-mode="trace-2"]'), ('or-finesse', '[data-reponse="echelle-0"]'), ('or-couleurs', '[data-reponse="palette-3"]'), ('ed-rosace', '[data-reponse="densite-3"]')):
        aller(pg, sid); pg.locator(sel).tap(); pg.wait_for_timeout(250)
    ok(creation(pg)['choix'] == {'structure': 0, 'trace': 2, 'echelle': 0, 'palette': 3, 'densite': 3}, 'téléphone : cinq choix au toucher')
    larges = pg.evaluate("() => document.documentElement.scrollWidth - innerWidth")
    ok(larges <= 1, f'téléphone : pas de défilement horizontal ({larges} px)')
    recouvre = pg.evaluate("""() => { const m = document.querySelector('.or-ma').getBoundingClientRect(), n = document.querySelector('.pzh-bottom')?.getBoundingClientRect();
        return n ? (m.bottom > n.top && m.top < n.bottom && m.right > n.left && m.left < n.right) : false; }""")
    ok(not recouvre, 'téléphone : « Ma rosace » ne couvre pas le dock des sections')
    aller(pg, 'ed-cadeau'); ok(pg.locator('#ed-cadeau h2').inner_text() == 'Cette rosace est la vôtre.', 'téléphone : le cadeau')
    if CAP: pg.screenshot(path=f'{CAP}/participation-telephone-cadeau.png')
    ctx.close()
    b.close()
ok(not erreurs, 'aucune erreur dans la page ' + str(erreurs[:3]))
print(f'— {sum(resultats)}/{len(resultats)}')
sys.exit(0 if all(resultats) else 1)
