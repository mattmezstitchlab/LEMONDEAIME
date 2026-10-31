"""La mise en ligne de lemondeaime.com (décision de Matt, 31/10/2026) : ce qui est public, et rien d'autre.

- L'accueil / est Le Monde AIME (les projets) ; /projets aussi.
- Publics : l'atelier de broderie (/studio/), le Tambour, .0NE et le Disque (Première rencontre, univers, Disque Terminal).
- Pas publics : le film LUMIERE, la Galerie des Vivants, Explorer, les essais, l'accueil du Disque et du Cube.
  Leur adresse ramène à .0NE (ou n'existe pas), aucun lien ni menu n'y mène, aucun mot ne les annonce.
- Aucun fichier audio LUMIERE, aucune archive, aucune note interne n'est servi.
À lancer sur une construction sans VITE_PROTOTYPES (comme la production).
Usage : BASE=http://localhost:4800 python3 tests/e2e/publication.py   (en ligne : BASE=https://www.lemondeaime.com)"""
import os, re, urllib.request
from playwright.sync_api import sync_playwright
B = os.environ['BASE'].rstrip('/'); R = [0, 0]
def ok(c, m): R[0 if c else 1] += 1; print(('✓ ' if c else 'ÉCHEC ') + m, flush=True)
MOTS = re.compile(r'LUMIERE|Fleur du Ciel|Explorer (tous )?les prototypes|Tout explorer|Galerie des Vivants|version candidate|Carte vivante', re.I)
PUBLIQUES = ['/', '/projets', '/studio/', '/studio/atelier', '/studio/tambour', '/studio/one/univers', '/studio/one/premiere-rencontre', '/studio/one/terminal']
PRIVEES = ['/studio/one/lumiere', '/studio/one/lumiere/vivre', '/studio/one/lumiere/planches', '/studio/explorer', '/studio/galerie', '/studio/accueil',
           '/studio/essai-carte', '/studio/essai-aime', '/studio/essai-traversee', '/studio/essai-image', '/explorer', '/galerie', '/accueil']
FICHIERS = ['/AIME%20PROJETS.zip', '/studio/lumiere-prive/fleur-du-ciel-extrait.m4a', '/studio/prive-audio/fleur-du-ciel.m4a', '/docs/one/convergence-bascule.md']

def servi(u):
    """le fichier lui-même est-il servi ? (une page HTML de repli ou une 404 ne compte pas)"""
    try:
        r = urllib.request.urlopen(B + u, timeout=20); debut = r.read(64)
        return r.status == 200 and 'text/html' not in (r.headers.get('content-type') or '') and not debut.lstrip().lower().startswith(b'<!doctype')
    except urllib.error.HTTPError: return False

for f in FICHIERS:
    ok(not servi(f), f'{f} n’est pas servi')

with sync_playwright() as p:
    b = p.chromium.launch()
    for appareil, kw in (('ordinateur', {'viewport': {'width': 1440, 'height': 900}}), ('téléphone', {'viewport': {'width': 390, 'height': 844}, 'is_mobile': True, 'has_touch': True})):
        ctx = b.new_context(**kw); ctx.add_init_script("localStorage.setItem('pointzero:visite-docks:v1','vue')")
        pg = ctx.new_page(); err = []
        pg.on('pageerror', lambda e: err.append(str(e)[:120]))
        for u in PUBLIQUES:
            pg.goto(B + u); pg.wait_for_timeout(3000)
            t = pg.locator('body').inner_text(); vus = sorted(set(m.group(0) for m in MOTS.finditer(t)))
            liens = pg.evaluate("[...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href'))")
            prives = sorted(set(l for l in liens if l and re.search(r'one/lumiere|/explorer|/galerie(\?|$)|/studio/accueil|essai-', l)))
            ici = pg.url.replace(B, '')
            ok(ici.split('?')[0].split('#')[0] == u and not vus and not prives, f'[{appareil}] {u} reste {ici} · mots {vus or "aucun"} · liens privés {prives or "aucun"}')
            if u == '/':
                ok(pg.locator('h1').first.inner_text().strip().lower() == 'le monde aime', f'[{appareil}] l’accueil est Le Monde AIME (« {pg.locator("h1").first.inner_text().strip()} »)')
        for u in PRIVEES:
            pg.goto(B + u); pg.wait_for_timeout(2500)
            ici = pg.url.replace(B, '')
            t = pg.locator('body').inner_text()
            introuvable = 'introuvable' in pg.title().lower()
            ok((introuvable or not re.search(r'one/lumiere|explorer|galerie|accueil|essai-', ici)) and not MOTS.search(t), f'[{appareil}] {u} → {ici}{" (page introuvable)" if introuvable else ""} : rien de privé ne s’affiche')
        # .0NE : les cases des univers publics seulement
        pg.goto(B + '/studio/one/univers'); pg.wait_for_timeout(3000)
        if pg.locator('.dq-bouton-grille').count(): pg.locator('.dq-bouton-grille').first.click(); pg.wait_for_timeout(800)
        cases = [x.get_attribute('data-univers') for x in pg.locator('[data-univers]').all()]
        ok(cases and 'broderie' in cases and 'galerie' not in cases and 'carte-vivante' not in cases, f'[{appareil}] .0NE : les univers publics ({cases})')
        # la navigation permanente
        pg.goto(B + '/studio/one/premiere-rencontre'); pg.wait_for_timeout(2500)
        nav = pg.locator('.cv-nav-bouton')
        if nav.count():
            nav.first.click(); pg.wait_for_timeout(400)
            noms = pg.locator('.cv-nav-panneau a').all_inner_texts()
            ok(noms and not any(MOTS.search(n) or 'ATLAS' in n for n in noms), f'[{appareil}] « Naviguer » : {noms}')
        ok(not err, f'[{appareil}] aucune erreur {err[:2]}')
    b.close()
print(f'— {R[0]}/{R[0] + R[1]}')
