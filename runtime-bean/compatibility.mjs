// Match reviewed executable modules and their links, independently of the app's
// version label or unrelated ASAR contents. This does not discover arbitrary new
// private interfaces. Signature and ASAR integrity checks belong to preflight.
import {createHash} from 'node:crypto';

const assetRoot='dist/renderer/assets/';
const roles=Object.freeze({
  common:/^index\.eager-common-[A-Za-z0-9_-]+\.js$/,
  app:/^index\.eager-app-[A-Za-z0-9_-]+\.js$/,
  editor:/^chunk-agent-avatar-editor-[A-Za-z0-9_-]+\.js$/,
  helper:/^chunk-rolldown-runtime-[A-Za-z0-9_-]+\.js$/,
});
const digest=value=>createHash('sha256').update(value).digest('hex');

function incompatible(reason,detail={}){
  const error=Error('Avatar interfaces differ from the reviewed adapters ('+reason+'); no patch applied.');
  error.code='AVATAR_INTERFACE_CHANGED';
  error.reason=reason;
  error.detail=Object.freeze({...detail});
  return error;
}

function packedAssets(archive){
  const files=archive?.tree?.files?.dist?.files?.renderer?.files?.assets?.files;
  if(!files||typeof files!=='object')throw incompatible('missing-assets');
  return files;
}

function readModule(archive,name){
  try{return Buffer.from(archive.read(assetRoot+name))}
  catch{throw incompatible('missing-module',{file:name})}
}

// These references come from fingerprint-matched modules. For the signed HTML
// entry we also require one concrete module script, then its imports of both
// reviewed eager modules. Finding a stale, unreferenced file is insufficient.
export function localModuleImports(source){
  return new Set([...source.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)(["'`])(\.\/[A-Za-z0-9._-]+\.js)\1/g)].map(match=>match[2].slice(2)));
}

function rendererEntry(archive,assets){
  let html;
  try{html=archive.read('dist/renderer/index.html').toString('utf8').replace(/<!--[\s\S]*?-->/g,'')}
  catch{throw incompatible('missing-renderer-entry')}
  const scripts=[...html.matchAll(/<script\b([^>]*)>/gi)]
    .map(match=>match[1])
    .filter(attributes=>/(?:^|\s)type\s*=\s*(["'])module\1/i.test(attributes));
  if(scripts.length!==1)throw incompatible('ambiguous-renderer-entry');
  const match=scripts[0].match(/(?:^|\s)src\s*=\s*(["'])\.\/assets\/([A-Za-z0-9._-]+\.js)\1/i);
  if(!match||!Object.hasOwn(assets,match[2])||assets[match[2]].link||assets[match[2]].unpacked)throw incompatible('missing-renderer-entry');
  return match[2];
}

function assertGraph(archive,assets,modules,sources){
  const entry=rendererEntry(archive,assets),links={};
  for(const [role,source] of Object.entries(sources))links[role]=localModuleImports(source);
  links.entry=localModuleImports(readModule(archive,entry).toString('utf8'));
  for(const [source,target] of [
    ['entry','app'],['entry','common'],
    ['app','common'],['app','helper'],['app','editor'],
    ['common','helper'],
    ['editor','app'],['editor','common'],['editor','helper'],
  ]){
    if(!links[source].has(modules[target]))throw incompatible('import-graph',{source,target});
  }
  // An unchanged module can still fail if a dependency has disappeared. Entry
  // dependencies must exist; our input modules' closure is also pinned below.
  for(const [source,references] of Object.entries(links))for(const name of references){
    if(!Object.hasOwn(assets,name)||assets[name].link||assets[name].unpacked)throw incompatible('missing-dependency',{source,file:name});
  }
  return entry;
}

function assertDependencies(archive,assets,modules,profile,archiveHash){
  if(profile.dependencies==null){
    // Older reviewed packages may predate the dependency manifest. Do not
    // silently weaken their existing whole-package verification in that case.
    if(archiveHash!==profile.officialHash)throw incompatible('dependency-baseline-missing');
    return {check:'legacy-build-fingerprint',count:0};
  }
  const pinned=profile.dependencies,seen=new Set(),queue=Object.values(modules);
  if(typeof pinned!=='object'||Array.isArray(pinned))throw incompatible('invalid-dependency-baseline');
  while(queue.length){
    const name=queue.pop();if(seen.has(name))continue;
    seen.add(name);
    if(!Object.hasOwn(pinned,name)||!/^[0-9a-f]{64}$/.test(pinned[name]))throw incompatible('dependency-baseline-missing',{file:name});
    if(!Object.hasOwn(assets,name)||assets[name].link||assets[name].unpacked)throw incompatible('missing-dependency',{file:name});
    const bytes=readModule(archive,name);
    if(digest(bytes)!==pinned[name])throw incompatible('dependency-fingerprint',{file:name});
    for(const dependency of localModuleImports(bytes.toString('utf8')))queue.push(dependency);
  }
  return {check:'dependency-fingerprints',count:seen.size};
}

/**
 * `contracts` must be the tool's reviewed registry, never archive-supplied data.
 * The returned contract keeps its adapter version for private helper bindings;
 * actualVersion is the installed label and must be used for user diagnostics.
 */
export function selectCompatibleContract({archive,contracts,version,helperSHA256}){
  const assets=packedAssets(archive),modules={},bytes={},hashes={},sources={};
  for(const [role,pattern] of Object.entries(roles)){
    const matches=Object.keys(assets).filter(name=>pattern.test(name));
    if(matches.length===0)throw incompatible('missing-module',{role});
    if(matches.length!==1)throw incompatible('ambiguous-module',{role});
    const name=matches[0],node=assets[name];
    if(!node||node.files||node.link||node.unpacked)throw incompatible('invalid-module',{role});
    modules[role]=name;bytes[role]=readModule(archive,name);hashes[role]=digest(bytes[role]);sources[role]=bytes[role].toString('utf8');
  }
  const matches=Object.values(contracts).filter(profile=>
    hashes.common===profile.commonSHA256&&hashes.app===profile.appSHA256&&
    hashes.editor===profile.editor?.sha256&&hashes.helper===(profile.helperSHA256??helperSHA256));
  if(matches.length===0)throw incompatible('module-fingerprint');
  if(matches.length!==1)throw incompatible('ambiguous-adapter');
  const profile=matches[0],entry=assertGraph(archive,assets,modules,sources);
  const archiveHash=archive.raw==null?null:digest(archive.raw);
  const dependencies=assertDependencies(archive,assets,modules,profile,archiveHash);
  const contract=Object.freeze({...profile,common:modules.common,app:modules.app,
    editor:Object.freeze({...profile.editor,file:modules.editor}),helper:modules.helper});
  const actualVersion=String(version??'unknown');
  const known=actualVersion===profile.version&&archiveHash===profile.officialHash;
  return Object.freeze({contract,actualVersion,adapterVersion:profile.version,
    mode:known?'verified-build':'compatible-modules',
    modules:Object.freeze({...modules}),entry,dependencyCount:dependencies.count,
    checks:Object.freeze(['module-fingerprints','renderer-import-graph',dependencies.check])});
}
