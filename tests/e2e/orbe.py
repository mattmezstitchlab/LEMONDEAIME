"""Le studio de broderie, dans un vrai navigateur : l'orbe qui guide parcourt les deux docks, de bout en bout.
Usage : cd studio && npx vite build && npx vite preview --port 4620, puis  python3 tests/e2e/orbe.py
Captures (facultatif) : CAPTURES=<dossier> python3 tests/e2e/orbe.py"""
import os, sys
from playwright.sync_api import sync_playwright

B = os.environ.get('BASE', 'http://localhost:4620')
CAP = os.environ.get('CAPTURES')
resultats, erreurs = [], []
def ok(c, nom):
    print(('OK ' if c else 'ÉCHEC ') + nom, flush=True); resultats.append(bool(c))
def capture(pg, nom):
    if CAP: os.makedirs(CAP, exist_ok=True); pg.screenshot(path=os.path.join(CAP, nom + '.png'))

def boite(pg, sel):
    return pg.evaluate("""s => { const r = [...document.querySelectorAll(s)].map(e => e.getBoundingClientRect()).filter(b => b.width && b.height);
      if (!r.length) return null; const x = Math.min(...r.map(b => b.left)), y = Math.min(...r.map(b => b.top));
      return { x, y, r: Math.max(...r.map(b => b.right)), b: Math.max(...r.map(b => b.bottom)) }; }""", sel)

LIEUX = {
    'atelier': dict(chemin='/atelier', premier='Bonjour, je suis Le Point', fin='Commencer à broder', dernier='Tout voir', menu='#pzs-brand'),
}
def parcours(b, largeur, hauteur, nom, lieu='atelier'):
    L = LIEUX[lieu]
    ctx = b.new_context(viewport={'width': largeur, 'height': hauteur}, reduced_motion='reduce')
    pg = ctx.new_page(); pg.set_default_timeout(8000)
    pg.on('pageerror', lambda e: erreurs.append(str(e)))
    pg.goto(B + L['chemin']); pg.wait_for_selector('#og-titre')
    ok(pg.locator('#og-titre').inner_text() == L['premier'], f'{nom} : Le Point s’ouvre dès l’arrivée ({lieu})')
    titres, horsCadre, horsEcran, loin, sansFocus = [], [], [], [], []
    for k in range(30):
        pg.wait_for_timeout(380)  # Le Point se pose (deux images, puis une vérification à 320 ms)
        titre = pg.locator('#og-titre').inner_text(); titres.append(titre)
        cadre = boite(pg, '.og-cadre'); orbe = boite(pg, '.og-orbe'); carte = boite(pg, '.og-carte')
        cible = pg.evaluate("""() => { const t = document.querySelector('#og-titre').textContent; return t; }""")
        # le cadre entoure bien un outil des docks : il chevauche un élément [data-guide]
        dans = pg.evaluate("""c => [...document.querySelectorAll('[data-guide]')].some(e => { const b = e.getBoundingClientRect();
            return b.width && b.left >= c.x - 1 && b.right <= c.r + 1 && b.top >= c.y - 1 && b.bottom <= c.b + 1; })""", cadre)
        if not dans: horsCadre.append(titre)
        if carte['x'] < 0 or carte['r'] > largeur + 1 or carte['y'] < 0 or carte['b'] > hauteur + 1: horsEcran.append(titre)
        # l'orbe se pose contre l'outil présenté
        ocx = (orbe['x'] + orbe['r']) / 2
        if not (cadre['x'] - 20 <= ocx <= cadre['r'] + 20) or min(abs(orbe['y'] - cadre['b']), abs(orbe['b'] - cadre['y'])) > 30: loin.append(titre)
        fin = pg.get_by_role('button', name=L['fin']).count() == 1
        if pg.evaluate('document.activeElement && document.activeElement.textContent') not in ('Suivant', L['fin']): sansFocus.append(titre)
        if k in (0, 2, 4, 10) or fin: capture(pg, f'{nom}-{k + 1:02d}')
        if fin: break
        pg.get_by_role('button', name='Suivant').click()
    total = int(pg.locator('.og-rang span').nth(1).inner_text().split('/')[1])
    ok(len(titres) == total and len(set(titres)) == total and titres[-1] == L['dernier'], f'{nom} : {total} étapes de bout en bout, chacune sur son outil')
    ok(not sansFocus, f'{nom} : le focus reste sur « Suivant » à chaque étape ' + str(sansFocus))
    ok(not horsCadre, f'{nom} : le cadre entoure toujours un outil des docks ' + str(horsCadre))
    ok(not horsEcran, f'{nom} : la bulle reste dans l’écran ' + str(horsEcran))
    ok(not loin, f'{nom} : l’orbe se pose contre chaque outil présenté ' + str(loin))
    ok(pg.locator('.og-orbe').evaluate("e => Math.max(...getComputedStyle(e).transitionDuration.split(',').map(parseFloat))") < 0.01, f'{nom} : moins d’animations demandées, l’orbe ne glisse pas')
    pg.get_by_role('button', name=L['fin']).click()
    ok(pg.locator('#og-titre').count() == 0, f'{nom} : « {L["fin"]} » ferme la visite')
    pg.reload(); pg.wait_for_timeout(800)
    ok(pg.locator('#og-titre').count() == 0, f'{nom} : la visite ne revient pas à la réouverture')
    pg.locator(L['menu']).click(); pg.get_by_role('button', name='Revoir la visite avec Le Point').click()
    ok(pg.locator('#og-titre').inner_text() == L['premier'], f'{nom} : le menu de l’orbe relance la visite')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(150)
    ok(pg.locator('#og-titre').count() == 0, f'{nom} : Échap ferme la visite')
    ctx.close()
    return titres

