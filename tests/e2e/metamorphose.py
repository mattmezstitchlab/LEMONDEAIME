"""Sujet n° 2 — Métamorphose et Fragments : ouverture, fermeture, persistance locale, réinitialisation, date du Réseau,
liens vers Fragments et état de l'analyse. Ordinateur et téléphone.
Usage : npm run build && npx vite preview --port 4610, puis  python3 tests/e2e/metamorphose.py [--sans-preuve]
API simulées ; rien n'est écrit sur un serveur. Le résultat va dans cartographie/preuves.json."""
import json, os, sys
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from preuves import enregistrer_preuve

B = os.environ.get('BASE', 'http://localhost:4610')
RACINE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
STUDIO = open(os.path.join(RACINE, 'dist', 'studio', 'index.html')).read()
resultats, erreurs, reseau, scans = [], [], [], []
def ok(c, nom):
    print(('OK ' if c else 'ÉCHEC ') + nom, flush=True); resultats.append({'test': nom, 'ok': bool(c)})

def texte(loc):
    return loc.first.inner_text() if loc.count() else ''
def cliquer(loc):
    if loc.count(): loc.first.click()

def page(b, w=1440, h=900):
    pg = b.new_page(viewport={'width': w, 'height': h})
    pg.set_default_timeout(4000)
    pg.on('pageerror', lambda e: erreurs.append(str(e)))
    pg.on('console', lambda m: erreurs.append(m.text) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
    def api(route):
        u = route.request.url
        if '/api/reseau' in u: reseau.append(parse_qs(urlparse(u).query).get('date', [None])[0])
        if '/api/metamorphose-scan' in u: scans.append(u)
        if '/api/auth/get-session' in u: return route.fulfill(status=200, content_type='application/json', body='null')
        if '/api/reseau' in u: return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'profils': []}))
        return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': False}))
    pg.route('**/api/**', api)
    pg.route('**/studio/**', lambda r: r.fulfill(status=200, content_type='text/html', body=STUDIO) if r.request.resource_type == 'document' else r.continue_())
    return pg

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = page(b); pg.goto(B + '/'); pg.wait_for_timeout(600)
    ouvrir = pg.locator('.bouton-meta')

    # 1 · ouvrir, fermer, rendre le focus
    ouvrir.click(); pg.wait_for_timeout(300)
    ok(pg.get_by_role('dialog', name='Métamorphose').is_visible() and ouvrir.get_attribute('aria-expanded') == 'true', 'Métamorphose : le bouton ouvre le panneau')
    ok(pg.evaluate("document.activeElement?.id === 'meta-titre'"), 'Métamorphose : le focus va au titre du panneau')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(250)
    ok(pg.get_by_role('dialog', name='Métamorphose').count() == 0 and pg.evaluate("document.activeElement === document.querySelector('.bouton-meta')"), 'Métamorphose : Échap ferme et rend le focus au bouton')

    # 2 · transformer : noms, date, univers, sections
    ouvrir.click(); pg.wait_for_timeout(200)
    pg.fill('#meta-a', 'Lou'); pg.fill('#meta-b', 'Marius'); pg.fill('#meta-date', 'Le 12 juin, au bord de la mer')
    ok('Réseau' in texte(pg.locator('#meta-date-note')) and 'officielle' in texte(pg.locator('#meta-date-note')), 'Métamorphose : le panneau dit que le Réseau reprend la date')
    pg.locator('.meta-univers', has_text='Bord de mer').click()
    pg.locator('.metamorphose li', has_text='Boutique').locator('input[type=checkbox]').check()
    pg.get_by_role('button', name='Descendre Les moments').click(); pg.wait_for_timeout(200)
    pg.get_by_role('button', name='Voir ma page').click(); pg.wait_for_timeout(400)
    ok(texte(pg.locator('h1')).replace('\n', ' ').strip().upper() == 'LOU & MARIUS', 'Métamorphose : le titre devient les noms')
    ok(pg.locator('section#boutique').count() == 1, 'Métamorphose : une section cachée peut être montrée')
    ordre = pg.evaluate("[...document.querySelectorAll('main > div > section[id]')].map(s => s.id).slice(0, 2)")
    ok(ordre == ['unions', 'moments'], 'Métamorphose : l’ordre des sections suit le choix (%s)' % ','.join(ordre))

    # 3 · persistance locale, puis réinitialisation
    pg.reload(); pg.wait_for_timeout(600)
    garde = json.loads(pg.evaluate("localStorage.getItem('aime-metamorphose')") or '{}')
    ok(texte(pg.locator('h1')).replace('\n', ' ').strip().upper() == 'LOU & MARIUS' and garde.get('univers') == 'mer' and garde.get('date', '').startswith('Le 12 juin'), 'Métamorphose : tout est gardé sur l’appareil après rechargement')
    ok(ouvrir.inner_text().strip() == 'Ma version · modifier', 'Métamorphose : le bouton dit que la page est transformée')

    # 4 · le Réseau reprend la date, et la laisse changer ou effacer
    reseau.clear(); pg.goto(B + '/reseau'); pg.wait_for_timeout(700)
    t = texte(pg.locator('.critere-date'))
    ok('Date de recherche : le 12 juin' in t and 'Métamorphose' in t and 'pas la date officielle' in t, 'Réseau : la date reprise de la Métamorphose est expliquée')
    ok(reseau and reseau[-1] and reseau[-1].endswith('-06-12'), 'Réseau : la recherche utilise cette date (%s)' % (reseau[-1] if reseau else '—'))
    cliquer(pg.get_by_role('button', name='Changer la date'))
    if pg.locator('.critere-date input[type=date]').count(): pg.fill('.critere-date input[type=date]', '2027-07-03')
    cliquer(pg.get_by_role('button', name='Chercher à cette date')); pg.wait_for_timeout(500)
    meta = json.loads(pg.evaluate("localStorage.getItem('aime-metamorphose')"))
    ok('date=2027-07-03' in pg.url and bool(reseau) and reseau[-1] == '2027-07-03' and meta['date'].startswith('Le 12 juin'), 'Réseau : changer la date ne touche pas la Métamorphose')
    cliquer(pg.get_by_role('button', name='Chercher sans date')); pg.wait_for_timeout(500)
    ok('date=aucune' in pg.url and bool(reseau) and reseau[-1] is None and 'Aucune date' in texte(pg.locator('.critere-date')), 'Réseau : on peut chercher sans date')
    cliquer(pg.get_by_role('button', name='Reprendre la date de ma Métamorphose')); pg.wait_for_timeout(500)
    ok('date=' not in pg.url and bool(reseau) and bool(reseau[-1]) and reseau[-1].endswith('-06-12'), 'Réseau : on peut reprendre la date de la Métamorphose')

    # 5 · revenir à la page de tous
    pg.goto(B + '/'); pg.wait_for_timeout(500); ouvrir.click(); pg.wait_for_timeout(200)
    pg.get_by_role('button', name='Revenir à la page de tous').click(); pg.wait_for_timeout(400)
    ok(pg.evaluate("localStorage.getItem('aime-metamorphose')") is None and 'MONDE' in texte(pg.locator('h1')).upper(), 'Métamorphose : « Revenir à la page de tous » efface tout')
    reseau.clear(); pg.goto(B + '/reseau'); pg.wait_for_timeout(600)
    ok(bool(reseau) and reseau[-1] is None and 'Choisissez-en une' in texte(pg.locator('.critere-date')), 'Réseau : sans Métamorphose, aucune date imposée')
    pg.close()

    # 6 · téléphone
    pg = page(b, 390, 844); pg.goto(B + '/'); pg.wait_for_timeout(600)
    pg.locator('.bouton-meta').click(); pg.wait_for_timeout(300)
    bb = pg.locator('.metamorphose').bounding_box()
    ok(bb and bb['x'] >= 0 and bb['x'] + bb['width'] <= 390 and bb['y'] >= 0, 'téléphone : le panneau tient dans l’écran')
    pg.keyboard.press('Escape'); pg.goto(B + '/reseau'); pg.wait_for_timeout(500)
    ok(pg.evaluate('document.documentElement.scrollWidth') <= 390, 'téléphone : le Réseau et sa date ne débordent pas')
    pg.close()

    # 7 · Fragments : chaque point d'entrée, la bonne adresse, l'analyse annoncée indisponible
    pg = page(b); pg.goto(B + '/studio/aime'); pg.wait_for_timeout(1500)
    liens = pg.locator('a[href*="studio=metamorphose"]')
    hrefs = [liens.nth(i).get_attribute('href') for i in range(liens.count())]
    textes = [liens.nth(i).inner_text().strip() for i in range(liens.count())]
    ok(len(hrefs) >= 3 and all(h.startswith('/studio/atelier?studio=metamorphose') for h in hrefs), 'Fragments : les liens portent la vraie adresse (%d)' % len(hrefs))
    ok(not any('MÉTAMORPHOSE' in t.upper() for t in textes if t) and any('FRAGMENTS' in t.upper() for t in textes), 'Fragments : les points d’entrée disent « Fragments »')
    cliquer(pg.locator('a[href*="studio=metamorphose"]', has_text='FRAGMENTS')); pg.wait_for_timeout(1200)
    ok('/studio/atelier' in pg.url and pg.locator('h1', has_text='FRAGMENTS').count() == 1, 'Fragments : le lien ouvre l’outil dans le Studio')
    pg.locator('summary', has_text='Analyser une page').click() if pg.locator('summary', has_text='Analyser une page').is_visible() else None
    etat = texte(pg.locator('.analyse-fermee'))
    ok('audit de sécurité' in etat and pg.locator('button[type=submit]:disabled, button:disabled', has_text='indisponible').count() + pg.locator('button:disabled', has_text='Indisponible').count() >= 1, 'Fragments : l’analyse est annoncée indisponible, le bouton désactivé')
    ok(not scans, 'Fragments : aucune requête vers l’analyse non déployée')
    ok(pg.locator('text=POINTZERO_SCAN').count() == 0, 'Fragments : aucun nom de variable serveur affiché')
    pg.close()  # le service worker du Studio garderait la page précédente : nouvelle page, comme une nouvelle visite
    pg = page(b); pg.goto(B + '/studio/atelier?studio=design'); pg.wait_for_timeout(1500)
    pg.get_by_role('button', name='Ouvrir le menu des studios').first.wait_for(); cliquer(pg.get_by_role('button', name='Ouvrir le menu des studios'))
    outil = pg.get_by_role('button', name='Ouvrir le studio Fragments · Grille', exact=True)
    try: outil.first.wait_for()
    except Exception: pass
    ok(outil.count() == 1 and pg.get_by_text('MÉTAMORPHOSE · Grille').count() == 0, 'Fragments : l’outil du Studio Design s’appelle « Fragments · Grille »')
    pg.close()
    pg = page(b, 390, 844); pg.goto(B + '/studio/atelier?studio=metamorphose'); pg.wait_for_timeout(1500)
    ok(pg.locator('h1', has_text='FRAGMENTS').count() == 1 and pg.locator('summary', has_text='indisponible').count() == 1, 'téléphone : Fragments s’ouvre et dit que l’analyse est indisponible')
    pg.close(); b.close()

ok(not erreurs, 'aucune erreur dans la console')
if '--sans-preuve' not in sys.argv: enregistrer_preuve('tests/e2e/metamorphose.py', resultats, 'aperçu local (vite preview), API simulées')
print('ERREURS', erreurs)
sys.exit(0 if all(r['ok'] for r in resultats) else 1)
