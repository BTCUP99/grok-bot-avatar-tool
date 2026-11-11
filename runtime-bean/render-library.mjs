// Optional dev-only rasterizer. Runtime launchers do not need this dependency.
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
const {Resvg}=await import(process.env.RESVG_MODULE||'@resvg/resvg-js');
import {libraryCharacters} from './library.mjs';
const base=new URL('./library/',import.meta.url);
for(const folder of ['icons/','sheets/'])for(const file of readdirSync(new URL(folder,base)).filter(name=>name.endsWith('.svg'))){
  const source=new URL(folder+file,base),target=new URL(folder+file.replace(/\.svg$/,'.png'),base);
  const renderer=new Resvg(readFileSync(source),{font:{loadSystemFonts:true},background:'rgba(0,0,0,0)'});writeFileSync(target,renderer.render().asPng());
}
for(const title of ['机器人头像库总览','奇想新作总览']){const overview=new Resvg(readFileSync(new URL(title+'.svg',base)),{font:{loadSystemFonts:true}});writeFileSync(new URL(title+'.png',base),overview.render().asPng());}
console.log(JSON.stringify({transparentPng1024:libraryCharacters.length*4,stateSheets:libraryCharacters.length,overview:true}));
