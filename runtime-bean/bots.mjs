import {readdirSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {homedir} from 'node:os';
function base32(text){
  const alphabet='abcdefghijklmnopqrstuvwxyz234567';let value=0,bits=0,out=[];
  for(const c of text.toLowerCase()){const n=alphabet.indexOf(c);if(n<0)throw Error('Invalid cache key');value=(value<<5)|n;bits+=5;if(bits>=8){bits-=8;out.push((value>>>bits)&255);}}
  return Buffer.from(out).toString('utf8');
}
export function bots(){
  const dir=join(homedir(),'Library/Application Support/Grok Bot/sand-client-persistence');
  const found=new Map();
  for(const file of readdirSync(dir)){
    if(!file.endsWith('.blob'))continue;
    let key;try{key=base32(file.slice(0,-5));}catch{continue;}
    if(!key.endsWith('.roster.last-roster'))continue;
    const data=JSON.parse(readFileSync(join(dir,file),'utf8'));
    if(!Array.isArray(data.value?.rows))throw Error('Unsupported roster cache schema');
    for(const r of data.value.rows){
      if(typeof r.id==='string'&&typeof r.name==='string'&&!r.isRemovedFromSidebar)found.set(r.id,{id:r.id,name:r.name});
    }
  }
  return [...found.values()];
}
