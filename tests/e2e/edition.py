"""L'édition Point Zéro (landing, livraison A) dans le vrai navigateur.
Vérifie : le héros historique conservé ; la page actuelle intacte sans ?edition ; trois scènes ; le disque = le Point (scène) sans ovale noir ;
de vraies actions (atelier, compositeur avec la recette, nuancier) ; pas de défilement horizontal ; mouvement réduit ; clavier ;
la fluidité du défilement (images de plus de 50 ms). Captures à 390, 768, 1440 et 1920 px.
Usage : cd studio && npx vite build && npx vite preview --port 4620, puis  python3 tests/e2e/edition.py   (CAPTURES=<dossier>)"""
import os, sys
from playwright.sync_api import sync_playwright
B = os.environ.get('BASE', 'http://localhost:4620'); CAP = os.environ.get('CAPTURES')
resultats, erreurs = [], []
def ok(c, nom): print(('OK ' if c else 'ÉCHEC ') + nom, flush=True); resultats.append(bool(c))
SCENES = ('hi-origine', 'hi-indiennes', 'hi-mulhouse', 'hi-brodeuses', 'ed-fils', 'ed-rosace', 'ed-cadeau')
DISQUES = ('hi-origine', 'or-lignes', 'ed-fils', 'ed-rosace')

def page(b, l, h, reduit=False, url='/?edition'):
    ctx = b.new_context(viewport={'width': l, 'height': h}, reduced_motion='reduce' if reduit else 'no-preference')
    pg = ctx.new_page(); pg.set_default_timeout(8000)
    pg.on('pageerror', lambda e: erreurs.append(str(e))); pg.on('console', lambda m: erreurs.append(m.text) if m.type == 'error' and 'favicon' not in m.text else None)
    pg.goto(B + url); pg.wait_for_timeout(900)
    return ctx, pg

def aller(pg, sid, f):
    pg.evaluate(f"""() => {{ const e = document.getElementById('{sid}'); const t = e.getBoundingClientRect().top + scrollY; scrollTo(0, t + Math.max(0, e.offsetHeight - innerHeight) * {f}); }}"""); pg.wait_for_timeout(450)
    if sid.startswith('hi-'):
        try: pg.wait_for_function(f"() => [...document.querySelectorAll('#{sid} .ed-brode')].every(e => e.dataset.pret === 'oui')", timeout=12000); pg.wait_for_timeout(350)
        except Exception: pass

