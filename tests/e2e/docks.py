"""Sujet n° 1 — docks et navigation : les décisions de la PR, vérifiées sur ordinateur, au clavier et sur téléphone.
Usage : npm run build && npx vite preview --port 4610, puis  python3 tests/e2e/docks.py [--sans-preuve]
API simulées (session d'essai) ; rien n'est écrit sur un serveur. Le résultat va dans cartographie/preuves.json."""
import json, os, struct, sys, tempfile, wave
from playwright.sync_api import sync_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from preuves import enregistrer_preuve

B = os.environ.get('BASE', 'http://localhost:4610')
RACINE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
STUDIO = open(os.path.join(RACINE, 'dist', 'studio', 'index.html')).read()
resultats, erreurs = [], []
def ok(c, nom):
    print(('OK ' if c else 'ÉCHEC ') + nom, flush=True); resultats.append({'test': nom, 'ok': bool(c)})

# un petit fichier audio, fabriqué ici : il ne quitte jamais l'appareil
SON = os.path.join(tempfile.mkdtemp(prefix='aime-son-'), 'essai-local.wav')
with wave.open(SON, 'w') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(8000); w.writeframes(b''.join(struct.pack('<h', 0) for _ in range(8000)))

def page(b, connecte=True, w=1440, h=900):
    pg = b.new_page(viewport={'width': w, 'height': h})
    pg.on('pageerror', lambda e: erreurs.append(str(e)))
    pg.on('console', lambda m: erreurs.append(m.text) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
    def api(route):
        u = route.request.url
        if '/api/auth/get-session' in u:
            return route.fulfill(status=200, content_type='application/json', body=json.dumps({'user': {'id': 'essai', 'email': 'essai@example.org', 'name': 'Camille Essai'}} if connecte else None))
        if '/api/buro' in u: return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'projets': []}))
        if '/api/musique?moi=1' in u: return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'musiques': []}))
        return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': False}))
    pg.route('**/api/**', api)
    pg.route('**/studio/atelier', lambda r: r.fulfill(status=200, content_type='text/html', body=STUDIO))
    return pg

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = page(b); pg.goto(B + '/'); pg.wait_for_timeout(600)

    # 1 · une seule « Déconnexion », dans l'espace
    pg.locator('.carre-orbe').click(); pg.wait_for_timeout(200)
    ok(pg.locator('.dock-haut').get_by_role('button', name='Déconnexion').count() == 0, 'déconnexion : absente du menu de l’orbe')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(150)
    pg.locator('.dock-haut .outil.profil').click(); pg.wait_for_timeout(300)
    ok(pg.locator('.dock-haut').get_by_role('button', name='Déconnexion').count() == 1, 'déconnexion : une seule, dans le bloc de l’espace')
    # 2 · l'espace : un seul nom, les raccourcis gardés
    ok(pg.locator('.dock-haut .outil.profil').get_attribute('aria-label').startswith('Mon espace'), 'espace : le rond du profil s’appelle « Mon espace »')
    ok(pg.locator('.mini-dock a', has_text='Ouvrir mon espace').count() == 1, 'espace : « Ouvrir mon espace » dans le bloc')
    ok(pg.locator('.bloc-dossiers a[href^="/buro?lieu="]').count() == 4, 'espace : les quatre dossiers restent des raccourcis')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(150)
    pied = pg.locator('footer.pied')
    ok(pied.locator('h2', has_text='Mon espace').count() == 1 and pied.get_by_role('link', name='Ouvrir mon espace').count() == 1 and pied.get_by_role('link', name='Mon profil').count() == 1,
       'espace : le pied dit « Mon espace », « Ouvrir mon espace », « Mon profil »')

    # 3 · la loupe : le Studio une seule fois, retrouvé par « atelier » et « broderie »
    pg.get_by_role('button', name='Chercher dans tout AIME, et le plan du site').click(); pg.wait_for_timeout(200)
    ok(pg.locator('.recherche-bloc a[href="/studio/atelier"]').count() == 1, 'loupe : le plan du site propose le Studio une seule fois')
    ok(pg.locator('.recherche-bloc a', has_text='Mon espace').count() == 1 and pg.locator('.recherche-bloc a', has_text='Votre espace').count() == 0, 'loupe : « Mon espace », comme partout')
    for mot in ['atelier', 'broderie', 'studio']:
        pg.fill('#champ-recherche', mot); pg.wait_for_timeout(150)
        ok(pg.locator('.recherche-bloc a[href="/studio/atelier"]').count() == 1, 'loupe : « %s » trouve le Studio, une fois' % mot)
    pg.fill('#champ-recherche', 'musique'); pg.wait_for_timeout(150)
    pg.locator('.recherche-bloc a', has_text='Musique').first.click(); pg.wait_for_timeout(500)
    ok(pg.locator('#bloc-dock').count() == 0 and pg.url.endswith('/musique'), 'loupe : choisir un résultat ferme le bloc et change de page')

    # 4 · la musique de l'appareil n'est pas la bibliothèque du compte
    ok(pg.locator('.musique-ici').count() == 1 and 'appareil' in pg.locator('.musique-ici').inner_text(), '/musique : la page dit que ses morceaux sont ceux du compte, pas ceux de l’appareil')
    pg.locator('.dock-bas .orbe-dock').click(); pg.wait_for_timeout(150)
    pg.locator('.dock-bas .halo-mode', has_text='Musique').click(); pg.wait_for_timeout(150)
    bouton = pg.locator('.dock-bas button', has_text='Fichier de cet appareil')
    ok(bouton.count() == 1 and 'rien n’est envoyé' in (bouton.get_attribute('aria-label') or ''), 'dock, Musique : « Fichier de cet appareil », rien n’est envoyé')
    ok(pg.locator('.dock-bas a.lieu', has_text='Mes morceaux').count() == 1, 'dock, Musique : « Mes morceaux » mène à la bibliothèque du compte')
    pg.locator('.dock-bas input[type=file]').set_input_files(SON); pg.wait_for_timeout(600)
    ok('Sur cet appareil' in pg.locator('.dock-bas .piste-dock').inner_text(), 'dock, Musique : un fichier local est marqué « Sur cet appareil »')
    pg.close()

    # 5 · clavier : chaque bloc s'ouvre, se ferme avec Échap, et rend le focus
    pg = page(b); pg.goto(B + '/moments'); pg.wait_for_timeout(600)
    for selecteur, nom in [('.carre-orbe', 'orbe'), ('.outil.loupe', 'loupe'), ('.outil.profil', 'profil')]:
        o = pg.locator('.dock-haut ' + selecteur); o.focus(); pg.keyboard.press('Enter'); pg.wait_for_timeout(250)
        ouvert = o.get_attribute('aria-expanded') == 'true' and pg.evaluate("document.getElementById('bloc-dock')?.contains(document.activeElement)")
        pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
        rendu = o.get_attribute('aria-expanded') == 'false' and pg.evaluate("document.activeElement === document.querySelector('.dock-haut %s')" % selecteur)
        ok(ouvert and rendu, 'clavier, dock du haut : %s s’ouvre au clavier, Échap ferme et rend le focus' % nom)
    c = pg.locator('.dock-bas .orbe-dock'); c.focus(); pg.keyboard.press('Enter'); pg.wait_for_timeout(200)
    ouvert = c.get_attribute('aria-expanded') == 'true' and pg.locator('.dock-bas .halo-mode').count() >= 2
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    ok(ouvert and c.get_attribute('aria-expanded') == 'false' and pg.evaluate("document.activeElement === document.querySelector('.dock-bas .orbe-dock')"), 'clavier, dock du bas : le cercle ouvre les modes, Échap ferme et rend le focus')
    pg.keyboard.press('Tab'); pg.wait_for_timeout(100)
    ok(pg.evaluate("getComputedStyle(document.activeElement).outlineStyle !== 'none'"), 'clavier : le focus reste visible dans le dock du bas')
    ok(pg.locator('.dock-haut .outil.carre[aria-label="Revenir là où vous étiez"]').count() == 1, 'retour : la flèche est là hors de l’accueil')
    pg.close()
    pg = page(b); pg.goto(B + '/'); pg.wait_for_timeout(400)
    ok(pg.locator('.dock-haut .outil.carre[aria-label="Revenir là où vous étiez"]').count() == 0, 'retour : pas de flèche sur l’accueil sans historique')
    pg.close()

    # 6 · téléphone
    pg = page(b, w=390, h=844); pg.goto(B + '/'); pg.wait_for_timeout(600)
    ok(pg.evaluate('document.documentElement.scrollWidth') <= 390, 'téléphone : aucune page ne déborde (accueil)')
    r = pg.locator('.dock-haut .rangee')
    deborde = r.evaluate('e => e.scrollWidth > e.clientWidth')
    ok(deborde and r.evaluate("e => getComputedStyle(e).maskImage !== 'none' || getComputedStyle(e).webkitMaskImage !== 'none'"), 'téléphone : les rubriques qui dépassent sont signalées par un fondu')
    r.evaluate('e => e.scrollLeft = e.scrollWidth'); pg.wait_for_timeout(200)
    ok(pg.locator('.dock-haut .rangee a', has_text='Boutique').is_visible(), 'téléphone : les rubriques défilent jusqu’à la dernière')
    petites = pg.evaluate("[...document.querySelectorAll('.dock-haut button, .dock-haut a, .dock-bas button, .dock-bas a')].filter(e => e.offsetParent).map(e => e.getBoundingClientRect()).filter(r => r.height < 44 || r.width < 44).length")
    ok(petites == 0, 'téléphone : chaque commande des docks fait au moins 44 px')
    pg.locator('.dock-haut .outil.profil').click(); pg.wait_for_timeout(300)
    bb = pg.locator('#bloc-dock').bounding_box()
    ok(bb and bb['x'] >= 0 and bb['x'] + bb['width'] <= 390, 'téléphone : le bloc de l’espace tient dans l’écran')
    pg.close()

    # 7 · le Studio : son propre routeur et ses propres docks, avec un chemin vers le site
    pg = page(b); pg.goto(B + '/studio/atelier'); pg.wait_for_timeout(1500)
    ok(pg.locator('a[href="/"]').count() >= 1, 'Studio : un lien ramène au Monde AIME')
    ok(pg.locator('.dock-haut').count() == 0 and pg.locator('nav').count() >= 1, 'Studio : ses docks sont les siens (pas ceux du site)')
    pg.close(); b.close()

ok(not erreurs, 'aucune erreur dans la console')
if '--sans-preuve' not in sys.argv: enregistrer_preuve('tests/e2e/docks.py', resultats, 'aperçu local (vite preview), API simulées')
print('ERREURS', erreurs)
sys.exit(0 if all(r['ok'] for r in resultats) else 1)
