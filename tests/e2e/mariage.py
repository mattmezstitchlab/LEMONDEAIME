"""LE MARIAGE, premier parcours, de bout en bout, sans API simulée : vrai navigateur (ordinateur et téléphone), site construit (dist/), VRAIS gestionnaires
(Better Auth, /api/buro) et base PostgreSQL de TEST isolée. Parcours : Accueil → Organiser → AIME Wedding → Créer notre mariage → connexion (lien réel) → Noms → Date → Lieu →
Enregistrer → Mes projets → quitter → se reconnecter → Rouvrir → Modifier → droits, double création, anciennes données, conflit.
Usage : npm run build ; BASE_TEST_URL=postgres://postgres@127.0.0.1:5545/aime_test3?sslmode=disable PORT=8775 node tests/base/serveur-local.mjs &
        BASE=http://localhost:8775 BASE_TEST_URL=… python3 tests/e2e/mariage.py"""
import json, os, subprocess, sys, secrets, urllib.request, uuid
from playwright.sync_api import sync_playwright

B = os.environ.get('BASE', 'http://localhost:8775')
DB = os.environ.get('BASE_TEST_URL', 'postgres://postgres@127.0.0.1:5544/aime_test?sslmode=disable')
CAP = os.environ.get('CAPTURES')
resultats, erreurs = [], []
def ok(c, nom, detail=''):
    print(('OK ' if c else 'ÉCHEC ') + nom + ((' — ' + str(detail)) if (detail and not c) else ''), flush=True); resultats.append(bool(c))
def sql(q):
    r = subprocess.run(['psql', DB, '-At', '-F', '\x1f', '-R', '\x1e', '-c', q], capture_output=True, text=True)   # séparateurs de contrôle : les descriptions ont des retours à la ligne
    if r.returncode: raise RuntimeError(r.stderr)
    return [l.split('\x1f') for l in r.stdout.rstrip('\n').split('\x1e') if l.strip('\n')]
def capture(pg, nom):
    if CAP: os.makedirs(CAP, exist_ok=True); pg.screenshot(path=os.path.join(CAP, nom + '.png'), full_page=True)
garde = sql("select to_regclass('public.aime_base_de_test')")[0][0]
if garde != 'aime_base_de_test': print('Refus : base non marquée comme base de test.'); sys.exit(3)

def contexte(b, largeur, ip):
    mob = largeur < 700
    ctx = b.new_context(viewport={'width': largeur, 'height': 844 if mob else 900}, reduced_motion='reduce', has_touch=mob, is_mobile=mob, extra_http_headers={'x-forwarded-for': ip})
    ctx.set_default_timeout(8000); return ctx
def page(ctx):
    pg = ctx.new_page(); pg.on('pageerror', lambda e: erreurs.append(str(e))); return pg
def se_connecter(pg, email):
    """depuis /buro sans session : le formulaire d'entrée, puis le lien reçu (lu sur le serveur de test)"""
    pg.locator('main input[type=email]').fill(email); pg.get_by_role('button', name='Recevoir mon lien').click()
    pg.wait_for_selector('.entrer-etat:has-text("Lien envoyé")')
    lien = urllib.request.urlopen(B + '/__test/lien?email=' + email).read().decode()
    pg.goto(lien); pg.wait_for_selector('text=Votre espace AIME'); pg.wait_for_selector('button:has-text("Nouveau projet"), form[aria-label="Créer notre mariage"]')


