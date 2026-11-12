// Single public entry. All app changes still go through the pinned runtime loader.
import {parseArgs} from 'node:util';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {execFileSync,spawn} from 'node:child_process';
import {preflight,build,checkBuiltModules,verifiedVersions} from './patch.mjs';
import {readConfig} from './config.mjs';
import {bots} from './bots.mjs';
import {serveSetup} from './setup-server.mjs';
import {target} from './cdp.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const toolVersion=JSON.parse(readFileSync(new URL('../package.json',import.meta.url))).version;
const {values}=parseArgs({options:{configure:{type:'boolean'},demo:{type:'boolean'},audit:{type:'boolean'},'no-open':{type:'boolean'},help:{type:'boolean'},check:{type:'boolean'}}});
if(values.help){console.log('头像工具 1.5.0\n双击启动头像工具.command。每个 Bot 都可在详情里点击头像选择动态角色或写真头像。\n--check 只检查客户端头像兼容性，不启动或修改配置\n--configure 打开启动页面\n--demo 开启外观演示\n--audit 开启开发验收');process.exit(0)}
function friendly(error){
  const message=error.message??String(error);
  if(/Please quit Grok Bot/.test(message))return 'Grok Bot 还在运行。请先 Command-Q 完全退出，再点“启动 Grok Bot”。';
  const specific={
    APP_NOT_FOUND:'未找到可读取的官方客户端。请将 Grok Bot 安装到 Applications。',
    APP_ARCHITECTURE:'当前工具仅支持 macOS Apple Silicon（M 系列芯片）。',
    APP_IDENTITY:'安装的应用身份与官方 Grok Bot 不一致，未加载头像。',
    APP_SIGNATURE:'官方客户端签名检查未通过，未加载头像。请检查安装来源与更新是否完整。',
    APP_INTEGRITY:'客户端文件完整性检查未通过，未加载头像。请确认官方更新已完成。',
    AVATAR_INTERFACE_CHANGED:'客户端的头像相关代码或依赖无法匹配已验证适配器，暂未加载头像。请检查工具更新；这不是仅由版本号变化引起的。',
    AVATAR_PATCH_INVALID:'头像接入代码检查未通过，未加载头像。请检查工具更新。',
  };
  if(specific[error.code])return specific[error.code]+(error.reason?'（检查项：'+error.reason+'）':'');
  return message;
}
function start(){return new Promise((resolve,reject)=>{
  const args=[fileURLToPath(new URL('./start.mjs',import.meta.url)),'--library'];if(values.demo)args.push('--demo');if(values.audit)args.push('--audit');
  const child=spawn(process.execPath,args,{cwd:root,stdio:['ignore','pipe','pipe']});let output='';child.stdout.on('data',chunk=>{output+=chunk;process.stdout.write(chunk)});child.stderr.on('data',chunk=>{output+=chunk});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error(friendly(Error(output)))));
})}
async function alreadyActive(checked){
  try{const report=JSON.parse(readFileSync(new URL('./evidence/runtime-session.json',import.meta.url)));const state=JSON.parse(readFileSync(new URL('./evidence/launcher-state.json',import.meta.url)));if(!report.loaded||report.stoppedAt||!report.library||report.toolVersion!==toolVersion||report.appVersion!==checked.version||report.adapterVersion!==checked.adapterVersion||report.officialAsarSHA256!==checked.officialHash)return false;const cmd=execFileSync('/bin/ps',['-p',String(state.pid),'-o','command='],{encoding:'utf8'});if(!cmd.includes(fileURLToPath(new URL('./loader.mjs',import.meta.url))))return false;await target();execFileSync('/usr/bin/open',['-a','/Applications/Grok Bot.app']);return true}catch{return false}
}
const ready='已就绪：打开任意 Bot → 对话详情 → 点击头像 → 原创动态头像 / 写真头像。';
try{
  const checked=preflight();
  if(values.check){
    checkBuiltModules(build(checked.archive,undefined,{library:true,assignments:{},includePickerImages:false}));
    console.log(JSON.stringify({compatible:true,appVersion:checked.version,adapterVersion:checked.adapterVersion,mode:checked.compatibilityMode,checks:[...checked.compatibilityChecks,'patch-anchors','module-syntax'],officialSignatureVerified:true,appIntegrityVerified:true,reviewedAdapters:verifiedVersions},null,2));
    process.exit(0);
  }
  console.log(`头像兼容检查通过：Grok Bot ${checked.version}，使用 ${checked.adapterVersion} 适配器。`);
  readConfig();
  let available=[];try{available=bots()}catch{}
  if(!values.configure&&await alreadyActive(checked)){console.log('头像工具已在运行。打开任意 Bot 详情，点击头像选择款式。');process.exit(0)}
  if(!values.configure){
    try{await start();console.log(ready);process.exit(0)}catch(error){if(!/Grok Bot 还在运行/.test(friendly(error)))throw error}
  }
  const setup=await serveSetup({botCount:available.length,onListen:url=>{console.log('SETUP_URL='+url);if(!values['no-open'])execFileSync('/usr/bin/open',[url])},onStart:start});
  await setup.result;console.log(ready+'\n以后双击同一个启动头像工具.command 即可。');
}catch(error){console.error('\n头像工具未启动：'+friendly(error));process.exitCode=1}
