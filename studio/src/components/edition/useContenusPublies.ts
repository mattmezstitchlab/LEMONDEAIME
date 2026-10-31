/**
 * Les contenus que la landing affiche : la version publiée (/api/contenus), revalidée ici ; sinon le texte d'origine.
 * Avec ?apercu=ID : la version ID, pour l'administration seulement (le serveur vérifie la session), annoncée comme un aperçu.
 * Avec ?bureau, dans le cadre du Bureau éditorial : le brouillon en cours, reçu du Bureau (même origine seulement, revalidé),
 * pour un aperçu en direct ; rien n'est demandé au serveur.
 *
 * Pour éviter qu'un texte publié ne remplace le texte d'origine sous les yeux d'une personne qui revient,
 * la dernière version publiée reçue est gardée dans ce navigateur et montrée d'abord ; le serveur a toujours le dernier mot.
 */
import { useEffect, useState } from "react";
import { ORIGINE, validerContenus, type Contenus } from "./contenus";

const CLE = "pointzero:contenus-publies:v1";
export interface Apercu { id: string; ecarts: number }

/* L'API existe quand le studio est servi par le site, sous /studio/ (comme en production et sur l'aperçu privé).
   Servi seul, à la racine (essais locaux), il n'y a pas d'API : on n'appelle rien, la page garde ses textes d'origine. */
export const apiContenus = () => import.meta.env.BASE_URL !== "/";
/** Dans le cadre du Bureau (une page du même site qui l'encadre) : l'aperçu en direct du brouillon. */
export const modeBureau = () => { try { return new URLSearchParams(window.location.search).has("bureau") && window.parent !== window; } catch { return false; } };
const apercuDemande = () => { try { const v = new URLSearchParams(window.location.search).get("apercu"); return v && /^[1-9]\d{0,15}$/.test(v) ? v : null; } catch { return null; } };
function garde(): Contenus {
  try { const s = localStorage.getItem(CLE); return s ? validerContenus(JSON.parse(s)).contenus : ORIGINE; } catch { return ORIGINE; }
}

export function useContenusPublies(): { contenus: Contenus; apercu: Apercu | null; refus: string | null; bureau: boolean } {
  const [bureau] = useState(modeBureau);
  const [etat, setEtat] = useState<{ contenus: Contenus; apercu: Apercu | null; refus: string | null }>(() => ({ contenus: bureau || apercuDemande() ? ORIGINE : garde(), apercu: null, refus: null }));
  useEffect(() => {
    if (!bureau) return;
    const recevoir = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== window.parent) return;   /* seulement le Bureau qui encadre cette page */
      const d = e.data as { type?: string; contenus?: unknown } | null;
      if (d?.type === "pz-bureau:contenus") {
        recu = true; setEtat(x => ({ ...x, contenus: validerContenus(d.contenus).contenus }));
        window.parent.postMessage({ type: "pz-bureau:recu" }, window.location.origin);   /* l'accusé de réception : le Bureau sait que l'aperçu suit */
      }
    };
    let recu = false, essais = 0;
    window.addEventListener("message", recevoir);
    /* « prête » jusqu'à la première réception : si un message s'est perdu (Bureau pas encore à l'écoute), il est redemandé */
    const dire = () => { if (recu || essais++ > 20) return; window.parent.postMessage({ type: "pz-bureau:pret" }, window.location.origin); minuterie = window.setTimeout(dire, 800); };
    let minuterie = 0; dire();
    return () => { window.removeEventListener("message", recevoir); window.clearTimeout(minuterie); };
  }, [bureau]);
  useEffect(() => {
    if (bureau || !apiContenus()) return;
    const id = apercuDemande(), ctrl = new AbortController();
    const url = "/api/contenus" + (id ? "?version=" + id : "");
    fetch(url, { credentials: "same-origin", cache: "no-cache", signal: ctrl.signal, headers: { Accept: "application/json" } })
      .then(async r => { const j = await r.json().catch(() => null); return { r, j }; })
      .then(({ r, j }) => {
        if (id) {
          if (r.ok && j?.contenus) { const v = validerContenus(j.contenus); setEtat({ contenus: v.contenus, apercu: { id, ecarts: v.ecarts.length }, refus: null }); }
          else setEtat(e => ({ ...e, refus: r.status === 401 ? "Connectez-vous avec le compte d’administration pour voir cet aperçu." : r.status === 403 ? "Cet aperçu est réservé à l’administration du site." : "Aperçu introuvable." }));
          return;
        }
        if (!r.ok || !j || !("contenus" in j)) return; /* pas d'API (site statique, essai local) : on garde ce qu'on a */
        if (j.contenus === null) { try { localStorage.removeItem(CLE); } catch { /* rien */ } setEtat(e => ({ ...e, contenus: ORIGINE })); return; }
        const { contenus } = validerContenus(j.contenus);
        try { localStorage.setItem(CLE, JSON.stringify(contenus)); } catch { /* rien */ }
        setEtat(e => ({ ...e, contenus }));
      })
      .catch(() => { /* hors ligne, ou API absente : le texte d'origine (ou le dernier publié reçu) reste */ });
    return () => ctrl.abort();
  }, [bureau]);
  return { ...etat, bureau };
}

/* ——— Dans le cadre du Bureau : un clic choisit une section (et ne déclenche rien d'autre) ——— */
export const SELECTEUR_SECTIONS = ".cd-appareils, .hi-sources, .or-rencontre[id], .ed-scene[id], #ed-cadeau";
export const cleSection = (el: Element) => el.id || (el.classList.contains("cd-appareils") ? "cd-appareils" : el.classList.contains("hi-sources") ? "hi-sources" : "");
export function useSelectionBureau(actif: boolean) {
  useEffect(() => {
    if (!actif) return;
    const choisir = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.(SELECTEUR_SECTIONS); if (!el) return;
      e.preventDefault(); e.stopPropagation();
      window.parent.postMessage({ type: "pz-bureau:section", cle: cleSection(el) }, window.location.origin);
    };
    const montrer = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== window.parent) return;
      const d = e.data as { type?: string; cle?: string } | null;
      if (d?.type !== "pz-bureau:selection" || typeof d.cle !== "string") return;
      document.querySelectorAll("[data-bureau-choisi]").forEach(x => x.removeAttribute("data-bureau-choisi"));
      const el = [...document.querySelectorAll(SELECTEUR_SECTIONS)].find(x => cleSection(x) === d.cle);
      if (el) { el.setAttribute("data-bureau-choisi", ""); window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: "auto" }); }   /* jamais scrollIntoView : il ferait défiler le Bureau aussi */
    };
    document.addEventListener("click", choisir, true);
    window.addEventListener("message", montrer);
    return () => { document.removeEventListener("click", choisir, true); window.removeEventListener("message", montrer); };
  }, [actif]);
}
