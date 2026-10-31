"""MES PROJETS, de bout en bout, sans API simulée : un vrai navigateur, le site construit (dist/), les VRAIS gestionnaires du serveur
(Better Auth, /api/buro) et une base PostgreSQL de TEST isolée (jamais la production). Seul l'envoi d'e-mail est remplacé : le lien de
connexion est lu sur le serveur de test, puis ouvert comme le ferait la personne depuis sa messagerie.
Parcours : Accueil → Mes projets → Connexion (lien réel) → retour sur /buro → projet ancien (Point Zéro) retrouvé → Nouveau projet (titre, description)
→ enregistré en base → quitter (nouveau navigateur, sans cookie) → se reconnecter → retrouver le même projet → le rouvrir → le modifier → rechargement
→ conflit entre deux onglets (rien n'est écrasé) → permissions (autre compte, sans session, origine étrangère) → retour à l'accueil.
Usage : npm run build ; BASE_TEST_URL=postgres://postgres@127.0.0.1:5544/aime_test?sslmode=disable PORT=8774 node tests/base/serveur-local.mjs &
        python3 tests/e2e/mes-projets.py        (BASE_TEST_URL doit être la même base : les vérifications relisent les lignes avec psql)"""
import json, os, subprocess, sys, secrets, urllib.request, uuid
from playwright.sync_api import sync_playwright

B = os.environ.get('BASE', 'http://localhost:8774')
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
    pg.goto(lien); pg.wait_for_selector('text=Votre espace AIME'); pg.wait_for_selector('button:has-text("Nouveau projet")')

