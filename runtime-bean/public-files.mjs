// Explicit source publication boundary. Do not replace it with a recursive copy.
import {libraryCharacters} from './library.mjs';
import {photoCharacters} from './avatar-catalog.mjs';
const files=[
  '启动头像工具.command','CHANGELOG.md','docs/RELEASING.md','.github/workflows/ci.yml','.github/ISSUE_TEMPLATE/compatibility.yml','.github/ISSUE_TEMPLATE/config.yml','.github/pull_request_template.md','LICENSE','THIRD_PARTY_NOTICES.md','CONTRIBUTING.md','SECURITY.md','package.json','.gitignore','AGENTS.md','avatar-designs/catalog-shapes.js','avatar-designs/fantasy-shapes.js','avatar-designs/奇想新作设计说明.md',
  ...['README.md','tool.mjs','setup-server.mjs','node-runtime.lock.json','prepare-runtime.mjs','start.mjs','loader.mjs','patch.mjs','common-contract.mjs','config.mjs','cdp.mjs','bots.mjs','bean-shape.js','milkcat-shape.js','neon-shape.js','neon-state.mjs','neon-bridge.js','audit.js','library.mjs','avatar-catalog.mjs','photo-runtime.js','verify-photos.mjs','library-state.mjs','library-bridge.js','library-picker.js','library-runtime.js','library-native.mjs','generate-library.mjs','render-library.mjs','package-library.mjs','public-files.mjs','verify-public.mjs','verify-package.mjs','verify-tool.mjs','verify-library.mjs','verify.mjs','verify-neon.mjs','spec.mjs','头像库使用说明.md','头像制作规范.md','奶糖喵机说明.md','霓虹夜行说明.md','头像参数快照.json','头像规格图.svg','奶糖喵机参数快照.json','奶糖喵机规格图.svg','霓虹夜行参数快照.json','霓虹夜行规格图.svg'].map(name=>'runtime-bean/'+name),
  ...['manifest.json','index.html','机器人头像库总览.svg','机器人头像库总览.png','奇想新作总览.svg','奇想新作总览.png','verification.json'].map(name=>'runtime-bean/library/'+name),
];
for(const c of libraryCharacters){
  const prefix=c.number+'-'+c.key;
  files.push('runtime-bean/library/characters/'+prefix+'.json');
  for(const state of ['rest','front','working','finished'])for(const ext of ['svg','png'])files.push('runtime-bean/library/icons/'+prefix+'-'+state+'.'+ext);
  for(const ext of ['svg','png'])files.push('runtime-bean/library/sheets/'+prefix+'.'+ext);
  if(c.shape.startsWith('robot_'))for(const suffix of ['参数快照.json','规格图.svg'])files.push('runtime-bean/library/specs/'+c.name+suffix);
}
files.push('runtime-bean/photos/README.md','runtime-bean/photos/motion-spec.json','runtime-bean/photos/framing.json','runtime-bean/photos/verification.json','runtime-bean/photos/verification-1.4.0.json',...photoCharacters.map(c=>'runtime-bean/photos/'+c.file));
export const publicEntries=files.map(name=>({source:name,destination:name}));publicEntries.push({source:'PUBLIC_README.md',destination:'README.md'},{source:'PUBLIC_README.md',destination:'PUBLIC_README.md'});
