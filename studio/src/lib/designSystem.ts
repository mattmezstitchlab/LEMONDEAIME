import manifest from '../design/tokens.json';
export const DESIGN_SYSTEM=manifest;
export function designVariables(mode:'light'|'dark'='light'):string {
 const tokens={...manifest.tokens,...(mode==='dark'?manifest.dark:{})};
 return Object.entries(tokens).map(([key,value])=>`--aime-${key}:${value};`).join('');
}
/** Scoped export only: never root overrides, imported user CSS or JavaScript. */
export function designCSS():string {
 return `[data-aime-design]{${designVariables()}}\n[data-aime-design][data-aime-mode="dark"]{${designVariables('dark')}}`;
}
export function standaloneDesignCSS():string {
 return `:root{${designVariables()}}body{font-family:var(--aime-body);color:var(--aime-ink)}h1,h2,h3,h4{font-family:var(--aime-heading)}a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:2px solid var(--aime-focus);outline-offset:4px}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto!important}*{animation:none!important;transition:none!important}}`;
}
