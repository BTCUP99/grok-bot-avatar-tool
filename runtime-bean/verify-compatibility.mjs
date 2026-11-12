// Portable compatibility regressions use invented modules, never vendor code.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {selectCompatibleContract,localModuleImports} from './compatibility.mjs';

const sha=value=>createHash('sha256').update(value).digest('hex');
const root='dist/renderer/assets/';
const names={common:'index.eager-common-Fixture.js',app:'index.eager-app-Fixture.js',
  editor:'chunk-agent-avatar-editor-Fixture.js',helper:'chunk-rolldown-runtime-Fixture.js',
  entry:'index-Fixture.js',dependency:'chunk-dependency-Fixture.js'};

function fixture(revision='first'){
  const files=new Map([
    [root+names.helper,Buffer.from('export const runtime = true;')],
    [root+names.common,Buffer.from(`import {runtime} from "./${names.helper}"; export const engine = ${JSON.stringify(revision)};`)],
    [root+names.app,Buffer.from(`import {engine} from "./${names.common}"; import {runtime} from "./${names.helper}"; import {theme} from "./${names.dependency}"; export const editor = () => import("./${names.editor}"); // ${revision}`)],
    [root+names.editor,Buffer.from(`import {engine} from "./${names.common}"; import {editor} from "./${names.app}"; import {runtime} from "./${names.helper}"; export const edit = ${JSON.stringify(revision)};`)],
    [root+names.entry,Buffer.from(`import {editor} from "./${names.app}"; import {engine} from "./${names.common}"; editor();`)],
    [root+names.dependency,Buffer.from('export const theme = "blue";')],
    ['dist/renderer/index.html',Buffer.from(`<script type="module" src="./assets/${names.entry}"></script>`)],
    ['package.json',Buffer.from('{"version":"1.0.1"}')],
  ]);
  const profile={version:'1.0.1',officialHash:sha('reviewed archive '+revision),
    common:names.common,commonSHA256:sha(files.get(root+names.common)),
    app:names.app,appSHA256:sha(files.get(root+names.app)),
    editor:{file:names.editor,sha256:sha(files.get(root+names.editor))},helper:names.helper,
    shape:'fixtureShape',react:'FixtureReact',dependencies:Object.fromEntries([...files].filter(([name])=>name.startsWith(root)&&name!==root+names.entry).map(([name,bytes])=>[name.slice(root.length),sha(bytes)]))};
  return {files,profile,helperSHA256:sha(files.get(root+names.helper)),revision};
}

function archiveFor(fixture,mutate=()=>{}){
  const files=new Map([...fixture.files].map(([name,bytes])=>[name,Buffer.from(bytes)]));
  mutate(files);
  const assets=Object.fromEntries([...files.keys()].filter(name=>name.startsWith(root)).map(name=>[name.slice(root.length),{size:files.get(name).length,offset:'0'}]));
  return {raw:Buffer.from('reviewed archive '+fixture.revision),
    tree:{files:{dist:{files:{renderer:{files:{assets:{files:assets}}}}}}},
    read(name){assert(files.has(name),'Fixture resource not found: '+name);return files.get(name)}};
}

const one=fixture(),two=fixture('second');two.profile.version='2.0.0';
const registry=Object.freeze({one:Object.freeze({...one.profile,editor:Object.freeze({...one.profile.editor})}),two:Object.freeze({...two.profile,editor:Object.freeze({...two.profile.editor})})});
const select=(archive,version='1.0.1',contracts=registry)=>selectCompatibleContract({archive,contracts,version,helperSHA256:one.helperSHA256});
let checks=0;
const rejects=(archive,reason)=>{assert.throws(()=>select(archive),error=>error.code==='AVATAR_INTERFACE_CHANGED'&&error.reason===reason);checks++};

const checked=select(archiveFor(one));
assert.equal(checked.mode,'verified-build');assert.equal(checked.actualVersion,'1.0.1');assert.equal(checked.adapterVersion,'1.0.1');checks++;

// Version changes cannot cause rejection when the executable inputs still match.
const future=select(archiveFor(one),'9.8.7');
assert.equal(future.mode,'compatible-modules');assert.equal(future.actualVersion,'9.8.7');
assert.equal(future.contract.version,'1.0.1');assert.equal(future.contract.shape,'fixtureShape');checks++;
const metadataOnly=archiveFor(one,files=>files.set('package.json',Buffer.from('{"version":"9.8.7","description":"new title"}')));
metadataOnly.raw=Buffer.from('changed unrelated package metadata');
assert.equal(select(metadataOnly,'9.8.7').mode,'compatible-modules');checks++;
const unrelated=archiveFor(one,files=>files.set('translations/new.json',Buffer.from('{"hello":"world"}')));
unrelated.raw=Buffer.from('same version, new unrelated resource');assert.equal(select(unrelated).mode,'compatible-modules');checks++;

// A familiar version label cannot excuse changed executable inputs or a mix.
for(const role of ['common','app','editor','helper'])rejects(archiveFor(one,files=>files.set(root+names[role],Buffer.from('changed '+role))),'module-fingerprint');
rejects(archiveFor(one,files=>files.set(root+names.common,two.files.get(root+names.common))),'module-fingerprint');
const spoof=archiveFor(one,files=>files.set(root+names.app,Buffer.from('changed app')));
spoof.contract={...one.profile,appSHA256:sha('changed app')};rejects(spoof,'module-fingerprint');

