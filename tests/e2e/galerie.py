"""La Galerie des Vivants, de bout en bout, sur la branche Neon de TEST (tests/e2e/serveur-bureau.mjs, ADMIN=admin-bureau@test.lemondeaime.invalid).
Lise expose une rosace (Partager → Exposer, deux cases), un visiteur sans compte la voit et la signale, Marc donne son cœur
et l'ouvre dans son atelier (copie personnelle, non réexposable), l'administration masque puis démasque, Lise la retire.
Usage : serveur-bureau.mjs lancé (PORT 8790), puis  python3 tests/e2e/galerie.py   (CAPTURES=<dossier>)"""
import json, os, time, urllib.request
from playwright.sync_api import sync_playwright

B = os.environ.get('BASE', 'http://localhost:8790'); CAP = os.environ.get('CAPTURES')
LISE, MARC, ADMIN = 'galerie-lise@test.lemondeaime.invalid', 'galerie-marc@test.lemondeaime.invalid', os.environ.get('ADMIN', 'admin-bureau@test.lemondeaime.invalid')
res = []
def ok(c, t): res.append((bool(c), t)); print(('OK ' if c else 'ÉCHEC ') + t, flush=True)
def cap(pg, nom):
    if CAP: pg.screenshot(path=f'{CAP}/galerie-{nom}.png')
def lien(email): return json.load(urllib.request.urlopen(B + '/__test/lien?email=' + email))['lien']
def connecter(ctx, email):
    pg = ctx.new_page(); pg.goto(B + '/studio/bureau'); pg.wait_for_selector('#bu-email', timeout=20000)
    for essai in range(4):  # le limiteur de liens (3 par minute, partagé en local) : on patiente et on réessaie
        pg.fill('#bu-email', email); pg.get_by_role('button', name='Recevoir le lien').click()
        try: pg.wait_for_selector('text=Un lien de connexion vient de partir', timeout=8000); break
        except Exception:
            if essai == 3: raise
            time.sleep(25)
    pg.goto(lien(email)); pg.wait_for_timeout(800); return pg
def atelier(pg, query=''):
    pg.goto(B + '/studio/atelier'); pg.evaluate("localStorage.setItem('pointzero:visite-docks:v1', 'vue')")
    pg.goto(B + '/studio/atelier' + query); pg.wait_for_selector('.lp-point', timeout=20000); pg.wait_for_timeout(1200)
def api(pg, body=None, q=''):
    if body is None: return pg.evaluate("q => fetch('/api/galerie' + q, { credentials: 'same-origin' }).then(r => r.json())", q)
    return pg.evaluate("b => fetch('/api/galerie', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(r => r.json())", body)

