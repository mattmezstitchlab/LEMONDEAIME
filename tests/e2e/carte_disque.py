"""La Carte Vivante pilotée par le Disque (essai /essai-carte), dans le vrai navigateur, sur la version construite.
Le même composant de carte (ses quatre formes, ses médias, ses permissions) ; le Disque en est le contrôleur :
choisir une forme, parcourir les médias, montrer une information autorisée pour le rôle, retourner, revenir. Aucune seconde carte.
Usage : cd studio && npx vite build && npx vite preview --port 4620, puis  python3 tests/e2e/carte_disque.py   (CAPTURES=<dossier>)"""
import os
from playwright.sync_api import sync_playwright
B = os.environ.get('BASE', 'http://localhost:4620'); CAP = os.environ.get('CAPTURES')
res, erreurs = [], []
def ok(c, t): res.append(bool(c)); print(('OK ' if c else 'ÉCHEC ') + t, flush=True)
MENU = '[data-presentation][role=menu]'
def item(pg, m): return pg.locator(f'{MENU} [data-mode="{m}"]').first
def ouvrir_disque(pg):
    if not pg.locator(MENU).count(): pg.locator('.ec-point .lp-point').first.click(); pg.wait_for_timeout(250)
def racine(pg):
    ouvrir_disque(pg)
    for _ in range(5):
        if pg.locator(MENU).get_attribute('data-niveau') in ('0', None): return
        item(pg, '__retour').click(); pg.wait_for_timeout(150)
def chemin(pg, *ids):
    racine(pg)
    for m in ids: item(pg, m).click(); pg.wait_for_timeout(250)
def fermer(pg):
    if pg.locator(MENU).count(): pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    if pg.locator(MENU).count(): pg.keyboard.press('Escape'); pg.wait_for_timeout(200)

with sync_playwright() as p:
    b = p.chromium.launch()
    try:
        for (l, h, nom) in [(1440, 900, 'ordinateur'), (390, 844, 'téléphone')]:
            ctx = b.new_context(viewport={'width': l, 'height': h}, reduced_motion='reduce', has_touch=l < 600, is_mobile=l < 600)
            pg = ctx.new_page(); pg.set_default_timeout(8000); pg.on('pageerror', lambda e: erreurs.append(str(e)))
            pg.goto(B + '/essai-carte'); pg.wait_for_selector('.cv'); pg.wait_for_timeout(400)
            ok(pg.locator('.cv').count() == 1 and pg.locator('.ec-point .lp-point').count() == 1, f'{nom} · une seule carte ; le Disque est là, son contrôleur')
            chemin(pg, 'forme', 'forme-ronde'); fermer(pg)
            ok(pg.locator('.cv.cv-ronde').count() == 1 and pg.locator('.cv').count() == 1, f'{nom} · Forme › Ronde : la même carte change de forme')
            chemin(pg, 'medias', 'media-suivant'); fermer(pg)
            ok(pg.locator('.cv-recto .cv-diapo').get_attribute('aria-label') == '2 sur ' + str(pg.locator('.cv-recto .cv-point').count() or 4) or '2 sur' in (pg.locator('.cv-recto .cv-diapo').get_attribute('aria-label') or ''),
               f'{nom} · Médias › Suivant : la carte montre le média 2')
            chemin(pg, 'medias', 'media-0'); fermer(pg)
            ok((pg.locator('.cv-recto .cv-diapo').get_attribute('aria-label') or '').startswith('1 sur'), f'{nom} · Médias › Média 1 : retour au premier')
            # les informations autorisées : le rôle décide de la liste
            chemin(pg, 'informations'); vis = pg.evaluate(f"() => [...document.querySelectorAll('{MENU} [role=menuitem]')].map(e => e.dataset.mode).filter(m => m.startsWith('module-'))"); fermer(pg)
            chemin(pg, 'regarder', 'role-proprietaire'); fermer(pg)
            chemin(pg, 'informations'); vis_p = pg.evaluate(f"() => [...document.querySelectorAll('{MENU} [role=menuitem]')].map(e => e.dataset.mode).filter(m => m.startsWith('module-'))"); fermer(pg)
            ok(set(vis) <= set(vis_p) and len(vis_p) >= len(vis) and 'module-identite' in vis, f'{nom} · Informations : la liste suit les permissions du rôle (visiteur {len(vis)}, propriétaire {len(vis_p)})')
            chemin(pg, 'regarder', 'role-visiteur'); fermer(pg)
            # montrer un module qui n'est pas au recto de la forme ronde : la carte se tourne (ou se déplie)
            chemin(pg, 'informations', 'module-description'); pg.wait_for_timeout(500)
            face = pg.locator('.cv').get_attribute('data-face')
            ok(face in ('verso', 'page') and pg.locator('[data-module=description].cv-montre').count() == 1, f'{nom} · Informations › Présentation : la carte se tourne pour la montrer ({face})')
            fermer(pg)
            chemin(pg, 'revenir'); fermer(pg)
            ok(pg.locator('.cv').get_attribute('data-face') == 'recto', f'{nom} · Recto : retour à la face avant')
            # une information qui n'existe qu'en page : la carte se déplie, puis Réduire revient à la forme d'avant
            chemin(pg, 'informations', 'module-galerie'); pg.wait_for_timeout(500)
            ok(pg.locator('.cv.cv-page').count() == 1 and pg.locator('.cv-page [data-module=galerie]').count() == 1, f'{nom} · Informations › Galerie : la carte se déplie en page (la galerie n’a pas de place en forme ronde)')
            if CAP: pg.screenshot(path=f'{CAP}/carte-disque-{nom}.png')
            fermer(pg); chemin(pg, 'revenir'); fermer(pg)
            ok(pg.locator('.cv.cv-ronde').count() == 1, f'{nom} · Réduire : la carte redevient ronde')
            chemin(pg, 'retourner'); fermer(pg)
            ok(pg.locator('.cv').get_attribute('data-face') == 'verso' and pg.get_by_role('button', name='Retourner la carte : revenir au recto').count() == 1, f'{nom} · Retourner : le Disque et le bouton de la carte disent la même face')
            ok(pg.evaluate("() => !document.querySelector('.cv-message').textContent.includes('envoy') || document.querySelector('.cv-message').textContent.includes('n’envoie rien')"), f'{nom} · aucune action envoyée')
            ctx.close()
    finally:
        b.close()
ok(not erreurs, 'aucune erreur de page ' + str(erreurs[:3]))
n = sum(res); print(f'— {n}/{len(res)}'); raise SystemExit(0 if n == len(res) else 1)
