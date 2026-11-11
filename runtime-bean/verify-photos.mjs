// Offline contract checks. Actual window motion acceptance is recorded separately.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {avatarChoices,avatarChoice,photoCharacters,photoDataUrls} from './avatar-catalog.mjs';
import {libraryCharacters} from './library.mjs';
import {createLibraryStore,botIdPattern} from './library-state.mjs';
import {readConfig,writeConfig,normalizeAssignments} from './config.mjs';
import {build,preflight} from './patch.mjs';

const read=name=>readFileSync(new URL('./'+name,import.meta.url),'utf8');
const target='00000000-0000-4000-8000-000000000010',other='00000000-0000-4000-8000-000000000011';
const photos=photoDataUrls(),first=photoCharacters[0],last=photoCharacters.at(-1);
assert.equal(photoCharacters.length,11);assert.equal(libraryCharacters.length,31);assert.equal(avatarChoices.length,42);
assert.equal(new Set(avatarChoices.map(c=>c.shape)).size,42);
assert.equal(new Set(Object.values(photos)).size,11,'Every photo must have a distinct image');
for(const character of photoCharacters){
  assert.equal(avatarChoice(character.shape),character);
  const bytes=readFileSync(new URL('./photos/'+character.file,import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),character.sha256);
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(bytes.readUInt32BE(16),256);assert.equal(bytes.readUInt32BE(20),256);
  assert(bytes.length<5*1024*1024);
  assert.deepEqual(Buffer.from(photos[character.shape].split(',')[1],'base64'),bytes,'Runtime must embed the reviewed crop bytes unchanged');
}

// Selecting a photo is a staged local choice, independently saved for each Bot.
const selectionEvents=[],store=createLibraryStore({[target]:'robot_titan',[other]:last.shape},avatarChoices.map(c=>c.shape));
let states=[],cursor=0,closed=0;
const X={createElement:(type,props,...children)=>({type,props:{...props,children}}),useSyncExternalStore:(_subscribe,get)=>get(),useState:initial=>{const index=cursor++,own=states;if(!(index in own))own[index]=typeof initial==='function'?initial():initial;return [own[index],value=>{own[index]=typeof value==='function'?value(own[index]):value}]}};
const picker=vm.createContext({X,avatarStore:store,avatarCharacters:avatarChoices,botIdPattern,console:{info:(...args)=>selectionEvents.push(args)}});
vm.runInContext(read('library-picker.js').replaceAll('__AVATAR_PICKER_IMAGES__',JSON.stringify(photos))+'\nthis.Editor=AvatarLibraryEditor;this.wrap=avatarWrapEditor;',picker);
const Native=()=>null,raw={id:target,avatarDataUrl:'vendor-image',avatarShape:'blob'},local={...raw,__avatarOriginal:raw};
const flatten=node=>node&&typeof node==='object'?[node,...(node.props?.children??[]).flat(Infinity).flatMap(flatten)]:[];
const editorFor=agent=>{const own=[];return()=>{cursor=0;states=own;return flatten(picker.Editor({agent,NativeEditor:Native,onClose:()=>closed++}))}};
const button=(elements,label)=>{const found=elements.find(n=>n.type==='button'&&(n.props.children[0]===label||n.props['aria-label']===label));assert(found,'Missing button '+label);return found};
const cards=elements=>elements.filter(n=>n.props?.['aria-label']?.startsWith('选择'));
let render=editorFor(local),elements=render();assert.equal(cards(elements).length,31);
button(elements,'写真头像').props.onClick();elements=render();assert.equal(cards(elements).length,11);
assert.equal(store.shapeFor(target),'robot_titan','Opening photo tab must not apply');
elements.find(n=>n.props?.['aria-label']==='搜索写真头像').props.onChange({target:{value:last.name}});elements=render();
assert.equal(cards(elements).length,1);assert.equal(cards(elements)[0].props['aria-label'],'选择'+last.name);
elements.find(n=>n.type==='input').props.onChange({target:{value:''}});elements=render();
button(elements,'选择'+first.name).props.onClick();elements=render();button(elements,'取消').props.onClick();
assert.equal(closed,1);assert.equal(selectionEvents.length,0);assert.equal(store.shapeFor(target),'robot_titan');
render=editorFor(local);elements=render();button(elements,'写真头像').props.onClick();elements=render();
button(elements,'选择'+first.name).props.onClick();elements=render();button(elements,'应用头像').props.onClick();
assert.equal(store.shapeFor(target),first.shape);assert.equal(store.shapeFor(other),last.shape);
assert.deepEqual(selectionEvents.at(-1),['[Avatar Runtime] selection',target,first.shape]);
render=editorFor(local);elements=render();assert.equal(cards(elements).length,11,'Assigned photo reopens photo tab');
assert.equal(button(elements,'选择'+first.name).props['aria-pressed'],true);
button(elements,'官方选项').props.onClick();elements=render();assert.equal(elements.find(n=>n.type===Native).props.agent,raw);
render=editorFor(local);elements=render();button(elements,'恢复原头像').props.onClick();assert.equal(store.shapeFor(target),undefined);assert.equal(store.shapeFor(other),last.shape);
assert.equal(picker.wrap(Native)({agent:{id:other,isGroup:true}}).type,Native);

