"""Parcours de bout en bout : /moments (bandeau, cinq lectures, recherche, mobile), un moment ouvert, le support A4 et /musique.
Usage : npm run build && npx vite preview --port 4610, puis  python3 tests/e2e/moments.py  (Playwright pour Python, pdfinfo).
Les API sont simulées : aucune donnée réelle n'est lue ni écrite."""
import json, re, subprocess
from playwright.sync_api import sync_playwright
import os, sys, tempfile
B=os.environ.get('BASE','http://localhost:4610'); OUT=tempfile.mkdtemp(prefix='aime-e2e-')+'/'
NP=int(subprocess.run(['node','-e',"import('./src/lib/programme-outils.mjs').then(P=>console.log(P.chercher(require('./src/data/programme.json'),'piscine').length))"],capture_output=True,text=True).stdout)
echecs=[]
res=[]; errs=[]
resultats=[]
def ok(c, nom):
    print(('OK ' if c else 'ÉCHEC ')+nom, flush=True)
    resultats.append({'test': nom, 'ok': bool(c)})
    if not c: echecs.append(nom)
def api_factory(connecte):
    def api(route):
        u=route.request.url
        if '/api/auth/get-session' in u:
            return route.fulfill(status=200, content_type='application/json', body=json.dumps({'user':{'id':'u1','email':'test@example.org','name':'Test'}} if connecte else None))
        if '/api/musique?moi=1' in u and connecte:
            return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok':True,'musiques':[{'id':'a','source':'deezer','deezer':3135556,'titre':'Morceau test','artiste':'Artiste test','pochette':'','lien':'','moment':'ouverture'}]}))
        return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok':False}))
    return api
