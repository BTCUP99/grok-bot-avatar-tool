// Public releases are assembled only from this explicit allowlist.
import {readFileSync,writeFileSync,mkdirSync,existsSync,mkdtempSync,copyFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {publicEntries} from './public-files.mjs';
import {inspectPublicFiles} from './verify-public.mjs';
import {sha,preflight} from './patch.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),version=JSON.parse(readFileSync(new URL('../package.json',import.meta.url))).version;
preflight();
const entries=publicEntries;
// Every Bot ID this device has configured must stay out of public packages.
const cfg=root+'runtime-bean/config.local.json',localConfig=existsSync(cfg)?JSON.parse(readFileSync(cfg)):{},privateIds=[localConfig.botId,...Object.keys(localConfig.assignments??{})].filter(Boolean);
inspectPublicFiles(root,entries,{privateIds});
const lock=JSON.parse(readFileSync(root+'runtime-bean/node-runtime.lock.json')),runtime=JSON.parse(readFileSync(root+'runtime-node/runtime.json'));
if(runtime.version!==lock.version||runtime.sha256!==lock.sha256||sha(readFileSync(root+'runtime-node/bin/node'))!==runtime.nodeSHA256)throw Error('Bundled Node runtime differs from the verified manifest');
execFileSync('/usr/bin/codesign',['--verify','--strict',root+'runtime-node/bin/node'],{stdio:'pipe'});
const runtimeEntries=['bin/node','LICENSE','runtime.json'].map(name=>({source:'runtime-node/'+name,destination:'runtime-node/'+name}));inspectPublicFiles(root,runtimeEntries,{privateIds});
mkdirSync(root+'releases/',{recursive:true});
const exportRoot=mkdtempSync(root+'releases/GrokBotAvatarTool-'+version+'-source-');
for(const entry of entries){const destination=join(exportRoot,entry.destination);mkdirSync(join(destination,'..'),{recursive:true});copyFileSync(root+entry.source,destination)}
const sourceZip=root+'releases/GrokBotAvatarTool-'+version+'-source.zip',userZip=root+'releases/GrokBotAvatarTool-'+version+'-macOS-arm64.zip';
const checksums=items=>items.map(item=>sha(readFileSync(root+item.source))+'  '+item.destination).join('\n')+'\n';
writeFileSync(join(exportRoot,'SHA256SUMS.txt'),checksums(entries));
const python=`import json,sys,zipfile,os
p=json.load(sys.stdin)
for name,items,checksums in [(p['sourceZip'],p['source'],p['sourceChecksums']),(p['userZip'],p['user'],p['userChecksums'])]:
 with zipfile.ZipFile(name,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
  for item in items:z.write(os.path.join(p['root'],item['source']),'GrokBotAvatarTool/'+item['destination'])
  z.writestr('GrokBotAvatarTool/SHA256SUMS.txt',checksums)
 with zipfile.ZipFile(name) as z:
  assert z.testzip() is None
  assert sum(n.endswith('.command') for n in z.namelist())==1
  assert not any('/evidence/' in n or 'config.local.json' in n or '/node_modules/' in n for n in z.namelist())
`;
execFileSync('python3',['-c',python],{input:JSON.stringify({root,sourceZip,userZip,source:entries,user:[...entries,...runtimeEntries],sourceChecksums:checksums(entries),userChecksums:checksums([...entries,...runtimeEntries])}),stdio:['pipe','pipe','pipe']});
const archives=[sourceZip,userZip].map(path=>({path,bytes:readFileSync(path).length,sha256:sha(readFileSync(path))}));
const checksumsFile=root+'releases/GrokBotAvatarTool-'+version+'-SHA256SUMS.txt';
writeFileSync(checksumsFile,archives.map(item=>item.sha256+'  '+item.path.split('/').at(-1)).join('\n')+'\n');
const report={version,publicEntry:'启动头像工具.command',sourceFiles:entries.length,userFiles:entries.length+runtimeEntries.length,sourceDirectory:exportRoot,archives,checksumsFile,privateMaterialExcluded:true,bundledNodeVersion:lock.version,bundledNodeSignatureVerified:true};
mkdirSync(new URL('./evidence/tool/',import.meta.url),{recursive:true});writeFileSync(new URL('./evidence/tool/package-verification.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
