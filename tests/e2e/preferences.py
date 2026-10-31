"""Les préférences du Point dans le compte, de bout en bout, sur la branche Neon de TEST (tests/e2e/serveur-bureau.mjs).
Deux appareils (deux contextes de navigateur), un même compte de test : rien n'est envoyé sans le premier choix,
le second appareil demande avant de changer quoi que ce soit, les changements suivants partent tout seuls,
et une écriture fondée sur une version dépassée n'écrase jamais le compte.
Usage : serveur-bureau.mjs lancé (PORT 8790), puis  python3 tests/e2e/preferences.py   (CAPTURES=<dossier>)"""
import json, os, urllib.request
from playwright.sync_api import sync_playwright

B = os.environ.get('BASE', 'http://localhost:8790'); CAP = os.environ.get('CAPTURES')
EMAIL = 'preferences@test.lemondeaime.invalid'
res = []
def ok(c, t): res.append((bool(c), t)); print(('OK ' if c else 'ÉCHEC ') + t, flush=True)
def lien(email): return json.load(urllib.request.urlopen(B + '/__test/lien?email=' + email))['lien']
def connecter(ctx):
    pg = ctx.new_page(); pg.goto(B + '/studio/bureau'); pg.wait_for_selector('#bu-email', timeout=20000)
    pg.fill('#bu-email', EMAIL); pg.get_by_role('button', name='Recevoir le lien').click()
    pg.wait_for_selector('text=Un lien de connexion vient de partir', timeout=20000)
    pg.goto(lien(EMAIL)); pg.wait_for_timeout(800); return pg
def atelier(pg, reglages=None):
    pg.goto(B + '/studio/atelier'); pg.wait_for_timeout(300)
    pg.evaluate("r => { localStorage.setItem('pointzero:visite-docks:v1', 'vue'); if (r) for (const [k, v] of Object.entries(r)) localStorage.setItem(k, v); }", reglages)
    pg.reload(); pg.wait_for_selector('.lp-point', timeout=20000); pg.wait_for_timeout(600)
def mes_ouvrages(pg):
    pg.get_by_role('button', name='Ouvrages').first.click(); pg.wait_for_selector('.pzs-prefs', timeout=15000); pg.wait_for_timeout(500)
    return pg.locator('.pzs-prefs').inner_text()
def compte(pg): return pg.evaluate("() => fetch('/api/preferences', { credentials: 'same-origin' }).then(r => r.json())")
CONFORT_LECTURE = json.dumps({"version": 1, "theme": "system", "vision": "standard", "fontScale": 1.25, "lineHeight": 1.8, "spacing": 0, "contrast": "normal", "reduceMotion": False, "enhancedFocus": True, "readingGuide": False, "privacyBlur": False, "accent": "#7562ce"})
LECTURE = {'pointzero:accessibility:v1': CONFORT_LECTURE, 'pointzero:interface-level': 'intermediate', 'pointzero:point:presentation': 'liste', 'pointzero:profil:v1': 'lecture'}

with sync_playwright() as p:
    b = p.chromium.launch()
    try:
        # — appareil A : ses préférences restent locales jusqu'au premier choix —
        a = b.new_context(viewport={'width': 1440, 'height': 900}); pa = connecter(a); atelier(pa, LECTURE)
        ok(compte(pa).get('preferences') is None, 'au départ, le compte n’a aucune préférence (rien n’est parti tout seul)')
        t = mes_ouvrages(pa)
        ok('sur cet appareil seulement' in t and 'Lecture confortable' in t, 'Mes ouvrages : « sur cet appareil seulement », avec le profil')
        pa.get_by_role('button', name='Enregistrer sur mon compte').click(); pa.wait_for_timeout(1200)
        c = compte(pa)
        ok(c['preferences'] and c['preferences']['profil'] == 'lecture' and c['preferences']['confort']['fontScale'] == 1.25, 'Enregistrer : le compte a le profil Lecture confortable')
        if CAP: pa.screenshot(path=f'{CAP}/preferences-a.png')

        # — appareil B : d'autres réglages ; il demande, et ne change rien sans choix —
        bb = b.new_context(viewport={'width': 1440, 'height': 900}); pb = connecter(bb); atelier(pb, {'pointzero:interface-level': 'expert', 'pointzero:profil:v1': 'experte'})
        t = mes_ouvrages(pb)
        ok('Votre compte a d’autres préférences' in t and 'Rien n’est changé sans votre choix' in t, 'appareil B : le choix est proposé')
        ok(pb.evaluate("localStorage.getItem('pointzero:interface-level')") == 'expert', 'appareil B : rien n’a changé avant le choix')
        if CAP: pb.screenshot(path=f'{CAP}/preferences-b-choix.png')
        pb.get_by_role('button', name='Utiliser celles du compte').click(); pb.wait_for_timeout(800)
        ok(pb.evaluate("localStorage.getItem('pointzero:interface-level')") == 'intermediate' and pb.evaluate("JSON.parse(localStorage.getItem('pointzero:accessibility:v1')).fontScale") == 1.25,
           'appareil B : « Utiliser celles du compte » applique Lecture confortable')

        # — appareil B change de profil : le changement part tout seul —
        pb.locator('.lp-point').first.click(); pb.wait_for_timeout(300); pb.locator('[data-presentation] [data-mode=confort]').click(); pb.wait_for_timeout(400)
        pb.locator('.lp-panneau label', has_text='Débutante').locator('input').check(); pb.wait_for_timeout(3200)
        ok(compte(pb)['preferences']['profil'] == 'debutante', 'appareil B : un nouveau profil part tout seul vers le compte (2 s après)')

        # — appareil A, resté sur l'ancienne version : son changement est refusé, le compte n'est pas écrasé —
        atelier(pa)
        pa.locator('.lp-point').first.click(); pa.wait_for_timeout(300); pa.locator('[data-presentation] [data-mode=confort]').click(); pa.wait_for_timeout(400)
        pa.locator('.lp-panneau label', has_text='Experte').locator('input').check(); pa.wait_for_timeout(3200)
        ok(compte(pa)['preferences']['profil'] == 'debutante', 'appareil A (version dépassée) : le compte n’est pas écrasé')
        pa.keyboard.press('Escape'); t = mes_ouvrages(pa)
        ok('Votre compte a d’autres préférences' in t, 'appareil A : le choix est proposé à la place')
        if CAP: pa.screenshot(path=f'{CAP}/preferences-a-conflit.png')
    finally:
        print('ménage :', urllib.request.urlopen(B + '/__test/menage').read().decode())
        b.close()
n = sum(1 for r in res if r[0]); print(f'— {n}/{len(res)}'); raise SystemExit(0 if n == len(res) else 1)
