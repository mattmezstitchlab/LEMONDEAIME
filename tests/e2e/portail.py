"""Le Portail du temps : le Disque seul, centré ; la couronne navigue, l'intérieur affiche (Matt, 30/10/2026). Un seul Point Zéro.
J'ouvre le Studio · le Disque présente le projet actuel · je vois le PASSÉ, le PRÉSENT et le FUTUR · je tourne la bague ·
le centre indique la période · je relâche et je vois les éléments · une action simple · le détail en grand · retour au Point Zéro ·
mon contexte est conservé. Plus : symétrie, clavier, toucher, téléphone, mouvement réduit, aucun débordement, aucune donnée inventée.
Usage : BASE=http://localhost:4634 NAVIGATEURS=chromium,webkit python3 tests/e2e/portail.py"""
import os, re, math
from playwright.sync_api import sync_playwright
B = os.environ['BASE'].rstrip('/'); NAVS = os.environ.get('NAVIGATEURS', 'chromium').split(','); CAP = os.environ.get('CAPTURES')
R = [0, 0]
def ok(c, m): R[0 if c else 1] += 1; print(('✓ ' if c else 'ÉCHEC ') + m)
def args(n): return ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] if n == 'chromium' else []
U = B + '/studio/one/univers'

with sync_playwright() as p:
    for n in NAVS:
        b = getattr(p, n).launch(args=args(n))
        # ——— ordinateur ———
        N = f'[{n} · ordinateur]'
        ctx = b.new_context(viewport={'width': 1440, 'height': 900}); pg = ctx.new_page(); err = []
        pg.on('pageerror', lambda e: err.append(str(e)))
        pg.goto(U); pg.wait_for_selector('.bt', timeout=20000); pg.wait_for_timeout(900)
        bague = pg.locator('.bt-svg')
        ok(bague.get_attribute('aria-valuetext').startswith('vendredi 30 octobre 2026'), f'{N} 1–2. le Studio s’ouvre sur le calendrier radial, au jour du projet : {bague.get_attribute("aria-valuetext")}')
        ok(pg.locator('.bt-chiffre').count() == 31 and pg.locator('.bt-point').count() == 2, f'{N} des chiffres (31 jours), des points (2 jours portent des éléments), un cercle')
        ok(pg.locator('.pt-cote').count() == 0 and not pg.locator('.dq-ligne').is_visible() if pg.locator('.dq-ligne').count() else pg.locator('.pt-cote').count() == 0, f'{N} le Disque est seul : ni colonnes, ni légende dessous')
        items = pg.locator('.one-disque [role=menuitem]')
        noms = [items.nth(i).inner_text().strip() for i in range(items.count())]
        ok([x.split('\n')[0] for x in noms] == ['Confort', 'Faire', 'Aller', 'Voir', 'Origine'], f'{N} couronne : {noms}')
        d = pg.locator('.one-disque .pzt-anneau').bounding_box(); cx, cy = d['x'] + d['width'] / 2, d['y'] + d['height'] / 2
        pos = [items.nth(i).bounding_box() for i in range(items.count())]
        ray = [math.hypot(q['x'] + q['width'] / 2 - cx, q['y'] + q['height'] / 2 - cy) for q in pos]
        ang = sorted([(math.degrees(math.atan2(q['x'] + q['width'] / 2 - cx, -(q['y'] + q['height'] / 2 - cy))) % 360) for q in pos])
        ecarts = [(ang[(i + 1) % 5] - ang[i]) % 360 for i in range(5)]
        ok(max(ray) - min(ray) < 3 and all(abs(e - 72) < 3 for e in ecarts), f'{N} symétrie du cadran : rayons {min(ray):.0f}–{max(ray):.0f} px, écarts {[round(e) for e in ecarts]}°')
        ok(abs(cx - 720) < 2 and abs(cy - 450) < 2, f'{N} le Disque est au centre exact de l’écran ({cx:.0f}, {cy:.0f})')
        ok(pg.evaluate('document.documentElement.scrollWidth') <= 1440 and pg.evaluate('document.documentElement.scrollHeight') <= 900, f'{N} aucun débordement')
        if CAP: pg.screenshot(path=f'{CAP}/portail-{n}-1.png')
        # tourner, relâcher, voir
        bague.focus(); pg.keyboard.press('ArrowLeft'); pg.wait_for_timeout(500)
        ok('f.t=2026-10-29' in pg.url and bague.get_attribute('aria-valuetext').startswith('jeudi 29 octobre'), f'{N} clavier : la bague tourne d’un jour')
        pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(400)
        pg.keyboard.press('Enter'); pg.wait_for_timeout(500)
        ok('f.e=heure' in pg.url and pg.locator('.bt-chiffre').count() == 24, f'{N} approfondir : Entrée, les 24 heures du jour')
        pg.keyboard.press('Enter'); pg.wait_for_timeout(500)
        ok('f.e=moment' in pg.url and 'commit' in pg.locator('.bt-centre').inner_text(), f'{N} approfondir : le moment, avec sa précision et sa source ({pg.locator(".bt-source").inner_text() if pg.locator(".bt-source").count() else "—"})')
        pg.keyboard.press('Escape'); pg.keyboard.press('Escape'); pg.wait_for_timeout(500)
        ok('f.e=jour' in pg.url, f'{N} revenir : Échap, une échelle plus large')
        pg.keyboard.press('Escape'); pg.wait_for_timeout(500)
        ok('f.e=mois' in pg.url and pg.locator('.bt-chiffre').count() == 12, f'{N} le mois : les 12 mois de l’année')
        pg.keyboard.press('Escape'); pg.wait_for_timeout(500)
        ok('f.e=annee' in pg.url, f'{N} l’année')
        pg.goto(U + '?f.p=lumiere&f.e=jour&f.t=2026-10-30'); pg.wait_for_selector('.bt'); pg.wait_for_timeout(500)
        bb = bague.bounding_box(); bx, by = bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2; r = bb['width'] * 0.4
        pg.mouse.move(bx, by - r); pg.mouse.down(); pg.mouse.move(bx + r * math.sin(0.3), by - r * math.cos(0.3), steps=6)
        pendant = pg.locator('.bt-nom').inner_text(); pg.mouse.move(bx + r * math.sin(0.42), by - r * math.cos(0.42), steps=4); pg.mouse.up(); pg.wait_for_timeout(600)
        ok('f.t=2026-10-2' in pg.url and 'f.t=2026-10-30' not in pg.url, f'{N} à la souris : la bague tourne, au relâchement la date est choisie (pendant : « {pendant} »)')
        pg.goto(U + '?f.p=lumiere&f.e=jour&f.t=2026-10-30'); pg.wait_for_selector('.bt'); pg.wait_for_timeout(500)
        if CAP: pg.screenshot(path=f'{CAP}/portail-{n}-2-bague.png')
        pg.get_by_role('button', name='Voir', exact=True).click(); pg.wait_for_selector('.dq-grand .pt-liste')
        ok(pg.locator('.dq-grand .pt-liste li').count() >= 5 and 'date exacte' in pg.locator('.dq-grand').inner_text(), f'{N} le contenu du jour, avec sa précision et sa source')
        pg.locator('.dq-point-replie').click(); pg.wait_for_timeout(400)
        ok('f.t=2026-10-30' in pg.url and pg.locator('.bt').count() == 1, f'{N} revenir : la même date, la même échelle')
        # VOIR › Projet : le projet au centre
        pg.locator('.one-disque [role=menuitem]', has_text='Voir').first.click(); pg.wait_for_timeout(400)
        pg.locator('.one-disque [role=menuitem]', has_text='Projet').first.click(); pg.wait_for_selector('.pt-present', timeout=10000); pg.wait_for_timeout(400)
        ok(pg.locator('.pt-titre').inner_text() == 'LUMIERE' and '31 plans' in pg.locator('.pt-etat').inner_text() and 'bloqué' in pg.locator('.pt-present .pt-sur').inner_text().lower(), f'{N} Voir › Projet : LUMIERE au centre, son état, bloqué dit bloqué')
        # Retour (la famille se referme), puis ORIGINE : le Point Zéro, le projet gardé
        cour = [x.split('\n')[0] for x in pg.locator('.one-disque [role=menuitem]').all_inner_texts()]
        ok(cour == ['Confort', 'Faire', 'Aller', 'Voir', 'Origine'], f'{N} après Voir › Projet, la couronne revient aux cinq commandes')
        pg.locator('.one-disque [role=menuitem]', has_text='Origine').first.click(); pg.wait_for_timeout(500)
        ok('f.v' not in pg.url and 'f.p=lumiere' in pg.url and pg.locator('.bt').count() == 1, f'{N} ORIGINE : retour au Point Zéro, le projet gardé')
        pg.goto(U + '?f.p=lumiere&f.v=projet'); pg.wait_for_selector('.pt-present')
        pg.get_by_role('button', name='Épingler').click(); pg.reload(); pg.wait_for_selector('.pt-present'); pg.wait_for_timeout(500)
        ok(pg.get_by_role('button', name='Épinglé').get_attribute('aria-pressed') == 'true', f'{N} épingler : gardé après rechargement')
        pg.get_by_role('button', name='Épinglé').click(); pg.wait_for_timeout(300)
        pg.get_by_role('button', name='Pourquoi ?').click(); pg.wait_for_selector('.dq-grand .pt-raisons')
        txt = pg.locator('.dq-grand').inner_text()
        ok('aucune échéance renseignée' in txt and 'déclaré' in txt and 'ce qui devient possible' in txt.lower() and 'jamais des engagements' in txt, f'{N} Pourquoi : les règles, ce qui manque, et les possibilités (le Futur, dans le Disque)')
        pg.locator('.dq-point-replie').click(); pg.wait_for_timeout(300)
        pg.evaluate("localStorage.removeItem('aime:one:present:v1')"); pg.goto(U); pg.wait_for_selector('.bt')
        # REPRENDRE, puis revenir : le contexte est gardé
        pg.goto(U + '?f.p=lumiere&f.v=projet'); pg.wait_for_selector('.pt-present')
        pg.get_by_role('button', name='Reprendre').click(); pg.wait_for_url(re.compile(r'/one/lumiere/vivre'), timeout=20000)
        ok(True, f'{N} REPRENDRE : LUMIERE s’ouvre là où il vit (Vivre LUMIERE ; le film n’est pas modifié)')
        pg.go_back(); pg.wait_for_selector('.pt-present', timeout=20000)
        ok('f.p=lumiere' in pg.url and 'f.v=projet' in pg.url and pg.locator('.pt-titre').inner_text() == 'LUMIERE', f'{N} 10. revenir : le contexte est conservé')
        ok(not err, f'{N} aucune erreur {err[:2]}')
        ctx.close()
        # ——— mouvement réduit ———
        N = f'[{n} · mouvement réduit]'
        ctx = b.new_context(viewport={'width': 1280, 'height': 860}, reduced_motion='reduce'); pg = ctx.new_page(); err = []; pg.on('pageerror', lambda e: err.append(str(e)))
        pg.goto(U + '?f.p=lumiere&f.e=jour&f.t=2026-10-30'); pg.wait_for_selector('.bt'); pg.locator('.bt-svg').focus()
        avant = pg.locator('.bt-chiffre', has_text=re.compile('^30$')).bounding_box(); pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(60)
        apres = pg.locator('.bt-chiffre.bt-on').text_content()
        ok(apres == '31', f'{N} la bague saute sans glisser (choisi : {apres})')
        ok(not err, f'{N} aucune erreur')
        ctx.close()
        # ——— téléphone ———
        N = f'[{n} · téléphone]'
        kw = p.devices['iPhone 14'] if n == 'webkit' else {'viewport': {'width': 390, 'height': 844}, 'is_mobile': True, 'has_touch': True, 'device_scale_factor': 2}
        ctx = b.new_context(**kw); pg = ctx.new_page(); err = []; pg.on('pageerror', lambda e: err.append(str(e)))
        pg.goto(U); pg.wait_for_selector('.bt', timeout=20000); pg.wait_for_timeout(600)
        noms = [(pg.locator('.one-disque [role=menuitem]').nth(i).get_attribute('aria-label') or '').split(' :')[0].split(',')[0] for i in range(pg.locator('.one-disque [role=menuitem]').count())]
        ok(noms == ['Confort', 'Faire', 'Aller', 'Voir', 'Origine'] and pg.locator('.dq-liste').count() == 0, f'{N} le même Disque radial, la même couronne : {noms}')
        mots = pg.locator('.one-disque .lp-mot').all_inner_texts()
        ok(len([m for m in mots if m.strip()]) == 5 and pg.locator('.pzt').get_attribute('data-etiquettes') != 'cartouche', f'{N} des mots sous chaque commande, pas seulement des pictos ({mots})')
        d = pg.locator('.one-disque .pzt-anneau').bounding_box(); cx, cy = d['x'] + d['width'] / 2, d['y'] + d['height'] / 2
        ok(abs(cx - 195) < 3 and d['width'] >= 340, f'{N} le Disque est centré et occupe la largeur ({d["width"]:.0f} px, centre {cx:.0f})')
        ok(pg.evaluate('document.documentElement.scrollWidth') <= 390, f'{N} aucun débordement horizontal')
        cibles = pg.evaluate("[...document.querySelectorAll('.bt-btn, .bt-nom-voir, .one-disque [role=menuitem]')].map(e => Math.min(e.getBoundingClientRect().height, e.getBoundingClientRect().width))")
        ok(min(cibles) >= 40, f'{N} cibles tactiles ≥ 40 px ({min(cibles):.0f})')
        q = pg.locator('.bt-cible[data-cle="2026-10-29"]').bounding_box(); pg.touchscreen.tap(q['x'] + q['width'] / 2, q['y'] + q['height'] / 2); pg.wait_for_timeout(500)   # au doigt, à l'endroit du 29
        ok('f.t=2026-10-29' in pg.url, f'{N} au doigt : toucher un chiffre le choisit')
        if CAP: pg.screenshot(path=f'{CAP}/portail-{n}-3-telephone.png', full_page=True)
        ok(not err, f'{N} aucune erreur {err[:2]}')
        ctx.close(); b.close()
print(f'— {R[0]}/{R[0] + R[1]}')
