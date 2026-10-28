import type { ReactNode } from "react";

/* ------------------------------------------------------------------ */
/*  Pictos animés et données des outils de la landing                  */
/*                                                                     */
/*  Partagés : la landing les présente en grille, le bandeau défilant  */
/*  les fait respirer en grand, et les modules s'en servent pour       */
/*  montrer la cible du guide. Un seul dessin, trois scènes.           */
/* ------------------------------------------------------------------ */

const S = {
  viewBox: "0 0 48 48",
  className: "h-10 w-10",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
};

function IconCross() {
  return (
    <svg {...S}>
      <path d="M11 11l26 26M37 11L11 37" data-draw="" />
    </svg>
  );
}
function IconHalf() {
  return (
    <svg {...S}>
      <path d="M11 37L37 11" data-draw="" />
      <path d="M11 11l26 26" strokeDasharray="2 4" opacity=".35" />
    </svg>
  );
}
function IconQuarter() {
  return (
    <svg {...S}>
      <path d="M11 11l13 13" data-draw="" />
      <path d="M24 24l13 13" strokeDasharray="2 4" opacity=".35" />
      <circle cx="24" cy="24" r="2.4" fill="currentColor" stroke="none" data-solid="" />
    </svg>
  );
}
function IconThreeQuarter() {
  return (
    <svg {...S}>
      <path d="M11 11l26 26" data-draw="" />
      <path d="M37 11l-13 13" data-draw="" />
    </svg>
  );
}
function IconBack() {
  return (
    <svg {...S}>
      <path d="M10 33L20 23l5 5L38 15" data-draw="" />
      <circle cx="10" cy="33" r="2.2" fill="currentColor" stroke="none" />
      <circle cx="38" cy="15" r="2.2" fill="currentColor" stroke="none" />
    </svg>
  );
}
function IconLong() {
  return (
    <svg {...S}>
      <path d="M12 36L36 12" strokeWidth="3.4" data-draw="" />
    </svg>
  );
}
function IconKnot() {
  return (
    <svg {...S}>
      <circle cx="24" cy="24" r="4.5" fill="currentColor" stroke="none" data-solid="" />
      <circle cx="24" cy="24" r="9" opacity=".4" />
    </svg>
  );
}
function IconBead() {
  return (
    <svg {...S}>
      <ellipse cx="24" cy="24" rx="6.5" ry="8.5" fill="currentColor" stroke="none" data-solid="" transform="rotate(-20 24 24)" />
      <path d="M24 15v-4M24 33v4" opacity=".45" />
    </svg>
  );
}
function IconPetite() {
  return (
    <svg {...S}>
      <path d="M17 17l14 14M31 17L17 31" strokeWidth="1.7" data-draw="" />
    </svg>
  );
}
function IconSelect() {
  return (
    <svg {...S}>
      <rect x="10" y="10" width="28" height="28" rx="4" strokeDasharray="4 4" />
      <path d="M24 12v24M12 24h24" opacity=".35" />
    </svg>
  );
}
function IconMove() {
  return (
    <svg {...S}>
      <path d="M24 8v32M8 24h32" />
      <path d="M14 14l6 6M34 14l-6 6M14 34l6-6M34 34l-6-6" data-draw="" />
    </svg>
  );
}
function IconLine() {
  return (
    <svg {...S}>
      <path d="M8 34L40 14" strokeWidth="3.4" data-draw="" />
      <circle cx="8" cy="34" r="2.2" fill="currentColor" stroke="none" />
      <circle cx="40" cy="14" r="2.2" fill="currentColor" stroke="none" />
    </svg>
  );
}
function IconRect() {
  return (
    <svg {...S}>
      <rect x="11" y="11" width="26" height="26" rx="3" strokeDasharray="4 4" />
    </svg>
  );
}
function IconEllipse() {
  return (
    <svg {...S}>
      <ellipse cx="24" cy="24" rx="14" ry="10" strokeDasharray="4 4" />
    </svg>
  );
}
function IconFill() {
  return (
    <svg {...S}>
      <path d="M14 30h20" strokeWidth="3" data-draw="" />
      <path d="M18 22c6-8 14-10 14-10s-2 9-8 12" />
    </svg>
  );
}
function IconPick() {
  return (
    <svg {...S}>
      <path d="M18 30L34 14" data-draw="" />
      <path d="M34 14l3-6 6 6-6 3z" fill="currentColor" stroke="none" />
    </svg>
  );
}
function IconErase() {
  return (
    <svg {...S}>
      <path d="M12 28l14-14 10 10-8 8H16z" data-draw="" />
      <path d="M14 38h22" opacity=".4" />
    </svg>
  );
}
function IconMark() {
  return (
    <svg {...S}>
      <path d="M14 34l14-14 6 6-14 14H10v-6z" data-draw="" />
      <path d="M34 12l4 4" opacity=".5" />
    </svg>
  );
}
function IconBlock() {
  return (
    <svg {...S}>
      <rect x="10" y="10" width="28" height="28" rx="2" strokeWidth="1.6" />
      <path d="M19.33 10v28M28.67 10v28M10 19.33h28M10 28.67h28" strokeWidth="1.6" opacity=".5" />
      <rect x="19.33" y="19.33" width="9.34" height="9.34" fill="currentColor" stroke="none" data-solid="" />
    </svg>
  );
}
function IconRow() {
  return (
    <svg {...S}>
      <path d="M9 17h30M9 31h30" strokeWidth="3" data-draw="" />
      <circle cx="9" cy="17" r="2.2" fill="currentColor" stroke="none" />
      <circle cx="39" cy="31" r="2.2" fill="currentColor" stroke="none" />
    </svg>
  );
}
function IconPark() {
  return (
    <svg {...S}>
      <path d="M24 8v22" data-draw="" />
      <circle cx="24" cy="36" r="4" fill="currentColor" stroke="none" data-solid="" />
    </svg>
  );
}
function IconUnpick() {
  return (
    <svg {...S}>
      <path d="M12 24h24" strokeWidth="3" />
      <path d="M16 16l8 8M24 16l-8 8" data-draw="" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Données des outils                                                */
/* ------------------------------------------------------------------ */

export interface Tool {
  icon: ReactNode;
  name: string;
  key: string;
  desc: string;
}

export interface Group {
  title: string;
  lead: string;
  tools: Tool[];
}

export const GROUPS: Group[] = [
  {
    title: "Les points",
    lead: "Chaque outil reproduit un geste réel de broderie, pas une approximation graphique.",
    tools: [
      { icon: <IconCross />, name: "Point de croix", key: "X", desc: "Deux diagonales complètes sur une case entière. La base de toute grille comptée." },
      { icon: <IconHalf />, name: "Demi-point", key: "D", desc: "Une seule diagonale. Adoucit les contours, crée les dégradés et les volumes." },
      { icon: <IconQuarter />, name: "Quart de point", key: "Q", desc: "Du coin vers le centre de la case. Indispensable aux courbes précises." },
      { icon: <IconThreeQuarter />, name: "Trois-quarts", key: "—", desc: "Un demi-point complété d’un quart. Les formes rondes ne peuvent pas s’en passer." },
      { icon: <IconPetite />, name: "Petite croix", key: "—", desc: "Croix réduite au tiers, pour les détails fins sur lin à haut comptage." },
      { icon: <IconBack />, name: "Point arrière", key: "R", desc: "Trait continu entre les trous. Dessine les contours, les visages, les lettrages." },
      { icon: <IconLong />, name: "Point lancé", key: "L", desc: "Longue passe droite. Remplit vite les grands aplats unis." },
      { icon: <IconKnot />, name: "Noeud français", key: "K", desc: "Relief ponctuel sur un trou. Les yeux, les graines, les centres de fleurs." },
      { icon: <IconBead />, name: "Perle", key: "—", desc: "Fourniture hors fil, posée sur un trou. Comptée séparément dans la liste d’achat." },
    ],
  },
  {
    title: "Dessiner et corriger",
    lead: "La précision d’un logiciel de création, avec la fluidité du tactile.",
    tools: [
      { icon: <IconSelect />, name: "Sélection", key: "S", desc: "Cadre rectangulaire ou lasso pour isoler une zone avant de la transformer." },
      { icon: <IconMove />, name: "Déplacement", key: "—", desc: "Déplace, copie, pivote et retourne une sélection sans perdre la trame." },
      { icon: <IconLine />, name: "Ligne de croix", key: "—", desc: "Trace une ligne de cases droites ou diagonales, nette et régulière." },
      { icon: <IconRect />, name: "Rectangle", key: "—", desc: "Cadre ou bloc plein, calé sur la grille au pixel près." },
      { icon: <IconEllipse />, name: "Ellipse", key: "—", desc: "Formes rondes et ovales pour les rosaces, les cadres et les mandalas." },
      { icon: <IconFill />, name: "Remplissage", key: "G", desc: "Remplit une zone contiguë de même couleur en une seule pression." },
      { icon: <IconPick />, name: "Pipette", key: "I", desc: "Prélève la couleur exacte posée sous le doigt ou le stylet." },
      { icon: <IconErase />, name: "Gomme", key: "E", desc: "Retire le point d’une case, qu’il s’agisse d’une croix ou d’un ornement." },
    ],
  },
  {
    title: "Suivre sa broderie",
    lead: "Les gestes que les brodeuses répètent des milliers de fois, rendus immédiats.",
    tools: [
      { icon: <IconMark />, name: "Surligneur", key: "M", desc: "Marque les cases déjà brodées. Le compteur de progression se met à jour." },
      { icon: <IconBlock />, name: "Bloc 10 × 10", key: "B", desc: "Marque un carré de dix cases d’un coup, la façon réelle de compter." },
      { icon: <IconRow />, name: "Ligne entière", key: "H", desc: "Marque une rangée complète sans déplacer la main." },
      { icon: <IconPark />, name: "Parking de fil", key: "P", desc: "Note où un fil est garé et dans quel coin, pour ne jamais le reperdre." },
      { icon: <IconUnpick />, name: "À défaire", key: "U", desc: "Signale une erreur sans l’effacer, pour la reprendre plus tard." },
    ],
  },
];
