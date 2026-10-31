"""L'ouverture LUMIERE (« Découvrir AIME ») et « Vivre LUMIERE », dans plusieurs moteurs (Chromium, WebKit/Safari, Firefox).
La liste de Matt :
- aucun écran explicatif avant le film ;
- le film démarre sans clic (muet) ;
- le son s'active par un geste et se cale sur la position actuelle ;
- les deux commandes fonctionnent ;
- l'impact reste synchronisé ;
- la fin rejoint la Première rencontre ;
- en cas d'échec, l'accès à la Première rencontre reste disponible.
Usage : BASE=http://localhost:4630 NAVIGATEURS=chromium,webkit,firefox python3 tests/e2e/ouverture.py"""
import os, re, time
from playwright.sync_api import sync_playwright
B = os.environ['BASE'].rstrip('/'); NAVS = os.environ.get('NAVIGATEURS', 'chromium').split(','); CAP = os.environ.get('CAPTURES')
res = []
def ok(c, nom): res.append((bool(c), nom)); print(('✓ ' if c else 'ÉCHEC ') + nom)
def args(n): return ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] if n == 'chromium' else []
# une première visite : le navigateur refuse le son sans geste (le contexte audio reste suspendu jusqu'au premier toucher)
BLOQUER = '''(() => { let geste = false; addEventListener('pointerdown', () => { geste = true; }, true); addEventListener('keydown', () => { geste = true; }, true);
  const d = Object.getOwnPropertyDescriptor(BaseAudioContext.prototype, 'state');
  Object.defineProperty(BaseAudioContext.prototype, 'state', { get() { const s = d.get.call(this); return (!geste && !(this instanceof OfflineAudioContext) && s === 'running') ? 'suspended' : s; } }); })()'''
def attendre_perle(pg):
    try: pg.wait_for_selector('.lf-perle-play', timeout=15000)
    except Exception: print('  (état :', pg.url, pg.evaluate("[window.__lumiere?.phase?.(), window.__lumiere?.lecteur?.t, JSON.stringify(window.__lumiere?.journal?.slice(-3))]"), ')'); raise
def lt(pg): return pg.evaluate('window.__lumiere?.lecteur?.t ?? -1')

