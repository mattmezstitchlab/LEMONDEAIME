// /api/fournisseurs : les façons d'entrer disponibles sur cet environnement (aucun secret renvoyé).
import { pret, envoiPret, googlePret } from './_auth/auth.mjs';
export default function fournisseurs(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store');
  const ouvert = pret();
  res.end(JSON.stringify({ comptes: ouvert, google: ouvert && googlePret(), lien: ouvert && envoiPret(), cle: ouvert }));
}
