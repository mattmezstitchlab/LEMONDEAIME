"""CONFIDENTIALITÉ PAR RÔLE — ce que /api/buro renvoie à un membre n'est pas ce qu'il renvoie au propriétaire. AUDIT + scénarios, sans développer la collaboration.
Principe visé : liste blanche par rôle, refus par défaut. Un invité, un prestataire (guest / contributor) ou un lecteur ne reçoit jamais automatiquement la description,
l'intention, le budget, les décisions ou les contacts privés d'un projet.
Niveau 1 (toujours compté) : invariants qui tiennent aujourd'hui — un non-membre ne reçoit rien, un accès expiré ne reçoit rien, des champs privés inconnus ne sortent à personne.
Niveau 2 (compté avec CONFIDENTIALITE_PAR_ROLE=1 ; sinon affiché en CONSTAT) : la matrice visée. Elle échoue sur le code actuel, qui renvoie tout champ listé à tout membre.
Usage : BASE=http://localhost:8780 BASE_TEST_URL=postgres://postgres@127.0.0.1:5545/aime_testNN?sslmode=disable python3 tests/e2e/confidentialite-roles.py"""
import json, os, subprocess, sys, secrets, urllib.request
from playwright.sync_api import sync_playwright
B = os.environ.get('BASE', 'http://localhost:8780'); DB = os.environ['BASE_TEST_URL']; STRICT = os.environ.get('CONFIDENTIALITE_PAR_ROLE') == '1'
res = []; constats = []
def ok(c, nom, d=''):
    print(('OK ' if c else 'ÉCHEC ') + nom + ((' — ' + str(d)) if (d and not c) else ''), flush=True); res.append(bool(c))
def cible(c, nom):
    if STRICT: ok(c, nom)
    else: print(('CONFORME ' if c else 'CONSTAT (écart à la matrice visée) ') + nom, flush=True); constats.append((nom, bool(c)))
def sql(q):
    r = subprocess.run(['psql', DB, '-At', '-F', '\x1f', '-c', q], capture_output=True, text=True)
    if r.returncode: raise RuntimeError(r.stderr)
    return [l.split('\x1f') for l in r.stdout.splitlines() if l]
if sql("select to_regclass('public.aime_base_de_test')")[0][0] != 'aime_base_de_test': print('Refus : base non marquée comme base de test.'); sys.exit(3)
H = {'origin': B, 'content-type': 'application/json'}
def entrer(p, email, ip):
    c = p.request.new_context(extra_http_headers={'x-forwarded-for': ip})
    c.post(B + '/api/auth/sign-in/magic-link', headers=H, data=json.dumps({'email': email, 'callbackURL': '/buro'}))
    c.get(urllib.request.urlopen(B + '/__test/lien?email=' + email).read().decode()); return c
SECRETS = {'description': 'SECRET-DESCRIPTION', 'intention': 'SECRET-INTENTION', 'budget': 'SECRET-BUDGET', 'decisions': 'SECRET-DECISION', 'contact': 'SECRET-CONTACT'}
with sync_playwright() as p:
    j = secrets.token_hex(3); o = int(j, 16) % 200 + 20
    mails = {n: '%s-%s@test.lemondeaime.invalid' % (n, j) for n in ('proprio', 'editeur', 'lecteur', 'contrib', 'invite', 'tiers', 'expire')}
    C = {n: entrer(p, m, '10.%d.%d.1' % (o, 60 + i)) for i, (n, m) in enumerate(mails.items())}
    uid = {n: sql('select id from "user" where email = \'%s\'' % m)[0][0] for n, m in mails.items()}
    C['proprio'].post(B + '/api/buro', headers=H, data=json.dumps({'genre': 'mariage', 'mariage': {'noms': ['Camille ' + j, 'Gabriel ' + j], 'date': '2030-06-15', 'lieu': {'nom': 'Domaine', 'ville': 'Lyon'}}, 'cle': 'c-' + j}))
    mid = sql("select id from spaces where title = 'Camille %s & Gabriel %s'" % (j, j))[0][0]
    donnees = {'description': SECRETS['description'], 'intention': SECRETS['intention'], 'budget': {'total': SECRETS['budget']}, 'decisions': [SECRETS['decisions']], 'contact': SECRETS['contact'], 'studio': 'AIME Wedding', 'briques': ['intention']}
    sql("update spaces set data = data || '%s'::jsonb where id = '%s'" % (json.dumps(donnees).replace("'", "''"), mid))
    for n, role, jusqu in (('editeur', 'editor', 'null'), ('lecteur', 'viewer', 'null'), ('contrib', 'contributor', 'null'), ('invite', 'guest', 'null'), ('expire', 'viewer', "now() - interval '1 day'")):
        sql("insert into space_members (space_id, user_id, role, jusqu_au) values ('%s','%s','%s',%s)" % (mid, uid[n], role, jusqu))
    def lire(n): r = C[n].get(B + '/api/buro', headers=H); return r.text(), {x['id']: x for x in r.json().get('projets', [])}
    # Niveau 1 · invariants
    for n in ('tiers', 'expire'):
        t, l = lire(n); ok(mid not in l and all(v not in t for v in SECRETS.values()), '1. ' + n + ' (non-membre / accès expiré) : aucun projet, aucun secret dans la réponse')
    for n in ('proprio', 'editeur', 'lecteur', 'contrib', 'invite'):
        t, l = lire(n); ok('SECRET-BUDGET' not in t and 'SECRET-DECISION' not in t and 'SECRET-CONTACT' not in t, '1. ' + n + ' : les champs privés non listés (budget, décisions, contact) ne sortent jamais')
    t, l = lire('proprio'); ok(SECRETS['description'] in t and SECRETS['intention'] in t, '1. le propriétaire reçoit sa description et son intention')
    ok(not any(('iban' in json.dumps(v).lower()) for v in l.values()), '1. aucune réponse ne contient de champ « iban »')
    # Niveau 2 · matrice visée (refus par défaut)
    for n, nom in (('editeur', 'éditeur'), ('lecteur', 'lecteur'), ('contrib', 'prestataire (contributor)'), ('invite', 'invité (guest)')):
        t, l = lire(n)
        cible(mid in l and SECRETS['description'] not in t, '2. ' + nom + ' : ne reçoit pas la description privée')
        cible(SECRETS['intention'] not in t, '2. ' + nom + ' : ne reçoit pas l’intention privée')
        x = l.get(mid, {}); cible(not x.get('briques') and not x.get('studio'), '2. ' + nom + ' : ne reçoit pas les briques ni le studio du projet')
    for n, nom in (('contrib', 'prestataire (contributor)'), ('invite', 'invité (guest)')):
        x = lire(n)[1].get(mid, {}); m = x.get('mariage') or {}
        cible('noms' not in m, '2. ' + nom + ' : ne reçoit pas les noms des mariés sans choix explicite du couple')
        cible(x.get('visibilite') in (None, '') and 'archive' not in x, '2. ' + nom + ' : ne reçoit pas l’état de partage ni d’archivage')
    x = lire('editeur')[1].get(mid, {}); cible('titre' in x and 'mariage' in x, '2. éditeur : reçoit le titre et la fiche (il peut les modifier)')
print('\n%d/%d contrôles de niveau 1' % (sum(res), len(res)) + ('' if STRICT else ' ; %d/%d points de la matrice visée déjà conformes (constats, non comptés)' % (sum(1 for _, c in constats if c), len(constats))))
sys.exit(0 if all(res) else 1)
