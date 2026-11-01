"""PERMISSIONS BurO — accès expirés en lecture, révision obligatoire, rôles côté serveur. VRAIS gestionnaires, base PostgreSQL de TEST isolée, sans navigateur.
Usage : npm run build ; BASE_TEST_URL=postgres://postgres@127.0.0.1:5545/aime_testNN?sslmode=disable PORT=8780 node tests/base/serveur-local.mjs &
        BASE=http://localhost:8780 BASE_TEST_URL=… python3 tests/e2e/permissions-buro.py
Les points « corrigés » ne passent qu'avec le correctif de api/buro.mjs (voir docs/securite) ; sur le code actuel ils échouent : c'est la preuve du défaut."""
import json, os, subprocess, sys, secrets, urllib.request
from playwright.sync_api import sync_playwright
B = os.environ.get('BASE', 'http://localhost:8780'); DB = os.environ['BASE_TEST_URL']
res = []
def ok(c, nom, d=''):
    print(('OK ' if c else 'ÉCHEC ') + nom + ((' — ' + str(d)) if (d and not c) else ''), flush=True); res.append(bool(c))
def sql(q):
    r = subprocess.run(['psql', DB, '-At', '-F', '\x1f', '-c', q], capture_output=True, text=True)
    if r.returncode: raise RuntimeError(r.stderr)
    return [l.split('\x1f') for l in r.stdout.splitlines() if l]
if sql("select to_regclass('public.aime_base_de_test')")[0][0] != 'aime_base_de_test': print('Refus : base non marquée comme base de test.'); sys.exit(3)
H = {'origin': B, 'content-type': 'application/json'}
def entrer(p, email, ip):
    c = p.request.new_context(extra_http_headers={'x-forwarded-for': ip})
    c.post(B + '/api/auth/sign-in/magic-link', headers=H, data=json.dumps({'email': email, 'callbackURL': '/buro'}))
    lien = urllib.request.urlopen(B + '/__test/lien?email=' + email).read().decode(); c.get(lien); return c
