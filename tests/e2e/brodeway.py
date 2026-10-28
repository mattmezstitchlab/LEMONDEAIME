"""Brode Way (/), la page de l'atelier, côté interface (aperçu local, sans serveur).
Usage : npm run build && npx vite preview --port 4610, puis  python3 tests/e2e/brodeway.py [--sans-preuve]"""
import json, os, sys, subprocess, datetime
from playwright.sync_api import sync_playwright

B = os.environ.get('BASE', 'http://localhost:4610')
RACINE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
resultats, erreurs = [], []
def ok(c, nom):
    print(('OK ' if c else 'ÉCHEC ') + nom, flush=True); resultats.append({'test': nom, 'ok': bool(c)})

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 1440, 'height': 900}); pg.set_default_timeout(5000)
    pg.on('pageerror', lambda e: erreurs.append(str(e)))
    pg.goto(B + '/'); pg.wait_for_timeout(800)
    ok(pg.locator('h1').inner_text() == 'Brode Way' and pg.title().startswith('Brode Way'), 'accueil : Brode Way, le titre de la page et de l’onglet')
    ok(pg.get_by_role('link', name='Ouvrir l’atelier').first.get_attribute('href') == '/studio/atelier' and pg.get_by_role('link', name='Voir les patrons').first.get_attribute('href') == '/studio/boutique', 'accueil : « Ouvrir l’atelier » et « Voir les patrons » mènent à l’atelier réel')
    puce = pg.locator('.bw-fil-texte')
    ok('DMC' in puce.inner_text(), 'la mésange se brode fil par fil : le fil en cours est nommé (DMC …)')
    pg.wait_for_timeout(9000)
    ok('Le rouge-gorge fleuri' in puce.inner_text() and '150 × 150 points' in puce.inner_text(), 'la broderie se termine : le rouge-gorge fleuri, 150 × 150 points')
    peint = pg.evaluate("(() => { const c = document.querySelector('.bw-toile canvas'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n; })()")
    ok(peint > 10000, 'la toile est réellement brodée (%d pixels peints)' % peint)
    pg.get_by_role('button', name='Rebroder').click(); pg.wait_for_timeout(400)
    ok('DMC' in puce.inner_text(), '« Rebroder » recommence la broderie')
    # les lectures (onglets)
    onglets = pg.get_by_role('tab')
    ok(onglets.count() == 3 and onglets.nth(0).get_attribute('aria-selected') == 'true', 'trois lectures, Réaliste choisie')
    onglets.nth(0).focus(); pg.keyboard.press('ArrowRight')
    ok(onglets.nth(1).get_attribute('aria-selected') == 'true' and pg.evaluate("document.activeElement.textContent.startsWith('À plat')"), 'les flèches du clavier passent à « À plat »')
    pg.wait_for_timeout(600)
    vis = pg.evaluate("[...document.querySelectorAll('.bw-lecture-ecran img')].map(i => getComputedStyle(i).opacity)")
    ok(vis == ['0', '1', '0'], 'l’écran montre la lecture choisie')
    # le parcours et les écrans
    ok(pg.locator('.bw-etapes li').count() == 5, 'le parcours : cinq étapes, de Commencer à Partager')
    pg.evaluate("document.querySelectorAll('img[loading=lazy]').forEach(i => i.loading = 'eager')"); pg.wait_for_timeout(2500)
    imgs = pg.evaluate("[...new Set([...document.querySelectorAll('main img')].map(i => i.currentSrc || i.src))].map(s => s.replace(location.origin, ''))")
    charges = pg.evaluate("Promise.all([...new Set([...document.querySelectorAll('main img')].map(i => i.src))].map(s => new Promise(r => { const im = new Image(); im.onload = () => r(im.naturalWidth > 0); im.onerror = () => r(false); im.src = s; })))")
    ok(len(imgs) >= 10 and all(charges), 'les %d captures de l’atelier se chargent' % len(imgs))
    # la volière : huit vrais patrons, réellement brodés
    pg.locator('#voliere').scroll_into_view_if_needed(); pg.wait_for_timeout(1500)
    peints = pg.evaluate("[...document.querySelectorAll('.bw-voliere canvas')].map(c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n; })")
    ok(len(peints) == 8 and all(p > 5000 for p in peints), 'la volière : huit oiseaux botaniques brodés (%s)' % ', '.join(str(p) for p in peints))
    ok(pg.locator('.bw-oiseau-lien').first.get_attribute('href') == '/studio/boutique', 'chaque oiseau mène aux patrons')
    # le nuancier
    ok(pg.locator('.bw-nuancier span').count() == 489, 'le nuancier : les 489 fils DMC')
    pg.get_by_role('button', name=__import__('re').compile('^Montrer les \\d+ fils du rouge-gorge$')).click()
    n = pg.locator('.bw-nuancier.filtre .du-motif').count()
    ok(n >= 30, 'le nuancier met en avant les %d fils du rouge-gorge' % n)
    pg.close()
    m = b.new_page(viewport={'width': 390, 'height': 844}, reduced_motion='reduce'); m.on('pageerror', lambda e: erreurs.append(str(e)))
    m.goto(B + '/'); m.wait_for_timeout(1000)
    ok('Le rouge-gorge fleuri' in m.locator('.bw-fil-texte').inner_text(), 'mouvement réduit : le rouge-gorge est brodé d’emblée, sans animation')
    ok(m.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'), 'téléphone (390 px) : rien ne déborde')
    ok(m.locator('.bw-etape-ecran').first.is_visible() and not m.locator('.bw-colle').is_visible(), 'téléphone : chaque étape montre son écran')
    m.goto(B + '/projets'); m.wait_for_timeout(600)
    ok(m.locator('h1').inner_text().strip().lower() == 'le monde aime', 'le portfolio reste sur /projets')
    m.close(); b.close()

ok(not erreurs, 'aucune erreur dans la page')
if '--sans-preuve' not in sys.argv:
    chemin = os.path.join(RACINE, 'docs', 'brodeway', 'preuves.json'); os.makedirs(os.path.dirname(chemin), exist_ok=True)
    tout = json.load(open(chemin)) if os.path.exists(chemin) else {}
    git = lambda *a: subprocess.run(['git', *a], cwd=RACINE, capture_output=True, text=True).stdout.strip()
    tout['tests/e2e/brodeway.py'] = {'date': datetime.date.today().isoformat(), 'commit': git('rev-parse', '--short', 'HEAD'), 'code_modifie_depuis_le_commit': git('status', '--porcelain', '--', 'src', 'tests', 'public') != '', 'environnement': 'aperçu local (vite preview), sans serveur', 'resultats': resultats}
    json.dump(dict(sorted(tout.items())), open(chemin, 'w'), ensure_ascii=False, indent=1); open(chemin, 'a').write('\n')
print('ERREURS', erreurs)
sys.exit(0 if all(r['ok'] for r in resultats) else 1)
