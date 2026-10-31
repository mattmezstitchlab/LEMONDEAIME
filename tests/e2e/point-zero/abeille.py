"""Variante pour le site Point Zéro seul (sites/point-zero, adresses à la racine). TEST B — L'ABEILLE (Matt, 30/10/2026). Un patron PDF du commerce, reconstruit dans l'atelier, puis un PDF complet.
Le fichier n'est jamais dans le dépôt (droits de son autrice) : il est passé par ABEILLE=<chemin du PDF>.
Parcours réel : Importer › Patron PDF (vrai sélecteur) → Analyse → Calage → Grille & Montage → les codes lus comparés à la légende
du patron (saisie ici à la main, depuis la page « Symbol Key ») → Importer dans l'atelier → symboles, loupe → rangé dans Mes ouvrages
→ Partager › Patron PDF → le PDF produit est lu : mêmes dimensions, mêmes codes DMC, mêmes nombres de points.
Usage : ABEILLE=… BASE=http://localhost:4634 python3 tests/e2e/abeille.py"""
import os, re, subprocess, tempfile, sys
from playwright.sync_api import sync_playwright
B = os.environ['BASE'].rstrip('/'); PDF = os.environ.get('ABEILLE'); CAP = os.environ.get('CAPTURES')
if not PDF or not os.path.exists(PDF): print('ABEILLE manquant : le test ne tourne pas (le patron n’est pas dans le dépôt).'); sys.exit(0)
R = [0, 0]
def ok(c, m): R[0 if c else 1] += 1; print(('✓ ' if c else 'ÉCHEC ') + m, flush=True)
M = '[data-presentation][role=menu]'
# la légende imprimée du patron « Bee 2 » : 193 × 200 points, 22 fils DMC (BLANC = la toile, non brodé)
LEGENDE = {'310', '801', '160', '828', '3820', '372', '725', '307', '3033', '3866', '3823', '413', '646', '157', '782', '3861', '677', '728', '415', '3756', '3078', '712'}
OUVRAGES = """new Promise(r => { const o = indexedDB.open('point-zero-library'); o.onsuccess = () => { const db = o.result; if (!db.objectStoreNames.contains('projects')) return r([]);
  const q = db.transaction('projects').objectStore('projects').getAll(); q.onsuccess = () => r(q.result.map(x => ({ nom: x.name, w: x.w, h: x.h }))); }; o.onerror = () => r([]); })"""

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1440, 'height': 900}, accept_downloads=True); ctx.add_init_script("localStorage.setItem('pointzero:visite-docks:v1','vue')")
    pg = ctx.new_page(); err = []; pg.on('pageerror', lambda e: err.append(str(e)))
    pg.goto(B + '/atelier'); pg.wait_for_timeout(2500)
    pg.locator(f'{M} [data-mode="importer"]').first.click(); pg.wait_for_timeout(400)
    with pg.expect_file_chooser() as fc: pg.locator(f'{M} [data-mode="imp-pdf"]').first.click()
    fc.value.set_files(PDF); pg.wait_for_selector('text=Continuer vers le calage', timeout=90000); pg.wait_for_selector('text=/Grille exacte détectée/', timeout=60000); pg.wait_for_timeout(500)
    t = re.sub(r'\s+', ' ', pg.locator('body').inner_text())
    ok('12 pages de grille' in t and re.search(r'193\s*×\s*200 points', t), '1. Analyse : 12 pages de grille, 193 × 200 points (comme la légende)')
    ok('0 symbole(s) sans correspondance' in t, '1. Analyse : aucun symbole sans correspondance dans la légende')
    if CAP: pg.screenshot(path=f'{CAP}/abeille-1-analyse.png')
    pg.get_by_text('Continuer vers le calage').click(); pg.wait_for_timeout(2500)
    pg.get_by_text('Monter le puzzle →').click(); pg.wait_for_timeout(4000)
    t = pg.locator('body').inner_text()
    lus = {c: int(n) for c, _, n in re.findall(r'DMC (\w+) · ([^\n]+)\n(\d+) pts', t)}
    ok(set(lus) == LEGENDE, f'2. Montage : les {len(lus)} codes DMC lus sont exactement ceux de la légende (manquants {LEGENDE - set(lus) or "aucun"}, en trop {set(lus) - LEGENDE or "aucun"})')
    ok(sum(lus.values()) == 16898 and 'Grille finale : 193 × 200 points · 22 couleurs DMC · 12 blocs assemblés' in t, f'2. Montage : {sum(lus.values())} points, 193 × 200, 12 blocs assemblés')
    if CAP: pg.screenshot(path=f'{CAP}/abeille-2-montage.png')
    pg.get_by_role('button', name='Importer', exact=True).click(); pg.wait_for_timeout(5000)
    if pg.get_by_text('Passer la visite').count(): pg.get_by_text('Passer la visite').first.click()
    rec = None
    for _ in range(20):
        rec = next((x for x in pg.evaluate(OUVRAGES) if x['w'] == 193 and x['h'] == 200), None)
        if rec: break
        pg.wait_for_timeout(500)
    ok(rec is not None, f'3. Importé dans l’atelier et rangé dans Mes ouvrages, sur cet appareil ({rec})')
    # travailler dans le tambour : symboles, loupe
    if not pg.locator('.pzt').count() and pg.locator('.pzs-ouvrir-tambour').count(): pg.locator('.pzs-ouvrir-tambour').click(); pg.wait_for_timeout(800)
    for _ in range(4):
        if not pg.locator(f'{M} [data-mode="__retour"]').count(): break
        pg.locator(f'{M} [data-mode="__retour"]').first.click(); pg.wait_for_timeout(250)
    pg.locator(f'{M} [data-mode="affichage"]').first.click(); pg.wait_for_timeout(300)
    sy = pg.locator(f'{M} [data-mode="symboles"]').first
    if 'actif' not in (sy.get_attribute('aria-label') or ''): sy.click(); pg.wait_for_timeout(300)
    ok('actif' in (pg.locator(f'{M} [data-mode="symboles"]').first.get_attribute('aria-label') or ''), '4. Dans le tambour : les symboles du patron par-dessus les couleurs')
    pg.locator(f'{M} [data-mode="__retour"]').first.click(); pg.wait_for_timeout(250)
    pg.locator(f'{M} [data-mode="loupe"]').first.click(); pg.wait_for_timeout(600)
    lp = pg.locator('.pzs-loupe-dock')
    ok(lp.count() == 1 and 'DMC' in lp.inner_text(), '4. La loupe inspecte les points et leurs codes DMC')
    if CAP: pg.screenshot(path=f'{CAP}/abeille-3-tambour.png')
    pg.locator(f'{M} [data-mode="loupe"]').first.click(); pg.wait_for_timeout(300)
    # le PDF
    pg.locator(f'{M} [data-mode="partager"]').first.click(); pg.wait_for_timeout(300)
    pg.locator(f'{M} [data-mode="exp-patron"]').first.click(); pg.wait_for_timeout(1200)
    with pg.expect_download(timeout=120000) as d: pg.get_by_role('button', name='PDF', exact=True).click()
    f = os.path.join(tempfile.mkdtemp(), d.value.suggested_filename); d.value.save_as(f)
    import pypdf
    r = pypdf.PdfReader(f); tx = [x.extract_text() or '' for x in r.pages]; tout = '\n'.join(tx)
    ok('Grille 193 × 200 cases' in tx[0], f'5. Le PDF : {len(r.pages)} pages, grille 193 × 200 cases')
    m = re.search(r'Points de croix (\d+)', tx[0]); ok(m and int(m.group(1)) == 16898, f'5. Le PDF compte {m.group(1) if m else "?"} points de croix (le patron : 16 898)')
    leg = '\n'.join(t for t in tx if 'Légende des fils' in t or re.search(r'^\d{3,4} [A-Z][a-z]', t, re.M))
    pdf_codes = {c: int(n) for c, n in re.findall(r'^(\d{2,4}) [A-Za-z][^\n]*? (\d+) [\d,]+ \d+$', leg, re.M)}
    ok(set(pdf_codes) == LEGENDE, f'5. La légende du PDF : les 22 codes DMC du patron ({len(pdf_codes)} lus)')
    ok(all(pdf_codes.get(c) == n for c, n in lus.items()), '5. Chaque fil garde son nombre de points, du patron d’origine au PDF produit')
    ok('Licence' in tout or 'Usage personnel' in tout, '5. Le PDF dit que c’est un patron tiers, pour un usage personnel')
    d2 = tempfile.mkdtemp(); subprocess.run(['pdftoppm', '-r', '150', '-gray', '-png', '-f', '6', '-l', '6', f, d2 + '/p'], check=True)
    from PIL import Image
    im = Image.open(d2 + '/' + os.listdir(d2)[0]).convert('L'); px = list(im.get_flattened_data() if hasattr(im, 'get_flattened_data') else im.getdata()); encre = sum(1 for v in px if v < 100) / len(px)
    ok(0.01 < encre < 0.6, f'5. Impression à 150 dpi : une page de grille lisible ({encre * 100:.1f} % d’encre)')
    if CAP: im.save(f'{CAP}/abeille-4-pdf-page6.png')
    ok(not err, f'aucune erreur {err[:2]}')
    b.close()
print(f'— {R[0]}/{R[0] + R[1]}')
