import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {libraryCharacters} from './library.mjs';
import {createLibraryStore,botIdPattern} from './library-state.mjs';
import {readConfig,writeConfig} from './config.mjs';
import {setupHtml,serveSetup} from './setup-server.mjs';
import {preflight,build,sha} from './patch.mjs';

const target='00000000-0000-4000-8000-000000000000',other='00000000-0000-4000-8000-000000000001';
const store=createLibraryStore({[target]:'neonNight'},libraryCharacters.map(c=>c.shape));let states=[],cursor=0,closed=0;const selectionEvents=[];
const X={createElement:(type,props,...children)=>({type,props:{...props,children}}),useSyncExternalStore:(_subscribe,get)=>get(),useState:initial=>{const index=cursor++,own=states;if(!(index in own))own[index]=initial;return [own[index],value=>{own[index]=value}]}};
const imageEntries=Object.fromEntries(libraryCharacters.map(c=>[c.shape,'data:image/svg+xml;base64,'+readFileSync(new URL('./library/icons/'+c.number+'-'+c.key+'-front.svg',import.meta.url)).toString('base64')]));
assert.equal(new Set(Object.values(imageEntries)).size,libraryCharacters.length);
const source=readFileSync(new URL('./library-picker.js',import.meta.url),'utf8').replaceAll('__AVATAR_PICKER_IMAGES__',JSON.stringify(imageEntries));
assert(!source.includes('__TARGET_BOT_ID__'),'Picker must not be scoped to one Bot');
const context=vm.createContext({X,avatarStore:store,avatarCharacters:libraryCharacters,botIdPattern,console:{info:(...args)=>selectionEvents.push(args)},ji:value=>value==='blob',Di:()=> 'blob',Ii:[{id:'black'}],wi:()=> 'black',GO:()=>null,wu:()=>null});
vm.runInContext(source+'\nthis.wrap=avatarWrapEditor;this.Editor=AvatarLibraryEditor;this.Options=avatarOfficialCharacterOptions;',context);
const Native=()=>null,Wrapped=context.wrap(Native),raw={id:target,avatarDataUrl:'original-image',avatarShape:'blob',avatarColor:'orange'},local={...raw,avatarDataUrl:undefined,avatarShape:'neonNight',__avatarOriginal:raw};
// Every individual Bot gets the library editor; groups and non-UUID IDs keep the vendor one.
assert.equal(Wrapped({agent:{id:other},onClose:()=>{}}).type,context.Editor);
assert.equal(Wrapped({agent:{id:target},onClose:()=>{}}).type,context.Editor);
assert.equal(Wrapped({agent:{id:other,isGroup:true}}).type,Native);
assert.equal(Wrapped({agent:{id:'not-a-uuid'}}).type,Native);
const flatten=node=>node&&typeof node==='object'?[node,...(node.props?.children??[]).flat(Infinity).flatMap(flatten)]:[];
const editorFor=(agent,onClose)=>{const own=[];return ()=>{cursor=0;states=own;return flatten(context.Editor({agent,NativeEditor:Native,onClose}))}};
const button=(elements,label)=>elements.find(n=>n.type==='button'&&(n.props.children[0]===label||n.props['aria-label']===label));
const render=editorFor(local,()=>closed++);
let elements=render(),buttons=elements.filter(n=>n.type==='button');assert.equal(buttons.filter(n=>n.props['aria-label']?.startsWith('选择')).length,libraryCharacters.length);
elements.find(n=>n.type==='input'&&n.props['aria-label']==='搜索原创头像').props.onChange({target:{value:'彩虹'}});
elements=render();assert.equal(elements.filter(n=>n.props?.['aria-label']?.startsWith('选择')).length,1);assert(elements.some(n=>n.props?.['aria-label']==='选择彩虹拓扑'));
elements.find(n=>n.type==='input').props.onChange({target:{value:''}});elements=render();
button(elements,'奇想新作 20').props.onClick();elements=render();assert.equal(elements.filter(n=>n.props?.['aria-label']?.startsWith('选择')).length,20);
button(elements,'初代 11').props.onClick();elements=render();assert.equal(elements.filter(n=>n.props?.['aria-label']?.startsWith('选择')).length,11);
button(elements,'全部').props.onClick();elements=render();
button(elements,'选择钛坦大力士').props.onClick();assert.equal(store.shapeFor(target),'neonNight');
elements=render();button(elements,'取消').props.onClick();assert.equal(closed,1);assert.equal(selectionEvents.length,0);
button(elements,'应用头像').props.onClick();assert.equal(store.shapeFor(target),'robot_titan');assert.equal(closed,2);assert.deepEqual(selectionEvents,[['[Avatar Runtime] selection',target,'robot_titan']]);
elements=render();button(elements,'官方选项').props.onClick();elements=render();assert.equal(elements.find(n=>n.type===Native).props.agent,raw);
// A second Bot keeps its own, independent choice; restore clears only that Bot.
const second={id:other,avatarShape:'blob'},renderSecond=editorFor(second,()=>closed++);
elements=renderSecond();assert(!button(elements,'恢复原头像'),'Unassigned Bot has nothing to restore');
button(elements,'选择彩虹拓扑').props.onClick();elements=renderSecond();button(elements,'应用头像').props.onClick();
assert.equal(store.shapeFor(other),'robot_chromaknot');assert.equal(store.shapeFor(target),'robot_titan');
elements=renderSecond();button(elements,'恢复原头像').props.onClick();assert.equal(store.shapeFor(other),undefined);assert.equal(store.shapeFor(target),'robot_titan');
assert.deepEqual(selectionEvents.at(-1),['[Avatar Runtime] selection',other,null]);
const unsetOptions=context.Options({agent:{id:target,avatarShape:'',avatarColor:''},character:{commitCharacter:()=>{}}});assert.equal(unsetOptions.props.shape,'blob');assert.equal(unsetOptions.props.color,'black');

