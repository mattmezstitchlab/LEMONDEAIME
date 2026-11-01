/**
 * .0NE — Première rencontre (prototype isolé, phase 3). L'interface s'adapte à la personne.
 * Chaque réglage écrit dans LA source de préférences (lib/one/preferences : le Confort de POINT ZÉRO + .0NE) et s'applique
 * aussitôt : l'aperçu au centre du Disque change, et le réglage est retrouvé après rechargement. Le parcours est facultatif,
 * interrompable et reprenable. Aucun diagnostic n'est demandé ni enregistré ; rien ne quitte l'appareil.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, Volume2 } from "lucide-react";
import DisqueOne from "../components/one/DisqueOne";
import { commandesDesUnivers } from "../components/one/commandes";
import { IconeOne } from "../components/one/icones";
import { ACCENTS, type Preferences } from "../lib/accessibilityCore";
import { appliquerOne, BESOINS, ecrireOne, lireOne, proposerPourBesoins, type Cibles, type IdBesoin, type PreferencesOne, themeOne } from "../lib/one/preferences";
import { NOMS_STATUTS } from "../lib/one/contrat";
import { suivreUnivers, tousLesUnivers } from "../lib/one/univers";
import { DESTINATIONS } from "../lib/destinations";
import { PROTOTYPES } from "../lib/site";
import "../design/aime.css";
import "./one.css";

const ETAPES = ["Bienvenue", "Confort visuel", "Confort sonore", "Interaction", "Vos besoins", "Vous", "Vos univers", "Prêt"] as const;
const PORTEE = { partout: "S’applique partout", one: "S’applique à .0NE ; raccordement aux ateliers à venir", garde: "Enregistré ; s’appliquera dès que la fonction existe" } as const;

function Choix<T extends string | number>({ nom, valeur, options, changer, portee }: { nom: string; valeur: T; options: [T, string][]; changer: (v: T) => void; portee: keyof typeof PORTEE }) {
  return <fieldset className="one-champ"><legend>{nom}<small>{PORTEE[portee]}</small></legend>
    <div className="one-segments">{options.map(([v, n]) => <button key={String(v)} type="button" aria-pressed={valeur === v} onClick={() => changer(v)}>{n}</button>)}</div>
  </fieldset>;
}
function Interrupteur({ nom, aide, actif, changer, portee }: { nom: string; aide?: string; actif: boolean; changer: (v: boolean) => void; portee: keyof typeof PORTEE }) {
  return <div className="one-champ one-inter"><button type="button" role="switch" aria-checked={actif} onClick={() => changer(!actif)}>
    <span className="one-inter-texte"><b>{nom}</b>{aide && <span>{aide}</span>}<small>{PORTEE[portee]}</small></span><span className="one-bascule" aria-hidden="true" /></button></div>;
}

/** un son bref et volontaire (aucun diagnostic) ; le signal visuel l'accompagne toujours */
function jouer(volume: number) {
  try {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext; if (!C) return false;
    const a = new C(), o = a.createOscillator(), g = a.createGain();
    o.frequency.value = 660; g.gain.value = Math.max(0.0001, volume * 0.25); o.connect(g).connect(a.destination);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.35); o.start(); o.stop(a.currentTime + 0.36); return true;
  } catch { return false; }
}

/** Préférences déjà enregistrées : on va directement à l'accueil de choix, sauf si la personne vient les modifier (?modifier). */
const MODIFIER = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("modifier");

