"""Sécurité, côté interface (API SIMULÉES : ce parcours prouve l'interface, pas le serveur ; le serveur est prouvé par tests/base/securite.mjs).
S3 · le Point Zéro : sans compte, aucun appel à l'analyse par Claude ; refus, quota, plafond ou indisponibilité → moteur local, et il dit pourquoi.
S2 · la déconnexion : « Effacer les ouvrages de cet appareil », jamais coché ; coché, n'efface que les ouvrages du compte déjà rangés dans son espace.
Usage : npm run build && npx vite preview --port 4610, puis  python3 tests/e2e/securite.py [--sans-preuve]"""
import json, os, sys, subprocess, datetime
from playwright.sync_api import sync_playwright

B = os.environ.get('BASE', 'http://localhost:4610')
RACINE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
resultats, erreurs = [], []
def ok(c, nom):
    print(('OK ' if c else 'ÉCHEC ') + nom, flush=True); resultats.append({'test': nom, 'ok': bool(c)})

ANALYSE = {'domaine': 'union', 'label': 'Union', 'studio': 'AIME Wedding', 'certitude': 0.9, 'resume': 'Un mariage.', 'chemin': ['intention', 'personnes'], 'raisons': {}, 'ecartees': {}, 'entites': {}}
REPONSES = {'ok': (200, ANALYSE), 'compte': (401, {'error': 'x', 'code': 'compte'}), 'quota': (429, {'error': 'x', 'code': 'quota'}), 'plafond': (429, {'error': 'x', 'code': 'plafond'}), 'indisponible': (503, {'error': 'x', 'code': 'indisponible'})}

def page(b, connecte, cas='ok', distants=()):
    ctx = b.new_context(viewport={'width': 1440, 'height': 900}, reduced_motion='reduce')
    pg = ctx.new_page(); pg.set_default_timeout(4000)
    pg.on('pageerror', lambda e: erreurs.append(str(e)))
    appels = []
    def api(route):
        u = route.request.url
        if '/api/auth/get-session' in u:
            return route.fulfill(status=200, content_type='application/json', body=json.dumps({'user': {'id': 'u1', 'email': 'u1@exemple.invalid', 'name': 'U'}} if connecte else None))
        if '/api/auth/sign-out' in u: appels.append('sign-out'); return route.fulfill(status=200, content_type='application/json', body='{}')
        if '/api/analyse' in u:
            appels.append('analyse'); code, corps = REPONSES[cas]
            return route.fulfill(status=code, content_type='application/json', body=json.dumps(corps))
        if '/api/ouvrages' in u:
            return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'ouvrages': [{'id': i, 'maj': m} for i, m in distants]}))
        return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': False}))
    pg.route('**/api/**', api)
    return pg, appels

def note(pg):
    pg.wait_for_timeout(900)
    return pg.locator('main').inner_text()