// Store: per-Bot activity, stable snapshots, validated input.
const bots=createLibraryStore({},libraryCharacters.map(c=>c.shape));
assert.throws(()=>bots.select('bad','robot_titan'),/Bot ID/);assert.throws(()=>bots.select(target,'sphere'),/Unknown/);
bots.select(target,'robot_titan');bots.select(other,'robot_jelly');bots.setActual(target,'coding');
assert.equal(bots.getBot(target).state,'coding');assert.equal(bots.getBot(other).state,'idle');assert.equal(bots.getBot(target),bots.getBot(target));
const demo=bots.preview('finished');assert.equal(bots.getBot(other).state,'finished');bots.expirePreview(demo.completionKey);assert.equal(bots.getBot(other).state,'idle');assert.equal(bots.getBot(target).state,'coding');

// Config: v1 migrates to per-Bot assignments; invalid entries are dropped, not fatal.
const scratch=new URL('./evidence/tool/',import.meta.url);mkdirSync(scratch,{recursive:true});const configFile=new URL('config-test.json',scratch);
writeFileSync(configFile,JSON.stringify({botId:target,shape:'robot_bitboy'}));assert.deepEqual(readConfig(configFile),{assignments:{[target]:'robot_bitboy'},botId:target,shape:'robot_bitboy'});
writeConfig({assignments:{[target]:'robot_titan',[other]:'neonNight'}},configFile);assert.deepEqual(readConfig(configFile).assignments,{[target]:'robot_titan',[other]:'neonNight'});
writeFileSync(configFile,JSON.stringify({assignments:{[target]:'removed-character','nope':'robot_titan',[other]:'robot_titan'}}));assert.deepEqual(readConfig(configFile).assignments,{[other]:'robot_titan'});
assert.throws(()=>writeConfig({assignments:{nope:'robot_titan'}},configFile),/UUID/);rmSync(configFile);
assert.deepEqual(readConfig(configFile),{assignments:{}});

