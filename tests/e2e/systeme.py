"""/systeme-nerveux : lecture publique (carte, sélection, parcours, causalité), accès d'inspection (refusé, à entrer, ouvert), mobile.
Usage : npm run build && npx vite preview --port 4610, puis  python3 tests/e2e/systeme.py
La réponse d'inspection est produite par la vraie fonction serveur (lectureInspection), seule l'autorisation est simulée."""
import json, os, subprocess, sys, tempfile
from playwright.sync_api import sync_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from preuves import enregistrer_preuve

B = os.environ.get('BASE', 'http://localhost:4610')
RACINE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = tempfile.mkdtemp(prefix='aime-sn-') + '/'
INSPECTION = subprocess.run(['node', '-e', "import('./api/systeme.mjs').then(S=>process.stdout.write(JSON.stringify({ok:true,...S.lectureInspection()})))"], capture_output=True, text=True, cwd=RACINE).stdout
RESEAU = json.load(open(os.path.join(RACINE, 'cartographie', 'reseau.json')))
resultats, erreurs, ecritures = [], [], []
def ok(c, nom):
    print(('OK ' if c else 'ÉCHEC ') + nom, flush=True); resultats.append({'test': nom, 'ok': bool(c)})
def voisins(i): return [l for l in RESEAU['liens'] if l['de'] == i or l['vers'] == i]

