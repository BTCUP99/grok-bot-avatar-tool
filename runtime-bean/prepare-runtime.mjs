// Release-only dependency preparation. Downloads only the pinned official Node archive.
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,chmodSync,renameSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {sha} from './patch.mjs';
const lock=JSON.parse(readFileSync(new URL('./node-runtime.lock.json',import.meta.url))),dir=mkdtempSync(join(tmpdir(),'avatar-node-')),archive=join(dir,lock.archive);
const response=await fetch(lock.url,{redirect:'error'});if(!response.ok)throw Error('Official Node download failed: '+response.status);const bytes=Buffer.from(await response.arrayBuffer());if(sha(bytes)!==lock.sha256)throw Error('Official Node archive hash mismatch');writeFileSync(archive,bytes);
const prefix='node-v'+lock.version+'-darwin-arm64/',target=new URL('../runtime-node/',import.meta.url);mkdirSync(new URL('bin/',target),{recursive:true});
for(const [member,name] of [['bin/node','bin/node'],['LICENSE','LICENSE']]){
  const temporary=new URL(name+'.tmp-'+process.pid,target);
  writeFileSync(temporary,execFileSync('/usr/bin/tar',['-xOf',archive,prefix+member],{maxBuffer:150*1024*1024}));
  if(member==='bin/node')chmodSync(temporary,0o755);
  renameSync(temporary,new URL(name,target));
}
writeFileSync(new URL('runtime.json',target),JSON.stringify({...lock,nodeSHA256:sha(readFileSync(new URL('bin/node',target)))},null,2)+'\n');
console.log(JSON.stringify({prepared:true,version:execFileSync(fileURLToPath(new URL('bin/node',target)),['--version'],{encoding:'utf8'}).trim(),verifiedArchive:true}));