// Bridge: marks resolve their own Bot through context; vendor shapes and Bot-less marks are untouched.
{
  const read=name=>readFileSync(new URL('./'+name,import.meta.url),'utf8');
  const glue=read('neon-state.mjs').replace(/^export /gm,'')+'\n'+read('library-state.mjs').replace(/^import .*;\n/gm,'').replace(/^export /gm,'')+'\n'+read('library-bridge.js').replaceAll('__LIBRARY_CHARACTERS__',JSON.stringify(libraryCharacters)).replaceAll('__LIBRARY_COLORS__',JSON.stringify({robot_titan:'cyan'})).replaceAll('__PHOTO_IMAGES__','{}').replaceAll('__AVATAR_INITIAL_ASSIGNMENTS__',JSON.stringify({[target]:'robot_jelly'})).replaceAll('__LIBRARY_UI__','true').replaceAll('__LIBRARY_DEMO__','false').replaceAll('__LIBRARY_AUDIT__','false');
  let currentBot=null;const Provider=Symbol('Provider');
  const RX={createContext:()=>({Provider}),useContext:()=>currentBot,useSyncExternalStore:(_s,get)=>get(),useRef:v=>({current:v}),useCallback:f=>f,useEffect:()=>{},createElement:(type,props,...children)=>({type,props:{...props,children}})};
  const g=vm.createContext({X:RX,globalThis:{},console});vm.runInContext(glue+'\nthis.api={avatarLibraryProps,avatarBound,beanLocalAgent,avatarAgentProps,avatarMarkProps,avatarStore};',g);
  const {avatarLibraryProps,avatarBound,beanLocalAgent,avatarAgentProps,avatarMarkProps,avatarStore:live}=g.api;
  live.setActual(target,'coding');live.setActual(other,'reading');
  assert.equal(avatarLibraryProps({shape:'robot_titan'}).shape,'robot_titan','no Bot context: unchanged');
  currentBot=target;let resolved=avatarLibraryProps({shape:'robot_titan'});assert.equal(resolved.shape,'robot_jelly');assert.equal(resolved.state,'coding');
  assert.equal(avatarLibraryProps({shape:'blob'}).shape,'blob','vendor grid shapes inside a Bot are untouched');
  currentBot=other;assert.equal(avatarLibraryProps({shape:'robot_titan'}).state,undefined,'unassigned Bot keeps vendor props');
  const agent={id:target,avatarDataUrl:'photo',avatarShape:'blob'},localAgent=beanLocalAgent(agent);
  assert.equal(localAgent.avatarShape,'robot_jelly');assert.equal(localAgent.avatarDataUrl,undefined);assert.equal(localAgent.__avatarOriginal,agent);assert.equal(beanLocalAgent(agent),localAgent,'identity cached');
  assert.equal(beanLocalAgent({id:other}).avatarShape,undefined);assert.equal(beanLocalAgent({id:target,isGroup:true}).avatarShape,undefined);
  const Inner=()=>null,bound=avatarBound(Inner,{agent},target,avatarAgentProps);assert.equal(bound.type,Provider);assert.equal(bound.props.value,target);assert.equal(bound.props.children[0].props.agent,localAgent);
  assert.equal(avatarBound(Inner,{agent:{id:other}},undefined,avatarAgentProps).type,Inner);
  assert.equal(avatarMarkProps({avatarKey:target,dataUrl:'x',shape:'blob'}).shape,'robot_jelly');assert.equal(avatarMarkProps({avatarKey:other,dataUrl:'x'}).dataUrl,'x');
}
const html=setupHtml({botCount:0,action:'/token"><script>'});assert(!html.includes('<script>'));assert(html.includes('还没有在本机找到 Bot'));
let commits=0;const server=await serveSetup({botCount:2,onStart:async()=>{commits++}});await new Promise(resolve=>server.server.listening?resolve():server.server.once('listening',resolve));const url=server.url,origin=new URL(url).origin;const nonce=(await (await fetch(url)).text()).match(/name="nonce" value="([^"]+)"/)[1];
assert.equal((await fetch(origin+'/wrong')).status,404);
assert.equal((await fetch(url,{method:'POST',headers:{Origin:'https://untrusted.example','Content-Type':'application/x-www-form-urlencoded'},body:'nonce='+nonce})).status,403);assert.equal(commits,0);
assert.equal((await fetch(url,{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:'nonce=wrong'})).status,403);
const response=await fetch(url,{method:'POST',headers:{Origin:'null','Content-Type':'application/x-www-form-urlencoded'},body:'nonce='+nonce});assert.equal(response.status,200);assert((await response.text()).includes('已准备好'));await server.result;assert.equal(commits,1);
if(process.argv.includes('--portable')){
  console.log(JSON.stringify({passed:true,scope:'portable; official app adaptation is not tested',nativePickerCards:libraryCharacters.length,perBotSelectionCancelRestore:true,perBotActivity:true,bridgeContextResolution:true,configMigrationAndValidation:true,setupOriginAndNonceProtection:true},null,2));
  process.exit(0);
}
const checked=preflight(),{archive,contract}=checked;const adapted=build(archive,null,{library:true,assignments:{[target]:'neonNight',[other]:'robot_titan'}});assert(adapted.changes.includes('native avatar editor entry'));for(const value of Object.values(adapted.patched))execFileSync(process.execPath,['--check','--input-type=module'],{input:value,stdio:'pipe'});
const appModule=contract.app;
// The 0.79.4 app assigns X to its JSX runtime and Y to React. Exercise the
// transformed bridges against only the release's actual React namespace so a
// syntactically valid but stale namespace cannot pass this check.
{
  const original=archive.read('dist/renderer/assets/'+appModule).toString(),vendorStart=original.slice(0,original.indexOf('\n'));
  const injected=source=>{const end=source.indexOf(vendorStart);assert(end>0,'injected bridge precedes the original module');return source.slice(0,end)};
  const runtimeReact={createElement:(type,props)=>({type,props}),useEffect:effect=>effect(),useRef:value=>({current:value}),useCallback:fn=>fn,useSyncExternalStore:(_subscribe,get)=>get()};
  const runtime=vm.createContext({[contract.react]:runtimeReact,console});
  vm.runInContext(injected(adapted.patched[appModule])+'\nthis.wrapped=avatarWrapEditor;this.libraryEditor=AvatarLibraryEditor;',runtime);
  assert.equal(runtime.wrapped(Native)({agent:{id:other}}).type,runtime.libraryEditor);
  const neon=build(archive,target,{shape:'neonNight'}),legacy=vm.createContext({[contract.react]:runtimeReact,console});
  vm.runInContext(injected(neon.patched[appModule])+'\nthis.observe=neonObserveActual;this.propsFor=neonAvatarProps;',legacy);
  legacy.observe({id:target},'coding');assert.equal(legacy.propsFor({shape:'neonNight'}).state,'coding');
}
for(const label of ['agent avatar binding','agent mark binding','native avatar binding','profile native trigger binding','roster surface binding','per-player activity state','static source guard'])assert(adapted.changes.includes(label),label);
assert(!adapted.patched[appModule].includes('__AVATAR_INITIAL_ASSIGNMENTS__'));assert(adapted.patched[appModule].includes(other));
const empty=build(archive,null,{library:true});assert(!empty.patched[appModule].includes(target));
const rebaked=empty.withAssignments({[other]:'robot_jelly'});assert(empty.patched[appModule].includes(other));assert.notEqual(rebaked[appModule],empty.hashes[appModule]);
assert.throws(()=>empty.withAssignments({[other]:'sphere'}),/Unknown library character/);
const incompatible=error=>error.code==='AVATAR_INTERFACE_CHANGED';
assert.throws(()=>build({...archive,read:path=>path.endsWith(contract.editor.file)?Buffer.from('changed'):archive.read(path)},target,{shape:'neonNight',library:true}),incompatible);
// The installed version and caller's guessed bindings cannot select a profile.
const relabeled=build({...archive,actualVersion:'99.0.0',contract:{version:'unregistered',shape:'wrongBinding'}},null,{library:true});
assert.equal(relabeled.contract.version,contract.version);
assert.deepEqual(relabeled.hashes,build(archive,null,{library:true}).hashes);
const altered=Buffer.from('different common module');
assert.throws(()=>build({...archive,contract:{...contract,commonSHA256:sha(altered)},read:path=>path.endsWith(contract.common)?altered:archive.read(path)},null,{library:true}),incompatible);
const report={passed:true,appVersion:checked.version,adapterVersion:contract.version,versionIndependentSelection:true,callerBindingsIgnored:true,nativePickerCards:libraryCharacters.length,thumbnailImagesDistinct:true,searchAndCollections:true,everyBotGetsLibraryEditor:true,groupsKeepVendorEditor:true,perBotIndependentSelection:true,restoreClearsOnlyThatBot:true,perBotActivity:true,bridgeContextResolution:true,releaseReactBindingsExecuted:true,legacyNeonBridgeExecuted:true,configMigratesV1:true,rebakeAfterSelection:true,cancelDoesNotApply:true,applyOnlyLocalSelection:true,rawOfficialEditorPropsPreserved:true,emptyOfficialColorUsesNativeFallback:true,setupHtmlEscaped:true,setupPathAndOriginChecks:true,opaqueOriginRequiresFormToken:true,setupSuccessfulCommitOnce:true,editorInputHashPinned:true,patchedModuleSyntaxChecked:true};
mkdirSync(new URL('./evidence/tool/',import.meta.url),{recursive:true});writeFileSync(new URL('./evidence/tool/offline-ui-verification.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
