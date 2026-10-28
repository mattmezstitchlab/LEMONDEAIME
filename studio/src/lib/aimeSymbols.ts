/** Original geometric drawings, not a claim of trademark exclusivity. Grid 24, stroke 1.5. */
export const AIME_SYMBOL_VERSION='1.0.0';
export const AIME_SYMBOLS={
 intention:'M4 12h10m-4-4 4 4-4 4M19 12h.01',
 personne:'M9 7a3 3 0 1 0 6 0 3 3 0 1 0-6 0M5 21v-2a7 7 0 0 1 14 0v2',
 identite:'M5 4h14v16H5zM9 9h.01M9 14h6M9 17h4',
 temps:'M12 3a9 9 0 1 0 9 9M12 6v6l4 3M18 3v4h4',
 relation:'M3 12a4 4 0 1 0 8 0 4 4 0 1 0-8 0M13 12a4 4 0 1 0 8 0 4 4 0 1 0-8 0M8 12h8',
 creation:'M4 20h16M6 17 16 4l4 3-10 13M14 7l4 3',
 transformation:'M3 5h7v7H3zM16 14l5 7H11zM14 5h6v5M20 5l-7 7',
 mouvement:'M3 17c6 0 5-10 11-10h6M17 4l3 3-3 3',
 document:'M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h6',
 musique:'M9 18V6l10-3v12M4 18a2.5 2.5 0 1 0 5 0 2.5 2.5 0 1 0-5 0M14 15a2.5 2.5 0 1 0 5 0 2.5 2.5 0 1 0-5 0',
 transmission:'M3 12h18M15 6l6 6-6 6M4 6v12M8 8v8',
 memoire:'M5 4h14v16H5zM8 4v16M11 8h5M11 12h5M11 16h3',
 impact:'M12 12h.01M8 8a6 6 0 0 0 0 8M16 8a6 6 0 0 1 0 8M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14',
 continuite:'M12 12c-4-8-10-6-10 0s6 8 10 0 10-6 10 0-6 8-10 0'
} as const;
export type AimeSymbolName=keyof typeof AIME_SYMBOLS;
export function symbolSVG(name:AimeSymbolName):string {
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="${AIME_SYMBOLS[name]}"/></svg>`;
}
