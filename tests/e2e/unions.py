"""Sujet n° 3 — Unions : le parcours dans l'interface. Point Zéro « Nous nous marions » → ranger comme union → Mon espace
→ compléter prénoms, date, lieu → recharger → retrouver la même union → son programme (personnaliser) distinct de Camille & Gabriel.
API SIMULÉES ici : ce parcours prouve l'interface, pas l'écriture en base. L'écriture réelle est prouvée par tests/base/unions.mjs.
Usage : npm run build && npx vite preview --port 4610, puis  python3 tests/e2e/unions.py [--sans-preuve]"""
import json, os, sys
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from preuves import enregistrer_preuve

B = os.environ.get('BASE', 'http://localhost:4610')
resultats, erreurs, envois = [], [], []
def ok(c, nom):
    print(('OK ' if c else 'ÉCHEC ') + nom, flush=True); resultats.append({'test': nom, 'ok': bool(c)})
def texte(loc):
    return loc.first.inner_text() if loc.count() else ''
def cliquer(loc):
    if loc.count(): loc.first.click()

ID = '11111111-2222-4333-8444-555555555555'
etat = {'unions': {}, 'role': 'owner'}   # la « base » simulée de ce parcours d'interface
ANALYSE = {'domaine': 'union', 'label': 'Union', 'studio': 'AIME Wedding', 'certitude': 0.9, 'resume': 'Un mariage.', 'chemin': ['intention', 'personnes'], 'raisons': {}, 'ecartees': {}, 'entites': {}}

def projets():
    return [{'id': i, 'genre': 'evenement', 'titre': 'Notre union', 'role': etat['role'], 'maj': '2026-10-28', 'briques': ['intention'], 'studio': 'AIME Wedding', 'visibilite': 'prive', 'archive': False, 'union': u} for i, u in etat['unions'].items()]

def page(b, w=1440, h=900, connecte=True):
    ctx = b.new_context(viewport={'width': w, 'height': h}, reduced_motion='reduce')
    pg = ctx.new_page(); pg.set_default_timeout(4000)
    pg.on('pageerror', lambda e: erreurs.append(str(e)))
    pg.on('console', lambda m: erreurs.append(m.text) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
    def api(route):
        u, req = route.request.url, route.request
        if '/api/auth/get-session' in u:
            return route.fulfill(status=200, content_type='application/json', body=json.dumps({'user': {'id': 'u1', 'email': 'lou@exemple.invalid', 'name': 'Lou'}} if connecte else None))
        if '/api/analyse' in u: return route.fulfill(status=200, content_type='application/json', body=json.dumps(ANALYSE))
        if '/api/buro' in u:
            if req.method == 'GET': return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'projets': projets()}))
            corps = json.loads(req.post_data or '{}'); envois.append(corps)
            if corps.get('action') == 'union':
                if etat['unions']: return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'id': next(iter(etat['unions'])), 'existant': True}))
                etat['unions'][ID] = {'a': '', 'b': '', 'date': '', 'lieu': '', 'programme': None}
                return route.fulfill(status=201, content_type='application/json', body=json.dumps({'ok': True, 'id': ID, 'existant': False}))
            if corps.get('action') == 'union-maj' and corps.get('id') in etat['unions']:
                etat['unions'][corps['id']].update(corps.get('union') or {})
                return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True}))
            return route.fulfill(status=404, content_type='application/json', body=json.dumps({'ok': False}))
        return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': False}))
    pg.route('**/api/**', api)
    return pg

