import { useEffect, useRef, useState } from "react";
import { Copy, Radio, Unplug } from "lucide-react";
import { fromObject, toObject, type Pattern } from "../lib/pattern";
import Sheet from "./Sheet";

/** Authoritative one-writer channel: encrypted live reading, no simultaneous edits to lose. */
export default function PeerShare({ open, onClose, pattern, onView }: { open: boolean; onClose: () => void; pattern: Pattern; onView: (p: Pattern | null) => void }) {
  const pc = useRef<RTCPeerConnection | null>(null), channel = useRef<RTCDataChannel | null>(null), host = useRef(false), latest = useRef({ pattern, onView }), sending = useRef(false), receive = useRef(""); latest.current = { pattern, onView };
  const [mode, setMode] = useState<"host" | "guest">("host"), [localCode, setLocalCode] = useState(""), [remoteCode, setRemoteCode] = useState(""), [status, setStatus] = useState("Non connecté"), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const stop = () => { channel.current?.close(); pc.current?.close(); channel.current = null; pc.current = null; latest.current.onView(null); setStatus("Non connecté"); setLocalCode(""); setRemoteCode(""); };
  const send = async () => {
    const c = channel.current; if (!c || c.readyState !== "open" || !host.current || sending.current) return;
    sending.current = true;
    try {
      const payload = JSON.stringify(toObject(latest.current.pattern)); c.send(JSON.stringify({ start: true }));
      for (let i = 0; i < payload.length; i += 8000) {
        while (c.bufferedAmount > 262144 && c.readyState === "open") await new Promise((r) => setTimeout(r, 40));
        if (c.readyState !== "open") break; c.send(JSON.stringify({ text: payload.slice(i, i + 8000) }));
      }
      if (c.readyState === "open") c.send(JSON.stringify({ end: true }));
    } catch { setError("Connexion interrompue pendant le transfert."); } finally { sending.current = false; }
  };
  const wire = (c: RTCDataChannel) => {
    channel.current = c;
    c.onopen = () => { setStatus("Connecté · DTLS chiffré"); void send(); };
    c.onclose = () => setStatus("Connexion fermée");
    c.onmessage = (event) => {
      try {
        const msg = JSON.parse(String(event.data)) as { start?: boolean; text?: string; end?: boolean };
        if (msg.start) receive.current = "";
        if (msg.text && receive.current.length < 40000000) receive.current += msg.text;
        if (msg.end && !host.current) {
          const p = fromObject(JSON.parse(receive.current)); receive.current = "";
          if (p) latest.current.onView(p); else setError("Projet reçu invalide : il n’a pas remplacé vos données.");
        }
      } catch { setError("Message reçu invalide"); }
    };
  };
  const make = () => {
    const peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] }); pc.current = peer;
    peer.ondatachannel = (e) => wire(e.channel);
    peer.onconnectionstatechange = () => {
      const labels = { new: "Prêt", connecting: "Connexion…", connected: "Connecté · DTLS chiffré", disconnected: "Connexion perdue", failed: "Réseau incompatible : exportez un fichier JSON", closed: "Fermé" };
      setStatus(labels[peer.connectionState]);
    };
    return peer;
  };
  const gather = (peer: RTCPeerConnection) => new Promise<void>((resolve) => {
    if (peer.iceGatheringState === "complete") { resolve(); return; }
    const fn = () => { if (peer.iceGatheringState === "complete") { peer.removeEventListener("icegatheringstatechange", fn); clearTimeout(timer); resolve(); } };
    const timer = setTimeout(() => { peer.removeEventListener("icegatheringstatechange", fn); resolve(); }, 10000); peer.addEventListener("icegatheringstatechange", fn);
  });
  const create = async () => {
    setBusy(true); setError("");
    try {
      stop(); host.current = mode === "host"; const peer = make();
      if (mode === "host") { wire(peer.createDataChannel("point-zero", { ordered: true })); await peer.setLocalDescription(await peer.createOffer()); }
      else { const desc = JSON.parse(remoteCode) as RTCSessionDescriptionInit; if (desc.type !== "offer") throw new Error("Collez d’abord le code d’invitation de l’hôte."); await peer.setRemoteDescription(desc); await peer.setLocalDescription(await peer.createAnswer()); }
      await gather(peer); setLocalCode(JSON.stringify(peer.localDescription));
    } catch (e) { setError(e instanceof Error ? e.message : "Connexion impossible"); } finally { setBusy(false); }
  };
  const accept = async () => { try { const answer = JSON.parse(remoteCode) as RTCSessionDescriptionInit; if (answer.type !== "answer") throw new Error("Code de réponse requis"); await pc.current?.setRemoteDescription(answer); } catch (e) { setError(e instanceof Error ? e.message : "Réponse invalide"); } };
  useEffect(() => { const timeout = setTimeout(() => void send(), 700); return () => clearTimeout(timeout); }, [pattern]);
  useEffect(() => () => { channel.current?.close(); pc.current?.close(); }, []);
  useEffect(() => { const disconnect = () => stop(); window.addEventListener("pointzero:disconnect", disconnect); return () => window.removeEventListener("pointzero:disconnect", disconnect); }, []);
  return <Sheet open={open} onClose={onClose} title="Lecture partagée" subtitle="Un hôte écrit, une invitée suit la même grille">
    <p className="text-[13px] leading-relaxed text-label-2">Connexion directe chiffrée entre deux navigateurs. L’hôte garde la main sur le patron ; l’invitée le lit sans modifier le projet. Cette règle évite les conflits et toute perte d’un travail concurrent.</p>
    <div className="seg my-4"><button aria-pressed={mode === "host"} onClick={() => setMode("host")}>Présenter mon patron</button><button aria-pressed={mode === "guest"} onClick={() => setMode("guest")}>Rejoindre</button></div>
    {mode === "guest" && <label className="block text-[12px] text-label-2">1. Invitation reçue<textarea className="field mt-2 min-h-[110px] py-2 font-mono text-[10px]" value={remoteCode} onChange={(e) => setRemoteCode(e.target.value)} /></label>}
    <button className="btn-tinted mt-3 w-full" disabled={busy} onClick={() => void create()}><Radio size={16} />{busy ? "Préparation…" : mode === "host" ? "Créer une invitation" : "Créer la réponse"}</button>
    {localCode && <label className="mt-4 block text-[12px] text-label-2">{mode === "host" ? "1. Envoyez ce code à l’invitée" : "2. Envoyez ce code à l’hôte"}<textarea className="field mt-2 min-h-[100px] py-2 font-mono text-[10px]" value={localCode} readOnly /><button className="mt-2 flex items-center gap-1 text-accent-2" onClick={async () => { try { await navigator.clipboard.writeText(localCode); setStatus("Code copié"); } catch { setError("Copiez le texte manuellement : presse-papiers bloqué."); } }}><Copy size={13} />Copier le code</button></label>}
    {mode === "host" && localCode && <label className="mt-4 block text-[12px] text-label-2">2. Collez la réponse de l’invitée<textarea className="field mt-2 min-h-[100px] py-2 font-mono text-[10px]" value={remoteCode} onChange={(e) => setRemoteCode(e.target.value)} /><button className="btn-primary mt-3 w-full" onClick={() => void accept()}>Connecter l’invitée</button></label>}
    <div className="mt-5 flex items-center justify-between"><span className="text-[12px] text-label-2">{status}</span><button className="flex items-center gap-1 text-[12px] text-danger" onClick={stop}><Unplug size={14} />Déconnecter</button></div>
    {error && <p role="alert" className="mt-3 text-[12px] text-warn">{error}</p>}
    <p className="mt-4 text-[11px] leading-relaxed text-label-3">Chaque participante doit être autorisée à consulter ce patron. Le service STUN de Google aide à trouver la connexion réseau ; le contenu du patron passe dans le canal WebRTC chiffré. Sans relais TURN, certains réseaux ne se connectent pas. Ce n’est pas une édition collaborative multi-auteurs ni un stockage cloud.</p>
  </Sheet>;
}