// Portable release checks: no Grok Bot installation, account or network is required.
import assert from 'node:assert/strict';
import {readFileSync,lstatSync,realpathSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve,sep,basename} from 'node:path';
import {homedir} from 'node:os';
import {createHash} from 'node:crypto';
import {publicEntries} from './public-files.mjs';
import {avatarChoices,photoCharacters,photoDataUrls} from './avatar-catalog.mjs';
import {libraryCharacters} from './library.mjs';

const secretPatterns=[
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{40,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{24,}\b/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /(?:api[_-]?key|access[_-]?token|client[_-]?secret)\s*[:=]\s*['"][A-Za-z0-9_+/-]{24,}['"]/i,
];
const forbiddenPath=/(?:^|\/)(?:evidence|node_modules|config\.local\.json(?:\.tmp)?|\.env(?:\.[^/]*)?|research|native-bean|bean-avatar-loop)(?:\/|$)|(?:^|\/)(?:app\.asar|index\.eager-[^/]+\.js|chunk-[^/]+\.js)$|\.app(?:\/|$)/;
const textFile=name=>/\.(?:mjs|js|md|json|html|svg|command|ya?ml|txt)$/.test(name)||/^(?:LICENSE|SECURITY|CONTRIBUTING|\.gitignore)$/.test(basename(name));

// Used both before ZIP creation and in portable CI. Report filenames, never secrets.
export function inspectPublicFiles(root,entries,{privateIds=[]}={}){
  const base=realpathSync(root),seen=new Set();
  for(const {source,destination} of entries){
    for(const name of [source,destination]){
      if(!name||name.startsWith('/')||name.split('/').includes('..')||forbiddenPath.test(name))throw Error('Disallowed public path: '+name);
    }
    if(seen.has(destination))throw Error('Duplicate public destination: '+destination);
    seen.add(destination);
    const path=resolve(base,source),stat=lstatSync(path);
    if(!stat.isFile()||stat.isSymbolicLink()||!realpathSync(path).startsWith(base+sep))throw Error('Public file must be a regular file inside the project: '+source);
    if(!textFile(source))continue;
    const value=readFileSync(path,'utf8');
    if(value.includes(homedir()+sep)||/\/(?:Users|home)\/[^\s/"'<>]+\//.test(value)||privateIds.some(id=>value.includes(id)))throw Error('Personal material in public file: '+source);
    if(secretPatterns.some(pattern=>pattern.test(value)))throw Error('Potential credential in public file: '+source);
    // Only the deliberate all-zero test UUID family is public source material.
    for(const id of value.match(/\b[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\b/gi)??[]){
      if(!/^00000000-0000-4000-8000-0000000000[0-9a-f]{2}$/.test(id))throw Error('Unreviewed identifier in public file: '+source);
    }
  }
  return {files:entries.length,explicitAllowlist:true,privatePathsAndCredentialsChecked:true};
}

async function main(){
  const root=fileURLToPath(new URL('../',import.meta.url));
  assert.equal(readFileSync(resolve(root,'README.md'),'utf8'),readFileSync(resolve(root,'PUBLIC_README.md'),'utf8'),'README.md and PUBLIC_README.md must remain identical');
  const publication=inspectPublicFiles(root,publicEntries);
  let trackedFilesChecked=false;
  // Do not accidentally inspect a parent repository when checking an extracted ZIP.
  if(existsSync(resolve(root,'.git'))){
    const top=execFileSync('git',['rev-parse','--show-toplevel'],{cwd:root,encoding:'utf8'}).trim();
    if(realpathSync(top)===realpathSync(root)){
      const tracked=execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
      if(tracked.length){
        assert.deepEqual([...new Set(tracked)].sort(),publicEntries.map(entry=>entry.destination).sort(),'Tracked files must exactly match the reviewed public file list');
        inspectPublicFiles(root,tracked.map(name=>({source:name,destination:name})));
        trackedFilesChecked=true;
      }
    }
  }
  assert.equal(libraryCharacters.length,31);assert.equal(photoCharacters.length,11);assert.equal(avatarChoices.length,42);
  assert.equal(new Set(avatarChoices.map(item=>item.shape)).size,42);
  const photos=photoDataUrls();assert.equal(Object.keys(photos).length,11);
  const motion=JSON.parse(readFileSync(new URL('./photos/motion-spec.json',import.meta.url)));
  const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
  assert.equal(hash(readFileSync(new URL('./photo-runtime.js',import.meta.url))),motion.photoRuntimeSHA256);
  for(const photo of photoCharacters){const item=motion.assets.find(item=>item.key===photo.shape);assert(item,photo.shape);assert.equal(item.sha256,photo.sha256);}
  let nativePNGs=0;
  for(const avatar of libraryCharacters)for(const state of ['rest','front','working','finished']){
    const file=new URL('./library/icons/'+avatar.number+'-'+avatar.key+'-'+state+'.png',import.meta.url),png=readFileSync(file);
    assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
    assert.equal(png.readUInt32BE(16),1024);assert.equal(png.readUInt32BE(20),1024);nativePNGs++;
  }
  const jsFiles=[...new Set(publicEntries.filter(entry=>/\.(?:mjs|js)$/.test(entry.source)).map(entry=>entry.source))];
  for(const file of jsFiles)execFileSync(process.execPath,['--check',resolve(root,file)],{stdio:'pipe'});
  for(const script of ['verify-compatibility.mjs','verify-tool.mjs','verify-photos.mjs']){
    execFileSync(process.execPath,[fileURLToPath(new URL('./'+script,import.meta.url)),'--portable'],{stdio:'inherit'});
  }
  console.log(JSON.stringify({passed:true,scope:'portable; installed-app and real-window acceptance remain separate',...publication,readmeCopiesMatch:true,trackedFilesChecked,choices:42,nativePNGs,photoPNGs:11,syntaxFiles:jsFiles.length},null,2));
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
