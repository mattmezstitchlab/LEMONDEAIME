"""LE MONDE AIME, le portfolio, côté interface. Deux environnements :
 - SANS SERVEUR (aucune API) : l'accueil et les pages projet montrent les deux projets d'origine ;
 - API SIMULÉES : l'administration (accès, création, table absente). Le serveur est prouvé par tests/base/projets.mjs.
Usage : npm run build && npx vite preview --port 4610, puis  python3 tests/e2e/portfolio.py [--sans-preuve]
Captures (facultatif) : CAPTURES=<dossier> python3 tests/e2e/portfolio.py"""
import json, os, sys, subprocess, datetime
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright

B = os.environ.get('BASE', 'http://localhost:4610')
CAP = os.environ.get('CAPTURES')
RACINE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
resultats, erreurs = [], []
def ok(c, nom):
    print(('OK ' if c else 'ÉCHEC ') + nom, flush=True); resultats.append({'test': nom, 'ok': bool(c)})
def capture(pg, nom):
    if CAP: os.makedirs(CAP, exist_ok=True); pg.screenshot(path=os.path.join(CAP, nom + '.png'), full_page=True)

PROJETS = [
    {'slug': 'brode-way', 'titre': 'Brode Way', 'categorie': 'Broderie', 'annee': 2026, 'statut': 'en-ligne', 'ordre': 1, 'une': True, 'publie': True, 'accroche': 'L’atelier.', 'description': 'Un.', 'role': 'Tout', 'lien': '/studio/atelier', 'couverture': '/media/studio/dessiner.jpg', 'alt': 'Une broderie', 'galerie': []},
    {'slug': 'aime-wedding', 'titre': 'AIME Wedding', 'categorie': 'Mariage', 'annee': 2026, 'statut': 'en-cours', 'ordre': 2, 'une': False, 'publie': True, 'accroche': 'L’union.', 'description': 'Deux.', 'role': 'Tout', 'lien': '/aime-wedding', 'couverture': '/media/wedding/piscine.jpg', 'alt': 'Des mariés', 'galerie': []},
]
def contexte(b, largeur=1440):
    ctx = b.new_context(viewport={'width': largeur, 'height': 900}, reduced_motion='reduce')
    pg = ctx.new_page(); pg.set_default_timeout(5000)
    pg.on('pageerror', lambda e: erreurs.append(str(e)))
    return pg
def simuler(pg, qui, admin, table=True):
    ecrits = []
    def api(route):
        u = urlparse(route.request.url); q = parse_qs(u.query)
        rep = lambda code, o: route.fulfill(status=code, content_type='application/json', body=json.dumps(o))
        if u.path == '/api/auth/get-session': return rep(200, {'user': qui} if qui else None)
        if u.path == '/api/projets':
            if route.request.method == 'POST': ecrits.append(json.loads(route.request.post_data or '{}')); return rep(200, {'ok': True, 'slug': ecrits[-1].get('projet', {}).get('slug')})
            if 'moi' in q: return rep(200, {'ok': True, 'admin': admin})
            if 'admin' in q: return rep(200, {'ok': True, 'projets': PROJETS, 'table': table}) if admin else rep(403, {'ok': False, 'raison': 'Réservé à l’administration du site.'})
            return rep(200, {'ok': True, 'projets': PROJETS})
        return rep(200, {'ok': False})
    pg.route('**/api/**', api)
    return ecrits

