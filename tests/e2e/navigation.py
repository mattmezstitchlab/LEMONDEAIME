"""Le premier parcours réel du système nerveux : dock du haut → dock du bas → page active → fonctionnalité → donnée.
Usage : npm run build && npx vite preview --port 4610, puis  python3 tests/e2e/navigation.py
Les API sont simulées (aucune base, aucun compte réel) : ce parcours prouve tout le chemin jusqu'à la requête
envoyée au serveur. L'écriture réelle en base n'est PAS prouvée ici (elle reste « à vérifier » dans la carte).
Le résultat est enregistré dans cartographie/preuves.json (date, commit, chaque vérification)."""
import json, os, subprocess, sys, datetime
from playwright.sync_api import sync_playwright

B = os.environ.get('BASE', 'http://localhost:4610')
RACINE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
resultats, erreurs, envois = [], [], []

def ok(c, nom):
    print(('OK ' if c else 'ÉCHEC ') + nom, flush=True)
    resultats.append({'test': nom, 'ok': bool(c)})

MORCEAU = {'source': 'deezer', 'deezer': 3135556, 'titre': 'Morceau d’essai', 'artiste': 'Artiste d’essai', 'pochette': '', 'lien': ''}
def api(route):
    u, req = route.request.url, route.request
    if '/api/auth/get-session' in u:
        return route.fulfill(status=200, content_type='application/json', body=json.dumps({'user': {'id': 'essai', 'email': 'essai@example.org', 'name': 'Essai'}}))
    if '/api/musique?moi=1' in u:
        return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'musiques': []}))
    if '/api/musique?q=' in u:
        return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'resultats': [MORCEAU]}))
    if u.endswith('/api/musique') and req.method == 'POST':
        corps = json.loads(req.post_data or '{}'); envois.append(corps)
        return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'musique': {**MORCEAU, 'id': '1', 'moment': corps.get('moment')}}))
    if '/api/buro' in u:
        return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'projets': []}))
    return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': False}))

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 1440, 'height': 900})
    pg.on('pageerror', lambda e: erreurs.append(str(e)))
    pg.on('console', lambda m: erreurs.append(m.text) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
    pg.route('**/api/**', api)

    # 1 · le dock du haut
    pg.goto(B + '/'); pg.wait_for_timeout(500)
    pg.get_by_role('button', name='Chercher dans tout AIME, et le plan du site').click(); pg.wait_for_timeout(200)
    ok(pg.locator('#champ-recherche').is_visible(), 'dock du haut : la loupe ouvre la recherche')
    pg.fill('#champ-recherche', 'musique'); pg.wait_for_timeout(200)
    pg.locator('.recherche-bloc a', has_text='Musique').first.click(); pg.wait_for_timeout(600)
    ok(pg.url.endswith('/musique') and pg.locator('h1', has_text='Musique').count() == 1, 'recherche : « musique » mène à /musique sans recharger')
    ok(pg.evaluate('history.state && history.state.n') >= 1, 'routeur : la page est ajoutée à l’historique')

    # 2 · le dock du bas
    lieux = pg.locator('.dock-bas a.lieu')
    ok(lieux.count() == 10, 'dock du bas : les lieux de /musique sont ses dix moments')
    lieux.nth(7).click(); pg.wait_for_timeout(1200)
    ok(pg.evaluate("location.hash") == '#moment-ouverture' and pg.evaluate('scrollY') > 300, 'dock du bas : un lieu fait défiler la page sans revenir en haut')
    pg.locator('.dock-bas .orbe-dock').click(); pg.wait_for_timeout(200)
    modes = [x.inner_text().strip() for x in pg.locator('.dock-bas .halo-mode').all()]
    ok(modes == ['Navigation', 'Musique'], 'dock du bas : le cercle ouvre ses modes (Navigation, Musique)')
    pg.locator('.dock-bas .halo-mode', has_text='Musique').click(); pg.wait_for_timeout(200)
    ok(pg.locator('.dock-bas a.lieu', has_text='Mes morceaux').count() == 1 and pg.get_by_role('button', name='Écouter un fichier de cet appareil').count() == 1,
       'dock du bas, mode Musique : fichier de l’appareil et mes morceaux, séparés')

    # 3 · la page active → 4 · la fonctionnalité → 5 · sa donnée (la requête)
    pg.goto(B + '/musique'); pg.wait_for_timeout(700)
    pg.get_by_role('button', name='+ Ajouter un morceau').first.click(); pg.wait_for_timeout(200)
    pg.locator('.choisir input.champ').first.fill('essai'); pg.wait_for_timeout(900)
    ok(pg.locator('.choisir-res li', has_text='Morceau d’essai').count() == 1, 'ajouter un morceau : la recherche interroge /api/musique?q')
    pg.locator('.choisir-res').get_by_role('button', name='Ajouter').click(); pg.wait_for_timeout(500)
    ok(len(envois) == 1 and envois[0].get('action') == 'ajouter' and envois[0].get('deezer') == 3135556 and envois[0].get('moment') == 'preparatifs',
       'ajouter un morceau : POST /api/musique { action: ajouter, deezer, moment }')
    ok(pg.locator('#moment-preparatifs .morceaux li', has_text='Morceau d’essai').count() == 1, 'ajout : la réponse du serveur apparaît dans le bon moment')
    ok(not any(k in envois[0] for k in ('user_id', 'userId', 'email')), 'ajout : l’identité ne part jamais dans le corps (le serveur la lit dans la session)')

    # le dock du haut, ses autres blocs
    pg.get_by_role('button', name='Mon espace, Essai').click(); pg.wait_for_timeout(300)
    ok(pg.locator('.bloc-dossiers a[href^="/buro?lieu="]').count() == 4, 'dock du haut : le rond du profil ouvre les dossiers de l’espace')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(150)
    pg.locator('.carre-orbe').click()
    pg.wait_for_timeout(200)
    pg.locator('.orbe-choix').nth(1).click(); pg.wait_for_timeout(200)
    garde = pg.evaluate("localStorage.getItem('aime-mon-confort')")
    ok(garde is not None, 'orbe : choisir une orbe enregistre Mon confort sur l’appareil')
    pg.keyboard.press('Escape')
    pg.locator('.dock-haut .outil.carre').click(); pg.wait_for_timeout(600)
    ok(pg.url == B + '/', 'retour : la flèche revient en arrière (ici, à l’accueil)')
    b.close()

ok(not erreurs, 'aucune erreur dans la console')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from preuves import enregistrer_preuve
enregistrer_preuve('tests/e2e/navigation.py', resultats, 'aperçu local (vite preview), API simulées')
print('ERREURS', erreurs)
sys.exit(0 if all(r['ok'] for r in resultats) else 1)
