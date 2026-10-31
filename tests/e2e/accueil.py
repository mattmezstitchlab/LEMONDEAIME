"""LA PREMIÈRE PAGE (/), côté interface, sur ordinateur (1440) et téléphone (390).
Prouve : les quatre chemins sont de vrais liens ; les quatre phrases de la phase 01 donnent une proposition honnête ;
le parcours Accueil → Organiser → AIME Wedding → Retour accueil ; pas de débordement horizontal ; cibles tactiles >= 44 px.
Les API sont simulées (session, projets) : le serveur est prouvé par tests/server. Le StudiO (/studio/) est une autre application : ici on vérifie seulement que le lien y mène.
Usage : npm run build && npx vite preview --port 4610, puis  python3 tests/e2e/accueil.py     Captures : CAPTURES=<dossier>"""
import json, os, sys
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

B = os.environ.get('BASE', 'http://localhost:4610')
CAP = os.environ.get('CAPTURES')
resultats, erreurs = [], []
def ok(c, nom, detail=''):
    print(('OK ' if c else 'ÉCHEC ') + nom + (' — ' + str(detail) if detail and not c else ''), flush=True); resultats.append(bool(c))
def capture(pg, nom, pleine=True):
    if CAP: os.makedirs(CAP, exist_ok=True); pg.screenshot(path=os.path.join(CAP, nom + '.png'), full_page=pleine)
PROJETS = [
    {'slug': 'brode-way', 'titre': 'Brode Way', 'categorie': 'Broderie', 'annee': 2026, 'statut': 'en-ligne', 'ordre': 1, 'une': True, 'publie': True, 'accroche': 'L’atelier.', 'description': 'Un.', 'role': 'Tout', 'lien': '/studio/atelier', 'couverture': '/media/studio/dessiner.jpg', 'alt': 'Broderie'},
    {'slug': 'aime-wedding', 'titre': 'AIME Wedding', 'categorie': 'Mariage', 'annee': 2026, 'statut': 'en-cours', 'ordre': 2, 'une': False, 'publie': True, 'accroche': 'L’union.', 'description': 'Deux.', 'role': 'Tout', 'lien': '/aime-wedding', 'couverture': '/media/wedding/piscine.jpg', 'alt': 'Mariage'},
]
def simuler(pg, qui):
    def api(route):
        u = urlparse(route.request.url)
        rep = lambda code, o: route.fulfill(status=code, content_type='application/json', body=json.dumps(o))
        if u.path == '/api/auth/get-session': return rep(200, {'user': qui} if qui else None)
        if u.path == '/api/projets': return rep(200, {'ok': True, 'projets': PROJETS})
        return rep(200, {'ok': False})
    pg.route('**/api/**', api)
def page(b, largeur, qui=None):
    mobile = largeur < 700
    ctx = b.new_context(viewport={'width': largeur, 'height': 844 if mobile else 900}, reduced_motion='reduce', has_touch=mobile, is_mobile=mobile, device_scale_factor=2 if mobile else 1)
    pg = ctx.new_page(); pg.set_default_timeout(6000)
    pg.on('pageerror', lambda e: erreurs.append(str(e)))
    simuler(pg, qui); return pg

PHRASES = [
    ('Je prépare mon mariage.', 'Organiser', '/aime-wedding', 'Disponible'),
    ('Je veux créer un site.', 'Créer', None, 'Pas encore disponible'),
    ('Je veux retrouver mes projets.', 'Mes projets', '/buro', 'Connexion nécessaire'),
    ('Je recherche un musicien.', 'Découvrir', '/reseau', 'Disponible'),
]
def chemin_url(pg): return urlparse(pg.url).path

