/**
 * La caméra du Tambour : demandée seulement par un geste de la personne, arrière par défaut sur téléphone.
 * États clairs : repos (pas encore demandée), demande, active, refusée, indisponible. Elle s'arrête quand l'onglet est caché.
 * Un refus laisse tout le reste utilisable (une photo du téléphone, l'atelier). Rien n'est envoyé ni enregistré.
 */
import { useCallback, useEffect, useRef, useState } from "react";

export type EtatCamera = "repos" | "demande" | "active" | "refusee" | "indisponible";
export const PHRASES_CAMERA: Record<EtatCamera, string> = {
  repos: "La caméra est fermée.",
  demande: "Le navigateur vous demande l’accès à la caméra.",
  active: "La caméra est ouverte. L’image reste sur votre appareil.",
  refusee: "L’accès à la caméra a été refusé. Vous pouvez l’autoriser dans les réglages du navigateur, ou choisir une photo.",
  indisponible: "Aucune caméra n’est disponible ici (ou la page n’est pas en HTTPS). Vous pouvez choisir une photo.",
};

export function useCamera() {
  const video = useRef<HTMLVideoElement | null>(null), flux = useRef<MediaStream | null>(null);
  const [etat, setEtat] = useState<EtatCamera>("repos");
  const arreter = useCallback(() => {
    flux.current?.getTracks().forEach(t => t.stop()); flux.current = null;
    if (video.current) video.current.srcObject = null;
    setEtat(e => (e === "active" || e === "demande" ? "repos" : e));
  }, []);
  const demarrer = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) { setEtat("indisponible"); return false; }
    setEtat("demande");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false });
      flux.current = s;
      if (video.current) { video.current.srcObject = s; await video.current.play().catch(() => {}); }
      setEtat("active"); return true;
    } catch (e) {
      const nom = e instanceof DOMException ? e.name : "";
      setEtat(nom === "NotAllowedError" || nom === "SecurityError" ? "refusee" : "indisponible"); return false;
    }
  }, []);
  /* onglet caché : la caméra s'éteint (elle ne filme jamais en arrière-plan) */
  useEffect(() => { const f = () => { if (document.hidden) arreter(); }; document.addEventListener("visibilitychange", f); return () => { document.removeEventListener("visibilitychange", f); arreter(); }; }, [arreter]);
  return { video, etat, demarrer, arreter };
}
