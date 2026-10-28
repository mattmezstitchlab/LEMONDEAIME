import { VISIBILITY, type Visibility } from "../lib/visibility";

/** Orbe de visibilité : la forme de l'anneau porte le sens, le mot l'accompagne toujours ailleurs. */
export default function VisibilityOrb({ value, size = 28, dark = false }: { value: Visibility; size?: number; dark?: boolean }) {
  const ring = VISIBILITY[value].ring, stroke = dark ? "#FFFFFF" : "#0B0B0C";
  return <svg width={size} height={size} viewBox="0 0 44 44" aria-hidden="true" style={{ flex: "none", overflow: "visible" }}>
    <defs>
      <radialGradient id={"pzs-nacre-" + value} cx="35%" cy="30%" r="75%">
        <stop offset="0%" stopColor="#ffffff" /><stop offset="35%" stopColor="#d9e8ff" /><stop offset="60%" stopColor="#c9b8ff" /><stop offset="80%" stopColor="#ffd6ec" /><stop offset="100%" stopColor="#b9f0e4" />
      </radialGradient>
    </defs>
    <circle cx="22" cy="22" r="13" fill={`url(#pzs-nacre-${value})`} />
    {ring === "epais" && <circle cx="22" cy="22" r="19" fill="none" stroke={stroke} strokeWidth="3.4" />}
    {ring === "satellite" && <><circle cx="22" cy="22" r="19" fill="none" stroke={stroke} strokeWidth="1.6" /><circle cx="35.4" cy="8.6" r="4" fill={stroke} /></>}
    {ring === "ouvert" && <path d="M 22 3 A 19 19 0 1 1 5.5 12.5" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />}
  </svg>;
}
