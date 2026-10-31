"""Les écrans montrés dans les appareils de la landing : de vraies captures de l'atelier actuel.
On ouvre une rosace par le chemin du cadeau (?offerte=), puis on photographie l'atelier sur ordinateur, iPad et iPhone.
Usage : cd studio && npx vite build && npx vite preview --port 4620, puis  python3 tests/e2e/captures-appareils.py
Écrit dans studio/public/images/ecrans/ (WebP)."""
import os, io
from playwright.sync_api import sync_playwright
from PIL import Image
B = os.environ.get('BASE', 'http://localhost:4620')
D = os.path.join(os.path.dirname(__file__), '..', '..', 'studio', 'public', 'images', 'ecrans'); os.makedirs(D, exist_ok=True)
CODE = '5D-13133.g59.v0.1'  # Kaléidoscope, une recette du mur
def enregistrer(png, nom, l):
    im = Image.open(io.BytesIO(png)).convert('RGB'); im.thumbnail((l, 4000)); im.save(os.path.join(D, nom), 'WEBP', quality=84); print(nom, im.size)
def ouvrir(b, l, h, mobile=False, bloc=False):
    ctx = b.new_context(viewport={'width': l, 'height': h}, device_scale_factor=2, has_touch=mobile, is_mobile=mobile)
    ctx.add_init_script("localStorage.setItem('pointzero:visite-docks:v1','vue');" + ("localStorage.setItem('pointzero:essai:outils-sur-le-bloc','1');" if bloc else ""))
    pg = ctx.new_page(); pg.goto(B + '/atelier?offerte=' + CODE); pg.wait_for_timeout(2500)
    pg.evaluate("() => document.querySelectorAll('[role=status], .pz-toast, .toast').forEach(e => e.style.visibility = 'hidden')")
    return ctx, pg
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx, pg = ouvrir(b, 1440, 900); pg.wait_for_timeout(500)
    enregistrer(pg.screenshot(), 'atelier-ordinateur.webp', 1600); ctx.close()
    ctx, pg = ouvrir(b, 1180, 820)
    for mot in ('Patron', 'Symboles'):
        loc = pg.locator(f'.pzs-bottom button:has-text("{mot}")').first
        if loc.count(): loc.click(); pg.wait_for_timeout(400)
    enregistrer(pg.screenshot(), 'atelier-ipad-patron.webp', 1400); ctx.close()
    ctx, pg = ouvrir(b, 390, 844, mobile=True, bloc=True)
    pg.locator('.lp-point').first.tap(); pg.wait_for_timeout(300)
    pg.locator('[data-presentation] [data-mode="fils"]').first.tap(); pg.wait_for_timeout(300)
    pg.locator('[data-presentation] [data-mode="famille-rouges"]').first.tap(); pg.wait_for_timeout(400)
    enregistrer(pg.screenshot(), 'atelier-iphone-fils.webp', 640); ctx.close()
    b.close()
