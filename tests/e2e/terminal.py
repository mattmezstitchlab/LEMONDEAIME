""".0NE — le Disque Terminal, dans le vrai navigateur, sur la version construite, sur un VRAI dossier (l'espace d'essai privé du navigateur).
Preuves : la racine et ses familles ; le centre montre le contexte réel ; créer, renommer, annuler ; la commande réelle à la demande ;
Git (état, ajouter, valider) avec ses points lumineux ; envoyer annoncé comme demandant un pont (rien d'envoyé) ; Audio (aperçu circulaire,
durée, ranger dans le dépôt) ; la commande tapée ; doublons ; persistance ; téléphone (contenu étendu, le Point à la demande) ; mouvement réduit.
Usage : cd studio && npx vite build && npx vite preview --port 4620, puis  python3 tests/e2e/terminal.py   (CAPTURES=<dossier>)"""
import os, re
from playwright.sync_api import sync_playwright
B = os.environ.get('BASE', 'http://localhost:4620'); CAP = os.environ.get('CAPTURES')
res, erreurs = [], []
def ok(c, t): res.append(bool(c)); print(('OK ' if c else 'ÉCHEC ') + t, flush=True)
def cap(pg, nom):
    if CAP: pg.screenshot(path=f'{CAP}/terminal-{nom}.png')
MENU = '[data-presentation][role=menu]'
def item(pg, m): return pg.locator(f'{MENU} [data-mode="{m}"]').first
def ids(pg): return pg.evaluate(f"() => [...document.querySelectorAll('{MENU} [role=menuitem]')].map(e => e.dataset.mode)")
def racine(pg):
    for _ in range(4):
        if pg.locator(MENU).get_attribute('data-niveau') in ('0', None): return
        item(pg, '__retour').click(); pg.wait_for_timeout(150)
def chemin(pg, *l):
    racine(pg)
    for m in l: item(pg, m).click(); pg.wait_for_timeout(350)
def centre(pg): return pg.locator('.ot-centre').text_content() or ''
def etat(pg, m): return pg.locator(f'{MENU} [data-mode="{m}"] .lp-indic').first.get_attribute('data-etat')
def saisir(pg, texte): f = pg.locator('.ot-saisie input'); f.fill(texte); pg.locator('.ot-saisie button[type=submit]').click(); pg.wait_for_timeout(900)
def choisir(pg, nom): pg.locator('.ot-entree', has_text=nom).first.click(); pg.wait_for_timeout(150)
def entrer(pg, nom): pg.locator('.ot-liste li', has_text=nom).first.locator('.ot-ouvrir').click(); pg.wait_for_timeout(500)

