"""Point Zéro sur téléphone : aucun débordement horizontal, aucun bouton à moitié coupé, aucun recouvrement inutile.
Largeurs 320, 360, 390, 430 ; texte agrandi (Confort à 150 %), mouvements réduits, clavier.
États réels : Cadre vide, Point fermé, Point ouvert, Loupe ouverte, Composition 5D, panneau Confort, Mes ouvrages, Import PDF.
Usage : cd studio && npx vite build && npx vite preview --port 4620, puis  python3 tests/e2e/mobile.py
Captures : CAPTURES=<dossier> ; RAPPORT=<fichier.json> pour garder les défauts relevés (comparaison avant / après).
Un conteneur à défilement voulu porte [data-defile] : ses boutons peuvent sortir de sa zone (on les y fait défiler)."""
import os, sys, json
from playwright.sync_api import sync_playwright

B = os.environ.get('BASE', 'http://localhost:4620')
CAP = os.environ.get('CAPTURES'); RAPPORT = os.environ.get('RAPPORT')
PDF = os.environ.get('PDF_ESSAI')
resultats, erreurs, releve = [], [], {}
def ok(c, nom):
    print(('OK ' if c else 'ÉCHEC ') + nom, flush=True); resultats.append(bool(c))

AUDIT = r"""portee => {
  const d = [], W = innerWidth, H = innerHeight;
  const sw = document.documentElement.scrollWidth;
  if (sw > W + 1) d.push('débordement horizontal de la page (' + sw + ' px pour ' + W + ')');
  const zone = portee ? document.querySelector(portee) : document.body;
  if (!zone) return ['zone absente : ' + portee];
  const rz = zone.getBoundingClientRect();
  if (portee && (rz.left < -1 || rz.right > W + 1 || rz.top < -1 || rz.bottom > H + 1)) d.push('la zone ouverte sort de l’écran');
  const visible = e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    return r.width > 1 && r.height > 1 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05 && !e.closest('[aria-hidden="true"]') && !e.classList.contains('sr-only'); };
  const nom = e => (e.getAttribute('aria-label') || e.textContent || e.tagName).replace(/\s+/g, ' ').trim().slice(0, 42);
  const els = [...zone.querySelectorAll('button, a[href], input:not([type=hidden]), select, [role=menuitem]')].filter(visible).filter(e => !(e.tagName === 'INPUT' && ['file'].includes(e.type)));
  for (const e of els) {
    const r = e.getBoundingClientRect();
    if (r.bottom <= 0 || r.top >= H) continue; // hors de l'écran (lien d'évitement révélé au focus, contenu plus bas que la page)
    const defile = e.closest('[data-defile]');
    if (defile) { const rd = defile.getBoundingClientRect(); // défilement voulu et signalé : un bouton hors de sa zone y est atteint en faisant défiler
      if (r.right <= rd.left + 2 || r.left >= rd.right - 2 || r.bottom <= rd.top + 2 || r.top >= rd.bottom - 2) continue;
      if (r.left < rd.left - 1 || r.right > rd.right + 1 || r.top < rd.top - 1 || r.bottom > rd.bottom + 1) continue; } // au bord, sous le fondu qui l'annonce
    if (!defile && (r.left < -1 || r.right > W + 1)) { d.push('coupé par le bord de l’écran : ' + nom(e)); continue; }
    let a = e.parentElement;
    while (a && a !== document.body && a !== document.documentElement) {
      const cs = getComputedStyle(a);
      if (/(hidden|auto|scroll|clip)/.test(cs.overflowX + ' ' + cs.overflowY) && !a.hasAttribute('data-defile')) {
        const ra = a.getBoundingClientRect();
        const dedans = r.left >= ra.left - 1 && r.right <= ra.right + 1 && r.top >= ra.top - 1 && r.bottom <= ra.bottom + 1;
        if (!dedans) { d.push('à moitié coupé : ' + nom(e)); break; }
      }
      a = a.parentElement;
    }
    if (r.top >= 0 && r.bottom <= H && r.left >= 0 && r.right <= W) {
      const pts = [[r.left + r.width / 2, r.top + r.height / 2]];
      for (const [x, y] of pts) { const h = document.elementFromPoint(x, y);
        if (h && h !== e && !e.contains(h) && !h.contains(e)) { d.push('recouvert : ' + nom(e) + ' (par ' + String(h.className || h.tagName).split(' ')[0].slice(0, 28) + ')'); break; } }
    }
  }
  return [...new Set(d)];
}"""
# Les couches : le cadre fixe (docks), les surfaces ouvertes (menus, panneaux, loupe), le contenu (accueil du Cadre, étiquette du Cadre).
# Défaut : un dock sur le contenu, une surface ouverte sur un dock, deux surfaces ouvertes l'une sur l'autre.
# Voulu : une surface ouverte au-dessus du contenu (elle se referme).
CHEVAUCHE = r"""() => {
  const groupe = { docks: ['.pzs-top:not(.pzs-ouvert)', '.pzs-bottom', '.cr-point', '.lp-bloc'], ouverts: ['.pzs-top.pzs-ouvert', '.lp-panneau', '[data-presentation]', '.pzs-loupe-dock'], contenu: ['.pz-point-zero > *', '.cadre-tete'] };
  const vis = []; for (const [g, sels] of Object.entries(groupe)) for (const s of sels) for (const e of document.querySelectorAll(s)) {
    const r = e.getBoundingClientRect(); if (!(r.width > 1 && r.height > 1 && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden')) continue;
    const h = document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2)));
    if (h && !e.contains(h) && !h.contains(e) && h.closest('.cr, [data-studio]')) continue; // derrière un studio plein écran : invisible, donc pas de chevauchement vu
    vis.push({ g, s, e, r }); }
  const out = [];
  for (let i = 0; i < vis.length; i++) for (let j = i + 1; j < vis.length; j++) { const A = vis[i], B = vis[j];
    if (A.e.contains(B.e) || B.e.contains(A.e) || A.s === B.s) continue;
    const w = Math.min(A.r.right, B.r.right) - Math.max(A.r.left, B.r.left), h = Math.min(A.r.bottom, B.r.bottom) - Math.max(A.r.top, B.r.top);
    if (w <= 4 || h <= 4) continue;
    const gs = [A.g, B.g].sort().join('+');
    if (gs === 'contenu+ouverts' || gs === 'contenu+contenu') continue;
    out.push(A.s + ' × ' + B.s + ' (' + Math.round(w) + '×' + Math.round(h) + ')'); }
  return out; }"""

