"""La lecture claire (Matt, 30/10/2026 : « L'anneau choisit. Le centre affiche. Le Point Zéro relie. »).
Un import (la démonstration : un PDF, un Markdown, une page HTML, une image) ; l'anneau intérieur montre les types présents ;
PDF, puis Markdown, puis HTML, sans quitter le Disque ; une seule représentation au centre ; Agir ; Retour, Origine.
INVARIANT vérifié à chaque état : rien de visible hors du Disque (sauf l'en-tête), et le centre dit où l'on est, ce que l'on regarde,
ce que l'on peut faire. Usage : BASE=http://localhost:4634 NAVIGATEURS=chromium,webkit CAPTURES=dossier python3 tests/e2e/lecture.py"""
import os, math
from playwright.sync_api import sync_playwright
B = os.environ['BASE'].rstrip('/'); NAVS = os.environ.get('NAVIGATEURS', 'chromium').split(','); CAP = os.environ.get('CAPTURES')
R = [0, 0]
def ok(c, m): R[0 if c else 1] += 1; print(('✓ ' if c else 'ÉCHEC ') + m)
U = B + '/studio/one/univers'
HORS = """(() => { const d = document.querySelector('.one-disque, .dq-centre-mobile'); if (!d) return ['pas de Disque'];
  const b = d.getBoundingClientRect(), cx = b.x + b.width / 2, cy = b.y + b.height / 2, r = b.width / 2 + 2, mob = d.classList.contains('dq-centre-mobile');
  const out = [];
  for (const e of document.querySelectorAll('.dq-scene *')) {
    if (e.closest('.dq-zone, .sr-only, .dq-liste, .one-disque-cartouche')) continue;
    const s = getComputedStyle(e); if (s.visibility === 'hidden' || s.display === 'none' || +s.opacity === 0) continue;
    const q = e.getBoundingClientRect(); if (!q.width || !q.height || e.children.length && !e.textContent.trim() && e.tagName !== 'IMG' && e.tagName !== 'IFRAME') continue;
    if (!e.closest('.one-disque-hote, .dq-centre-mobile')) { out.push(e.className || e.tagName); continue; }
    if (!mob && !e.closest('.dq-centre')) continue;   /* la structure du Disque elle-même (anneau, couronne) */
    if (mob) { if (q.left < b.left - 1 || q.right > b.right + 1 || q.top < b.top - 1 || q.bottom > b.bottom + 1) out.push(e.className || e.tagName); continue; }
    const coins = [[q.left, q.top], [q.right, q.top], [q.left, q.bottom], [q.right, q.bottom]];
    if (coins.some(([x, y]) => Math.hypot(x - cx, y - cy) > r)) out.push((e.className || e.tagName) + '');
  } return [...new Set(out)].slice(0, 6); })()"""
def invariant(pg, N, etat):
    hors = pg.evaluate(HORS)
    fil, nom = pg.locator('.lc-fil').first.inner_text(), pg.locator('.lc-nom').first.inner_text()
    gestes = pg.locator('.ac-choix:visible, .lc-gestes button:visible').count()
    ok(not hors and fil and nom and gestes, f'{N} invariant · {etat} : rien hors du Disque {hors or ""}; où : « {fil} » ; quoi : « {nom} » ; faire : {gestes} choix')
def anneau(pg): return [x.strip() for x in pg.locator('.ac-choix').all_inner_texts()]
def choisir(pg, mot): pg.locator('.ac-choix', has_text=mot).first.click(); pg.wait_for_timeout(500)

