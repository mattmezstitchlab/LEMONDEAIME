"""LES DEUX DOCKS, vérifications ergonomiques (lot 1) — navigateur mobile ÉMULÉ (Chromium, tactile, 390 / 360 / 320 px) et ordinateur.
Ce n'est pas un iPhone réel : WebKit n'est pas disponible ici. Ce qui est prouvé : géométrie, focus, clavier, superpositions, mouvement réduit, Mon confort.
Ce qui reste à voir sur un vrai iPhone : le comportement exact du clavier iOS (la fenêtre visuelle rétrécit sans que la fenêtre de mise en page change) et la barre d'adresse de Safari.
Usage : npm run build && npx vite preview --port 4610, puis  python3 tests/e2e/docks-ergo.py     Captures : CAPTURES=<dossier>"""
import json, os, struct, tempfile, wave
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

B = os.environ.get('BASE', 'http://localhost:4610'); CAP = os.environ.get('CAPTURES')
resultats, erreurs = [], []
def ok(c, nom, detail=''):
    print(('OK ' if c else 'ÉCHEC ') + nom + (' — ' + str(detail) if detail and not c else ''), flush=True); resultats.append(bool(c))
def simuler(pg):
    def api(route):
        u = urlparse(route.request.url)
        route.fulfill(status=200, content_type='application/json', body='null' if u.path == '/api/auth/get-session' else json.dumps({'ok': False}))
    pg.route('**/api/**', api)
def page(b, l, h=844, calme=True):
    mob = l < 700
    c = b.new_context(viewport={'width': l, 'height': h}, reduced_motion='reduce' if calme else 'no-preference', has_touch=mob, is_mobile=mob, device_scale_factor=2 if mob else 1)
    pg = c.new_page(); pg.set_default_timeout(6000); pg.on('pageerror', lambda e: erreurs.append(str(e))); simuler(pg); return pg
def rect(pg, sel):
    return pg.evaluate("(s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return {x: r.x, y: r.y, w: r.width, h: r.height, r: r.right, b: r.bottom}; }", sel)
