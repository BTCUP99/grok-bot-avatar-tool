// Starts the vendor-signed app and our external loader. Never changes the app bundle.
import {preflight,appearanceFor,build,checkBuiltModules} from './patch.mjs';
import {avatarChoices as libraryCharacters,avatarChoice as libraryCharacter} from './avatar-catalog.mjs';
import {bots} from './bots.mjs';
import {readConfig,writeConfig} from './config.mjs';
import {target} from './cdp.mjs';
import {parseArgs} from 'node:util';
import {execFileSync,spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {existsSync,mkdirSync,readFileSync,writeFileSync,openSync,closeSync} from 'node:fs';
const root=fileURLToPath(new URL('.',import.meta.url));
if(Number(process.versions.node.split('.')[0])<22)throw Error('Node.js 22 or newer is required.');
const {values}=parseArgs({options:{'bot-id':{type:'string'},'bot-name':{type:'string'},shape:{type:'string'},'list-bots':{type:'boolean'},'list-shapes':{type:'boolean'},library:{type:'boolean',default:false},audit:{type:'boolean',default:false},demo:{type:'boolean',default:false}}});
if(values['list-bots']){console.table(bots());process.exit(0);}
if(values['list-shapes']){console.table(libraryCharacters.map(({number,name,shape})=>({number,name,shape})));process.exit(0);}
const checked=preflight();
let id=values['bot-id'];
if(values['bot-name']){
  const matches=bots().filter(b=>b.name===values['bot-name']);
  if(matches.length!==1)throw Error(`Bot name matched ${matches.length} records; use --list-bots then --bot-id.`);
  id=matches[0].id;
}
let config=readConfig();
const library=values.library||Boolean(values.shape?.startsWith('robot_')||values.shape?.startsWith('photo_'));
const uuid=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
let shape,appearance;
if(library){
  // Every Bot can pick a character in its own avatar editor; no target Bot is needed.
  // An explicit --shape pre-assigns one Bot (from --bot-id/--bot-name, else the legacy botId).
  appearance={name:'头像库'};
  if(values.shape!==undefined){
    if(!libraryCharacter(values.shape))throw Error('--library requires a library character.');
    const target=id??config.botId;
    if(uuid.test(target??''))config={...config,assignments:{...config.assignments,[target]:values.shape}};
    else console.log('未指定 Bot，忽略 --shape；请在 Bot 详情里点击头像选择。');
  }else if(id)throw Error('--bot-id/--bot-name in library mode needs --shape.');
}else{
  if(!id)id=config.botId;
  shape=values.shape??config.shape??'apricotBean';appearance=appearanceFor(shape);
  if(values.demo&&shape!=='neonNight')throw Error('--demo is available for neonNight or library characters only.');
  if(!uuid.test(id??''))throw Error('First run: node start.mjs --bot-name "your test bot name"');
  config={...config,botId:id,shape};
}
// Validate the complete adaptation before opening or writing any configuration.
checkBuiltModules(build(checked.archive,library?undefined:id,{library,shape,assignments:library?config.assignments:undefined,demo:values.demo,audit:values.audit}));
const processes=execFileSync('/bin/ps',['-axo','command='],{encoding:'utf8'}).split('\n');
if(processes.some(p=>/^\/.*Grok Bot(?: Bean Test(?:-0\.78\.1)?)?\.app\/Contents\/MacOS\/Grok Bot(?: |$)/.test(p.trim())))throw Error('Please quit Grok Bot with Command-Q first; your drafts will not be forcibly closed.');
mkdirSync(new URL('./evidence/',import.meta.url),{recursive:true});
writeConfig(config);
execFileSync('/usr/bin/open',['-na','/Applications/Grok Bot.app','--args','--remote-debugging-address=127.0.0.1','--remote-debugging-port=19223']);
let ready=false,lastError;
for(let i=0;i<100;i++){try{await target();ready=true;break;}catch(e){lastError=e;await new Promise(r=>setTimeout(r,300));}}
if(!ready)throw Error(`Official window not available after 30s: ${lastError.message}`);
const log=openSync(new URL('./evidence/loader.log',import.meta.url),'a',0o600);
const args=[fileURLToPath(new URL('./loader.mjs',import.meta.url)),...(library?['--library']:['--bot-id',id,'--shape',shape])];if(values.audit)args.push('--audit');
if(values.demo)args.push('--demo');
const child=spawn(process.execPath,args,{cwd:root,detached:true,stdio:['ignore',log,log]});closeSync(log);child.unref();
const state={pid:child.pid,loader:args[0],startedAt:new Date().toISOString(),library,botId:library?null:id,shape:shape??null};
writeFileSync(new URL('./evidence/launcher-state.json',import.meta.url),JSON.stringify(state,null,2)+'\n',{mode:0o600});
let active=false;
for(let i=0;i<100;i++){
  try{const report=JSON.parse(readFileSync(new URL('./evidence/runtime-session.json',import.meta.url),'utf8'));if(report.loaded&&(library?report.library===true:report.shape===shape&&report.targetBotId===id)&&Date.parse(report.startedAt)>=Date.parse(state.startedAt)-1000){active=true;break;}}catch{}
  await new Promise(r=>setTimeout(r,200));
}
if(!active)throw Error('No runtime success marker; inspect evidence/loader.log. Avatar is not verified active.');
console.log(appearance.name+'已通过运行时加载。官方程序包及签名保持原样。');
console.log(library?'每个 Bot 都可在详情里点击头像选择原创头像。关闭 Grok Bot 后加载器会自行退出。':'关闭 Grok Bot 后加载器会自行退出。下次通过对应头像启动器启动。');
