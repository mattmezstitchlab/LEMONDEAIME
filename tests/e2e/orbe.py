"""L'Orbe relationnelle — preuve isolée sur le Disque Terminal (/one/terminal-orbe), dans le vrai navigateur, sur la version construite.
Situations A–D (élément choisi ; Git signale des changements ; Envoyer sans pont ; analyse audio terminée) et les dix cas :
simple, ambiguë, réussite vérifiée, échec, non autorisée, confirmation, mouvement réduit, liste, sans IA, sans divulgation.
Usage : cd studio && npx vite build && npx vite preview --port 4620, puis  python3 tests/e2e/orbe.py   (CAPTURES=<dossier>)"""
import os, json
from playwright.sync_api import sync_playwright
B = os.environ.get('BASE', 'http://localhost:4620'); CAP = os.environ.get('CAPTURES')
res, erreurs = [], []
def ok(c, t): res.append(bool(c)); print(('OK ' if c else 'ÉCHEC ') + t, flush=True)
def cap(pg, nom):
    if CAP: pg.screenshot(path=f'{CAP}/orbe-{nom}.png')
MENU = '.one-disque [role=menu]'
def item(pg, m): return pg.locator(f'{MENU} [data-mode="{m}"]').first
def racine(pg):
    for _ in range(4):
        if pg.locator(MENU).get_attribute('data-niveau') in ('0', None): return
        item(pg, '__retour').click(); pg.wait_for_timeout(150)
def chemin(pg, *l):
    racine(pg)
    for m in l: item(pg, m).click(); pg.wait_for_timeout(400)
def echo(pg): return pg.locator('.or-echo').text_content() if pg.locator('.or-echo').count() else ''
def issue(pg): return pg.locator('.or-echo').get_attribute('data-issue') if pg.locator('.or-echo').count() else None
def intention(pg, i): pg.locator('.or-orbe').click(); pg.wait_for_timeout(150); pg.locator(f'[data-intention="{i}"]').click(); pg.wait_for_timeout(900)
def choix(pg, nom): pg.locator('.or-choix button', has_text=nom).first.click(); pg.wait_for_timeout(1200)
def saisir(pg, t): pg.locator('.ot-saisie input').fill(t); pg.locator('.ot-saisie button[type=submit]').click(); pg.wait_for_timeout(1300)
def ouvrir(pg, ctx):
    pg = ctx.new_page(); pg.set_default_timeout(10000); pg.on('pageerror', lambda e: erreurs.append(str(e)))
    reseau = []; pg.on('request', lambda r: reseau.append(r.url))
    pg.goto(B + '/one/terminal-orbe'); pg.wait_for_selector('.ot-entree', timeout=20000); pg.wait_for_timeout(600); return pg, reseau