def croise(a, b): return a and b and a['x'] < b['r'] - 1 and b['x'] < a['r'] - 1 and a['y'] < b['b'] - 1 and b['y'] < a['b'] - 1
def wav():
    f = os.path.join(tempfile.mkdtemp(), 'essai.wav')
    with wave.open(f, 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(8000); w.writeframes(struct.pack('<h', 0) * 8000 * 3)
    return f

with sync_playwright() as p:
    b = p.chromium.launch()
    # 1 · dock du haut avec et sans bouton Retour, de 320 à 390 px
    for l in (390, 360, 320):
        pg = page(b, l)
        for chemin, retour in (('/', False), ('/reseau', True)):
            t = '[%d px] %s : ' % (l, chemin); pg.goto(B + chemin); pg.wait_for_selector('.dock-haut'); pg.wait_for_timeout(250)
            ok((pg.locator('.dock-haut button[aria-label^="Revenir"]').count() == 1) == retour, t + ('avec' if retour else 'sans') + ' bouton Retour')
            tout = pg.evaluate("[...document.querySelectorAll('.dock-ligne > :is(button, a)')].filter(e => e.offsetParent).map(e => { const r = e.getBoundingClientRect(); return [e.className.split(' ').pop(), Math.round(r.x), Math.round(r.right), Math.round(r.width), Math.round(r.height)]; })")
            ok(all(x[2] <= l - 4 for x in tout) and all(x[3] >= 44 and x[4] >= 44 for x in tout), t + 'tous les boutons entiers dans l’écran et >= 44 px', tout)
            ok(pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), t + 'aucun débordement horizontal')
        pg.context.close()
    # 2 · menu : ouverture, fermeture (voile, Échap, choix), clavier, focus
    pg = page(b, 390); pg.goto(B + '/reseau'); pg.wait_for_selector('.menu-mobile')
    m = pg.locator('.menu-mobile'); m.tap(); pg.wait_for_selector('.bloc-entrees')
    ok(m.get_attribute('aria-expanded') == 'true' and m.get_attribute('aria-controls') == 'bloc-dock', '[menu] ouvert au toucher, aria-expanded et aria-controls justes')
    ok(pg.evaluate("document.activeElement.closest('.bloc-entrees') !== null"), '[menu] le focus entre dans le menu')
    pg.keyboard.press('Tab'); pg.keyboard.press('Tab'); pg.keyboard.press('Tab'); pg.keyboard.press('Tab')
    ok(pg.evaluate("document.activeElement.closest('.dock-bloc') !== null"), '[menu] Tab reste dans le volet tant qu’il est ouvert (quatre entrées puis le mini dock)')
    pg.keyboard.press('Escape'); pg.wait_for_selector('.bloc-entrees', state='detached')
    ok(pg.evaluate("document.activeElement.classList.contains('menu-mobile')"), '[menu] Échap referme et rend le focus au bouton Menu')
    m.tap(); pg.wait_for_selector('.bloc-entrees'); pg.mouse.click(200, 700); pg.wait_for_selector('.bloc-entrees', state='detached')
    ok(True, '[menu] toucher en dehors referme le menu')
    m.focus(); pg.keyboard.press('Enter'); pg.keyboard.press('ArrowDown') if False else None
    pg.locator('.bloc-entrees a', has_text='Mes projets').focus(); pg.keyboard.press('Enter'); pg.wait_for_url('**/buro')
    ok(pg.locator('.bloc-entrees').count() == 0 and pg.evaluate("document.querySelector('.menu-mobile').getAttribute('aria-expanded')") == 'false', '[menu] choisir une entrée au clavier : on change de page, le menu est refermé')
    pg.context.close()
    # 3 · dock du bas sur les pages longues : marge, ancre, jamais sur le contenu
    pg = page(b, 390)
    for chemin in ('/aime-wedding', '/projets', '/musique'):
        t = '[longue] ' + chemin + ' : '; pg.goto(B + chemin); pg.wait_for_selector('.dock-bas'); pg.wait_for_timeout(300)
        dock = rect(pg, '.dock-bas > div'); ok(dock and dock['b'] <= 844 - 8, t + 'le dock du bas tient dans l’écran avec sa marge', dock)
        pg.evaluate("window.scrollTo(0, document.documentElement.scrollHeight)"); pg.wait_for_timeout(400)
        dock = rect(pg, '.dock-bas > div'); dernier = pg.evaluate("(() => { const e = document.querySelector('.pied .bas'); const r = e.getBoundingClientRect(); return {y: r.y, b: r.bottom, x: r.x, r: r.right, w: r.width, h: r.height}; })()")
        ok(dernier['b'] <= dock['y'] - 8, t + 'en bas de page, la dernière ligne du pied n’est pas recouverte par le dock', (dernier, dock))
        pg.evaluate("window.scrollTo(0, 0)")
    pg.goto(B + '/projets'); pg.wait_for_selector('.dock-bas'); pg.locator('.dock-bas a.lieu', has_text='Fondateur').click(); pg.wait_for_timeout(700)
    h2 = pg.evaluate("document.querySelector('#fondateur').getBoundingClientRect().top"); haut = rect(pg, '.dock-haut')
    ok(h2 >= haut['b'] - 4, '[longue] /projets : une ancre du dock du bas amène la section sous le dock du haut, pas dessous', (h2, haut['b']))
    pg.context.close()
    # 4 · clavier iOS ouvert (émulation : fenêtre réduite) : le champ reste visible et libre
    pg = page(b, 390); pg.goto(B + '/'); pg.wait_for_selector('.ac-details'); pg.locator('.ac-details > summary').click(); pg.wait_for_selector('#q')
    pg.set_viewport_size({'width': 390, 'height': 440}); pg.locator('#q').focus(); pg.wait_for_timeout(500)
    q = rect(pg, '#q'); dock = rect(pg, '.dock-bas > div'); haut = rect(pg, '.dock-haut')
    ok(q and q['y'] >= 0 and q['b'] <= 440, '[clavier] le champ de la question est entièrement visible avec un clavier ouvert', q)
    ok(not croise(q, dock) and not croise(q, haut), '[clavier] ni le dock du bas ni le dock du haut ne recouvrent le champ', (q, dock, haut))
    pg.locator('.dock-haut .loupe').tap(); pg.wait_for_selector('#bloc-dock'); pg.wait_for_timeout(300)
    champ = rect(pg, '#bloc-dock input'); ok(champ and champ['b'] <= 440 and champ['y'] >= 0, '[clavier] la recherche du dock du haut reste utilisable dans une fenêtre réduite', champ)
    pg.context.close()
    # 5 · superpositions avec l'orbe flottante, y compris lecteur chargé (dock élargi)
    for l in (390, 1440):
        pg = page(b, l)
        pg.goto(B + '/musique'); pg.wait_for_selector('.orbe-dock'); pg.locator('.orbe-dock').click(); pg.get_by_role('button', name='Musique').click()
        pg.locator('input[type=file]').set_input_files(wav()); pg.wait_for_timeout(500)
        for chemin in ('/musique', '/', '/aime-wedding', '/projets', '/reseau', '/point-zero'):
            pg.evaluate("(c) => { history.pushState({n:1}, '', c); window.dispatchEvent(new PopStateEvent('popstate')); }", chemin); pg.wait_for_timeout(450)
            orbe = rect(pg, '.cv-nav-bouton'); dock = rect(pg, '.dock-bas > div'); haut = rect(pg, '.dock-haut')
            ok(orbe is not None, '[%d px] %s : l’orbe flottante est présente' % (l, chemin))
            ok(not croise(orbe, dock) and not croise(orbe, haut), '[%d px] %s : l’orbe flottante ne recouvre ni le dock du bas ni celui du haut' % (l, chemin), (orbe, dock))
            ok(dock is None or dock['r'] <= (orbe['x'] if l < 700 else l) + 1, '[%d px] %s : le dock du bas (lecteur chargé) s’arrête avant l’orbe' % (l, chemin), (dock, orbe))
        if CAP and l < 700: os.makedirs(CAP, exist_ok=True); pg.screenshot(path=os.path.join(CAP, 'ergo-lecteur-orbe.png'))
        pg.context.close()
    # 6 · Mon confort et mouvement réduit conservés
    pg = page(b, 390, calme=False); pg.goto(B + '/projets'); pg.wait_for_selector('.carre-orbe')
    ok(pg.evaluate("!document.documentElement.classList.contains('calme')"), '[confort] sans préférence, le mouvement n’est pas réduit')
    pg.locator('.carre-orbe').tap(); pg.wait_for_selector('.mini-dock'); pg.get_by_role('button', name='Mon confort : régler chaque détail').tap(); pg.wait_for_timeout(200)
    pg.locator('.reglage', has_text='').first.tap() if False else None
    mv = pg.locator('button.reglage[aria-label^="Mouvement"]'); ok(mv.count() == 1, '[confort] le réglage « Mouvement » est toujours là')
    mv.tap(); pg.wait_for_timeout(200)
    ok(pg.evaluate("document.documentElement.classList.contains('calme')"), '[confort] « Mouvement réduit » s’applique (html.calme)')
    pg.keyboard.press('Escape'); pg.locator('.menu-mobile').tap(); pg.wait_for_selector('.bloc-entrees')
    ok(pg.evaluate("[...document.querySelectorAll('.bloc-entrees, .dock-bloc')].every(e => getComputedStyle(e).transitionDuration === '0s' || getComputedStyle(e).transitionDuration === '')"), '[confort] mouvement réduit : le menu s’ouvre sans transition')
    pg.keyboard.press('Escape')
    for k in ('Contraste', 'Texte', 'Sons'):
        pass
    ok(pg.locator('.carre-orbe').count() == 1 and pg.locator('.loupe').count() == 1 and pg.locator('.profil').count() == 1, '[confort] orbe, recherche et profil toujours là')
    pg.context.close()
    # 7 · ordinateur : le dock du haut a les quatre entrées visibles, sans Menu
    pg = page(b, 1440); pg.goto(B + '/reseau'); pg.wait_for_selector('.dock-haut')
    ok(not pg.locator('.menu-mobile').is_visible() and pg.locator('.dock-haut .rangee a.outil:visible').count() == 4, '[ordinateur] quatre entrées visibles, pas de bouton Menu')
    b.close()
ok(not erreurs, 'aucune erreur de page', erreurs[:3])
print('%d/%d contrôles réussis' % (sum(resultats), len(resultats))); raise SystemExit(0 if all(resultats) else 1)