with sync_playwright() as p:
    b = p.chromium.launch()
    # S3 · le Point Zéro
    pg, appels = page(b, False); pg.goto(B + '/point-zero?q=Nous%20nous%20marions')
    t = note(pg)
    ok('analyse' not in appels and 'entrez dans AIME pour l’analyse par Claude' in t, 'S3 · sans compte : aucun appel à l’analyse, le moteur local le dit')
    ok(pg.locator('text=Ranger dans mon espace').count() >= 1 or 'briques allumées' in t, 'S3 · sans compte : le Point Zéro allume quand même ses briques (moteur local)')
    pg.close()
    for cas, attendu in [('ok', 'Analysé par Claude'), ('compte', 'entrez dans AIME pour l’analyse par Claude'), ('quota', 'beaucoup d’analyses à la suite'), ('plafond', 'a atteint sa limite pour l’heure'), ('indisponible', 'analyse par Claude indisponible')]:
        pg, appels = page(b, True, cas); pg.goto(B + '/point-zero?q=Nous%20nous%20marions')
        t = note(pg)
        ok(appels.count('analyse') == 1 and attendu in t, 'S3 · connecté, réponse « %s » : %s' % (cas, attendu))
        pg.close()

    # S2 · la déconnexion
    LOCAUX = [{'id': 'range', 'compte': 'u1', 'updated': 1000}, {'id': 'pas-range', 'compte': 'u1', 'updated': 3000}, {'id': 'sans', 'updated': 1000}, {'id': 'autre', 'compte': 'u2', 'updated': 1000}]
    def semer(pg):
        pg.evaluate("""(locaux) => new Promise((ok, ko) => { const r = indexedDB.open('point-zero-library', 1);
          r.onupgradeneeded = () => r.result.createObjectStore('projects', { keyPath: 'id' });
          r.onsuccess = () => { const t = r.result.transaction('projects', 'readwrite'); for (const l of locaux) t.objectStore('projects').put({ name: l.id, folder: '', w: 1, h: 1, progress: 0, data: '{}', versions: [], ...l });
            t.oncomplete = () => { r.result.close(); ok(); }; t.onerror = () => ko(t.error); }; r.onerror = () => ko(r.error); })""", LOCAUX)
    def restants(pg):
        return sorted(pg.evaluate("""() => new Promise(ok => { const r = indexedDB.open('point-zero-library', 1); r.onsuccess = () => { const q = r.result.transaction('projects').objectStore('projects').getAll(); q.onsuccess = () => { r.result.close(); ok(q.result.map(x => x.id)); }; }; })"""))
    def deconnecter(pg, cocher):
        pg.get_by_role('button', name='Votre espace, U').first.click(); pg.wait_for_timeout(300)
        case = pg.get_by_role('checkbox', name='Effacer les ouvrages de cet appareil')
        etat = case.count() == 1 and not case.is_checked()
        if cocher and case.count(): case.check()
        pg.get_by_role('button', name='Déconnexion').last.click(); pg.wait_for_timeout(900)
        return etat
    pg, appels = page(b, True, distants=[('range', 2000), ('pas-range', 1000)]); pg.goto(B + '/'); pg.wait_for_timeout(600); semer(pg)
    etat = deconnecter(pg, False)
    ok(etat, 'S2 · à la déconnexion, « Effacer les ouvrages de cet appareil » est proposé, jamais coché')
    ok('sign-out' in appels and restants(pg) == ['autre', 'pas-range', 'range', 'sans'], 'S2 · sans cocher : la déconnexion n’efface rien sur l’appareil')
    pg.close()
    pg, appels = page(b, True, distants=[('range', 2000), ('pas-range', 1000)]); pg.goto(B + '/'); pg.wait_for_timeout(600); semer(pg)
    deconnecter(pg, True)
    r = restants(pg)
    ok('sign-out' in appels and r == ['autre', 'pas-range', 'sans'], 'S2 · coché : seul l’ouvrage du compte déjà rangé dans son espace est effacé (%s restent)' % ', '.join(r))
    pg.close(); b.close()

ok(not erreurs, 'aucune erreur dans la page')
if '--sans-preuve' not in sys.argv:
    chemin = os.path.join(RACINE, 'docs', 'securite', 'preuves.json'); os.makedirs(os.path.dirname(chemin), exist_ok=True)
    tout = json.load(open(chemin)) if os.path.exists(chemin) else {}
    git = lambda *a: subprocess.run(['git', *a], cwd=RACINE, capture_output=True, text=True).stdout.strip()
    tout['tests/e2e/securite.py'] = {'date': datetime.date.today().isoformat(), 'commit': git('rev-parse', '--short', 'HEAD'), 'code_modifie_depuis_le_commit': git('status', '--porcelain', '--', 'src', 'api', 'tests', 'studio/src') != '', 'environnement': 'aperçu local (vite preview), API SIMULÉES : interface seulement', 'resultats': resultats}
    json.dump(dict(sorted(tout.items())), open(chemin, 'w'), ensure_ascii=False, indent=1); open(chemin, 'a').write('\n')
print('ERREURS', erreurs)
sys.exit(0 if all(r['ok'] for r in resultats) else 1)
