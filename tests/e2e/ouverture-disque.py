"""Ouverture Fleur + Disque partagé, en Chromium émulé (pas une validation humaine).

Après le build et le démarrage d'un serveur local reproduisant /studio/ :
    BASE=http://localhost:4610 python3 tests/e2e/ouverture-disque.py
Définir CHROMIUM_EXECUTABLE_PATH si Chromium n'est pas installé par Playwright.
Aucune API distante, donnée de compte, vidéo ni archive n'est modifiée.
"""
import os
import re
import sys
from playwright.sync_api import sync_playwright

BASE = os.environ.get('BASE', 'http://localhost:4610').rstrip('/')
RESULTATS = []


def verifier(condition, nom, detail=None):
    RESULTATS.append(bool(condition))
    print(('OK ' if condition else 'ÉCHEC ') + nom + (f' : {detail}' if detail else ''), flush=True)


def ouvrir(browser, largeur=390, reduit=False):
    context = browser.new_context(viewport={'width': largeur, 'height': 844}, device_scale_factor=1,
                                  reduced_motion='reduce' if reduit else 'no-preference')
    return context, context.new_page()


with sync_playwright() as p:
    options = {'args': ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle',
                        '--use-angle=swiftshader', '--enable-unsafe-swiftshader']}
    if os.environ.get('CHROMIUM_EXECUTABLE_PATH'):
        options['executable_path'] = os.environ['CHROMIUM_EXECUTABLE_PATH']
    navigateur = p.chromium.launch(**options)
    contexte, page = ouvrir(navigateur)
    erreurs, requetes = [], []
    page.on('pageerror', lambda e: erreurs.append(str(e)))
    page.on('request', lambda r: requetes.append(r.url))
    page.goto(BASE + '/?ouverture=1&qualite=0.3', wait_until='domcontentloaded', timeout=60000)
    page.wait_for_selector('.ouv', timeout=60000)
    page.wait_for_timeout(500)
    verifier(not any('/studio/clip/fleur-du-ciel/' in u for u in requetes), 'aucun média de la fleur demandé avant un geste')
    verifier(page.locator('.clip-integre').count() == 0, 'pas de lecteur avant un geste')
    page.get_by_role('button', name='Lancer avec le son').click(timeout=30000)
    page.wait_for_selector('.clip-integre[data-lecture="oui"]', timeout=60000)
    page.wait_for_function("document.querySelector('.clip-integre audio')?.currentTime > 1", timeout=60000)
    etat = page.locator('.clip-integre').evaluate("e => ({guide:e.dataset.guide,replie:e.dataset.replie,t:e.querySelector('audio').currentTime,paused:e.querySelector('audio').paused})")
    verifier(not etat['paused'] and etat['t'] > 0, 'lecture audio démarrée', etat)
    verifier(page.locator('.clip-integre canvas.clip-toile').count() == 1, 'une seule toile du lecteur')
    verifier('Gestes scénarisés' in page.locator('.ouv-transparence').inner_text(), 'gestes annoncés comme scénarisés')
    verifier(page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'mobile 390 : pas de débordement horizontal')
    page.get_by_role('button', name='Pause', exact=True).click(timeout=30000)
    t1 = page.locator('.clip-integre audio').evaluate('e => e.currentTime')
    page.wait_for_timeout(600)
    t2 = page.locator('.clip-integre audio').evaluate('e => e.currentTime')
    verifier(abs(t2 - t1) < .15, 'pause arrête le son et son horloge', (t1, t2))
    page.get_by_role('button', name='Couper le son').click()
    verifier(page.locator('.clip-integre audio').evaluate('e => e.muted'), 'couper le son')
    page.get_by_role('button', name='Remettre le son').click()
    verifier(not page.locator('.clip-integre audio').evaluate('e => e.muted'), 'remettre le son')
    page.get_by_role('button', name='Reprendre', exact=True).click()
    page.wait_for_selector('.clip-integre[data-lecture="oui"]', timeout=30000)
    # Avancer l'élément audio pour vérifier le repli sans attendre le film entier.
    page.locator('.clip-integre audio').evaluate('e => { e.currentTime = 11 }')
    page.wait_for_selector('.clip-integre[data-replie="oui"]', timeout=30000)
    verifier(page.locator('.clip-integre .clip-disque').count() == 0, 'le Disque est replié après la démonstration')
    page.get_by_role('button', name='Le Disque', exact=True).click(timeout=30000)
    page.wait_for_selector('.clip-integre[data-replie="non"]', timeout=30000)
    verifier(page.locator('.clip-integre .pzt-anneau').count() == 1, 'rappel manuel : un seul Disque')
    loupe = page.locator('.clip-integre [data-mode="loupe"]')
    avant = loupe.locator('.lp-marque').count()
    loupe.click(timeout=30000)
    verifier(loupe.locator('.lp-marque').count() != avant, 'la vraie commande Loupe réagit au clic')
    page.locator('.clip-integre [data-mode="fils"]').click(timeout=30000)
    page.wait_for_selector('.clip-integre [data-mode="fils-tout"]', timeout=30000)
    fil = page.locator('.clip-integre [data-mode^="fil-"]').first
    fil.click(timeout=30000)
    verifier(fil.locator('.lp-marque').count() == 1, 'un fil du vrai nuancier peut être choisi')
    page.evaluate("window.__audioAvantFermeture = document.querySelector('.clip-integre audio')")
    page.get_by_role('button', name=re.compile('Passer l’introduction')).click(timeout=30000)
    page.wait_for_selector('.ouv-bande', timeout=30000)
    verifier(page.locator('.clip-integre').count() == 0 and page.evaluate("window.__audioAvantFermeture.paused && !window.__audioAvantFermeture.getAttribute('src')"), 'passer : lecteur démonté et audio arrêté')
    verifier(not erreurs, 'aucune erreur JavaScript', erreurs[:2])
    contexte.close()

    # Une fermeture pendant le chargement ne doit pas relancer le lecteur plus tard.
    contexte, page = ouvrir(navigateur)
    erreurs = []
    page.on('pageerror', lambda e: erreurs.append(str(e)))
    page.add_init_script("""(() => {
      const fetchOrigine = window.fetch;
      window.fetch = (url, init = {}) => {
        if (!String(url).endsWith('/clip.json')) return fetchOrigine(url, init);
        window.__chargementEnCours = true;
        return new Promise((resolve, reject) => {
          const id = setTimeout(() => fetchOrigine(url, init).then(resolve, reject), 2500);
          init.signal?.addEventListener('abort', () => {
            clearTimeout(id); window.__chargementAnnule = true;
            reject(new DOMException('Abandonné', 'AbortError'));
          }, { once: true });
        });
      };
    })()""")
    page.goto(BASE + '/?ouverture=1&qualite=0.3', wait_until='domcontentloaded', timeout=60000)
    page.get_by_role('button', name='Lancer avec le son').click(timeout=30000)
    page.wait_for_function('window.__chargementEnCours === true', timeout=30000)
    page.get_by_role('button', name=re.compile('Passer l’introduction')).click(timeout=30000)
    page.wait_for_function('window.__chargementAnnule === true', timeout=30000)
    page.wait_for_timeout(2700)
    verifier(page.locator('.ouv-bande').count() == 1 and page.locator('.clip-integre').count() == 0,
             'passer pendant le chargement annule sans relancer')
    verifier(not erreurs, 'aucune erreur après annulation', erreurs[:2])
    contexte.close()

    # Le mouvement réduit supprime la chorégraphie automatique, mais pas l'accès manuel.
    contexte, page = ouvrir(navigateur, reduit=True)
    page.goto(BASE + '/?ouverture=1&qualite=0.3', wait_until='domcontentloaded', timeout=60000)
    page.get_by_role('button', name='Lancer avec le son').click(timeout=30000)
    page.wait_for_selector('.clip-integre[data-lecture="oui"]', timeout=60000)
    page.wait_for_function("document.querySelector('.clip-integre audio')?.currentTime > 1", timeout=60000)
    verifier(page.locator('.clip-pointeur-demo').count() == 0 and page.locator('.clip-integre').get_attribute('data-replie') == 'oui',
             'mouvement réduit : aucune chorégraphie automatique')
    page.get_by_role('button', name='Le Disque', exact=True).click(timeout=30000)
    verifier(page.locator('.clip-integre .pzt-anneau').count() == 1, 'mouvement réduit : Disque accessible manuellement')
    contexte.close()
    navigateur.close()

print(f'— {sum(RESULTATS)}/{len(RESULTATS)}')
sys.exit(0 if all(RESULTATS) else 1)
