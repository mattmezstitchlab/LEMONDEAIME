"""LE RÉSEAU de bout en bout : VRAI /api/reseau (raccordé à tests/base/serveur-local.mjs), vraie connexion, base PostgreSQL de TEST isolée, sans navigateur.
Couvre : profil caché par défaut, données publiques (jamais d'e-mail ni d'identifiant), calendrier du propriétaire, demandes privées au destinataire, événements jamais exposés.
CALENDRIER_SIMPLIFIE=1 : vérifie en plus la visibilité publique décidée (disponible / indisponible / inconnue) ; sans, il constate l'état actuel (libre, option, prise).
Usage : npm run build ; BASE_TEST_URL=postgres://postgres@127.0.0.1:5545/aime_testNN?sslmode=disable PORT=8781 node tests/base/serveur-local.mjs &
        BASE=http://localhost:8781 BASE_TEST_URL=… python3 tests/e2e/reseau.py"""
import json, os, subprocess, sys, secrets, urllib.request, datetime
from playwright.sync_api import sync_playwright
B = os.environ.get('BASE', 'http://localhost:8781'); DB = os.environ['BASE_TEST_URL']; SIMPLE = os.environ.get('CALENDRIER_SIMPLIFIE') == '1'
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
    c.post(B + '/api/auth/sign-in/magic-link', headers=H, data=json.dumps({'email': email, 'callbackURL': '/'}))
    c.get(urllib.request.urlopen(B + '/__test/lien?email=' + email).read().decode()); return c
