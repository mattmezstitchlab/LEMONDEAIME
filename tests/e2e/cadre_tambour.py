"""Essai de l'atelier : le Cadre-Tambour V2, « le disque unique ». Dans le vrai navigateur, sur la version construite.
Géométrie (pour chaque commande réellement affichée, focus compris) : entièrement dans la couronne, jamais sur la toile ni sur la vis,
aucune collision ; sur 320, 360, 390, 430, 768, 1024, 1440 px, en paysage, zoom 200 %, texte agrandi (Confort), Nuit, sous-niveaux.
Travail : on dessine au centre (l'orbe au repos laisse passer), Annuler, Affichage agit, Fils › famille › nuance s'applique.
Objet : morphose Cadre → Tambour (et retour), instantanée en mouvement réduit ; le cadrage de l'ouvrage est conservé ;
Rétracter, Échap, Replier les outils (essai), l'orbe éveillée ouvre le Tambour vivant ; le dock accroché suit le Cadre.
Usage : cd studio && npx vite build && npx vite preview --port 4620, puis  python3 tests/e2e/cadre_tambour.py   (CAPTURES=<dossier>)"""
import os, math
from playwright.sync_api import sync_playwright
B = os.environ.get('BASE', 'http://localhost:4620'); CAP = os.environ.get('CAPTURES')
res, erreurs = [], []
def ok(c, t): res.append(bool(c)); print(('OK ' if c else 'ÉCHEC ') + t, flush=True)
def cap(pg, nom):
    if CAP: pg.screenshot(path=f'{CAP}/cadre-tambour-{nom}.png')
MENU = '.pzt [data-presentation][role=menu]'
def cadre(pg): return pg.evaluate("() => { const c = getComputedStyle(document.querySelector('.cadre')), v = k => parseFloat(c.getPropertyValue(k)); return { x: v('--fx0'), y: v('--fy0'), w: v('--fw'), h: v('--fh') }; }")
def dock(pg): return pg.evaluate("() => { const r = document.querySelector('.pzs-bottom').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, b: r.bottom }; }")
def accroche(pg):
    c, d = cadre(pg), dock(pg); bas = pg.evaluate('innerHeight') - d['h'] - 12
    attendu = max(c['y'] + 24, min(c['y'] + c['h'] + 12, bas))
    return abs(d['y'] - attendu) <= 3 and (abs((d['x'] + d['w'] / 2) - (c['x'] + c['w'] / 2)) <= 3 or d['x'] <= 13 or d['x'] + d['w'] >= pg.evaluate('innerWidth') - 13)
GEOM = """() => {
  const z = document.querySelector('.pzt'), s = getComputedStyle(z), v = k => parseFloat(s.getPropertyValue(k));
  const cx = v('--pzt-x'), cy = v('--pzt-y'), r = v('--pzt-r'), ri = v('--pzt-ri'), ro = v('--pzt-ro');
  const F = 5;   /* le contour du focus : 3 px + 2 px d'écart */
  const boites = [...document.querySelectorAll('.pzt [role=menuitem]')].map(e => { const b = e.getBoundingClientRect(); return { id: e.dataset.mode, l: b.left - F, t: b.top - F, r: b.right + F, b: b.bottom + F }; });
  const coins = q => [[q.l, q.t], [q.r, q.t], [q.r, q.b], [q.l, q.b]];
  const dmin = q => Math.hypot(Math.max(q.l - cx, 0, cx - q.r), Math.max(q.t - cy, 0, cy - q.b));
  const dehors = boites.filter(q => coins(q).some(([x, y]) => Math.hypot(x - cx, y - cy) > ro + .5)).map(q => q.id);
  const dedans = boites.filter(q => dmin(q) < ri - .5).map(q => q.id);
  const vis = document.querySelector('.pzt-vis')?.getBoundingClientRect();
  const surVis = vis ? boites.filter(q => !(q.r - F <= vis.left || q.l + F >= vis.right || q.b - F <= vis.top || q.t + F >= vis.bottom)).map(q => q.id) : [];
  const collisions = []; for (let i = 0; i < boites.length; i++) for (let j = i + 1; j < boites.length; j++) { const a = boites[i], b = boites[j];
    if (a.l + F < b.r - F && b.l + F < a.r - F && a.t + F < b.b - F && b.t + F < a.b - F) collisions.push(a.id + '/' + b.id); }
  const ecran = boites.every(q => q.l >= 0 && q.t >= 0 && q.r <= innerWidth && q.b <= innerHeight);
  return { n: boites.length, r, ri, ro, dehors, dedans, surVis, collisions, ecran, etiq: z.dataset.etiquettes };
}"""
def geom_ok(pg, nom):
    g = pg.evaluate(GEOM)
    bon = g['n'] >= 3 and not g['dehors'] and not g['dedans'] and not g['surVis'] and not g['collisions'] and g['ecran']
    ok(bon, f"{nom} : {g['n']} commandes dans la couronne (toile r={round(g['r'])}, couronne {round(g['ri'])}–{round(g['ro'])}, mots {g['etiq']})" + ('' if bon else f" — dehors {g['dehors']} dedans {g['dedans']} vis {g['surVis']} collisions {g['collisions']} écran {g['ecran']}"))
    return g
