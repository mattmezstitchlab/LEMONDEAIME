"""De .0NE à ATLAS : ouvrir une création publiée par sa référence (test réel, deux applications).

  ATLAS servi tel quel (dépôt Atlas-de-pique-de-coeur, branche de la publication) :  node tests/serveur.mjs 8090
  .0NE construit avec VITE_ATLAS_URL=http://localhost:8090/ et servi sur BASE.
  BASE=http://localhost:4632 ATLAS=http://localhost:8090 python3 tests/e2e/atlas_creation.py
Sans ATLAS local (ATTENDU=absente) : la carte doit dire honnêtement que la création n'est pas publiée.
"""
import os, sys
from playwright.sync_api import sync_playwright

B = os.environ.get('BASE', 'http://localhost:4632').rstrip('/')
ATLAS = os.environ.get('ATLAS', 'http://localhost:8090').rstrip('/')
ATTENDU = os.environ.get('ATTENDU', 'publiee')
NAVS = os.environ.get('NAVIGATEURS', 'chromium').split(',')
ID = 'demonstration-un-concert-en-deux-demandes-c010df'
R = [0, 0]
def ok(c, m): R[0 if c else 1] += 1; print(('✓ ' if c else '✗ ') + m)

with sync_playwright() as pw:
    for nav in NAVS:
        N = f'[{nav}]'
        b = getattr(pw, nav).launch(); ctx = b.new_context(viewport={'width': 1280, 'height': 900})
        pg = ctx.new_page(); err = []; pg.on('pageerror', lambda e: err.append(str(e)))
        demandes = []
        ctx.on('request', lambda r: demandes.append(r) if '/creations/' in r.url else None)
        pg.goto(B + '/studio/explorer')
        carte = pg.locator(f'[data-creation="{ID}"] .cv-carte')
        pg.wait_for_function(f"document.querySelector('[data-creation=\"{ID}\"] .cv-carte[data-etat]')", timeout=15000)
        etat = carte.get_attribute('data-etat')
        ok(etat == ATTENDU, f'{N} la carte dit « {carte.locator(".cv-statut").inner_text()} » ({etat})')
        if demandes:
            h = demandes[0].headers
            ok(not h.get('referer') and 'cookie' not in h, f'{N} la vérification n’envoie ni adresse d’origine ni cookie')
            ok(demandes[0].url == f'{ATLAS}/creations/{ID}.json', f'{N} seule la fiche publique est lue ({demandes[0].url})')
        if ATTENDU == 'publiee':
            ok(carte.get_attribute('target') == '_blank' and 'noopener' in carte.get_attribute('rel'), f'{N} nouvel onglet, noopener')
            with ctx.expect_page() as nouvel: carte.click()
            p2 = nouvel.value; p2.wait_for_selector('.creation-etat[data-code]', timeout=15000)
            ok(p2.url == f'{ATLAS}/composition/{ID}', f'{N} l’adresse exacte, sans rien d’ajouté : {p2.url}')
            ok(p2.locator('.creation-grille .bloc').count() == 3, f'{N} ATLAS montre la création en lecture seule (3 blocs)')
            ok('Démonstration' in p2.locator('#creation-titre').text_content(), f'{N} titre : {p2.locator("#creation-titre").text_content()}')
            ok(pg.locator('.cv-carte .bloc, .cv-carte .creation-grille').count() == 0, f'{N} rien de la création n’est copié dans .0NE')
        else:
            ok(carte.evaluate('e => e.tagName') == 'DIV', f'{N} rien ne s’ouvre : {carte.locator(".cv-phrase").inner_text()}')
        ok(not err, f'{N} aucune erreur {err[:2]}')
        b.close()
print(f'— {R[0]}/{R[0] + R[1]}'); sys.exit(1 if R[1] else 0)