with sync_playwright() as p:
    b = p.chromium.launch()
    # 1. la page actuelle, sans le paramètre, est intacte
    ctx, pg = page(b, 1440, 900, url='/')
    ok(pg.locator('#ch-zero').count() == 1 and pg.locator('.ed').count() == 0, 'sans ?edition : la landing actuelle est inchangée (ses huit chapitres, pas d’édition)')
    ctx.close()
    for l, h in ((390, 844), (768, 1024), (1440, 900), (1920, 1080)):
        ctx, pg = page(b, l, h)
        ok(pg.locator('.ru .ed-brode-photo').count() == 1 and pg.locator('.ru h1').inner_text().strip() == 'Point Zéro', f'{l} px · la une (le fond floral, brodé sous la loupe) est là, en tête')
        ok(pg.evaluate("() => document.querySelector('.ed').getBoundingClientRect().top > document.querySelector('.ru').getBoundingClientRect().top"), f'{l} px · l’édition commence sous le héros')
        ok(all(pg.locator(f'#{s}').count() == 1 for s in SCENES) and pg.locator('.ed .lp-anneau.lp-scene').count() == 4, f'{l} px · les scènes et quatre disques (le Point en scène)')
        larges = pg.evaluate("() => document.documentElement.scrollWidth - innerWidth")
        ok(larges <= 1, f'{l} px · pas de défilement horizontal ({larges} px)')
        for s in SCENES:
            for f in (0.15, 0.9):
                aller(pg, s, f)
                if CAP: pg.screenshot(path=f'{CAP}/edition-{l}-{s}-{int(f * 100)}.png')
            if s in DISQUES:
                entier = pg.evaluate(f"""() => {{ const a = document.querySelector('#{s} .lp-anneau').getBoundingClientRect(); return a.left >= -1 && a.right <= innerWidth + 1; }}""")
                ok(entier, f'{l} px · {s} : le disque tient dans la largeur')
        ok(pg.locator('.lp-centre-mot').count() == 0, f'{l} px · aucun ovale noir au centre du disque')
        tailles = pg.evaluate("() => [...document.querySelectorAll('.hi .ed-brode-vue')].map(e => Math.round(e.getBoundingClientRect().width))")
        ok(all(t >= 200 for t in tailles), f'{l} px · chaque broderie a sa place ({tailles} px de large)')
        ctx.close()

    # 1 bis. la séquence historique : tout en broderie, une loupe qui voit à travers, des légendes honnêtes
    ctx, pg = page(b, 1440, 900)
    aller(pg, 'hi-indiennes', 0.9)
    try: pg.wait_for_function("() => document.querySelectorAll('#hi-indiennes .ed-brode[data-pret=\"oui\"]').length === 2", timeout=15000)
    except Exception: pass
    ok(pg.locator('#hi-indiennes .ed-brode[data-pret="oui"]').count() == 2, 'histoire : les deux étoffes du Met sont converties en broderie par le studio')
    ok(all('domaine public' in t for t in pg.locator('#hi-indiennes figcaption').all_inner_texts()), 'histoire : les étoffes du Met sont créditées, domaine public')
    ok(all('Reconstitution' in pg.locator(f'#{s} figcaption').first.inner_text() for s in ('hi-origine', 'hi-mulhouse', 'hi-brodeuses')), 'histoire : les images générées sont annoncées comme reconstitutions')
    ok('DMC' in pg.locator('#hi-indiennes .hi-fil-dmc').first.inner_text() and 'indicatif' in pg.locator('#hi-indiennes .hi-fil-dmc').first.inner_text(), 'histoire : la garance est rapprochée d’un fil DMC, à titre indicatif')
    vue = pg.locator('#hi-indiennes .ed-brode-vue').first
    vue.focus(); pg.keyboard.press('ArrowRight'); pg.keyboard.press('Shift+ArrowDown'); pg.wait_for_timeout(300)
    dit = pg.locator('#hi-indiennes .ed-brode [role=status]').first.inner_text()
    ok(dit.startswith('Colonne') and ('DMC' in dit or 'toile' in dit), f'histoire : la loupe au clavier dit la case et son fil (« {dit} »)')
    ok(pg.locator('#hi-indiennes .ed-brode-fil').count() == 1, 'histoire : sous la loupe, le patron et le numéro du fil')
    if CAP: pg.screenshot(path=f'{CAP}/edition-1440-loupe-clavier.png')
    aller(pg, 'hi-origine', 0.9); pg.wait_for_timeout(600)
    pg.locator('#hi-origine [data-mode="loupe"]').click(); pg.wait_for_timeout(400)
    ok(pg.evaluate("() => document.activeElement?.classList.contains('ed-brode-vue')") and pg.locator('#hi-origine .ed-brode-fil').count() == 1, 'histoire : la commande Loupe du disque pose la loupe sur la broderie')
    ok(pg.locator('.hi-sources a').count() >= 5, 'histoire : les sources sont données')
    ctx.close()

    # 2. fluidité : on défile toute l'édition et l'on compte les images lentes
    ctx, pg = page(b, 1440, 900)
    # premier passage : les scènes se préparent (conversion paresseuse) ; on mesure le second, en régime établi, et l'on rapporte les deux
    passe = """async () => {
        const e = document.querySelector('.ed'), debut = e.getBoundingClientRect().top + scrollY, fin = debut + e.offsetHeight;
        let t = performance.now(), lentes = 0, n = 0;
        for (let y = debut; y < fin; y += 40) { scrollTo(0, y); await new Promise(r => requestAnimationFrame(r)); const u = performance.now(); if (u - t > 50) lentes++; t = u; n++; }
        return [lentes, n]; }"""
    premier = pg.evaluate(passe); pg.evaluate("() => scrollTo(0, 0)"); pg.wait_for_timeout(2500)
    lentes = pg.evaluate(passe)
    ok(lentes[0] <= max(2, lentes[1] // 25), f'défilement : {lentes[0]} image(s) lente(s) (> 50 ms) sur {lentes[1]} en régime établi ; {premier[0]} au premier passage, pendant les conversions')

    # 3. de vraies actions
    aller(pg, 'ed-rosace', 0.95)
    avant = pg.locator('.ed-recette code').inner_text()
    pg.locator('#ed-rosace [data-mode="palette"]').click(); pg.locator('#ed-rosace [data-mode="palette-3"]').click(); pg.wait_for_timeout(300)
    apres = pg.locator('.ed-recette code').inner_text()
    ok(avant != apres and apres.startswith('5D-') and apres[7] == '4', f'rosace : Palette → Terre régénère le motif par le moteur ({avant} → {apres})')
    aller(pg, 'ed-fils', 0.9)
    pg.locator('#ed-fils [data-mode="famille-verts"]').click(); pg.wait_for_timeout(200)
    ok(pg.locator('#ed-fils .lp-cartouche').count() == 1 and pg.locator('#ed-fils .lp-centre-niveau .lp-centre').count() == 1, 'nuancier : la sphère reste au centre, le nom est dans le cartouche')
    nuance = pg.locator('#ed-fils [data-mode^="dmc-"]').nth(4); code = nuance.get_attribute('data-mode')[4:]
    nuance.click(); pg.wait_for_timeout(200)
    ok(pg.locator('.ed-fiche-code').inner_text() == 'DMC ' + code, f'nuancier : Verts → DMC {code}, la fiche suit')
    if CAP: pg.screenshot(path=f'{CAP}/edition-1440-nuancier-choisi.png')
    # au clavier, dans le disque de la rosace
    aller(pg, 'ed-rosace', 0.95)
    pg.locator('#ed-rosace [role=menuitem][tabindex="0"]').focus()
    for _ in range(3):
        if pg.locator('#ed-rosace [role=menu][data-niveau="0"]').count(): break
        pg.keyboard.press('Escape'); pg.wait_for_timeout(120)
    pg.keyboard.press('Home'); pg.keyboard.press('ArrowRight'); pg.keyboard.press('Enter'); pg.wait_for_timeout(200)
    ok(pg.evaluate("() => document.activeElement?.closest('#ed-rosace') && document.activeElement.dataset.mode?.startsWith('structure-')"), 'clavier : flèche puis Entrée ouvre Structure, le focus suit dans le disque')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(150)
    ok(pg.evaluate("() => document.activeElement?.dataset.mode") == 'structure', 'clavier : Échap revient au premier cercle')
    # du disque à l'atelier : la rosace s'ouvre dans le compositeur
    code5d = pg.locator('.ed-recette code').inner_text()
    pg.locator('#ed-rosace [data-mode="studio"]').click(); pg.wait_for_url('**/atelier?rosace=*'); pg.wait_for_timeout(1200)
    ok(code5d in pg.url and pg.locator('.cr').count() >= 1, f'parcours : « Dans l’atelier » ouvre le compositeur sur {code5d}')
    ctx.close()
    ctx, pg = page(b, 1440, 900)
    aller(pg, 'hi-origine', 0.9)
    pg.locator('#hi-origine [data-mode="creer"]').click(); pg.locator('#hi-origine [data-mode="creer-motif"]').click(); pg.wait_for_timeout(1200)
    ok('/atelier' in pg.url and pg.locator('.pzs-top').count() == 1, 'parcours : Créer → Nouveau motif ouvre l’atelier')
    ctx.close()

    # 4. mouvement réduit : rien de collé, tout montré
    ctx, pg = page(b, 1440, 900, reduit=True)
    hauteurs = pg.evaluate("() => ['hi-origine','ed-rosace','ed-fils'].map(i => document.getElementById(i).offsetHeight / innerHeight)")
    ok(all(x < 1.9 for x in hauteurs), f'mouvement réduit : pas de scène allongée ({[round(x, 2) for x in hauteurs]} écrans)')
    ok(pg.evaluate("() => getComputedStyle(document.querySelector('#hi-origine .ed-plateau')).position") == 'relative', 'mouvement réduit : rien n’est collé à l’écran')
    ok(pg.evaluate("() => getComputedStyle(document.querySelector('#hi-origine .lp-anneau > .lp-secteur')).opacity") == '1', 'mouvement réduit : le disque est montré entier')
    ctx.close()
    b.close()
ok(not erreurs, 'aucune erreur dans la page ' + str(erreurs[:3]))
print(f'— {sum(resultats)}/{len(resultats)}')
sys.exit(0 if all(resultats) else 1)