with sync_playwright() as p:
    b = p.chromium.launch()
    try:
        ctx = b.new_context(viewport={'width': 1440, 'height': 900})
        pg = ctx.new_page(); pg.set_default_timeout(10000); pg.on('pageerror', lambda e: erreurs.append(str(e)))
        pg.goto(B + '/one/terminal'); pg.wait_for_selector('.ot-entree', timeout=20000); pg.wait_for_timeout(500)
        ok(ids(pg) == ['confort', 'naviguer', 'fichiers', 'git', 'chercher', 'audio', 'historique', 'executer', 'reglages', 'retour-one'], 'racine : Confort, Naviguer, Fichiers, Git, Chercher, Audio, Historique, Exécuter, Réglages, Retour')
        ok(all(n in centre(pg) for n in ['a-ranger', 'assets', 'notes', 'README.md']) and pg.locator('.ot-source').text_content().strip() == 'Espace d’essai', 'le centre montre le vrai contenu du dossier de travail (espace d’essai)')
        cap(pg, '1-racine')
        # Fichiers : créer, annuler ; renommer ; la commande réelle à la demande
        chemin(pg, 'executer', 'exe-voir'); racine(pg)
        chemin(pg, 'fichiers', 'fic-creer'); saisir(pg, 'Projets')
        ok('Projets' in centre(pg) and etat(pg, 'fic-creer') == 'reussite' and '$ mkdir Projets' in centre(pg), 'Créer un dossier : il apparaît, le point passe au vert, la commande réelle est montrée (mkdir Projets)')
        chemin(pg, 'historique', 'his-annuler'); pg.wait_for_timeout(600)
        ok('Projets' not in pg.locator('.ot-liste').text_content(), 'Historique › Annuler : le dossier disparaît')
        choisir(pg, 'README.md'); chemin(pg, 'fichiers', 'fic-renommer')
        ok(pg.locator('.ot-saisie input').input_value() == 'README.md', 'Renommer : le nom actuel est proposé')
        saisir(pg, 'LISEZMOI.md')
        ok('LISEZMOI.md' in centre(pg) and '$ mv README.md LISEZMOI.md' in centre(pg), 'renommé ; commande réelle : mv README.md LISEZMOI.md')
        chemin(pg, 'fichiers', 'fic-supprimer'); pg.wait_for_timeout(300)
        ok('aucun élément' not in centre(pg).lower() and ('Choisissez d’abord' in centre(pg) or pg.locator('.ot-message').count() == 1), 'Supprimer sans rien choisir : le centre le demande (rien n’est supprimé au hasard)')
        # Git : état (notification), ajouter (Valider recommandé), valider ; envoyer = pont
        chemin(pg, 'git', 'git-status'); pg.wait_for_timeout(1200)
        ok('changement' in centre(pg) and etat(pg, 'git-status') == 'info' and etat(pg, 'git-add') == 'guide', f'Git › État : les changements ; « Ajouter » recommandé (violet) ; l’état signalé ({etat(pg, "git-status")})')
        ok(etat(pg, 'git-push') == 'action' and 'pont local nécessaire' in (item(pg, 'git-push').get_attribute('aria-label') or ''), 'Envoyer : point orange, « pont local nécessaire » dit en toutes lettres')
        cap(pg, '2-git')
        item(pg, 'git-add').click(); pg.wait_for_timeout(1500)
        ok('prêt' in centre(pg) and etat(pg, 'git-commit') == 'guide', 'Ajouter : les changements sont prêts ; « Valider » recommandé')
        item(pg, 'git-commit').click(); pg.wait_for_timeout(300); saisir(pg, 'Premier rangement'); pg.wait_for_timeout(1500)
        ok('Validé : « Premier rangement »' in centre(pg) and etat(pg, 'git-commit') == 'reussite', 'Valider : la validation est faite (vert), son identifiant affiché')
        item(pg, 'git-push').click(); pg.wait_for_timeout(500)
        ok('pont local' in centre(pg) and 'Rien n’a été envoyé' in centre(pg), 'Envoyer : rien n’est simulé ; le pont local est annoncé')
        item(pg, 'git-log').click(); pg.wait_for_timeout(1200)
        ok('Premier rangement' in centre(pg) and 'Espace d’essai : premiers fichiers' in centre(pg), 'Historique Git : les vraies validations')
        # Audio : aperçu circulaire, durée, lire, ranger
        chemin(pg, 'naviguer', 'nav-bureau'); entrer(pg, 'a-ranger'); choisir(pg, 'note-essai-la-440.wav')
        chemin(pg, 'audio', 'aud-apercu'); pg.wait_for_timeout(1800)
        ok(pg.locator('.ot-onde line').count() >= 150 and '0 min 03 s' in centre(pg) and 'WAV' in centre(pg), 'Audio › Aperçu : la forme d’onde en cercle, la durée réelle, le format')
        cap(pg, '3-audio')
        pg.locator('.ot-lire').click(); pg.wait_for_timeout(600)
        ok(pg.locator('.ot-lire').get_attribute('aria-label') == 'Pause', 'Lire : le son part au geste de la personne (jamais seul)')
        pg.locator('.ot-lire').click()
        item(pg, 'aud-ranger').click(); pg.wait_for_timeout(300)
        ok(pg.locator('.ot-saisie input').input_value() == 'LUMIERE', 'Ranger dans le dépôt : l’album proposé (LUMIERE)')
        saisir(pg, 'LUMIERE'); pg.wait_for_timeout(1200)
        ok('assets/audio/LUMIERE' in centre(pg) and 'préparé pour Git' in centre(pg) and etat(pg, 'aud-ranger') == 'reussite', 'rangé dans /assets/audio/LUMIERE et préparé pour Git')
        # Exécuter : la commande tapée devient la même action
        chemin(pg, 'executer', 'exe-libre'); saisir(pg, 'git status'); pg.wait_for_timeout(800)
        ok('note-essai-la-440.wav' in centre(pg) and 'ajouté' in centre(pg), 'Taper « git status » : la même action, le même centre')
        chemin(pg, 'executer', 'exe-libre'); saisir(pg, 'curl http://exemple.org')
        ok('n’est pas disponible ici' in centre(pg), 'une commande inconnue n’exécute rien et le dit')
        # Chercher : doublons
        chemin(pg, 'naviguer', 'nav-bureau'); chemin(pg, 'chercher', 'che-doublons'); pg.wait_for_timeout(1200)
        ok('1 groupe de doublons' in centre(pg), 'Chercher › Doublons : par empreinte (les deux notes identiques)')
        # persistance : un vrai dossier
        pg.reload(); pg.wait_for_selector('.ot-entree', timeout=20000); pg.wait_for_timeout(400)
        ok('LISEZMOI.md' in centre(pg) and 'README.md' not in centre(pg), 'après rechargement : le dossier a vraiment changé (espace d’essai persistant)')
        ctx.close()
        # téléphone : contenu étendu, le Point à la demande
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True)
        pg = ctx.new_page(); pg.on('pageerror', lambda e: erreurs.append(str(e)))
        pg.goto(B + '/one/terminal'); pg.wait_for_selector('.ot-entree', timeout=20000); pg.wait_for_timeout(400)
        ok(pg.locator('.ot').get_attribute('data-etendu') == 'oui' and pg.locator('.ot-point .lp-point').count() == 1 and pg.evaluate("document.documentElement.scrollWidth <= 390"), 'téléphone : le contenu étendu d’abord, le Point en bas, sans défilement horizontal')
        pg.locator('.ot-point .lp-point').tap(); pg.wait_for_timeout(400)
        ok('git' in ids(pg) and 'audio' in ids(pg), 'téléphone : le Point ouvre les mêmes familles')
        cap(pg, '4-mobile')
        item(pg, 'fichiers').tap(); pg.wait_for_timeout(300); item(pg, 'fic-lister').tap(); pg.wait_for_timeout(600)
        ok('notes' in centre(pg), 'téléphone : Fichiers › Lister agit sur le même dossier')
        ctx.close()
        # mouvement réduit : aucun point ne pulse ni ne clignote
        ctx = b.new_context(viewport={'width': 1280, 'height': 860}, reduced_motion='reduce')
        pg = ctx.new_page(); pg.goto(B + '/one/terminal'); pg.wait_for_selector('.ot-entree', timeout=20000); pg.wait_for_timeout(300)
        chemin(pg, 'git', 'git-status'); pg.wait_for_timeout(1200)
        ok(pg.locator(f'{MENU} [data-mode="git-status"] .lp-indic').evaluate("e => getComputedStyle(e).animationName") == 'none', 'mouvement réduit : la notification ne clignote pas')
        ctx.close()
    finally:
        b.close()
ok(not erreurs, 'aucune erreur de page ' + str(erreurs[:3]))
n = sum(res); print(f'— {n}/{len(res)}'); raise SystemExit(0 if n == len(res) else 1)
