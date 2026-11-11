// Loaded inside the hash-pinned app module, with its original React namespace X.
// X is bound later in module evaluation, so nothing here calls it at top level.
const avatarCharacters=__LIBRARY_CHARACTERS__;
const avatarColors=__LIBRARY_COLORS__;
const avatarPhotoImages=__PHOTO_IMAGES__;
const avatarPhotoCharacters=avatarCharacters.filter(item=>item.kind==='photo');
const avatarIsPhoto=shape=>Object.hasOwn(avatarPhotoImages,shape??'');
const avatarStore=createLibraryStore(__AVATAR_INITIAL_ASSIGNMENTS__,avatarCharacters.map(item=>item.shape));
const avatarGate=createNeonCompletionGate(),avatarHistory=[];
const avatarRuntime={store:avatarStore,history:avatarHistory};
globalThis.__grokAvatarLibrary=avatarRuntime;
globalThis.__grokNeonAvatar=avatarRuntime; // Same material clock/state for the existing neon renderer.
const avatarInactive=Object.freeze({id:null,shape:null,state:'idle',isDemo:false,completionKey:null});
const avatarGetInactive=()=>avatarInactive,avatarGetNull=()=>null;
avatarStore.subscribe(()=>{
  avatarHistory.push({at:new Date().toISOString(),...avatarStore.getSnapshot()});
  if(avatarHistory.length>120)avatarHistory.shift();
});
const avatarIsLibraryShape=shape=>avatarCharacters.some(item=>item.shape===shape);
function avatarChoiceFor(id){return avatarStore.shapeFor(id)}
function avatarShapeFor(id){const choice=avatarChoiceFor(id);return avatarIsPhoto(choice)?undefined:choice}
function avatarPhotoFor(id){return avatarPhotoImages[avatarChoiceFor(id)]}
function avatarColorFor(id){return avatarColors[avatarStore.shapeFor(id)]??'cyan'}

// Bot identity for every mark rendered below a Bot-aware component.
let avatarBotContext=null;
const avatarContext=()=>avatarBotContext??=X.createContext(null);
// Wraps a vendor component that knows its Bot: re-renders it when that Bot's
// local assignment changes and exposes the Bot ID to nested marks.
function avatarBound(Inner,props,id,transform){
  const subscribed=typeof id==='string'?id:null;
  X.useSyncExternalStore(avatarStore.subscribe,subscribed?()=>avatarStore.shapeFor(subscribed)??null:avatarGetNull,avatarGetNull);
  const element=X.createElement(Inner,transform(props));
  return subscribed?X.createElement(avatarContext().Provider,{value:subscribed},element):element;
}
// Keeps object identity per (agent, character) so vendor memo caches still hit.
const avatarAgentCache=new WeakMap();
function beanLocalAgent(agent){
  const original=agent?.__avatarOriginal??agent,shape=avatarChoiceFor(original?.id);
  if(!shape||original.isGroup)return original;
  const cached=avatarAgentCache.get(original);
  if(cached?.shape===shape)return cached.value;
  const value=avatarIsPhoto(shape)
    ?{...original,__avatarOriginal:original,avatarDataUrl:avatarPhotoImages[shape],avatarVersion:void 0}
    :{...original,__avatarOriginal:original,avatarDataUrl:void 0,avatarVersion:void 0,avatarShape:shape,avatarColor:avatarColorFor(original.id)};
  avatarAgentCache.set(original,{shape,value});
  return value;
}
function avatarAgentProps(props){const agent=beanLocalAgent(props.agent);return agent===props.agent?props:{...props,agent}}
function avatarMarkProps(props){
  const choice=avatarChoiceFor(props.avatarKey);
  if(avatarIsPhoto(choice))return {...props,dataUrl:avatarPhotoImages[choice]};
  return choice?{...props,dataUrl:void 0,shape:choice}:props;
}
// Photos bypass FO's static fallback and shared SVG mirror, while retaining the
// original FO component for native characters and every unassigned Bot.
function avatarMarkEntry(props){
  const choice=avatarChoiceFor(props.avatarKey);
  return avatarIsPhoto(choice)
    ?X.createElement(hT,{shape:choice,color:props.color??avatarColorFor(props.avatarKey),sizePx:props.fillPx??PO[props.size??'md'],className:'sand-agent-avatar',style:props.style,state:props.state,ref:props.markRef})
    :X.createElement(FO$avatar,props);
}

