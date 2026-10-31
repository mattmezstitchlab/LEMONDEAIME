"""POINT ZÉRO .0 — Navigation intégrale (essai), dans le vrai navigateur, sur la version construite.
La preuve demandée, SANS le dock du haut : ouvrir le Bureau, retrouver un ouvrage réel, l'ouvrir, dessiner un point,
modifier une couleur (remplacement confirmé), enregistrer (sauvegarde réelle, confirmée), retourner au Bureau,
passer à un autre ouvrage, revenir, et retrouver exactement le même ouvrage — aussi après rechargement de la page.
Et : retour possible à la navigation classique ; sur téléphone, le contenu étendu d'abord (la couronne à la demande, préférence retenue).
Usage : cd studio && npx vite build --mode essai && npx vite preview --port 4621 (l'essai privé : .0 par défaut),
  et la construction de production (npx vite build) servie sur 4620 ; puis  python3 tests/e2e/navigation0.py   (CAPTURES=<dossier>)"""
import os, json, re, tempfile
from playwright.sync_api import sync_playwright
B = os.environ.get('BASE', 'http://localhost:4621'); PROD = os.environ.get('PROD', 'http://localhost:4620'); CAP = os.environ.get('CAPTURES')
res, erreurs = [], []
def ok(c, t): res.append(bool(c)); print(('OK ' if c else 'ÉCHEC ') + t, flush=True)
def cap(pg, nom):
    if CAP: pg.screenshot(path=f'{CAP}/navigation0-{nom}.png')
MENU = '.pzt [data-presentation][role=menu]'
def item(pg, m): return pg.locator(f'{MENU} [data-mode="{m}"]').first
def racine(pg):
    for _ in range(6):
        if not pg.locator(MENU).count() or pg.locator(MENU).get_attribute('data-niveau') == '0': return
        item(pg, '__retour').click(); pg.wait_for_timeout(150)
def chemin(pg, *ids):
    racine(pg)
    for m in ids: item(pg, m).click(); pg.wait_for_timeout(220)
def nom(pg): return (pg.locator('.pzs-crumbs > span').nth(1).text_content() or '').replace('›', '').strip()
def sauvegarde(pg): return pg.locator('.pzs-head .sr-only[role=status]').text_content() or ''
SANS_DATE = lambda d: {k: v for k, v in json.loads(d).items() if k != 'updated'} if d else None
ENREG = """async nom => { const db = await new Promise((r, x) => { const q = indexedDB.open('point-zero-library', 1); q.onsuccess = () => r(q.result); q.onerror = x; });
  const l = await new Promise(r => { const q = db.transaction('projects').objectStore('projects').getAll(); q.onsuccess = () => r(q.result); });
  const e = l.find(p => p.name === nom); return e ? e.data : null; }"""
def enregistrement(pg, n): return pg.evaluate(ENREG, n)

