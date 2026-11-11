import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {loadNativeLibrary} from './library-native.mjs';
import {libraryCharacters} from './library.mjs';
import {createLibraryStore} from './library-state.mjs';
import {createNeonCompletionGate} from './neon-state.mjs';
import {sha,asarPath,build} from './patch.mjs';

const bot='00000000-0000-4000-8000-000000000000',otherBot='00000000-0000-4000-8000-000000000001';
const store=createLibraryStore({[bot]:'neonNight'},libraryCharacters.map(c=>c.shape));
const gate=createNeonCompletionGate();
globalThis.__grokAvatarLibrary={store};globalThis.__grokNeonAvatar={store};
store.setActual(bot,'coding');const unchanged=store.getBot(bot);store.select(bot,'neonNight');assert.equal(store.getBot(bot),unchanged);
store.select(bot,'robot_titan');assert.equal(store.getBot(bot).state,'coding');
store.select(otherBot,'robot_oni');store.setActual(otherBot,'reading');assert.equal(store.getBot(bot).state,'coding');assert.equal(store.getBot(otherBot).state,'reading');
const demo=store.preview('finished');store.setActual(bot,'searching');store.select(bot,'robot_jelly');
assert.equal(store.getBot(bot).state,'finished');const newer=store.preview('finished');
store.expirePreview(demo.completionKey);assert.equal(store.getBot(bot).completionKey,newer.completionKey);
store.expirePreview(newer.completionKey);assert.equal(store.getBot(bot).state,'searching');assert.equal(store.getBot(bot).shape,'robot_jelly');assert.equal(store.getBot(otherBot).shape,'robot_oni');
assert.throws(()=>store.select(bot,'sphere'),/Unknown/);
let callbacks=0;const off=store.subscribe(()=>callbacks++);off();store.select(bot,'neonNight');assert.equal(callbacks,0);
const fakeCalls=[],fake={setExpression:x=>fakeCalls.push(x),poke:x=>fakeCalls.push(x)};
store.setActual(bot,'finished',10);assert(gate(fake,store.getBot(bot)));store.select(bot,'robot_oni');assert(!gate(fake,store.getBot(bot)));
store.setActual(bot,'failed');assert(!gate(fake,store.getBot(bot)));store.setActual(bot,'finished',11);assert(gate(fake,store.getBot(bot)));
assert.deepEqual(fakeCalls,['happy','nod','happy','nod']);

