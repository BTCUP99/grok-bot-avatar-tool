// Verify the actual downloadable ZIPs, then test the extracted files.
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {publicEntries} from './public-files.mjs';
import {inspectPublicFiles} from './verify-public.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const version=JSON.parse(readFileSync(new URL('../package.json',import.meta.url))).version;
const scratch=mkdtempSync(join(tmpdir(),'avatar-release-check-'));
const runtimeFiles=['runtime-node/bin/node','runtime-node/LICENSE','runtime-node/runtime.json'];
const archiveReport=[];
try{
  const checksums=new Map(readFileSync(join(root,'releases','GrokBotAvatarTool-'+version+'-SHA256SUMS.txt'),'utf8').trim().split('\n').map(line=>{const [digest,name]=line.split('  ');return [name,digest]}));
  assert.equal(checksums.size,2,'Release checksum manifest must describe exactly two ZIPs');
  for(const kind of ['source','macOS-arm64']){
    const archive=join(root,'releases','GrokBotAvatarTool-'+version+'-'+kind+'.zip');
    const archiveHash=createHash('sha256').update(readFileSync(archive)).digest('hex');
    assert.equal(archiveHash,checksums.get('GrokBotAvatarTool-'+version+'-'+kind+'.zip'),'Release ZIP checksum differs');
    const destination=join(scratch,kind);
    const files=[...publicEntries.map(entry=>entry.destination),...(kind==='source'?[]:runtimeFiles)];
    const python=`import hashlib,json,os,pathlib,stat,sys,zipfile
p=json.load(sys.stdin)
with zipfile.ZipFile(p['archive']) as z:
 names=z.namelist(); prefix='GrokBotAvatarTool/'
 expected={prefix+n for n in p['files']}|{prefix+'SHA256SUMS.txt'}
 assert len(names)==len(set(names)) and set(names)==expected,'Archive differs from explicit release file list'
 assert z.testzip() is None,'ZIP CRC verification failed'
 lines=z.read(prefix+'SHA256SUMS.txt').decode().splitlines()
 manifest={}
 for line in lines:
  digest,name=line.split('  ',1)
  assert name not in manifest,'Duplicate checksum entry'
  manifest[name]=digest
 assert set(manifest)==set(p['files']),'Checksum file list differs'
 for name,digest in manifest.items():
  assert hashlib.sha256(z.read(prefix+name)).hexdigest()==digest,'Checksum failed: '+name
 for info in z.infolist():
  parts=pathlib.PurePosixPath(info.filename)
  mode=info.external_attr>>16
  assert not parts.is_absolute() and '..' not in parts.parts and not stat.S_ISLNK(mode),'Unsafe archive member'
  target=pathlib.Path(p['destination'])/parts
  target.parent.mkdir(parents=True,exist_ok=True)
  target.write_bytes(z.read(info.filename))
  target.chmod((mode & 0o777) or 0o644)
 launcher=pathlib.Path(p['destination'])/prefix/'启动头像工具.command'
 assert launcher.stat().st_mode & 0o111,'Launcher lost executable mode'
print(json.dumps({'kind':p['kind'],'files':len(names),'checksums':True,'launcherExecutable':True}))
`;
    const checked=JSON.parse(execFileSync('python3',['-c',python],{input:JSON.stringify({kind,archive,destination,files}),encoding:'utf8'}));
    const extracted=join(destination,'GrokBotAvatarTool');
    inspectPublicFiles(extracted,files.map(name=>({source:name,destination:name})));
    let node=process.execPath;
    if(kind==='macOS-arm64'){
      const runtime=JSON.parse(readFileSync(join(extracted,'runtime-node/runtime.json')));
      const lock=JSON.parse(readFileSync(join(extracted,'runtime-bean/node-runtime.lock.json')));
      assert.equal(runtime.version,lock.version);assert.equal(runtime.sha256,lock.sha256);
      const bundled=join(extracted,'runtime-node/bin/node');
      assert.equal(createHash('sha256').update(readFileSync(bundled)).digest('hex'),runtime.nodeSHA256);
      if(process.platform==='darwin'&&process.arch==='arm64'){
        execFileSync('/usr/bin/codesign',['--verify','--strict',bundled],{stdio:'pipe'});
        assert.equal(execFileSync(bundled,['--version'],{encoding:'utf8'}).trim(),'v'+runtime.version);
        node=bundled;checked.bundledNodeExecuted=true;
      }else checked.bundledNodeExecuted=false;
    }
    execFileSync(node,['runtime-bean/verify-public.mjs'],{cwd:extracted,stdio:'pipe'});
    const help=execFileSync(node,['runtime-bean/tool.mjs','--help'],{cwd:extracted,encoding:'utf8'});
    assert(help.includes(version),'Launcher help differs from package version');
    archiveReport.push({...checked,portableSuiteOnExtractedFiles:true,launcherHelp:true,bytes:readFileSync(archive).length,sha256:archiveHash});
  }
  console.log(JSON.stringify({passed:true,version,archives:archiveReport},null,2));
}finally{
  rmSync(scratch,{recursive:true,force:true});
}