def page(b, statut=None, w=1440, h=1000):
    pg = b.new_page(viewport={'width': w, 'height': h})
    pg.on('pageerror', lambda e: erreurs.append(str(e)))
    pg.on('console', lambda m: erreurs.append(m.text) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
    def api(route):
        u = route.request.url
        if '/api/systeme' in u:
            if statut == 200: return route.fulfill(status=200, content_type='application/json', body=INSPECTION)
            return route.fulfill(status=statut or 401, content_type='application/json', body=json.dumps({'ok': False, 'raison': 'La lecture d’inspection est réservée aux personnes autorisées.'}))
        if '/api/auth/get-session' in u: return route.fulfill(status=200, content_type='application/json', body='null')
        return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': False}))
    pg.route('**/api/**', api)
    pg.on('request', lambda r: ecritures.append(r.method + ' ' + r.url) if r.method not in ('GET', 'HEAD', 'OPTIONS') else None)
    return pg

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = page(b); pg.goto(B + '/systeme-nerveux'); pg.wait_for_timeout(600)
    ok(pg.locator('.sn-famille').count() == 6, 'carte : six familles sur une branche')
    ok(pg.locator('.sn-famille li').count() == len(RESEAU['noeuds']), 'carte : un point par nœud du modèle')
    texte = pg.locator('main').inner_text()
    ok(not any(x in texte.lower() for x in ['src/', '.tsx', '.mjs', 'tests/', 'modules du dépôt']), 'lecture publique : aucun fichier ni test affiché')
    pg.screenshot(path=OUT + 'carte.png')
    pg.get_by_role('button', name='Dock du haut, Vérifié', exact=True).click(); pg.wait_for_timeout(900)
    n = len(voisins('dock-haut'))
    ok(pg.locator('.sn-fiche h3').inner_text() == 'Dock du haut' and 'noeud=dock-haut' in pg.url, 'sélection : la fiche du point s’ouvre')
    ok(pg.locator('.sn-famille li.lie').count() == len({l['vers'] if l['de'] == 'dock-haut' else l['de'] for l in voisins('dock-haut')}) and pg.locator('.sn-liens path').count() == n, 'sélection : les connexions apparaissent (%d)' % n)
    ok(pg.locator('.sn-fiche .sn-reserve').count() == 1, 'lecture publique : modules et tests réservés à l’inspection')
    pg.screenshot(path=OUT + 'selection.png')
    pg.locator('.sn-fiche .sn-lien-noeud', has_text='Loupe').click(); pg.wait_for_timeout(500)
    ok(pg.locator('.sn-fiche h3').inner_text().startswith('Loupe'), 'fiche : un lien mène au point voisin')
    pg.get_by_role('tab', name='Parcours').click(); pg.wait_for_timeout(300)
    premier = pg.locator('.sn-parcours').first
    ok(premier.locator('.sn-etapes > li').count() == len(RESEAU['parcours'][0]['etapes']) and 'étapes vérifiées' in premier.locator('.sn-bilan').inner_text(), 'parcours : chaque étape avec son état')
    ok('les morceaux de chacun' in premier.locator('.sn-bilan').inner_text().lower(), 'parcours : l’écriture en base reste annoncée « à vérifier »')
    union = pg.locator('.sn-parcours').nth(1)
    n = len(RESEAU['parcours'][1]['etapes']) if len(RESEAU['parcours']) > 1 else -1
    ok(union.count() == 1 and union.locator('.sn-etapes > li').count() == n and (str(n) + ' étapes vérifiées sur ' + str(n)) in union.locator('.sn-bilan').inner_text(), 'parcours : l’union, de l’intention à la base, entièrement vérifiée')
    pg.screenshot(path=OUT + 'parcours.png', full_page=True)
    pg.get_by_role('tab', name='Causalité').click(); pg.wait_for_timeout(300)
    ok(pg.locator('.sn-decales li').count() > 5 and 'n’existe pas encore' in pg.locator('.sn-chaine').inner_text(), 'causalité : la chaîne des conséquences, notifications annoncées comme prévues')
    pg.locator('.sn-choix select').nth(1).select_option('-15'); pg.wait_for_timeout(200)
    ok(pg.locator('.sn-decales li').count() == 0, 'causalité : avancer ne repousse personne')
    pg.screenshot(path=OUT + 'causalite.png', full_page=True)
    ok(pg.get_by_role('tab', name='Inventaire').count() == 0, 'lecture publique : pas d’inventaire')
    pg.close()

    pg = page(b, 401); pg.goto(B + '/systeme-nerveux?lecture=inspection'); pg.wait_for_timeout(600)
    ok(pg.locator('.sn-acces').count() == 1 and 'Entrez d’abord' in pg.locator('.sn-acces').inner_text() and pg.get_by_role('tab', name='Inventaire').count() == 0, 'inspection sans compte : entrer d’abord, rien d’autre')
    pg.close()
    pg = page(b, 403); pg.goto(B + '/systeme-nerveux?lecture=inspection'); pg.wait_for_timeout(600)
    ok('réservée' in pg.locator('.sn-acces').inner_text() and pg.get_by_role('tab', name='Inventaire').count() == 0, 'inspection refusée : la lecture publique reste')
    pg.close()
    pg = page(b, 200); pg.goto(B + '/systeme-nerveux?lecture=inspection&noeud=api-musique'); pg.wait_for_timeout(800)
    fiche = pg.locator('.sn-fiche').inner_text()
    ok('modules du dépôt' in fiche.lower() and 'api/musique.mjs' in fiche and ('réussi le' in fiche or 'lancé par npm test' in fiche), 'inspection : modules, données et tests du point')
    pg.screenshot(path=OUT + 'inspection-fiche.png')
    pg.get_by_role('tab', name='Inventaire').click(); pg.wait_for_timeout(400)
    ok(pg.locator('.sn-table').first.locator('tbody tr').count() == len(RESEAU['audit']), 'inspection : l’audit des doublons, une ligne par fonction')
    ok(pg.locator('.sn-entrees > li').count() > 3 and pg.locator('.sn-preuves li').count() >= 2, 'inspection : points d’entrée et preuves des parcours')
    pg.screenshot(path=OUT + 'inventaire.png', full_page=True)
    pg.close()

    pg = page(b, w=390, h=844); pg.goto(B + '/systeme-nerveux?noeud=page-musique'); pg.wait_for_timeout(700)
    ok(pg.evaluate('document.documentElement.scrollWidth') <= 390, 'mobile : pas de défilement horizontal')
    box = pg.locator('.sn-fiche').bounding_box()
    ok(box and box['y'] + box['height'] <= 844 - 80, 'mobile : la fiche s’ouvre au-dessus du dock du bas')
    pg.screenshot(path=OUT + 'mobile.png')
    pg.close(); b.close()

ok(not ecritures, 'diagnostic seulement : la page n’envoie aucune écriture')
ok(not erreurs, 'aucune erreur dans la console')
enregistrer_preuve('tests/e2e/systeme.py', resultats, 'aperçu local (vite preview), autorisation simulée')
print('ERREURS', erreurs); print('Captures :', OUT)
sys.exit(0 if all(r['ok'] for r in resultats) else 1)