with sync_playwright() as p:
    b = p.chromium.launch()
    for nom, largeur in (('ordinateur', 1440), ('téléphone', 390)):
        pg = page(b, largeur); tag = nom + ' · '
        pg.goto(B + '/'); pg.wait_for_selector('h1')
        ok(pg.inner_text('h1').strip().lower().startswith('tout commence ici'), tag + 'le titre « Tout commence ici. »')
        ok(pg.evaluate("getComputedStyle(document.querySelector('h1')).fontWeight") == '900', tag + 'signature en 900')
        police = pg.evaluate("getComputedStyle(document.body).fontFamily")
        ok('Inter Tight' in police, tag + 'police Inter Tight déclarée', police)
        ok(pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), tag + 'aucun débordement horizontal')
        ok(pg.locator('.dock-haut').count() == 1 and pg.locator('.dock-bas').count() == 1, tag + 'les deux docks (haut et bas)')
        ok(pg.locator('.carre-orbe').count() == 1, tag + 'l’orbe de la charte (Menu AIME et Mon confort) est présente')
        # les quatre chemins sont de vrais liens
        hrefs = pg.eval_on_selector_all('a.ac-chemin', 'els => els.map(e => e.getAttribute("href"))')
        ok(hrefs == ['/aime-wedding', '/studio/atelier', '/buro', '/projets'], tag + 'quatre chemins = quatre liens réels', hrefs)
        verbes = pg.eval_on_selector_all('.dock-haut a.outil', 'els => els.map(e => e.textContent.trim() + "|" + e.getAttribute("href"))')
        for v in ('Organiser|/aime-wedding', 'Créer|/studio/atelier', 'Mes projets|/buro', 'Découvrir|/projets'):
            ok(v in verbes, tag + 'verbe du dock « ' + v + ' »', verbes)
        capture(pg, ('accueil-' + nom).replace('é', 'e'))
        # les quatre phrases
        for phrase, ch, href, etat in PHRASES:
            pg.fill('#q', phrase); r = pg.inner_text('[data-testid=resultat]')
            ok(ch in r and etat in r and 'rien n’a été exécuté' in r.lower(), tag + 'phrase « ' + phrase + ' » → ' + ch + ' · ' + etat, r)
            if href: ok(pg.locator('[data-testid=resultat] a.noir').get_attribute('href') == href, tag + '  destination ' + href)
            else:
                ok(pg.locator('[data-testid=resultat] a.noir').count() == 0 and pg.locator('[data-testid=resultat] a').first.get_attribute('href') == '/studio/atelier', tag + '  aucun faux bouton « Ouvrir », seule l’alternative réelle est proposée')
        pg.fill('#q', 'bonjour'); ok('ne reconnais pas' in pg.inner_text('[data-testid=resultat]'), tag + 'phrase vague → aveu clair')
        pg.fill('#q', '')
        # cibles tactiles (téléphone)
        if largeur < 700:
            petits = pg.evaluate("""() => [...document.querySelectorAll('a, button, input')].filter(e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && !e.closest('.sr-only') && !e.classList.contains('sr-only') && e.tabIndex >= 0 && (r.height < 44 || r.width < 44) && !(e.tagName === 'A' && e.parentElement && e.parentElement.closest('p, li') && e.closest('p') && false); }).map(e => e.tagName + ':' + (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 30) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height))""")
            ok(not petits, tag + 'cibles tactiles >= 44 px', petits)
        # PARCOURS : Accueil → Organiser → AIME Wedding → Retour accueil
        pg.goto(B + '/'); pg.wait_for_selector('h1')
        pg.locator('a.ac-chemin[data-chemin=organiser]').click()
        pg.wait_for_url('**/aime-wedding'); pg.wait_for_selector('h1')
        ok(chemin_url(pg) == '/aime-wedding', tag + 'Organiser mène à /aime-wedding')
        ok('wedding' in pg.title().lower(), tag + 'la page AIME Wedding est bien chargée', pg.title())
        capture(pg, ('wedding-' + nom).replace('é', 'e'), False)
        pg.get_by_role('button', name='Revenir là où vous étiez').click(); pg.wait_for_url(B + '/'); pg.wait_for_selector('h1')
        ok(chemin_url(pg) == '/' and 'tout commence ici' in pg.inner_text('h1').lower(), tag + 'la flèche retour ramène à l’accueil')
        pg.locator('a.ac-chemin[data-chemin=organiser]').click(); pg.wait_for_url('**/aime-wedding')
        pg.get_by_role('link', name='AIME, accueil').first.click(); pg.wait_for_url(B + '/')
        ok(chemin_url(pg) == '/' and pg.locator('h1').inner_text().lower().startswith('tout commence'), tag + 'la marque AIME® ramène aussi à l’accueil')
        # via la phrase puis le bouton « Ouvrir »
        pg.fill('#q', 'Je prépare mon mariage.'); pg.locator('[data-testid=resultat] a.noir').click(); pg.wait_for_url('**/aime-wedding')
        ok(True, tag + 'la phrase mène à AIME Wedding par le bouton « Ouvrir »')
        # Mes projets : sans session → l’espace demande d’entrer ; avec session → l’espace s’ouvre
        pg.goto(B + '/'); pg.locator('a.ac-chemin[data-chemin=projets]').click(); pg.wait_for_url('**/buro')
        pg.wait_for_selector('main, h1', timeout=6000)
        ok('Entrer' in pg.inner_text('body') and 'Entrez' in pg.inner_text('body'), tag + 'Mes projets sans session : l’espace demande d’entrer (pas de faux projets)')
        # Découvrir → portfolio
        pg.goto(B + '/'); pg.locator('a.ac-chemin[data-chemin=decouvrir]').click(); pg.wait_for_url('**/projets')
        pg.wait_for_selector('text=Brode Way'); ok(pg.locator('text=Brode Way').count() > 0, tag + 'Découvrir mène au portfolio réel')
        # Créer → le lien va au StudiO (autre application)
        pg.goto(B + '/'); h = pg.locator('a.ac-chemin[data-chemin=creer]')
        with pg.expect_navigation(): h.click()
        ok(chemin_url(pg).startswith('/studio/atelier'), tag + 'Créer mène à /studio/atelier (chargement complet, autre application)', pg.url)
        pg.context.close()
        # connecté : l’état de Mes projets le dit
        pg = page(b, largeur, {'id': 'u1', 'email': 'a@b.fr', 'name': 'Alice'})
        pg.goto(B + '/'); pg.wait_for_selector('h1')
        pg.wait_for_function("document.querySelector('a[data-chemin=projets]').textContent.includes('Connecté')")
        ok(True, tag + 'connecté : le chemin Mes projets l’indique')
        pg.context.close()
    b.close()
ok(not erreurs, 'aucune erreur JavaScript non gérée', erreurs)
n = sum(resultats); print(f'\n{n}/{len(resultats)} contrôles réussis'); sys.exit(0 if n == len(resultats) else 1)
