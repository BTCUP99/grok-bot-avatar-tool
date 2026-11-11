// Single public entry. All app changes still go through the pinned runtime loader.
import {parseArgs} from 'node:util';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {execFileSync,spawn} from 'node:child_process';
import {preflight,supportedVersions} from './patch.mjs';
import {readConfig} from './config.mjs';
import {bots} from './bots.mjs';
import {serveSetup} from './setup-server.mjs';
import {target} from './cdp.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const {values}=parseArgs({options:{configure:{type:'boolean'},demo:{type:'boolean'},audit:{type:'boolean'},'no-open':{type:'boolean'},help:{type:'boolean'}}});
if(values.help){console.log('头像工具 1.4.3\n双击启动头像工具.command。每个 Bot 都可在详情里点击头像选择动态角色或写真头像。\n--configure 打开启动页面\n--demo 开启外观演示\n--audit 开启开发验收');process.exit(0)}
function friendly(error){const message=error.message??String(error);if(/Please quit Grok Bot/.test(message))return 'Grok Bot 还在运行。请先 Command-Q 完全退出，再点“启动 Grok Bot”。';if(/Only macOS Apple Silicon|Unsupported app identity|App differs|ASAR integrity|Source hash/.test(message))return `当前 Grok Bot 版本或签名与工具不匹配。请使用 Grok Bot ${supportedVersions.join(' 或 ')} 的 Apple Silicon 版本。`;return message}
function start(){return new Promise((resolve,reject)=>{
  const args=[fileURLToPath(new URL('./start.mjs',import.meta.url)),'--library'];if(values.demo)args.push('--demo');if(values.audit)args.push('--audit');
  const child=spawn(process.execPath,args,{cwd:root,stdio:['ignore','pipe','pipe']});let output='';child.stdout.on('data',chunk=>{output+=chunk;process.stdout.write(chunk)});child.stderr.on('data',chunk=>{output+=chunk});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error(friendly(Error(output)))));
})}
async function alreadyActive(){
  try{const report=JSON.parse(readFileSync(new URL('./evidence/runtime-session.json',import.meta.url)));const state=JSON.parse(readFileSync(new URL('./evidence/launcher-state.json',import.meta.url)));if(!report.loaded||report.stoppedAt||!report.library)return false;const cmd=execFileSync('/bin/ps',['-p',String(state.pid),'-o','command='],{encoding:'utf8'});if(!cmd.includes(fileURLToPath(new URL('./loader.mjs',import.meta.url))))return false;await target();execFileSync('/usr/bin/open',['-a','/Applications/Grok Bot.app']);return true}catch{return false}
}
const ready='已就绪：打开任意 Bot → 对话详情 → 点击头像 → 原创动态头像 / 写真头像。';
try{
  preflight();readConfig();
  let available=[];try{available=bots()}catch{}
  if(!values.configure&&await alreadyActive()){console.log('头像工具已在运行。打开任意 Bot 详情，点击头像选择款式。');process.exit(0)}
  if(!values.configure){
    try{await start();console.log(ready);process.exit(0)}catch(error){if(!/Grok Bot 还在运行/.test(friendly(error)))throw error}
  }
  const setup=await serveSetup({botCount:available.length,onListen:url=>{console.log('SETUP_URL='+url);if(!values['no-open'])execFileSync('/usr/bin/open',[url])},onStart:start});
  await setup.result;console.log(ready+'\n以后双击同一个启动头像工具.command 即可。');
}catch(error){console.error('\n头像工具未启动：'+friendly(error));process.exitCode=1}
