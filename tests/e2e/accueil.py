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
def ouvert(pg):
    """La zone d'intention est repliée par défaut (Porte 1) : on l'ouvre avant d'y toucher."""
    if pg.locator('details.ac-details[open]').count() == 0: pg.locator('.ac-details > summary').click()
    return pg
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
        ok(' '.join(pg.inner_text('h1').split()).lower().startswith('vous imaginez votre mariage. aime lui donne forme'), tag + 'le titre « Vous imaginez votre mariage. AIME lui donne forme. »', pg.inner_text('h1'))
        ok(pg.evaluate("getComputedStyle(document.querySelector('h1')).fontWeight") == '900', tag + 'signature en 900')
        police = pg.evaluate("getComputedStyle(document.body).fontFamily")
        ok('Inter Tight' in police, tag + 'police Inter Tight déclarée', police)
        ok(pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), tag + 'aucun débordement horizontal')
        ok(pg.locator('.dock-haut').count() == 1 and pg.locator('.dock-bas').count() == 1, tag + 'les deux docks (haut et bas)')
        ok(pg.locator('.carre-orbe').count() == 1, tag + 'l’orbe de la charte (Menu AIME et Mon confort) est présente')
        # les quatre chemins sont de vrais liens
        hrefs = pg.eval_on_selector_all('a.ac-chemin', 'els => els.map(e => e.getAttribute("href"))')
        ok(hrefs == ['/aime-wedding', '/studio/atelier', '/buro', '/projets'], tag + 'quatre chemins = quatre liens réels', hrefs)
        verbes = pg.eval_on_selector_all('.dock-haut .rangee a.outil', 'els => els.map(e => e.textContent.trim() + "|" + e.getAttribute("href"))')
        ok(verbes == ['Mariage|/aime-wedding', 'Prestataires|/reseau?domaine=mariage', 'Projets & Créations|/projets', 'Mon espace|/buro'], tag + 'le dock du haut : quatre entrées, quatre destinations réelles', verbes)
        # docks, lot 1 : ordinateur = la rangée du dock ; téléphone = un bouton « Menu » explicite (plus de défilement invisible)
        rang = pg.evaluate("getComputedStyle(document.querySelector('.dock-haut .rangee')).display")
        menu = pg.locator('.dock-haut .menu-mobile')
        if largeur < 700:
            ok(rang == 'none' and menu.is_visible(), tag + 'téléphone : la rangée qui défilait est remplacée par le bouton Menu')
            menu.click(); pg.wait_for_selector('.bloc-entrees')
            liens = pg.eval_on_selector_all('.bloc-entrees a', 'els => els.map(e => e.textContent.trim() + "|" + e.getAttribute("href") + "|" + Math.round(e.getBoundingClientRect().height))')
            ok([x.rsplit('|', 1)[0] for x in liens] == ['Mariage|/aime-wedding', 'Prestataires|/reseau?domaine=mariage', 'Projets & Créations|/projets', 'Mon espace|/buro'] and all(int(x.rsplit('|', 1)[1]) >= 44 for x in liens), tag + 'le menu : quatre entrées, destinations réelles, cibles >= 44 px', liens)
            pg.keyboard.press('Escape'); pg.wait_for_selector('.bloc-entrees', state='detached')
            ok(pg.evaluate("document.activeElement.classList.contains('menu-mobile')"), tag + 'Échap referme le menu et rend le focus au bouton Menu')
        else: ok(rang != 'none' and not menu.is_visible(), tag + 'ordinateur : la rangée du dock suffit (bouton Menu masqué)')
        # Porte 1 : le sous-titre, les deux actions du héros, la photographie conservée
        ok(pg.locator('.ac-pan-mariage .ac-hero-sous').inner_text().strip() == 'Tout votre mariage, au même endroit.', tag + 'le sous-titre')
        acts = pg.eval_on_selector_all('.ac-pan-mariage .ac-hero-actions a', 'els => els.map(e => e.textContent.trim() + "|" + e.getAttribute("href"))')
        ok(acts == ['Créer notre mariage|/buro?creer=mariage', 'Retrouver notre mariage|/buro'], tag + 'deux actions : Créer → /buro?creer=mariage, Retrouver → /buro', acts)
        ok(pg.locator('.ac-pan-mariage > img').get_attribute('src') == '/media/union.jpg' and pg.evaluate("getComputedStyle(document.querySelector('.ac-pan-mariage > img')).objectFit") == 'cover', tag + 'la photographie union.jpg et sa composition sont conservées')
        ok(pg.evaluate("document.querySelector('.ac-pan-mariage .bouton').getBoundingClientRect().bottom < window.innerHeight"), tag + 'les deux actions du mariage sont visibles sans défiler')
        # A1 : deux panneaux, Mariage et Broderie
        ok(pg.locator('.ac-pan').count() == 2 and pg.locator('h1').count() == 1 and pg.locator('.ac-pan-broderie h2').count() == 1, tag + 'deux panneaux ; un seul h1 (Mariage), un h2 (Broderie)')
        ok(pg.locator('.ac-pan-broderie > img').get_attribute('src') == '/media/broderie.jpg', tag + 'la photographie broderie.jpg est celle du panneau Broderie')
        ok(pg.locator('.ac-pan-broderie .surtitre').text_content().strip() == 'Broderie — L’atelier Point Zéro', tag + 'le panneau Broderie porte le nom « Broderie — L’atelier Point Zéro »')
        imp = pg.locator('.ac-pan-broderie [data-action=importer]')
        ok(imp.count() == 1 and imp.get_attribute('aria-disabled') == 'true' and imp.get_attribute('href') is None and 'Bientôt' in imp.inner_text() and 'Importer mon patron PDF' in imp.inner_text(), tag + '« Importer mon patron PDF » est indisponible : « Bientôt », aucun lien')
        ok(pg.locator('#pz-note').count() == 1 and imp.get_attribute('aria-describedby') == 'pz-note', tag + 'la raison de l’indisponibilité est écrite et reliée au bouton')
        exp = pg.locator('.ac-pan-broderie [data-action=explorer]')
        ok(exp.inner_text().strip() == 'Explorer la broderie' and exp.get_attribute('href') == '#broderie' and pg.locator('section#broderie').count() == 1, tag + '« Explorer la broderie » mène à la section #broderie, qui existe')
        liens_tous = pg.eval_on_selector_all('main a', 'els => els.map(e => e.getAttribute("href") || "")')
        ok(not any('/studio/atelier' in h and h != '/studio/atelier' for h in liens_tous) and pg.locator('.ac-pan-broderie a[href*="studio"]').count() == 0, tag + 'aucun lien du panneau Broderie vers l’atelier de ce site')
        pa = pg.evaluate("(() => { const r = [...document.querySelectorAll('.ac-pan')].map(e => e.getBoundingClientRect()); return r.map(x => [Math.round(x.left), Math.round(x.top), Math.round(x.width), Math.round(x.height)]); })()")
        if largeur >= 700:
            ok(abs(pa[0][2] - pa[1][2]) <= 2 and abs(pa[0][3] - pa[1][3]) <= 2 and pa[0][1] == pa[1][1], tag + 'ordinateur : deux panneaux côte à côte, même largeur et même hauteur', pa)
            ok(pg.evaluate("document.querySelector('.ac-pan-broderie .bouton').getBoundingClientRect().bottom < window.innerHeight"), tag + 'ordinateur : les actions de Broderie sont visibles sans défiler')
            capture(pg, 'accueil-ordinateur', False)
        else:
            ok(pa[1][1] > pa[0][1] + pa[0][3] - 2 and pa[0][2] == pa[1][2], tag + 'téléphone : panneaux empilés, pleine largeur', pa)
            ok(pa[1][1] < pg.evaluate('window.innerHeight') - 40, tag + 'téléphone : le panneau Broderie se devine dès le premier écran (défilement naturel)', pa)
            ok(pg.evaluate("parseFloat(getComputedStyle(document.querySelector('.ac-pan .signature')).fontSize)") >= 32, tag + 'téléphone : les titres restent lisibles (>= 32 px)')
            ok(all(int(x) >= 44 for x in pg.eval_on_selector_all('.ac-pan .bouton', 'els => els.map(e => Math.round(e.getBoundingClientRect().height))')), tag + 'téléphone : cibles tactiles >= 44 px')
            capture(pg, 'accueil-iphone', False)
        # la transition : six vignettes visibles, la légende dit que c’est une illustration
        ok(pg.locator('.ac-temps li').count() == 6 and pg.locator('.ac-temps li.vu').count() == 6, tag + 'transition : six vignettes visibles (mouvement réduit = bande statique)')
        ok('Illustration de la méthode' in pg.locator('.ac-legende-temps').inner_text(), tag + 'transition : la légende dit que c’est une illustration')
        # section honnête : rien de non disponible présenté comme disponible
        faire = pg.locator('.ac-faire').inner_text().lower()
        ok(all(m not in faire for m in ('budget', 'rsvp', 'devis', 'coordination', 'inviter')), tag + 'la liste « aujourd’hui » ne promet ni budget, ni RSVP, ni devis, ni coordination, ni invitation')
        ok('pas encore disponible' in pg.locator('.ac-pas-encore').inner_text().lower(), tag + 'ce qui n’existe pas encore est dit comme tel')
        ordre = pg.evaluate("[...document.querySelectorAll('main section')].map(s => s.id).filter(Boolean)")
        ok(ordre == ['broderie', 'aujourdhui', 'intention', 'projets-creations'] and pg.locator('#entree').count() == 1, tag + 'ordre des sections (#entree = les deux panneaux, puis la transition)', ordre)
        ok(pg.locator('details.ac-details[open]').count() == 0, tag + 'la zone d’intention est repliée par défaut')
        ok(pg.locator('.ac-details > summary').inner_text().startswith('Que souhaitez-vous faire aujourd’hui'), tag + 'la zone d’intention garde sa question, dans un résumé repliable')
        capture(pg, ('accueil-' + nom).replace('é', 'e'))
        # les quatre phrases
        for phrase, ch, href, etat in PHRASES:
            ouvert(pg).fill('#q', phrase); r = pg.inner_text('[data-testid=resultat]')
            ok(ch in r and etat in r and 'rien n’a été exécuté' in r.lower(), tag + 'phrase « ' + phrase + ' » → ' + ch + ' · ' + etat, r)
            if href: ok(pg.locator('[data-testid=resultat] a.noir').get_attribute('href') == href, tag + '  destination ' + href)
            else:
                ok(pg.locator('[data-testid=resultat] a.noir').count() == 0 and pg.locator('[data-testid=resultat] a').first.get_attribute('href') == '/studio/atelier', tag + '  aucun faux bouton « Ouvrir », seule l’alternative réelle est proposée')
        ouvert(pg).fill('#q', 'bonjour'); ok('ne reconnais pas' in pg.inner_text('[data-testid=resultat]'), tag + 'phrase vague → aveu clair')
        ouvert(pg).fill('#q', '')
        # cibles tactiles (téléphone)
        if largeur < 700:
            petits = pg.evaluate("""() => [...document.querySelectorAll('a, button, input')].filter(e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && !e.closest('.sr-only') && !e.classList.contains('sr-only') && e.tabIndex >= 0 && (r.height < 44 || r.width < 44) && !(e.tagName === 'A' && e.parentElement && e.parentElement.closest('p, li') && e.closest('p') && false); }).map(e => e.tagName + ':' + (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 30) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height))""")
            ok(not petits, tag + 'cibles tactiles >= 44 px', petits)
        # PARCOURS : Accueil → Organiser → AIME Wedding → Retour accueil
        pg.goto(B + '/'); pg.wait_for_selector('h1')
        ouvert(pg).locator('a.ac-chemin[data-chemin=organiser]').click()
        pg.wait_for_url('**/aime-wedding'); pg.wait_for_selector('h1')
        ok(chemin_url(pg) == '/aime-wedding', tag + 'Organiser mène à /aime-wedding')
        ok('wedding' in pg.title().lower(), tag + 'la page AIME Wedding est bien chargée', pg.title())
        capture(pg, ('wedding-' + nom).replace('é', 'e'), False)
        pg.get_by_role('button', name='Revenir là où vous étiez').click(); pg.wait_for_url(B + '/'); pg.wait_for_selector('h1')
        ok(chemin_url(pg) == '/' and 'vous imaginez votre mariage' in pg.inner_text('h1').lower(), tag + 'la flèche retour ramène à l’accueil')
        ouvert(pg).locator('a.ac-chemin[data-chemin=organiser]').click(); pg.wait_for_url('**/aime-wedding')
        pg.get_by_role('link', name='AIME, accueil').first.click(); pg.wait_for_url(B + '/')
        ok(chemin_url(pg) == '/' and pg.locator('h1').inner_text().lower().startswith('vous imaginez'), tag + 'la marque AIME® ramène aussi à l’accueil')
        # via la phrase puis le bouton « Ouvrir »
        ouvert(pg).fill('#q', 'Je prépare mon mariage.'); pg.locator('[data-testid=resultat] a.noir').click(); pg.wait_for_url('**/aime-wedding')
        ok(True, tag + 'la phrase mène à AIME Wedding par le bouton « Ouvrir »')
        # Mes projets : sans session → l’espace demande d’entrer ; avec session → l’espace s’ouvre
        pg.goto(B + '/'); ouvert(pg).locator('a.ac-chemin[data-chemin=projets]').click(); pg.wait_for_url('**/buro')
        pg.wait_for_selector('main, h1', timeout=6000)
        ok('Entrer' in pg.inner_text('body') and 'Entrez' in pg.inner_text('body'), tag + 'Mes projets sans session : l’espace demande d’entrer (pas de faux projets)')
        # Découvrir → portfolio
        pg.goto(B + '/'); ouvert(pg).locator('a.ac-chemin[data-chemin=decouvrir]').click(); pg.wait_for_url('**/projets')
        pg.wait_for_selector('text=Brode Way'); ok(pg.locator('text=Brode Way').count() > 0, tag + 'Découvrir mène au portfolio réel')
        # Créer → le lien va au StudiO (autre application)
        pg.goto(B + '/'); h = ouvert(pg).locator('a.ac-chemin[data-chemin=creer]')
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