with sync_playwright() as p:
    b = p.chromium.launch()

    # 1 · les boutons d'entrée disent ce que fait le parcours
    pg = page(b); pg.goto(B + '/'); pg.wait_for_timeout(500)
    e = pg.locator('section#unions a', has_text='Commencer notre union')
    ok(e.count() == 1 and 'point-zero?q=Nous' in (e.first.get_attribute('href') or '') and pg.get_by_text('Créer la page de notre union').count() == 0, 'entrée : l’accueil propose « Commencer notre union », vers le Point Zéro')
    pg.goto(B + '/moments'); pg.wait_for_timeout(500)
    ok(pg.get_by_role('link', name='Commencer notre union').count() == 1 and pg.get_by_text('Commencer mon union').count() == 0 and 'RÉFÉRENCE' in texte(pg.locator('.surtitre')).upper(), 'entrée : la Grille 200 de référence propose le même « Commencer notre union »')

    # 2 · Point Zéro → ranger comme union
    pg.goto(B + '/point-zero?q=Nous%20nous%20marions'); pg.wait_for_timeout(1200)
    r = pg.get_by_role('button', name='Ranger notre union dans mon espace')
    ok(r.count() == 1, 'Point Zéro : « Nous nous marions » propose « Ranger notre union dans mon espace »')
    cliquer(r); pg.wait_for_timeout(500)
    dernier = envois[-1] if envois else {}
    ok(dernier.get('action') == 'union' and 'titre' not in dernier and 'Votre union est rangée' in texte(pg.locator('[role=status]').filter(has_text='union')), 'Point Zéro : l’union est rangée par l’action « union » (une seule par personne)')
    lien = pg.get_by_role('link', name='Compléter notre union')
    ok(lien.count() == 1 and lien.first.get_attribute('href') == '/buro?union=' + ID, 'Point Zéro : ensuite, « Compléter notre union » mène à cette union dans Mon espace')
    pg.reload(); pg.wait_for_timeout(1200); cliquer(pg.get_by_role('button', name='Ranger notre union dans mon espace')); pg.wait_for_timeout(500)
    ok(len(etat['unions']) == 1 and 'déjà dans votre espace' in texte(pg.locator('[role=status]').filter(has_text='union')), 'Point Zéro : ranger à nouveau retrouve la même union, sans doublon')

    # 3 · Mon espace : compléter, enregistrer, recharger
    cliquer(pg.get_by_role('link', name='Compléter notre union')); pg.wait_for_timeout(800)
    carte = pg.locator('main li button[aria-pressed=true]')
    ok('/buro?union=' + ID in pg.url and 'UNION' in texte(carte).upper() and 'à compléter' in texte(carte), 'Mon espace : l’union est choisie, marquée « à compléter »')
    fiche = pg.locator('section[aria-labelledby=titre-union]')
    ok(fiche.count() == 1 and 'pas encore fixée' in texte(fiche), 'Mon espace : la fiche de l’union s’ouvre')
    ok(fiche.count() == 1 and pg.locator('header').get_by_role('button', name='Partager').count() == 0 and pg.get_by_text('Partager ·').count() == 0, 'Mon espace : pas de partage public pour une union')
    if pg.get_by_label('Premier prénom').count():
        pg.get_by_label('Premier prénom').fill('Lou'); pg.get_by_label('Second prénom').fill('Marius')
        pg.get_by_label('Date officielle').fill('2027-06-12'); pg.get_by_role('textbox', name='Lieu (facultatif)').fill('Cinéma de quartier')
    cliquer(pg.get_by_role('button', name='Enregistrer')); pg.wait_for_timeout(600)
    m = envois[-1] if envois else {}
    ok(m.get('action') == 'union-maj' and m.get('id') == ID and m.get('union') == {'a': 'Lou', 'b': 'Marius', 'date': '2027-06-12', 'lieu': 'Cinéma de quartier'}, 'Mon espace : « Enregistrer » envoie les prénoms, la date officielle et le lieu de cette union')
    ok('Enregistré' in texte(fiche) and 'Lou & Marius' in texte(pg.locator('#titre-union')) and '12 juin 2027' in texte(fiche), 'Mon espace : la fiche montre l’union complétée')
    pg.reload(); pg.wait_for_timeout(900)
    ok(pg.get_by_label('Premier prénom').count() == 1 and pg.get_by_label('Premier prénom').input_value() == 'Lou' and pg.get_by_label('Date officielle').input_value() == '2027-06-12' and 'Lou & Marius' in texte(pg.locator('main li button[aria-pressed=true]')), 'Mon espace : après rechargement, la même union, relue telle qu’enregistrée')

    # 4 · son programme : personnaliser(), distinct de Camille & Gabriel
    cliquer(pg.get_by_role('link', name='Voir notre programme')); pg.wait_for_timeout(1000)
    main = texte(pg.locator('main'))
    ok('union=' + ID in pg.url and 'LE PROGRAMME DE LOU & MARIUS' in texte(pg.locator('.surtitre')).upper(), 'programme : « Voir notre programme » ouvre le programme de cette union')
    ok('union=' + ID in pg.url and 'Camille' not in main and 'Gabriel' not in main and pg.locator('img[src*="union-camille-gabriel"]').count() == 0 and pg.get_by_role('link', name='Commencer notre union').count() == 0, 'programme : rien de Camille & Gabriel (ni nom, ni photo, ni bouton de démonstration)')
    ok('Votre programme' in main, 'programme : il se dit tiré de la Grille 200, pas « de démonstration »')
    l1 = pg.locator('a.m200-ligne')
    ok(l1.count() > 0 and ('union=' + ID) in (l1.first.get_attribute('href') or ''), 'programme : les liens vers un moment gardent l’union')
    cliquer(l1); pg.wait_for_timeout(700)
    ok('Lou & Marius' in pg.title() and 'Camille' not in texte(pg.locator('main')), 'programme : la page d’un moment reste celle de l’union')
    pg.goto(B + '/moments?union=00000000-0000-4000-8000-000000000000'); pg.wait_for_timeout(800)
    ok('Programme introuvable' in texte(pg.locator('h1')) and 'Camille' not in texte(pg.locator('main')), 'programme : une union qui n’est pas dans l’espace n’affiche rien (ni la référence à sa place)')
    pg.goto(B + '/moments'); pg.wait_for_timeout(600)
    ok('RÉFÉRENCE' in texte(pg.locator('.surtitre')).upper() and pg.locator('img[src*="union-camille-gabriel"]').count() == 1, 'programme : sans union, la Grille 200 de référence est inchangée')
    pg.close()

    # 5 · seul le propriétaire modifie
    etat['role'] = 'editor'
    pg = page(b); pg.goto(B + '/buro?union=' + ID); pg.wait_for_timeout(900)
    ok(pg.get_by_label('Premier prénom').count() == 0 and 'Seul le propriétaire' in texte(pg.locator('section[aria-labelledby=titre-union]')), 'permissions : un membre non propriétaire voit l’union sans pouvoir la modifier')
    etat['role'] = 'owner'; pg.close()

    # 6 · sans compte
    pg = page(b, connecte=False); pg.goto(B + '/point-zero?q=Nous%20nous%20marions'); pg.wait_for_timeout(1200)
    n = len(envois); cliquer(pg.get_by_role('button', name='Ranger notre union dans mon espace')); pg.wait_for_timeout(300)
    ok(len(envois) == n and 'Entrez dans AIME pour ranger votre union' in texte(pg.locator('main')), 'sans compte : le Point Zéro invite à entrer, rien n’est envoyé')
    pg.goto(B + '/moments?union=' + ID); pg.wait_for_timeout(700)
    ok('Programme introuvable' in texte(pg.locator('h1')) and pg.get_by_role('link', name='+ Entrer').count() >= 1, 'sans compte : le programme d’une union demande d’entrer')
    pg.close()

    # 7 · téléphone
    pg = page(b, 390, 844); pg.goto(B + '/buro?union=' + ID); pg.wait_for_timeout(900)
    bb = pg.locator('section[aria-labelledby=titre-union]').bounding_box() if pg.locator('section[aria-labelledby=titre-union]').count() else None
    ok(bb and bb['x'] >= 0 and bb['x'] + bb['width'] <= 390 and pg.evaluate('document.documentElement.scrollWidth') <= 390, 'téléphone : la fiche de l’union tient dans l’écran')
    pg.goto(B + '/moments?union=' + ID); pg.wait_for_timeout(900)
    ok(pg.evaluate('document.documentElement.scrollWidth') <= 390 and 'LOU & MARIUS' in texte(pg.locator('.surtitre')).upper(), 'téléphone : le programme de l’union s’affiche sans déborder')
    pg.close(); b.close()

ok(not erreurs, 'aucune erreur dans la console')
if '--sans-preuve' not in sys.argv: enregistrer_preuve('tests/e2e/unions.py', resultats, 'aperçu local (vite preview), API SIMULÉES : interface seulement')
print('ERREURS', erreurs)
sys.exit(0 if all(r['ok'] for r in resultats) else 1)
