// Moteur d'analyse de Point Zéro, second étage : Claude lit une intention (texte, image ou PDF)
// et renvoie les briques de la Grille 44 à allumer, dans l'ordre, avec leurs raisons.
// Même forme de réponse que le moteur local (moteur.js) : la grille n'a rien à changer.
import { BRIQUES, IDS } from './_briques.mjs';

const DOMAINES = {
  union: { label: 'Union', studio: 'AIME Wedding' },
  broderie: { label: 'Broderie', studio: 'Brode Way' },
  sal: { label: 'SAL', studio: 'Brode Way' },
  formation: { label: 'Formation', studio: 'Formation' },
  presentation: { label: 'Présentation', studio: 'Présentation' },
  site: { label: 'Site', studio: 'Habillage' },
  evenement: { label: 'Événement', studio: 'Le Monde AIME' },
  vente: { label: 'Vente', studio: 'Le Monde AIME' },
  projet: { label: 'Projet', studio: 'Le Monde AIME' },
};
const MAX_TEXTE = 8000, MAX_FICHIER = 3 * 1024 * 1024, FENETRE = 60000, PAR_FENETRE = 20;
const TYPES = { 'image/jpeg': 'image', 'image/png': 'image', 'image/webp': 'image', 'image/gif': 'image', 'application/pdf': 'document' };
const appels = new Map();

