import { useMemo, useState } from "react";
import SymbolIcon from "./SymbolIcon";
import { SYMBOLS } from "../lib/symbols";

/**
 * Le jeu de 54 cartes.
 *
 * 52 semaines et 2 jokers : une année de broderie tient dans un jeu de cartes.
 * Chaque carte porte un motif compté tiré de la bibliothèque de glyphes — le
 * jeu est un SAL qui s'ignore, une carte à broder par semaine, les deux jokers
 * étant les semaines de repos que tout projet réel connaît.
 *
 * Le jeu est mélangé au départ. Deux rangements possibles, et les deux veulent
 * dire quelque chose :
 *   - par saison      : 13 semaines par ligne, l'année se lit de haut en bas ;
 *   - par semaine     : la même colonne d'un bout à l'autre, « où j'en suis
 *                       chaque saison à la même semaine » — le rythme, pas le
 *                       calendrier.
 * Un clic suffit pour passer du désordre à l'un des deux : c'est le geste qui
 * fait comprendre que l'ordre n'est pas subi, il est choisi.
 *
 * Le même jeu servira de peau au puzzle d'import de PDF : les blocs d'un patron
 * découpé sont des cartes que l'on range, et « ranger » cesse d'être un réglage
 * pour devenir un geste. Cette peau viendra plus tard ; le jeu, lui, existe.
 */

export const SEASON_NAMES = ["Hiver", "Printemps", "Été", "Automne"] as const;
export const WEEKS_PER_SEASON = 13;

export interface DeckCard {
  id: number;
  /** Semaine de l'année, 1 à 52 ; 0 pour un joker. */
  week: number;
  /** Saison 0 à 3 ; -1 pour un joker. */
  season: number;
  /** Rang de la semaine dans sa saison, 0 à 12 ; -1 pour un joker. */
  inSeason: number;
  joker: boolean;
  /** Index du glyphe compté posé sur la carte. */
  glyph: number;
}

export type DeckOrder = "melee" | "saison" | "semaine";

export function buildDeck(): DeckCard[] {
  const cards: DeckCard[] = [];
  for (let w = 0; w < 52; w += 1) {
    cards.push({
      id: w,
      week: w + 1,
      season: Math.floor(w / WEEKS_PER_SEASON),
      inSeason: w % WEEKS_PER_SEASON,
      joker: false,
      glyph: (w * 7 + 3) % SYMBOLS.length,
    });
  }
  cards.push(
    { id: 52, week: 0, season: -1, inSeason: -1, joker: true, glyph: 0 },
    { id: 53, week: 0, season: -1, inSeason: -1, joker: true, glyph: 1 },
  );
  return cards;
}

/** Générateur déterministe : le désordre est le même pour tout le monde, donc
 *  testable, donc racontable. */
function mulberry(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function orderDeck(deck: DeckCard[], order: DeckOrder): DeckCard[] {
  if (order === "saison") return [...deck].sort((a, b) => a.id - b.id);
  if (order === "semaine") {
    return [...deck].sort(
      (a, b) => Number(a.joker) - Number(b.joker) || a.inSeason - b.inSeason || a.season - b.season,
    );
  }
  const rnd = mulberry(54);
  const out = [...deck];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function cardLabel(c: DeckCard): string {
  return c.joker ? "Repos" : `${SEASON_NAMES[c.season]} · sem. ${c.inSeason + 1}`;
}

export default function CardDeck({ dense = false }: { dense?: boolean }) {
  const deck = useMemo(buildDeck, []);
  const [order, setOrder] = useState<DeckOrder>("melee");
  const cards = useMemo(() => orderDeck(deck, order), [deck, order]);

  return (
    <div data-deck={order} className="deck">
      <div className="mb-3 flex flex-wrap gap-2">
        {(
          [
            ["melee", "Mélanger"],
            ["saison", "Ranger par saison"],
            ["semaine", "Ranger par semaine"],
          ] as [DeckOrder, string][]
        ).map(([o, label]) => (
          <button
            key={o}
            type="button"
            aria-pressed={order === o}
            onClick={() => setOrder(o)}
            className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors ${
              order === o ? "bg-accent text-black" : "bg-white/8 text-label-2 hover:bg-white/14"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="mb-4 text-[12px] leading-relaxed text-label-3">
        {order === "melee"
          ? "54 cartes dans le désordre : 52 semaines et 2 repos. Un clic et l'année se range."
          : order === "saison"
            ? "13 semaines par saison, l'année de haut en bas. Chaque carte porte le glyphe à broder cette semaine-là."
            : "Même colonne, même semaine de chaque saison : ce rangement-là montre le rythme, pas le calendrier."}
      </p>
      <ul className={`grid gap-1.5 ${dense ? "grid-cols-9" : "grid-cols-6 sm:grid-cols-9"}`}>
        {cards.map((c, i) => (
          <li
            key={c.id}
            className="deck-card"
            style={{ animationDelay: `${Math.min(i, 53) * 9}ms` }}
            title={c.joker ? "Carte de repos" : `Semaine ${c.week} · ${cardLabel(c)}`}
          >
            <SymbolIcon sym={c.glyph} size={dense ? 16 : 20} color={c.joker ? "var(--color-label-3)" : "var(--color-accent-2)"} />
            <span className="deck-label">{c.joker ? "✳" : c.inSeason + 1}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