export default function PremiereRencontre() {
  const [p, setP] = useState<PreferencesOne>(() => { const q = lireOne(); return MODIFIER ? { ...q, rencontre: { ...q.rencontre, etape: 0 } } : q; });
  const dejaFaite = useRef(!MODIFIER && lireOne().rencontre.terminee);
  useEffect(() => { if (dejaFaite.current) window.location.replace(DESTINATIONS.accueil); }, []);
  const [enregistre, setEnregistre] = useState(true);
  const [annonce, setAnnonce] = useState("");
  const [signal, setSignal] = useState(0);
  const [essai, setEssai] = useState<{ attente: boolean; fait: number }>({ attente: false, fait: 0 });
  const [besoins, setBesoins] = useState<IdBesoin[]>(p.besoins);
  const [, setVersion] = useState(0);
  const titre = useRef<HTMLHeadingElement>(null);
  useEffect(() => { appliquerOne(p); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => suivreUnivers(() => setVersion(v => v + 1)), []);
  const etape = Math.min(ETAPES.length - 1, p.rencontre.etape);
  const maj = (suite: PreferencesOne, dire?: string) => { setEnregistre(ecrireOne(suite)); setP(suite); if (dire) setAnnonce(dire); };
  const affichage = (patch: Partial<Preferences>, dire?: string) => maj({ ...p, affichage: { ...p.affichage, ...patch } }, dire);
  const aller = (n: number) => { maj({ ...p, rencontre: { etape: n, terminee: p.rencontre.terminee || n === ETAPES.length - 1 } }); requestAnimationFrame(() => titre.current?.focus()); window.scrollTo({ top: 0 }); };
  const theme = themeOne(p);
  const univers = tousLesUnivers();
  const modes = useMemo(() => commandesDesUnivers(univers, p.favoris), [univers.length, p.favoris.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const prenom = p.identite.prenom.trim();

  /* le centre du Disque : un aperçu réel, qui suit les réglages de l'étape */
  const centre: ReactNode = (() => {
    if (etape === 2) return <div className={"one-apercu" + (signal ? " one-signal" : "")} key={signal}><p className="one-apercu-titre">Une notification</p><p>{p.notifications.sons ? "Un son bref, et ce signal visuel." : "Sons coupés : ce signal visuel suffit."}</p></div>;
    if (etape === 3) return <div className="one-apercu"><p className="one-apercu-titre">Essayez</p>
      <button type="button" className="one-bouton one-bouton-plein" onClick={() => { if (p.interaction.validation === "confirmer" && !essai.attente) { setEssai({ ...essai, attente: true }); setAnnonce("Confirmez pour agir."); } else { setEssai({ attente: false, fait: essai.fait + 1 }); setAnnonce("Action faite."); } }}>
        {essai.attente ? "Confirmer" : "Agir"}</button><p className="one-petit">{essai.fait ? `Fait ${essai.fait} fois` : p.interaction.validation === "confirmer" ? "Deux temps : agir, puis confirmer" : "Un seul geste"}</p></div>;
    if (etape === 5) return <div className="one-apercu"><p className="one-apercu-titre">{prenom ? `Bonjour ${prenom}` : "Bonjour"}</p><p>{p.identite.ville || "Votre ville reste facultative."}</p></div>;
    if (etape === 6) return <div className="one-apercu"><p className="one-apercu-titre">{p.favoris.length} univers</p><p>Votre Disque se compose autour de vous.</p></div>;
    if (etape === 7) return <div className="one-apercu"><span className="one-coche" aria-hidden="true"><Check /></span><p className="one-apercu-titre">{prenom ? `${prenom}, votre .0NE est prêt` : "Votre .0NE est prêt"}</p></div>;
    return <div className="one-apercu"><p className="one-apercu-sur">01 · L’origine</p><p className="one-apercu-titre">Garance &amp; indigo</p><p>Des couleurs qui traversent les siècles.</p><span className="one-bouton one-bouton-plein" aria-hidden="true">Exemple</span></div>;
  })();

  const pied = <div className="one-pied">
    {etape > 0 && <button type="button" className="one-bouton" onClick={() => aller(etape - 1)}><ArrowLeft aria-hidden="true" />Retour</button>}
    {etape < ETAPES.length - 1
      ? <button type="button" className="one-bouton one-bouton-plein" onClick={() => aller(etape + 1)}>{etape === 0 ? "Commencer" : "Continuer"}<ArrowRight aria-hidden="true" /></button>
      : <a className="one-bouton one-bouton-plein" href={DESTINATIONS.accueil}>{PROTOTYPES ? "Continuer vers l’accueil" : "Continuer vers .0NE"}<ArrowRight aria-hidden="true" /></a>}
  </div>;

  let corps: ReactNode;
  if (etape === 0) corps = <>
    <p className="one-sur">Bienvenue dans .0NE</p>
    <h1 ref={titre} tabIndex={-1}>Bienvenue dans .0NE.</h1>
    <p className="one-chapeau">Avant de découvrir vos univers, réglons l’interface pour vous.</p>
    <p className="one-texte">Quelques étapes, toutes facultatives. Chaque réglage s’applique tout de suite et reste sur cet appareil. Aucun compte n’est nécessaire pour essayer.</p>
    <div className="one-pied">
      <button type="button" className="one-bouton one-bouton-plein" onClick={() => aller(1)}>{p.rencontre.terminee ? "Revoir mes réglages" : "Commencer"}<ArrowRight aria-hidden="true" /></button>
      <a className="one-bouton" href={DESTINATIONS.accueil}>Continuer sans régler</a>
    </div>
  </>;
  else if (etape === 1) corps = <>
    <h1 ref={titre} tabIndex={-1}>Votre confort visuel.</h1>
    <p className="one-texte">Regardez l’aperçu au centre du Disque : il change à chaque réglage. Ce n’est pas un examen de la vue, et rien ne remplace vos lunettes.</p>
    <Choix nom="Taille des caractères" portee="partout" valeur={p.affichage.fontScale} options={[[1, "100 %"], [1.12, "112 %"], [1.25, "125 %"], [1.5, "150 %"], [1.75, "175 %"]]} changer={v => affichage({ fontScale: v }, `Texte à ${Math.round(v * 100)} %.`)} />
    <Choix<Cibles> nom="Taille des commandes" portee="partout" valeur={p.interaction.cibles} options={[["standard", "Standard"], ["grandes", "Grandes"], ["tres-grandes", "Très grandes"]]} changer={v => maj({ ...p, interaction: { ...p.interaction, cibles: v } }, "Taille des commandes changée.")} />
    <Choix nom="Thème" portee="partout" valeur={p.themeChoisi || p.affichage.theme !== "system" ? p.affichage.theme : "light"} options={[["light", "Jour"], ["dark", "Nuit"], ["system", "Selon l’appareil"]]} changer={v => maj({ ...p, themeChoisi: true, affichage: { ...p.affichage, theme: v } }, "Thème changé.")} />
    <Choix nom="Contraste" portee="partout" valeur={p.affichage.contrast} options={[["normal", "Normal"], ["strong", "Renforcé"]]} changer={v => affichage({ contrast: v }, "Contraste changé.")} />
    <Choix nom="Espacement du texte" portee="partout" valeur={p.affichage.lineHeight >= 1.8 ? 2 : p.affichage.lineHeight >= 1.65 ? 1 : 0} options={[[0, "Standard"], [1, "Aéré"], [2, "Très aéré"]]}
      changer={v => affichage({ lineHeight: [1.5, 1.65, 1.8][v], spacing: [0, 0.03, 0.06][v] }, "Espacement changé.")} />
    <Choix nom="Couleurs" portee="partout" valeur={p.affichage.vision} options={[["standard", "Standard"], ["daltonisme", "Adaptées au daltonisme"], ["monochrome", "Monochrome"]]} changer={v => affichage({ vision: v }, "Couleurs changées.")} />
    <Interrupteur nom="Réduire les effets visuels" aide="Aucune animation ni voyage d’objet" portee="partout" actif={p.affichage.reduceMotion} changer={v => affichage({ reduceMotion: v })} />
    <Interrupteur nom="Repères renforcés" aide="Un contour de focus épais, un guide de lecture" portee="partout" actif={p.affichage.enhancedFocus} changer={v => affichage({ enhancedFocus: v, readingGuide: v })} />
    <fieldset className="one-champ"><legend>Couleur d’accent<small>{PORTEE.partout}</small></legend>
      <div className="one-segments">{ACCENTS.map(a => <button key={a.hex} type="button" aria-pressed={p.affichage.accent === a.hex} onClick={() => affichage({ accent: a.hex })}><i className="one-pastille" style={{ background: a.hex }} aria-hidden="true" />{a.name}</button>)}</div></fieldset>
    <p className="one-note">Le zoom de votre navigateur (Ctrl et + ou ⌘ et +) reste toujours disponible ; .0NE s’y adapte jusqu’à 200 %.</p>
    {pied}
  </>;
  else if (etape === 2) corps = <>
    <h1 ref={titre} tabIndex={-1}>Votre confort sonore.</h1>
    <p className="one-texte">.0NE ne dépend jamais du son seul : chaque information a aussi un signal visuel et un texte. L’exemple ci-dessous est volontaire ; ce n’est pas un test auditif.</p>
    <Interrupteur nom="Sons" aide="Un son bref accompagne certaines notifications" portee="garde" actif={p.notifications.sons} changer={v => maj({ ...p, notifications: { ...p.notifications, sons: v } }, v ? "Sons activés." : "Sons coupés.")} />
    <div className="one-champ"><label className="one-curseur"><span><b>Volume des notifications</b><small>{PORTEE.garde}</small></span>
      <input type="range" min={0} max={1} step={0.1} value={p.notifications.volume} disabled={!p.notifications.sons} onChange={e => maj({ ...p, notifications: { ...p.notifications, volume: +e.target.value } })} /></label></div>
    <button type="button" className="one-bouton" onClick={() => { const ok = p.notifications.sons && jouer(p.notifications.volume); setSignal(s => s + 1); setAnnonce(ok ? "Exemple : un son et un signal visuel." : "Exemple : un signal visuel (sons coupés)."); }}><Volume2 aria-hidden="true" />Écouter un exemple</button>
    <Interrupteur nom="Signaux visuels" aide="Les points lumineux et le cartouche du Disque" portee="partout" actif={p.notifications.signauxVisuels} changer={v => maj({ ...p, notifications: { ...p.notifications, signauxVisuels: v } })} />
    <Interrupteur nom="Sous-titres" aide="Sur les vidéos qui en ont" portee="garde" actif={p.notifications.sousTitres} changer={v => maj({ ...p, notifications: { ...p.notifications, sousTitres: v } })} />
    {"speechSynthesis" in window
      ? <button type="button" className="one-bouton" onClick={() => { try { const u = new SpeechSynthesisUtterance("Bienvenue dans .0NE. Vos réglages vous suivent dans tous vos univers."); u.lang = "fr-FR"; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); setAnnonce("Lecture par la voix de votre appareil."); } catch { setAnnonce("La lecture vocale n’est pas disponible ici."); } }}>Lire à voix haute (voix de votre appareil)</button>
      : <p className="one-note">La lecture vocale n’est pas disponible sur cet appareil.</p>}
    {pied}
  </>;
  else if (etape === 3) corps = <>
    <h1 ref={titre} tabIndex={-1}>Votre façon d’agir.</h1>
    <p className="one-texte">Le clavier fonctionne partout (Tab, Entrée, Échap). Le geste en arc n’est jamais le seul moyen : le menu peut s’écrire en liste. Chaque glisser-déposer a son bouton.</p>
    <Choix<Cibles> nom="Taille des cibles" portee="partout" valeur={p.interaction.cibles} options={[["standard", "Standard"], ["grandes", "Grandes"], ["tres-grandes", "Très grandes"]]} changer={v => maj({ ...p, interaction: { ...p.interaction, cibles: v } })} />
    <Choix nom="Menu du Point" portee="partout" valeur={p.presentation} options={[["auto", "Automatique"], ["arc", "En arc"], ["liste", "En liste écrite"]]} changer={v => maj({ ...p, presentation: v }, "Présentation du menu changée.")} />
    <Choix nom="Validation" portee="one" valeur={p.interaction.validation} options={[["immediate", "Immédiate"], ["confirmer", "Confirmer avant d’agir"]]} changer={v => { setEssai({ attente: false, fait: 0 }); maj({ ...p, interaction: { ...p.interaction, validation: v } }); }} />
    <Interrupteur nom="Gestes simples" aide="Pas de survol nécessaire, pas de geste à deux doigts" portee="one" actif={p.interaction.gestesSimples} changer={v => maj({ ...p, interaction: { ...p.interaction, gestesSimples: v } })} />
    <Interrupteur nom="Navigation par étapes" aide="Une chose à la fois, avec Retour et Continuer" portee="one" actif={p.interaction.parEtapes} changer={v => maj({ ...p, interaction: { ...p.interaction, parEtapes: v } })} />
    <Choix nom="Position du Point" portee="one" valeur={p.interaction.positionPoint} options={[["gauche", "À gauche"], ["centre", "Au centre"], ["droite", "À droite"]]} changer={v => maj({ ...p, interaction: { ...p.interaction, positionPoint: v } })} />
    <p className="one-note">Commande vocale, contacteurs et commande oculaire : prévus, pas encore disponibles. Rien n’est annoncé avant des essais réels avec ces dispositifs.</p>
    {pied}
  </>;
  else if (etape === 4) corps = <>
    <h1 ref={titre} tabIndex={-1}>Des besoins particuliers ?</h1>
    <p className="one-texte">Choisissez ce qui vous ressemble, ou rien. On ne vous demande aucun diagnostic ; ces choix proposent des réglages, que vous pouvez changer ensuite. Ils restent sur cet appareil.</p>
    <ul className="one-besoins">{BESOINS.map(b => { const pris = besoins.includes(b.id); return <li key={b.id}>
      <button type="button" role="checkbox" aria-checked={pris} onClick={() => setBesoins(l => pris ? l.filter(x => x !== b.id) : [...l, b.id])}>
        <span className="one-case" aria-hidden="true">{pris && <Check />}</span><span><b>{b.phrase}</b><span>{b.propose}</span></span></button></li>; })}</ul>
    <button type="button" className="one-bouton one-bouton-plein" disabled={!besoins.length} onClick={() => { maj(proposerPourBesoins(p, besoins), "Réglages proposés appliqués : vous pouvez les revoir aux étapes précédentes."); }}>Appliquer ces propositions</button>
    <p className="one-note">Un même besoin peut demander des réglages différents d’une personne à l’autre : rien n’est figé.</p>
    {pied}
  </>;
  else if (etape === 5) corps = <>
    <h1 ref={titre} tabIndex={-1}>Faisons connaissance.</h1>
    <p className="one-texte">Tout est facultatif et reste sur cet appareil. Aucune date de naissance n’est demandée.</p>
    <label className="one-saisie"><span>Prénom ou pseudonyme</span><input value={p.identite.prenom} maxLength={60} autoComplete="given-name" onChange={e => maj({ ...p, identite: { ...p.identite, prenom: e.target.value } })} /></label>
    <label className="one-saisie"><span>Ville <small>(facultative)</small></span><input value={p.identite.ville} maxLength={60} autoComplete="address-level2" onChange={e => maj({ ...p, identite: { ...p.identite, ville: e.target.value } })} /></label>
    <fieldset className="one-champ"><legend>Langue</legend><div className="one-segments"><button type="button" aria-pressed="true">Français</button></div></fieldset>
    <p className="one-note">La photo de profil viendra avec le compte AIME ; rien n’est publié sans votre accord.</p>
    {pied}
  </>;
  else if (etape === 6) corps = <>
    <h1 ref={titre} tabIndex={-1}>Choisissez vos univers.</h1>
    <p className="one-texte">Vos favoris prennent place dans la couronne. Modifiables à tout moment.</p>
    <ul className="one-choix-univers">{univers.filter(u => u.publication === "publie").sort((a, b) => a.ordre - b.ordre).map(u => { const pris = p.favoris.includes(u.id); return <li key={u.id}>
      <button type="button" role="checkbox" aria-checked={pris} onClick={() => maj({ ...p, favoris: pris ? p.favoris.filter(x => x !== u.id) : [...p.favoris, u.id] }, `${u.nom} ${pris ? "retiré" : "ajouté"}.`)}>
        <span className="one-ico" style={{ color: u.teinte }}><IconeOne nom={u.icone} /></span><span><b>{u.nom}</b><span>{NOMS_STATUTS[u.statut]}</span></span><span className="one-case" aria-hidden="true">{pris && <Check />}</span></button></li>; })}</ul>
    {pied}
  </>;
  else corps = <>
    <h1 ref={titre} tabIndex={-1}>{prenom ? `${prenom}, tout est prêt.` : "Tout est prêt."}</h1>
    <p className="one-texte">Vos réglages sont appliqués et suivent vos univers sur cet appareil. Vous pouvez les modifier à tout moment depuis le Disque (Mes réglages, ou Confort).</p>
    <ul className="one-resume">
      <li>Texte à {Math.round(p.affichage.fontScale * 100)} %, commandes {p.interaction.cibles === "standard" ? "standard" : p.interaction.cibles === "grandes" ? "grandes" : "très grandes"}, thème {p.affichage.theme === "system" ? (p.themeChoisi ? "selon l’appareil" : "Jour") : p.affichage.theme === "dark" ? "Nuit" : "Jour"}</li>
      <li>Menu du Point : {p.presentation === "liste" ? "en liste écrite" : p.presentation === "arc" ? "en arc" : "automatique"}{p.affichage.reduceMotion ? ", effets réduits" : ""}</li>
      <li>Univers favoris : {p.favoris.map(id => univers.find(u => u.id === id)?.nom).filter(Boolean).join(", ") || "aucun"}</li>
      <li>Synchronisation : réglages gardés sur cet appareil seulement</li>
    </ul>
    {pied}
  </>;

  return <div className="one one-rencontre" data-aime={theme} data-etape={etape}>
    <section className="one-tete" aria-label="Contexte de l’expérience">
      <span className="one-marque"><span className="one-orbe" aria-hidden="true" />Mes préférences</span>
      {etape > 0 && <ol className="one-progres" aria-label={`Étape ${etape} sur ${ETAPES.length - 1}`}>{ETAPES.slice(1).map((n, k) => <li key={n} aria-current={k + 1 === etape ? "step" : undefined}><span className="sr-only">{n}</span></li>)}</ol>}
      <a className="one-bouton one-passer" href={DESTINATIONS.accueil}>{etape > 0 ? "Plus tard" : "Passer"}</a>
    </section>
    <main className="one-grille">
      <section className="one-colonne" aria-labelledby="one-etape">
        {etape > 0 && <p className="one-sur" id="one-etape">{String(etape).padStart(2, "0")} / {String(ETAPES.length - 1).padStart(2, "0")} · {ETAPES[etape]}</p>}
        {corps}
        {!enregistre && <p className="one-alerte" role="alert">Cet appareil refuse d’enregistrer (navigation privée ?) : vos réglages valent jusqu’au rechargement.</p>}
      </section>
      <section className="one-scene" aria-label="Aperçu : votre Disque">
        <DisqueOne contexte="one-rencontre" etiquette="Votre Disque .0NE : vos univers, vos réglages" modes={modes} centre={centre} />
        {etape === 6 && <p className="one-legende">Le Disque se compose de vos univers favoris.</p>}
      </section>
    </main>
    <p className="sr-only" role="status" aria-live="polite">{annonce}</p>
  </div>;
}