H = None
with sync_playwright() as p:
    b = p.chromium.launch()
    for nom, largeur in (('ordinateur', 1440), ('téléphone', 390)):
        t = nom + ' · '; jeton = secrets.token_hex(3); email = 'camille-' + jeton + '@test.lemondeaime.invalid'; oct = int(jeton, 16) % 200 + 20; ip = '10.%d.%d.1' % (oct, 1 if largeur > 700 else 2)
        H = {'origin': B, 'content-type': 'application/json'}
        A_, B_ = 'Camille ' + jeton, 'Gabriel ' + jeton   # données explicitement fictives
        ctx = contexte(b, largeur, ip); pg = page(ctx)
        # 1 · Accueil → Organiser → AIME Wedding → Créer notre mariage
        pg.goto(B + '/'); pg.wait_for_selector('h1'); pg.locator('a.ac-chemin[data-chemin=organiser]').click(); pg.wait_for_url('**/aime-wedding')
        ok(pg.get_by_role('link', name='Créer notre mariage').count() == 1, t + 'Organiser mène à AIME Wedding, qui porte « Créer notre mariage »')
        pg.get_by_role('link', name='Créer notre mariage').click(); pg.wait_for_url('**/buro**')
        pg.wait_for_selector('main input[type=email]')
        ok(sql('select count(*) from spaces')[0][0] == '0', t + 'sans session, rien n’est créé')
        se_connecter(pg, email)
        pg.wait_for_selector('form[aria-label="Créer notre mariage"]')
        ok(True, t + 'après la connexion, le formulaire « Créer notre mariage » s’ouvre (l’intention a survécu à la connexion)')
        uid = sql('select id from "user" where email = \'%s\'' % email)[0][0]
        # 2 · Noms → Date → Lieu → Enregistrer
        pg.get_by_role('button', name='Continuer').click()
        ok('deux noms' in pg.inner_text('form[aria-label="Créer notre mariage"]'), t + 'étape Noms : les deux noms sont exigés')
        pg.get_by_label('Première personne').fill(A_); pg.get_by_label('Seconde personne').fill(B_); pg.get_by_role('button', name='Continuer').click()
        pg.get_by_label('Date du mariage').fill('2027-06-12'); pg.get_by_role('button', name='Continuer').click()
        pg.get_by_label('Lieu', exact=True).fill('Domaine fictif des Lavandes'); pg.get_by_label('Ville').fill('Aix-en-Provence')
        capture(pg, 'mariage-lieu-' + str(largeur))
        pg.get_by_role('button', name='Enregistrer notre mariage').dblclick()
        pg.wait_for_selector('[role=status]:has-text("est enregistré dans votre espace")'); pg.wait_for_timeout(600)
        lg = sql("select s.id, s.kind, s.title, s.data->>'modele', s.data->'mariage'->>'date', s.data->'mariage'->'lieu'->>'ville', s.data->'mariage'->'noms'->>0, s.data->>'rev', m.role, s.owner_id from spaces s join space_members m on m.space_id = s.id where s.title = '%s'" % (A_ + ' & ' + B_))
        ok(len(lg) == 1, t + 'double clic sur Enregistrer : un seul mariage en base', len(lg))
        mid = lg[0][0]
        ok(lg[0][1] == 'evenement' and lg[0][3] == 'mariage' and lg[0][4] == '2027-06-12' and lg[0][5] == 'Aix-en-Provence' and lg[0][6] == A_ and lg[0][7] == '0' and lg[0][8] == 'owner' and lg[0][9] == uid, t + 'écrit dans spaces (evenement, modèle mariage, fiche) + space_members (propriétaire = la personne connectée)', lg[0])
        ok(not sql("select 1 from spaces where data::text ~* '(iban|FR76)'"), t + 'aucune coordonnée bancaire dans les données du mariage')
        # 3 · Mes projets : la carte affiche date et lieu ; rouvrir
        pg.wait_for_selector('section[aria-label^="Mariage"]')
        ok('12 juin 2027' in pg.inner_text('main') and 'Aix-en-Provence' in pg.inner_text('main'), t + 'Mes projets affiche la date et le lieu du mariage')
        # 4 · quitter, se reconnecter, rouvrir le MÊME mariage
        ctx.close(); ctx = contexte(b, largeur, ip.replace('.1', '.9')); pg = page(ctx)
        pg.goto(B + '/buro'); pg.wait_for_selector('main input[type=email]'); se_connecter(pg, email)
        pg.get_by_role('button', name=A_ + ' & ' + B_).first.click()
        ok(pg.get_by_label('Première personne').input_value() == A_ and pg.get_by_label('Seconde personne').input_value() == B_ and pg.get_by_label('Date').input_value() == '2027-06-12' and pg.get_by_label('Lieu', exact=True).input_value() == 'Domaine fictif des Lavandes' and pg.get_by_label('Ville').input_value() == 'Aix-en-Provence', t + 'reconnexion : la fiche rouvre exactement les noms, la date et le lieu enregistrés')
        ok(sql('select count(*) from spaces where owner_id = \'%s\'' % uid)[0][0] == '1', t + 'reconnexion : toujours un seul espace pour ce compte')
        # 5 · modifier
        pg.get_by_label('Date').fill('2027-09-04'); pg.get_by_label('Ville').fill('Lourmarin')
        pg.get_by_role('button', name='Enregistrer', exact=True).click(); pg.wait_for_selector('[role=status]:has-text("Notre mariage est enregistré")')
        l2 = sql("select data->'mariage'->>'date', data->'mariage'->'lieu'->>'ville', data->'mariage'->'lieu'->>'nom', data->>'rev', data->>'modele' from spaces where id = '%s'" % mid)[0]
        ok(l2 == ['2027-09-04', 'Lourmarin', 'Domaine fictif des Lavandes', '1', 'mariage'], t + 'la modification est écrite (date, ville ; lieu et modèle conservés ; révision 1)', l2)
        pg.reload(); pg.wait_for_selector('text=4 septembre 2027')
        ok(True, t + 'après rechargement, la version modifiée est celle qu’on retrouve')
        # 6 · conflit entre deux onglets
        a = pg; bb = page(ctx); bb.goto(B + '/buro'); bb.wait_for_selector('text=4 septembre 2027')
        for q in (a, bb): q.get_by_role('button', name=A_ + ' & ' + B_).first.click()
        a.get_by_label('Ville').fill('Gordes'); a.get_by_role('button', name='Enregistrer', exact=True).click(); a.wait_for_selector('[role=status]:has-text("Notre mariage est enregistré")')
        bb.get_by_label('Ville').fill('Écrasée'); bb.get_by_role('button', name='Enregistrer', exact=True).click(); bb.wait_for_selector('text=modifié ailleurs')
        ok(sql("select data->'mariage'->'lieu'->>'ville' from spaces where id = '%s'" % mid)[0][0] == 'Gordes', t + 'conflit : l’onglet en retard est refusé, rien n’est écrasé')
        bb.close()
        # 7 · double création côté serveur : cinq envois simultanés avec la même clé
        cle = 'mar-' + jeton + '-simultanee'; corps = {'genre': 'mariage', 'mariage': {'noms': ['Simultané', 'Test']}, 'cle': cle}
        reps = a.evaluate("""async (c) => (await Promise.all([1,2,3,4,5].map(() => fetch('/api/buro', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(c) }).then(async r => [r.status, (await r.json()).id])))) """, corps)
        ok(len(sql("select 1 from spaces where owner_id = '%s' and title = 'Simultané & Test'" % uid)) == 1 and len({x[1] for x in reps}) == 1 and sorted(x[0] for x in reps).count(201) == 1, t + 'cinq créations simultanées avec la même clé : un seul mariage', reps)
        # 8 · validation côté serveur
        for corps, attendu, nom_t in (({'genre': 'mariage', 'mariage': {'noms': ['Seul', '']}}, 400, 'un seul nom'), ({'genre': 'mariage', 'mariage': {'noms': ['A', 'B'], 'date': '2027-02-30'}}, 400, 'une date qui n’existe pas'), ({'genre': 'mariage'}, 400, 'sans fiche')):
            r = ctx.request.post(B + '/api/buro', headers=H, data=json.dumps(corps)); ok(r.status == attendu, t + 'création refusée : ' + nom_t, r.status)
        r = ctx.request.post(B + '/api/buro', headers=H, data=json.dumps({'action': 'maj', 'id': mid, 'mariage': {'date': 'pas-une-date'}, 'rev': 2})); ok(r.status == 400, t + 'modification refusée : date invalide', r.status)
        r = ctx.request.post(B + '/api/buro', headers=H, data=json.dumps({'action': 'maj', 'id': mid, 'mariage': {'noms': ['A', 'B'], 'iban': 'x', 'contact': 'y'}, 'rev': 2}))
        ok(r.status == 200 and sql("select data->'mariage' ? 'iban' or data->'mariage' ? 'contact' from spaces where id = '%s'" % mid)[0][0] == 'f', t + 'une clé inconnue envoyée dans la fiche n’est jamais enregistrée', r.status)
        # 9 · droits : autre compte, membre editor, viewer, editor expiré, contributor
        ctx2 = contexte(b, largeur, '10.%d.5.%d' % (oct, 1 if largeur > 700 else 2)); pg2 = page(ctx2); email2 = 'gabriel-' + jeton + '@test.lemondeaime.invalid'
        pg2.goto(B + '/buro'); pg2.wait_for_selector('main input[type=email]'); se_connecter(pg2, email2)
        uid2 = sql('select id from "user" where email = \'%s\'' % email2)[0][0]
        ok(pg2.locator('text=' + A_).count() == 0, t + 'un autre compte ne voit pas le mariage')
        r = ctx2.request.post(B + '/api/buro', headers=H, data=json.dumps({'action': 'maj', 'id': mid, 'mariage': {'date': '2030-01-01'}})); ok(r.status == 404 and sql("select data->'mariage'->>'date' from spaces where id = '%s'" % mid)[0][0] == '2027-09-04', t + 'un autre compte ne peut pas modifier la fiche, même par appel direct (404)', r.status)
        def role(rl, jusqu='null'):
            sql("delete from space_members where space_id = '%s' and user_id = '%s'" % (mid, uid2)); sql("insert into space_members (space_id, user_id, role, jusqu_au) values ('%s', '%s', '%s', %s)" % (mid, uid2, rl, jusqu))
        def tenter(corps):
            rev = ctx2.request.get(B + '/api/buro').json()
            cur = [x for x in rev.get('projets', []) if x['id'] == mid]
            return ctx2.request.post(B + '/api/buro', headers=H, data=json.dumps(dict(corps, id=mid, action='maj', rev=(cur[0]['rev'] if cur else 0))))
        role('editor')
        r = tenter({'mariage': {'date': '2027-10-09'}}); ok(r.status == 200 and sql("select data->'mariage'->>'date' from spaces where id = '%s'" % mid)[0][0] == '2027-10-09', t + 'membre « editor » : peut modifier la fiche (date)', r.status)
        r = tenter({'archive': True}); ok(r.status == 404 and sql("select data->>'archive' from spaces where id = '%s'" % mid)[0][0] == 'false', t + 'membre « editor » : ne peut pas archiver (réservé au propriétaire)', r.status)
        r = tenter({'visibilite': 'public'}); ok(r.status == 404 and sql("select data->>'visibilite' from spaces where id = '%s'" % mid)[0][0] == 'prive', t + 'membre « editor » : ne peut pas changer le partage', r.status)
        pg2.reload(); pg2.wait_for_selector('text=Votre espace AIME'); pg2.get_by_role('button', name='Partagés avec moi').click()
        ok(pg2.locator('text=9 octobre 2027').count() > 0, t + 'membre « editor » : retrouve le mariage dans « Partagés avec moi »')
        role('editor', "now() - interval '1 day'"); r = tenter({'mariage': {'date': '2027-11-11'}}); ok(r.status == 404, t + 'membre « editor » dont le rôle a expiré : refusé', r.status)
        for rl in ('viewer', 'contributor', 'guest'):
            role(rl); r = tenter({'mariage': {'date': '2027-11-11'}}); ok(r.status == 404 and sql("select data->'mariage'->>'date' from spaces where id = '%s'" % mid)[0][0] == '2027-10-09', t + 'membre « ' + rl + ' » : ne peut pas modifier la fiche', r.status)
        role('viewer'); pg2.reload(); pg2.wait_for_selector('text=Votre espace AIME'); pg2.get_by_role('button', name='Partagés avec moi').click(); pg2.get_by_role('button', name=A_ + ' & ' + B_).first.click()
        ok(pg2.get_by_role('button', name='Enregistrer', exact=True).count() == 0 and '9 octobre 2027' in pg2.inner_text('section[aria-label^="Mariage"]'), t + 'membre « viewer » : voit la fiche en lecture seule, sans bouton Enregistrer')
        sans = p.request.new_context(extra_http_headers={'x-forwarded-for': '10.%d.6.1' % oct})
        r = sans.post(B + '/api/buro', headers=H, data=json.dumps({'genre': 'mariage', 'mariage': {'noms': ['Anonyme', 'X']}})); ok(r.status == 401 and not sql("select 1 from spaces where title = 'Anonyme & X'"), t + 'sans session : la création du mariage est refusée (401)', r.status)
        r = ctx.request.post(B + '/api/buro', headers={'origin': 'https://ailleurs.example', 'content-type': 'application/json'}, data=json.dumps({'action': 'maj', 'id': mid, 'mariage': {'date': '2031-01-01'}})); ok(r.status == 403, t + 'requête venue d’un autre site : refusée (403)', r.status)
        # 10 · compatibilité : projets existants, Point Zéro, événement AIMESTUDIO (sans fiche), atelier
        sid = str(uuid.uuid4()); sql("insert into spaces (id, kind, title, owner_id, data) values ('%s', 'projet', 'Notre union (Point Zéro)', '%s', '{\"briques\":[\"intention\"],\"studio\":\"AIME Wedding\",\"intention\":\"Un mariage en Provence.\",\"source\":\"point-zero\"}')" % (sid, uid)); sql("insert into space_members (space_id, user_id, role) values ('%s', '%s', 'owner')" % (sid, uid))
        eid = str(uuid.uuid4()); sql("insert into spaces (id, kind, title, owner_id, data) values ('%s', 'evenement', 'Évènement AIMESTUDIO', '%s', '{\"modele\":\"mariage\"}')" % (eid, uid)); sql("insert into space_members (space_id, user_id, role) values ('%s', '%s', 'owner')" % (eid, uid))
        oid = str(uuid.uuid4()); sql("insert into spaces (id, kind, title, owner_id, data) values ('%s', 'evenement', 'Séminaire AIMESTUDIO', '%s', '{\"modele\":\"seminaire\"}')" % (oid, uid)); sql("insert into space_members (space_id, user_id, role) values ('%s', '%s', 'owner')" % (oid, uid))
        lst = {x['id']: x for x in ctx.request.get(B + '/api/buro').json()['projets']}
        ok(lst[sid]['mariage'] is None and lst[eid]['mariage'] is None and lst[oid]['mariage'] is None and lst[eid]['modele'] == 'mariage', t + 'anciens projets et événements AIMESTUDIO : listés, sans fiche mariage inventée')
        r = ctx.request.post(B + '/api/buro', headers=H, data=json.dumps({'action': 'maj', 'id': eid, 'mariage': {'date': '2028-05-05'}, 'rev': 0})); ok(r.status == 200 and sql("select data->>'modele', data->'mariage'->>'date' from spaces where id = '%s'" % eid)[0] == ['mariage', '2028-05-05'], t + 'un événement AIMESTUDIO existant (modèle mariage) reçoit une fiche sans perdre son modèle')
        r = ctx.request.post(B + '/api/buro', headers=H, data=json.dumps({'action': 'maj', 'id': sid, 'description': 'Ajoutée.', 'rev': 0}))
        z = sql("select data->>'intention', data->>'source', data->>'studio', data->>'description' from spaces where id = '%s'" % sid)[0]
        ok(r.status == 200 and z == ['Un mariage en Provence.', 'point-zero', 'AIME Wedding', 'Ajoutée.'], t + 'le projet Point Zéro se modifie toujours sans rien perdre de ses données', z)
        pg.reload(); pg.wait_for_selector('text=Notre union (Point Zéro)'); pg.wait_for_selector('text=Évènement AIMESTUDIO')
        ok(True, t + 'Mes projets liste ensemble : mariage, Point Zéro, événement AIMESTUDIO')
        # 11 · Mes projets → Créer notre mariage (second chemin, même moteur) ; débordement
        pg.get_by_role('button', name='Créer notre mariage').click(); pg.wait_for_selector('form[aria-label="Créer notre mariage"]')
        ok(pg.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), t + 'aucun débordement horizontal (formulaire)')
        pg.get_by_role('button', name='Annuler').click()
        pg.get_by_role('button', name=A_ + ' & ' + B_).first.click(); pg.wait_for_selector('section[aria-label^="Mariage"]')
        ok(pg.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), t + 'aucun débordement horizontal (fiche, liste)')
        capture(pg, 'mariage-fiche-' + str(largeur))
        # nettoyage : lignes et comptes de test
        for u in (uid, uid2):
            sql("delete from spaces where owner_id = '%s'" % u); sql('delete from "user" where id = \'%s\'' % u)
        for c in (ctx, ctx2): c.close()
        sans.dispose()
    b.close()
ok(not erreurs, 'aucune erreur JavaScript non gérée', erreurs)
n = sum(resultats); print(f'\n{n}/{len(resultats)} contrôles réussis'); sys.exit(0 if n == len(resultats) else 1)
