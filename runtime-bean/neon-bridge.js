// App-module bridge. React X is imported by the hash-checked vendor module.
const neonAvatarStore=createNeonAvatarStore();
const neonCompletionGate=createNeonCompletionGate();
const neonAvatarHistory=[];
globalThis.__grokNeonAvatar={store:neonAvatarStore,history:neonAvatarHistory};
const neonNoSubscribe=()=>()=>{};
const neonInactiveSnapshot=Object.freeze({state:'idle',actualState:'idle',isDemo:false,completionKey:null,revision:0});
const neonGetInactive=()=>neonInactiveSnapshot;
neonAvatarStore.subscribe(()=>{
  const s=neonAvatarStore.getSnapshot();
  neonAvatarHistory.push({at:new Date().toISOString(),...s});
  if(neonAvatarHistory.length>120)neonAvatarHistory.shift();
});

function neonObserveActual(agent,state) {
  const id=agent.id,completionToken=agent.lastTurnSettlement?.settledAtMs??null;
  X.useEffect(()=>{
    if(id==='__TARGET_BOT_ID__')neonAvatarStore.setActual(state,completionToken);
  },[id,state,completionToken]);
}

function neonAvatarProps(props) {
  // Hooks are unconditional, including when a component changes to another Bot.
  const own=props.shape==='neonNight';
  const snapshot=X.useSyncExternalStore(own?neonAvatarStore.subscribe:neonNoSubscribe,own?neonAvatarStore.getSnapshot:neonGetInactive,neonGetInactive);
  const engine=X.useRef(null),forward=props.ref;
  const ref=X.useCallback(value=>{
    engine.current=value;
    if(typeof forward==='function')forward(value);else if(forward!=null)forward.current=value;
  },[forward]);
  X.useEffect(()=>{
    if(own)neonCompletionGate(engine.current,snapshot);
  },[own,snapshot]);
  if(!own)return props;
  return {...props,ref,state:snapshot.state,isPaused:snapshot.state==='idle'};
}

function neonMountPreview() {
  if(!__NEON_DEMO__||document.getElementById('neon-avatar-preview'))return;
  const panel=document.createElement('section');
  panel.id='neon-avatar-preview';panel.setAttribute('aria-label','霓虹夜行本机效果演示');
  panel.style.cssText='position:fixed;right:'+(__NEON_AUDIT__?'390':'24')+'px;bottom:24px;width:300px;z-index:2147482999;padding:18px;border-radius:18px;background:#172239;color:#e3f6fa;border:1px solid #42677e;box-shadow:0 8px 30px #0003;font:13px system-ui';
  const title=document.createElement('strong');title.textContent='霓虹夜行 · 本机效果演示';
  const note=document.createElement('p');note.textContent='只预览头像，不发送消息或运行 Bot 任务。';note.style.cssText='font-size:11px;line-height:1.7;color:#a0bccb';
  const status=document.createElement('p');status.setAttribute('aria-live','polite');status.style.cssText='color:#89f1ee;font-size:12px';
  const buttons=document.createElement('div');buttons.style.cssText='display:flex;flex-wrap:wrap;gap:8px';
  let resetTimer=null;
  for(const [label,action] of [['演示工作状态','working'],['演示完成响应','finished'],['跟随实际状态',null]]){
    const button=document.createElement('button');button.textContent=label;
    button.style.cssText='padding:8px 10px;border-radius:10px;border:1px solid #406779;background:#223c52;color:#dffbff;font:12px system-ui;cursor:pointer';
    button.onclick=()=>{
      clearTimeout(resetTimer);
      const snapshot=action===null?neonAvatarStore.followActual():neonAvatarStore.preview(action);
      if(action==='finished')resetTimer=setTimeout(()=>neonAvatarStore.expirePreview(snapshot.completionKey),4200);
    };
    buttons.append(button);
  }
  const paint=()=>{
    const s=neonAvatarStore.getSnapshot();
    const labels={idle:'闲置',working:'工作中',finished:'完成庆祝'};
    status.textContent=(s.isDemo?'本机演示':'跟随实际状态')+' · '+(labels[s.state]??s.state);
    panel.setAttribute('data-neon-state',s.state);panel.setAttribute('data-neon-demo',String(s.isDemo));
  };
  neonAvatarStore.subscribe(paint);paint();panel.append(title,note,status,buttons);document.body.append(panel);
}
if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',neonMountPreview,{once:true});else neonMountPreview();
}
