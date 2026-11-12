import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {libraryCharacters} from './library.mjs';
import {avatarChoices,avatarChoice,photoDataUrls} from './avatar-catalog.mjs';
import {normalizeAssignments} from './config.mjs';
import {patchCommon} from './common-contract.mjs';
import {selectCompatibleContract} from './compatibility.mjs';

export const appPath='/Applications/Grok Bot.app';
export const asarPath=join(appPath,'Contents/Resources/app.asar');
export const sha=data=>createHash('sha256').update(data).digest('hex');
// Private names can change even in a patch release. Bind each field only after
// checking signed identity, ASAR integrity, reviewed modules and import relationships.
const helper='chunk-rolldown-runtime-BCiCTKAo.js';
const helperSHA256='f85e715d54a11fa37b7774ad77b536896ed01bfdfc98f485b678c81859fc8e2e';
export const contracts={
  '0.78.4':{
    version:'0.78.4', officialHash:'cb4d43f733076d4c441907cd427691bcebab6ada2f03d913991d04bf5ae59d93',
    common:'index.eager-common-DbK3Oi_r.js', commonSHA256:'fc17d4622e059ba7de70cc54d18c7fdc64a09b8d823c1904482181f21968e933',
    app:'index.eager-app-7tsTMhdH.js', appSHA256:'61e628b510e33f46f6401dd395c56d94aecbb1fab7f9fb8c4d304388e5ca81d4',
    editor:{file:'chunk-agent-avatar-editor-B2lwHJry.js',sha256:'77961cbc6e9e8a7c1d0195b464f515cf84817686245d4cccc994f05c8e958222'},helper,
    shape:'bO',color:'xO',classification:'CO',mark:'FO',agent:'XO',agentMark:'ZQe',display:'hT',grid:'_$e',staticSource:'QO',pointer:'pT',
    rosterState:'CQe',idle:'gO',react:'X',engineFill:'Yr',
  },
  '0.78.5':{
    version:'0.78.5', officialHash:'37b90814cce14cfb587072efec77dd3ec189377443979e665096c168b005a07e',
    common:'index.eager-common-DN47KHVY.js', commonSHA256:'2bdf541d641d2aa64c731a0ff66b207ea001edb32e6876151970d154e85694ef',
    app:'index.eager-app-DFcaB5i7.js', appSHA256:'54dcbd8a2227eb304e22d38072ae3f28fc75a00493ae2ca5f9ee4a82edca5edc',
    editor:{file:'chunk-agent-avatar-editor-Cx_XSspr.js',sha256:'02cf860a55fb5f7b1f93594738b6d3a6dc559d39930c2aac7b61bacff1b39c0a'},helper,
    shape:'xO',color:'SO',classification:'wO',mark:'IO',agent:'ZO',agentMark:'XQe',display:'_T',grid:'g$e',staticSource:'$O',pointer:'hT',
    rosterState:'SQe',idle:'_O',react:'X',engineFill:'Yr',
  },
  '0.79.4':{
    version:'0.79.4', officialHash:'4f1c458f85448a5e307c2330b92cb8d17f1f75ddc470fbb67a53815700339ffe',
    common:'index.eager-common-C5GMt_wm.js', commonSHA256:'143b2d34e89adaa9841ea59c641e4327ca340b708da8d2d83059e5d0936f2231',
    app:'index.eager-app-CYjmNGFy.js', appSHA256:'02eab34880f7f4b12fbace117e75e943debe94d0b187926e87b25ca3f1a33cc2',
    editor:{file:'chunk-agent-avatar-editor-D2wRtej3.js',sha256:'ae4b660904843a31c4315834693834e77d73dd8eacbc5796c9175496c9b54ca3'},helper,
    shape:'cO',color:'lO',classification:'dO',mark:'jO',agent:'QO',agentMark:'MO',display:'ww',grid:'_7e',staticSource:'ek',pointer:'Cw',
    rosterState:'sO',idle:'nO',react:'Y',engineFill:'mi',
  },
  '1.0.1':{
    version:'1.0.1', officialHash:'171d607e9faf339ca9a66c0c0113c23c390ac577ca39a72df23b0fdf74dcd2e9',
    common:'index.eager-common-1bSx8o0X.js', commonSHA256:'f436f30a2d0cfd0a683e4ae07d6b934c07f7df7b33535df75fd40262dd13062f',
    app:'index.eager-app-C1EubAxZ.js', appSHA256:'5d228ad567d3262c3232d3206b707b2fbab71f1bcc5eea56675e70825015b06e',
    editor:{file:'chunk-agent-avatar-editor-BqsLgkXH.js',sha256:'c46920c8eccb2ff02750749bd85ac47b3c1384658ee7169132f4626cc6b4d240'},helper,
    shape:'gO',color:'_O',classification:'yO',mark:'jO',agent:'JO',agentMark:'MO',display:'rT',grid:'Qrt',staticSource:'XO',pointer:'nT',
    rosterState:'ort',idle:'fO',react:'X',engineFill:'bi',profilePointerRef:'l',
    editorEntry:'A5e(e,`avatar-editor-import`).component(e=>e.AgentAvatarEditor)',
    editorWrappedEntry:'A5e(e,`avatar-editor-import`).component(e=>avatarWrapEditor(e.AgentAvatarEditor))',
  },
};
const dependencyFingerprints=JSON.parse(readFileSync(new URL('./compatibility-dependencies.json',import.meta.url)));
for(const contract of Object.values(contracts)){
  if(dependencyFingerprints[contract.version])contract.dependencies=Object.freeze(dependencyFingerprints[contract.version]);
  Object.freeze(contract.editor);
  Object.freeze(contract);
}
Object.freeze(contracts);
// These label reviewed adapters; they are not an installed-version allowlist.
export const verifiedVersions=Object.freeze(Object.keys(contracts));
function failure(code,message,cause){const error=Error(message,{cause});error.code=code;return error}
function installedInfo(){
  let plist;
  try{plist=JSON.parse(execFileSync('/usr/bin/plutil',['-convert','json','-o','-',join(appPath,'Contents/Info.plist')],{encoding:'utf8',stdio:['ignore','pipe','pipe']}))}
  catch(cause){throw failure('APP_NOT_FOUND','Cannot read the installed Grok Bot app.',cause)}
  if(plist.CFBundleIdentifier!=='com.anysphere.sand')throw failure('APP_IDENTITY','Unexpected app identity; no patch applied.');
  return plist;
}
// Rename only our injected bindings. Never translate identifiers across the
// vendor module: in 0.78.5 its old display identifier hT is the pointer handler.
export function bindAppHelpers(source,version){
  if(version==='0.78.4')return source;
  const names=version==='0.78.5'
    ?{hT:'_T',FO$avatar:'IO$avatar',PO:'FO',AO:'jO',fT:'mT',mT:'gT',GO:'KO'}
    :version==='0.79.4'
      ?{X:'Y',hT:'ww',FO$avatar:'jO$avatar',PO:'AO',AO:'SO',fT:'V1e',mT:'W1e',oo:'eo',GO:'qO',ji:'Gi',Di:'Ea',Ii:'la',wi:'xa',wu:'Zd'}
      :version==='1.0.1'
        ?{hT:'rT',FO$avatar:'jO$avatar',PO:'AO',AO:'EO',fT:'m6e',mT:'_6e',oo:'Co',GO:'UO',ji:'Qi',Di:'Na',Ii:'ga',wi:'Oa',wu:'gf'}
        :null;
  if(names==null)throw Error('Unsupported app helper bindings: '+version);
  const identifiers=Object.keys(names).map(name=>name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
  return source.replace(new RegExp('\\b(?:'+identifiers+')\\b','g'),name=>names[name]);
}
export const appearances=Object.freeze({
  apricotBean:{name:'杏橙豆团',source:'bean-shape.js',renderer:'beanNativeSvg',color:'orange',marker:'data-bean-native'},
  milkcat:{name:'奶糖喵机',source:'milkcat-shape.js',renderer:'milkcatNativeSvg',color:'orange',marker:'data-milkcat-native'},
  neonNight:{name:'霓虹夜行',source:'neon-shape.js',renderer:'neonNativeSvg',color:'cyan',marker:'data-neon-native'},
  ...Object.fromEntries(libraryCharacters.filter(item=>item.shape.startsWith('robot_')).map(item=>[item.shape,{name:item.name,source:'library-runtime.js',renderer:'libraryNativeSvg',color:'cyan',marker:'data-avatar-native'}])),
});
export function appearanceFor(shape){
  if(!Object.hasOwn(appearances,shape))throw Error('Unsupported local avatar shape: '+shape);
  return appearances[shape];
}
export function readArchive(){
  const raw=readFileSync(asarPath),base=8+raw.readUInt32LE(4);
  const header=raw.subarray(16,16+raw.readUInt32LE(12));
  const tree=JSON.parse(header);
  return {raw,header,tree,read(path){let n=tree;for(const p of path.split('/'))n=n.files?.[p];if(!n||!('offset'in n))throw Error(`Missing packed resource: ${path}`);return raw.subarray(base+Number(n.offset),base+Number(n.offset)+n.size);}};
}
export function preflight(){
  if(process.platform!=='darwin'||process.arch!=='arm64')throw failure('APP_ARCHITECTURE','Only macOS Apple Silicon is supported.');
  const plist=installedInfo();
  const architectures=execFileSync('/usr/bin/lipo',['-archs',join(appPath,'Contents/MacOS/Grok Bot')],{encoding:'utf8'}).trim().split(/\s+/);
  if(!architectures.includes('arm64'))throw failure('APP_ARCHITECTURE','Only macOS Apple Silicon builds are supported.');
  try{execFileSync('/usr/bin/codesign',['--verify','--deep','--strict','--test-requirement','=anchor apple generic and certificate leaf[subject.OU] = "DCNK4UB866"',appPath],{stdio:'pipe'})}
  catch(cause){throw failure('APP_SIGNATURE','Official Grok Bot signature verification failed; no patch applied.',cause)}
  const archive=readArchive(),hash=sha(archive.raw),integrity=plist.ElectronAsarIntegrity?.['Resources/app.asar'];
  if(integrity?.algorithm!=='SHA256'||integrity.hash!==sha(archive.header))throw failure('APP_INTEGRITY','ASAR integrity mismatch; no patch applied.');
  const compatibility=selectCompatibleContract({archive,contracts,version:plist.CFBundleShortVersionString,helperSHA256});
  archive.contract=compatibility.contract;
  archive.actualVersion=compatibility.actualVersion;
  return {archive,contract:compatibility.contract,version:compatibility.actualVersion,adapterVersion:compatibility.adapterVersion,compatibilityMode:compatibility.mode,compatibilityChecks:compatibility.checks,officialHash:hash,officialSignatureVerified:true};
}
const assignmentsToken='__AVATAR_INITIAL_ASSIGNMENTS__';
// Library mode serves every Bot: `assignments` maps Bot IDs to characters and can be
// re-baked without re-reading the archive. Legacy modes still target one Bot ID.
export function build(archive,id,{audit=false,demo=false,library=false,shape,assignments,includePickerImages=true}={}){
  const usesLibrary=library||Boolean(shape?.startsWith('robot_')||shape?.startsWith('photo_'));
  if(!usesLibrary)shape??='apricotBean';
  const appearance=shape===undefined||usesLibrary?null:appearanceFor(shape);
  if(usesLibrary&&shape!==undefined&&!avatarChoice(shape))throw Error('Choose a library character for --library.');
  if(demo&&shape!=='neonNight'&&!usesLibrary)throw Error('Appearance preview is available for neonNight or library characters only.');
  if((!usesLibrary||id!=null)&&!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(id??''))throw Error('Bot ID must be a lowercase UUID.');
  const initial=usesLibrary?normalizeAssignments(assignments??(id!=null&&shape!==undefined?{[id]:shape}:{})):null;
  const originals={},patched={},changes=[];
  // Never trust caller-supplied binding names or hashes, including archive.contract.
  const {contract}=selectCompatibleContract({archive,contracts,version:archive.actualVersion,helperSHA256});
  const {common,app,editor,display,pointer,react,engineFill}=contract;
  for(const [name,hash] of [[common,contract.commonSHA256],[app,contract.appSHA256]]){
    const raw=archive.read('dist/renderer/assets/'+name);
    if(sha(raw)!==hash)throw Error(`Source hash mismatch: ${name}`);
    originals[name]=raw.toString('utf8');
  }
  function replace(s,a,b,label){if(s.split(a).length!==2)throw Error(`Patch anchor mismatch: ${label}`);changes.push(label);return s.replace(a,()=>b);}
  // Name of the single-argument function that contains a unique anchor.
  function enclosing(s,anchor,label){
    const pos=s.indexOf(anchor),start=s.lastIndexOf('function ',pos);
    if(pos<0||start<0||s.indexOf(anchor,pos+1)>=0)throw Error(`${label} anchor not found`);
    const signature=s.slice(start,s.indexOf('{',start)+1),match=signature.match(/^function (\w+)\(e\)\{$/);
    if(!match)throw Error(`${label} function shape changed`);
    return match[1];
  }
  const read=name=>readFileSync(new URL('./'+name,import.meta.url),'utf8');
  patched[common]=patchCommon({version:contract.version,source:originals[common],shape,appearance,usesLibrary,read,replace,libraryCharacters});
  let s=originals[app];
  const profileAnchor=`${pointer}(e,e=>${contract.profilePointerRef??'c'}.current`;
  const rosterLead=`let d=${contract.rosterState}(u),f=i??d`;
  const rosterTail=`p=f!==${contract.idle},m;`;
  const rosterAnchor=`${rosterLead},${rosterTail}`;
  if(usesLibrary){
    for(const [fn,body,label] of [
      [contract.shape,'{const avatarShape=avatarShapeFor(e?.id);if(avatarShape)return avatarShape}','assigned shape'],
      [contract.color,'if(avatarShapeFor(e?.id))return avatarColorFor(e.id);','assigned color'],
      [contract.classification,'if(avatarChoiceFor(e?.id))return avatarIsPhoto(avatarChoiceFor(e.id));','assigned classification'],
    ])s=replace(s,`function ${fn}(e){`,`function ${fn}(e){`+body,label);
    const profile=enclosing(s,profileAnchor,'Profile pointer'),surface=enclosing(s,rosterAnchor,'Roster surface');
    for(const [fn,idExpr,transform,label] of [
      [contract.mark,'e.avatarKey','avatarMarkProps','native avatar'],
      [contract.agent,'e.agent?.id','avatarAgentProps','agent avatar'],
      [contract.agentMark,'e.agent?.id','avatarAgentProps','agent mark'],
      [profile,'e.agent?.id','avatarAgentProps','profile native trigger'],
      [surface,'e.agent?.id','avatarAgentProps','roster surface'],
    ])s=replace(s,`function ${fn}(e){`,`function ${fn}(e){return avatarBound(${fn===contract.mark?'avatarMarkEntry':fn+'$avatar'},e,${idExpr},${transform})}function ${fn}$avatar(e){`,label+' binding');
    s=replace(s,'if(n?.avatarDataUrl!=null&&n.avatarDataUrl.length>0)return{src:n.avatarDataUrl}','if(!avatarShapeFor(n?.id)&&n?.avatarDataUrl!=null&&n.avatarDataUrl.length>0)return{src:n.avatarDataUrl}','static source guard');
    if(sha(archive.read('dist/renderer/assets/'+editor.file))!==editor.sha256)throw Error('Avatar editor source hash mismatch');
    s=replace(s,contract.editorEntry??'.then(({AgentAvatarEditor:e})=>({default:e}))',contract.editorWrappedEntry??'.then(({AgentAvatarEditor:e})=>({default:avatarWrapEditor(e)}))','native avatar editor entry');
    s=replace(s,`function ${contract.grid}(e){`,`function ${contract.grid}(e){return ${react}.createElement(avatarChoiceFor(e.agent?.id)?avatarOfficialCharacterOptions:avatarVendorCharacterOptions,e)}function avatarVendorCharacterOptions(e){`,'native editor assigned-only grid adapter');
    s=replace(s,`function ${display}(e){`,`function ${display}(e){e=avatarLibraryProps(e);return avatarIsPhoto(e.shape)?${react}.createElement(AvatarPhotoMark,{...e,key:e.avatarBotId??e.sourceId??e.shape}):${react}.createElement(${display}$avatar,e)}function ${display}$avatar(e){`,'library surface state subscription');
    s=replace(s,`function ${contract.staticSource}(e,t){`,`function ${contract.staticSource}(e,t){const localPhoto=avatarPhotoFor(t.id);if(localPhoto)return{src:localPhoto};`,'local photo static source');
    s=replace(s,`appearance:N,body:P,fill:${engineFill}`,`appearance:N,body:P,key:avatarCharacters.some(item=>item.shape===_)?_:void 0,fill:${engineFill}`,'library native engine selection key');
    s=replace(s,rosterAnchor,`${rosterLead};avatarObserveActual(n,f);let ${rosterTail}`,'library actual activity observer');
    const state=read('neon-state.mjs').replace(/^export /gm,'')+'\n'+read('library-state.mjs').replace(/^import .*;\n/gm,'').replace(/^export /gm,'');
    const colors=Object.fromEntries(libraryCharacters.map(c=>[c.shape,appearanceFor(c.shape).color]));
    const photos=photoDataUrls();
    const bridge=bindAppHelpers(read('library-bridge.js'),contract.version).replaceAll('__PHOTO_IMAGES__',JSON.stringify(photos)).replaceAll('__LIBRARY_CHARACTERS__',JSON.stringify(avatarChoices)).replaceAll('__LIBRARY_COLORS__',JSON.stringify(colors)).replaceAll('__LIBRARY_UI__',String(library)).replaceAll('__LIBRARY_DEMO__',String(demo)).replaceAll('__LIBRARY_AUDIT__',String(audit));
    const images=includePickerImages?{...photos,...Object.fromEntries(libraryCharacters.map(c=>[c.shape,'data:image/svg+xml;base64,'+Buffer.from(read('library/icons/'+c.number+'-'+c.key+'-front.svg')).toString('base64')]))}:{};
    const picker=bindAppHelpers(read('library-picker.js'),contract.version).replaceAll('__AVATAR_PICKER_IMAGES__',JSON.stringify(images));
    s=state+'\n'+bridge+'\n'+bindAppHelpers(read('photo-runtime.js'),contract.version)+'\n'+picker+'\n'+s;
  }else{
    const helper=`function beanLocalAgent(a){return a?.id===\`${id}\`?{...a,avatarDataUrl:void 0,avatarVersion:void 0,avatarShape:\`${shape}\`,avatarColor:\`${appearance.color}\`}:a}`;
    for(const [fn,body,label] of [
      [contract.shape,`if(e.id===\`${id}\`)return\`${shape}\`;`,'target shape'],
      [contract.color,`if(e.id===\`${id}\`)return\`${appearance.color}\`;`,'target color'],
      [contract.classification,`if(e.id===\`${id}\`)return false;`,'native classification'],
      [contract.mark,`if(e.avatarKey===\`${id}\`)e={...e,dataUrl:void 0,shape:\`${shape}\`};`,'native avatar'],
    ])s=replace(s,`function ${fn}(e){`,(fn===contract.shape?helper:'')+`function ${fn}(e){`+body,label);
    const profile=enclosing(s,profileAnchor,'Profile pointer');
    for(const fn of [contract.agent,contract.agentMark,profile])s=replace(s,`function ${fn}(e){`,`function ${fn}(e){if(e.agent?.id===\`${id}\`)e={...e,agent:beanLocalAgent(e.agent)};`,fn===profile?'profile native trigger':fn);
    s=replace(s,'if(n?.avatarDataUrl!=null&&n.avatarDataUrl.length>0)return{src:n.avatarDataUrl}',`if(n?.id!==\`${id}\`&&n?.avatarDataUrl!=null&&n.avatarDataUrl.length>0)return{src:n.avatarDataUrl}`,'static source guard');
    if(shape==='neonNight'){
      s=replace(s,`function ${display}(e){`,`function ${display}(e){e=neonAvatarProps(e);`,'neon surface state subscription');
      s=replace(s,rosterAnchor,`${rosterLead};neonObserveActual(n,f);let ${rosterTail}`,'neon actual activity observer');
      const store=read('neon-state.mjs').replace(/^export /gm,'');
      const bridge=bindAppHelpers(read('neon-bridge.js'),contract.version).replaceAll('__TARGET_BOT_ID__',id).replaceAll('__NEON_DEMO__',String(demo)).replaceAll('__NEON_AUDIT__',String(audit));
      s=store+'\n'+bridge+'\n'+s;
    }
  }
  if(audit){
    const observed=id??Object.keys(initial??{})[0]??'00000000-0000-4000-8000-000000000000';
    s=replace(s,`function ${pointer}(e,t){`,`function ${pointer}(e,t){const originalGazeCallback=t;t=g=>{originalGazeCallback(g);beanAuditInput(e,g)};`,'native pointer observer');
    s+='\n'+read('audit.js').replaceAll('__TARGET_BOT_ID__',observed).replaceAll('__AVATAR_MARKER__',usesLibrary?'data-avatar-native':appearance.marker).replaceAll('__AVATAR_NAME__',usesLibrary?'头像库':appearance.name);
  }
  s+=`\nconsole.info('[Apricot Runtime] native avatar adapter ${contract.version} loaded');\n`;
  if(usesLibrary&&s.split(assignmentsToken).length!==2)throw Error('Assignment slot missing');
  const template=s;
  const bake=value=>usesLibrary?template.replace(assignmentsToken,()=>JSON.stringify(normalizeAssignments(value))):template;
  patched[app]=bake(initial);
  const hashes=()=>Object.fromEntries(Object.entries(patched).map(([n,s])=>[n,sha(s)]));
  return {contract,patched,changes,hashes:hashes(),library:usesLibrary,assignments:initial,
    // Re-bakes the app module after a selection so a renderer reload keeps every Bot's choice.
    withAssignments(value){patched[app]=bake(value);return hashes()}};
}

// Compile only; this never executes the rewritten app modules.
export function checkBuiltModules(adapted){
  for(const source of Object.values(adapted.patched)){
    try{execFileSync(process.execPath,['--check','--input-type=module'],{input:source,stdio:'pipe'})}
    catch(cause){throw failure('AVATAR_PATCH_INVALID','Avatar module syntax validation failed; no patch applied.',cause)}
  }
  return true;
}
