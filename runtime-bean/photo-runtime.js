// Whole-photo card motion only: the source image is never redrawn or deformed.
// Injected into the pinned app module, alongside its React X and layout helpers.
const avatarPhotoRestSnapshot=Object.freeze({gaze:null,bounces:0});
function createPhotoMotionStore(clock=()=>Date.now()) {
  const channels=new Map();
  const publish=entry=>{for(const listener of [...entry.listeners])listener()};
  const normalized=gaze=>Array.isArray(gaze)&&gaze.length===2&&gaze.every(Number.isFinite)
    ?Object.freeze(gaze.map(value=>Math.round(Math.max(-1,Math.min(1,value))*1000)/1000)):null;
  return {
    getSnapshot:key=>channels.get(key)?.snapshot??avatarPhotoRestSnapshot,
    subscribe(key,listener){
      let entry=channels.get(key);
      if(!entry){entry={snapshot:avatarPhotoRestSnapshot,listeners:new Set(),completionKey:null,lastPokeAt:-Infinity};channels.set(key,entry)}
      entry.listeners.add(listener);
      return()=>{entry.listeners.delete(listener);if(!entry.listeners.size&&channels.get(key)===entry)channels.delete(key)};
    },
    gaze(key,value){
      const entry=channels.get(key);if(!entry)return false;
      const gaze=normalized(value),previous=entry.snapshot.gaze;
      if(gaze===previous||(gaze&&previous&&gaze[0]===previous[0]&&gaze[1]===previous[1]))return false;
      entry.snapshot=Object.freeze({...entry.snapshot,gaze});publish(entry);return true;
    },
    poke(key,kind,completionKey=null){
      const entry=channels.get(key);
      if(!entry||!['nod','bounce'].includes(kind))return false;
      const now=clock();
      // A completion is seen by the hidden source and each visible mark. One
      // shared signal prevents those separate native handles from multiplying it.
      if(completionKey!=null){
        if(entry.completionKey===completionKey)return false;
        entry.completionKey=completionKey;
      }else if(now-entry.lastPokeAt<250)return false;
      entry.lastPokeAt=now;
      entry.snapshot=Object.freeze({...entry.snapshot,bounces:entry.snapshot.bounces+1});publish(entry);return true;
    },
    size:()=>channels.size,
  };
}
const avatarPhotoMotion=createPhotoMotionStore();
function avatarPhotoPose(gaze,reduced=false){
  const valid=Array.isArray(gaze)&&gaze.length===2&&gaze.every(Number.isFinite);
  const clamp=value=>Math.max(-1,Math.min(1,value));
  const x=reduced?0:valid?-6*clamp(gaze[1]):6;
  const y=reduced?0:valid?6*clamp(gaze[0]):-10;
  const z=reduced||valid?0:-6,scale=1;
  return {x,y,z,scale,transform:`rotateX(${x}deg) rotateY(${y}deg) rotateZ(${z}deg) scale(${scale})`};
}
const avatarPhotoWorkingStates=new Set(['thinking','streaming','searching','reading','working','coding','running','computing','controlling','writing','sending','receiving','uploading','progress','spawning','loading','dictating','orbit','radar']);
function avatarPhotoActivity(state){
  if(avatarPhotoWorkingStates.has(state))return 'working';
  if(state==='finished'||state==='happy')return 'finished';
  if(state==='blocked'||state==='failed')return 'blocked';
  return state==='waiting'?'waiting':'idle';
}
const avatarPhotoCSS=`
.avatar-photo-root{position:relative;display:inline-block;flex:none;vertical-align:middle;overflow:hidden;border-radius:22%;padding:0;background:transparent;box-shadow:none;isolation:isolate;perspective:220px}
.avatar-photo-gaze{position:absolute;inset:0;transform-origin:50% 50%;transition:transform 420ms cubic-bezier(.2,.8,.2,1);transform-style:preserve-3d}
.avatar-photo-bounce{position:absolute;inset:0;transform-origin:50% 70%}
.avatar-photo-bounce-active{animation:avatar-photo-complete 640ms cubic-bezier(.2,.75,.25,1) both}
.avatar-photo-frame{position:absolute;inset:0;overflow:hidden;border-radius:22%}
.avatar-photo-image{display:block;width:100%;height:100%;object-fit:cover;user-select:none;-webkit-user-drag:none}
.avatar-photo-light{position:absolute;inset:0;border-radius:22%;pointer-events:none;opacity:0;box-shadow:inset 0 0 0 1px #78e6ef,0 0 3px #55dae966;transition:opacity 220ms ease}
.avatar-photo-root[data-photo-activity="working"] .avatar-photo-light{opacity:.7;animation:avatar-photo-work 1600ms ease-in-out infinite}
.avatar-photo-root[data-photo-activity="finished"] .avatar-photo-light{opacity:.75;box-shadow:inset 0 0 0 1px #a6d9a5,0 0 3px #9bd78c55}
.avatar-photo-root[data-photo-activity="waiting"] .avatar-photo-light{opacity:.55;box-shadow:inset 0 0 0 1px #b5a2df}
.avatar-photo-root[data-photo-activity="blocked"] .avatar-photo-light{opacity:.65;box-shadow:inset 0 0 0 1px #e4bc83}
@keyframes avatar-photo-work{0%,100%{opacity:.38}50%{opacity:.88}}
@keyframes avatar-photo-complete{0%,100%{transform:translateY(0) scale(1)}32%{transform:translateY(-4%) scale(1.015)}64%{transform:translateY(1%) scale(.995)}}
@media(prefers-reduced-motion:reduce){.avatar-photo-gaze{transform:none!important;transition:none}.avatar-photo-bounce-active,.avatar-photo-light{animation:none!important;transition:none}.avatar-photo-root[data-photo-activity="working"] .avatar-photo-light{opacity:.65}}
`;
function avatarPhotoEnsureStyle(){
  if(typeof document==='undefined'||document.getElementById('avatar-photo-motion-style'))return;
  const style=document.createElement('style');style.id='avatar-photo-motion-style';style.textContent=avatarPhotoCSS;document.head.append(style);
}
function AvatarPhotoMark(props){
  const instance=X.useId(),key=props.avatarBotId??'photo-preview:'+instance;
  const subscribe=X.useCallback(listener=>avatarPhotoMotion.subscribe(key,listener),[key]);
  const getSnapshot=X.useCallback(()=>avatarPhotoMotion.getSnapshot(key),[key]);
  const motion=X.useSyncExternalStore(subscribe,getSnapshot,()=>avatarPhotoRestSnapshot);
  const latest=X.useRef(props);latest.current=props;
  const stage=X.useContext(AO);
  // Visible FO marks bypass the vendor mirror, but must still claim the shared
  // native source for activity observation and the sidebar's gaze dispatch.
  X.useEffect(()=>props.avatarBotId&&!props.sourceId?stage?.claimMark(props.avatarBotId):undefined,[stage,props.avatarBotId,props.sourceId]);
  X.useEffect(avatarPhotoEnsureStyle,[]);
  const handle=X.useMemo(()=>({
    gaze:value=>avatarPhotoMotion.gaze(key,value),
    setGaze:value=>avatarPhotoMotion.gaze(key,value),
    poke:kind=>avatarPhotoMotion.poke(key,kind,latest.current.avatarCompletionKey),
    setExpression:()=>{},clearExpression:()=>{},
  }),[key]);
  X.useImperativeHandle(props.ref,()=>handle,[handle]);
  const seenBounce=X.useRef(motion.bounces),[bounceCount,setBounceCount]=X.useState(0);
  X.useEffect(()=>{
    if(seenBounce.current===motion.bounces)return;
    seenBounce.current=motion.bounces;setBounceCount(value=>value+1);
  },[motion.bounces]);
  const pointerMove=X.useCallback(event=>{
    const node=event.currentTarget,rect=node.getBoundingClientRect();
    node.dataset.photoPointerTrusted=String(event.nativeEvent?.isTrusted??event.isTrusted??false);
    node.dataset.photoPointerButtons=String(event.buttons??0);
    const half=Math.max(rect.width,1)*.5;
    avatarPhotoMotion.gaze(key,[(event.clientX-rect.left-rect.width*.5)/half,-(event.clientY-rect.top-rect.height*.5)/half]);
  },[key]);
  const pointerLeave=X.useCallback(event=>{
    event.currentTarget.dataset.photoPointerTrusted=String(event.nativeEvent?.isTrusted??event.isTrusted??false);
    event.currentTarget.dataset.photoPointerButtons=String(event.buttons??0);
    avatarPhotoMotion.gaze(key,null);
  },[key]);
  const pose=avatarPhotoPose(motion.gaze),activity=avatarPhotoActivity(props.state??'idle');
  const layout=oo(fT.root,props.style),style=mT(props,props.color??'cyan',props.ink,props.eyeColor,layout.style);
  const el=X.createElement;
  return el('span',{
    'aria-hidden':true,className:['sand-grok-bot-mark','avatar-photo-root',layout.className,props.className].filter(Boolean).join(' '),
    'data-avatar-photo':props.shape,'data-photo-state':props.state??'idle','data-photo-activity':activity,
    'data-photo-gaze':motion.gaze?motion.gaze.join(','):'rest','data-photo-phase':!motion.gaze?'rest':motion.gaze.every(value=>value===0)?'front':'look',
    'data-photo-bounces':bounceCount,'data-photo-source':props.sourceId?'true':'false',
    onPointerMove:props.sourceId?undefined:pointerMove,onPointerLeave:props.sourceId?undefined:pointerLeave,
    style:{...style,pointerEvents:props.sourceId?'none':'auto'},
  },el('span',{className:'avatar-photo-gaze',style:{transform:pose.transform}},
    el('span',{key:bounceCount,className:'avatar-photo-bounce'+(bounceCount?' avatar-photo-bounce-active':'')},
      el('span',{className:'avatar-photo-frame'},el('img',{className:'avatar-photo-image',src:avatarPhotoImages[props.shape],alt:'',draggable:false,decoding:'async'})),
      el('span',{className:'avatar-photo-light'}))),props.children);
}