const scratch=new URL('./evidence/photos/',import.meta.url);mkdirSync(scratch,{recursive:true});const configFile=new URL('config-check.json',scratch);
try{
  const assignments={[target]:first.shape,[other]:'robot_titan'};
  writeConfig({assignments},configFile);assert.deepEqual(readConfig(configFile).assignments,assignments);
  assignments[target]=last.shape;writeConfig({assignments},configFile);assert.deepEqual(readConfig(configFile).assignments,assignments);
  assert.throws(()=>normalizeAssignments({[target]:'photo_missing'}),/Unknown/);
}finally{rmSync(configFile,{force:true})}

// Native grids still receive native shapes; photo FO and shared-source marks
// resolve the same Bot selection, while original account data remains untouched.
const bridgeSource=read('neon-state.mjs').replace(/^export /gm,'')+'\n'+read('library-state.mjs').replace(/^import .*;\n/gm,'').replace(/^export /gm,'')+'\n'+read('library-bridge.js')
  .replaceAll('__LIBRARY_CHARACTERS__',JSON.stringify(avatarChoices)).replaceAll('__LIBRARY_COLORS__','{}').replaceAll('__PHOTO_IMAGES__',JSON.stringify(photos))
  .replaceAll('__AVATAR_INITIAL_ASSIGNMENTS__',JSON.stringify({[target]:first.shape,[other]:'robot_titan'})).replaceAll('__LIBRARY_UI__','true').replaceAll('__LIBRARY_DEMO__','false').replaceAll('__LIBRARY_AUDIT__','false');
let currentBot=target;const NativeMark=()=>null,PhotoEntry=()=>null;
const RX={...X,createContext:()=>({Provider:Symbol('Provider')}),useContext:()=>currentBot,useRef:value=>({current:value}),useCallback:fn=>fn,useEffect:()=>{}};
const bridge=vm.createContext({X:RX,console,globalThis:{},hT:PhotoEntry,FO$avatar:NativeMark,PO:{md:36}});
vm.runInContext(bridgeSource+'\nthis.api={avatarStore,avatarLibraryProps,avatarMarkEntry,beanLocalAgent,avatarShapeFor,avatarPhotoFor};',bridge);
const api=bridge.api;api.avatarStore.setActual(target,'coding');
let props=api.avatarLibraryProps({shape:first.shape});assert.equal(props.avatarBotId,target);assert.equal(props.state,'coding');
assert.equal(api.avatarLibraryProps({shape:'blob'}).shape,'blob','Official grid stays native');
assert.equal(api.avatarLibraryProps({shape:'blob',sourceId:'shared-source'}).shape,first.shape);
const ref={current:null},entry=api.avatarMarkEntry({avatarKey:target,markRef:ref});assert.equal(entry.type,PhotoEntry);assert.equal(entry.props.ref,ref);assert.equal(entry.props.sizePx,36);assert.equal(entry.props.color,'cyan','Photo dispatch must supply a valid native color for mT/Fx');
assert.equal(api.avatarMarkEntry({avatarKey:target,color:'orange'}).props.color,'orange','Explicit native color must be preserved');
assert.equal(api.avatarMarkEntry({avatarKey:other}).type,NativeMark);assert.equal(api.avatarShapeFor(target),undefined);assert.equal(api.avatarPhotoFor(target),photos[first.shape]);
const transformed=api.beanLocalAgent(raw);assert.equal(transformed.avatarDataUrl,photos[first.shape]);assert.equal(transformed.avatarShape,'blob');assert.equal(raw.avatarDataUrl,'vendor-image');
api.avatarStore.select(target,null);assert.equal(api.beanLocalAgent(transformed),raw,'Restore must unwrap an already-local clone');

