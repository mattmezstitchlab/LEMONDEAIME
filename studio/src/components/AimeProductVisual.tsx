import {useMemo} from 'react';
import {createDesign,designToSVG} from '../lib/designStudio';
import {createMiniSite,miniSiteToHTML} from '../lib/miniSiteCore';
/** Real renderer outputs, not screenshots or claims of automatic generation. No persistence. */
export default function AimeProductVisual(){
 const visual=useMemo(()=>{
  const design=createDesign('faire-part');design.name='Camille & Gabriel · exemple fictif';
  const site=createMiniSite('mariage');site.date='18 juillet 2027';site.place='Un jardin, quelque part';
  return {design:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(designToSVG(design)),site:miniSiteToHTML(site)};
 },[]);
 return <figure className="ai-product-visual">
  <div className="ai-product-strip"><span>Rendus exportés · Design / Mini-site</span><span>Ce panneau n’est pas l’interface de l’Atelier</span></div>
  <div className="ai-product-stage">
   <img src={visual.design} alt="Faire-part fictif rendu par le moteur Design existant" width="800" height="1100" loading="lazy"/>
   <iframe title="Mini-site de mariage fictif — rendu du moteur existant" sandbox="" srcDoc={visual.site} loading="lazy" tabIndex={-1}/>
  </div>
  <figcaption>Rendus des moteurs Design et Mini-site existants · exemples fictifs, pas une capture d’écran. Aucun site publié.</figcaption>
 </figure>;
}
