import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {preflight,build,sha,asarPath} from './patch.mjs';
import {loadCommonModule} from './common-contract.mjs';
import {createNeonAvatarStore,createNeonCompletionGate} from './neon-state.mjs';

const store=createNeonAvatarStore(),gate=createNeonCompletionGate();
let notices=0;store.subscribe(()=>notices++);
store.setActual('working');assert.equal(store.getSnapshot().state,'working');
const previous=store.getSnapshot();store.setActual('working');assert.equal(store.getSnapshot(),previous);
const demo1=store.preview('finished');store.setActual('coding');assert.equal(store.getSnapshot().state,'finished');
const demo2=store.preview('finished');store.expirePreview(demo1.completionKey);assert.equal(store.getSnapshot().completionKey,demo2.completionKey);
store.expirePreview(demo2.completionKey);assert.equal(store.getSnapshot().state,'coding');assert(!store.getSnapshot().isDemo);
const calls=[],handle={setExpression:name=>calls.push(name),poke:name=>calls.push(name)};
store.setActual('finished',123);assert(gate(handle,store.getSnapshot()));assert(!gate(handle,store.getSnapshot()));
store.setActual('finished',123);assert(!gate(handle,store.getSnapshot()));
store.setActual('failed');assert(!gate(handle,store.getSnapshot()));
store.setActual('finished',124);assert(gate(handle,store.getSnapshot()));
assert.deepEqual(calls,['happy','nod','happy','nod']);
store.followActual();store.setActual('idle');

const checked=preflight(),{archive,officialHash,contract}=checked,id='00000000-0000-4000-8000-000000000000';
const {common,app}=contract;
const adapted=build(archive,id,{shape:'neonNight',audit:true,demo:true});
execFileSync(process.execPath,['--check','--input-type=module'],{input:adapted.patched[app],stdio:['pipe','pipe','pipe']});
const original=await loadCommonModule(checked,archive.read('dist/renderer/assets/'+common).toString());
const neon=await loadCommonModule(checked,adapted.patched[common],'neonNativeSvg as inspectSvg');
globalThis.__grokNeonAvatar={store};
const palette=neon.D('#6475ba','#91f9fa');
const settle=e=>{for(let i=0;i<180;i++)e.advance(1/60);return e.frame();};
const engine=neon.P({body:'neonNight'});engine.rest();const rest=settle(engine);
for(let i=0;i<3;i++){
  engine.setGaze([0,0]);assert.deepEqual(settle(engine).quat,[1,0,0,0]);
  engine.setGaze(null);assert.deepEqual(settle(engine).quat,rest.quat);
}
const shapes=['sphere','bean','pebble','egg','squircle','tablet','capsule','cylinder','hex','gem','crystal','wedge','shield','dome','arch','cloud','teardrop','leaf','square','sparkle','clover','starFlower','heartChubby','house','star6'];
for(const body of shapes){
  const a=original.P({body}),b=neon.P({body});a.rest();b.rest();
  for(const gaze of [null,[0,0],[.8,-.3]]){a.setGaze(gaze);b.setGaze(gaze);assert.equal(original.O(settle(a),palette,96,'same'),neon.O(settle(b),palette,96,'same'),body);}
}
for(const gaze of [null,[0,0],[-1,0],[1,0],[0,1],[0,-1],[-1,1],[1,1],[-1,-1],[1,-1]]){
  engine.setGaze(gaze);const frame=settle(engine);
  for(const size of [36,64,192]){const svg=neon.O(frame,palette,size,'view');assert(!/NaN|Infinity/.test(svg));assert(svg.includes('data-neon-native="1"'));}
}
engine.setGaze([0,0]);settle(engine);engine.blink();const eyePaths=[];
for(let i=0;i<30;i++){
  engine.advance(1/60);const node=neon.inspectSvg(engine.frame(),palette,96,'blink');
  eyePaths.push(JSON.stringify(node.children[1].children.find(n=>n.attrs.mask==='url(#blink-inside)')?.children.map(n=>n.attrs.d)));
}
assert(new Set(eyePaths).size>4);

let stateRenders=0,morphRenders=0;
for(const state of Object.keys(neon.stateDefinitions)){
  store.setActual(state,state==='finished'?1000:null);
  const e=neon.P({body:'neonNight'}),controller=neon.stateController(e,state,{seed:7,isResting:false,isCompact:false});
  for(let i=0;i<60;i++){
    controller.advance(1/30);e.advance(1/30);if(i%20!==0)continue;
    const svg=neon.O(e.frame(),palette,96,'state');assert(!/NaN|Infinity/.test(svg),state);assert(svg.includes('data-neon-native="1"'),state);assert(svg.includes('data-neon-state="'+state+'"'),state);
    if(svg.includes('data-neon-kind="native-morph"'))morphRenders++;stateRenders++;
  }
}

store.setActual('working');
const live=neon.P({body:'neonNight'}),controller=neon.stateController(live,'working',{seed:1,isResting:false});
const lampLevels=new Set();
for(let i=0;i<90;i++){controller.advance(1/60);live.advance(1/60);lampLevels.add(neon.inspectSvg(live.frame(),palette,192,'lamp').attrs['data-neon-led-level']);}
assert(lampLevels.size>20);
store.setActual('finished',2000);controller.setState('finished');
const nativeHandle={setExpression:live.setExpression,poke:live.poke};
assert(gate(nativeHandle,store.getSnapshot()));assert(!gate(nativeHandle,store.getSnapshot()));
const celebration=[];
for(let i=0;i<180;i++){controller.advance(1/60);live.advance(1/60);if(i%3===0)celebration.push(live.frame());}
assert(celebration.some(f=>f.neonExpression==='happy'));
assert(celebration.some(f=>f.neonGesture==='nod'));
store.setActual('idle');controller.setState('idle');live.rest();live.setGaze(null);assert.deepEqual(settle(live).quat,rest.quat);
assert.throws(()=>build(archive,id,{shape:'milkcat',demo:true}),/neonNight/);
assert.equal(sha(readFileSync(asarPath)),officialHash);
const report={passed:true,scope:'offline; actual window acceptance is separate',originalShapePoseComparisons:75,neonGazeReturnCycles:3,neonPoseSizeRenders:30,nativeBlinkEyePathVariants:new Set(eyePaths).size,stateRenders,morphRenders,workingLampLevels:lampLevels.size,completionHappyAndNativeNod:true,completionDeduplicated:true,staleDemoResetRejected:true,appModuleSyntaxChecked:true,officialBundleUnchanged:true};
mkdirSync(new URL('./evidence/neon-night/',import.meta.url),{recursive:true});
writeFileSync(new URL('./evidence/neon-night/offline-verification.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
