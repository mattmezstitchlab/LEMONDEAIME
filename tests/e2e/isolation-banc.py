"""ISOLATION du banc de test : le serveur local doit refuser toute base non identifiée comme base de test, toute base distante, et ne jamais envoyer d'e-mail réel.
Usage : BASE_TEST_URL=postgres://postgres@127.0.0.1:5545/aime_testNN?sslmode=disable ADMIN_URL=postgres://postgres@127.0.0.1:5545/postgres python3 tests/e2e/isolation-banc.py"""
import os, subprocess, sys, time, urllib.request, secrets
DB = os.environ['BASE_TEST_URL']; ADMIN = os.environ['ADMIN_URL']
res = []
def ok(c, nom, d=''):
    print(('OK ' if c else 'ÉCHEC ') + nom + ((' — ' + str(d)) if (d and not c) else ''), flush=True); res.append(bool(c))
def lancer(env, port, attendre=0.0):
    e = {k: v for k, v in os.environ.items() if k not in ('BASE_TEST_URL', 'BASE_TEST_HOTE_DISTANT')}; e.update(env, PORT=str(port))
    p = subprocess.Popen(['node', 'tests/base/serveur-local.mjs'], env=e, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    t0 = time.time()
    while time.time() - t0 < 8 and p.poll() is None and not attendre: time.sleep(0.2)
    return p
# 1 · sans base
p = lancer({}, 8890); p.wait(timeout=10); ok(p.returncode == 2, '1. sans BASE_TEST_URL : refus (code 2)', p.returncode)
# 2 · hôte distant, même s'il ressemble à une branche de test : refus avant toute connexion
for h in ('ep-test-123.eu-central-1.aws.neon.tech', 'db.example.com', 'prod.lemondeaime.com'):
    p = lancer({'BASE_TEST_URL': 'postgres://u:p@%s/neondb?sslmode=require' % h}, 8891); p.wait(timeout=10); ok(p.returncode == 4 and 'locale' in p.stderr.read(), '2. hôte distant « ' + h + ' » : refus (code 4), sans connexion', p.returncode)
# 3 · base locale sans la table de marquage
nom = 'aime_garde_' + secrets.token_hex(3)
subprocess.run(['psql', ADMIN, '-qc', 'create database ' + nom], check=True)
try:
    url = DB.rsplit('/', 1)[0] + '/' + nom + '?sslmode=disable'
    p = lancer({'BASE_TEST_URL': url}, 8892); p.wait(timeout=10); ok(p.returncode == 3 and 'pas marquée' in p.stderr.read(), '3. base locale sans table de test : refus (code 3)', p.returncode)
finally:
    subprocess.run(['psql', ADMIN, '-qc', 'drop database ' + nom])
# 4 · base de test valide, clés de service réelles factices dans l'environnement : le lien arrive en mémoire, rien ne part
p = lancer({'BASE_TEST_URL': DB, 'RESEND_API_KEY': 're_FAUSSE_CLE', 'AUTH_EMAIL_FROM': 'x@example.invalid', 'ANTHROPIC_API_KEY': 'sk-FAUSSE', 'BLOB_READ_WRITE_TOKEN': 'FAUSSE'}, 8893, attendre=1); time.sleep(3.5)
try:
    ok(p.poll() is None, '4. base de test valide : le serveur démarre')
    import json
    mail = 'iso-%s@test.lemondeaime.invalid' % secrets.token_hex(3)
    rq = urllib.request.Request('http://localhost:8893/api/auth/sign-in/magic-link', data=json.dumps({'email': mail, 'callbackURL': '/'}).encode(), headers={'origin': 'http://localhost:8893', 'content-type': 'application/json', 'x-forwarded-for': '10.99.%d.1' % (int(secrets.token_hex(1), 16) % 250)})
    code = urllib.request.urlopen(rq).status; lien = urllib.request.urlopen('http://localhost:8893/__test/lien?email=' + mail).read().decode()
    ok(code == 200 and '/lien/' in lien and lien.startswith('http://localhost:8893'), '4. le lien de connexion est gardé en mémoire locale (aucun envoi réel, même avec une clé d’envoi présente)')
finally:
    p.terminate()
# 5 · la route de test n'existe pas dans le code de production
src = open('api/comptes.mjs', encoding='utf-8').read() + open('api/_auth/auth.mjs', encoding='utf-8').read()
ok('__test' not in src, '5. la route /__test/lien n’existe que dans le serveur de test (absente de api/)')
print('%d/%d' % (sum(res), len(res))); sys.exit(0 if all(res) else 1)
