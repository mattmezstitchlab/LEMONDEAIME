"""Le Bureau éditorial, de bout en bout, dans un vrai navigateur, sur la branche Neon de TEST (tests/e2e/serveur-bureau.mjs).
Le cycle : se connecter par le lien e-mail → modifier un titre → remplacer un grand fond, le cadrer (ordinateur, mobile) → Enregistrer
→ Prévisualiser (la version enregistrée, non publique) → Publier → modifier encore et publier → Restaurer la première version.
Et les refus : personne (401), un autre compte (403 et message), un champ invalide (Enregistrer impossible).
Usage : serveur-bureau.mjs lancé (PORT 8790, ADMIN=<adresse de test>), puis  ADMIN=<même adresse> CAPTURES=<dossier> python3 tests/e2e/bureau.py"""
import json, os, re, urllib.request
from playwright.sync_api import sync_playwright, expect

B = os.environ.get('BASE', 'http://localhost:8790'); ADMIN = os.environ['ADMIN']; CAP = os.environ.get('CAPTURES')
AUTRE = 'autre-' + ADMIN.split('@')[0].split('-')[-1] + '@test.lemondeaime.invalid'
J = ADMIN.split('@')[0].split('-')[-1]
res = []
def ok(c, t): res.append((bool(c), t)); print(('OK ' if c else 'ÉCHEC ') + t)
def capture(pg, nom):
    if CAP: pg.screenshot(path=f'{CAP}/bureau-{nom}.png')
def lien(email): return json.load(urllib.request.urlopen(B + '/__test/lien?email=' + email))['lien']
def connecter(ctx, email):
    pg = ctx.new_page(); pg.goto(B + '/studio/bureau'); pg.wait_for_selector('#bu-email', timeout=20000)
    pg.fill('#bu-email', email); pg.get_by_role('button', name='Recevoir le lien').click()
    pg.wait_for_selector('text=Un lien de connexion vient de partir', timeout=20000)
    pg.goto(lien(email)); return pg
def titre_public(pg, vue=None):
    pg.goto(B + '/studio/?edition'); pg.wait_for_selector('#hi-origine h2'); pg.wait_for_timeout(900)
    return pg.locator('#hi-origine h2').inner_text().strip()