with sync_playwright() as p:
    b = p.chromium.launch()
    # — sans serveur : les projets d'origine
    pg = contexte(b); pg.goto(B + '/'); pg.wait_for_timeout(800)
    ok(pg.locator('h1').inner_text().strip().lower() == 'le monde aime', 'accueil : le titre LE MONDE AIME')
    ok(pg.locator('#une h3').inner_text() == 'Brode Way', 'accueil : Brode Way à la une (sans serveur : les projets d’origine)')
    cartes = pg.locator('.pf-grille .pf-carte-titre')
    ok(cartes.all_inner_texts() == ['Brode Way', 'AIME Wedding'], 'accueil : deux projets en cartes, dans l’ordre')
    capture(pg, 'accueil')
    pg.get_by_role('button', name='Mariage').click()
    ok(cartes.all_inner_texts() == ['AIME Wedding'] and pg.get_by_role('button', name='Mariage').get_attribute('aria-pressed') == 'true', 'accueil : le filtre « Mariage » ne garde qu’AIME Wedding')
    pg.get_by_role('button', name='Tous').click()
    pg.locator('.pf-grille a', has_text='AIME Wedding').click(); pg.wait_for_timeout(500)
    ok(pg.url.endswith('/projets/aime-wedding') and pg.locator('h1').inner_text() == 'AIME Wedding', 'carte → la page du projet')
    ok('En cours' in pg.locator('.pf-fiche').inner_text() and pg.title().startswith('AIME Wedding'), 'page projet : la fiche (état) et le titre de l’onglet')
    visiter = pg.get_by_role('link', name='Visiter le site AIME Wedding')
    ok(visiter.get_attribute('href') == '/aime-wedding', 'page projet : « Visiter le site » mène à /aime-wedding')
    ok(pg.locator('.pf-carte-titre').inner_text() == 'Brode Way', 'page projet : le projet suivant')
    capture(pg, 'projet-aime-wedding')
    visiter.click(); pg.wait_for_timeout(600)
    ok(pg.locator('h1').inner_text().strip().lower() == 'aime wedding' and pg.locator('#unions').count() == 1, 'AIME Wedding garde son site sur /aime-wedding (unions comprises)')
    pg.goto(B + '/projets/brode-way'); pg.wait_for_timeout(500)
    ok(pg.get_by_role('link', name='Visiter le site Brode Way').get_attribute('href') == '/studio/atelier', 'Brode Way : « Visiter le site » ouvre l’atelier')
    pg.goto(B + '/projets/inconnu'); pg.wait_for_timeout(500)
    ok('n’existe pas' in pg.locator('main').inner_text(), 'un projet inconnu : la page le dit')
    pg.close()

    # — téléphone : rien ne déborde
    pg = contexte(b, 390)
    for chemin in ['/', '/projets/brode-way']:
        pg.goto(B + chemin); pg.wait_for_timeout(600)
        ok(pg.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'), 'téléphone (390 px) : %s ne déborde pas' % chemin)
    capture(pg, 'accueil-telephone')
    pg.close()

    # — l'administration (API simulées)
    pg = contexte(b); simuler(pg, None, False); pg.goto(B + '/admin'); pg.wait_for_timeout(600)
    ok('Entrez dans AIME' in pg.locator('main').inner_text(), 'administration sans compte : invitée à entrer, rien d’autre')
    pg.close()
    pg = contexte(b); simuler(pg, {'id': 'u2', 'email': 'autre@exemple.invalid', 'name': 'Autre'}, False); pg.goto(B + '/admin'); pg.wait_for_timeout(600)
    ok('réservée à l’administration' in pg.locator('main').inner_text() and pg.locator('form').count() == 0, 'administration, autre compte : refusée, aucun formulaire')
    pg.goto(B + '/'); pg.wait_for_timeout(500)
    ok(pg.get_by_role('link', name='Administrer les projets').count() == 0, 'accueil, autre compte : pas de lien d’administration')
    pg.close()
    pg = contexte(b); ecrits = simuler(pg, {'id': 'u1', 'email': 'matt@exemple.invalid', 'name': 'Matt'}, True)
    pg.goto(B + '/'); pg.wait_for_timeout(500)
    ok(pg.get_by_role('link', name='Administrer les projets').count() == 1, 'accueil, administration : le lien « Administrer les projets »')
    pg.goto(B + '/admin'); pg.wait_for_timeout(600)
    ok(pg.locator('.ad-liste li').count() == 2, 'administration : les deux projets, dans l’ordre')
    pg.get_by_role('button', name='Nouveau projet').click()
    pg.get_by_label('Titre', exact=True).fill('Atelier Été')
    ok(pg.get_by_label('Adresse de la page').input_value() == 'atelier-ete', 'nouveau projet : l’adresse se déduit du titre')
    pg.get_by_label('Catégorie').fill('Broderie'); pg.get_by_label('Accroche').fill('Une accroche.')
    capture(pg, 'administration')
    pg.get_by_role('button', name='Enregistrer').click(); pg.wait_for_timeout(600)
    e = ecrits[-1] if ecrits else {}
    ok(e.get('action') == 'enregistrer' and e.get('ancien') is None and e.get('projet', {}).get('slug') == 'atelier-ete' and e.get('projet', {}).get('publie') is False, 'enregistrer : un nouveau projet, en brouillon par défaut')
    pg.locator('.ad-choisir', has_text='Brode Way').click()
    pg.get_by_role('button', name='Supprimer').click()
    ok(pg.get_by_role('group', name='Confirmer la suppression').count() == 1 and not any(x.get('action') == 'supprimer' for x in ecrits), 'supprimer demande une confirmation, rien n’est envoyé avant')
    pg.get_by_role('button', name='Non').click()
    pg.close()
    pg = contexte(b); simuler(pg, {'id': 'u1', 'email': 'matt@exemple.invalid', 'name': 'Matt'}, True, table=False); pg.goto(B + '/admin?projet=brode-way'); pg.wait_for_timeout(600)
    ok('migration 2026-10-28-02' in pg.locator('main').inner_text() and pg.get_by_role('button', name='Enregistrer').is_disabled(), 'table absente : l’administration le dit, Enregistrer est désactivé')
    pg.close(); b.close()

ok(not erreurs, 'aucune erreur dans la page')
if '--sans-preuve' not in sys.argv:
    chemin = os.path.join(RACINE, 'docs', 'portfolio', 'preuves.json'); os.makedirs(os.path.dirname(chemin), exist_ok=True)
    tout = json.load(open(chemin)) if os.path.exists(chemin) else {}
    git = lambda *a: subprocess.run(['git', *a], cwd=RACINE, capture_output=True, text=True).stdout.strip()
    tout['tests/e2e/portfolio.py'] = {'date': datetime.date.today().isoformat(), 'commit': git('rev-parse', '--short', 'HEAD'), 'code_modifie_depuis_le_commit': git('status', '--porcelain', '--', 'src', 'api', 'tests') != '', 'environnement': 'aperçu local (vite preview) : sans serveur pour l’accueil et les pages projet, API SIMULÉES pour l’administration', 'resultats': resultats}
    json.dump(dict(sorted(tout.items())), open(chemin, 'w'), ensure_ascii=False, indent=1); open(chemin, 'a').write('\n')
print('ERREURS', erreurs)
sys.exit(0 if all(r['ok'] for r in resultats) else 1)
