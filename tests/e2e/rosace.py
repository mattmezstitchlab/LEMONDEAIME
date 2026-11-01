"""Parcours navigateur du build combiné, sans API distante ni compte.

  npm run build
  node tests/e2e/serveur-rosace.mjs
  BASE_URL=http://127.0.0.1:4173 CHROMIUM_PATH=/chemin/vers/chromium python3 tests/e2e/rosace.py

Dépend de Playwright Python et d'un navigateur Chromium disponibles localement. On ne teste pas
la protection Vercel ni les comptes ; le serveur local retourne 503 pour les API absentes.
"""
import os
import unittest
from urllib.parse import parse_qs, urlparse
from playwright.sync_api import sync_playwright

BASE = os.environ.get('BASE_URL', 'http://127.0.0.1:4173').rstrip('/')
ROSACE = '/projets/brode-way?experience=rosace'


class RosaceE2E(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.playwright = sync_playwright().start()
        kwargs = {'args': ['--no-sandbox', '--disable-gpu', '--enable-unsafe-swiftshader']}
        if os.environ.get('CHROMIUM_PATH'):
            kwargs['executable_path'] = os.environ['CHROMIUM_PATH']
        cls.browser = cls.playwright.chromium.launch(**kwargs)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()

    def page(self, width=1440, height=900, motion='reduce'):
        context = self.browser.new_context(viewport={'width': width, 'height': height}, reduced_motion=motion, service_workers='block')
        self.addCleanup(context.close)
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda err: errors.append(str(err)))
        def console(msg):
            # L'API n'existe pas sur ce serveur de build ; la feuille Google de la charte est déjà dans index.html.
            # Le navigateur du bac à sable ne peut pas joindre Google, sans impact sur les calculs ROSACE.
            url = msg.location.get('url', '')
            attente = ('/api/' in url and 'status of 503' in msg.text) or url.startswith('https://fonts.googleapis.com/')
            if msg.type == 'error' and not attente:
                errors.append('console: ' + msg.text + ' (' + url + ')')
        page.on('console', console)
        self.addCleanup(lambda: self.assertEqual(errors, [], 'Erreurs JavaScript ou console inattendues'))
        return page

    @staticmethod
    def ouvrir(page):
        page.goto(BASE + ROSACE, wait_until='networkidle')
        page.locator('[data-testid=code-rosace]').wait_for(state='attached')

    @staticmethod
    def code(page):
        return page.locator('[data-testid=code-rosace]').text_content()

    @staticmethod
    def mode(page, name):
        page.locator(f'.ros-disque [data-mode="{name}"]').click()

    def coherence(self, page):
        empreintes = page.locator('canvas[data-empreinte]').evaluate_all('(els) => els.map(e => e.dataset.empreinte)')
        # La galerie se calcule à l'approche ; les trois lectures de l'ouvrage courant sont identiques.
        courant = [page.locator(s).get_attribute('data-empreinte') for s in
                   ('.ros-centre-motif canvas', '.ros-cinq-cercle canvas', '.ros-grille-figure canvas')]
        self.assertGreaterEqual(len(empreintes), 3)
        self.assertTrue(courant[0])
        self.assertEqual(len(set(courant)), 1)
        self.assertIn(self.code(page), page.locator('.ros-feuille img').get_attribute('alt'))
        self.assertTrue(page.locator('.ros-feuille img').evaluate('(e) => e.complete && e.naturalWidth > 0'))
        self.assertEqual(parse_qs(urlparse(page.get_by_role('link', name='Créer ma rosace').get_attribute('href')).query)['rosace'], [self.code(page)])
        return courant[0]

    def test_navigation_et_fiche_historique(self):
        page = self.page()
        page.goto(BASE + '/projets', wait_until='networkidle')
        card = page.locator('a[href="' + ROSACE + '"]').first
        self.assertTrue(card.is_visible())
        card.click()
        self.assertEqual(page.locator('h1').inner_text(), 'ROSACE.')
        self.assertEqual(urlparse(page.url).query, 'experience=rosace')
        page.get_by_role('link', name='BRODERIE · LE MONDE AIME').click()
        page.get_by_role('heading', name='Brode Way', exact=True).wait_for()
        self.assertEqual(urlparse(page.url).path, '/projets/brode-way')
        self.assertEqual(urlparse(page.url).query, '')
        self.assertTrue(page.get_by_role('link', name='Découvrir ROSACE').is_visible())
        self.assertTrue(page.get_by_role('link', name='Composer une rosace').count())
        page.get_by_role('link', name='Découvrir ROSACE').click()
        self.assertEqual(page.locator('h1').inner_text(), 'ROSACE.')
        page.go_back(wait_until='networkidle')
        self.assertEqual(page.locator('h1').inner_text(), 'Brode Way')
        page.go_forward(wait_until='networkidle')
        self.assertEqual(page.locator('h1').inner_text(), 'ROSACE.')

    def test_disque_six_modes_et_sous_modes(self):
        page = self.page()
        self.ouvrir(page)
        code0 = self.code(page)
        fingerprint = self.coherence(page)
        self.mode(page, 'formes')
        self.mode(page, 'structure-1')
        self.assertNotEqual(self.code(page), code0)
        self.assertNotEqual(self.coherence(page), fingerprint)
        self.mode(page, '__retour')
        self.mode(page, '5d')
        # Les quatre autres dimensions du moteur, sur le même Disque.
        for dim, choice in [('trace', 1), ('densite', 0), ('echelle', 3), ('palette', 3)]:
            previous = self.code(page)
            self.mode(page, 'dim-' + dim)
            self.mode(page, dim + '-' + str(choice))
            self.assertNotEqual(self.code(page), previous)
            self.coherence(page)
            self.mode(page, '__retour')
        self.assertTrue(page.locator('.ros-ajustement').is_visible())  # signature effective du moteur
        self.mode(page, '__retour')
        self.mode(page, 'fils')
        first_fil = page.locator('.ros-disque [data-mode^="fil-"]').first
        ref = first_fil.get_attribute('data-mode').removeprefix('fil-')
        previous = self.code(page)
        first_fil.click()
        self.assertEqual(page.locator('.ros-centre-motif canvas').get_attribute('data-fil'), ref)
        self.assertEqual(page.locator('.ros-grille-figure canvas').get_attribute('data-fil'), ref)
        self.assertEqual(self.code(page), previous)  # un surlignage, pas un remplacement de fil
        self.mode(page, 'tous-fils')
        self.assertEqual(page.locator('.ros-centre-motif canvas').get_attribute('data-fil'), 'tous')
        self.mode(page, '__retour')
        self.mode(page, 'points')
        self.assertEqual(page.locator('.ros-centre-motif canvas').get_attribute('data-vue'), 'grille')
        self.assertEqual(page.locator('.ros-grille-figure canvas').get_attribute('data-vue'), 'grille')
        self.mode(page, 'cadre')
        self.assertEqual(page.evaluate('document.activeElement.id'), 'ros-cadre-titre')
        self.mode(page, 'lecture')
        self.assertEqual(page.evaluate('document.activeElement.id'), 'ros-patron-titre')
        self.assertEqual(self.code(page), previous)
        self.coherence(page)

    def test_variation_galerie_5d_roue_grille_mesures_patron(self):
        page = self.page()
        self.ouvrir(page)
        code0, fingerprint0 = self.code(page), self.coherence(page)
        page.get_by_role('button', name='Tourner la vue').click()
        self.assertNotEqual(page.locator('.ros-centre-motif').evaluate('(e) => e.style.transform'), 'rotate(0deg)')
        self.assertEqual(self.code(page), code0)
        self.assertEqual(self.coherence(page), fingerprint0)
        page.get_by_role('button', name='Une variation').click()
        self.assertNotEqual(self.code(page), code0)
        self.assertNotEqual(self.coherence(page), fingerprint0)
        page.get_by_role('button', name='Voir naître').click()
        self.assertEqual(page.locator('.ros-centre-motif canvas').get_attribute('data-progression'), '100')
        self.assertIn('Mouvement réduit', page.locator('.ros-hero > [role=status]').text_content())
        gallery = page.get_by_role('button', name='Explorer Givre')
        expected = gallery.get_attribute('data-code')
        gallery.click()
        self.assertEqual(page.evaluate('document.activeElement.tagName'), 'H1')
        self.assertEqual(self.code(page), expected)
        self.coherence(page)
        page.locator('[data-dimension="structure"]').click()
        page.get_by_role('group', name='Choix : Forme').get_by_role('button', name='Frise', exact=True).click()
        self.assertIn('121 × 31', page.locator('.ros-mesures').inner_text())
        self.coherence(page)
        page.locator('[data-dimension="palette"]').click()
        page.get_by_role('group', name='Choix : Palette').get_by_role('button', name='Terre', exact=True).click()
        before_fil = self.code(page)
        fil = page.locator('.ros-fil-bouton').first
        ref = fil.get_attribute('data-dmc')
        fil.click()
        self.assertEqual(page.locator('.ros-centre-motif canvas').get_attribute('data-fil'), ref)
        self.assertEqual(page.locator('.ros-grille-figure canvas').get_attribute('data-fil'), ref)
        fil.click()
        self.assertEqual(page.locator('.ros-centre-motif canvas').get_attribute('data-fil'), 'tous')
        self.assertEqual(self.code(page), before_fil)
        page.locator('#points').get_by_role('button', name='La grille', exact=True).click()
        self.assertEqual(page.locator('.ros-centre-motif canvas').get_attribute('data-vue'), 'grille')
        page.locator('#points').get_by_role('button', name='Les croix', exact=True).click()
        self.assertEqual(page.locator('.ros-grille-figure canvas').get_attribute('data-vue'), 'croix')
        self.coherence(page)

    def test_collection_64_vignettes_reelles_et_clavier(self):
        page = self.page()
        self.ouvrir(page)
        boutons = page.locator('.ros-galerie-grille button[data-code]')
        self.assertEqual(boutons.count(), 64)
        codes = boutons.evaluate_all('(els) => els.map(e => e.dataset.code)')
        self.assertEqual(len(set(codes)), 64)
        self.assertEqual(page.locator('.ros-galerie-grille canvas').count(), 0)  # chargement à l'approche
        boutons.nth(0).focus()
        boutons.nth(0).press('ArrowRight')
        self.assertEqual(page.evaluate('document.activeElement.dataset.rosaceNumero'), '2')
        page.keyboard.press('ArrowDown')
        self.assertEqual(page.evaluate('document.activeElement.dataset.rosaceNumero'), '10')
        page.keyboard.press('End')
        self.assertEqual(page.evaluate('document.activeElement.dataset.rosaceNumero'), '64')
        # Les observer par rangée charge réellement les 64 Patterns, pas 64 copies d'une image.
        for i in range(0, 64, 8):
            boutons.nth(i).scroll_into_view_if_needed()
            boutons.nth(i).locator('canvas[data-empreinte]').wait_for()
        boutons.nth(63).scroll_into_view_if_needed()
        page.wait_for_function("document.querySelectorAll('.ros-galerie-grille canvas[data-empreinte]').length === 64", timeout=20000)
        empreintes = boutons.locator('canvas').evaluate_all('(els) => els.map(e => e.dataset.empreinte)')
        self.assertEqual(len(set(empreintes)), 64)
        for i in (0, 24, 63):
            boutons.nth(i).click()
            self.assertEqual(self.code(page), codes[i])
            self.assertEqual(self.coherence(page), empreintes[i])
            self.assertEqual(boutons.nth(i).get_attribute('aria-pressed'), 'true')
            self.assertEqual(page.evaluate('document.activeElement.id'), 'ros-titre')
        page.get_by_role('link', name='Passer la galerie').click()
        self.assertEqual(page.evaluate('document.activeElement.id'), 'ros-cinq-titre')

    def test_parcours_des_64_dans_le_vrai_disque(self):
        page = self.page()
        self.ouvrir(page)
        boutons = page.locator('.ros-galerie-grille button[data-code]')
        codes = boutons.evaluate_all('(els) => els.map(e => e.dataset.code)')
        self.assertEqual(self.code(page), codes[0])
        self.mode(page, 'rosaces')
        self.mode(page, 'rosace-precedente')
        self.assertEqual(self.code(page), codes[63])  # boucle au dernier
        self.assertIn('64 sur 64', page.locator('.ros-hero > [role=status]').text_content())
        self.mode(page, 'rosace-suivante')
        self.assertEqual(self.code(page), codes[0])
        self.mode(page, 'rosace-suivante')
        self.assertEqual(self.code(page), codes[1])
        self.mode(page, 'rosace-choisir')
        # Les signes de navigation restent lisibles sur la couronne claire.
        for nav in ('__retour', '__origine', '__suite'):
            contrast = page.locator(f'.ros-disque [data-mode="{nav}"]').evaluate('''(el) => {
              const rgb = s => s.match(/\d+/g).slice(0, 3).map(Number).map(x => { x /= 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; });
              const lum = a => .2126 * a[0] + .7152 * a[1] + .0722 * a[2];
              const cs = getComputedStyle(el), a = lum(rgb(cs.color)), b = lum(rgb(cs.backgroundColor));
              return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
            }''')
            self.assertGreaterEqual(contrast, 4.5, nav)
        # Pagination du Point : accéder réellement à la dernière recette.
        for _ in range(24):
            if page.locator('.ros-disque [data-mode="rosace-64"]').count():
                break
            self.mode(page, '__suite')
        else:
            self.fail('La pagination du Point ne mène pas à la rosace 64')
        self.mode(page, 'rosace-64')
        self.assertEqual(self.code(page), codes[63])
        self.coherence(page)
        self.mode(page, '__origine')
        self.mode(page, 'formes')  # les six lectures restent disponibles
        self.mode(page, 'structure-2')
        self.assertIn('121 × 31', page.locator('.ros-mesures').inner_text())
        self.mode(page, '__retour')
        self.mode(page, 'rosaces')
        self.mode(page, 'rosace-suivante')  # création libre : reprendre au début
        self.assertEqual(self.code(page), codes[0])

    def test_page_complete_dans_le_design_system(self):
        page = self.page()
        page.goto(BASE + '/system', wait_until='networkidle')
        self.assertEqual(page.locator('meta[name=robots]').get_attribute('content'), 'noindex, nofollow')
        self.assertEqual(page.locator('#contenu').count(), 1)
        self.assertEqual(page.locator('.sys-echiquier [role=gridcell]').count(), 64)
        page.get_by_role('link', name='Découvrir ROSACE').click()
        cadre = page.locator('iframe[title="Page ROSACE complète et interactive"]')
        cadre.scroll_into_view_if_needed()
        self.assertEqual(cadre.get_attribute('src'), ROSACE + '&apercu=system')
        frame = page.frame_locator('iframe[title="Page ROSACE complète et interactive"]')
        frame.get_by_role('heading', name='ROSACE', exact=True).wait_for()
        self.assertEqual(frame.locator('.ros-galerie-grille button').count(), 64)
        code0 = self.code(frame)
        self.mode(frame, 'rosaces')
        self.mode(frame, 'rosace-suivante')
        self.assertNotEqual(self.code(frame), code0)
        self.coherence(frame)
        self.mode(frame, '__retour')
        self.mode(frame, 'cadre')
        self.assertEqual(urlparse(page.url).fragment, 'rosace')
        self.assertTrue(page.locator('#rosace-t').is_visible())
        self.assertEqual(page.get_by_role('link', name='Ouvrir ROSACE en grand').get_attribute('href'), ROSACE)
        # Depuis le cadre, l'atelier s'ouvre dans la page hôte avec la recette choisie.
        code, empreinte = self.code(frame), self.coherence(frame)
        cta = frame.get_by_role('link', name='Créer ma rosace')
        self.assertEqual(cta.get_attribute('target'), '_parent')
        cta.click()
        page.locator('.cr-fin').wait_for(timeout=30000)
        self.assertEqual(urlparse(page.url).path, '/studio/atelier')
        self.assertEqual(parse_qs(urlparse(page.url).query)['rosace'], [code])
        self.assertEqual(page.locator('.cr-fin').get_attribute('data-empreinte'), empreinte)
        self.assertIsNone(page.evaluate("localStorage.getItem('point-zero:motif:v1')"))

    def test_confort_partage_entre_system_et_rosace(self):
        page = self.page()
        page.goto(BASE + '/system', wait_until='networkidle')
        page.get_by_role('link', name='Découvrir ROSACE').click()
        frame = page.frame_locator('iframe[title="Page ROSACE complète et interactive"]')
        frame.locator('.ros-disque [data-mode=confort]').click()
        panneau = frame.locator('.lp-panneau')
        panneau.get_by_role('slider', name='Taille du texte').fill('175')
        page.wait_for_function("document.documentElement.style.getPropertyValue('--pz-user-font-scale') === '1.75'")
        panneau.press('Escape')
        # Dans l'autre sens, le Point du système actualise aussi le document ROSACE.
        page.locator('#disque').scroll_into_view_if_needed()
        page.locator('#disque [data-mode=confort]').click()
        panneau_systeme = page.locator('.lp-panneau')
        panneau_systeme.get_by_role('slider', name='Taille du texte').fill('125')
        page.wait_for_function("document.querySelector('iframe').contentDocument.documentElement.style.getPropertyValue('--pz-user-font-scale') === '1.25'")
        panneau_systeme.press('Escape')

    def test_system_et_collection_sur_petit_mobile(self):
        page = self.page(320, 700)
        page.goto(BASE + '/system', wait_until='networkidle')
        page.get_by_role('link', name='Découvrir ROSACE').click()
        frame = page.frame_locator('iframe[title="Page ROSACE complète et interactive"]')
        codes = frame.locator('.ros-galerie-grille button').evaluate_all('(es) => es.map(e => e.dataset.code)')
        self.mode(frame, 'rosaces')
        self.mode(frame, 'rosace-choisir')
        for _ in range(24):
            if frame.locator('.ros-disque [data-mode="rosace-64"]').count():
                break
            self.mode(frame, '__suite')
        else:
            self.fail('La pagination dans le cadre mobile ne mène pas à la rosace 64')
        self.mode(frame, 'rosace-64')
        self.assertEqual(self.code(frame), codes[63])
        self.assertEqual(page.evaluate('document.documentElement.scrollWidth'), 320)
        self.assertLessEqual(frame.locator('html').evaluate('(e) => e.scrollWidth'), page.locator('iframe').bounding_box()['width'])
        self.assertEqual(frame.get_by_role('link', name='Créer ma rosace').get_attribute('target'), '_parent')

    def test_apercu_direct_garde_la_navigation_normale(self):
        page = self.page()
        page.goto(BASE + ROSACE + '&apercu=system', wait_until='networkidle')
        self.assertEqual(page.get_by_role('link', name='Créer ma rosace').get_attribute('target'), None)
        self.assertTrue(page.get_by_role('navigation').count() > 0)

    def test_transfert_reel_vers_atelier_apres_confirmation(self):
        page = self.page()
        self.ouvrir(page)
        page.get_by_role('button', name='Une variation').click()
        code, empreinte = self.code(page), self.coherence(page)
        page.get_by_role('link', name='Créer ma rosace').click()
        final = page.locator('.cr-fin')
        final.wait_for(timeout=30000)
        self.assertEqual(parse_qs(urlparse(page.url).query)['rosace'], [code])
        self.assertEqual(final.get_attribute('data-empreinte'), empreinte)
        self.assertIsNone(page.evaluate("localStorage.getItem('point-zero:motif:v1')"))
        page.get_by_role('button', name='Broder ce motif').click()
        page.get_by_text('Votre rosace est dans son cadre.', exact=False).first.wait_for(timeout=30000)
        page.wait_for_function("localStorage.getItem('point-zero:motif:v1') !== null", timeout=10000)
        recette = page.evaluate("JSON.parse(localStorage.getItem('point-zero:motif:v1')).recette")
        self.assertEqual(recette['code'], code)
        self.assertEqual(str(recette['empreinte']), empreinte)
        self.assertEqual(urlparse(page.url).path, '/studio/atelier')
        self.assertEqual(urlparse(page.url).query, '')

    def test_clavier_confort_liste_et_adaptation_mobile(self):
        for width, height in [(320, 700), (390, 844), (820, 1180), (1440, 900)]:
            page = self.page(width, height)
            self.ouvrir(page)
            self.assertEqual(page.evaluate('document.documentElement.scrollWidth'), width)
            modes = page.locator('.ros-disque [role=menuitem]')
            self.assertEqual(modes.count(), 8)
            formes = page.locator('.ros-disque [data-mode=formes]')
            formes.focus()
            formes.press('Enter')
            page.locator('.ros-disque [data-mode=structure-0]').wait_for()
            page.locator('.ros-disque [data-mode=structure-0]').press('ArrowRight')
            self.assertEqual(page.evaluate('document.activeElement.dataset.mode'), 'structure-1')
            page.keyboard.press('Enter')
            self.assertTrue(self.code(page).startswith('5D-2'))
            page.keyboard.press('Escape')
            page.locator('.ros-disque [data-mode=confort]').click()
            panel = page.locator('.lp-panneau')
            panel.get_by_label('Liste en mots').check()
            self.assertEqual(page.locator('.ros-disque .lp-liste').count(), 1)
            self.assertEqual(page.evaluate('document.activeElement.type'), 'radio')
            slider = panel.get_by_role('slider', name='Taille du texte')
            avant = page.locator('.ros-manifeste-texte p').evaluate('(e) => parseFloat(getComputedStyle(e).fontSize)')
            slider.fill('175')
            apres = page.locator('.ros-manifeste-texte p').evaluate('(e) => parseFloat(getComputedStyle(e).fontSize)')
            self.assertGreater(apres, avant)
            panel.press('Escape')
            page.wait_for_function("document.activeElement.dataset.mode === 'confort'")
            self.assertEqual(page.evaluate('document.documentElement.scrollWidth'), width)
            self.mode(page, 'formes')
            self.mode(page, 'structure-2')
            self.assertTrue(self.code(page).startswith('5D-3'))
            self.mode(page, '__retour')
            self.mode(page, 'rosaces')
            self.mode(page, 'rosace-suivante')  # le parcours reste utilisable en liste et texte agrandi
            self.assertEqual(self.code(page), page.locator('.ros-galerie-grille button').first.get_attribute('data-code'))
            self.mode(page, 'rosace-choisir')
            self.assertTrue(page.locator('.ros-disque [data-mode="rosace-1"]').is_visible())
            self.mode(page, '__suite')
            self.assertEqual(page.evaluate('document.documentElement.scrollWidth'), width)
            page.context.close()

    def test_disque_collection_sur_mobile(self):
        for width, height in [(320, 700), (390, 844)]:
            page = self.page(width, height)
            self.ouvrir(page)
            codes = page.locator('.ros-galerie-grille button').evaluate_all('(es) => es.map(e => e.dataset.code)')
            self.mode(page, 'rosaces')
            self.mode(page, 'rosace-suivante')
            self.assertEqual(self.code(page), codes[1])
            self.mode(page, 'rosace-choisir')
            tailles = page.locator('.ros-disque [role=menuitem]').evaluate_all('(es) => es.map(e => [e.getBoundingClientRect().width, e.getBoundingClientRect().height])')
            self.assertTrue(all(w >= 44 and h >= 44 for w, h in tailles))
            for _ in range(24):
                if page.locator('.ros-disque [data-mode="rosace-64"]').count():
                    break
                self.mode(page, '__suite')
            else:
                self.fail('La pagination mobile ne mène pas à la rosace 64')
            self.mode(page, 'rosace-64')
            self.assertEqual(self.code(page), codes[63])
            grille = page.locator('.ros-galerie-grille')
            self.assertEqual(len(grille.evaluate('(e) => getComputedStyle(e).gridTemplateColumns.split(" ")')), 2)
            premier = grille.locator('button').first
            premier.focus()
            premier.press('ArrowDown')
            self.assertEqual(page.evaluate('document.activeElement.dataset.rosaceNumero'), '3')
            self.assertEqual(page.evaluate('document.documentElement.scrollWidth'), width)
            page.context.close()

    def test_animation_si_autorisee(self):
        page = self.page(motion='no-preference')
        self.ouvrir(page)
        code = self.code(page)
        page.get_by_role('button', name='Voir naître').click()
        page.wait_for_function("Number(document.querySelector('.ros-centre-motif canvas').dataset.progression) < 95")
        page.wait_for_function("document.querySelector('.ros-centre-motif canvas').dataset.progression === '100'", timeout=8000)
        self.assertEqual(self.code(page), code)
        page.get_by_role('button', name='Voir naître').click()
        page.wait_for_function("Number(document.querySelector('.ros-centre-motif canvas').dataset.progression) < 95")
        page.emulate_media(reduced_motion='reduce')
        page.wait_for_function("document.querySelector('.ros-centre-motif canvas').dataset.progression === '100'", timeout=3000)
        self.assertIn('Mouvement réduit', page.locator('.ros-hero > [role=status]').text_content())


if __name__ == '__main__':
    unittest.main(verbosity=2)