// Stale files must not make a newer, unknown module look compatible.
for(const role of ['common','app','editor','helper']){
  rejects(archiveFor(one,files=>files.delete(root+names[role])),'missing-module');
  rejects(archiveFor(one,files=>files.set(root+names[role].replace('Fixture','Stale'),Buffer.from('old cached module'))),'ambiguous-module');
}
const symlink=archiveFor(one);symlink.tree.files.dist.files.renderer.files.assets.files[names.app].link='elsewhere.js';rejects(symlink,'invalid-module');
const unpacked=archiveFor(one);unpacked.tree.files.dist.files.renderer.files.assets.files[names.helper].unpacked=true;rejects(unpacked,'invalid-module');
rejects({read:()=>Buffer.alloc(0)},'missing-assets');

// Pinning code is insufficient if the active renderer no longer imports it.
rejects(archiveFor(one,files=>files.set(root+names.entry,Buffer.from('export const unrelated = true;'))),'import-graph');
rejects(archiveFor(one,files=>files.delete('dist/renderer/index.html')),'missing-renderer-entry');
rejects(archiveFor(one,files=>files.set('dist/renderer/index.html',Buffer.from('<script type="module" src="../outside.js"></script>'))),'missing-renderer-entry');
rejects(archiveFor(one,files=>files.set('dist/renderer/index.html',Buffer.from(`<!-- <script type="module" src="./assets/${names.entry}"></script> -->`))),'ambiguous-renderer-entry');
rejects(archiveFor(one,files=>files.set('dist/renderer/index.html',Buffer.from(`<script type="module" src="./assets/${names.entry}"></script><script type="module" src="./assets/${names.entry}"></script>`))),'ambiguous-renderer-entry');
rejects(archiveFor(one,files=>files.delete(root+names.dependency)),'missing-dependency');
rejects(archiveFor(one,files=>files.set(root+names.dependency,Buffer.from('export const theme = "unexpected API";'))),'dependency-fingerprint');

// The baseline must cover the full reachable graph, not just existence or one
// hop. A missing baseline never silently approves an unknown imported module.
const incomplete={one:{...one.profile,dependencies:{...one.profile.dependencies}}};
delete incomplete.one.dependencies[names.dependency];
assert.throws(()=>select(archiveFor(one),'1.0.1',incomplete),error=>error.reason==='dependency-baseline-missing');checks++;
const transitive=fixture('transitive');
transitive.files.set(root+names.dependency,Buffer.from('import "./chunk-leaf-Fixture.js"; export const theme = "blue";'));
transitive.files.set(root+'chunk-leaf-Fixture.js',Buffer.from('export const leaf = true;'));
transitive.profile.dependencies[names.dependency]=sha(transitive.files.get(root+names.dependency));
transitive.profile.dependencies['chunk-leaf-Fixture.js']=sha(transitive.files.get(root+'chunk-leaf-Fixture.js'));
assert.equal(select(archiveFor(transitive),'9.0.0',{transitive:transitive.profile}).dependencyCount,6);checks++;
assert.throws(()=>select(archiveFor(transitive,files=>files.set(root+'chunk-leaf-Fixture.js',Buffer.from('changed leaf'))),'9.0.0',{transitive:transitive.profile}),error=>error.reason==='dependency-fingerprint');checks++;
assert.deepEqual([...localModuleImports('import"./side-effect.js"; import {x} from "./static.js"; import(`./dynamic.js`);')],['side-effect.js','static.js','dynamic.js']);checks++;

const legacy={one:{...one.profile}};delete legacy.one.dependencies;
assert.equal(select(archiveFor(one),'9.9.9',legacy).checks.at(-1),'legacy-build-fingerprint');checks++;
const unreviewedLegacy=archiveFor(one);unreviewedLegacy.raw=Buffer.from('unreviewed legacy package');
assert.throws(()=>select(unreviewedLegacy,'9.9.9',legacy),error=>error.reason==='dependency-baseline-missing');checks++;

// Compatibility is selected from bytes, not an obsolete registered filename.
const stalePaths={one:{...one.profile,common:'index.eager-common-Old.js',app:'index.eager-app-Old.js',editor:{...one.profile.editor,file:'chunk-agent-avatar-editor-Old.js'},helper:'chunk-rolldown-runtime-Old.js'}};
const before=JSON.stringify(stalePaths),resolved=select(archiveFor(one),'1.0.1',stalePaths);
assert.equal(resolved.contract.common,names.common);assert.equal(resolved.contract.app,names.app);assert.equal(resolved.contract.editor.file,names.editor);assert.equal(resolved.contract.helper,names.helper);
assert.equal(JSON.stringify(stalePaths),before);assert(Object.isFrozen(resolved));assert(Object.isFrozen(resolved.contract));assert(Object.isFrozen(resolved.contract.editor));checks++;
assert.throws(()=>select(archiveFor(one),'1.0.1',{one:one.profile,duplicate:{...one.profile,version:'other'}}),error=>error.reason==='ambiguous-adapter');checks++;

console.log(JSON.stringify({passed:true,checks,scope:'synthetic module compatibility; no official client required',
  versionOnlyUpdateAccepted:true,unrelatedArchiveChangeAccepted:true,changedInterfacesRejected:true,
  mixedAdaptersRejected:true,ambiguousResourcesRejected:true,activeImportGraphRequired:true,
  transitiveDependencyChangesRejected:true,missingBaselinesRejected:true,
  archiveSuppliedContractIgnored:true,canonicalProfilesUnchanged:true},null,2));