def post(c, **k): return c.post(B + '/api/reseau', headers=H, data=json.dumps(k))
PROFIL = dict(nom='Pro Test', domaine='mariage', metier='Photographe', ville='Lyon', bio='Fictif.', site='', zone='Rhône', langues='français', tarif='', prestations=[], liens=[])
with sync_playwright() as p:
    j = secrets.token_hex(3); o = int(j, 16) % 200 + 20
    ep, ec, ex = ['%s-%s@test.lemondeaime.invalid' % (n, j) for n in ('pro', 'couple', 'autre')]
    anon = p.request.new_context(extra_http_headers={'x-forwarded-for': '10.%d.50.1' % o})
    Pro = entrer(p, ep, '10.%d.51.1' % o); Cou = entrer(p, ec, '10.%d.52.1' % o); Aut = entrer(p, ex, '10.%d.53.1' % o)
    uid = sql('select id from "user" where email = \'%s\'' % ep)[0][0]
    # 1 · profil caché par défaut, publié seulement par choix
    r = anon.get(B + '/api/reseau'); ok(r.status == 200 and r.json()['ok'] and not any(x['nom'] == 'Pro Test' for x in r.json()['profils']), '1. le Réseau répond sans connexion, sans profil de test')
    r = anon.post(B + '/api/reseau', headers=H, data=json.dumps(PROFIL)); ok(r.status == 401, '1. sans session : créer un profil est refusé (401)', r.status)
    r = post(Pro, **dict(PROFIL, visible=False)); ok(r.status == 200 and len(r.json()['profil']['ref']) == 12, '1. profil créé, caché : une référence publique de 12 caractères', r.status)
    ref = r.json()['profil']['ref']
    ok(not any(x['ref'] == ref for x in anon.get(B + '/api/reseau').json()['profils']), '1. profil caché : absent de la liste publique')
    ok(anon.get(B + '/api/reseau?ref=' + ref).status == 404, '1. profil caché : fiche publique introuvable (404)')
    post(Pro, **dict(PROFIL, visible=True))
    liste = anon.get(B + '/api/reseau').json()['profils']; pub = next(x for x in liste if x['ref'] == ref)
    ok(pub is not None, '1. profil publié : visible dans la liste publique')
    brut = anon.get(B + '/api/reseau?ref=' + ref).text()
    ok(uid not in brut and ep not in brut and 'user_id' not in brut and '@' not in brut, '1. fiche publique : ni adresse e-mail, ni identifiant de compte')
    # 2 · calendrier : le propriétaire garde le détail, le public voit moins
    jour = (datetime.date.today() + datetime.timedelta(days=200)).isoformat(); jour2 = (datetime.date.today() + datetime.timedelta(days=201)).isoformat(); jour3 = (datetime.date.today() + datetime.timedelta(days=202)).isoformat(); jour4 = (datetime.date.today() + datetime.timedelta(days=203)).isoformat()
    r = post(Pro, action='dates', jours={jour: 'libre', jour2: 'option', jour3: 'prise'}); ok(r.status == 200, '2. le propriétaire enregistre libre, option et prise', r.status)
    r = post(Pro, action='dates', jours={jour: 'peut-être'}); ok(r.status == 400, '2. un état inconnu est refusé (400)', r.status)
    moi = Pro.get(B + '/api/reseau?moi=1', headers=H).json(); ok(moi['dates'].get(jour) == 'libre' and moi['dates'].get(jour2) == 'option' and moi['dates'].get(jour3) == 'prise', '2. le propriétaire retrouve ses trois états détaillés')
    def public(d):
        x = anon.get(B + '/api/reseau?ref=%s&date=%s' % (ref, d)).json()['profil']; return x
    if SIMPLE:
        ok(public(jour).get('disponibilite') == 'disponible', '2. public : libre → disponible')
        ok(public(jour2).get('disponibilite') == 'indisponible', '2. public : option → indisponible (le mot « option » ne sort pas)')
        ok(public(jour3).get('disponibilite') == 'indisponible', '2. public : prise → indisponible')
        ok(public(jour4).get('disponibilite') == 'inconnue', '2. public : aucune date saisie → inconnue')
        passe = (datetime.date.today() - datetime.timedelta(days=30)).isoformat(); sql("insert into reseau_dates (user_id, jour, etat) values ('%s', '%s', 'libre')" % (uid, passe))
        ok(public(passe).get('disponibilite') == 'inconnue', '2. public : une date passée → inconnue (même si elle était « libre »)')
        liste_d = anon.get(B + '/api/reseau?date=' + jour).json()['profils']; ok(next(x for x in liste_d if x['ref'] == ref).get('disponibilite') == 'disponible', '2. public : la liste filtrée par date porte aussi « disponibilite »')
        tout = json.dumps([public(d) for d in (jour, jour2, jour3, jour4)]) + json.dumps(anon.get(B + '/api/reseau?date=' + jour2).json())
        ok('option' not in tout and 'prise' not in tout and '"etat"' not in tout, '2. aucune réponse publique ne contient « option », « prise » ni le champ « etat »')
        ok(Pro.get(B + '/api/reseau?moi=1', headers=H).json()['dates'].get(jour2) == 'option', '2. le propriétaire voit toujours « option »')
    else:
        ok(public(jour).get('etat') == 'libre' and public(jour2).get('etat') == 'option', '2. [état actuel] le public voit l’état exact, y compris « option » (à simplifier)')
    # 3 · demandes : privées au destinataire
    r = anon.post(B + '/api/reseau', headers=H, data=json.dumps({'action': 'demande', 'ref': ref, 'message': 'Bonjour, mariage en juin.'})); ok(r.status == 401, '3. sans session : envoyer une demande est refusé (401)', r.status)
    r = post(Cou, action='demande', ref=ref, jour=jour, lieu='Lyon', invites=80, message='Bonjour, mariage en juin.'); ok(r.status == 200, '3. un couple connecté dépose une demande', r.status)
    r = post(Cou, action='demande', ref=ref, message='abc'); ok(r.status == 400, '3. message trop court : refusé (400)', r.status)
    r = post(Cou, action='demande', ref='0' * 12, message='Bonjour, un projet.'); ok(r.status == 404, '3. profil inconnu : 404', r.status)
    r = post(Pro, action='demande', ref=ref, message='Bonjour, moi-même.'); ok(r.status == 400, '3. on ne s’écrit pas à soi-même (400)', r.status)
    dm = Pro.get(B + '/api/reseau?moi=1', headers=H).json()['demandes']; ok(len(dm) == 1 and dm[0]['de_email'] == ec and dm[0]['invites'] == 80, '3. le destinataire lit la demande (nom et e-mail de l’expéditeur)')
    ok(Cou.get(B + '/api/reseau?moi=1', headers=H).json()['demandes'] == [] and Aut.get(B + '/api/reseau?moi=1', headers=H).json()['demandes'] == [], '3. ni l’expéditeur ni un tiers ne lisent cette demande')
    ok(ec not in anon.get(B + '/api/reseau?ref=' + ref).text(), '3. l’e-mail de l’expéditeur n’apparaît jamais côté public')
    r = Aut.post(B + '/api/reseau', headers=H, data=json.dumps({'action': 'demande-lue', 'id': dm[0]['id']})); ok(sql("select lue from reseau_demandes where id = %s" % dm[0]['id'])[0][0] == 'f', '3. un tiers ne peut pas marquer la demande comme lue')
    post(Pro, action='demande-lue', id=dm[0]['id']); ok(sql("select lue from reseau_demandes where id = %s" % dm[0]['id'])[0][0] == 't', '3. le destinataire la marque comme lue')
    r = Cou.post(B + '/api/reseau', headers={'origin': 'https://ailleurs.example', 'content-type': 'application/json'}, data=json.dumps({'action': 'demande', 'ref': ref, 'message': 'Depuis un autre site.'})); ok(r.status == 403, '3. requête venue d’un autre site : refusée (403)', r.status)
    # 4 · un événement n'est jamais montré, même marqué public
    sql("insert into spaces (kind, title, owner_id, data) values ('evenement', 'Mariage secret', '%s', '{\"visibilite\":\"public\",\"briques\":[\"intention\"],\"modele\":\"mariage\"}'), ('projet', 'Projet ouvert', '%s', '{\"visibilite\":\"public\",\"briques\":[\"intention\"]}')" % (uid, uid))
    fiche = anon.get(B + '/api/reseau?ref=' + ref).text()
    ok('Mariage secret' not in fiche, '4. un mariage marqué « public » n’apparaît pas sur la fiche du Réseau'); ok('Projet ouvert' in fiche, '4. un projet public de son auteur y apparaît')
    # 5 · profil masqué de nouveau
    post(Pro, **dict(PROFIL, visible=False)); ok(anon.get(B + '/api/reseau?ref=' + ref).status == 404 and post(Cou, action='demande', ref=ref, message='Bonjour, encore.').status == 404, '5. profil recaché : fiche et demandes inaccessibles')
print('%d/%d' % (sum(res), len(res))); sys.exit(0 if all(res) else 1)
