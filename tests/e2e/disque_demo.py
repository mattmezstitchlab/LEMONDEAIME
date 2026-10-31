"""La démonstration obligatoire (Matt, « .0NE — convergence du design ») : un seul Disque, les univers sont des contextes.
1. J'ouvre .0NE · 2. fond blanc · 3. j'ouvre les univers · 4. je choisis Galerie · 5. une vraie rosace au centre ·
6. je filtre avec la couronne · 7. je choisis une rosace · 8. je l'agrandis · 9. je reviens · 10. je choisis Bureau ·
11. mes ouvrages apparaissent · 12. j'en ouvre un dans Broderie · 13. je reviens à .0NE sans rupture.
Plus : le survol ne déplace pas le Disque ; l'historique du navigateur suit les contextes.
Ordinateur (couronne) et téléphone (la même logique, en liste). Usage : BASE=… NAVIGATEURS=chromium,webkit python3 tests/e2e/disque_demo.py"""
import os, re
from playwright.sync_api import sync_playwright
B = os.environ['BASE'].rstrip('/'); NAVS = os.environ.get('NAVIGATEURS', 'chromium').split(','); CAP = os.environ.get('CAPTURES')
res = []
def ok(c, nom): res.append((bool(c), nom)); print(('✓ ' if c else 'ÉCHEC ') + nom)
def args(n): return ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] if n == 'chromium' else []
def lum(pg, sel):
    c = pg.evaluate(f"getComputedStyle(document.querySelector('{sel}')).backgroundColor")
    v = [int(x) for x in re.findall(r'\d+', c)[:3]]; return sum(v) / 765
def canvas_plein(pg, sel):
    return pg.evaluate(f"""(() => {{ const c = document.querySelector('{sel}'); if (!c) return 0; const x = c.getContext('2d'); const d = x.getImageData(0, 0, c.width, c.height).data;
      let n = 0; for (let i = 0; i < d.length; i += 4 * 97) if (Math.abs(d[i] - 246) + Math.abs(d[i+1] - 241) + Math.abs(d[i+2] - 231) > 60) n++; return n; }})()""")

