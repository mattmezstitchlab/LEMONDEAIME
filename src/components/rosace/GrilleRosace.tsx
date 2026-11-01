// ROSACE — Aperçu de grille point de croix
//
// Rend un patron (Pattern de l'atelier) en grille de croix sur toile ivoire,
// avec des grilles très fines et un repère tous les 10 points (comme sur un
// vrai patron). Aucune dépendance à l'atelier : seule la table DMC est partagée.

import { useEffect, useRef, type RefObject } from "react";
import { FLOSS } from "../../../studio/src/lib/dmc";
import type { Pattern } from "../../../studio/src/lib/pattern";

interface Props {
  pattern: Pattern;
  /** Taille souhaitée d'un point en pixels (clampée automatiquement au conteneur). */
  cell?: number;
  /** Afficher la grille de construction. */
  grille?: boolean;
  /** Largeur/hauteur max du canevas en pixels. */
  maxSize?: number;
  ariaLabel?: string;
}

const FOND = "#faf7f2";
const GRILLE = "#e8e0d4";
const GRILLE_DIX = "#d8cbb8";
const BORDURE = "#c9bda8";

export function GrilleRosace({
  pattern,
  cell: cellProp = 5,
  grille = true,
  maxSize = 520,
  ariaLabel,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const logique = Math.min(maxSize, Math.max(240, Math.min(pattern.w, pattern.h) * (cellProp as number)));
    const taille = Math.floor(logique);
    const cell = taille / Math.max(pattern.w, pattern.h);

    el.width = taille * dpr;
    el.height = taille * dpr;
    el.style.width = `${taille}px`;
    el.style.height = `${taille}px`;
    ctx.scale(dpr, dpr);

    // Fond toile ivoire.
    ctx.fillStyle = FOND;
    ctx.fillRect(0, 0, taille, taille);

    if (grille) {
      ctx.beginPath();
      ctx.strokeStyle = GRILLE;
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= pattern.w; x++) {
        const gx = Math.round(x * cell) * 2 / 2;
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, taille);
      }
      for (let y = 0; y <= pattern.h; y++) {
        const gy = Math.round(y * cell) * 2 / 2;
        ctx.moveTo(0, gy);
        ctx.lineTo(taille, gy);
      }
      ctx.stroke();

      // Repère tous les 10 points.
      ctx.beginPath();
      ctx.strokeStyle = GRILLE_DIX;
      ctx.lineWidth = 0.7;
      for (let x = 0; x <= pattern.w; x += 10) {
        const gx = x * cell;
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, taille);
      }
      for (let y = 0; y <= pattern.h; y += 10) {
        const gy = y * cell;
        ctx.moveTo(0, gy);
        ctx.lineTo(taille, gy);
      }
      ctx.stroke();
    }

    // Croix : un carré teinté + une croix en couleur de fil.
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const marge = cell * 0.22;
    const ligne = cell * 0.17;

    for (let y = 0; y < pattern.h; y++) {
      for (let x = 0; x < pattern.w; x++) {
        const idx = pattern.cross[y * pattern.w + x];
        if (idx < 0) continue;
        const hex = FLOSS[idx]?.hex;
        if (!hex) continue;
        const px = x * cell;
        const py = y * cell;
        // Fond de case très léger.
        ctx.fillStyle = hex + "1a";
        ctx.fillRect(px + marge * 0.5, py + marge * 0.5, cell - marge, cell - marge);
        // Croix.
        ctx.strokeStyle = hex;
        ctx.lineWidth = ligne;
        ctx.beginPath();
        ctx.moveTo(px + marge, py + marge);
        ctx.lineTo(px + cell - marge, py + cell - marge);
        ctx.moveTo(px + cell - marge, py + marge);
        ctx.lineTo(px + marge, py + cell - marge);
        ctx.stroke();
      }
    }

    // Contour du cadre.
    ctx.strokeStyle = BORDURE;
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, taille - 1, taille - 1);
  }, [pattern, cellProp, grille, maxSize]);

  return (
    <canvas
      ref={ref as RefObject<HTMLCanvasElement>}
      aria-label={ariaLabel ?? "Aperçu de la grille de la rosace"}
      role="img"
      style={{ display: "block", background: "#f5f0e6", borderRadius: 8 }}
    />
  );
}