def etats(pg, largeur):
    """Chaque état réel : un nom, comment l'atteindre, la zone à auditer (None : toute la page)."""
    def point(): pg.locator('.lp-point').first.click(); pg.wait_for_timeout(250)
    # (essai bloc : le Point est sur le bord du Cadre ; les mêmes états s'atteignent par lui)
    def mode(m): point(); pg.locator(f'[data-presentation] [data-mode={m}]').click(); pg.wait_for_timeout(300)
    yield 'cadre-vide', None
    yield 'point-ouvert', (point, '[data-presentation]')
    yield 'loupe', (lambda: mode('loupe'), None)
    yield 'confort', (lambda: mode('confort'), '.lp-panneau')
    yield 'ouvrages', (lambda: (pg.locator('[data-guide=profil]').click(), pg.wait_for_timeout(300)), '.pzs-top')
    yield 'composition-5d', (lambda: (pg.locator('.pz-point-zero-composer').click(), pg.wait_for_timeout(500)), '.cr')
    if PDF:
        yield 'import-pdf', (lambda: (pg.locator('input[aria-label^="Importer une image, un PDF"]').set_input_files(PDF), pg.wait_for_timeout(2500)), '[data-studio="import-pdf"]')

def passe(b, largeur, variante):
    hauteur = 740 if largeur <= 360 else 844
    ctx = b.new_context(viewport={'width': largeur, 'height': hauteur}, has_touch=True, is_mobile=True, reduced_motion='reduce' if variante != 'standard' else 'no-preference')
    init = "localStorage.setItem('pointzero:visite-docks:v1','vue');"
    if os.environ.get('ESSAI_BLOC'): init += "localStorage.setItem('pointzero:essai:outils-sur-le-bloc','1');"
    if variante == 'texte-150':
        init += "localStorage.setItem('pointzero:accessibility:v1', JSON.stringify({version:1,theme:'system',vision:'standard',fontScale:1.5,lineHeight:1.5,spacing:0,contrast:'normal',reduceMotion:true,enhancedFocus:false,readingGuide:false,privacyBlur:false,accent:'#7562ce'}));"
    ctx.add_init_script(init)
    for nom, suite in etats_noms():
        pg = ctx.new_page(); pg.set_default_timeout(8000)
        pg.on('pageerror', lambda e: erreurs.append(str(e)))
        pg.goto(B + '/atelier'); pg.wait_for_selector('.lp-point')
        portee = None; bloque = []
        pg.set_default_timeout(3000)
        for n2, s2 in etats(pg, largeur):
            if n2 != nom: continue
            if s2:
                try: s2[0](); portee = s2[1]
                except Exception as e: bloque.append('état inatteignable (commande cachée ou recouverte) : ' + str(e).split('\n')[0][:90]); portee = None
        defauts = bloque + pg.evaluate(AUDIT, portee) + pg.evaluate(CHEVAUCHE)
        cle = f'{largeur}-{variante}-{nom}'; releve[cle] = defauts
        if CAP: os.makedirs(CAP, exist_ok=True); pg.screenshot(path=os.path.join(CAP, f'{nom}-{largeur}-{variante}.png'))
        ok(not defauts, f'{largeur} px · {variante} · {nom}' + ('' if not defauts else ' : ' + ' ; '.join(defauts[:4]) + (f' (+{len(defauts) - 4})' if len(defauts) > 4 else '')))
        pg.close()
    ctx.close()