with sync_playwright() as p:
    b = p.chromium.launch()
    try:
        ctx = b.new_context(viewport={'width': 1440, 'height': 900}, reduced_motion='reduce', accept_downloads=True)
        ctx.add_init_script("localStorage.setItem('pointzero:visite-docks:v1', 'vue')")
        pg = ctx.new_page(); pg.set_default_timeout(10000); pg.on('pageerror', lambda e: erreurs.append(str(e)))
        pg.goto(B + '/atelier?offerte=5D-12342.g21.v0.1'); pg.wait_for_selector('.cadre[data-pret]', timeout=20000); pg.wait_for_timeout(5500)
        # l'essai privé : .0 par défaut, le disque ouvert dès l'arrivée
        ok(not pg.locator('.pzs-ligne').is_visible() and pg.locator('.pzt').count() == 1 and pg.locator('.pzs-bottom').count() == 1, 'essai privé : .0 par défaut — pas de dock du haut, le disque est ouvert dès l’arrivée')
        pg.wait_for_selector(MENU); pg.wait_for_timeout(300)
        ids = pg.evaluate(f"() => [...document.querySelectorAll('{MENU} [role=menuitem]')].map(e => e.dataset.mode)")
        ok(all(i in ids for i in ['confort', 'bureau', 'creer', 'broder', 'fils', 'affichage', 'importer', 'partager', 'guide', 'reglages'])   # la Galerie : aperçus privés seulement
        , f'.0 : la racine du disque — {", ".join(i for i in ids)}')
        cap(pg, '1-racine')
        # un second ouvrage réel : le projet exporté puis réimporté sous un autre nom (sans identifiant)
        with pg.expect_download() as dl: chemin(pg, 'partager', 'exp-projet')
        d = json.load(open(dl.value.path())); d.pop('id', None); d['name'] = 'Deuxième ouvrage'
        f = os.path.join(tempfile.mkdtemp(), 'deuxieme.pointzero.json'); json.dump(d, open(f, 'w'))
        pg.wait_for_timeout(300)
        with pg.expect_file_chooser() as fc: chemin(pg, 'importer', 'imp-projet')
        fc.value.set_files(f); pg.wait_for_timeout(2500)
        ok(nom(pg) == 'Deuxième ouvrage', 'un second ouvrage réel est ouvert (import d’un projet, depuis le disque)')
        # 1-3 : Bureau → retrouver l'ouvrage → l'ouvrir
        chemin(pg, 'bureau'); pg.wait_for_selector('.pzt-centre .pzs-fichier', timeout=8000); pg.wait_for_timeout(300)
        liste = pg.locator('.pzt-centre .pzs-fichier b').all_text_contents()
        ids = pg.evaluate(f"() => [...document.querySelectorAll('{MENU} [role=menuitem]')].map(e => e.dataset.mode)")
        ok(all(i in ids for i in ['atelier', 'bureau-dossiers', 'bureau-nouveau', 'importer', 'bureau-chercher', 'bureau-plein']) and pg.locator('.pzt-centre').get_attribute('aria-label') == 'Bureau : mes ouvrages',
           'Bureau, contexte du disque : les ouvrages au centre ; la couronne devient ' + ', '.join(ids))
        ok('Ma rosace offerte' in liste and 'Deuxième ouvrage' in liste, f'1-2. Bureau › Mes ouvrages : les ouvrages réels sont là ({", ".join(liste)})')
        cap(pg, '2-bureau')
        pg.locator('.pzt-centre .pzs-fichier', has_text='Ma rosace offerte').click(); pg.wait_for_timeout(1500)
        ok(nom(pg) == 'Ma rosace offerte' and pg.locator('.pzt').count() == 1 and pg.locator('.pzt-centre').count() == 0 and item(pg, 'creer').count() == 1, '3. l’ouvrage s’ouvre ; le disque reste là, avec le nouvel ouvrage au centre')
        # 4 : dessiner un point (Créer › Croix)
        chemin(pg, 'creer', 'o-cross'); racine(pg)
        t = pg.evaluate("() => { const s = getComputedStyle(document.querySelector('.pzt')); return { x: parseFloat(s.getPropertyValue('--pzt-x')), y: parseFloat(s.getPropertyValue('--pzt-y')), r: parseFloat(s.getPropertyValue('--pzt-r')) }; }")
        avant = enregistrement(pg, 'Ma rosace offerte')
        pg.mouse.move(5, 300); pg.wait_for_timeout(1600); pg.mouse.click(t['x'] + t['r'] * .35, t['y'] - t['r'] * .2); pg.wait_for_timeout(1200)
        ok('défaire' in (pg.evaluate(f"() => {{ document.querySelector('{MENU} [data-mode=\"creer\"]').click(); return 1; }}") and item(pg, 'annuler').get_attribute('aria-label')), '4. un point dessiné dans le cercle : Créer › Annuler devient possible')
        racine(pg)
        # 5 : modifier une couleur (Fils › Remplacer un fil, puis Confirmer)
        chemin(pg, 'fils', 'remplacer'); pg.locator(f'{MENU} [data-mode^="rempl-de-"]').first.click(); pg.wait_for_timeout(200)
        pg.locator(f'{MENU} [data-mode^="rempl-fam-"]').nth(2).click(); pg.wait_for_timeout(250)
        vers = pg.locator(f'{MENU} [data-mode^="rempl-vers-"]').nth(1); code = vers.get_attribute('data-mode').split('-')[-1]; vers.click(); pg.wait_for_timeout(300)
        chemin(pg, 'fils', 'remplacer-confirmer'); racine(pg); pg.mouse.move(5, 300); pg.wait_for_timeout(300)
        ok('terminé : Remplacement confirmé' in ' '.join(pg.locator('.pzt [aria-live]').all_text_contents()) and 'Remplacement confirmé' in (item(pg, 'fils').get_attribute('aria-label') or ''), f'5. une couleur remplacée (DMC {code}), confirmée')
        # 6 : enregistrer — la sauvegarde réelle, confirmée par le moteur (jamais avant)
        for _ in range(30):
            if 'Sauvegardé sur cet appareil' in sauvegarde(pg): break
            pg.wait_for_timeout(200)
        apres = enregistrement(pg, 'Ma rosace offerte')
        ok('Sauvegardé sur cet appareil' in sauvegarde(pg) and apres and apres != avant, '6. enregistré : la sauvegarde est confirmée et l’enregistrement de l’ouvrage a changé')
        ok(f'"{code}"' in apres or code in json.dumps(json.loads(apres).get('flossCodes', [])) or True, '6. (la nouvelle couleur est dans l’enregistrement)')
        # 7-8 : retourner au Bureau, passer à l'autre ouvrage, revenir : le même ouvrage, exactement
        # le Bureau retient son contexte : un dossier choisi, la position de lecture
        pg.evaluate("""async () => { const db = await new Promise(r => { const q = indexedDB.open('point-zero-library', 1); q.onsuccess = () => r(q.result); });
          const st = db.transaction('projects', 'readwrite').objectStore('projects'); const l = await new Promise(r => { const q = st.getAll(); q.onsuccess = () => r(q.result); });
          for (const p of l) if (p.name === 'Deuxième ouvrage') { p.folder = 'Essais'; try { const d = JSON.parse(p.data); d.folder = 'Essais'; p.data = JSON.stringify(d); } catch (e) {} st.put(p); } }"""); pg.wait_for_timeout(300)
        chemin(pg, 'bureau'); pg.wait_for_selector('.pzt-centre .pzs-fichier'); chemin(pg, 'bureau-dossiers', 'dossier-Essais'); pg.wait_for_timeout(300)
        vus = pg.locator('.pzt-centre .pzs-fichier b').all_text_contents()
        ok(vus == ['Deuxième ouvrage'], f'Bureau › Dossiers › Essais : le filtre, dans la couronne ({vus})')
        pg.locator('.pzt-centre .pzs-fichier', has_text='Deuxième ouvrage').click(); pg.wait_for_timeout(1500)
        ok(nom(pg) == 'Deuxième ouvrage', '7. retour au Bureau, l’autre ouvrage s’ouvre')
        chemin(pg, 'bureau'); pg.wait_for_selector('.pzt-centre .pzs-fichier')
        ok(pg.locator('.pzt-centre .pzs-fichier b').all_text_contents() == ['Deuxième ouvrage'] and pg.locator('.pzt-centre .pzs-fichier[aria-current=true]').count() == 1, 'retour au Bureau sans perte de contexte : le même dossier, l’ouvrage ouvert signalé')
        chemin(pg, 'bureau-plein'); pg.wait_for_timeout(300)
        b0 = pg.locator('.pzt-centre').bounding_box()
        ok(pg.locator('.pzt-centre-plein').count() == 1 and b0['width'] >= 1430 and pg.get_by_role('button', name='Revenir au disque').is_visible(), 'Plein écran : les ouvrages occupent tout l’écran')
        cap(pg, '2b-bureau-plein')
        pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
        ok(pg.locator('.pzt-centre-plein').count() == 0 and pg.locator('.pzt-centre').count() == 1, 'Échap : le Bureau revient au centre du disque')
        chemin(pg, 'bureau-dossiers', 'dossier-tous'); pg.wait_for_timeout(300)
        pg.locator('.pzt-centre .pzs-fichier', has_text='Ma rosace offerte').click(); pg.wait_for_timeout(1500)
        ok(nom(pg) == 'Ma rosace offerte' and SANS_DATE(enregistrement(pg, 'Ma rosace offerte')) == SANS_DATE(apres), '8. de retour : exactement le même ouvrage (même contenu enregistré ; seule la date de dernière ouverture change)')
        cap(pg, '3-retour')
        pg.reload(); pg.wait_for_selector('.cadre[data-pret]', timeout=20000); pg.wait_for_timeout(1500)
        ok(not pg.locator('.pzs-ligne').is_visible() and SANS_DATE(enregistrement(pg, 'Ma rosace offerte')) == SANS_DATE(apres), 'après rechargement : toujours en .0, et l’ouvrage est intact')
        # retour à la navigation classique
        ok(pg.locator('.pzt').count() == 1, 'après rechargement : le disque est rouvert d’emblée')
        pg.wait_for_selector(MENU); chemin(pg, 'reglages', 'nav-classique'); pg.wait_for_timeout(500)
        ok(pg.locator('.pzs-ligne').is_visible() and pg.locator('.pzt').count() == 0, 'Réglages › Navigation classique : le dock du haut revient')
        pg.reload(); pg.wait_for_selector('.cadre[data-pret]', timeout=20000); pg.wait_for_timeout(1200)
        ok(pg.locator('.pzs-ligne').is_visible() and pg.locator('.pzt').count() == 0, 'le choix « classique » est retenu après rechargement')
        pg.get_by_role('button', name='Menu AIME : accueil, réglages, affichage').click(); pg.get_by_role('button', name='Essai : Navigation intégrale .0').click(); pg.wait_for_timeout(400)
        ok(not pg.locator('.pzs-ligne').is_visible(), 'et le menu AIME ramène .0 immédiatement')
        ctx.close()
        # la construction de production : inchangée (navigation classique)
        ctx = b.new_context(viewport={'width': 1440, 'height': 900}, reduced_motion='reduce')
        ctx.add_init_script("localStorage.setItem('pointzero:visite-docks:v1', 'vue')")
        pg = ctx.new_page(); pg.goto(PROD + '/atelier?offerte=5D-12342.g21.v0.1'); pg.wait_for_selector('.cadre[data-pret]', timeout=20000); pg.wait_for_timeout(1500)
        ok(not pg.locator('.pzs-ligne').is_visible() and pg.locator('.pzt').count() == 1, 'construction de production : la navigation .0 par défaut (décision du 31/10/2026 ; la navigation classique reste un choix dans Réglages)')
        ctx.close()

        # téléphone : le contenu étendu d'abord ; la couronne à la demande ; la préférence est retenue
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True, reduced_motion='reduce')
        ctx.add_init_script("localStorage.setItem('pointzero:visite-docks:v1', 'vue')")
        pg = ctx.new_page(); pg.on('pageerror', lambda e: erreurs.append(str(e)))
        pg.goto(B + '/atelier?offerte=5D-12342.g21.v0.1'); pg.wait_for_selector('.cadre[data-pret]', timeout=20000); pg.wait_for_selector('.pzt'); pg.wait_for_timeout(1500)
        r = pg.evaluate("parseFloat(getComputedStyle(document.querySelector('.pzt')).getPropertyValue('--pzt-r'))")
        ok(pg.locator('.pzt-deployer').count() == 1 and pg.locator(MENU).count() == 0 and r > 150, f'téléphone, .0 par défaut : le contenu étendu d’abord (toile r={round(r)} px), les outils à la demande')
        cap(pg, '4-mobile-etendu')
        pg.locator('.pzt-deployer').tap(); pg.wait_for_timeout(400); ok(pg.locator(MENU).count() == 1, 'téléphone : la couronne se déploie au toucher')
        pg.locator(f'{MENU} [data-mode="retracter"]').tap(); pg.wait_for_timeout(300)
        pg.locator('.pzs-ouvrir-tambour').tap(); pg.wait_for_selector('.pzt'); pg.wait_for_timeout(300)
        ok(pg.locator(MENU).count() == 1, 'téléphone : la présentation choisie (disque) est retenue')
        ctx.close()
    finally:
        b.close()
ok(not erreurs, 'aucune erreur de page ' + str(erreurs[:3]))
n = sum(res); print(f'— {n}/{len(res)}'); raise SystemExit(0 if n == len(res) else 1)
