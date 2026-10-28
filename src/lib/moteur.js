// Moteur d’analyse local de Point Zéro : domaine, entités, négation, ordre des causalités.
// Même forme de réponse que /api/analyse (Claude), qui prend la main quand il est configuré.
// @ts-nocheck
const Moteur = (function () {
  // ---------- outils ----------
  var NEG = ['pas', 'sans', 'aucun', 'aucune', 'ni', 'jamais', 'plus'];
  var MOIS = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
  var NOMBRES = { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, douze: 12, quinze: 15, vingt: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60, cent: 100, centaine: 100, vingtaine: 20, trentaine: 30, quarantaine: 40, cinquantaine: 50, dizaine: 10, douzaine: 12 };
  function plain(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function tokens(text) {
    var out = [], re = /https?:\/\/[^\s]+|www\.[^\s]+|[\w.+-]+@[\w-]+\.[\w.]+|\d+(?:[ .,]\d{3})*(?:[.,]\d+)?(?:\s?(?:k€|k\b|€))?|€|[A-Za-zÀ-ÖØ-öø-ÿœŒæÆ]+/g, m;
    while ((m = re.exec(text))) out.push({ raw: m[0], n: plain(m[0]), s: m.index, e: m.index + m[0].length });
    return out;
  }
  // ---------- lexique : domaines ----------
  // "mot" = commence par ; "=mot" = mot exact ; "a b c" = expression (chaque mot commence par)
  var DOMAINES = {
    union: { label: 'Union', studio: 'AIME Wedding', href: '/aime-wedding', mots: { mari: 4, noce: 3, wedding: 3, fianc: 2, '=pacs': 3, pacse: 3, temoin: 2, epou: 2, '=union': 2, 'liste de mariage': 3, 'lune de miel': 2, 'faire part': 1, 'jour j': 1, ceremonie: 1, 'vin d honneur': 2 },
      chemin: ['intention', 'calendrier', 'budget', 'comparateur', 'devis', 'personnes', 'annonce', 'invitation', 'placement', 'programme', 'page', 'cagnotte', 'galerie', 'livreor', 'capsule'] },
    sal: { label: 'SAL', studio: 'Brode Way', href: '/studio/', mots: { '=sal': 4, 'stitch along': 4, 'a plusieurs': 1, ensemble: 1, collecti: 1 },
      chemin: ['annonce', 'invitation', 'calendrier', 'rappels', 'messages', 'suivi'] },
    broderie: { label: 'Broderie', studio: 'Brode Way', href: '/studio/', mots: { brod: 3, 'point de croix': 4, canevas: 2, aiguille: 2, '=dmc': 2, patron: 2, tambour: 2, '=aida': 2, ouvrage: 1, 'grille de points': 2, motif: 1, '=fils': 1 },
      chemin: ['import', 'conversion', 'grille', 'palette', 'atelier', 'suivi', 'journal', 'galerie', 'boutique'] },
    formation: { label: 'Formation', studio: 'Formation', href: 'Formation.dc.html', mots: { formation: 3, former: 2, '=cours': 2, apprendre: 2, enseign: 2, eleve: 2, apprenant: 3, stagiaire: 3, module: 2, lecon: 2, initiation: 2, tutoriel: 1, '=atelier': 1, pedagog: 2 },
      chemin: ['document', 'formation', 'quiz', 'personnes', 'suivi'] },
    presentation: { label: 'Présentation', studio: 'Présentation', href: 'Presentation.dc.html', mots: { presentation: 3, presenter: 2, diapo: 3, conference: 3, '=pitch': 3, keynote: 3, '=slides': 3, expose: 2, orateur: 2, 'prise de parole': 2 },
      chemin: ['document', 'presentation', 'annonce'] },
    site: { label: 'Site', studio: 'Habillage', href: 'Habillage.dc.html', mots: { '=site': 3, '=sites': 3, '=web': 2, refonte: 3, habill: 3, internet: 1, 'page d accueil': 2, wordpress: 3, wix: 3, shopify: 2 },
      chemin: ['import', 'site', 'habillage'] },
    evenement: { label: 'Événement', studio: 'Le Monde AIME', href: 'Monde.dc.html', mots: { concert: 3, soiree: 2, '=fete': 2, festival: 3, anniversaire: 2, spectacle: 3, evenement: 2, '=gala': 3, bapteme: 2, seminaire: 2, vernissage: 3 },
      chemin: ['intention', 'calendrier', 'lieu', 'annonce', 'billetterie', 'personnes', 'programme', 'galerie'] },
    vente: { label: 'Vente', studio: 'Le Monde AIME', href: 'Monde.dc.html', mots: { vendre: 3, '=vente': 3, '=ventes': 3, boutique: 2, '=shop': 2, '=etsy': 2, commande: 1, clientele: 2, produit: 1 },
      chemin: ['vitrine', 'boutique', 'annonce', 'avis', 'facture'] }
  };
  var GENERIQUE = { label: 'Projet', studio: 'Le Monde AIME', href: 'Monde.dc.html', chemin: ['intention', 'taches', 'personnes', 'page'] };
  // ---------- lexique : briques ----------
  var BRIQUES = {
    intention: {}, import: { importer: 2, '=pdf': 2, fichier: 2, tableur: 2, excel: 2, '=csv': 2, scan: 1 },
    modele: { modele: 2, exemple: 1, '=type': 1, gabarit: 2 },
    document: { document: 2, texte: 1, discours: 2, support: 2, notice: 2, rapport: 2, ecrire: 1, redig: 2 },
    grille: { grille: 2, maquette: 2, affiche: 2, carton: 1, composition: 1 },
    palette: { couleur: 2, palette: 2, '=dmc': 2, theme: 1, '=fils': 1, nuance: 2 },
    galerie: { photo: 2, galerie: 2, album: 2, portfolio: 2, image: 1 },
    media: { video: 2, musique: 2, playlist: 2, podcast: 2, '=son': 1, chanson: 2, film: 1 },
    page: { '=page': 2, vitrine: 1, 'en ligne': 1 },
    site: { '=site': 2, '=web': 1, internet: 1 }, habillage: { habill: 3, refonte: 2 },
    presentation: { presentation: 2, diapo: 2, conference: 2 },
    annonce: { annonc: 2, 'faire part': 3, 'save the date': 3, nouvelle: 1, lancement: 2, '=lancer': 1 },
    vitrine: { vitrine: 2, prestataire: 1, '=pro': 1, artisan: 1, freelance: 2 },
    personnes: { invite: 2, personne: 2, participant: 2, '=amis': 1, famille: 1, eleve: 1, client: 1, '=gens': 1, membre: 2, public: 1 },
    invitation: { invit: 2, inscri: 2, '=rsvp': 3, reponse: 1, convier: 2, convie: 2 },
    roles: { temoin: 2, '=role': 2, '=roles': 2, equipe: 2, benevole: 2, organisat: 1, responsable: 1 },
    placement: { 'plan de table': 4, '=table': 2, '=tables': 2, placement: 3, 'plan de salle': 3, '=places': 1 },
    annuaire: { annuaire: 3, traiteur: 2, photographe: 2, fleuriste: 2, '=dj': 2, mercerie: 2, musicien: 2, saxophon: 2, prestataire: 2 },
    taches: { tache: 2, preparer: 1, organis: 1, 'a faire': 2, checklist: 2, retroplanning: 3 },
    calendrier: { calendrier: 2, planning: 2, '=date': 2, '=dates': 2 },
    programme: { programme: 2, deroule: 3, 'jour j': 2, horaire: 2, timing: 2 },
    suivi: { suivi: 2, suivre: 2, progress: 2, avancement: 2, avancer: 1 },
    rappels: { rappel: 2, relance: 2, relancer: 2, oubli: 1 },
    messages: { message: 2, discut: 2, '=groupe': 1, echanger: 2 },
    sondage: { sondage: 3, '=vote': 2, voter: 2, choisir: 1, avis: 1 },
    questions: { question: 2, '=faq': 3 },
    livreor: { 'livre d or': 4, remerci: 2, '=mots': 1 },
    budget: { budget: 3, depense: 2, '=cout': 2, '=couts': 2, '=prix': 1, financ: 1 },
    devis: { devis: 3, tarif: 2 },
    cagnotte: { cagnotte: 3, 'liste de mariage': 3, collecte: 2, cadeau: 2, '=don': 2, '=dons': 2 },
    boutique: { boutique: 2, vendre: 2, '=vente': 2, '=shop': 2, '=etsy': 2 },
    billetterie: { billet: 3, ticket: 3, entree: 1, payant: 2 },
    facture: { factur: 3, paiement: 1, '=urssaf': 2 },
    comparateur: { compar: 3, hesit: 2, '=choix': 1 },
    selection: { favori: 2, 'coup de coeur': 3, selection: 2, '=idees': 1, inspiration: 2, pinterest: 2 },
    avis: { '=avis': 2, '=note': 1, critique: 2, temoignage: 2 },
    formation: { formation: 2, '=cours': 2, apprendre: 2 },
    quiz: { '=quiz': 3, '=test': 1, evaluat: 2, examen: 2 },
    fiche: { fiche: 2, tuto: 2, 'pas a pas': 2, mode: 0 },
    journal: { journal: 2, carnet: 2, '=blog': 1 },
    capsule: { capsule: 3, 'plus tard': 2, souvenir: 2, 'dans dix ans': 3 },
    lieu: { '=lieu': 2, '=salle': 2, chateau: 2, domaine: 1, adresse: 2, campagne: 2, eglise: 2, mairie: 2, '=plage': 2, jardin: 1 },
    itineraire: { itineraire: 3, venir: 1, acces: 2, parking: 2, transport: 2, navette: 2, hebergement: 2, hotel: 2 },
    conversion: { convert: 3, transform: 1, portrait: 2 },
    atelier: { broder: 2, aiguille: 1, '=point': 1 }
  };
  var FEEDS = {};
  // ---------- correspondance ----------
  function matchAt(toks, i, key) {
    var exact = key.charAt(0) === '=', k = exact ? key.slice(1) : key, parts = k.split(' ');
    for (var j = 0; j < parts.length; j++) {
      var t = toks[i + j]; if (!t) return 0;
      var w = parts[j];
      if (exact || parts.length > 1 && w.length <= 2 ? t.n !== w : t.n.indexOf(w) !== 0) return 0;
    }
    return parts.length;
  }
  function negated(toks, i) {
    for (var j = i - 1; j >= Math.max(0, i - 3); j--) { if (NEG.indexOf(toks[j].n) >= 0) return j; }
    return -1;
  }
  function scan(toks, lex) {
    var hits = [];
    Object.keys(lex).forEach(function (key) {
      if (!lex[key]) return;
      for (var i = 0; i < toks.length; i++) {
        var n = matchAt(toks, i, key);
        if (n) hits.push({ key: key, w: lex[key], s: toks[i].s, e: toks[i + n - 1].e, neg: negated(toks, i) >= 0, negAt: negated(toks, i), i: i });
      }
    });
    return hits;
  }
  function num(t) {
    if (!t) return null;
    if (NOMBRES[t.n] != null) return NOMBRES[t.n];
    var m = t.n.replace(/\s/g, '').match(/^(\d+(?:[.,]\d+)?)(k)?/); if (!m) return null;
    var v = parseFloat(m[1].replace(',', '.')); if (m[2]) v *= 1000; return v;
  }
  // ---------- entités ----------
  function entites(text, toks) {
    var E = { dates: [], montants: [], personnes: [], lieux: [], liens: [], courriels: [] }, i, t;
    for (i = 0; i < toks.length; i++) {
      t = toks[i];
      if (/^(https?:\/\/|www\.)/.test(t.n)) { E.liens.push({ v: t.raw, s: t.s, e: t.e }); continue; }
      if (/@/.test(t.n)) { E.courriels.push({ v: t.raw, s: t.s, e: t.e }); continue; }
      var mi = MOIS.indexOf(t.n);
      if (mi >= 0) {
        var s = t.s, e = t.e, label = t.raw;
        if (toks[i - 1] && /^\d{1,2}$/.test(toks[i - 1].n)) { s = toks[i - 1].s; label = toks[i - 1].raw + ' ' + label; }
        if (toks[i + 1] && /^20\d\d$/.test(toks[i + 1].n)) { e = toks[i + 1].e; label += ' ' + toks[i + 1].raw; }
        E.dates.push({ v: label, s: s, e: e }); continue;
      }
      if (/^\d{1,2}[\/.]\d{1,2}([\/.]\d{2,4})?$/.test(t.n) || /^20\d\d$/.test(t.n) && !(toks[i - 1] && MOIS.indexOf(toks[i - 1].n) >= 0)) { E.dates.push({ v: t.raw, s: t.s, e: t.e }); continue; }
      if (['printemps', 'ete', 'automne', 'hiver', 'demain', 'semaine', 'mois', 'week'].indexOf(t.n) >= 0 || t.n === 'an' || t.n === 'ans' && toks[i - 2] && toks[i - 2].n === 'dans') { E.dates.push({ v: t.raw, s: t.s, e: t.e }); continue; }
      var v = num(t);
      if (v != null) {
        var nx = toks[i + 1], money = /€|k€/.test(t.n) || nx && (nx.n === '€' || /^euro/.test(nx.n));
        if (money) { E.montants.push({ v: v, s: t.s, e: nx && (nx.n === '€' || /^euro/.test(nx.n)) ? nx.e : t.e }); continue; }
        var k = nx && nx.n === 'de' ? toks[i + 2] : nx;
        if (k && /^(invite|personne|participant|eleve|apprenant|stagiaire|convive|membre|ami|gens|adulte|enfant|brodeuse|client)/.test(k.n)) { E.personnes.push({ v: v, s: t.s, e: k.e }); continue; }
      }
      if ((t.n === 'a' || t.n === 'au' || t.n === 'en' || t.n === 'dans') && toks[i + 1]) {
        var j = i + 1; if (toks[j].n === 'la' || toks[j].n === 'le' || toks[j].n === 'l') j++;
        var w = toks[j];
        if (w && /^[A-ZÀ-Ý]/.test(w.raw) && t.n !== 'en') { E.lieux.push({ v: w.raw, s: t.s, e: w.e }); continue; }
        if (w && /^(campagne|chateau|plage|montagne|mer|mairie|eglise|jardin|salle|domaine|ferme|restaurant|maison)/.test(w.n)) { E.lieux.push({ v: (toks[j - 1] !== t ? toks[j - 1].raw + ' ' : '') + w.raw, s: t.s, e: w.e }); }
      }
    }
    return E;
  }
  // ---------- analyse ----------
  function analyse(text, opts) {
    opts = opts || {};
    var feeds = opts.feeds || FEEDS, toks = tokens(text || ''), dom = null, best = 0, second = null, scores = {};
    Object.keys(DOMAINES).forEach(function (k) {
      var sc = 0; scan(toks, DOMAINES[k].mots).forEach(function (h) { if (!h.neg) sc += h.w; });
      scores[k] = sc;
    });
    if (scores.sal > 0 && scores.broderie > 0) scores.sal += 2;
    if (scores.sal > 0 && scores.broderie === 0 && scores.sal < 4) scores.sal = 0;
    var order = Object.keys(scores).sort(function (a, b) { return scores[b] - scores[a]; });
    best = scores[order[0]]; dom = best > 0 ? order[0] : null; second = scores[order[1]] > 0 ? order[1] : null;
    // une forme (formation, présentation, site, SAL, vente) l'emporte sur un sujet (union, broderie, événement) : on forme SUR un sujet
    var FORMES = ['sal', 'formation', 'presentation', 'site', 'vente'], sujet = null;
    if (dom && FORMES.indexOf(dom) < 0) { var f = FORMES.filter(function (k) { return scores[k] >= 3; }).sort(function (a, b) { return scores[b] - scores[a]; })[0]; if (f) { sujet = dom; second = dom; dom = f; best = scores[f]; } }
    else if (dom) { sujet = order.filter(function (k) { return FORMES.indexOf(k) < 0 && scores[k] > 0; })[0] || null; }
    var D = dom ? DOMAINES[dom] : GENERIQUE;
    if (dom === 'vente' && sujet) D = { label: D.label, studio: DOMAINES[sujet].studio, href: DOMAINES[sujet].href, chemin: D.chemin };
    var conf = !dom ? 0 : (best >= 4 && (!second || best >= 2 * scores[second]) ? 1 : (best >= 2 ? 0.6 : 0.35));
    var reasons = {}, ecartees = {}, marks = [];
    var add = function (id, r) { (reasons[id] = reasons[id] || []).push(r); };
    Object.keys(BRIQUES).forEach(function (id) {
      scan(toks, BRIQUES[id]).forEach(function (h) {
        var q = text.slice(h.s, h.e);
        if (h.neg) { ecartees[id] = text.slice(toks[h.negAt].s, h.e); }
        else { add(id, { q: q, s: h.s, e: h.e }); }
      });
    });
    var E = entites(text || '', toks);
    E.dates.forEach(function (d) { add('calendrier', { q: d.v, s: d.s, e: d.e, ent: 'date' }); });
    E.montants.forEach(function (m) { add('budget', { q: text.slice(m.s, m.e), s: m.s, e: m.e, ent: 'montant' }); });
    E.personnes.forEach(function (p) { add('personnes', { q: text.slice(p.s, p.e), s: p.s, e: p.e, ent: 'personnes' }); });
    E.lieux.forEach(function (l) { add('lieu', { q: text.slice(l.s, l.e), s: l.s, e: l.e, ent: 'lieu' }); });
    E.liens.forEach(function (l) { add('import', { q: l.v, s: l.s, e: l.e, ent: 'lien' }); if (dom === 'site' || !dom) add('habillage', { q: l.v, s: l.s, e: l.e, ent: 'lien' }); });
    E.courriels.forEach(function (c) { add('personnes', { q: c.v, s: c.s, e: c.e, ent: 'courriel' }); });
    (opts.fichiers || []).forEach(function (f) {
      add('import', { q: f.nom, fichier: true });
      if (f.genre === 'image') add(dom === 'broderie' || dom === 'sal' ? 'conversion' : 'galerie', { q: f.nom, fichier: true });
      if (f.genre === 'tableur') add('personnes', { q: f.nom, fichier: true });
      if (f.genre === 'pdf' || f.genre === 'texte') add('document', { q: f.nom, fichier: true });
      if (f.genre === 'page') add('site', { q: f.nom, fichier: true });
    });
    Object.keys(ecartees).forEach(function (id) { if (reasons[id] && reasons[id].some(function (r) { return r.ent || r.fichier; })) delete ecartees[id]; else delete reasons[id]; });
    var path = D.chemin.filter(function (id) { return !ecartees[id]; });
    if ((opts.mode === 'importer' || (opts.fichiers || []).length || E.liens.length) && path.indexOf('import') < 0) path.unshift('import');
    if (opts.mode === 'annoncer' && path.indexOf('annonce') < 0) path.push('annonce');
    // les briques citées hors recette : placées après la dernière brique qui les nourrit
    Object.keys(reasons).forEach(function (id) {
      if (path.indexOf(id) >= 0) return;
      var at = -1;
      path.forEach(function (p, i) { if ((feeds[p] || []).indexOf(id) >= 0) at = i; });
      if (at >= 0) path.splice(at + 1, 0, id); else path.push(id);
    });
    var direct = path.slice(), cons = [], from = {};
    direct.forEach(function (k) { (feeds[k] || []).forEach(function (f) { if (direct.indexOf(f) < 0 && !ecartees[f]) { if (cons.indexOf(f) < 0) cons.push(f); (from[f] = from[f] || []).push(k); } }); });
    Object.keys(reasons).forEach(function (id) { reasons[id].forEach(function (r) { if (r.s != null) marks.push({ s: r.s, e: r.e, id: id }); }); });
    marks.sort(function (a, b) { return a.s - b.s || b.e - a.e; });
    var clean = []; marks.forEach(function (m) { if (!clean.length || m.s >= clean[clean.length - 1].e) clean.push(m); });
    return {
      domaine: dom || 'projet', label: D.label, studio: D.studio, href: D.href, target: /^http/.test(D.href) ? '_blank' : '_self',
      certitude: conf, autre: second && second !== dom ? DOMAINES[second].label : null, sujet: sujet ? DOMAINES[sujet].label : null, scores: scores,
      chemin: path, recette: D.chemin.filter(function (id) { return path.indexOf(id) >= 0; }), allumees: direct, eclairees: cons, decoulede: from,
      raisons: reasons, ecartees: ecartees, entites: E, marques: clean
    };
  }
  return { analyse: analyse, tokens: tokens, plain: plain, DOMAINES: DOMAINES, BRIQUES: BRIQUES };
})();
export default Moteur;
