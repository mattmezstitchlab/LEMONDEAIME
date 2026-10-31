/**
 * Le Bureau éditorial (phase 3) : la landing en aperçu fidèle, ses sections, et des inspecteurs pour ses textes et ses images.
 * Le cycle : modifier → Enregistrer (un brouillon) → Prévisualiser (la version enregistrée, telle que le public la verra)
 * → Publier → Restaurer une version antérieure. Rien n'est perdu : chaque version reste dans l'historique.
 *
 * Accès : réservé à l'adresse AIME_ADMIN, vérifiée par le serveur à chaque appel ; cette page ne fait que le demander.
 * Adresse : /studio/bureau (le lien de connexion ramène à /bureau, redirigé ici).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ORIGINE, validerContenus, type Contenus, type Media } from "../components/edition/contenus";
import type { Ecart } from "../components/edition/validation.mjs";
import { api, type Version } from "./api";
import Inspecteur from "./Inspecteur";
import Moderation from "./Moderation";
import Mediatheque from "./Mediatheque";
import { ecrire, lire, SECTIONS, sectionDe } from "./sections";
import type { MediaBureau } from "./catalogue";
import "../design/aime.css";
import "./Bureau.css";

const BASE = import.meta.env.BASE_URL;
const date = (s: string | null) => s ? new Date(s).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "";
const ETATS = { brouillon: "Brouillon", publie: "Publiée", archive: "Archivée" } as const;

/* ——— l'entrée : connexion par lien e-mail ; refus clair pour un autre compte ——— */
type Acces = { etat: "attente" } | { etat: "admin" } | { etat: "connexion" } | { etat: "refus"; email: string } | { etat: "indisponible"; raison: string };
function useAcces(): [Acces, () => void] {
  const [a, setA] = useState<Acces>({ etat: "attente" });
  const verifier = useCallback(() => {
    void (async () => {
      const m = await api.moi();
      if (m.ok && m.donnees?.admin) return setA({ etat: "admin" });
      if (!m.ok && m.code !== 200) return setA({ etat: "indisponible", raison: m.raison ?? "Le Bureau ne répond pas." });
      const s = await api.session();
      const user = s.donnees && (s.donnees as { user?: { email: string } }).user;
      setA(user ? { etat: "refus", email: user.email } : { etat: "connexion" });
    })();
  }, []);
  useEffect(verifier, [verifier]);
  return [a, verifier];
}
function Entree({ acces, verifier }: { acces: Acces; verifier: () => void }) {
  const [email, setEmail] = useState(""), [msg, setMsg] = useState(""), [occupe, setOccupe] = useState(false);
  return <main className="bu-entree">
    <h1>Le Bureau</h1>
    {acces.etat === "attente" && <p role="status">Vérification de l’accès…</p>}
    {acces.etat === "indisponible" && <p role="alert">{acces.raison}</p>}
    {acces.etat === "refus" && <><p role="alert">Ce compte ({acces.email}) n’administre pas le site. Le Bureau est réservé à l’adresse d’administration.</p>
      <button type="button" className="bu-btn" onClick={() => { void api.sortir().then(verifier); }}>Se déconnecter</button></>}
    {acces.etat === "connexion" && <form onSubmit={e => { e.preventDefault(); setOccupe(true);
      void api.lien(email).then(r => { setOccupe(false); setMsg(r.ok ? "Un lien de connexion vient de partir. Ouvrez-le sur cet appareil : il ramène au Bureau." : r.raison ?? "Envoi impossible."); }); }}>
      <p>Le Bureau est réservé à l’administration du site. Recevez un lien de connexion par e-mail.</p>
      <label htmlFor="bu-email">Adresse e-mail</label>
      <input id="bu-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
      <button type="submit" className="bu-btn bu-btn-plein" disabled={occupe}>Recevoir le lien</button>
      <p role="status" className="bu-statut">{msg}</p>
    </form>}
  </main>;
}

/* ——— le Bureau ——— */
export default function Bureau() {
  const [acces, verifier] = useAcces();
  if (acces.etat !== "admin") return <Entree acces={acces} verifier={verifier} />;
  return <Editeur />;
}

