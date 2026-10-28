"""Enregistrement des preuves de parcours (partagé par les tests de bout en bout)."""
def enregistrer_preuve(fichier, resultats, environnement):
    """Ajoute le résultat de ce parcours à cartographie/preuves.json (un parcours par fichier)."""
    import json, os, subprocess, datetime
    racine = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    chemin = os.path.join(racine, 'cartographie', 'preuves.json')
    try: tout = json.load(open(chemin))
    except Exception: tout = {}
    commit = subprocess.run(['git', 'rev-parse', '--short', 'HEAD'], capture_output=True, text=True, cwd=racine).stdout.strip()
    modifie = subprocess.run(['git', 'status', '--porcelain', '--', 'src', 'api'], capture_output=True, text=True, cwd=racine).stdout.strip() != ''
    tout[fichier] = {'date': datetime.date.today().isoformat(), 'commit': commit, 'code_modifie_depuis_le_commit': modifie, 'environnement': environnement, 'resultats': resultats}
    with open(chemin, 'w') as f: json.dump(dict(sorted(tout.items())), f, ensure_ascii=False, indent=1); f.write('\n')