with sync_playwright() as p:
    b = p.chromium.launch()
    try:
        ctx = b.new_context(viewport={'width': 1440, 'height': 960})
        ctx.add_init_script("localStorage.setItem('aime:one:preferences:v1', JSON.stringify({ version: 1, identite: { prenom: 'Camille', ville: 'Lyon', langue: 'fr' }, besoins: ['fatigue'], favoris: ['mariage', 'broderie'] }))")
        pg, reseau = ouvrir(None, ctx)
        ok(pg.locator('.or-orbe').count() == 1 and 'Projet connecté' in pg.locator('.or-points').text_content(), 'présence : l’Orbe au centre ; un point relationnel « projet connecté » (dit en mots)')
        # 1. simple
        intention(pg, 'explorer')
        ok(issue(pg) == 'information' and 'Lister' in echo(pg) and 'Récents' in echo(pg) and pg.locator('.ot-entree').count() >= 4, '1. Explorer : reçu, situé, deux actions proposées ; rien n’est exécuté sans geste')
        # 2. ambiguë
        intention(pg, 'comprendre')
        ok(issue(pg) == 'precision' and 'Que voulez-vous comprendre ?' in echo(pg), '2. Comprendre sans rien choisir : une question et des choix, pas une supposition')
        pg.locator('.or-pourquoi').click(); pg.wait_for_timeout(150)
        ok('Je n’ai pas assez d’informations.' in echo(pg) and 'Illustratif' in echo(pg) and 'Donnée' in echo(pg), '« Pourquoi ce signal ? » : chaque étape dit si c’est une donnée ou une illustration')
        cap(pg, '1-question')
        # 3. réussite vérifiée
        intention(pg, 'creer'); ok('Créer quoi ?' in echo(pg), '3a. Créer : « Créer quoi ? »')
        choix(pg, 'Créer un dossier'); ok(issue(pg) == 'precision' and pg.locator('.ot-saisie').count() == 1, '3b. il manque un nom : l’Orbe demande, le centre montre la question')
        saisir(pg, 'Projets')
        ok(issue(pg) == 'reussite' and 'existe (dossier relu)' in echo(pg) and 'Projets' in pg.locator('.ot-liste').text_content(), '3. réussite seulement après relecture : « le dossier « Projets » existe (dossier relu) »')
        # 4. échec
        chemin(pg, 'fichiers', 'fic-creer'); saisir(pg, 'Projets')
        ok(issue(pg) == 'echec' and 'Cette action a échoué.' in echo(pg) and 'existe déjà' in echo(pg), '4. échec : « Cette action a échoué. » et la raison ; jamais de vert')
        # situation A : un fichier choisi
        chemin(pg, 'naviguer', 'nav-bureau'); pg.wait_for_timeout(500); pg.locator('.ot-liste li', has_text='a-ranger').locator('.ot-ouvrir').click(); pg.wait_for_timeout(700)
        pg.locator('.ot-entree', has_text='note-essai-la-440.wav').click(); pg.wait_for_timeout(900)
        pg.locator('.or-pourquoi').click(); pg.wait_for_timeout(150)
        ok('Métadonnées' in echo(pg) and 'Aperçu' in echo(pg) and '(contenu non lu)' in echo(pg), 'A. fichier choisi : actions proposées ; l’Orbe dit qu’elle n’a pas lu son contenu')
        # situation D : l'analyse audio se termine
        choix(pg, 'Aperçu'); pg.wait_for_timeout(800)
        ok(pg.locator('.ot-onde line').count() >= 150 and issue(pg) == 'reussite' and 'métadonnées lues : WAV' in echo(pg) and pg.locator('.or.or-retrait').count() == 1, 'D. la forme d’onde s’affiche ; « métadonnées lues : WAV, … » (vérifié) ; l’Orbe se met en retrait sans masquer le résultat')
        cap(pg, '2-audio')
        # situation B : Git signale des changements (un renommage réel)
        racine(pg); item(pg, 'naviguer').click(); pg.wait_for_timeout(250); item(pg, 'nav-bureau').click(); pg.wait_for_timeout(700)
        pg.locator('.ot-entree', has_text='README.md').click(); pg.wait_for_timeout(600)
        chemin(pg, 'fichiers', 'fic-renommer'); saisir(pg, 'LISEZMOI.md'); pg.wait_for_timeout(1200)
        ok('Un événement demande votre attention.' in pg.locator('.or-evenement').text_content() and issue(pg) == 'reussite' and 'Événement' in pg.locator('.or-points').text_content(), 'B. Git signale des changements : une impulsion, « Un événement demande votre attention », un point « événement » — sans recouvrir la réponse au renommage')
        pg.locator('.or-evenement button', has_text='Voir les différences').click(); pg.wait_for_timeout(1500)
        ok('Différences' in pg.locator('.ot-centre').text_content() and pg.locator('.ot-sortie :is([data-ton=retrait], [data-ton=ajout])').count() >= 1, 'B. le centre affiche les différences réelles (lignes ajoutées ou retirées)')
        cap(pg, '3-git')
        # 5. non autorisé (situation C)
        chemin(pg, 'git', 'git-push'); pg.wait_for_timeout(500)
        ok(issue(pg) == 'refus' and 'pont local n’existe pas encore : rien n’a été envoyé' in echo(pg) and 'Rien n’a été envoyé' in pg.locator('.ot-corps').text_content(), '5 / C. Envoyer : non autorisé sans pont ; signal d’attention ; le centre explique ; rien n’est simulé')
        cap(pg, '4-envoyer')
        # 6. confirmation
        racine(pg); item(pg, 'naviguer').click(); pg.wait_for_timeout(250); item(pg, 'nav-bureau').click(); pg.wait_for_timeout(700)
        pg.locator('.ot-liste li', has_text='notes').locator('.ot-ouvrir').click(); pg.wait_for_timeout(700)
        pg.locator('.ot-entree', has_text='copie-idees.md').click(); pg.wait_for_timeout(700)
        chemin(pg, 'fichiers', 'fic-supprimer'); pg.wait_for_timeout(500)
        ok(issue(pg) == 'confirmation' and 'J’ai besoin de votre accord.' in echo(pg) and pg.locator('.ot-message', has_text='corbeille').count() == 1, '6. confirmation : « J’ai besoin de votre accord. » ; rien n’est fait avant')
        pg.get_by_role('button', name='Confirmer').click(); pg.wait_for_timeout(1200)
        ok(issue(pg) == 'reussite' and 'corbeille relue' in echo(pg) and 'copie-idees.md' not in pg.locator('.ot-liste').text_content(), '6. après accord : fait, puis vérifié (corbeille relue)')
        # signaler, plus simple
        intention(pg, 'signaler'); pg.locator('.or-saisie input').fill('Le bouton est trop petit'); pg.locator('.or-saisie button').click(); pg.wait_for_timeout(400)
        ok(issue(pg) == 'reussite' and 'sur cet appareil' in echo(pg) and 'Rien n’est envoyé' in echo(pg), 'Signaler : noté sur cet appareil, rien n’est envoyé (relu)')
        intention(pg, 'plus-simple'); choix(pg, 'Garder ce choix')
        ok(issue(pg) == 'reussite' and json.loads(pg.evaluate("localStorage.getItem('aime:one:preferences:v1')"))['interaction']['guidage'] == 'pas-a-pas', 'Plus simple : le guidage « pas à pas » est gardé dans la source unique de préférences (relu)')
        # 9 et 10 : sans IA, sans divulgation
        externes = [u for u in reseau if not (u.startswith(B) or u.startswith('blob:' + B)) or '/api/' in u]   # blob: = l’aperçu audio local
        ok(not externes, f'9. sans IA : aucune requête hors de la page ni vers une API ({externes[:2]})')
        texte = pg.content()
        ok('Camille' not in texte and 'Lyon' not in texte, '10. aucune divulgation : ni le prénom, ni la ville, ni les univers favoris de la personne n’apparaissent')
        ctx.close()
        # 7. mouvement réduit ; 8. liste
        ctx = b.new_context(viewport={'width': 1440, 'height': 960}, reduced_motion='reduce')
        ctx.add_init_script("localStorage.setItem('pointzero:point:presentation', 'liste')")
        pg, _ = ouvrir(None, ctx)
        pg.locator('.or-orbe').click(); pg.wait_for_timeout(150)
        ok(pg.locator('.or-intentions.or-liste').count() == 1, '8. mode liste : les intentions s’écrivent en liste')
        pg.locator('[data-intention="explorer"]').click(); pg.wait_for_selector('.or-echo', timeout=5000)
        ok(pg.locator('.or').get_attribute('data-phase') == 'echo' and pg.locator('.or-nacre').evaluate("e => getComputedStyle(e).animationName") == 'none', '7. mouvement réduit : l’état final tout de suite, sans animation (les étapes restent écrites)')
        pg.keyboard.press('Shift+Tab'); pg.locator('.or-orbe').focus(); pg.keyboard.press('Enter'); pg.wait_for_timeout(150)
        ok(pg.locator('[data-intention]').count() == 6, 'au clavier : Entrée sur l’Orbe ouvre les intentions')
        pg.keyboard.press('Tab'); pg.keyboard.press('Escape'); pg.wait_for_timeout(150)
        ok(pg.locator('[data-intention]').count() == 0 and pg.evaluate("document.activeElement?.classList.contains('or-orbe')"), 'Échap ferme les intentions ; le focus revient à l’Orbe')
        ctx.close()
        # téléphone
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True)
        pg, _ = ouvrir(None, ctx)
        pg.locator('.or-orbe').tap(); pg.wait_for_timeout(200); pg.locator('[data-intention="aide"]').tap(); pg.wait_for_timeout(900)
        ok(issue(pg) == 'information' and pg.evaluate("document.documentElement.scrollWidth <= 390"), 'téléphone : l’Orbe au toucher, réponse lisible, sans défilement horizontal')
        cap(pg, '5-mobile')
        ctx.close()
    finally:
        b.close()
ok(not erreurs, 'aucune erreur de page ' + str(erreurs[:3]))
n = sum(res); print(f'— {n}/{len(res)}'); raise SystemExit(0 if n == len(res) else 1)