// Shared portrait motion, independent Bots, bounded tilt and one completion.
const motionContext=vm.createContext({});vm.runInContext(read('photo-runtime.js')+'\nthis.api={createPhotoMotionStore,avatarPhotoPose,avatarPhotoActivity,AvatarPhotoMark};',motionContext);
const {createPhotoMotionStore,avatarPhotoPose,avatarPhotoActivity}=motionContext.api;
let time=1000,notified=0,otherNotified=0;const motion=createPhotoMotionStore(()=>time);
const unsubA=motion.subscribe(target,()=>notified++),unsubB=motion.subscribe(target,()=>notified++),unsubOther=motion.subscribe(other,()=>otherNotified++);
const rest=motion.getSnapshot(target);assert.equal(rest.gaze,null);assert.equal(motion.getSnapshot(target),rest);
assert.equal(motion.gaze(target,[0,0]),true);assert.equal(notified,2);assert.equal(otherNotified,0);
assert.equal(motion.gaze(target,[0,0]),false);assert.equal(notified,2);
let pose=avatarPhotoPose(motion.getSnapshot(target).gaze);assert.equal(Math.abs(pose.x),0);assert.equal(Math.abs(pose.y),0);assert.equal(pose.z,0);assert.equal(pose.scale,1);
motion.gaze(target,[9,-9]);pose=avatarPhotoPose(motion.getSnapshot(target).gaze);assert(Math.abs(pose.x)<=6&&Math.abs(pose.y)<=6);assert.equal(pose.z,0);
motion.gaze(target,null);pose=avatarPhotoPose(motion.getSnapshot(target).gaze);assert.notEqual(pose.z,0);assert.equal(pose.scale,1);assert.equal(motion.getSnapshot(other).gaze,null);
const reduced=avatarPhotoPose(null,true);assert.equal(reduced.x,0);assert.equal(reduced.y,0);assert.equal(reduced.z,0);assert.equal(reduced.scale,1);
assert.equal(motion.poke(target,'spin'),false);assert.equal(motion.poke(target,'nod','finished:1'),true);assert.equal(motion.poke(target,'bounce','finished:1'),false);
assert.equal(motion.getSnapshot(target).bounces,1);assert.equal(motion.getSnapshot(other).bounces,0);
time+=1000;assert.equal(motion.poke(target,'nod','finished:1'),false);assert.equal(motion.poke(target,'nod','finished:2'),true);
unsubA();assert.equal(motion.size(),2);unsubB();unsubOther();assert.equal(motion.size(),0,'Unmount must release shared channels');
for(const state of ['working','coding','reading'])assert.equal(avatarPhotoActivity(state),'working');
assert.equal(avatarPhotoActivity('finished'),'finished');assert.equal(avatarPhotoActivity('idle'),'idle');

// Component renders precisely one unchanged photograph in every activity state;
// effects live on containers, never on a generated face/eye/mouth layer.
const portraitX={...RX,useId:()=> 'portrait-test',useContext:()=>null,useMemo:fn=>fn(),useImperativeHandle:(ref,get)=>{if(ref)ref.current=get()},useState:initial=>[typeof initial==='function'?initial():initial,()=>{}]};
const layoutColors=[];
// mT invokes the native ink resolver Fx when ink is absent. An undefined color
// throws there, so this mock enforces that real native precondition.
const photoLayout=(props,color)=>{assert(['cyan','orange'].includes(color),'Photo mT needs a valid native fallback color');assert.equal(color,props.color??'cyan');layoutColors.push(color);return {width:props.sizePx,height:props.sizePx}};
Object.assign(motionContext,{X:portraitX,AO:{},fT:{root:{}},oo:()=>({style:{},className:'layout'}),mT:photoLayout,avatarPhotoImages:photos});
for(const character of photoCharacters)for(const state of ['idle','working','finished']){
  const ref={current:null},nodes=flatten(motionContext.api.AvatarPhotoMark({shape:character.shape,avatarBotId:target,state,sizePx:64,ref}));
  const image=nodes.filter(node=>node.type==='img');assert.equal(image.length,1);assert.equal(image[0].props.src,photos[character.shape]);
  assert(!nodes.some(node=>node.type==='canvas'||node.type==='svg'));
  assert.equal(ref.current.setExpression('happy'),undefined);assert.equal(ref.current.poke('spin'),false);
}