def maj(c, **k): return c.post(B + '/api/buro', headers=H, data=json.dumps(dict(action='maj', **k)))
def liste(c): return {x['id']: x for x in c.get(B + '/api/buro', headers=H).json().get('projets', [])}
with sync_playwright() as p:
    j = secrets.token_hex(3); o = int(j, 16) % 200 + 20
    ea, eb = 'a-%s@test.lemondeaime.invalid' % j, 'b-%s@test.lemondeaime.invalid' % j
    A = entrer(p, ea, '10.%d.40.1' % o); Bc = entrer(p, eb, '10.%d.41.1' % o)
    uid_b = sql('select id from "user" where email = \'%s\'' % eb)[0][0]
    A.post(B + '/api/buro', headers=H, data=json.dumps({'genre': 'mariage', 'mariage': {'noms': ['Camille ' + j, 'Gabriel ' + j]}, 'cle': 'k-' + j}))
    mid = sql("select id from spaces where title = 'Camille %s & Gabriel %s'" % (j, j))[0][0]
    def membre(role, jusqu='null'):
        sql("delete from space_members where space_id = '%s' and user_id = '%s'" % (mid, uid_b))
        sql("insert into space_members (space_id, user_id, role, jusqu_au) values ('%s','%s','%s',%s)" % (mid, uid_b, role, jusqu))
    # 1 · expiration en LECTURE
    for role in ('viewer', 'editor', 'contributor', 'guest'):
        membre(role, "now() - interval '1 day'"); ok(mid not in liste(Bc), '1. accès « ' + role + ' » expiré : le projet n’apparaît plus dans la liste')
        membre(role, "now() + interval '1 day'"); ok(mid in liste(Bc), '1. accès « ' + role + ' » encore valide : le projet apparaît')
        membre(role); ok(mid in liste(Bc), '1. accès « ' + role + ' » sans date de fin : le projet apparaît')
    ok(mid in liste(A) and liste(A)[mid]['role'] == 'owner', '1. le propriétaire garde toujours son projet')
    membre('editor', "now() - interval '1 second'"); r = maj(Bc, id=mid, mariage={'date': '2031-01-01'}, rev=liste(A)[mid]['rev']); ok(r.status == 404, '1. éditeur expiré : écriture refusée (404)', r.status)
    # 2 · révision obligatoire
    rev = liste(A)[mid]['rev']
    r = maj(A, id=mid, mariage={'date': '2032-02-02'}); ok(r.status == 400, '2. écriture sans révision : refusée (400)', r.status)
    ok('2032-02-02' not in sql("select '[' || coalesce(data->'mariage'->>'date','') || ']' from spaces where id = '%s'" % mid)[0][0], '2. écriture sans révision : rien n’a été écrit')
    for mauvais in ('', None, True, False, -1, 1.5, 'x', '0', str(rev), [], [rev], {}, {'rev': rev}, 10**10, 1e9, float('nan') if False else 2.0000001):
        r = maj(A, id=mid, mariage={'date': '2032-02-02'}, rev=mauvais); ok(r.status == 400, '2. révision %r : refusée (400)' % (mauvais,), r.status)
    ok('2032-02-02' not in sql("select '[' || coalesce(data->'mariage'->>'date','') || ']' from spaces where id = '%s'" % mid)[0][0], '2. aucune de ces révisions invalides n’a écrit quoi que ce soit')
    ok(liste(A)[mid]['rev'] == rev, '2. la révision du projet n’a pas bougé')
    r = maj(A, id=mid, mariage={'date': '2032-02-02'}, rev=rev + 5); ok(r.status == 409, '2. révision périmée : conflit (409)', r.status)
    ok('2032-02-02' not in sql("select '[' || coalesce(data->'mariage'->>'date','') || ']' from spaces where id = '%s'" % mid)[0][0], '2. révision périmée : rien n’est écrasé')
    r = maj(A, id=mid, mariage={'date': '2032-02-02'}, rev=rev); ok(r.status == 200 and r.json()['rev'] == rev + 1, '2. révision courante : 200 et révision + 1', r.status)
    r1 = maj(A, id=mid, titre='Premier', rev=rev + 1); r2 = maj(A, id=mid, titre='Second', rev=rev + 1); ok((r1.status, r2.status) == (200, 409), '2. deux écritures sur la même révision : une seule réussit', (r1.status, r2.status))
    # 3 · rôles toujours contrôlés côté serveur
    rev = liste(A)[mid]['rev']
    membre('editor'); r = maj(Bc, id=mid, mariage={'date': '2033-03-03'}, rev=rev); ok(r.status == 200, '3. éditeur valide : modifie la fiche', r.status)
    rev = liste(A)[mid]['rev']
    for k, v in (({'archive': True}, 'archiver'), ({'visibilite': 'public'}, 'changer le partage'), ({'description': 'x'}, 'changer la description')):
        r = maj(Bc, id=mid, rev=rev, **k); ok(r.status == 404, '3. éditeur : ne peut pas ' + v + ' (404)', r.status)
    for role in ('viewer', 'contributor', 'guest'):
        membre(role); r = maj(Bc, id=mid, mariage={'date': '2034-04-04'}, rev=rev); ok(r.status == 404, '3. « ' + role + ' » : ne peut pas modifier (404)', r.status)
    sql("delete from space_members where space_id = '%s' and user_id = '%s'" % (mid, uid_b))
    r = maj(Bc, id=mid, titre='Piraté', rev=rev); ok(r.status == 404, '3. non-membre avec révision : 404, projet non révélé', r.status)
    r = maj(Bc, id=mid, titre='Piraté'); ok(r.status == 400, '3. non-membre sans révision : 400 (même réponse quel que soit l’existence du projet)', r.status)
    ok(sql("select title from spaces where id = '%s'" % mid)[0][0] != 'Piraté', '3. aucune écriture de non-membre')
print('%d/%d' % (sum(res), len(res))); sys.exit(0 if all(res) else 1)
