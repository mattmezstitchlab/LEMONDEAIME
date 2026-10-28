import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig,type Plugin} from 'vite';
const root=path.dirname(fileURLToPath(import.meta.url));
/** Keep first-visit offline shell complete after removing the vulnerable singlefile chain. */
function offlineAssets():Plugin {
 let assets:string[]=[];
 return {name:'aime-offline-assets',
  generateBundle(_options,bundle){assets=Object.keys(bundle).filter(file=>/\.(js|mjs|css|wasm)$/.test(file)).map(file=>'./'+file).sort()},
  writeBundle(options){
   const file=path.resolve(options.dir??path.join(root,'dist'),'sw.js');
   const hash=createHash('sha256').update(JSON.stringify(assets)).digest('hex').slice(0,12);
   const source=readFileSync(file,'utf8').replace('const BUILD_ASSETS = [];','const BUILD_ASSETS = '+JSON.stringify(assets)+';').replace('const CACHE = "point-zero-aime-v1";',`const CACHE = "point-zero-aime-web-${hash}";`);
   writeFileSync(file,source);
  }
 };
}
/* AIME_BASE=/studio/ : le studio servi dans le site AIME (lemondeaime.com/studio/) */
export default defineConfig({base:process.env.AIME_BASE||'/',plugins:[react(),tailwindcss(),offlineAssets()],resolve:{alias:{'@':path.resolve(root,'src')}}});
