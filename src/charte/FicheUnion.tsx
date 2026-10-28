import { useEffect, useState, type FormEvent } from 'react';
import { Lien } from '../lib/router';
import { ecrireBuro, nomUnion, type Projet } from '../lib/buro';
import { dateLisible } from '../../api/_orbe-local.mjs';

/* Les informations d'une union, dans Mon espace : ses prénoms, sa date officielle, son lieu.
   Une seule source : l'union rangée en base (spaces, modèle « mariage »). Seul son propriétaire la modifie. */
export function FicheUnion({ p, apres }: { p: Projet; apres: () => void }) {
  const u = p.union!;
  const [f, setF] = useState({ a: u.a, b: u.b, date: u.date, lieu: u.lieu });
  const [msg, setMsg] = useState('');
  useEffect(() => { setF({ a: u.a, b: u.b, date: u.date, lieu: u.lieu }); }, [p.id, u.a, u.b, u.date, u.lieu]);
  useEffect(() => { setMsg(''); }, [p.id]);
  const proprio = p.role === 'owner';
  const etiquette = { display: 'grid', gap: 6, fontSize: 16, fontWeight: 600 } as const;
  const facultatif = <span style={{ fontWeight: 400, color: '#55555A' }}>(facultatif)</span>;
  const enregistrer = async (e: FormEvent) => {
    e.preventDefault();
    const r = await ecrireBuro({ action: 'union-maj', id: p.id, union: f });
    setMsg(r.ok ? 'Enregistré.' : (r.raison || 'Enregistrement impossible.'));
    if (r.ok) apres();
  };
  const incomplet = !u.a || !u.b || !u.date;
  return (
    <section aria-labelledby="titre-union" style={{ marginTop: 36, maxWidth: 720, padding: 22, borderRadius: 22, border: '1px solid #E2E2DE', background: '#fff', display: 'grid', gap: 18 }}>
      <div>
        <h2 id="titre-union" style={{ margin: 0, fontSize: 28, fontWeight: 600 }}>{nomUnion(u) || p.titre}</h2>
        <p style={{ margin: '6px 0 0', fontSize: 16, lineHeight: 1.5, color: '#3A3A3F' }}>
          {u.date ? 'Date officielle : le ' + dateLisible(u.date) + (u.lieu ? ', ' + u.lieu : '') + '.' : 'Date officielle pas encore fixée.'}
          {incomplet && proprio && ' Complétez les prénoms et la date : ils serviront à votre programme.'}
        </p>
      </div>
      {proprio ? <form onSubmit={enregistrer} style={{ display: 'grid', gap: 14 }} aria-label="Les informations de notre union">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 14 }}>
          <label style={etiquette}>Premier prénom<input className="champ" maxLength={60} autoComplete="off" value={f.a} onChange={e => setF({ ...f, a: e.target.value })} /></label>
          <label style={etiquette}>Second prénom<input className="champ" maxLength={60} autoComplete="off" value={f.b} onChange={e => setF({ ...f, b: e.target.value })} /></label>
          <label style={etiquette}>Date officielle<input className="champ" type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></label>
          <label style={etiquette}><span>Lieu {facultatif}</span><input className="champ" maxLength={120} value={f.lieu} onChange={e => setF({ ...f, lieu: e.target.value })} /></label>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="bouton noir" type="submit" style={{ height: 48 }}>Enregistrer</button>
          <Lien className="bouton" href={'/moments?union=' + p.id} style={{ height: 48 }}>Voir notre programme</Lien>
          <span role="status" aria-live="polite" style={{ fontSize: 15, fontWeight: 600 }}>{msg}</span>
        </div>
      </form> : <p style={{ margin: 0, fontSize: 15, color: '#3A3A3F' }}>Seul le propriétaire de l’union modifie ces informations.</p>}
      <p className="profil-note" style={{ margin: 0 }}>Gardée dans votre espace, visible de vous seul pour l’instant. Les invitations et le partage viendront plus tard.</p>
    </section>
  );
}