def page(b, l, h, mobile=False, active=True, motion='reduce', script='', dsf=1):
    ctx = b.new_context(viewport={'width': l, 'height': h}, has_touch=mobile, is_mobile=mobile, reduced_motion=motion, device_scale_factor=dsf)
    ctx.add_init_script("localStorage.setItem('pointzero:visite-docks:v1', 'vue')" + ("; localStorage.setItem('pointzero:essai:cadre-tambour', '1'); localStorage.setItem('pointzero:disque:presentation', 'disque')" if active else "") + script)
    pg = ctx.new_page(); pg.set_default_timeout(8000); pg.on('pageerror', lambda e: erreurs.append(str(e)))
    pg.goto(B + '/atelier?offerte=5D-12342.g21.v0.1'); pg.wait_for_selector('.cadre[data-pret]', timeout=20000); pg.wait_for_timeout(1500)
    return ctx, pg
def racine(pg):
    for _ in range(4):
        if pg.locator(MENU).get_attribute('data-niveau') == '0': return
        pg.locator(f'{MENU} [data-mode="__retour"]').click(); pg.wait_for_timeout(150)
def ouvrir(pg):
    if pg.locator('.pzt').count(): return   # navigation .0 : le tambour est déjà ouvert à l'arrivée
    pg.locator('.pzs-ouvrir-tambour').click(); pg.wait_for_selector('.pzt'); pg.wait_for_timeout(700)