with sync_playwright() as p:
    b = p.chromium.launch()
    for nom, largeur in (('ordinateur', 1440), ('téléphone', 390)):
        t = nom + ' · '; jeton = secrets.token_hex(3); email = 'alice-' + jeton + '@test.lemondeaime.invalid'; oct = int(jeton, 16) % 200 + 20; ip = '10.%d.%d.1' % (oct, 1 if largeur > 700 else 2)   # une adresse par exécution : la limite de 3 liens par minute est par adresse
        TITRE, DESC = 'Mon premier projet ' + jeton, 'Première ligne.\nSeconde ligne : un mariage en Provence.'
        ctx = contexte(b, largeur, ip); pg = page(ctx)
        # 1-2 · de l'accueil à la connexion, et retour sur /buro
        pg.goto(B + '/'); pg.wait_for_selector('h1'); pg.get_by_role('link', name='Retrouver notre mariage').first.click(); pg.wait_for_url('**/buro')
        pg.wait_for_selector('main input[type=email]')
        ok('Entrez dans AIME' in pg.inner_text('main'), t + 'Mes projets sans session : le formulaire d’entrée s’affiche ici (pas de faux projets)')
        capture(pg, 'buro-connexion-' + str(largeur))
        se_connecter(pg, email)
        ok(pg.url.rstrip('/').endswith('/buro'), t + 'après le lien de connexion, retour sur /buro', pg.url)
        uid = sql('select id from "user" where email = \'%s\'' % email)[0][0]
        ok(len(sql('select 1 from session where "userId" = \'%s\'' % uid)) == 1, t + 'une vraie session existe en base')
        # 3 · projets existants : un projet Point Zéro (ancien format, sans description ni révision) est retrouvé
        sid = str(uuid.uuid4())
        sql("insert into spaces (id, kind, title, owner_id, data) values ('%s', 'projet', 'Notre union (Point Zéro)', '%s', '{\"briques\":[\"intention\"],\"studio\":\"AIME Wedding\",\"intention\":\"Un mariage en Provence.\",\"visibilite\":\"prive\",\"archive\":false,\"source\":\"point-zero\"}')" % (sid, uid))
        sql("insert into space_members (space_id, user_id, role) values ('%s', '%s', 'owner')" % (sid, uid))
        pg.reload(); pg.wait_for_selector('text=Notre union (Point Zéro)')
        ok(True, t + 'le projet existant (Point Zéro) est retrouvé dans la liste')
        # 4-6 · nouveau projet : titre, description, enregistrement réel
        pg.get_by_role('button', name='Nouveau projet').click()
        pg.get_by_label('Titre du projet').fill(TITRE); pg.get_by_label('Description', exact=True).fill(DESC)
        pg.get_by_role('button', name='Enregistrer le projet').click()
        pg.wait_for_selector('[role=status]:has-text("enregistré dans votre espace")')
        ligne = sql("select s.id, s.title, s.data->>'description', s.owner_id, m.role, s.data->>'rev' from spaces s join space_members m on m.space_id = s.id where s.title = '%s'" % TITRE)
        ok(len(ligne) == 1 and ligne[0][1] == TITRE and ligne[0][3] == uid and ligne[0][4] == 'owner' and ligne[0][5] == '0', t + 'le projet est écrit dans spaces + space_members (propriétaire = la session)', ligne)
        pid = ligne[0][0]
        ok(sql("select data->>'description' from spaces where id = '%s'" % pid)[0][0] == DESC, t + 'la description est enregistrée telle quelle (retours à la ligne compris)')
        capture(pg, 'buro-nouveau-' + str(largeur))
        # 7-8 · quitter l'espace : un tout nouveau navigateur, sans cookie ; se reconnecter ; retrouver exactement le même projet
        ctx.close(); ctx = contexte(b, largeur, ip); pg = page(ctx)
        pg.goto(B + '/buro'); pg.wait_for_selector('main input[type=email]')
        ok(pg.locator('text=' + TITRE).count() == 0, t + 'sans session, aucun projet n’est visible')
        # (deuxième lien du même compte : l'adresse IP change pour la limite de 3 liens par minute)
        ctx.close(); ctx = contexte(b, largeur, ip.replace('.1', '.9')); pg = page(ctx)
        pg.goto(B + '/buro'); pg.wait_for_selector('main input[type=email]'); se_connecter(pg, email)
        pg.wait_for_selector('text=' + TITRE)
        ok(sql('select count(*) from "user" where email = \'%s\'' % email)[0][0] == '1' and len(sql("select 1 from spaces where title = '%s'" % TITRE)) == 1, t + 'reconnexion : même compte, un seul projet de ce nom en base')
        ok(pg.locator('text=Notre union (Point Zéro)').count() > 0, t + 'reconnexion : le projet Point Zéro est toujours là')
        # 9 · rouvrir et modifier
        pg.get_by_role('button', name=TITRE).first.click()
        ok(pg.get_by_label('Titre', exact=True).input_value() == TITRE and pg.get_by_label('Description', exact=True).input_value() == DESC, t + 'la fiche rouvre exactement le titre et la description enregistrés')
        pg.get_by_label('Titre', exact=True).fill(TITRE + ' (v2)'); pg.get_by_label('Description', exact=True).fill(DESC + '\nTroisième ligne.')
        pg.get_by_role('button', name='Enregistrer', exact=True).click(); pg.wait_for_selector('[role=status]:has-text("enregistré.")')
        l2 = sql("select title, data->>'description', data->>'rev' from spaces where id = '%s'" % pid)[0]
        ok(l2[0] == TITRE + ' (v2)' and l2[1] == DESC + '\nTroisième ligne.' and l2[2] == '1', t + 'la modification est écrite en base (titre, description, révision 1)', l2)
        pg.reload(); pg.wait_for_selector('text=' + TITRE + ' (v2)')
        ok(True, t + 'après rechargement, la version modifiée est celle qu’on retrouve')
        # le projet Point Zéro : on le modifie sans rien perdre de ses données
        pg.get_by_role('button', name='Notre union (Point Zéro)').first.click()
        pg.get_by_label('Description', exact=True).fill('Ajoutée depuis le BurO.'); pg.get_by_role('button', name='Enregistrer', exact=True).click()
        pg.wait_for_selector('[role=status]:has-text("enregistré.")')
        z = sql("select data->>'intention', data->>'source', data->>'studio', data->'briques'::text, data->>'description', data->>'rev' from spaces where id = '%s'" % sid)[0]
        ok(z[0] == 'Un mariage en Provence.' and z[1] == 'point-zero' and z[2] == 'AIME Wedding' and 'intention' in z[3] and z[4] == 'Ajoutée depuis le BurO.' and z[5] == '1', t + 'le projet Point Zéro modifié garde intention, source, studio et briques', z)
        # 10 · deux onglets : le second ne peut pas écraser le premier
        a = pg; bb = page(ctx); bb.goto(B + '/buro'); bb.wait_for_selector('text=' + TITRE + ' (v2)')
        a.reload(); a.wait_for_selector('text=' + TITRE + ' (v2)')
        for q in (a, bb): q.get_by_role('button', name=TITRE + ' (v2)').first.click()
        a.get_by_label('Titre', exact=True).fill('Version onglet A'); a.get_by_role('button', name='Enregistrer', exact=True).click(); a.wait_for_selector('[role=status]:has-text("enregistré.")')
        bb.get_by_label('Titre', exact=True).fill('Version onglet B'); bb.get_by_role('button', name='Enregistrer', exact=True).click()
        bb.wait_for_selector('text=modifié ailleurs')
        ok(sql("select title from spaces where id = '%s'" % pid)[0][0] == 'Version onglet A', t + 'conflit : l’onglet en retard est refusé, la version de l’autre onglet reste intacte')
        bb.get_by_role('button', name='Recharger la dernière version').click(); bb.wait_for_selector('text=Version onglet A')
        ok(bb.get_by_label('Titre', exact=True).input_value() == 'Version onglet A', t + 'conflit : « Recharger » affiche la dernière version')
        bb.close()
        # 10 bis · Archiver et Partager : la même protection par révision (et pas de double action)
        H = {'origin': B, 'content-type': 'application/json'}
        a.reload(); a.wait_for_selector('text=Version onglet A'); a.get_by_role('button', name='Version onglet A').first.click()
        c2 = page(ctx); c2.goto(B + '/buro'); c2.wait_for_selector('text=Version onglet A'); c2.get_by_role('button', name='Version onglet A').first.click()
        c3 = page(ctx); c3.goto(B + '/buro'); c3.wait_for_selector('text=Version onglet A'); c3.get_by_role('button', name='Version onglet A').first.click()
        a.get_by_role('button', name='Partager · Privé').click(); a.wait_for_selector('[role=status]:has-text("Restreint")')
        ok(sql("select data->>'visibilite' from spaces where id = '%s'" % pid)[0][0] == 'restreint', t + 'Partager : la visibilité change en base')
        rev_avant = sql("select data->>'rev' from spaces where id = '%s'" % pid)[0][0]
        c2.get_by_role('button', name='Partager · Privé').click(); c2.wait_for_selector('text=modifié ailleurs')
        ok(sql("select data->>'visibilite', data->>'rev' from spaces where id = '%s'" % pid)[0] == ['restreint', rev_avant], t + 'Partager depuis un onglet en retard : refusé (409), rien n’est écrasé')
        c2.wait_for_selector('button:has-text("Partager · Restreint")'); ok(True, t + 'après le refus, l’onglet en retard affiche la dernière version')
        c3.get_by_role('button', name='Archiver').click(); c3.wait_for_selector('text=modifié ailleurs')
        ok(sql("select data->>'archive' from spaces where id = '%s'" % pid)[0][0] == 'false', t + 'Archiver depuis un onglet en retard : refusé (409), le projet n’est pas archivé')
        c2.close(); c3.close()
        r = ctx.request.post(B + '/api/buro', headers=H, data=json.dumps({'action': 'maj', 'id': pid, 'archive': True, 'rev': int(rev_avant) - 1})); ok(r.status == 409, t + 'Archiver avec une révision périmée, par appel direct : 409', r.status)
        a.get_by_role('button', name='Archiver').click(); a.wait_for_selector('[role=status]:has-text("rangé aux archives")')
        ok(sql("select data->>'archive' from spaces where id = '%s'" % pid)[0][0] == 'true', t + 'Archiver avec la bonne révision : le projet est rangé aux archives')
        a.reload(); a.wait_for_selector('text=Votre espace AIME')
        ok(a.locator('text=Version onglet A').count() == 0, t + 'archivé : il n’est plus dans Projets')
        a.get_by_role('button', name='Archives').click(); a.get_by_role('button', name='Version onglet A').first.click()
        a.get_by_role('button', name='Restaurer').click(); a.wait_for_selector('[role=status]:has-text("restauré")')
        ok(sql("select data->>'archive' from spaces where id = '%s'" % pid)[0][0] == 'false', t + 'Restaurer : le projet revient')
        # 10 ter · créations multiples : double clic, nouvelle tentative, cinq envois simultanés
        a.get_by_role('button', name='Projets', exact=False).first.click()
        a.get_by_role('button', name='Nouveau projet').click(); a.get_by_label('Titre du projet').fill('Double clic ' + jeton)
        a.get_by_role('button', name='Enregistrer le projet').dblclick(); a.wait_for_selector('[role=status]:has-text("enregistré dans votre espace")')
        a.wait_for_timeout(600)
        ok(sql("select count(*) from spaces where title = 'Double clic %s'" % jeton)[0][0] == '1', t + 'double clic sur « Enregistrer le projet » : un seul projet créé')
        cle = 'cle-' + jeton + '-simultanee'
        reps = a.evaluate("""async (cle) => (await Promise.all([1,2,3,4,5].map(() => fetch('/api/buro', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ titre: 'Simultané', cle }) }).then(async r => [r.status, (await r.json()).id])))) """, cle)
        ok(len(sql("select 1 from spaces where owner_id = '%s' and title = 'Simultané'" % uid)) == 1 and len({x[1] for x in reps}) == 1 and sorted(x[0] for x in reps).count(201) == 1, t + 'cinq envois simultanés avec la même clé : un seul projet, le même identifiant pour tous', reps)
        r2 = ctx.request.post(B + '/api/buro', headers=H, data=json.dumps({'titre': 'Simultané', 'cle': cle})); j2 = r2.json()
        ok(r2.status == 200 and j2.get('doublon') and j2['id'] == reps[0][1], t + 'nouvelle tentative après coupure (même clé) : renvoie le projet déjà créé')
        r3 = ctx.request.post(B + '/api/buro', headers=H, data=json.dumps({'titre': 'Autre clé', 'cle': cle + '-b'})); ok(r3.status == 201 and r3.json()['id'] != reps[0][1], t + 'une autre clé crée bien un autre projet')
        r4 = ctx.request.post(B + '/api/buro', headers=H, data=json.dumps({'titre': 'Sans clé'})); r5 = ctx.request.post(B + '/api/buro', headers=H, data=json.dumps({'titre': 'Sans clé'}))
        ok(r4.status == 201 and r5.status == 201, t + 'sans clé (ancien client) : le comportement d’avant est inchangé')
        # 10 quater · anciens projets : la révision vaut 0 (absente, nulle ou illisible), jamais une erreur
        anc = {}
        for nom_a, data in (('absente', '{"briques":[],"source":"point-zero"}'), ('nulle', '{"rev":null}'), ('illisible', '{"rev":"abc"}'), ('negative', '{"rev":-3}'), ('texte', '{"rev":"7"}')):
            i = str(uuid.uuid4()); sql("insert into spaces (id, kind, title, owner_id, data) values ('%s', 'projet', 'Ancien %s', '%s', '%s')" % (i, nom_a, uid, data)); sql("insert into space_members (space_id, user_id, role) values ('%s', '%s', 'owner')" % (i, uid)); anc[nom_a] = i
        lst = ctx.request.get(B + '/api/buro').json()['projets']; revs = {x['titre']: x['rev'] for x in lst if x['titre'].startswith('Ancien ')}
        ok(revs.get('Ancien absente') == 0 and revs.get('Ancien nulle') == 0 and revs.get('Ancien illisible') == 0 and revs.get('Ancien negative') == 0, t + 'la liste donne la révision 0 aux projets anciens (absente, nulle, illisible, négative)', revs)
        for nom_a in ('absente', 'nulle', 'illisible', 'negative'):
            r = ctx.request.post(B + '/api/buro', headers=H, data=json.dumps({'action': 'maj', 'id': anc[nom_a], 'description': 'ok', 'rev': 0}))
            ok(r.status == 200 and r.json()['rev'] == 1 and sql("select data->>'rev' from spaces where id = '%s'" % anc[nom_a])[0][0] == '1', t + 'projet ancien « ' + nom_a + ' » : modifiable avec la révision 0, qui passe à 1', r.status)
            r = ctx.request.post(B + '/api/buro', headers=H, data=json.dumps({'action': 'maj', 'id': anc[nom_a], 'description': 'encore', 'rev': 0})); ok(r.status == 409, t + 'projet ancien « ' + nom_a + ' » : la révision 0 ne passe plus une seconde fois (409)', r.status)
        r = ctx.request.post(B + '/api/buro', headers=H, data=json.dumps({'action': 'maj', 'id': anc['absente'], 'visibilite': 'lien'})); ok(r.status == 200, t + 'ancien client (sans révision) : Partager fonctionne toujours', r.status)
        r = ctx.request.post(B + '/api/buro', headers=H, data=json.dumps({'action': 'maj', 'id': anc['texte'], 'archive': True, 'rev': 'x'})); ok(r.status == 400, t + 'révision invalide envoyée : 400, pas d’erreur serveur', r.status)
        ok(sql("select data->'briques', data->>'source' from spaces where id = '%s'" % anc['absente'])[0][1] == 'point-zero', t + 'les anciennes données (source, briques) ne sont pas touchées')
        # 11 · permissions côté serveur
        ctx2 = contexte(b, largeur, '10.%d.5.%d' % (oct, 1 if largeur > 700 else 2)); pg2 = page(ctx2); email2 = 'bob-' + jeton + '@test.lemondeaime.invalid'
        pg2.goto(B + '/buro'); pg2.wait_for_selector('main input[type=email]'); se_connecter(pg2, email2)
        ok(pg2.locator('text=Version onglet A').count() == 0 and pg2.locator('text=Notre union').count() == 0, t + 'un autre compte ne voit pas ces projets')
        r = ctx2.request.post(B + '/api/buro', headers=H, data=json.dumps({'action': 'maj', 'id': pid, 'titre': 'Piraté'}))
        ok(r.status == 404 and sql("select title from spaces where id = '%s'" % pid)[0][0] == 'Version onglet A', t + 'un autre compte ne peut pas modifier le projet, même par appel direct (404, rien n’a changé)', r.status)
        r = ctx2.request.post(B + '/api/buro', headers=H, data=json.dumps({'action': 'maj', 'id': pid, 'archive': True}))
        ok(r.status == 404 and sql("select data->>'archive' from spaces where id = '%s'" % pid)[0][0] == 'false', t + 'ni l’archiver')
        sans = p.request.new_context(extra_http_headers={'x-forwarded-for': '10.%d.6.1' % oct})
        r = sans.get(B + '/api/buro'); ok(r.status == 401, t + 'sans session : la liste est refusée (401)', r.status)
        r = sans.post(B + '/api/buro', headers=H, data=json.dumps({'titre': 'Anonyme'})); ok(r.status == 401 and not sql("select 1 from spaces where title = 'Anonyme'"), t + 'sans session : la création est refusée (401), rien n’est écrit', r.status)
        r = ctx.request.post(B + '/api/buro', headers={'origin': 'https://ailleurs.example', 'content-type': 'application/json'}, data=json.dumps({'action': 'maj', 'id': pid, 'titre': 'Forgé'}))
        ok(r.status == 403 and sql("select title from spaces where id = '%s'" % pid)[0][0] == 'Version onglet A', t + 'une requête venue d’un autre site est refusée (403), même avec le cookie', r.status)
        r = ctx.request.post(B + '/api/buro', headers=H, data=json.dumps({'action': 'maj', 'id': pid, 'titre': '   '})); ok(r.status == 400, t + 'un titre vide est refusé (400)', r.status)
        r = ctx.request.post(B + '/api/buro', headers=H, data=json.dumps({'action': 'maj', 'id': pid, 'titre': 'Ok', 'rev': 0})); ok(r.status == 409, t + 'une révision périmée est refusée (409) côté serveur', r.status)
        # 12 · retour à l'accueil
        pg.get_by_role('link', name='AIME, accueil').first.click(); pg.wait_for_url(B + '/'); pg.wait_for_selector('h1')
        ok('vous imaginez votre mariage' in pg.inner_text('h1').lower(), t + 'depuis le BurO, retour à l’accueil')
        ok(pg.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), t + 'aucun débordement horizontal à l’accueil')
        pg.goto(B + '/buro'); pg.wait_for_selector('text=Votre espace AIME')
        ok(pg.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), t + 'aucun débordement horizontal dans le BurO (liste, formulaire)')
        capture(pg, 'buro-liste-' + str(largeur))
        # nettoyage : les comptes et lignes de test
        for u in (uid, sql('select id from "user" where email = \'%s\'' % email2)[0][0]):
            sql("delete from spaces where owner_id = '%s'" % u); sql('delete from "user" where id = \'%s\'' % u)
        for c in (ctx, ctx2, sans): c.dispose() if hasattr(c, 'dispose') else c.close()
    b.close()
ok(not erreurs, 'aucune erreur JavaScript non gérée', erreurs)
n = sum(resultats); print(f'\n{n}/{len(resultats)} contrôles réussis'); sys.exit(0 if n == len(resultats) else 1)
