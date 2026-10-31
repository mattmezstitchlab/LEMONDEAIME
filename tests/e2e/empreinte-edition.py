"""Empreinte de l'édition : le DOM complet de la landing ?edition et des captures, pour prouver qu'un changement interne
(phase 1 : les textes sortis du code) ne change rien à l'écran.

Usage : cd studio && npx vite build && npx vite preview --port 4620
        python3 tests/e2e/empreinte-edition.py <dossier>            # enregistre l'empreinte
        python3 tests/e2e/empreinte-edition.py <dossier> <reference> # compare à une empreinte enregistrée
"""
import hashlib, json, os, re, sys
from playwright.sync_api import sync_playwright

B = os.environ.get('BASE', 'http://localhost:4620')
SORTIE = sys.argv[1]; REF = sys.argv[2] if len(sys.argv) > 2 else None
os.makedirs(SORTIE, exist_ok=True)
VUES = [('ordinateur', 1440, 900), ('telephone', 390, 844)]
SCENES = ['hi-origine', 'hi-indiennes', 'or-forme', 'hi-mulhouse', 'or-lignes', 'hi-brodeuses', 'or-finesse', 'ed-fils', 'or-couleurs', 'ed-rosace', 'ed-cadeau']

def propre(html):
    html = re.sub(r'(data:image/[a-z]+;base64,)[A-Za-z0-9+/=]+', r'\1…', html)   # aperçus peints : comparés par les captures
    html = re.sub(r' data-pret="(oui|non)"', '', html)   # l'état de conversion des broderies dépend du moment : les captures attendent qu'elles soient prêtes
    return html

resume = {}
with sync_playwright() as p:
    b = p.chromium.launch()
    for nom, L, H in VUES:
        ctx = b.new_context(viewport={'width': L, 'height': H}, reduced_motion='reduce')
        pg = ctx.new_page(); erreurs = []
        pg.on('pageerror', lambda e: erreurs.append(str(e)))
        pg.goto(B + '/?edition'); pg.evaluate('() => localStorage.clear()'); pg.reload()
        pg.wait_for_selector('#ed-cadeau'); pg.wait_for_timeout(1500)
        dom = propre(pg.evaluate("() => document.querySelector('.ed').outerHTML"))
        open(f'{SORTIE}/{nom}.html', 'w').write(dom)
        texte = pg.evaluate("() => document.querySelector('.ed').innerText")
        open(f'{SORTIE}/{nom}.txt', 'w').write(texte)
        for s in SCENES:
            pg.evaluate(f"() => {{ const e = document.getElementById('{s}'); scrollTo(0, e.getBoundingClientRect().top + scrollY); }}")
            pg.wait_for_timeout(700)
            # une capture ne compare que des scènes achevées : chaque broderie visible doit être prête (conversion terminée)
            pg.wait_for_function(f"() => [...document.querySelectorAll('#{s} .ed-brode')].every(e => e.dataset.pret === 'oui')", timeout=30000)
            pg.wait_for_timeout(300)
            pg.screenshot(path=f'{SORTIE}/{nom}-{s}.png')
        resume[nom] = {'dom': hashlib.sha256(dom.encode()).hexdigest()[:16], 'texte': hashlib.sha256(texte.encode()).hexdigest()[:16], 'erreurs': erreurs[:3]}
        ctx.close()
    b.close()
json.dump(resume, open(f'{SORTIE}/resume.json', 'w'), indent=1)
print(json.dumps(resume, indent=1))

if REF:
    from PIL import Image, ImageChops
    ecarts = 0
    for nom, *_ in VUES:
        for f in ('html', 'txt'):
            a, c = open(f'{REF}/{nom}.{f}').read(), open(f'{SORTIE}/{nom}.{f}').read()
            ok = a == c; ecarts += not ok
            print(('OK  ' if ok else 'DIFF') + f' {nom}.{f}')
            if not ok:
                i = next(k for k in range(min(len(a), len(c))) if a[k] != c[k]) if any(a[k] != c[k] for k in range(min(len(a), len(c)))) else min(len(a), len(c))
                print('   référence :', a[max(0, i - 120):i + 120]); print('   nouvelle  :', c[max(0, i - 120):i + 120])
        for s in SCENES:
            x, y = Image.open(f'{REF}/{nom}-{s}.png').convert('RGB'), Image.open(f'{SORTIE}/{nom}-{s}.png').convert('RGB')
            d = ImageChops.difference(x, y); boite = d.getbbox()
            n = sum(1 for v in d.convert('L').getdata() if v > 24) if boite else 0
            ok = n == 0; ecarts += not ok
            print(('OK  ' if ok else 'DIFF') + f' {nom}-{s}.png' + ('' if ok else f'  ({n} pixels, zone {boite})'))
    print('ÉCARTS :', ecarts); sys.exit(1 if ecarts else 0)