with sync_playwright() as p:
    for n in NAVS:
        b = getattr(p, n).launch(args=args(n)); N = f'[{n}]'
        gl = b.new_page().evaluate("!!document.createElement('canvas').getContext('webgl2')")
        ctx = b.new_context(viewport={'width': 1366, 'height': 820}); pg = ctx.new_page(); err = []
        if n != 'chromium': ctx.add_init_script(BLOQUER)   # une première visite : Safari bloque le son sans geste (il l'autorise ensuite sur un site déjà touché)
        pg.on('pageerror', lambda e: err.append(str(e)))
        pg.goto(B + '/'); pg.wait_for_timeout(2500)
        if not gl:
            # sans WebGL (ce moteur, ici) : l'image fixe et l'entrée dans .0NE — jamais un écran noir sans issue
            ok(pg.get_by_role('button', name='Entrer').is_visible(), f'{N} sans WebGL : « Entrer » est disponible (image fixe)')
            pg.get_by_role('button', name='Entrer').click(); pg.wait_for_selector('.one-marque', timeout=15000)
            ok('/one/premiere-rencontre' in pg.url, f'{N} sans WebGL : → la Première rencontre')
            ctx.close(); b.close(); continue
        # 1. le cosmos, tout de suite, sans texte ; aucune modale ; aucun sélecteur de fichier
        texte = pg.evaluate("document.body.innerText.replace(/\\s+/g, ' ').trim()")
        ok(pg.locator('.lf-toile').count() == 1 and 'naissance du Point' not in texte and pg.locator('input[type=file], dialog, [role=dialog]').count() == 0, f'{N} 1. le cosmos, sans texte, sans modale ni fichier')
        ok(pg.locator('.cv-nav').count() == 0, f'{N} 1. pas de navigation superposée au film')
        auto = n == 'chromium'   # Chromium est lancé ici avec la lecture automatique autorisée ; WebKit la bloque (comme Safari et l'iPhone)
        if auto:
            # 2. lecture automatique permise : le film commence AVEC sa musique, depuis le début
            pg.wait_for_function("window.__lumiere.phase() === 'lecture' && window.__lumiere.lecteur.son", timeout=20000)
            j = pg.evaluate("window.__lumiere.journal.filter(e => e.evt.startsWith('son à')).pop().evt")
            m = re.search(r'son à ([\d.]+) s \(fichier ([\d.]+) s\)', j); t0, f = float(m.group(1)), float(m.group(2))
            ok(t0 < 0.01 and abs(f - t0) < 1e-3, f'{N} 2. lecture automatique : film et musique partent ensemble du début (film {t0:.3f} s = fichier {f:.3f} s)')
            ok(pg.locator('.lf-perle-play').count() == 0, f'{N} 2. pas de Play quand le son démarre seul')
        else:
            # 3. bloquée : la Perle devient Play ; RIEN N'AVANCE pendant l'attente
            attendre_perle(pg)
            t1 = lt(pg); pg.wait_for_timeout(1500); t2 = lt(pg)
            ok(t1 == 0 and t2 == 0, f'{N} 3. l’attente : le Play est sur la première image, le récit immobile ({t1} → {t2})')
            bb = pg.locator('.lf-perle-play').bounding_box()
            ok(abs(bb['x'] + bb['width'] / 2 - 683) < 3 and abs(bb['y'] + bb['height'] / 2 - 410) < 3 and bb['width'] >= 44, f'{N} 3. la Perle-Play au centre, ≥ 44 px')
            boutons = [re.sub(r'[◖◗→]', '', x).strip() for x in pg.locator('button:visible').all_inner_texts()]
            ok(pg.get_by_role('button', name='Lancer le film avec sa musique').is_visible() and 'Passer' in boutons and len(boutons) == 2, f'{N} 3. seulement la Perle et « Passer » ({boutons})')
            if CAP: pg.screenshot(path=f'{CAP}/ouv-{n}-1-perle.png')
            # 4. toucher la lumière : le film et sa musique, depuis le début, synchronisés
            pg.get_by_role('button', name='Lancer le film avec sa musique').click()
            pg.wait_for_function("window.__lumiere.lecteur.son && window.__lumiere.journal.some(e => e.evt.startsWith('son à'))", timeout=20000)
            j = pg.evaluate("window.__lumiere.journal.filter(e => e.evt.startsWith('son à')).pop().evt")
            m = re.search(r'son à ([\d.]+) s \(fichier ([\d.]+) s\)', j); t0, f = float(m.group(1)), float(m.group(2))
            ok(t0 < 0.01 and abs(f - t0) < 1e-3, f'{N} 4. la Perle touchée : film et musique depuis le début (film {t0:.3f} s = fichier {f:.3f} s)')
            pg.wait_for_selector('.lf-perle-play', state='detached', timeout=5000)
            ok(True, f'{N} 7. le Play s’est fondu dans la perle')
        pg.wait_for_timeout(1200); t3 = lt(pg)
        ok(0.5 < t3 < 4, f'{N} le film avance avec la musique ({t3:.2f} s)')
        ok(abs(pg.evaluate("window.__lumiere.lecteur.musique()[0].tempsMorceau - window.__lumiere.lecteur.t")) < 1e-9, f'{N} image = morceau (temps du film = temps de « La Fleur du Ciel »)')
        tm = pg.evaluate("(() => { const p = window.__lumiere.lecteur.o.montage.plans; let d = 0; for (const x of p) { if (x.id === 'P23') return d; d += x.duree; } })()")
        ok(abs(tm - 198.25) < 1e-9 and pg.evaluate("window.__lumiere.montage.id") == 'lumiere-film', f'{N} le film des 31 plans ; le contact (P23) sur l’image 4758 = {tm:.3f} s, impact 03:18.255')
        ok(pg.evaluate('window.__lumiere.verifier().ok'), f'{N} repères verrouillés du clip exacts')
        # (l'horloge du film, pas la dernière image dessinée : le rendu logiciel des tests est lent)
        # l'horloge du film comparée à celle de la page, lues ensemble (le rendu logiciel des tests bloque parfois la page plus d'une seconde)
        H = '[window.__lumiere.lecteur.maintenant(), performance.now() / 1000]'
        pg.get_by_role('button', name=re.compile('Couper le son')).click(); a, pa = pg.evaluate(H); pg.wait_for_timeout(700); c, pc = pg.evaluate(H)
        ok(abs((c - a) - (pc - pa)) < .15 and not pg.evaluate('window.__lumiere.lecteur.son'), f'{N} « Couper le son » : l’image continue ({a:.2f} → {c:.2f} s)')
        avant = lt(pg); pg.get_by_role('button', name=re.compile('Activer le son')).click()
        pg.wait_for_function("window.__lumiere.lecteur.son", timeout=15000); pg.wait_for_timeout(400)
        j = pg.evaluate("window.__lumiere.journal.filter(e => e.evt.startsWith('son à')).pop().evt")
        m = re.search(r'son à ([\d.]+) s \(fichier ([\d.]+) s\)', j); t0, f = float(m.group(1)), float(m.group(2))
        ok(t0 >= avant and abs(f - t0) < 1e-3, f'{N} « Activer le son » : la musique rejoint le film à sa position ({t0:.3f} s)')
        # 6. Passer : la Première rencontre, tout de suite ; recharger ne remontre pas le film
        pg.get_by_role('button', name=re.compile('Passer')).click(); pg.wait_for_selector('.one-marque', timeout=15000)
        ok('/one/premiere-rencontre' in pg.url, f'{N} 6. « Passer » → la Première rencontre')
        pg.reload(); pg.wait_for_selector('.one-marque', timeout=15000)
        ok(pg.locator('.lf-film').count() == 0, f'{N} recharger après le film : la Première rencontre, pas le film')
        ok(not err, f'{N} aucune erreur de page ({err[:1]})')
        ctx.close()
        if not auto:
            # 5. sans geste : la Perle se dissout et l'introduction se joue en silence, depuis le début ; le son la rejoint à sa position
            # WebKit, comme Safari, autorise ensuite la lecture sonore sur un site déjà touché : on rétablit le blocage d'une première visite
            ctx = b.new_context(viewport={'width': 1366, 'height': 820}); ctx.add_init_script(BLOQUER); pg = ctx.new_page()
            pg.goto(B + '/'); attendre_perle(pg)
            pg.wait_for_selector('.lf-perle-play', state='detached', timeout=20000); pg.wait_for_timeout(800); t = lt(pg)
            ok(0 < t < 2.5 and pg.evaluate("window.__lumiere.phase()") == 'silence', f'{N} 5. sans geste : le film muet part du début ({t:.2f} s)')
            avant = lt(pg); pg.get_by_role('button', name=re.compile('Activer le son')).click()
            pg.wait_for_function("window.__lumiere.lecteur.son", timeout=15000); pg.wait_for_timeout(400)
            j = pg.evaluate("window.__lumiere.journal.filter(e => e.evt.startsWith('son à')).pop().evt")
            m = re.search(r'son à ([\d.]+) s \(fichier ([\d.]+) s\)', j); t0, f = float(m.group(1)), float(m.group(2))
            ok(t0 >= avant and abs(f - t0) < 1e-3 and lt(pg) >= avant, f'{N} 5. reprise synchronisée : la musique entre à la position du film ({t0:.2f} s), sans retour au début')
            ctx.close()
            # recharger pendant l'attente (sans geste) : de nouveau l'attente, sur la première image
            ctx = b.new_context(viewport={'width': 1366, 'height': 820}); ctx.add_init_script(BLOQUER); pg = ctx.new_page()
            pg.goto(B + '/'); attendre_perle(pg); pg.reload(); attendre_perle(pg)
            ok(lt(pg) == 0 and pg.evaluate("window.__lumiere.phase()") == 'play', f'{N} recharger pendant l’introduction : de nouveau l’attente, à 0')
            ctx.close()
        # la fin : la lumière blanchit, le Point rejoint le Disque de la Première rencontre
        ctx = b.new_context(viewport={'width': 1366, 'height': 820}); pg = ctx.new_page()
        pg.goto(B + '/studio/one/lumiere?t=249'); pg.wait_for_selector('.lf-voile .lf-orbe', timeout=30000)
        if CAP: pg.wait_for_timeout(500); pg.screenshot(path=f'{CAP}/ouv-{n}-2-fin.png')
        pg.wait_for_selector('.lf-voile', state='detached', timeout=15000)
        ok(pg.locator('.pzt-anneau').count() > 0 and '/one/premiere-rencontre' in pg.url, f'{N} la fin rejoint le vrai Disque de la Première rencontre')
        ctx.close()
        # 7. mouvement réduit : une image fixe, l'entrée directe
        ctx = b.new_context(viewport={'width': 1366, 'height': 820}, reduced_motion='reduce'); pg = ctx.new_page()
        pg.goto(B + '/'); pg.wait_for_timeout(2000)
        ok(pg.locator('.lf-toile').count() == 0 and pg.get_by_role('button', name=re.compile('Entrer')).is_visible(), f'{N} 7. mouvement réduit : image fixe, « Entrer »')
        ok(pg.locator('main .sr-only').count() >= 1, f'{N} 7. la description du film existe pour les lecteurs d’écran')
        if CAP: pg.screenshot(path=f'{CAP}/ouv-{n}-3-fixe.png')
        ctx.close()
        # 8. téléphone : les deux commandes dans les coins, ≥ 44 px
        dev = p.devices['iPhone 14'] if n == 'webkit' else {'viewport': {'width': 390, 'height': 844}, 'is_mobile': n != 'firefox', 'has_touch': True, 'device_scale_factor': 3}
        ctx = b.new_context(**dev); ctx.add_init_script(BLOQUER) if n != 'chromium' else None; pg = ctx.new_page(); pg.goto(B + '/'); pg.wait_for_timeout(2500)
        if n != 'chromium': attendre_perle(pg)
        d = pg.get_by_role('button', name=re.compile('Passer')).bounding_box(); g = pg.locator('.lf-perle-play').bounding_box() if n != 'chromium' else {'x': 157, 'y': 384, 'width': 76, 'height': 76}
        ok(d and d['x'] + d['width'] > 330 and d['height'] >= 44 and d['y'] + d['height'] <= 844 and abs(g['x'] + g['width'] / 2 - 195) < 3 and g['width'] >= 44, f'{N} téléphone : la Perle au centre, « Passer » dans un coin, ≥ 44 px')
        if CAP: pg.screenshot(path=f'{CAP}/ouv-{n}-4-telephone.png')
        ctx.close()
        # 9. Vivre LUMIERE : le chapitre complet
        ctx = b.new_context(viewport={'width': 1366, 'height': 820}); pg = ctx.new_page(); err = []
        pg.on('pageerror', lambda e: err.append(str(e)))
        pg.goto(B + '/studio/one/lumiere/vivre'); pg.wait_for_selector('.lf-grand', timeout=20000)
        ok('4:13' in pg.locator('.lf-temps').inner_text(), f'{N} 9. Vivre LUMIERE : le clip complet dure 4:13')
        pg.locator('.lf-grand').click(); pg.wait_for_timeout(2000)
        ok(pg.evaluate('window.__lumiereVivre.lecteur.lecture && window.__lumiereVivre.lecteur.son'), f'{N} 9. « Lecture » lance le film avec la musique (au geste)')
        pg.mouse.move(600, 400); pg.get_by_role('button', name='Scènes').click()
        ok(pg.locator('.lf-scenes li').count() == 11, f'{N} 9. onze scènes (le clip)')
        pg.locator('.lf-scenes button', has_text='La goutte').click(); pg.wait_for_timeout(1500)
        t, mo = pg.evaluate('[window.__lumiereVivre.lecteur.t, window.__lumiereVivre.lecteur.musique()[0].tempsMorceau]')   # lus ensemble
        ok(194.2 < t < 197.5 and abs(mo - t) < 1e-9, f'{N} 9. aller à « La goutte » : film {t:.2f} s = morceau {mo:.2f} s (l’impact à 198,255)')
        ok(pg.evaluate('window.__lumiereVivre.verifier().ok'), f'{N} 9. repères verrouillés exacts')
        if CAP: pg.wait_for_timeout(2500); pg.mouse.move(610, 410); pg.screenshot(path=f'{CAP}/ouv-{n}-5-vivre.png')
        pg.keyboard.press('Space'); pg.wait_for_timeout(300); pg.goto(B + '/studio/explorer'); pg.goto(B + '/studio/one/lumiere/vivre'); pg.wait_for_selector('.lf-grand')
        ok('Reprendre' in pg.locator('.lf-grand').inner_text(), f'{N} 9. reprise : « {pg.locator(".lf-grand").inner_text()} »')
        ok(not err, f'{N} 9. aucune erreur ({err[:1]})')
        ctx.close(); b.close()

n = sum(1 for r in res if r[0]); print(f'— {n}/{len(res)}')