const {native,original,checked,adapted}=await loadNativeLibrary();
for(const source of Object.values(adapted.patched))execFileSync(process.execPath,['--check','--input-type=module'],{input:source,stdio:'pipe'});
assert.equal(libraryCharacters.length,31);assert.equal(native.robotCatalog.length,30);
for(const key of ['shape','name','number'])assert.equal(new Set(libraryCharacters.map(c=>c[key])).size,31);
assert.equal(new Set(native.robotCatalog.map(c=>c.outline)).size,30,'All catalog silhouettes must be distinct');
for(const d of native.robotCatalog){assert(d.depth>0&&d.depth<.8);assert(d.bevel>0&&d.bevel<.3);assert(d.colors.length===3);assert(d.paint.length>0);}
const palette=native.D('#6475ba','#91f9fa');
const settle=e=>{for(let i=0;i<180;i++)e.advance(1/60);return e.frame()};
const shapes=['sphere','bean','pebble','egg','squircle','tablet','capsule','cylinder','hex','gem','crystal','wedge','shield','dome','arch','cloud','teardrop','leaf','square','sparkle','clover','starFlower','heartChubby','house','star6'];
for(const body of shapes){const a=original.P({body}),b=native.P({body});a.rest();b.rest();for(const gaze of [null,[0,0],[.8,-.3]]){a.setGaze(gaze);b.setGaze(gaze);assert.equal(original.O(settle(a),palette,96,'same'),native.O(settle(b),palette,96,'same'),body)}}
const results=[];
for(const character of libraryCharacters){
  store.followActual();store.select(bot,character.shape);store.setActual(bot,'idle');let playerState='idle';const avatarState=()=>playerState;
  const e=native.P({body:character.shape});e.rest();const rest=settle(e);
  for(let i=0;i<3;i++){e.setGaze([0,0]);assert.deepEqual(settle(e).quat,[1,0,0,0]);e.setGaze(null);assert.deepEqual(settle(e).quat,rest.quat)}
  for(const gaze of [null,[0,0],[-1,0],[1,0],[0,1],[0,-1],[-1,1],[1,1],[-1,-1],[1,-1]]){
    e.setGaze(gaze);const frame=settle(e);
    for(const size of [36,64,192,1024]){
      const svg=native.O(frame,palette,size,'check');assert(!/NaN|Infinity/.test(svg));assert(svg.includes('data-avatar-shape="'+character.shape+'"'));
      const ids=[...svg.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);assert.equal(new Set(ids).size,ids.length);
      if(character.shape.startsWith('robot_')){
        const shape=native.robotInspectShape(frame,palette,size),matrix=shape.transform.match(/matrix\(([^)]+)\)/)[1].split(/\s+/).map(Number);
        const coords=[...shape.body.join(' ').matchAll(/-?\d+(?:\.\d+)?/g)].map(x=>Number(x[0]));
        for(let p=0;p<coords.length;p+=2){const x=matrix[0]*coords[p]+matrix[4],y=matrix[3]*coords[p+1]+matrix[5];assert(x>=0&&y>=0&&x<=size&&y<=size,character.name+' cropped')}
      }
    }
  }
  e.setGaze([0,0]);settle(e);e.blink();const eyePaths=new Set();
  for(let i=0;i<30;i++){e.advance(1/60);const svg=(character.shape==='neonNight'?native.neonNativeSvg:native.libraryNativeSvg)(e.frame(),palette,96,'blink');const group=svg.children[1];eyePaths.add(JSON.stringify(group.children.find(n=>n.attrs.mask==='url(#blink-inside)')?.children))}
  assert(eyePaths.size>4,character.name+' blink');
  let stateRenders=0,morphRenders=0;
  for(const state of Object.keys(native.stateDefinitions)){
    store.setActual(bot,state,state==='finished'?500:null);playerState=state;const engine=native.P({body:character.shape,avatarState}),controller=native.stateController(engine,state,{seed:7,isResting:false,isCompact:false});
    for(let i=0;i<60;i++){controller.advance(1/30);engine.advance(1/30);if(i%20!==0)continue;const svg=native.O(engine.frame(),palette,96,'state');assert(!/NaN|Infinity/.test(svg),character.name+' '+state);assert(svg.includes('data-neon-state="'+state+'"'));assert(svg.includes('data-avatar-shape="'+character.shape+'"'));if(svg.includes('data-neon-kind="native-morph"'))morphRenders++;stateRenders++}
  }
  store.setActual(bot,'working');playerState='working';const live=native.P({body:character.shape,avatarState}),controller=native.stateController(live,'working',{seed:1,isResting:false});const lampLevels=new Set();
  for(let i=0;i<90;i++){controller.advance(1/60);live.advance(1/60);const svg=native.O(live.frame(),palette,192,'lamp');lampLevels.add(svg.match(/data-neon-led-level="([^"]+)"/)[1])}
  assert(lampLevels.size>20);
  store.setActual(bot,'finished',600);playerState='finished';controller.setState('finished');const handle={setExpression:live.setExpression,poke:live.poke};assert(gate(handle,store.getBot(bot)));assert(!gate(handle,store.getBot(bot)));
  const celebration=[];for(let i=0;i<180;i++){controller.advance(1/60);live.advance(1/60);celebration.push(live.frame())}
  assert(celebration.some(f=>f.neonExpression==='happy'));assert(celebration.some(f=>f.neonGesture==='nod'));assert.equal(live.frame().neonNods,1);
  store.setActual(bot,'idle');playerState='idle';controller.setState('idle');live.rest();live.setGaze(null);assert.deepEqual(settle(live).quat,rest.quat);
  const dedicated=build(checked.archive,bot,{shape:character.shape,demo:true});
  assert(dedicated.patched[checked.contract.app].includes(character.shape));
  results.push({shape:character.shape,name:character.name,gazeReturnCycles:3,poseSizeRenders:40,blinkContours:eyePaths.size,stateRenders,morphRenders,workingLampLevels:lampLevels.size,completionHappyAndOneNativeNod:true});
}
// Two Bots on the same character: each player's lamp follows its own state, not a shared one.
for(const body of ['robot_titan','neonNight']){const busy=native.P({body,avatarState:()=>'working'}),rested=native.P({body,avatarState:()=>'idle'});busy.advance(.2);rested.advance(.2);
  assert(native.O(busy.frame(),palette,96,'a').includes('data-neon-state="working"'),body);assert(native.O(rested.frame(),palette,96,'b').includes('data-neon-state="idle"'),body)}
assert(adapted.changes.includes('per-player activity state'));
assert.equal(sha(readFileSync(asarPath)),checked.officialHash);
const report={passed:true,scope:'offline native engine; window acceptance recorded separately',appVersion:checked.version,architecture:process.arch,characterCount:results.length,originalShapesUnchanged:25,originalShapePoseComparisons:75,selectionPreservesActualState:true,perBotActivityIndependent:true,perPlayerLampState:true,staleDemoResetRejected:true,unknownCharacterRejected:true,completionDeduplicated:true,appModuleSyntaxChecked:true,officialSignatureVerified:true,officialAsarUnchanged:true,characters:results};
mkdirSync(new URL('./evidence/library/',import.meta.url),{recursive:true});writeFileSync(new URL('./evidence/library/offline-verification.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