with sync_playwright() as p:
    b = p.chromium.launch()
    try:
        # — Lise : une rosace offerte, puis Partager → Exposer —
        cl = b.new_context(viewport={'width': 1440, 'height': 900}); pl = connecter(cl, LISE)
        atelier(pl, '?offerte=5D-12342.g21.v0.1'); pl.wait_for_timeout(1500)
        ok('Ma rosace offerte' in pl.locator('body').inner_text(), 'Lise : la rosace est ouverte dans son atelier')
        pl.get_by_role('button', name='Partager').first.click(); pl.wait_for_timeout(300)
        pl.get_by_role('button', name='Exposer').click(); pl.wait_for_selector('.ga-feuille form', timeout=10000)
        bouton = pl.locator('.ga-feuille form button[type=submit]')
        ok(bouton.is_disabled(), 'feuille Exposer : le bouton reste inactif tant que les deux cases ne sont pas cochées')
        pl.get_by_label('Titre').fill('Givre de minuit'); pl.get_by_label('Pseudonyme d’artiste').fill('Lise B.')
        pl.get_by_label('Son histoire (facultative)').fill('Brodée pendant les soirées d’hiver.\n<b>pas du HTML</b>')
        cap(pl, '1-feuille')
        pl.get_by_label('Je suis l’auteur de ce motif').check(); pl.get_by_label('J’accepte qu’il soit visible par tous').check()
        bouton.click(); pl.wait_for_selector('text=Votre œuvre est exposée', timeout=15000)
        ok(True, 'Lise : « Votre œuvre est exposée »'); cap(pl, '2-expose')
        oid = api(pl)['oeuvres'][0]['id']

        # — un visiteur sans compte : le mur, la fiche, le cœur demande un compte, signaler —
        cv = b.new_context(viewport={'width': 1440, 'height': 900}); pv = cv.new_page()
        pv.goto(B + '/galerie'); pv.wait_for_selector('.ga-carte', timeout=15000)
        brut = pv.evaluate("() => fetch('/api/galerie').then(r => r.text())")
        ok('givre de minuit' in pv.locator('.ga-mur').inner_text().lower() and 'Lise B.' in pv.locator('.ga-mur').inner_text(), 'visiteur : le mur montre l’œuvre et le pseudonyme')
        ok(LISE not in brut and 'galerie-lise' not in brut, 'visiteur : ni e-mail ni identifiant de compte dans la réponse publique')
        cap(pv, '3-mur')
        pv.get_by_role('link', name='Givre de minuit, par Lise B.').click(); pv.wait_for_selector('#ga-fiche-titre')
        t = pv.locator('.ga-fiche').inner_text()
        ok('DMC' in t and 'Aida 14' in t and '<b>pas du HTML</b>' in t, 'fiche : palette en texte, dimensions, histoire affichée comme texte (jamais du HTML)')
        ok('Empreinte du motif' in t and 'certif' not in t.lower(), 'fiche : le sceau est une empreinte, jamais une « certification »')
        pv.locator('.ga-coeur').click(); pv.wait_for_timeout(400)
        ok('Entrez dans AIME' in pv.locator('.ga-coeur-hote').inner_text(), 'visiteur : le cœur demande un compte')
        pv.get_by_role('button', name='Signaler cette œuvre').click(); pv.get_by_role('button', name='Envoyer le signalement').click(); pv.wait_for_timeout(800)
        ok('Merci' in pv.locator('.ga-fiche').inner_text(), 'visiteur : signaler sans compte'); cap(pv, '4-fiche')

        # — Lise ne vote pas pour elle-même —
        pl.goto(B + '/galerie?id=' + oid); pl.wait_for_selector('.ga-coeur')
        ok(pl.locator('.ga-coeur').is_disabled(), 'Lise : son propre cœur est inactif')

        # — Marc : un cœur, puis « Ouvrir dans mon atelier » ; la copie n'est pas réexposable —
        time.sleep(20)  # le limiteur de liens de connexion (3 par minute)
        cm = b.new_context(viewport={'width': 1440, 'height': 900}); pm = connecter(cm, MARC)
        pm.goto(B + '/galerie?id=' + oid); pm.wait_for_selector('.ga-coeur')
        pm.locator('.ga-coeur').click(); pm.wait_for_timeout(800)
        ok(pm.locator('.ga-coeur').get_attribute('aria-pressed') == 'true' and '1' in pm.locator('.ga-coeur').inner_text(), 'Marc : un cœur, compté')
        ok(api(pv, None, '?id=' + oid)['oeuvre']['votes'] == 1, 'visiteur : le total des cœurs est visible par tous')
        pm.get_by_role('link', name='Ouvrir dans mon atelier').click(); pm.wait_for_selector('.lp-point', timeout=20000); pm.wait_for_timeout(2500)
        ok('d’après Lise B.' in pm.locator('body').inner_text(), 'Marc : l’œuvre s’ouvre dans son atelier, avec le nom de l’artiste')
        pm.get_by_role('button', name='Partager').first.click(); pm.wait_for_timeout(300); pm.get_by_role('button', name='Exposer').click(); pm.wait_for_timeout(800)
        ok('ne peut pas être exposé' in pm.locator('.ga-feuille').inner_text(), 'Marc : la copie de la galerie ne peut pas être réexposée'); cap(pm, '5-copie')
        ok(api(pv, None, '?id=' + oid)['oeuvre']['titre'] == 'Givre de minuit', 'rien n’est modifié côté auteur')

        # — l'administration : les signalements, masquer, démasquer —
        time.sleep(20)
        ca = b.new_context(viewport={'width': 1440, 'height': 900}); pa = connecter(ca, ADMIN); pa.goto(B + '/studio/galerie'); pa.wait_for_timeout(500)
        ok(api(pa, None, '?signalements=1')['signalements'][0]['n'] >= 1, 'admin : les signalements sont listés')
        ok(api(pm, None, '?signalements=1').get('ok') is False, 'Marc : la liste des signalements lui est refusée')
        pa.goto(B + '/studio/bureau'); pa.wait_for_selector('.bu-onglets', timeout=20000)
        onglet = pa.get_by_role('tab', name='Galerie (1)'); onglet.wait_for(timeout=10000); ok(True, 'Bureau : l’onglet Galerie annonce 1 œuvre signalée')
        onglet.click(); pa.wait_for_selector('.bu-moderation li[data-statut]')
        ok('Givre de minuit' in pa.locator('.bu-moderation').inner_text() and 'Lise B.' in pa.locator('.bu-moderation').inner_text(), 'Bureau : le signalement est listé, avec le titre et le pseudonyme')
        pa.get_by_role('button', name='Masquer…').click(); pa.get_by_label('Motif (gardé pour l’historique)').fill('essai')
        pa.get_by_role('button', name='Confirmer : masquer').click(); pa.wait_for_selector('text=est masquée')
        ok(len(api(pv)['oeuvres']) == 0, 'Bureau : masquer retire l’œuvre du mur'); cap(pa, '6-bureau')
        pa.get_by_role('button', name='Remettre en ligne').click(); pa.wait_for_selector('text=de nouveau visible')
        ok(len(api(pv)['oeuvres']) == 1, 'Bureau : remettre en ligne la rend au mur')
        ok(api(pm, {'action': 'masquer', 'id': oid}).get('ok') is False, 'Marc : masquer lui est refusé')

        # — Lise retire son œuvre : elle disparaît, et ses cœurs avec elle —
        pl.goto(B + '/galerie?vue=miennes'); pl.wait_for_selector('.ga-carte')
        pl.get_by_role('button', name='Retirer de la galerie').click(); pl.wait_for_timeout(800)
        ok(len(api(pv)['oeuvres']) == 0 and api(pv, None, '?id=' + oid).get('ok') is False, 'Lise : retirer la fait disparaître de la galerie et de sa fiche')
    finally:
        print('ménage :', urllib.request.urlopen(B + '/__test/menage').read().decode())
        b.close()
n = sum(1 for r in res if r[0]); print(f'— {n}/{len(res)}'); raise SystemExit(0 if n == len(res) else 1)
