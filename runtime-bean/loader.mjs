import {CDP,target} from './cdp.mjs';
import {preflight,build,sha,asarPath,appearanceFor} from './patch.mjs';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {parseArgs} from 'node:util';
import {avatarChoice as libraryCharacter} from './avatar-catalog.mjs';
import {readConfig,writeConfig} from './config.mjs';
import {botIdPattern} from './library-state.mjs';

const {values}=parseArgs({options:{'bot-id':{type:'string'},shape:{type:'string',default:'apricotBean'},library:{type:'boolean',default:false},audit:{type:'boolean',default:false},demo:{type:'boolean',default:false},'no-reload':{type:'boolean',default:false}}});
// Library mode reads every Bot's assignment from config.local.json; legacy modes target one Bot.
const library=values.library||values.shape.startsWith('robot_')||values.shape.startsWith('photo_');
const shape=library?undefined:values.shape,appearance=library?{name:'头像库'}:appearanceFor(shape);
const id=library?undefined:values['bot-id'];
if(!library&&!id)throw Error('Usage: node loader.mjs --bot-id YOUR_UUID [--audit] | --library');
let config=library?readConfig():null;
const checked=preflight();
const adapted=build(checked.archive,id,{audit:values.audit,demo:values.demo,library,shape,assignments:config?.assignments});
const {patched,changes}=adapted;let {hashes}=adapted;
checked.archive=null;
const page=await target();
// Refuse a listener that belongs to another executable or is reachable remotely.
const listeners=execFileSync('/usr/sbin/lsof',['-nP','-iTCP:19223','-sTCP:LISTEN','-Fpn'],{encoding:'utf8'}).trim().split('\n');
const pids=[...new Set(listeners.filter(l=>l.startsWith('p')).map(l=>l.slice(1)))];
const addresses=listeners.filter(l=>l.startsWith('n')).map(l=>l.slice(1));
if(pids.length!==1||addresses.some(a=>a!=='127.0.0.1:19223'))throw Error('Unexpected CDP listener ownership or binding');
const command=execFileSync('/bin/ps',['-p',pids[0],'-o','command='],{encoding:'utf8'}).trim();
if(!command.startsWith('/Applications/Grok Bot.app/Contents/MacOS/Grok Bot ')||!command.includes('--remote-debugging-port=19223'))throw Error('Listener is not the expected official Grok Bot');

const c=new CDP(page.webSocketDebuggerUrl), served=[];
const evidence=new URL('./evidence/',import.meta.url);mkdirSync(evidence,{recursive:true});
let stopping=false,loaded=false;
const report={startedAt:new Date().toISOString(),method:'CDP Fetch in-memory replacement',shape,avatarName:appearance.name,officialAsarSHA256:checked.officialHash,officialSignatureVerified:true,targetBotId:id??null,assignedBots:library?Object.keys(config.assignments).length:null,botWrites:false,audit:values.audit,appearanceDemo:values.demo,library,changes,hashes,served,loaded:false};
const save=()=>writeFileSync(new URL('runtime-session.json',evidence),JSON.stringify(report,null,2)+'\n');
c.on('Fetch.requestPaused',async p=>{
  const name=decodeURI(p.request.url).split('/').at(-1);
  const expected=`file:///Applications/Grok Bot.app/Contents/Resources/app.asar/dist/renderer/assets/${name}`;
  if(!patched[name]||decodeURI(p.request.url)!==expected){await c.call('Fetch.continueRequest',{requestId:p.requestId});return;}
  try{
    await c.call('Fetch.fulfillRequest',{requestId:p.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'text/javascript; charset=utf-8'},{name:'Cache-Control',value:'no-store'}],body:Buffer.from(patched[name]).toString('base64')});
    served.push({name,at:new Date().toISOString(),sha256:hashes[name]});save();console.log('Loaded in memory:',name);
  }catch(e){console.error('Avatar load failed:',e.message);await c.call('Fetch.continueRequest',{requestId:p.requestId}).catch(()=>{});}
});
c.on('Runtime.consoleAPICalled',p=>{
  if(library&&p.args?.[0]?.value==='[Avatar Runtime] selection'){
    // Page messages are untrusted input: accept only a Bot UUID plus a known character or null.
    const bot=p.args?.[1]?.value,selected=p.args?.[2]?.value??null;
    if(typeof bot==='string'&&botIdPattern.test(bot)&&(selected===null||libraryCharacter(selected))){
      try{
        config=readConfig();const assignments={...config.assignments};
        if(selected===null)delete assignments[bot];else assignments[bot]=selected;
        config={...config,assignments};writeConfig(config);
        hashes=adapted.withAssignments(assignments);
        Object.assign(report,{hashes,assignedBots:Object.keys(assignments).length,selectedShape:selected,selectedAt:new Date().toISOString()});save();
      }catch(error){console.error('Selection not saved:',error.message)}
    }
  }
  if(p.args?.[0]?.value===`[Apricot Runtime] native avatar adapter ${checked.version} loaded`){
    loaded=true;report.loaded=true;report.loadedAt=new Date().toISOString();save();console.log('ACTIVE: original Grok Bot + runtime '+appearance.name);
  }
});
await c.call('Runtime.enable');
await c.call('Fetch.enable',{patterns:Object.keys(patched).map(name=>({urlPattern:'file://*/assets/'+name,requestStage:'Request'}))});
save();console.log('Runtime adapter ready; app bundle untouched.');
if(!values['no-reload'])await c.call('Page.reload',{ignoreCache:true});
async function stop(){
  if(stopping)return;stopping=true;
  if(c.ws.readyState===WebSocket.OPEN)await c.call('Fetch.disable').catch(()=>{});
  report.stoppedAt=new Date().toISOString();report.officialAsarUnchanged=sha(readFileSync(asarPath))===checked.officialHash;save();c.close();process.exit(0);
}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
c.ws.addEventListener('close',()=>{if(!stopping)stop();});
setTimeout(()=>{if(!loaded)console.error('No success marker yet. Inspect the window; do not claim success.');},15000).unref();
