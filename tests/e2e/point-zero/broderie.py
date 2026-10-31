"""Variante pour le site Point Zéro seul (sites/point-zero, adresses à la racine). TEST A — LA ROSE (Matt, 30/10/2026 : « .ONE — priorité absolue : terminer la broderie »).
Le parcours réel, dans le vrai navigateur, sur la version construite :
.ONE → Broderie → Découvrir (la landing) → Créer mon patron (l'atelier) → importer une image de roses → le sujet recadré
(automatique, puis à la main par les coins du Cadre) → la palette et le détail → une couleur DMC → les symboles → la loupe →
broder une croix → l'enregistrement (rangé sur cet appareil, retrouvé après rechargement) → le PDF, vérifié page par page.
Ordinateur et téléphone. Rien n'est simulé : les fichiers sont choisis par le sélecteur, le PDF est réellement téléchargé et lu.
Usage : BASE=http://localhost:4634 NAVIGATEURS=chromium,webkit CAPTURES=dossier python3 tests/e2e/broderie.py"""
import os, re, subprocess, tempfile
from playwright.sync_api import sync_playwright
B = os.environ['BASE'].rstrip('/'); NAVS = os.environ.get('NAVIGATEURS', 'chromium').split(','); CAP = os.environ.get('CAPTURES')
ROSE = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'studio', 'public', 'images', 'landing', 'peinture-roses.webp')
R = [0, 0]
def ok(c, m): R[0 if c else 1] += 1; print(('✓ ' if c else 'ÉCHEC ') + m, flush=True)
MENU = '[data-presentation][role=menu]'
def mode(pg, m): return pg.locator(f'{MENU} [data-mode="{m}"]').first
def chemin(pg, *ms):
    for m in ms: mode(pg, m).click(); pg.wait_for_timeout(350)
def racine(pg):
    for _ in range(4):
        if not pg.locator(f'{MENU} [data-mode="__retour"]').count(): return
        pg.locator(f'{MENU} [data-mode="__retour"]').first.click(); pg.wait_for_timeout(250)
OUVRAGES = """new Promise(r => { const o = indexedDB.open('point-zero-library'); o.onerror = () => r([]); o.onsuccess = () => { const db = o.result;
  if (!db.objectStoreNames.contains('projects')) return r([]); const q = db.transaction('projects').objectStore('projects').getAll();
  q.onsuccess = () => r(q.result.map(x => ({ nom: x.name, w: x.w, h: x.h, progres: x.progress }))); }; })"""

def verifier_pdf(chemin_pdf, N, appareil):
    import pypdf
    r = pypdf.PdfReader(chemin_pdf); textes = [p.extract_text() or '' for p in r.pages]; tout = '\n'.join(textes)
    ok(len(r.pages) >= 4, f'{N} PDF : {len(r.pages)} pages')
    ok('Spécifications' in textes[0] and re.search(r'Grille \d+ × \d+ cases', textes[0]) and re.search(r'Taille finie [\d,]+ × [\d,]+ cm', textes[0]), f'{N} PDF · page 1 : dimensions en points et en cm, toile, brins')
    m = re.search(r'Points de croix (\d+)', textes[0]); f = re.search(r'Fils différents (\d+)', textes[0])
    ok(m and f and int(m.group(1)) > 0, f'{N} PDF : {m.group(1) if m else "?"} points de croix, {f.group(1) if f else "?"} fils (calculés sur la grille)')
    leg = next((t for t in textes if 'Légende des fils' in t), '')
    codes = re.findall(r'^(\d{1,4}|B5200|Blanc|Ecru)\s', leg, re.M)
    ok(leg and f and len(codes) >= min(int(f.group(1)), 30), f'{N} PDF · légende : symbole, référence DMC, nom, points, mètres, écheveaux ({len(codes)} lignes lues)')
    ok('Index des pages de grille' in tout and re.search(r'col\. [-+]\d+', tout) and re.search(r'rang\. [-+]\d+', tout), f'{N} PDF : grille paginée, repères de colonnes et de rangées depuis le point zéro')
    ok(re.search(r'haut\s+p\.', tout) is not None, f'{N} PDF : chaque page dit ses voisines (haut, bas, gauche, droite)')
    # impression : rendu à 150 dpi, une page de grille n'est pas blanche et contient des symboles (noir sur blanc)
    d = tempfile.mkdtemp(); n = min(len(r.pages), 5)
    subprocess.run(['pdftoppm', '-r', '150', '-png', '-gray', '-f', str(n), '-l', str(n), chemin_pdf, d + '/p'], check=True)
    from PIL import Image
    im = Image.open(d + '/' + sorted(os.listdir(d))[0]).convert('L'); px = list(im.getdata()); noirs = sum(1 for v in px if v < 100) / len(px)
    ok(0.01 < noirs < 0.6 and im.size[0] > 1000, f'{N} impression (150 dpi, niveaux de gris) : page {n} lisible, {noirs*100:.1f} % d’encre, {im.size[0]}×{im.size[1]} px')
    if CAP and appareil == 'ordinateur': im.save(f'{CAP}/broderie-pdf-page{n}.png')

