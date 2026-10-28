import { useEffect, useState, type FormEvent } from 'react';
import { Lien } from '../lib/router';
import { ecrireMonProfil, lireMonProfil, type Profil } from '../lib/reseau';
import { CarteProfil } from './Reseau';

/* Mon profil, dans mon espace : ce que le Réseau montre de moi, et seulement si je le décide. */
export default function MonProfil() {
  const [p, setP] = useState<Profil | null>(null);
  const [metiers, setMetiers] = useState<string[]>([]);
  const [msg, setMsg] = useState('');
  const [envoi, setEnvoi] = useState(false);
  useEffect(() => { lireMonProfil().then(r => {
    setMetiers(r.metiers || []);
    setP(r.profil || { nom: r.suggestion?.nom || '', metier: '', ville: '', bio: '', site: '', visible: false });
    if (!r.ok) setMsg(r.raison || '');
  }); }, []);
  if (!p) return <p style={{ marginTop: 24, fontSize: 18 }}>Chargement…</p>;
  const champ = (k: keyof Profil) => ({ value: String(p[k] ?? ''), onChange: (e: { target: { value: string } }) => setP({ ...p, [k]: e.target.value }) });
  const envoyer = async (e: FormEvent) => {
    e.preventDefault(); setEnvoi(true);
    const r = await ecrireMonProfil(p); setEnvoi(false);
    setMsg(r.ok ? (p.visible ? 'Profil enregistré : il apparaît dans le Réseau.' : 'Profil enregistré. Il reste caché tant que vous ne le rendez pas visible.') : (r.raison || 'Enregistrement impossible.'));
  };
  const etiquette = { display: 'grid', gap: 6, fontSize: 16, fontWeight: 600 } as const;
  return (
    <div style={{ marginTop: 'clamp(32px, 4vw, 56px)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: 40, alignItems: 'start' }}>
      <form onSubmit={envoyer} style={{ display: 'grid', gap: 18, maxWidth: 560 }} aria-labelledby="titre-profil">
        <h2 id="titre-profil" style={{ margin: 0, fontSize: 28, fontWeight: 600 }}>Mon profil</h2>
        <label style={etiquette}>Nom affiché<input className="champ" required maxLength={60} autoComplete="name" {...champ('nom')} /></label>
        <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
          <legend style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Ce que je fais</legend>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {metiers.map(m => <label key={m} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 44, padding: '0 14px', borderRadius: 999, border: '1px solid #0B0B0C', background: p.metier === m ? '#0B0B0C' : '#fff', color: p.metier === m ? '#fff' : '#0B0B0C', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
              <input type="radio" name="metier" value={m} required checked={p.metier === m} onChange={() => setP({ ...p, metier: m })} style={{ accentColor: '#fff', margin: 0 }} />{m}
            </label>)}
          </div>
        </fieldset>
        <label style={etiquette}><span>Ville ou région <span style={{ fontWeight: 400, color: '#55555A' }}>(facultatif)</span></span><input className="champ" maxLength={60} autoComplete="address-level2" {...champ('ville')} /></label>
        <label style={etiquette}><span>En quelques mots <span style={{ fontWeight: 400, color: '#55555A' }}>(400 caractères)</span></span><textarea className="champ" maxLength={400} rows={4} style={{ height: 'auto', padding: 14, lineHeight: 1.5, resize: 'vertical' }} {...champ('bio')} /></label>
        <label style={etiquette}><span>Mon site <span style={{ fontWeight: 400, color: '#55555A' }}>(facultatif)</span></span><input className="champ" type="url" inputMode="url" maxLength={200} placeholder="https://" {...champ('site')} /></label>
        <label style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: 16, borderRadius: 14, background: '#fff', border: '1px solid #E2E2DE', fontSize: 17, lineHeight: 1.45, cursor: 'pointer' }}>
          <input type="checkbox" checked={!!p.visible} onChange={e => setP({ ...p, visible: e.target.checked })} style={{ width: 22, height: 22, marginTop: 2, accentColor: '#0B0B0C', flex: 'none' }} />
          <span><b style={{ fontWeight: 600 }}>Apparaître dans le Réseau.</b> Votre nom, ce que vous faites, votre ville, vos mots et votre site. Jamais votre adresse e-mail.</span>
        </label>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="bouton noir" type="submit" disabled={envoi}>{envoi ? 'Enregistrement…' : 'Enregistrer'}</button>
          <Lien className="bouton" href="/reseau">Voir le Réseau</Lien>
        </div>
        <p role="status" aria-live="polite" style={{ margin: 0, minHeight: 24, fontSize: 16, fontWeight: 600 }}>{msg}</p>
      </form>
      <div aria-label="Aperçu de mon profil" role="region">
        <p className="surtitre">Aperçu{p.visible ? '' : ' · caché'}</p>
        <CarteProfil p={{ ...p, nom: p.nom || 'Votre nom', metier: p.metier || 'Ce que vous faites' }} />
      </div>
    </div>
  );
}