function avatarObserveActual(agent,state){
  const id=agent.id,token=agent.lastTurnSettlement?.settledAtMs??null;
  X.useEffect(()=>{if(botIdPattern.test(id??''))avatarStore.setActual(id,state,token)},[id,state,token]);
}
// Native mark entry: resolves the live character and activity of its own Bot.
function avatarLibraryProps(props){
  const bot=X.useContext(avatarContext());
  const own=bot!=null&&(avatarIsLibraryShape(props.shape)||(props.sourceId!=null&&avatarIsPhoto(avatarChoiceFor(bot))));
  const snapshot=X.useSyncExternalStore(avatarStore.subscribe,own?()=>avatarStore.getBot(bot):avatarGetInactive,avatarGetInactive);
  const active=own&&snapshot.shape!=null;
  const engine=X.useRef(null),forward=props.ref;
  const ref=X.useCallback(value=>{engine.current=value;if(typeof forward==='function')forward(value);else if(forward!=null)forward.current=value},[forward]);
  X.useEffect(()=>{if(active)avatarGate(engine.current,snapshot)},[active,snapshot]);
  if(!active)return props;
  return {...props,shape:snapshot.shape,ref,state:snapshot.state,isPaused:snapshot.state==='idle',avatarBotId:bot,avatarCompletionKey:snapshot.completionKey};
}

// Development panel (--demo only). Character buttons act on the first assigned Bot.
function avatarMountLibrary(){
  if(!__LIBRARY_DEMO__||document.getElementById('avatar-library-panel'))return;
  const panel=document.createElement('section');panel.id='avatar-library-panel';panel.setAttribute('aria-label','机器人头像库');
  panel.style.cssText='position:fixed;right:'+(__LIBRARY_AUDIT__?'390':'24')+'px;bottom:24px;width:300px;max-height:calc(100vh - 64px);overflow:auto;z-index:2147482999;padding:18px;border-radius:18px;background:#172239;color:#e3f6fa;border:1px solid #42677e;box-shadow:0 8px 30px #0003;font:13px system-ui';
  const title=document.createElement('strong');title.textContent='原创头像库 · '+avatarCharacters.length+' 款';
  const note=document.createElement('p');note.textContent='本机外观演示；不发送消息、不运行 Bot 任务。演示状态作用于所有已设置头像的 Bot。';note.style.cssText='font-size:11px;line-height:1.7;color:#a0bccb';
  const status=document.createElement('p');status.setAttribute('aria-live','polite');status.style.cssText='color:#89f1ee;font-size:12px;line-height:1.7';
  const choices=document.createElement('div');choices.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:6px';
  const makeButton=label=>{const button=document.createElement('button');button.textContent=label;button.style.cssText='padding:8px 9px;border-radius:9px;border:1px solid #406779;background:#223c52;color:#dffbff;font:12px system-ui;cursor:pointer';return button};
  const demoBot=()=>Object.keys(avatarStore.getSnapshot().assignments)[0]??null;
  const characterButtons=[];
  if(__LIBRARY_UI__)for(const character of avatarCharacters){
    const button=makeButton(character.number+' '+character.name);button.setAttribute('aria-label','切换为'+character.name);
    button.onclick=()=>{const id=demoBot();if(!id)return;avatarStore.select(id,character.shape);console.info('[Avatar Runtime] selection',id,character.shape)};
    choices.append(button);characterButtons.push([button,character]);
  }
  const actions=document.createElement('div');actions.style.cssText='display:flex;flex-wrap:wrap;gap:8px;margin-top:14px';
  let timer=null;
  for(const [label,state] of [['演示工作状态','working'],['演示完成响应','finished'],['跟随实际状态',null]]){
    const button=makeButton(label);button.onclick=()=>{clearTimeout(timer);if(state===null){avatarStore.followActual();return}const next=avatarStore.preview(state);if(state==='finished')timer=setTimeout(()=>avatarStore.expirePreview(next.completionKey),4200)};actions.append(button);
  }
  const paint=()=>{
    const id=demoBot(),bot=id?avatarStore.getBot(id):null,character=avatarCharacters.find(item=>item.shape===bot?.shape),labels={idle:'闲置',working:'工作中',finished:'完成庆祝'};
    status.textContent=bot?character.name+' · '+(bot.isDemo?'本机演示':'实际状态')+' · '+(labels[bot.state]??bot.state):'还没有 Bot 设置原创头像。先在 Bot 详情里点击头像选择一款。';
    for(const [button,item] of characterButtons){const active=item.shape===bot?.shape;button.disabled=!bot;button.setAttribute('aria-pressed',String(active));button.style.background=active?'#366775':'#223c52'}
  };
  avatarStore.subscribe(paint);paint();panel.append(title,note,status,choices,actions);document.body.append(panel);
}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',avatarMountLibrary,{once:true});else avatarMountLibrary()}