with sync_playwright() as p:
    for n in NAVS:
        b = getattr(p, n).launch()
        for appareil in ('ordinateur', 'téléphone'):
            N = f'[{n} · {appareil}]'; tel = appareil == 'téléphone'
            kw = ({**p.devices['iPhone 14']} if n == 'webkit' else {'viewport': {'width': 390, 'height': 844}, 'is_mobile': True, 'has_touch': True, 'device_scale_factor': 2}) if tel else {'viewport': {'width': 1440, 'height': 900}}
            ctx = b.new_context(**kw, accept_downloads=True); pg = ctx.new_page(); err = []; pg.on('pageerror', lambda e: err.append(str(e)))
            # 1–2. .ONE → Broderie
            # 1–3. le site Point Zéro s'ouvre sur la landing de la broderie (l'édition en chapitres), sans rien des autres concepts
            pg.goto(B + '/'); pg.wait_for_timeout(2500)
            corps = pg.locator('body').inner_text()
            ok(not re.search(r'\.0NE|LUMIERE|ATLAS|Galerie|Naviguer', corps), f'{N} 1–2. la landing ne parle que de broderie')
            cta = pg.get_by_role('button', name='Créer mon patron').or_(pg.get_by_role('link', name='Créer mon patron')).first
            ok(cta.count() == 1 and 'Point Zéro' in pg.title() + pg.locator('h1').first.inner_text(), f'{N} 3. la landing Broderie ({pg.url.replace(B, "")}) et « Créer mon patron »')
            if CAP and not tel: pg.screenshot(path=f'{CAP}/broderie-{n}-1-landing.png')
            # 4. Commencer
            cta.click(); pg.wait_for_url(re.compile(r'/atelier'), timeout=20000); pg.wait_for_timeout(1800)
            if pg.get_by_text('Passer la visite').count(): pg.get_by_text('Passer la visite').first.click(); pg.wait_for_timeout(300)
            ok('/atelier' in pg.url, f'{N} 4. Commencer : l’atelier')
            # 5. importer une photographie (le vrai sélecteur de fichiers, par la couronne : Importer › Image)
            if tel and pg.locator('.pzt-deployer:visible').count(): pg.locator('.pzt-deployer').first.tap(); pg.wait_for_timeout(600)
            if True:
                chemin(pg, 'importer')
                with pg.expect_file_chooser() as fc: mode(pg, 'imp-image').click()
                fc.value.set_files(ROSE)
            pg.wait_for_function("() => /peinture-roses/.test(document.body.innerText)", timeout=30000); pg.wait_for_timeout(1500)
            rose = None
            for _ in range(20):
                rose = next((x for x in pg.evaluate(OUVRAGES) if x['nom'] == 'peinture-roses'), None)
                if rose: break
                pg.wait_for_timeout(500)
            ok(rose and rose['w'] >= 20, f'{N} 5–8. la photo devient une grille ({rose["w"] if rose else "?"} × {rose["h"] if rose else "?"} points), rangée dans Mes ouvrages')
            if CAP and not tel: pg.screenshot(path=f'{CAP}/broderie-{n}-2-grille.png')
            if not tel:
                # 6–7. le sujet et les dimensions : Rétracter rend le Cadre ; un coin recompte la photo depuis l'original
                racine(pg); chemin(pg, 'retracter'); pg.wait_for_selector('.cadre-coin', timeout=10000); pg.wait_for_timeout(500)
                avant = pg.locator('.cadre-dims').inner_text()
                coin = pg.locator('.cadre-coin').nth(2).bounding_box()
                pg.mouse.move(coin['x'] + coin['width'] / 2, coin['y'] + coin['height'] / 2); pg.mouse.down()
                pg.mouse.move(coin['x'] - 90, coin['y'] - 70, steps=10); pg.mouse.up()
                for _ in range(20):   # la photo est recomptée par un worker : 1 à 2 s
                    pg.wait_for_timeout(500)
                    if pg.locator('.cadre-dims').inner_text() != avant: break
                apres = pg.locator('.cadre-dims').inner_text()
                ok(avant != apres, f'{N} 6–7. recadrer à la main par un coin : {avant} → {apres} (la photo est recomptée)')
                # le détail et la palette : le + du Cadre (vrais réglages de la photo)
                pg.locator('.cadre-plus').click(); pg.wait_for_timeout(300)
                if pg.get_by_role('menuitem', name=re.compile('Photo|Lumière|Réglages', re.I)).count(): pg.get_by_role('menuitem', name=re.compile('Photo|Lumière|Réglages', re.I)).first.click(); pg.wait_for_timeout(300)
                h = pg.get_by_role('button', name='Harmonieuse')
                if h.count():
                    h.first.click(); pg.wait_for_timeout(2500)
                    ok(h.first.get_attribute('aria-pressed') == 'true', f'{N} 7. le niveau de détail : palette « Harmonieuse » (les fils voisins fusionnent)')
                else: ok(False, f'{N} 7. la palette de la photo est introuvable dans le + du Cadre')
                pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
            if not tel:
                # 9–12. dans le Disque : une couleur DMC, les symboles, la loupe, broder (le Point de l'atelier, vraies actions)
                pg.goto(B + '/atelier'); pg.wait_for_timeout(2500)
                if pg.get_by_text('Passer la visite').count(): pg.get_by_text('Passer la visite').first.click(); pg.wait_for_timeout(300)
                racine(pg); chemin(pg, 'fils', 'fils-motif')
                dmc = pg.locator(f'{MENU} [data-mode^="dmc-"]').first; code = (dmc.get_attribute('data-mode') or '').replace('dmc-', '')
                dmc.click(); pg.wait_for_timeout(400)
                ok(code and 'actif' in (pg.locator(f'{MENU} [data-mode="dmc-{code}"]').first.get_attribute('aria-label') or ''), f'{N} 9. choisir une couleur du motif : DMC {code}, active')
                racine(pg); chemin(pg, 'affichage')
                sy = mode(pg, 'symboles'); avant = sy.get_attribute('aria-label') or ''
                if 'actif' not in avant: sy.click(); pg.wait_for_timeout(400)
                ok('actif' in (mode(pg, 'symboles').get_attribute('aria-label') or ''), f'{N} 10. les symboles par-dessus les couleurs (chaque fil a le sien)')
                racine(pg); chemin(pg, 'loupe'); pg.wait_for_timeout(500)
                loupe = pg.locator('.pzs-loupe-dock')
                ok(loupe.count() == 1 and 'DMC' in loupe.inner_text(), f'{N} 11. la loupe inspecte les points (« {loupe.inner_text()[:50].strip() if loupe.count() else ""} »)')
                if CAP: pg.screenshot(path=f'{CAP}/broderie-{n}-3-loupe.png')
                mode(pg, 'loupe').click() if mode(pg, 'loupe').count() else None; pg.wait_for_timeout(300)
                racine(pg); chemin(pg, 'broder', 'b-mark'); pg.wait_for_timeout(300)
                c = pg.locator('.pzt').bounding_box(); cx, cy = c['x'] + c['width'] / 2, c['y'] + c['height'] / 2
                pg.mouse.move(cx - 60, cy); pg.mouse.down(); pg.mouse.move(cx + 60, cy, steps=14); pg.mouse.up(); pg.wait_for_timeout(1200)
                prog = 0
                for _ in range(12):
                    x = next((x for x in pg.evaluate(OUVRAGES) if x['nom'] == 'peinture-roses'), None); prog = (x or {}).get('progres') or 0
                    if prog: break
                    pg.wait_for_timeout(500)
                et = pg.locator('.lp-point').first.get_attribute('aria-label') or ''
                ok(prog or re.search(r'brodé à \d+', et), f'{N} 12. travailler depuis l’écran : des croix marquées brodées (progression enregistrée : {prog})')
            ok(not err, f'{N} aucune erreur {err[:2]}')
            # 13. enregistrer et reprendre : rechargement, l'ouvrage est là ; et .ONE le montre
            pg.reload(); pg.wait_for_timeout(2500)
            ok(any(x['nom'] == 'peinture-roses' for x in pg.evaluate(OUVRAGES)), f'{N} 13. reprendre : après rechargement, l’ouvrage est dans Mes ouvrages (sur cet appareil, pas synchronisé)')
            # 14. le PDF : par la couronne, Partager › Patron PDF, puis PDF
            pg.goto(B + '/atelier'); pg.wait_for_timeout(2500)
            if pg.get_by_text('Passer la visite').count(): pg.get_by_text('Passer la visite').first.click(); pg.wait_for_timeout(300)
            if tel and pg.locator('.pzt-deployer:visible').count(): pg.locator('.pzt-deployer').first.tap(); pg.wait_for_timeout(600)
            if True:
                racine(pg)
                if not mode(pg, 'partager').count(): chemin(pg, 'atelier') if mode(pg, 'atelier').count() else None
                chemin(pg, 'partager')
            mode(pg, 'exp-patron').click(); pg.wait_for_timeout(1200)
            with pg.expect_download(timeout=60000) as d: pg.get_by_role('button', name='PDF', exact=True).click()
            f = os.path.join(tempfile.mkdtemp(), d.value.suggested_filename); d.value.save_as(f)
            ok(f.endswith('.pdf') and 'peinture-roses' in f, f'{N} 14. le PDF est téléchargé ({os.path.basename(f)}, {os.path.getsize(f)//1024} Ko)')
            verifier_pdf(f, N, appareil)
            ctx.close()
        b.close()
print(f'— {R[0]}/{R[0] + R[1]}')