with sync_playwright() as p:
    for n in NAVS:
        b = getattr(p, n).launch()
        for appareil in ('ordinateur',):   # le téléphone a son propre parcours, plus bas (centre compact, lecture en grand)
            N = f'[{n} · {appareil}]'
            kw = {'viewport': {'width': 1440, 'height': 900}, 'accept_downloads': True} if appareil == 'ordinateur' else ({**p.devices['iPhone 14']} if n == 'webkit' else {'viewport': {'width': 390, 'height': 844}, 'is_mobile': True, 'has_touch': True, 'device_scale_factor': 2})
            ctx = b.new_context(**kw); pg = ctx.new_page(); err = []; pg.on('pageerror', lambda e: err.append(str(e)))
            pg.goto(U + '?f.v=lecture'); pg.wait_for_selector('.lc-nom', timeout=20000)
            ok('Rien n’est importé' in pg.locator('.lc-nom').inner_text(), f'{N} sans import, le Disque le dit (rien d’inventé)')
            ouvrir = (lambda mot: (pg.locator(f'.one-disque [role=menuitem][aria-label^="{mot}"]').first.tap(), pg.wait_for_timeout(400))) if appareil == 'téléphone' else (lambda mot: (pg.locator('.one-disque [role=menuitem]', has_text=mot).first.click(), pg.wait_for_timeout(400)))
            pg.goto(U); pg.wait_for_selector('.bt', timeout=20000); pg.wait_for_timeout(600)
            ouvrir('Faire'); ouvrir('Ajouter'); ouvrir('Démonstration'); pg.wait_for_selector('.ac-choix', timeout=15000); pg.wait_for_timeout(400)
            if appareil == 'ordinateur':
                cour = [x.split('\n')[0] for x in pg.locator('.one-disque [role=menuitem]').all_inner_texts()]
                ok(cour == ['Confort', 'Faire', 'Aller', 'Voir', 'Origine'], f'{N} après le choix, la couronne garde les cinq commandes {cour}')
            ok(anneau(pg) == ['PDF', 'MD', 'HTML', 'IMAGE'] and 'f.v=lecture' in pg.url, f'{N} niveau 1 : l’anneau montre les types réellement présents {anneau(pg)}')
            ok(pg.locator('.lc-demo').count() >= 1 and '4 fichiers' in pg.locator('.lc-nom').inner_text(), f'{N} la démonstration est dite comme telle')
            invariant(pg, N, 'types')
            # 1. PDF
            choisir(pg, 'PDF'); pg.wait_for_selector('.lc-corps img', timeout=20000); pg.wait_for_timeout(300)
            ok(pg.locator('.lc-fil').inner_text().upper().startswith('LECTURE · PDF · APERÇU') and pg.locator('.lc-corps img').get_attribute('alt').startswith('Page 1 de'), f'{N} 1. PDF : la page 1 au centre ({pg.locator(".lc-mesures").inner_text()})')
            ok(anneau(pg)[0] == 'Aperçu' and 'Texte' in anneau(pg) and anneau(pg)[-1] == 'Agir', f'{N} niveau 3 : les lectures possibles {anneau(pg)}')
            invariant(pg, N, 'PDF')
            if CAP and appareil == 'ordinateur': pg.screenshot(path=f'{CAP}/lecture-{n}-1-pdf.png')
            choisir(pg, 'Texte')
            ok('Le centre est un écran universel' in pg.locator('.lc-corps').inner_text() and pg.locator('.lc-corps img').count() == 0, f'{N} PDF › Texte : le texte réellement extrait, une seule représentation')
            # 2. Markdown, sans quitter le Disque
            pg.locator('.lc-gestes button', has_text='Retour').click(); pg.wait_for_timeout(400)
            ok(anneau(pg) == ['PDF', 'MD', 'HTML', 'IMAGE'], f'{N} Retour : les types')
            choisir(pg, 'MD'); pg.wait_for_selector('.lc-titres', timeout=10000)
            t = pg.locator('.lc-titres').inner_text()
            ok('L’anneau choisit, le centre affiche' in t and 'Deux zones' in t and 'Le critère' in t, f'{N} 2. Markdown : la structure au centre (titres réels)')
            invariant(pg, N, 'Markdown')
            if CAP and appareil == 'ordinateur': pg.screenshot(path=f'{CAP}/lecture-{n}-2-md.png')
            choisir(pg, 'Liens'); ok('lemondeaime.com' in pg.locator('.lc-corps').inner_text(), f'{N} Markdown › Liens : les liens du fichier')
            # 3. HTML (au clavier : Échap pour revenir)
            pg.locator('.ac-choix.ac-on').focus(); pg.keyboard.press('Escape'); pg.wait_for_timeout(400)
            ok(anneau(pg) == ['PDF', 'MD', 'HTML', 'IMAGE'], f'{N} clavier : Échap revient aux types')
            pg.locator('.ac-choix').first.focus(); pg.keyboard.press('ArrowRight'); pg.keyboard.press('ArrowRight'); pg.keyboard.press('Enter'); pg.wait_for_selector('iframe.lc-page', timeout=10000); pg.wait_for_timeout(500)
            fr = pg.frame_locator('iframe.lc-page')
            ok(pg.locator('iframe.lc-page').get_attribute('sandbox') == '' and fr.locator('h1').inner_text() == 'Le centre est un écran universel', f'{N} 3. HTML (clavier : flèches, Entrée) : la page prévisualisée, isolée')
            ok(pg.frame_locator('iframe.lc-page').locator('body').get_attribute('data-script-execute') is None and 'jamais exécuté' in pg.locator('.lc-limite').inner_text(), f'{N} HTML : le script de la page n’est pas exécuté, et c’est dit')
            invariant(pg, N, 'HTML')
            if CAP and appareil == 'ordinateur': pg.screenshot(path=f'{CAP}/lecture-{n}-3-html.png')
            choisir(pg, 'Structure'); s = pg.locator('.lc-corps').inner_text()
            ok('Une seule représentation à la fois' in s and '1 main' in s and '2 section' in s, f'{N} HTML › Structure : sections et titres réels')
            # niveau 4 : agir
            choisir(pg, 'Agir'); ok(anneau(pg) == ['Exporter', 'Relier'], f'{N} niveau 4 : seulement les actions disponibles {anneau(pg)}')
            invariant(pg, N, 'Agir')
            if appareil == 'ordinateur':
                with pg.expect_download() as d: choisir(pg, 'Exporter')
                ok(d.value.suggested_filename == 'one-lecture-claire.html', f'{N} Exporter : une copie de l’original ({d.value.suggested_filename})')
            pg.locator('.lc-gestes button', has_text='Retour').click(); pg.wait_for_timeout(400)
            ok('Aperçu' in anneau(pg), f'{N} Retour : les lectures')
            # agrandir, puis revenir au même état
            pg.locator('.lc-gestes button', has_text='Agrandir').click(); pg.wait_for_selector('.lc-grand')
            ok('limites de la lecture' in pg.locator('.lc-grand').inner_text().lower(), f'{N} Agrandir : la lecture sans la compresser, avec ses limites')
            pg.locator('.dq-point-replie').click(); pg.wait_for_timeout(400)
            ok(pg.locator('.lc-corps').count() == 1 and 'f.l=structure' in pg.url, f'{N} revenir d’en grand : le même état')
            # ORIGINE, puis Voir › Lecture : l'import est gardé
            if appareil == 'ordinateur':   # la famille Faire › Ajouter est encore ouverte : Retour, jusqu'à la couronne
                for _ in range(3):
                    if pg.locator('.one-disque [role=menuitem]', has_text='Origine').count(): break
                    pg.locator('.one-disque [role=menuitem]', has_text='Retour').first.click(); pg.wait_for_timeout(400)
            else:
                for _ in range(3):
                    if pg.locator('.one-disque [role=menuitem][aria-label^="Origine"]').count(): break
                    pg.locator('.one-disque [role=menuitem][aria-label^="Retour"]').first.tap(); pg.wait_for_timeout(400)
            ouvrir('Origine'); pg.wait_for_selector('.bt', timeout=10000)
            ok('f.v' not in pg.url, f'{N} Origine : le Point Zéro')
            ouvrir('Voir'); ouvrir('Lecture'); pg.wait_for_selector('.ac-choix', timeout=10000)
            ok(anneau(pg) == ['PDF', 'MD', 'HTML', 'IMAGE'], f'{N} Voir › Lecture : l’import est gardé')
            cibles = pg.evaluate("[...document.querySelectorAll('.ac-choix, .lc-gestes button')].map(e => Math.min(e.getBoundingClientRect().height, e.getBoundingClientRect().width))")
            ok(min(cibles) >= 40, f'{N} cibles ≥ 40 px ({min(cibles):.0f})')
            ok(pg.evaluate('document.documentElement.scrollWidth') <= kw.get('viewport', {'width': 390})['width'], f'{N} aucun débordement horizontal')
            if appareil == 'téléphone':
                choisir(pg, 'IMAGE'); pg.wait_for_selector('.lc-corps img')
                ok('papillon' in pg.locator('.lc-corps img').get_attribute('alt'), f'{N} au doigt : IMAGE, la photo au centre')
                invariant(pg, N, 'image')
                if CAP: pg.screenshot(path=f'{CAP}/lecture-{n}-4-telephone.png')
            else:
                # un vrai fichier choisi par la personne
                pg.reload(); pg.wait_for_selector('.lc-nom')
                ok('Rien n’est importé' in pg.locator('.lc-nom').inner_text(), f'{N} après rechargement : l’import est oublié, et c’est dit')
                with pg.expect_file_chooser() as fc: pg.locator('.lc-gestes button', has_text='Des fichiers').click()
                fc.value.set_files([{'name': 'notes.md', 'mimeType': 'text/markdown', 'buffer': '# Mes notes\n\nUn [lien](https://exemple.fr).'.encode()}, {'name': 'archive.zip', 'mimeType': 'application/zip', 'buffer': b'PK'}])
                pg.wait_for_selector('.ac-choix'); ok(anneau(pg) == ['MD', 'AUTRE'], f'{N} un import réel : les types présents seulement {anneau(pg)}')
                choisir(pg, 'AUTRE'); ok('pas lu par le Studio' in pg.locator('.dq-centre').inner_text(), f'{N} un format non pris en charge : la limite est dite')
            ok(not err, f'{N} aucune erreur {err[:2]}')
            ctx.close()
        # ——— téléphone : le même Disque radial ; au centre l'essentiel, la lecture complète en grand ———
        N = f'[{n} · téléphone]'
        kw = {**p.devices['iPhone 14']} if n == 'webkit' else {'viewport': {'width': 390, 'height': 844}, 'is_mobile': True, 'has_touch': True, 'device_scale_factor': 2}
        ctx = b.new_context(**kw); pg = ctx.new_page(); err = []; pg.on('pageerror', lambda e: err.append(str(e)))
        cmd = lambda mot: (pg.locator(f'.one-disque [role=menuitem][aria-label^="{mot}"]').first.tap(), pg.wait_for_timeout(450))
        pg.goto(U); pg.wait_for_selector('.bt', timeout=20000); pg.wait_for_timeout(600)
        ok(pg.locator('.dq-liste').count() == 0 and pg.locator('.one-disque .pzt-anneau').count() == 1, f'{N} le Disque radial, jamais une liste')
        cmd('Faire'); cmd('Ajouter'); cmd('Démonstration'); pg.wait_for_selector('.ac-choix', timeout=15000); pg.wait_for_timeout(400)
        ok(anneau(pg) == ['PDF', 'MD', 'HTML', 'IMAGE'], f'{N} au doigt : l’anneau intérieur montre les types {anneau(pg)}')
        invariant(pg, N, 'types')
        for typ, attendu, sel in [('PDF', 'Page 1 de', '.lc-grand img'), ('MD', 'Deux zones', '.lc-grand .lc-titres'), ('HTML', None, '.lc-grand iframe[sandbox=""]')]:
            pg.locator('.ac-choix', has_text=typ).first.tap(); pg.wait_for_selector('.lc-gestes button >> text=Agrandir', timeout=20000); pg.wait_for_timeout(300)
            ok(pg.locator('.lc-fil').inner_text().upper().startswith('LECTURE · ' + typ), f'{N} {typ} : le centre dit où l’on est ({pg.locator(".lc-fil").inner_text()})')
            invariant(pg, N, typ)
            if CAP: pg.screenshot(path=f'{CAP}/lecture-{n}-tel-{typ.lower()}.png')
            if typ == 'MD': pg.locator('.ac-choix', has_text='Structure').first.tap(); pg.wait_for_timeout(300)
            pg.locator('.lc-gestes button', has_text='Agrandir').tap(); pg.wait_for_selector(sel, timeout=15000)
            ok(attendu is None or (attendu in (pg.locator(sel).first.get_attribute('alt') or '') or attendu in pg.locator('.lc-grand').inner_text()), f'{N} {typ} › Agrandir : la lecture complète, sans la compresser')
            pg.locator('.dq-point-replie').tap(); pg.wait_for_timeout(400)
            pg.locator('.lc-gestes button', has_text='Retour').tap(); pg.wait_for_timeout(400)
            ok(anneau(pg) == ['PDF', 'MD', 'HTML', 'IMAGE'], f'{N} Retour : les types')
        cibles = pg.evaluate("[...document.querySelectorAll('.ac-choix, .lc-gestes button, .one-disque [role=menuitem]')].map(e => Math.min(e.getBoundingClientRect().height, e.getBoundingClientRect().width))")
        ok(min(cibles) >= 40, f'{N} cibles ≥ 40 px ({min(cibles):.0f})')
        ok(pg.evaluate('document.documentElement.scrollWidth') <= 390, f'{N} aucun débordement horizontal')
        cmd('Origine'); pg.wait_for_selector('.bt', timeout=10000); ok('f.v' not in pg.url, f'{N} Origine : le Point Zéro')
        ok(not err, f'{N} aucune erreur {err[:2]}')
        ctx.close()
        b.close()
print(f'— {R[0]}/{R[0] + R[1]}')
