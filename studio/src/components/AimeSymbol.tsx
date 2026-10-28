import {AIME_SYMBOLS,type AimeSymbolName} from '../lib/aimeSymbols';
export default function AimeSymbol({name,label,size=24}:{name:AimeSymbolName;label?:string;size?:number}){
 return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" role={label?'img':undefined} aria-label={label} aria-hidden={label?undefined:true} focusable="false"><path d={AIME_SYMBOLS[name]}/></svg>;
}