def mouvement(b):
    """Sans « moins d'animations » : l'orbe glisse d'un outil à l'autre."""
    ctx = b.new_context(viewport={'width': 1440, 'height': 900})
    pg = ctx.new_page(); pg.goto(B + '/atelier'); pg.wait_for_selector('#og-titre'); pg.wait_for_timeout(900)
    avant = boite(pg, '.og-orbe'); pg.get_by_role('button', name='Suivant').click(); pg.wait_for_timeout(120)
    pendant = boite(pg, '.og-orbe'); pg.wait_for_timeout(900); apres = boite(pg, '.og-orbe')
    ok(avant['x'] != apres['x'] and pendant['x'] not in (avant['x'], apres['x']), 'ordinateur : l’orbe glisse d’un outil au suivant')
    ctx.close()

def docks(b, largeur, hauteur, nom):
    """Les docks rétractables : grilles des points, nuancier, loupe ; le point zéro ; plus de BurO."""
    ctx = b.new_context(viewport={'width': largeur, 'height': hauteur})
    pg = ctx.new_page(); pg.on('pageerror', lambda e: erreurs.append(str(e))); pg.set_default_timeout(6000)
    pg.add_init_script("localStorage.setItem('pointzero:visite-docks:v1','vue')")
    pg.goto(B + '/atelier'); pg.wait_for_timeout(1200)
    zero = boite(pg, '.pz-point-zero-bouton')
    ok(zero and abs((zero['x'] + zero['r']) / 2 - largeur / 2) < 4 and abs((zero['y'] + zero['b']) / 2 - hauteur / 2) < 8, f'{nom} : le bouton d’import est au point zéro, au centre de la grille')
    pg.locator('[data-guide="dessiner"]').click(); pg.wait_for_timeout(250)
    ok(pg.locator('.dg-case').count() >= 19, f'{nom} : Dessiner déplie la grille de tous les points et outils')
    capture(pg, f'docks-{nom}-dessiner')
    pg.locator('.dg-case', has_text='Demi-point').click(); pg.wait_for_timeout(200)
    ok(pg.locator('.dg-case').count() == 0 and 'Demi-point' in pg.locator('.pzs-crumbs').inner_text(), f'{nom} : choisir un point replie le dock et le garde actif')
    pg.locator('.pzs-up').click(); pg.locator('[data-guide="fils"]').click(); pg.wait_for_timeout(250)
    pg.locator('#dg-cherche-fil').fill('rouge foncé'); pg.wait_for_timeout(200)
    n = pg.locator('.dg-pastille').count()
    ok(n > 0 and pg.locator('.pzs-bottom').count() == 1, f'{nom} : le nuancier se déplie dans le dock du haut ({n} rouges foncés)')
    capture(pg, f'docks-{nom}-nuancier')
    code = pg.locator('.dg-pastille .dg-code').first.inner_text(); pg.locator('.dg-pastille').first.click(); pg.wait_for_timeout(200)
    ok(pg.locator('.dg-pastille').count() == 0 and code in pg.locator('.pzs-top').inner_text(), f'{nom} : toucher une pastille rend le fil actif et replie le dock')
    pg.locator('.pzs-up').click(); pg.wait_for_timeout(150)
    pg.get_by_role('button', name='Loupe : la grille agrandie sous le pointeur').click(); pg.wait_for_timeout(200)
    pg.mouse.move(largeur * .3, hauteur * .22); pg.wait_for_timeout(150); a1 = pg.locator('.pzs-loupe-dock').inner_text()
    pg.mouse.move(largeur * .7, hauteur * .32); pg.wait_for_timeout(150); a2 = pg.locator('.pzs-loupe-dock').inner_text()
    ok('X ' in a1 and a1 != a2, f'{nom} : la loupe suit le pointeur sur la grille')
    capture(pg, f'docks-{nom}-loupe')
    pg.get_by_role('button', name='Fermer la loupe').click()
    pg.locator('[data-guide="dessiner"]').click(); pg.locator('[data-guide="outil-cross"]').click(); pg.wait_for_timeout(150)
    for n in range(12): pg.mouse.click(largeur * .35 + (n % 4) * 12, hauteur * .3 + (n // 4) * 12)
    pg.locator('.pzs-up').click(); pg.locator('[data-guide="fils"]').click(); pg.wait_for_timeout(250)
    pg.locator('.dg-filtre button').nth(1).click(); pg.wait_for_timeout(250)
    px = pg.evaluate("() => { const c = document.querySelector('.dg-carte canvas'); if (!c) return 0; const d = [0,1,2].map(n => document.querySelectorAll('.dg-carte canvas')[n].getContext('2d').getImageData(0,0,22,22).data); return d.reduce((s, a) => s + a.filter((v, i) => i % 4 === 3 && v > 0).length, 0); }")
    anim = pg.locator('.dg-scintille').first.evaluate("e => getComputedStyle(e).animationName")
    ok(px > 0 and anim == 'dg-scintille', f'{nom} : la pastille du fil brodé montre ses pixels qui scintillent ({px} pixels)')
    capture(pg, f'docks-{nom}-scintille')
    pg.keyboard.press('Escape')
    pg.locator('.pzs-profil').click(); pg.wait_for_timeout(200)
    t = pg.locator('.pzs-bloc').inner_text()
    ok('Mes ouvrages' in t and 'Nouvelle grille' in t and 'Votre espace AIME' not in t and 'BurO' not in t, f'{nom} : Mes ouvrages dans le dock, sans BurO ni Espace AIME')
    pg.goto(B + '/buro'); pg.wait_for_timeout(600)
    ok(pg.locator('#csh-title').count() == 1, f'{nom} : l’ancienne adresse /buro mène à l’accueil')
    ctx.close()

def depuis_accueil(b):
    """L'accueil met Le Point en avant : « Faire la visite » ouvre l'atelier avec la visite, même déjà vue."""
    ctx = b.new_context(viewport={'width': 1440, 'height': 900})
    pg = ctx.new_page(); pg.on('pageerror', lambda e: erreurs.append(str(e)))
    pg.add_init_script("localStorage.setItem('pointzero:visite-docks:v1','vue')")
    pg.goto(B + '/'); pg.wait_for_timeout(800)
    ok(pg.locator('#le-point h2').inner_text().strip().lower() == 'le point' and pg.locator('#fonctionnalites .pzh-bento > li').count() == 10, 'accueil : les docks, Le Point et la grande grille des fonctionnalités')
    ok(pg.locator('#editions').count() == 0 and 'Boutique' not in pg.locator('body').inner_text(), 'accueil : plus de page ni de lien vers les éditions')
    nxt = pg.get_by_role('button', name='Outil suivant')
    nxt.click(); nxt.click(); pg.wait_for_timeout(300)
    ok(pg.locator('.sdemo-outils').count() == 1 and pg.locator('.sdemo [data-k="cross"] .og-geste').count() == 1, 'accueil : la réplique déplie la grille des points, et Le Point y brode la croix')
    fond = pg.locator('.cross-stitch-home').evaluate("e => getComputedStyle(e).backgroundImage")
    ok('linear-gradient' in fond, 'accueil : le fond est une grille gris clair')
    pg.get_by_role('button', name='Faire la visite avec Le Point').first.click(); pg.wait_for_selector('#og-titre')
    ok(pg.url.endswith('/atelier') and pg.locator('#og-titre').inner_text() == 'Bonjour, je suis Le Point', 'accueil → « Faire la visite » : Le Point démarre dans l’atelier')
    pg.goto(B + '/boutique'); pg.wait_for_timeout(600)
    ok(pg.locator('#csh-title').count() == 1, 'l’ancienne adresse /boutique mène à l’accueil')
    ctx.close()

with sync_playwright() as p:
    b = p.chromium.launch()
    depuis_accueil(b)
    parcours(b, 1440, 900, 'ordinateur')
    parcours(b, 390, 844, 'telephone')
    docks(b, 1440, 900, 'ordinateur')
    docks(b, 390, 844, 'telephone')
    mouvement(b)
    b.close()
ok(not erreurs, 'aucune erreur dans la page ' + str(erreurs[:3]))
sys.exit(0 if all(resultats) else 1)