def etats_noms():
    noms = ['cadre-vide', 'point-ouvert', 'loupe', 'confort', 'ouvrages', 'composition-5d'] + (['import-pdf'] if PDF else [])
    return [(n, None) for n in noms]

def clavier(b, largeur):
    """Au clavier seul, chaque commande du dock du bas atteinte par Tab est entièrement visible quand elle a le focus."""
    ctx = b.new_context(viewport={'width': largeur, 'height': 740}, reduced_motion='reduce')
    ctx.add_init_script("localStorage.setItem('pointzero:visite-docks:v1','vue')")
    pg = ctx.new_page(); pg.goto(B + '/atelier'); pg.wait_for_selector('.lp-point')
    pg.locator('.lp-point').focus(); caches = []
    for _ in range(14):
        pg.keyboard.press('Tab'); pg.wait_for_timeout(60)
        r = pg.evaluate("(() => { const e = document.activeElement; if (!e || !e.closest('.pzs-bottom')) return null; const r = e.getBoundingClientRect(); return { n: (e.getAttribute('aria-label') || e.textContent).trim().slice(0, 30), l: r.left, r: r.right, W: innerWidth }; })()")
        if r and (r['l'] < -1 or r['r'] > r['W'] + 1): caches.append(r['n'])
    ok(not caches, f'{largeur} px · clavier : chaque bouton du dock du bas est visible quand il a le focus {caches}')
    ctx.close()

with sync_playwright() as p:
    b = p.chromium.launch()
    for largeur in (320, 360, 390, 430):
        for variante in ('standard', 'texte-150'):
            passe(b, largeur, variante)
        clavier(b, largeur)
    b.close()
ok(not erreurs, 'aucune erreur dans la page ' + str(erreurs[:3]))
if RAPPORT:
    with open(RAPPORT, 'w') as f: json.dump(releve, f, ensure_ascii=False, indent=1)
total = sum(len(v) for v in releve.values())
print(f'— {total} défauts relevés sur {len(releve)} écrans', flush=True)
sys.exit(0 if all(resultats) else 1)
