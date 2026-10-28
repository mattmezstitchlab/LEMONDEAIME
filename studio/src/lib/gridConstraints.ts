/** Shared content-first constraints. Minima are not fixed heights or content truncation. */
export const GRID_CONSTRAINTS_VERSION='1.0.0';
export const GRID_CONTENT_CSS=`.aime-content-grid{align-items:start;grid-auto-rows:minmax(124px,auto)}.aime-content-cell{min-width:0;min-height:124px;height:auto;overflow-wrap:anywhere;word-break:normal;white-space:normal;box-sizing:border-box}.aime-content-cell>*{min-width:0;max-width:100%}.aime-content-cell :is(h1,h2,h3,p,a,span,div){overflow-wrap:anywhere;white-space:normal}.aime-content-cell .aime-fragment-title{font-family:var(--aime-heading,Arial,sans-serif);font-size:clamp(18px,2.5vw,32px);line-height:1.2;margin:16px 0}.aime-content-cell .aime-fragment-description{font:14px/1.65 var(--aime-body,Arial,sans-serif);margin:0}.aime-content-cell img{max-width:100%}`;
export function cellSpan(span:number,columns:number){
 if(!Number.isInteger(columns)||columns<1||columns>12)throw Error('Colonnes invalides');
 return Math.min(columns,Math.max(1,Math.round(Number.isFinite(span)?span:1)));
}