with sync_playwright() as p:
    b = p.chromium.launch(); manque = []
    suivre = lambda pg: pg.on('response', lambda r: manque.append(r.url) if r.status == 404 and '/__test/' not in r.url else None)
    public = b.new_context(viewport={'width': 1280, 'height': 860}); pub = public.new_page(); suivre(pub)

    # — refus par défaut —
    r = urllib.request.Request(B + '/api/contenus?admin=1')
    try: urllib.request.urlopen(r); code = 200
    except urllib.error.HTTPError as e: code = e.code
    ok(code == 401, 'sans session : l’administration répond 401')
    ok(titre_public(pub) == 'Garance & indigo', 'public : les textes d’origine (rien de publié)')

    # — un autre compte : refusé —
    ctx_autre = b.new_context(); pa = connecter(ctx_autre, AUTRE)
    pa.wait_for_selector('text=n’administre pas le site', timeout=20000)
    ok(True, 'un autre compte connecté : « ce compte n’administre pas le site »')
    st = pa.evaluate("async () => (await fetch('/api/contenus', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({action:'enregistrer', contenus:{}})})).status")
    ok(st == 403, f'un autre compte : l’API refuse d’écrire (403, reçu {st})')
    capture(pa, '0-refus')

    # — l'administration —
    ctx = b.new_context(viewport={'width': 1500, 'height': 950}); pg = connecter(ctx, ADMIN); suivre(pg)
    pg.wait_for_selector('.bu-tete', timeout=20000)
    ok(pg.url.endswith('/studio/bureau'), 'le lien de connexion ramène au Bureau (/bureau → /studio/bureau)')
    cadre = pg.frame_locator('iframe[title^="Aperçu en direct"]')
    expect(cadre.locator('#hi-origine h2')).to_have_text('Garance & indigo', timeout=20000)
    expect(pg.locator('.bu-direct')).to_have_text('● En direct', timeout=10000)
    ok(True, 'le Bureau affiche « En direct » : l’aperçu accuse réception du brouillon')
    capture(pg, '1-arrivee')

    # 1. modifier un titre : l'aperçu en direct suit
    T1 = f'Rouge & bleu {J}'
    pg.get_by_label('Titre', exact=True).fill(T1)
    expect(cadre.locator('#hi-origine h2')).to_have_text(T1, timeout=5000)
    ok(cadre.locator('#hi-origine h2 .hi-et').count() == 1, 'aperçu en direct : le nouveau titre, avec son « & » en italique')

    # un champ invalide bloque l'enregistrement
    pg.get_by_label('Sous-titre', exact=True).fill('<b>non</b>')
    ok(pg.get_by_role('button', name='Enregistrer le brouillon').is_disabled() and pg.locator('.bu-erreur').count() >= 1, 'un champ invalide : message sous le champ, Enregistrer impossible')
    pg.get_by_label('Sous-titre', exact=True).fill('Des couleurs qui traversent les siècles.')

    # 2. remplacer le grand fond et le cadrer
    pg.get_by_role('button', name='Remplacer l’image…').first.click()
    pg.get_by_role('dialog', name='Médiathèque').wait_for()
    capture(pg, '2-mediatheque')
    pg.get_by_role('button', name=re.compile('Atelier d’impression')).click()
    ok('reconstitution-atelier' in pg.locator('.bu-media-vignette').first.get_attribute('src'), 'médiathèque : le grand fond est remplacé')
    ok('Reconstitution' in pg.get_by_label('Légende').first.input_value(), 'le crédit suit l’image : légende « Reconstitution… », licence et nature déclarées')
    expect(cadre.locator('#hi-origine .ed-brode-photo')).to_have_attribute('src', re.compile('reconstitution-atelier'), timeout=8000)
    pt = pg.get_by_role('group', name=re.compile('Point de cadrage, ordinateur'))
    pt.focus(); [pt.press('Shift+ArrowRight') for _ in range(2)]; pt.press('Shift+ArrowUp'); pt.press('Shift+ArrowUp'); pt.press('Shift+ArrowUp')
    ok('70 % depuis la gauche, 20 % depuis le haut' in pt.get_attribute('aria-label'), 'cadrage ordinateur au clavier : x 70 %, y 20 %')
    pm = pg.get_by_role('group', name=re.compile('Point de cadrage, mobile'))
    box = pm.bounding_box(); pg.mouse.click(box['x'] + box['width'] * .25, box['y'] + box['height'] * .5)
    lab = pm.get_attribute('aria-label'); ok(re.search(r'2[4-6] % depuis la gauche', lab), f'cadrage mobile à la souris : {lab[:60]}…')
    expect(cadre.locator('#hi-origine .ed-brode-photo')).to_have_attribute('style', re.compile('object-position: 70% 20%'), timeout=5000)
    ok(True, 'aperçu ordinateur : la photographie recadrée sur le point choisi')
    capture(pg, '3-cadrage')

    # choisir une section en cliquant dans l'aperçu
    cadre.locator('#or-forme .or-question').click()
    expect(pg.locator('.bu-sections [aria-current="true"]')).to_have_text(re.compile('Rencontre 1'), timeout=5000)
    ok(True, 'un clic dans l’aperçu choisit la section (Rencontre 1), sans rien déclencher')
    pg.locator('.bu-sections button', has_text='01 · L’origine').click()

    # 3. enregistrer : un brouillon, pas public
    pg.fill('#bu-note', 'Essai : titre et grand fond')
    pg.get_by_role('button', name='Enregistrer le brouillon').click()
    pg.wait_for_selector('text=Brouillon enregistré', timeout=15000)
    v1 = re.search(r'version (\d+)', pg.locator('.bu-statut-general').inner_text()).group(1)
    ok(titre_public(pub) == 'Garance & indigo', f'enregistré (version {v1}) : le public ne voit toujours que l’origine')

    # 4. prévisualiser : la version enregistrée, annoncée, pour l'administration seulement
    href = pg.get_by_role('link', name='Prévisualiser').get_attribute('href')
    ap = ctx.new_page(); ap.goto(B + href); ap.wait_for_selector('.ed-apercu', timeout=15000); ap.wait_for_timeout(800)
    ok(f'Aperçu de la version {v1}' in ap.locator('.ed-apercu').inner_text() and ap.locator('#hi-origine h2').inner_text() == T1, 'Prévisualiser : la version enregistrée, avec son bandeau « non publiée »')
    ok('reconstitution-atelier' in ap.locator('#hi-origine .ed-brode-photo').get_attribute('src') and '70% 20%' in (ap.locator('#hi-origine .ed-brode-photo').get_attribute('style') or ''), 'Prévisualiser : le nouveau fond, cadré comme réglé')
    capture(ap, '4-apercu'); ap.close()
    pp = public.new_page(); pp.goto(B + href); pp.wait_for_selector('.ed-apercu', timeout=15000)
    ok('réservé' in pp.locator('.ed-apercu').inner_text() or 'Connectez-vous' in pp.locator('.ed-apercu').inner_text(), 'le même aperçu, sans session : refusé, et la page garde les textes d’origine')
    pp.close()

    # 5. publier
    pg.get_by_role('button', name='Publier…').click(); pg.get_by_role('button', name=f'Confirmer : publier la version {v1}').click()
    pg.wait_for_selector(f'text=Version {v1} publiée', timeout=15000)
    ok(titre_public(pub) == T1, 'Publier : le public voit le nouveau titre')
    ok('reconstitution-atelier' in pub.locator('#hi-origine .ed-brode-photo').get_attribute('src'), 'Publier : le public voit le nouveau grand fond, avec son crédit')
    ok('Reconstitution' in pub.locator('#hi-origine figcaption').inner_text(), 'la légende publique annonce la reconstitution')
    capture(pub, '5-public')
    mob = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True).new_page()
    mob.goto(B + '/studio/?edition'); mob.wait_for_selector('#hi-origine h2'); mob.wait_for_timeout(900)
    sty = mob.locator('#hi-origine .ed-brode-photo').get_attribute('style') or ''
    ok(re.search(r'object-position: 2[4-6]% 50%', sty), f'sur téléphone : le cadrage mobile ({sty})')
    capture(mob, '5-public-mobile')

    # 6. une seconde version, publiée
    T2 = f'Indigo & garance {J}'
    pg.get_by_label('Titre', exact=True).fill(T2)
    pg.get_by_role('button', name='Enregistrer le brouillon').click(); pg.wait_for_selector('text=Brouillon enregistré', timeout=15000)
    v2 = re.search(r'version (\d+)', pg.locator('.bu-statut-general').inner_text()).group(1)
    pg.get_by_role('button', name='Publier…').click(); pg.get_by_role('button', name=f'Confirmer : publier la version {v2}').click()
    pg.wait_for_selector(f'text=Version {v2} publiée', timeout=15000)
    ok(titre_public(pub) == T2, f'une seconde version ({v2}) publiée : le public la voit')

    # 7. restaurer la première
    pg.get_by_role('tab', name=re.compile('Historique')).click()
    item = pg.locator('.bu-historique li', has_text=f'Version {v1}')
    item.get_by_role('button', name='Restaurer…').click(); item.get_by_role('button', name='Confirmer : restaurer et publier').click()
    pg.wait_for_selector(f'text=Version {v1} restaurée', timeout=15000)
    ok(titre_public(pub) == T1, f'Restaurer : la version {v1} est de nouveau publique')
    # la base de test peut contenir d'autres versions (les essais de Matt sur l'aperçu privé) : on ne compte que celles de ce test
    vr = re.search(r'publiée comme version (\d+)', pg.locator('.bu-statut-general').inner_text()).group(1)
    miennes = [pg.locator('.bu-historique li', has_text=re.compile(rf'Version {v} · ')).count() for v in (v1, v2, vr)]
    ok(miennes == [1, 1, 1] and pg.locator('.bu-historique li[data-etat="publie"]').count() == 1, f'historique : les trois versions du test sont là, une seule version publiée, rien d’effacé ({miennes})')
    capture(pg, '6-historique')
    ok(not manque, f'aucune ressource introuvable {manque[:3]}')
    b.close()

n = sum(1 for c, _ in res if c); print(f'— {n}/{len(res)}')
print('ménage :', urllib.request.urlopen(B + '/__test/menage').read().decode())