with sync_playwright() as p:
    b=p.chromium.launch()
    def page(w=1440,h=1000,connecte=False):
        pg=b.new_page(viewport={'width':w,'height':h})
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type=='error' and 'Failed to load resource' not in m.text else None)
        pg.route('**/api/**', api_factory(connecte)); return pg
    # 1. aperçu global + cinq lectures de la liste
    pg=page(); pg.goto(B+'/moments'); pg.wait_for_timeout(600)
    ok(pg.locator('.m200-etapes li').count()==10, 'bandeau : 10 étapes')
    ok(pg.locator('.m200-item').count()==200, 'liste : 200 moments')
    ok(pg.locator('.dock-bas a.lieu').count()==1, 'dock : un seul repère, pas de doublon du bandeau')
    pg.screenshot(path=OUT+'moments.png')
    for lid, nom, sel in [('musique','Musique','.segment-musique'),('metiers','Métiers','.m200-plus'),('patron','Patron','.patron.petit'),('personnes','Personnes','.pastille.forte'),('chrono','Chronologie','.pastille')]:
        pg.get_by_role('tab', name=nom).click(); pg.wait_for_timeout(250)
        ok(pg.get_by_role('tab', name=nom).get_attribute('aria-selected')=='true' and pg.locator(sel).count()>0 and (lid=='chrono' or 'lecture='+lid in pg.url), 'liste, lecture '+nom)
        if lid=='musique': ok(pg.locator('.segment-musique').count()==10, 'lecture Musique : 10 bandeaux = /musique')
        if lid in ('musique','patron'): pg.screenshot(path=OUT+'moments-'+lid+'.png')
    # clavier sur les onglets
    pg.get_by_role('tab', name='Chronologie').focus(); pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(150)
    ok(pg.get_by_role('tab', name='Musique').get_attribute('aria-selected')=='true', 'onglets au clavier')
    # 2. recherche
    pg.goto(B+'/moments'); pg.fill('input[type=search]','piscine'); pg.wait_for_timeout(600)
    ok(pg.locator('.m200-item').count()==NP and str(NP) in pg.locator('.m200-etat').inner_text() and 'q=piscine' in pg.url, 'recherche « piscine » : %d moments'%NP)
    pg.fill('input[type=search]','malik alliances'); pg.wait_for_timeout(600)
    ok(pg.locator('.m200-item').count()==3, 'recherche « malik alliances » : 3 moments')
    pg.screenshot(path=OUT+'recherche.png')
    pg.get_by_role('button', name='Tout afficher').click(); pg.wait_for_timeout(400)
    ok(pg.locator('.m200-item').count()==200, 'tout afficher')
    pg.goto(B+'/moments?qui=dj'); pg.wait_for_timeout(500)
    ok(pg.locator('.m200-item').count()==31, 'filtre personne/métier : DJ 31')
    # 3. un moment : cinq lectures
    pg.goto(B+'/moments/day-first-dance'); pg.wait_for_timeout(500)
    for nom, titre in [('Chronologie','Sa place dans le programme'),('Musique','La musique du moment'),('Métiers','Les métiers du moment'),('Patron','Le patron du moment'),('Personnes','Les personnes du moment')]:
        pg.get_by_role('tab', name=nom).click(); pg.wait_for_timeout(250)
        ok(pg.locator('#moment-panneau h2').first.inner_text()==titre, 'moment, lecture '+nom)
    ok(pg.locator('.dock-bas .lieu').count()==3, 'dock du moment : précédent, position, suivant (pas les onglets)')
    pg.locator('.dock-bas button.lieu').last.click(); pg.wait_for_timeout(400)
    ok('day-dj-dance-set' in pg.url and 'lecture=personnes' in pg.url, 'suivant garde la lecture')
    pg.close()
    # 4. mobile
    pg=page(390,844); pg.goto(B+'/moments'); pg.wait_for_timeout(600)
    ol=pg.locator('.m200-etapes ol')
    ok(pg.evaluate("document.documentElement.scrollWidth")<=390, 'mobile : pas de défilement horizontal de la page')
    ok(ol.evaluate("e=>e.scrollWidth>e.clientWidth"), 'mobile : bandeau défilant')
    pg.screenshot(path=OUT+'m-moments.png')
    pg.locator('.m200-etapes a', has_text='Le lendemain').click(); pg.wait_for_timeout(900)
    top=pg.evaluate("document.getElementById('etape-next-day').getBoundingClientRect().top")
    ok(0<=top<400, 'mobile : l’étape choisie arrive à l’écran (%d)'%top)
    ok('Le lendemain' in pg.locator('.dock-bas a.lieu').inner_text(), 'mobile : le dock indique l’étape')
    ok(pg.locator('.m200-etapes a[aria-current=location]', has_text='Le lendemain').count()==1, 'mobile : le bandeau allume l’étape')
    pg.screenshot(path=OUT+'m-lendemain.png')
    pg.goto(B+'/moments/day-first-dance?lecture=patron'); pg.wait_for_timeout(500)
    ok(pg.evaluate("document.documentElement.scrollWidth")<=390, 'mobile : moment sans débordement')
    pg.close()
    # 5. impression A4
    for pour, contenu in [('tous','jour'),('maries','jour'),('dj','autour')]:
        pg=page(); pg.goto(B+'/moments/support?pour=%s&contenu=%s'%(pour,contenu)); pg.wait_for_timeout(600)
        if pour=='tous': pg.screenshot(path=OUT+'support-ecran.png', full_page=False)
        pg.emulate_media(media='print')
        cach=pg.evaluate("['.tete','.dock-bas','.support-outils','button','select'].map(s=>[...document.querySelectorAll(s)].every(e=>getComputedStyle(e).display==='none'||e.closest('.ecran-seul')&&getComputedStyle(e.closest('.ecran-seul')).display==='none'))")
        ok(all(cach), 'impression %s : aucun élément interactif'%pour)
        f=OUT+'support-%s.pdf'%pour; pg.pdf(path=f, format='A4', print_background=True, prefer_css_page_size=True)
        info=subprocess.run(['pdfinfo',f],capture_output=True,text=True).stdout
        pages=int(re.search(r'Pages:\s+(\d+)',info).group(1)); taille=re.search(r'Page size:\s+([\d.]+) x ([\d.]+)',info)
        ok(abs(float(taille.group(1))-595.28)<2 and abs(float(taille.group(2))-841.89)<2, 'impression %s : A4 (%s pages)'%(pour,pages))
        subprocess.run(['pdftoppm','-png','-r','60','-f','1','-l','2',f,OUT+'pdf-'+pour])
        pg.close()
    # 6. /musique : non-régression
    pg=page(connecte=True); pg.goto(B+'/musique'); pg.wait_for_timeout(800)
    ok(pg.locator('.journee > li').count()==10, '/musique : 10 moments')
    ok(pg.locator('.moment-programme a').count()==10, '/musique : 10 liens vers le programme')
    ok(pg.get_by_text('Morceau test').count()==1, '/musique : mes morceaux affichés')
    ok(pg.get_by_role('button', name=re.compile('Écouter toute la journée')).count()==1, '/musique : écouter toute la journée')
    ok(pg.get_by_role('button', name='+ Ajouter un morceau').count()==10, '/musique : ajouter un morceau par moment')
    pg.locator('.moment-programme a').nth(7).click(); pg.wait_for_timeout(700)
    ok('lecture=musique' in pg.url and pg.locator('.segment-musique', has_text='L’ouverture du bal').count()==1, '/musique → programme, lecture Musique')
    ok(pg.locator('.segment-musique', has_text='Morceau test').count()==1, 'le morceau apparaît aussi dans le programme')
    pg.close()
    # 7. accueil
    pg=page(); pg.goto(B+'/'); pg.wait_for_timeout(600)
    ok(pg.locator('.diapo-moment').count()==1 and pg.locator('#moments .etapes200 li').count()==10, 'accueil : diapo raccordée et bande des étapes')
    pg.close(); b.close()


sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from preuves import enregistrer_preuve
ok(not errs, 'aucune erreur dans la console')
enregistrer_preuve('tests/e2e/moments.py', resultats, 'aperçu local (vite preview), API simulées')
print('ERREURS', errs); print('Captures et PDF :', OUT)
sys.exit(1 if echecs or errs else 0)