with sync_playwright() as p:
    for n in NAVS:
        b = getattr(p, n).launch(args=args(n))
        for appareil in ['ordinateur', 'telephone']:
            N = f'[{n} · {appareil}]'
            kw = {'viewport': {'width': 1366, 'height': 860}} if appareil == 'ordinateur' else (p.devices['iPhone 14'] if n == 'webkit' else {'viewport': {'width': 390, 'height': 844}, 'is_mobile': True, 'has_touch': True, 'device_scale_factor': 3})
            ctx = b.new_context(**kw); pg = ctx.new_page(); err = []
            pg.on('pageerror', lambda e: err.append(str(e)))
            mob = appareil == 'telephone'
            def cmd(nom):
                """une commande, par son nom : dans la couronne du Disque, sur ordinateur comme sur téléphone (le nom complet est dans l'étiquette accessible)"""
                el = pg.locator(f'.one-disque [role=menuitem][aria-label^="{nom}"]').first
                if not el.count(): el = pg.locator('.one-disque [role=menuitem]', has_text=nom).first
                el.tap() if mob else el.click()
                pg.wait_for_timeout(450)
            # 1–2. .0NE, sur fond blanc
            pg.goto(B + '/studio/one/univers'); pg.wait_for_selector('.dq', timeout=20000); pg.wait_for_timeout(800)
            ok(lum(pg, '.dq') > 0.95, f'{N} 1–2. .0NE s’ouvre sur le blanc AIME')
            ok(pg.locator('.one-disque .pzt-anneau').count() == 1 and pg.locator('.dq-liste').count() == 0, f'{N} 2. le Disque, noir mat, au centre de la page (téléphone compris : jamais une liste)')
            # 3–4. les univers → Galerie (aucune fenêtre de présentation entre les deux)
            pg.locator('.dq-bouton-grille').click(); pg.wait_for_selector('.dq-grille')
            ok(pg.locator('.dq-case').count() >= 10, f'{N} 3. la grille de tous les univers')
            pg.locator('.dq-case[data-univers=galerie]').click(); pg.wait_for_timeout(1200)
            ok(pg.locator('.dq-grille').count() == 0 and 'u=galerie' in pg.url, f'{N} 4. Galerie : le Disque change de contexte, sans présentation intermédiaire')
            # 5. une vraie rosace au centre
            ok(canvas_plein(pg, '.dq-rosace') > 40, f'{N} 5. une rosace réelle (moteur 5D) au centre')
            if CAP: pg.screenshot(path=f'{CAP}/demo-{n}-{appareil}-1-galerie.png')
            # survol : le Disque ne bouge pas
            if not mob:
                avant = pg.locator('.one-disque').bounding_box()
                for nom in ['Filtrer', 'Informations', 'Partager', 'Agrandir']: pg.locator('.one-disque [role=menuitem]', has_text=nom).first.hover(); pg.wait_for_timeout(150)
                apres = pg.locator('.one-disque').bounding_box()
                ok(abs(avant['y'] - apres['y']) < 0.5 and abs(avant['height'] - apres['height']) < 0.5, f'{N} survol : le Disque ne bouge pas ({avant["y"]:.1f} → {apres["y"]:.1f})')
            # 6. filtrer avec la couronne (deuxième couronne)
            cmd('Filtrer'); cmd('Palette'); cmd('Douce')
            ok('f.palette=1' in pg.url, f'{N} 6. filtrer par la couronne : palette « Douce »')
            ok(re.search(r'1 filtre', pg.locator('.dq-zone').inner_text()), f'{N} 6. la zone réservée le dit ({pg.locator(".dq-zone").inner_text()[:60]})')
            # 7. choisir une rosace (Parcourir)
            pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
            pg.goto(pg.url.split('?')[0] + '?u=galerie'); pg.wait_for_timeout(800)
            cmd('Parcourir'); cmd('Givre')
            pg.keyboard.press('Escape'); pg.wait_for_timeout(300)   # remonter de la sous-couronne (Retour), comme dans l'atelier
            ok('o=givre' in pg.url and pg.locator('[data-objet=givre]').count() == 1, f'{N} 7. choisir la rosace « Givre »')
            # 8–9. agrandir, puis revenir (le Disque se replie en Point, puis revient)
            cmd('Agrandir'); pg.wait_for_selector('.dq-grand .dq-rosace')
            ok(pg.locator('.dq-grand').is_visible(), f'{N} 8. agrandir : la rosace prend l’écran')
            if CAP: pg.wait_for_timeout(300); pg.screenshot(path=f'{CAP}/demo-{n}-{appareil}-2-grand.png')
            pg.locator('.dq-point-replie').click(); pg.wait_for_timeout(500)
            ok(pg.locator('.dq-grand').count() == 0 and 'o=givre' in pg.url, f'{N} 9. revenir : le Disque, au même contexte, même rosace')
            # 10–11. Bureau : mes ouvrages
            pg.locator('.dq-bouton-grille').click(); pg.locator('.dq-case[data-univers=bureau]').click(); pg.wait_for_timeout(1500)
            if pg.locator('.dq-vide').count():   # appareil vierge : l'ouvrage d'essai, annoncé comme démonstration
                cmd('Ouvrage d’essai'); pg.wait_for_selector('.dq-bureau', timeout=15000)
            ok(pg.locator('.dq-bureau .dq-ouvrage-img').count() == 1, f'{N} 10–11. Bureau : un ouvrage réel de l’appareil au centre')
            ok('démonstration' in pg.locator('.dq-bureau').inner_text(), f'{N} 11. l’ouvrage d’essai est annoncé comme démonstration')
            oid = pg.locator('.dq-bureau').get_attribute('data-objet')
            if CAP: pg.screenshot(path=f'{CAP}/demo-{n}-{appareil}-3-bureau.png')
            # 12. ouvrir dans Broderie (plein écran)
            cmd('Ouvrir'); pg.wait_for_url(re.compile(r'/studio/atelier\?ouvrage='), timeout=20000); pg.wait_for_timeout(3500)
            ok(f'ouvrage={oid}' in pg.url, f'{N} 12. l’ouvrage s’ouvre dans Broderie')
            ok(pg.locator('.cv-retour').is_visible(), f'{N} 12. « Revenir à .0NE · Bureau » est là')
            if CAP: pg.screenshot(path=f'{CAP}/demo-{n}-{appareil}-4-broderie.png')
            # 13. revenir à .0NE, au même contexte, au même ouvrage
            pg.locator('.cv-retour').click(); pg.wait_for_selector('.dq', timeout=20000); pg.wait_for_timeout(1200)
            ok('u=bureau' in pg.url and pg.locator(f'[data-objet="{oid}"]').count() == 1, f'{N} 13. retour : .0NE, Bureau, le même ouvrage — sans rupture')
            # l'historique suit les contextes
            pg.go_back(); pg.wait_for_timeout(800)
            ok('atelier' in pg.url or 'u=' in pg.url, f'{N} historique : « Précédent » du navigateur reste cohérent ({pg.url.split("/studio/")[-1][:40]})')
            ok(pg.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), f'{N} aucun défilement horizontal')
            ok(not err, f'{N} aucune erreur ({err[:1]})')
            ctx.close()
        b.close()
n = sum(1 for r in res if r[0]); print(f'— {n}/{len(res)}')