with sync_playwright() as p:
    b = p.chromium.launch()
    try:
        # —— ordinateur : l'objet complet ——
        ctx, pg = page(b, 1440, 900, active=False, motion='no-preference')
        # la navigation réelle d'aujourd'hui (.0, le tambour par défaut) : l'atelier s'ouvre déjà en tambour, « Rétracter » rend le Cadre ;
        # la navigation classique (sans .0) garde l'ancien chemin, l'essai activé par le menu AIME
        if pg.locator('.pzt').count():
            ok(pg.locator(f'{MENU} [data-mode="retracter"]').count() == 1, 'navigation .0 : l’atelier s’ouvre en tambour, Rétracter est dans la couronne')
            pg.locator(f'{MENU} [data-mode="retracter"]').click(); pg.wait_for_timeout(900)
        else:
            pg.get_by_role('button', name='Menu AIME : accueil, réglages, affichage').click(); pg.get_by_role('button', name='Essai : le Cadre-Tambour').click(); pg.wait_for_timeout(600)
        ok(pg.locator('.pzs-bottom.pzs-accroche').count() == 1 and accroche(pg), 'Cadre : le dock du bas accroché sous le format, comme l’étiquette au-dessus')
        for _ in range(2): pg.evaluate("window.dispatchEvent(new CustomEvent('pointzero:canvas', { detail: { action: 'zoomIn' } }))"); pg.wait_for_timeout(200)
        pg.wait_for_timeout(400); avant = cadre(pg)
        # morphose
        pg.locator('.pzs-ouvrir-tambour').click(); pg.wait_for_timeout(90)
        r0 = pg.evaluate("() => getComputedStyle(document.querySelector('.pzt-bois')).borderTopLeftRadius"); cap(pg, '0-morphose')
        pg.wait_for_timeout(700)
        r1 = pg.evaluate("() => { const b = document.querySelector('.pzt-bois').getBoundingClientRect(); return [getComputedStyle(document.querySelector('.pzt-bois')).borderTopLeftRadius, Math.round(b.width), Math.round(b.height)]; }")
        ok(r0 != '50%' and r1[0] == '50%' and r1[1] == r1[2], f'morphose : le contour du Cadre ({r0}) devient le bois rond ({r1[0]})')
        g = geom_ok(pg, '1440 × 900')
        ok(g['etiq'] == 'dessous' and g['n'] >= 10 and g['r'] >= 150, 'ordinateur : les dix familles et leurs mots, une grande toile')
        cap(pg, '1-tambour')
        # le centre : au repos, on y dessine ; l'orbe s'éveille quand la main revient sur la couronne
        t = pg.evaluate("() => { const s = getComputedStyle(document.querySelector('.pzt')); return { x: parseFloat(s.getPropertyValue('--pzt-x')), y: parseFloat(s.getPropertyValue('--pzt-y')) }; }")
        pg.mouse.move(t['x'] + 60, t['y'] + 60); pg.wait_for_timeout(1700)
        ok(pg.evaluate(f"() => document.elementFromPoint({t['x']}, {t['y']})?.tagName") == 'CANVAS', 'repos : le centre laisse passer les gestes (on dessine au centre de la rosace)')
        pg.locator(f'{MENU} [data-mode="points"], {MENU} [data-mode="creer"]').first.click(); pg.wait_for_timeout(250)
        outil = pg.locator(f'{MENU} [role=menuitem]:not([data-mode^="__"])').first; outil_nom = outil.get_attribute('data-mode'); outil.click(); pg.wait_for_timeout(300)
        racine(pg)
        pg.mouse.move(t['x'] + 60, t['y'] + 60); pg.wait_for_timeout(1700)
        dessin_avant = pg.locator('[aria-label="Annuler"]').is_disabled()
        pg.mouse.click(t['x'] + 3, t['y'] + 3); pg.wait_for_timeout(400)
        ok(dessin_avant and pg.locator('[aria-label="Annuler"]').is_enabled(), f'Points › {outil_nom} : on dessine au centre du tambour, le vrai ouvrage change (Annuler devient possible)')
        (pg.locator('[aria-label="Annuler"]').click() if pg.locator('[aria-label="Annuler"]').is_visible() else pg.keyboard.press('Control+z')); pg.wait_for_timeout(300); ok(pg.locator('[aria-label="Annuler"]').is_disabled(), 'Annuler défait le point posé dans le tambour')
        pg.locator(f'{MENU} [data-mode="loupe"]').hover(); pg.wait_for_timeout(300)
        ok(pg.evaluate("() => document.querySelector('.pzt').classList.contains('pzt-eveil')") and pg.locator('.pzt .lp-centre-action').evaluate("e => getComputedStyle(e).pointerEvents") == 'auto', 'la main sur la couronne : l’orbe s’éveille, la caméra devient cliquable')
        pg.locator(f'{MENU} [data-mode="loupe"]').click(); pg.wait_for_timeout(400)
        lp = pg.evaluate("() => { const b = document.querySelector('.pzs-loupe-dock').getBoundingClientRect(), s = getComputedStyle(document.querySelector('.pzt')), v = k => parseFloat(s.getPropertyValue(k)); return b.left >= v('--pzt-x') + v('--pzt-ro') && b.right <= innerWidth && b.width >= 240; }")
        ok(lp and 'DMC' in pg.locator('.pzs-loupe-dock').inner_text(), 'Loupe : elle inspecte la vraie grille, à côté du disque, sans toucher la couronne')
        pg.locator(f'{MENU} [data-mode="loupe"]').click(); pg.wait_for_timeout(300)
        # Affichage agit ; Fils › famille › nuance s'applique, sur la même couronne
        sym = pg.evaluate("() => document.querySelector('[data-guide=symboles]')?.getAttribute('aria-pressed')")
        pg.locator(f'{MENU} [data-mode="affichage"]').click(); pg.wait_for_timeout(300); geom_ok(pg, 'niveau Affichage')
        pg.locator(f'{MENU} [data-mode="symboles"]').click(); pg.wait_for_timeout(300)
        ok(pg.evaluate("() => document.querySelector('[data-guide=symboles]')?.getAttribute('aria-pressed')") != sym, 'Affichage › Symboles : la rosace se transforme')
        racine(pg)
        pg.locator(f'{MENU} [data-mode="fils"]').click(); pg.wait_for_timeout(300)
        fam = pg.locator(f'{MENU} [data-mode^="famille-"]').nth(2); fam_id = fam.get_attribute('data-mode'); fam.click(); pg.wait_for_timeout(300)
        g = geom_ok(pg, 'niveau Fils › famille (nuances en pastilles)')
        pg.locator(f'{MENU} [data-mode^="dmc-"]').nth(3).hover(); pg.wait_for_timeout(200)
        ok(pg.locator('.pzt-cartouche b').inner_text().startswith('DMC '), f"une nuance se reconnaît sans la couleur : « {pg.locator('.pzt-cartouche').inner_text().replace(chr(10), ' · ')} »")
        nuance = pg.locator(f'{MENU} [data-mode^="dmc-"]').nth(1); nid = nuance.get_attribute('data-mode'); nuance.click(); pg.wait_for_timeout(400)
        if not pg.locator(f'{MENU} [data-mode="{nid}"]').count():
            pg.locator(f'{MENU} [data-mode="fils"]').click(); pg.wait_for_timeout(200); pg.locator(f'{MENU} [data-mode="{fam_id}"]').click(); pg.wait_for_timeout(300)
        ok('actif' in (pg.locator(f'{MENU} [data-mode="{nid}"]').get_attribute('aria-label') or ''), f'Fils › famille › nuance : {nid.replace("dmc-", "DMC ")} devient le fil actif')
        cap(pg, '2-fils')
        racine(pg)
        # Replier les outils (essai) puis déployer
        pg.locator('.pzt').evaluate("z => z.querySelector('[role=menuitem]').focus()")
        rav = pg.evaluate("parseFloat(getComputedStyle(document.querySelector('.pzt')).getPropertyValue('--pzt-r'))")
        pg.locator(f'{MENU} [data-mode="replier"]').click(); pg.wait_for_timeout(500)
        rap = pg.evaluate("parseFloat(getComputedStyle(document.querySelector('.pzt')).getPropertyValue('--pzt-r'))")
        ok(rap > rav + 40 and pg.locator(MENU).count() == 0 and pg.locator('.pzt-deployer').count() == 1, f'Replier les outils (essai) : la toile grandit ({round(rav)} → {round(rap)} px), un rond les rappelle')
        cap(pg, '3-replie')
        pg.locator('.pzt-deployer').click(); pg.wait_for_timeout(500); ok(pg.locator(MENU).count() == 1, 'les outils reviennent à la demande')
        # Rétracter : morphose inverse, le cadrage est conservé
        pg.locator(f'{MENU} [data-mode="retracter"]').click(); pg.wait_for_timeout(120)
        ok(pg.evaluate("() => document.querySelector('.pzt')?.classList.contains('pzt-sortie')"), 'Rétracter : le chemin inverse (morphose de retour)')
        pg.wait_for_timeout(600)
        apres = cadre(pg)
        ok(pg.locator('.pzt').count() == 0 and all(abs(avant[k] - apres[k]) <= 1 for k in 'xywh') and accroche(pg), 'retour au Cadre : même cadrage, même ouvrage, dock accroché')
        ok(pg.locator('.lp-tambour, .pzt-deployer, .pzt-cartouche').count() == 0 and pg.evaluate("() => ['.cadre-tete', '.cadre-poignee', '.pzs-bottom'].every(s => getComputedStyle(document.querySelector(s)).visibility === 'visible')"),
           'retour au Cadre : aucun bouton résiduel ; étiquette, poignées et dock rétablis')
        ok(pg.evaluate("document.activeElement?.classList.contains('pzs-ouvrir-tambour')"), 'le focus revient au bouton du tambour')
        # clavier : Entrée ouvre, Échap (focus sur la grille) rétracte ; Broder › Sur ma toile ; l'orbe ouvre le Tambour vivant
        pg.keyboard.press('Enter'); pg.wait_for_timeout(700); ok(pg.locator('.pzt').count() == 1, 'clavier : Entrée ouvre le tambour')
        pg.locator(f'{MENU} [data-mode="broder"]').click(); pg.wait_for_timeout(250)
        if not pg.locator(f'{MENU} [data-mode="sur-ma-toile"]').count(): pg.locator(f'{MENU} [data-mode="__suite"]').click(); pg.wait_for_timeout(250)   # la couronne se pagine selon sa capacité
        ok(pg.locator(f'{MENU} [data-mode="sur-ma-toile"]').count() == 1, 'Broder › Sur ma toile : la caméra au clavier et au lecteur d’écran')
        pg.keyboard.press('Escape'); pg.wait_for_timeout(150); pg.evaluate("document.activeElement?.blur()"); pg.keyboard.press('Escape'); pg.wait_for_timeout(600)
        ok(pg.locator('.pzt').count() == 0, 'Échap remonte d’un niveau, puis rétracte')
        ouvrir(pg); pg.locator(f'{MENU} [data-mode="loupe"]').hover(); pg.wait_for_timeout(300); pg.locator('.pzt .lp-centre-action').click(force=True)
        pg.wait_for_url(lambda u: '/tambour' in u, timeout=10000); pg.wait_for_selector('[data-tambour=etat]'); pg.wait_for_timeout(1200)
        ok('mode=superposer' in pg.url and 'Ma rosace offerte' in pg.locator('[data-tambour=etat]').inner_text(), 'l’orbe éveillée ouvre le Tambour vivant, cet ouvrage posé sur la toile filmée')
        ctx.close()

        # —— mouvement réduit : la transition est instantanée ——
        ctx, pg = page(b, 1440, 900, motion='reduce')
        if not pg.locator('.pzt').count(): pg.locator('.pzs-ouvrir-tambour').click()
        pg.wait_for_timeout(40)
        ok(pg.evaluate("() => getComputedStyle(document.querySelector('.pzt-bois')).borderTopLeftRadius") == '50%' and pg.evaluate("() => document.querySelector('.pzt').classList.contains('pzt-ouvert')"), 'mouvement réduit : le tambour est là tout de suite, sans animation')
        pg.locator(f'{MENU} [data-mode="retracter"]').click(); pg.wait_for_timeout(60); ok(pg.locator('.pzt').count() == 0, 'mouvement réduit : le retour aussi est instantané')
        ctx.close()

        # —— toutes les tailles d'écran ——
        for (l, h, mob) in [(320, 568, True), (360, 740, True), (390, 844, True), (430, 932, True), (768, 1024, True), (1024, 768, False), (844, 390, True), (1024, 1366, True)]:
            ctx, pg = page(b, l, h, mobile=mob)
            ouvrir(pg); g = geom_ok(pg, f'{l} × {h}')
            if g['etiq'] == 'cartouche':
                pg.locator(f'{MENU} [role=menuitem]').nth(2).focus(); pg.wait_for_timeout(150)
                ok(len(pg.locator('.pzt-cartouche b').text_content() or '') > 1, f'{l} × {h} : le nom de la commande visée s’affiche dans le cartouche')
            if l in (390, 1024) and h in (844, 768): cap(pg, f'4-{l}x{h}')
            pg.locator(f'{MENU} [data-mode="points"], {MENU} [data-mode="creer"]').first.click(); pg.wait_for_timeout(250); geom_ok(pg, f'{l} × {h}, niveau Points')
            ok(pg.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'{l} × {h} : pas de défilement horizontal')
            ctx.close()

        # —— un seul système de messages (mobile) : jamais deux messages l'un sur l'autre, ni sur le disque ou le dock ——
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True, reduced_motion='reduce')
        ctx.add_init_script("localStorage.setItem('pointzero:visite-docks:v1', 'vue'); localStorage.setItem('pointzero:essai:cadre-tambour', '1'); localStorage.setItem('pointzero:disque:presentation', 'disque')")
        pg = ctx.new_page(); pg.on('pageerror', lambda e: erreurs.append(str(e)))
        pg.goto(B + '/atelier?offerte=5D-12342.g21.v0.1'); pg.wait_for_selector('.toast-in', timeout=20000); pg.wait_for_timeout(300)
        RECT = "s => { const e = document.querySelector(s); if (!e || getComputedStyle(e).visibility === 'hidden') return null; const r = e.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; }"
        inter = lambda a, c: a and c and a[0] < c[2] and c[0] < a[2] and a[1] < c[3] and c[1] < a[3]
        ok(not inter(pg.evaluate(RECT, '.toast-in'), pg.evaluate(RECT, '.pzs-bottom')), 'mobile : la notification ne recouvre pas le dock du bas')
        if not pg.locator('.pzt').count(): pg.locator('.pzs-ouvrir-tambour').tap()
        pg.wait_for_timeout(500)
        t, c = pg.evaluate(RECT, '.toast-in'), pg.evaluate(RECT, '.pzt-cartouche')
        disque = pg.evaluate("() => { const s = getComputedStyle(document.querySelector('.pzt')), v = k => parseFloat(s.getPropertyValue(k)); return [v('--pzt-x') - v('--pzt-ro'), v('--pzt-y') - v('--pzt-ro'), v('--pzt-x') + v('--pzt-ro'), v('--pzt-y') + v('--pzt-ro')]; }")
        ok(t is not None and c is None and not inter(t, disque) and t[3] <= 844, 'Tambour (mobile) : la notification prend la place du cartouche, sous le disque, sans chevauchement')
        cap(pg, '8-messages'); ctx.close()

        # —— zoom 200 % (1440 px vu à 200 % = 720 × 450), texte agrandi au maximum du Confort, thème Nuit ——
        ctx, pg = page(b, 720, 450, dsf=2); ouvrir(pg); geom_ok(pg, 'zoom 200 % (720 × 450)'); cap(pg, '5-zoom200'); ctx.close()
        TEXTE = "; localStorage.setItem('pointzero:accessibility:v1', JSON.stringify({version:1,theme:'system',vision:'standard',fontScale:1.75,lineHeight:1.5,spacing:0,contrast:'normal',reduceMotion:true,enhancedFocus:false,readingGuide:false,privacyBlur:false,accent:'#7562ce'}))"
        ctx, pg = page(b, 1440, 900, script=TEXTE); ouvrir(pg)
        ok(pg.evaluate("parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pz-user-font-scale'))") >= 1.75, 'texte agrandi (Confort, 175 %) : bien appliqué')
        geom_ok(pg, 'texte à 175 %'); cap(pg, '6-texte'); ctx.close()
        ctx, pg = page(b, 390, 844, mobile=True, script=TEXTE); ouvrir(pg); geom_ok(pg, '390 px, texte à 175 %'); ctx.close()
        ctx, pg = page(b, 1440, 900, script="; localStorage.setItem('pointzero:aime-studio', 'nuit')")
        pg.goto(B + '/atelier?aime=nuit'); pg.wait_for_selector('.cadre[data-pret]', timeout=20000); pg.wait_for_timeout(1200)
        ouvrir(pg); ok(pg.evaluate("document.documentElement.dataset.aimeStudio") == 'nuit', 'thème Nuit'); geom_ok(pg, 'Nuit'); cap(pg, '7-nuit'); ctx.close()
    finally:
        b.close()
ok(not erreurs, 'aucune erreur de page ' + str(erreurs[:3]))
n = sum(res); print(f'— {n}/{len(res)}'); raise SystemExit(0 if n == len(res) else 1)