function Editeur() {
  const [brouillon, setBrouillon] = useState<Contenus>(ORIGINE);
  const [enregistre, setEnregistre] = useState<{ id: string; json: string } | null>(null);   /* la dernière version enregistrée ou ouverte, et son contenu */
  const [versions, setVersions] = useState<Version[]>([]), [publie, setPublie] = useState<string | null>(null);
  const [choisie, setChoisie] = useState(SECTIONS[0].cle), [panneau, setPanneau] = useState<"inspecteur" | "historique" | "galerie">("inspecteur");
  const [aModerer, setAModerer] = useState<number | null>(null);
  /* le nombre d'œuvres signalées encore visibles, pour l'onglet Galerie (rien si la galerie ne répond pas) */
  useEffect(() => { void fetch("/api/galerie?signalements=1", { credentials: "same-origin" }).then(r => r.json()).then(j => { if (j?.ok) setAModerer(j.signalements.filter((x: { statut: string }) => x.statut === "visible").length); }).catch(() => {}); }, []);
  const [vue, setVue] = useState<"ordinateur" | "mobile">("ordinateur");
  const [statut, setStatut] = useState(""), [ecartsServeur, setEcartsServeur] = useState<Ecart[]>([]);
  const [confirmer, setConfirmer] = useState<null | { action: "publier" | "restaurer"; id: string }>(null);
  const [mediatheque, setMediatheque] = useState<(string | number)[] | null>(null);
  const cadre = useRef<HTMLIFrameElement>(null), hote = useRef<HTMLDivElement>(null), [echelle, setEchelle] = useState(1);
  /* le lien avec l'aperçu en direct : « attente » au chargement, « ok » quand il accuse réception, « muet » s'il ne répond plus */
  const [direct, setDirect] = useState<"attente" | "ok" | "muet">("attente"), [cleCadre, setCleCadre] = useState(0), silence = useRef(0), pretVu = useRef(false);

  const json = JSON.stringify(brouillon), modifie = !enregistre || enregistre.json !== json;
  const ecarts = useMemo(() => [...validerContenus(brouillon).ecarts, ...ecartsServeur], [brouillon, ecartsServeur]);
  const versionCourante = enregistre && !modifie ? versions.find(v => v.id === enregistre.id) : undefined;

  const actualiser = useCallback(async () => { const r = await api.etat(); if (r.ok && r.donnees) { setVersions(r.donnees.versions); setPublie(r.donnees.publie?.id ?? null); return r.donnees; } return null; }, []);
  const ouvrir = useCallback(async (id: string) => {
    const r = await api.version(id); if (!r.ok || !r.donnees) { setStatut(r.raison ?? "Version introuvable."); return; }
    setBrouillon(r.donnees.contenus); setEnregistre({ id, json: JSON.stringify(r.donnees.contenus) }); setEcartsServeur([]);
    setStatut(`Version ${id} ouverte dans l’éditeur.`);
  }, []);
  /* au départ : la version publiée, sinon les textes d'origine */
  useEffect(() => { void actualiser().then(e => { if (e?.publie) void ouvrir(e.publie.id); else setStatut("Aucune version publiée : l’éditeur part des textes d’origine."); }); }, [actualiser, ouvrir]);

  /* l'aperçu en direct : le brouillon part vers la page encadrée, la section cliquée revient */
  const envoyer = useCallback((m: object) => cadre.current?.contentWindow?.postMessage(m, window.location.origin), []);
  useEffect(() => {
    const recevoir = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== cadre.current?.contentWindow) return;
      const d = e.data as { type?: string; cle?: string };
      if (d?.type === "pz-bureau:pret") { pretVu.current = true; envoyer({ type: "pz-bureau:contenus", contenus: brouillonRef.current }); envoyer({ type: "pz-bureau:selection", cle: choisieRef.current }); }
      if (d?.type === "pz-bureau:recu") { window.clearTimeout(silence.current); setDirect("ok"); }
      if (d?.type === "pz-bureau:section" && d.cle && sectionDe(d.cle)) { setChoisie(d.cle); setPanneau("inspecteur"); }
    };
    window.addEventListener("message", recevoir); return () => window.removeEventListener("message", recevoir);
  }, [envoyer]);
  const brouillonRef = useRef(brouillon); brouillonRef.current = brouillon;
  const choisieRef = useRef(choisie); choisieRef.current = choisie;
  useEffect(() => {
    const t = setTimeout(() => {
      envoyer({ type: "pz-bureau:contenus", contenus: brouillon });
      /* l'aperçu a déjà parlé mais n'accuse pas réception en 3 s : on le dit (pendant son chargement, on attend) */
      if (pretVu.current) { window.clearTimeout(silence.current); silence.current = window.setTimeout(() => setDirect("muet"), 3000); }
    }, 120);
    return () => clearTimeout(t);
  }, [brouillon, envoyer]);
  const recharger = () => { pretVu.current = false; setDirect("attente"); setCleCadre(k => k + 1); };
  /* un aperçu qui ne s'est jamais annoncé en 12 s ne répond pas */
  useEffect(() => { if (direct !== "attente") return; const t = window.setTimeout(() => { if (!pretVu.current) setDirect("muet"); }, 12000); return () => window.clearTimeout(t); }, [direct, cleCadre]);
  useEffect(() => { envoyer({ type: "pz-bureau:selection", cle: choisie }); }, [choisie, vue, envoyer]);
  useEffect(() => {
    const el = hote.current; if (!el) return;
    const W = vue === "ordinateur" ? 1280 : 390, f = () => setEchelle(Math.min(1, el.clientWidth / W));
    f(); const ro = new ResizeObserver(f); ro.observe(el); return () => ro.disconnect();
  }, [vue]);
  useEffect(() => { const avant = (e: BeforeUnloadEvent) => { if (modifie && enregistre) e.preventDefault(); }; window.addEventListener("beforeunload", avant); return () => window.removeEventListener("beforeunload", avant); }, [modifie, enregistre]);

  const changer = (c: (string | number)[], v: unknown) => { setBrouillon(b => ecrire(b, c, v)); setEcartsServeur([]); };
  const remplacerPar = (m: MediaBureau) => {
    if (!mediatheque) return;
    const ancien = lire(brouillon, mediatheque) as Media;
    changer(mediatheque, { ...ancien, src: m.src, alt: m.alt, legende: m.legende, licence: m.licence, reconstitution: m.reconstitution, provenance: m.provenance,
      ...(ancien.cadrage ? { cadrage: { ordinateur: { x: 50, y: 50 }, mobile: { x: 50, y: 50 } } } : {}) });
    setMediatheque(null); setStatut(`Image remplacée par « ${m.titre} ». Réglez son cadrage, puis enregistrez.`);
  };

  const enregistrer = async () => {
    const note = (document.getElementById("bu-note") as HTMLInputElement | null)?.value ?? "";
    const r = await api.enregistrer(brouillon, note);
    if (!r.ok || !r.donnees) { setEcartsServeur(r.ecarts ?? []); setStatut(r.raison ?? "Enregistrement refusé."); return; }
    setEnregistre({ id: r.donnees.id, json }); const champ = document.getElementById("bu-note") as HTMLInputElement | null; if (champ) champ.value = ""; await actualiser(); setStatut(`Brouillon enregistré : version ${r.donnees.id}. Il n’est pas encore public.`);
  };
  const agir = async (action: "publier" | "restaurer", id: string) => {
    setConfirmer(null);
    const r = await api[action](id);
    if (!r.ok || !r.donnees) { setStatut(r.raison ?? "Action refusée."); return; }
    await actualiser();
    if (action === "restaurer") { await ouvrir(r.donnees.id); setStatut(`Version ${id} restaurée : elle est publiée comme version ${r.donnees.id}. Rien n’a été effacé.`); }
    else setStatut(`Version ${id} publiée : c’est elle que le public voit maintenant.`);
  };

  const section = sectionDe(choisie)!;
  const groupes = [...new Set(SECTIONS.map(s => s.groupe))];
  const surSection = new Set(ecarts.map(e => SECTIONS.find(s => e.chemin.startsWith(s.chemin.join(".")))?.cle));
  return <div className="bu">
    <header className="bu-tete">
      <p className="bu-marque">Le Bureau <span>· Point Zéro</span></p>
      <p className="bu-etat" aria-live="polite">{!enregistre && json === JSON.stringify(ORIGINE) ? <>Textes d’origine (jamais enregistrés)</>
        : modifie ? <><b>Modifications non enregistrées</b>{enregistre ? ` (depuis la version ${enregistre.id})` : ""}</>
        : versionCourante ? <>Version {versionCourante.id} · <b>{ETATS[versionCourante.etat]}</b></> : "—"}{publie ? <> · publiée : v{publie}</> : <> · rien de publié</>}</p>
      <div className="bu-actions">
        <input id="bu-note" className="bu-note" placeholder="Note de version (facultatif)" aria-label="Note de version" maxLength={200} />
        <button type="button" className="bu-btn bu-btn-plein" disabled={!modifie || ecarts.length > 0} onClick={() => void enregistrer()}>Enregistrer le brouillon</button>
        <a className={"bu-btn" + (modifie || !enregistre ? " bu-inactif" : "")} aria-disabled={modifie || !enregistre} target="_blank" rel="noopener"
          href={!modifie && enregistre ? `${BASE}?edition&apercu=${enregistre.id}` : undefined}
          title={modifie ? "Enregistrez d’abord : l’aperçu montre la version enregistrée" : undefined}>Prévisualiser</a>
        {confirmer?.action === "publier"
          ? <><button type="button" className="bu-btn bu-btn-alerte" onClick={() => void agir("publier", confirmer.id)}>Confirmer : publier la version {confirmer.id}</button>
              <button type="button" className="bu-btn" onClick={() => setConfirmer(null)}>Annuler</button></>
          : <button type="button" className="bu-btn" disabled={modifie || !enregistre || versionCourante?.etat === "publie"} onClick={() => enregistre && setConfirmer({ action: "publier", id: enregistre.id })}>Publier…</button>}
      </div>
      <p className="bu-statut bu-statut-general" role="status">{statut}</p>
    </header>
    <div className="bu-corps">
      <nav className="bu-sections" aria-label="Sections de la landing">
        {groupes.map(g => <div key={g}><p className="bu-groupe-nom">{g}</p>
          <ul>{SECTIONS.filter(s => s.groupe === g).map(s => <li key={s.cle}>
            <button type="button" aria-current={s.cle === choisie ? "true" : undefined} onClick={() => { setChoisie(s.cle); setPanneau("inspecteur"); }}>
              {s.nom}{surSection.has(s.cle) && <span className="bu-pastille" aria-label="(champ refusé)"> !</span>}</button></li>)}</ul></div>)}
      </nav>

      <section className="bu-apercu" aria-label="Aperçu en direct de la landing">
        <div className="bu-vues" role="group" aria-label="Taille de l’aperçu">
          {(["ordinateur", "mobile"] as const).map(v => <button key={v} type="button" aria-pressed={vue === v} onClick={() => setVue(v)}>{v === "ordinateur" ? "Ordinateur" : "Mobile"}</button>)}
          <span className={"bu-direct bu-direct-" + direct} role="status">{direct === "ok" ? "● En direct" : direct === "attente" ? "Connexion à l’aperçu…" : "L’aperçu ne répond pas"}</span>
          {direct === "muet" && <button type="button" className="bu-btn" onClick={recharger}>Recharger l’aperçu</button>}
          <span className="bu-aide">Brouillon non public. Cliquez une section dans l’aperçu pour l’inspecter.</span>
        </div>
        <div ref={hote} className={"bu-cadre bu-cadre-" + vue} style={{ height: (vue === "ordinateur" ? 800 : 844) * echelle }}>
          <iframe key={cleCadre} ref={cadre} title="Aperçu en direct de la landing (brouillon)" src={`${BASE}?edition&bureau`}
            style={{ width: vue === "ordinateur" ? 1280 : 390, height: vue === "ordinateur" ? 800 : 844, transform: `scale(${echelle})` }} />
        </div>
      </section>

      <aside className="bu-panneau" aria-label="Inspecteur et historique">
        <div className="bu-onglets" role="tablist">
          <button type="button" role="tab" aria-selected={panneau === "inspecteur"} onClick={() => setPanneau("inspecteur")}>Inspecteur</button>
          <button type="button" role="tab" aria-selected={panneau === "historique"} onClick={() => setPanneau("historique")}>Historique ({versions.length})</button>
          <button type="button" role="tab" aria-selected={panneau === "galerie"} onClick={() => setPanneau("galerie")}>Galerie{aModerer ? ` (${aModerer})` : ""}</button>
        </div>
        {panneau === "inspecteur" ? <div role="tabpanel" className="bu-inspecteur">
          <h2>{section.nom}</h2>
          <Inspecteur valeur={lire(brouillon, section.chemin)} chemin={section.chemin} changer={changer} ecarts={ecarts} remplacer={c => setMediatheque(c)} />
        </div> : panneau === "galerie" ? <div role="tabpanel" className="bu-historique"><Moderation compter={setAModerer} /></div>
        : <div role="tabpanel" className="bu-historique">
          <h2>Historique des versions</h2>
          <p className="bu-aide">Une version n’est jamais modifiée ni effacée. Restaurer republie une copie d’une version antérieure.</p>
          <ol>{versions.map(v => <li key={v.id} data-etat={v.etat}>
            <p><b>Version {v.id}</b> · {ETATS[v.etat]} · {date(v.cree_le)}{v.restaure_de ? ` · copie de la version ${v.restaure_de}` : ""}</p>
            {v.note && <p className="bu-note-version">{v.note}</p>}
            <p className="bu-version-actions">
              <button type="button" className="bu-lien" onClick={() => void ouvrir(v.id)}>Ouvrir dans l’éditeur</button>
              <a className="bu-lien" href={`${BASE}?edition&apercu=${v.id}`} target="_blank" rel="noopener">Aperçu</a>
              {v.etat === "archive" && (confirmer?.action === "restaurer" && confirmer.id === v.id
                ? <><button type="button" className="bu-btn bu-btn-alerte" onClick={() => void agir("restaurer", v.id)}>Confirmer : restaurer et publier</button>
                    <button type="button" className="bu-lien" onClick={() => setConfirmer(null)}>Annuler</button></>
                : <button type="button" className="bu-lien" onClick={() => setConfirmer({ action: "restaurer", id: v.id })}>Restaurer…</button>)}
            </p></li>)}</ol>
          {!versions.length && <p>Aucune version encore.</p>}
        </div>}
      </aside>
    </div>
    {mediatheque && <div className="bu-voile"><Mediatheque choisir={remplacerPar} fermer={() => setMediatheque(null)} /></div>}
  </div>;
}