const OUTIL = {
  name: 'allumer_la_grille',
  description: 'Renvoie les briques de la Grille 44 qui correspondent au projet décrit, dans l’ordre où on les utiliserait.',
  input_schema: {
    type: 'object',
    properties: {
      domaine: { type: 'string', enum: Object.keys(DOMAINES), description: 'La forme du projet. Une forme (formation, presentation, site, sal, vente) l’emporte sur un sujet (union, broderie, evenement) : une formation sur la broderie est une formation.' },
      sujet: { type: ['string', 'null'], enum: [...Object.keys(DOMAINES), null], description: 'Le sujet quand il diffère de la forme, sinon null.' },
      certitude: { type: 'number', minimum: 0, maximum: 1 },
      resume: { type: 'string', description: 'Une phrase en français qui reformule le projet.' },
      chemin: {
        type: 'array', maxItems: 20,
        description: 'Les briques à allumer, de la première à faire à la dernière, en suivant les causalités (une brique vient après celles qui la nourrissent).',
        items: { type: 'object', properties: { id: { type: 'string', enum: IDS }, raison: { type: 'string', description: 'Citation exacte et courte du texte qui justifie la brique, ou à défaut une explication de 10 mots maximum.' } }, required: ['id', 'raison'] },
      },
      ecartees: {
        type: 'array', description: 'Briques que la personne exclut explicitement (« sans budget », « pas de plan de table »).',
        items: { type: 'object', properties: { id: { type: 'string', enum: IDS }, citation: { type: 'string' } }, required: ['id', 'citation'] },
      },
      entites: {
        type: 'object',
        properties: {
          dates: { type: 'array', items: { type: 'string' } },
          montants: { type: 'array', items: { type: 'number' }, description: 'En euros.' },
          personnes: { type: 'array', items: { type: 'number' } },
          lieux: { type: 'array', items: { type: 'string' } },
          liens: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    required: ['domaine', 'certitude', 'resume', 'chemin', 'ecartees', 'entites'],
  },
};

const SYSTEME = `Tu es le moteur d'analyse de Point Zéro, l'étape 0 d'AIME. Une personne écrit ou importe ce qu'elle veut faire ; tu choisis les briques de la Grille 44 qui serviront son projet.
Règles :
- N'utilise que les briques du catalogue ci-dessous, par leur id.
- Ordonne-les comme on les utiliserait, en respectant « nourrit » : une brique vient après celles qui la nourrissent.
- Entre 3 et 15 briques. Ne force rien : une brique sans lien avec le projet n'y va pas.
- Chaque raison est une citation exacte et courte du texte quand c'est possible.
- Une exclusion explicite (« sans », « pas de », « aucun ») va dans ecartees, pas dans chemin.
- Les entités ne reprennent que ce qui est écrit ou visible : n'invente ni date, ni montant, ni nombre.
- Pour une image ou un PDF, appuie-toi sur ce que tu y vois réellement.
Catalogue (id · nom · famille · rôle · nourrit) :
${BRIQUES.map(b => `${b.id} · ${b.nom} · ${b.famille} · ${b.role} · ${b.nourrit.join(', ') || '—'}`).join('\n')}`;

function origineAutorisee(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // appel serveur à serveur ou même origine sans en-tête
  if (origin === `https://${req.headers.host}`) return origin;
  const liste = String(process.env.ANALYSE_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  return liste.some(o => o === origin || (o.startsWith('*.') && origin.startsWith('https://') && origin.endsWith(o.slice(1)))) ? origin : false;
}
function limite(ip) {
  const now = Date.now(), l = (appels.get(ip) || []).filter(t => now - t < FENETRE);
  if (l.length >= PAR_FENETRE) return false;
  l.push(now); appels.set(ip, l);
  if (appels.size > 5000) appels.clear();
  return true;
}
// Retrouve chaque citation dans le texte pour pouvoir la surligner.
function placer(texte, q) {
  if (!q || !texte) return {};
  const i = texte.toLowerCase().indexOf(q.toLowerCase());
  return i >= 0 ? { s: i, e: i + q.length } : {};
}
export function nettoyer(entree, texte) {
  const dom = DOMAINES[entree.domaine] ? entree.domaine : 'projet';
  const vus = new Set(), raisons = {}, chemin = [];
  for (const c of Array.isArray(entree.chemin) ? entree.chemin : []) {
    if (!c || !IDS.includes(c.id) || vus.has(c.id)) continue;
    vus.add(c.id); chemin.push(c.id);
    const q = String(c.raison || '').slice(0, 160);
    raisons[c.id] = [{ q, ...placer(texte, q) }];
  }
  const ecartees = {};
  for (const x of Array.isArray(entree.ecartees) ? entree.ecartees : []) {
    if (x && IDS.includes(x.id) && !vus.has(x.id)) ecartees[x.id] = String(x.citation || '').slice(0, 160);
  }
  const E = entree.entites || {}, liste = (a, f) => (Array.isArray(a) ? a : []).slice(0, 10).filter(f).map(v => ({ v }));
  const sujet = DOMAINES[entree.sujet] && entree.sujet !== dom ? DOMAINES[entree.sujet].label : null;
  return {
    source: 'claude', domaine: dom, label: DOMAINES[dom].label, studio: DOMAINES[dom].studio,
    certitude: Math.max(0, Math.min(1, Number(entree.certitude) || 0)), sujet, autre: null,
    resume: String(entree.resume || '').slice(0, 300), chemin, raisons, ecartees,
    entites: {
      dates: liste(E.dates, x => typeof x === 'string'), montants: liste(E.montants, Number.isFinite),
      personnes: liste(E.personnes, Number.isFinite), lieux: liste(E.lieux, x => typeof x === 'string'),
      liens: liste(E.liens, x => typeof x === 'string'), courriels: [],
    },
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const origine = origineAutorisee(req);
  if (typeof origine === 'string') { res.setHeader('Access-Control-Allow-Origin', origine); res.setHeader('Vary', 'Origin'); }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(origine ? 204 : 403).send('');
  const pret = !!process.env.ANTHROPIC_API_KEY;
  if (req.method === 'GET') return res.status(200).json({ ready: pret });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée.' });
  if (!origine) return res.status(403).json({ error: 'Origine non autorisée.' });
  if (!pret) return res.status(503).json({ error: 'Analyse par Claude non configurée : la clé ANTHROPIC_API_KEY manque côté serveur. Le moteur local reste disponible.' });
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'inconnu';
  if (!limite(ip)) { res.setHeader('Retry-After', '60'); return res.status(429).json({ error: 'Trop d’analyses à la suite. Réessayez dans une minute.' }); }

  const { texte = '', mode = 'decrire', fichier } = req.body || {};
  if (typeof texte !== 'string' || texte.length > MAX_TEXTE) return res.status(400).json({ error: `Le texte doit faire moins de ${MAX_TEXTE} caractères.` });
  const contenu = [];
  if (fichier) {
    const genre = TYPES[fichier.type];
    const data = typeof fichier.data === 'string' ? fichier.data : '';
    if (!genre || !/^[A-Za-z0-9+/=]+$/.test(data) || data.length * 0.75 > MAX_FICHIER) return res.status(400).json({ error: 'Fichier refusé : image (JPEG, PNG, WebP, GIF) ou PDF de 3 Mo maximum.' });
    contenu.push({ type: genre, source: { type: 'base64', media_type: fichier.type, data } });
  }
  const nom = fichier && typeof fichier.nom === 'string' ? fichier.nom.slice(0, 120) : '';
  if (!texte.trim() && !contenu.length) return res.status(400).json({ error: 'Écrivez quelques mots ou joignez un fichier.' });
  contenu.push({ type: 'text', text: `Mode : ${['decrire', 'importer', 'annoncer'].includes(mode) ? mode : 'decrire'}.${nom ? ` Fichier : « ${nom} ».` : ''}\nCe que la personne a écrit :\n${texte.trim() || '(rien, seulement le fichier)'}` });

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: process.env.ANALYSE_MODEL || 'claude-haiku-5-5', max_tokens: 1500, system: SYSTEME, tools: [OUTIL], tool_choice: { type: 'tool', name: OUTIL.name }, messages: [{ role: 'user', content: contenu }] }),
      signal: AbortSignal.timeout(25000),
    });
    if (!r.ok) return res.status(502).json({ error: `Claude n’a pas pu analyser (HTTP ${r.status}). Le moteur local prend le relais.` });
    const data = await r.json();
    const bloc = (data.content || []).find(c => c.type === 'tool_use' && c.name === OUTIL.name);
    if (!bloc || typeof bloc.input !== 'object') return res.status(502).json({ error: 'Réponse de Claude inattendue. Le moteur local prend le relais.' });
    return res.status(200).json(nettoyer(bloc.input, texte));
  } catch {
    return res.status(504).json({ error: 'Analyse trop longue ou indisponible. Le moteur local prend le relais.' });
  }
}