assert.equal(layoutColors.length,33);assert(layoutColors.every(color=>color==='cyan'));
motionContext.api.AvatarPhotoMark({shape:first.shape,avatarBotId:target,state:'idle',sizePx:36,color:'orange'});assert.equal(layoutColors.at(-1),'orange');

const portable=process.argv.includes('--portable');
if(!portable){
const {archive,contract}=preflight();
const adapted=build(archive,null,{library:true,assignments:{[target]:first.shape,[other]:'robot_titan'}});
for(const source of Object.values(adapted.patched))execFileSync(process.execPath,['--check','--input-type=module'],{input:source,stdio:'pipe'});
const {app:appModule,common:commonModule,display}=contract;
assert(adapted.changes.includes('local photo static source'));assert(adapted.patched[appModule].includes(photos[first.shape]));
// Exercise the actual patched dispatch function: React must remount a portrait
// when navigation changes Bot identity, so its local bounce counter cannot leak.
const appSource=adapted.patched[appModule];
const photoDispatch=appSource.slice(appSource.indexOf(`function ${display}(e){`),appSource.indexOf(`function ${display}$avatar(e){`));
const NativeDispatch=()=>null,PhotoDispatch=()=>null;
const dispatch=vm.createContext({[contract.react]:{createElement:(type,props)=>({type,key:props.key??null,props})},avatarLibraryProps:props=>props,avatarIsPhoto:shape=>Object.hasOwn(photos,shape),AvatarPhotoMark:PhotoDispatch,[display+'$avatar']:NativeDispatch});
vm.runInContext(photoDispatch+`\nthis.render=${display};`,dispatch);
const markA=dispatch.render({shape:first.shape,avatarBotId:target}),markB=dispatch.render({shape:first.shape,avatarBotId:other});
assert.equal(markA.type,PhotoDispatch);assert.notEqual(markA.key,markB.key,'Changing Bot must create a new portrait component lifetime');
assert.equal(markA.key,dispatch.render({shape:last.shape,avatarBotId:target}).key,'Changing only the same Bot photo retains its motion channel');
assert.equal(dispatch.render({shape:first.shape,sourceId:'preview-source'}).key,'preview-source');
assert.equal(dispatch.render({shape:first.shape}).key,first.shape);
assert.equal(dispatch.render({shape:'robot_titan',avatarBotId:target}).type,NativeDispatch);
const commonBefore=adapted.patched[commonModule];const hashes=adapted.withAssignments({[target]:last.shape,[other]:'robot_titan'});
assert.notEqual(hashes[appModule],adapted.hashes[appModule]);assert.equal(adapted.patched[commonModule],commonBefore,'Photo selections must not alter native geometry');
assert.throws(()=>adapted.withAssignments({[target]:'photo_missing'}),/Unknown/);
}
const report={passed:true,scope:portable?'portable; official app adaptation is not tested':'offline with verified official app',photoCount:11,totalChoices:42,exactPinnedCropBytes:true,runtimePNGDimensions:256,photoPickerSearch:true,stagedCancel:true,perBotLocalPersistence:true,restoreUnwrapsOriginal:true,officialGridPreserved:true,nativeLayoutColorContract:true,photoLifetimeKeyedByBot:!portable,sharedSourceResolvesPhoto:true,sharedGazeIsolatedByBot:true,hoverFrontLeaveRest:true,boundedPointerTilt:true,reducedMotionIdentity:true,completionDeduplicated:true,noSpin:true,sourceImageUnchangedAcrossStates:true,cleanupReleasesChannels:true,rebakeAfterPhotoSelection:!portable,patchedModuleSyntax:!portable,actualWindowAcceptance:false};
writeFileSync(new URL('offline-verification.json',scratch),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
