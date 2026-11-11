import assert from 'node:assert/strict';
import {preflight,build,sha,asarPath} from './patch.mjs';
import {readFileSync} from 'node:fs';
import {bindCommonHelpers,commonBindings,loadCommonModule} from './common-contract.mjs';
const checked=preflight();
const {archive,officialHash,contract}=checked;
const {common}=contract;
const id='00000000-0000-4000-8000-000000000000';
const {patched}=build(archive,id);
const load=source=>loadCommonModule(checked,source);
const original=await load(archive.read('dist/renderer/assets/'+common).toString());
const bean=await load(patched[common]);
const milkcat=await load(build(archive,id,{shape:'milkcat'}) .patched[common]);
const settle=e=>{for(let i=0;i<180;i++)e.advance(1/60);return e.frame();};
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const engine=bean.P({body:'apricotBean'});engine.rest();const rest=settle(engine);
for(let i=0;i<3;i++){
  engine.setGaze([0,0]);assert(distance(settle(engine).quat,[1,0,0,0])<1e-8);
  engine.setGaze(null);assert(distance(settle(engine).quat,rest.quat)<1e-8);
}
const palette=bean.D('#f7af69','#3c2924');
const shapes=['sphere','bean','pebble','egg','squircle','tablet','capsule','cylinder','hex','gem','crystal','wedge','shield','dome','arch','cloud','teardrop','leaf','square','sparkle','clover','starFlower','heartChubby','house','star6'];
for(const body of shapes){
  for(const adapted of [bean,milkcat]){
    const a=original.P({body}),b=adapted.P({body});a.rest();b.rest();
    for(const gaze of [null,[0,0],[.8,-.3]]){a.setGaze(gaze);b.setGaze(gaze);assert.equal(original.O(settle(a),palette,96,'reference'),adapted.O(settle(b),palette,96,'reference'),body);}
  }
}
engine.blink();const frames=[];
for(let i=0;i<30;i++){engine.advance(1/60);const s=bean.O(engine.frame(),palette,96,'blink');assert(!/NaN|Infinity/.test(s));frames.push(s);}
assert(new Set(frames).size>4);
// Compare the installed milkcat geometry against the selected design's source.
const catalogSource=readFileSync(new URL('../avatar-designs/catalog-shapes.js',import.meta.url),'utf8');
const {rendererEntry}=commonBindings(contract.version);
const catalogBase=patched[common].replace(rendererEntry,rendererEntry+'if(e.body.startsWith(`robot_`)&&e.bodies.length===1&&e.morph==null)return robotNativeSvg(e,t,n,r,i);');
const catalog=await load(catalogBase+'\n'+bindCommonHelpers(catalogSource,contract.version));
const cat=milkcat.P({body:'milkcat'}),reference=catalog.P({body:'robot_milkcat'});cat.rest();reference.rest();
const catRest=settle(cat);
for(let i=0;i<3;i++){
  cat.setGaze([0,0]);assert.deepEqual(settle(cat).quat,[1,0,0,0]);
  cat.setGaze(null);assert(distance(settle(cat).quat,catRest.quat)<1e-8);
}
for(const gaze of [null,[0,0],[-1,0],[1,0],[0,1],[0,-1],[-1,1],[1,1],[-1,-1],[1,-1]]){
  cat.setGaze(gaze);reference.setGaze(gaze);const a=settle(cat),b=settle(reference);
  for(const size of [36,64,192]){
    const actual=milkcat.O(a,palette,size,'same-id').replace('data-milkcat-native="1"','data-robot-design="milkcat"');
    assert.equal(actual,catalog.O(b,palette,size,'same-id'),'milkcat differs from candidate');
  }
}
cat.blink();const catFrames=[];
for(let i=0;i<30;i++){cat.advance(1/60);const s=milkcat.O(cat.frame(),palette,96,'cat-blink');assert(!/NaN|Infinity/.test(s));catFrames.push(s);}
assert(new Set(catFrames).size>4);
assert.throws(()=>build(archive,id,{shape:'not-supported'}),/Unsupported/);
assert.throws(()=>build(archive,'not-a-uuid'),/UUID/);
assert.throws(()=>build({read:()=>Buffer.from('unsupported source')},id),/hash mismatch/);
assert.equal(sha(readFileSync(asarPath)),officialHash);
console.log(JSON.stringify({passed:true,nativeGazeReturnCycles:6,originalShapesCompared:25,originalShapePoseComparisons:150,milkcatMatchesSelectedDesignPoseSizes:30,blink:true,unsupportedInputRejected:true,officialBundleUnchanged:true,scope:'offline; perform actual window hover acceptance separately'},null,2));
