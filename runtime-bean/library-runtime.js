// Extends original catalog designs with projected, character-specific lamps.
const libraryMeta=__LIBRARY_CHARACTERS__;
const libraryNeonRenderer=neonNativeSvg;
neonNativeSvg=function(frame,...args){const svg=libraryNeonRenderer(frame,...args);Object.assign(svg.attrs,{'data-avatar-native':'1','data-avatar-shape':'neonNight'});return svg};
const libraryEngineFactory=eo;
eo=function(options={}){
  const engine=libraryEngineFactory(options);
  if(!options.body?.startsWith('robot_'))return engine;
  let clock=0,lastGesture=null,nods=0;
  const advance=engine.advance,frame=engine.frame,poke=engine.poke;
  engine.advance=dt=>{advance(dt);if(Number.isFinite(dt)&&dt>0)clock+=Math.min(dt,.1)};
  engine.poke=(name,options)=>{poke(name,options);lastGesture={name,at:clock};if(name==='nod')nods++};
  engine.frame=()=>{
    const value=frame();
    // Per-player state (each Bot's own mark) when the player provides it; shared store otherwise.
    const state=globalThis.__grokAvatarLibrary?.store.getSnapshot();
    return {...value,neonClock:clock,neonState:options.avatarState?.()??state?.state??'idle',neonExpression:engine.face,neonDemo:state?.isDemo??false,neonGesture:lastGesture&&clock-lastGesture.at<.5?lastGesture.name:'',neonNods:nods};
  };
  return engine;
};

function libraryLampLoops(meta) {
  const [x,y]=meta.position;
  switch(meta.light){
    case 'bars':return [-.07,0,.07].map(dx=>robotRound(x+dx,y,.035,.10,.012));
    case 'battery':return [-.075,0,.075].map(dx=>robotRound(x+dx,y,.047,.047,.006));
    case 'bubbles':return [robotOval(x,y,.062),robotOval(x-.12,y+.06,.025)];
    case 'diamond':return [robotPoly([[x,y+.08],[x+.055,y],[x,y-.08],[x-.055,y]])];
    case 'star':return [robotStar(x,y,.12)];
    case 'seeds':return [-.12,0,.12].map((dx,i)=>robotOval(x+dx,y+(i===1?-.02:.01),.027));
    case 'dial':return [robotOval(x,y,.056)];
    case 'slashes':return [0,.085].map(dx=>robotPoly([[x+dx-.08,y-.05],[x+dx-.04,y-.05],[x+dx+.06,y+.06],[x+dx+.02,y+.06]]));
    default:return [robotOval(x,y,.045)];
  }
}

function libraryTag(svg,frame,kind){
  neonTag(svg,frame,kind);
  delete svg.attrs['data-neon-native'];
  Object.assign(svg.attrs,{'data-avatar-native':'1','data-avatar-shape':frame.body});
  return svg;
}

function libraryNativeSvg(frame,appearance,size,id,options={}) {
  const meta=libraryMeta.find(item=>item.shape===frame.body);
  const design=robotCatalog.find(item=>'robot_'+item.key===frame.body);
  if(!meta||!design)throw Error('Unregistered library character');
  const lamp=neonLamp(frame),color=lamp.state==='idle'?meta.color:lamp.color;
  if(frame.bodies.length!==1||frame.morph!=null){
    const svg=Hg(frame,{...appearance,cutout:false,inkPaint:design.eye,spotPaint:design.colors[0]},size,id,options.displaySize??size,options.extent);
    svg.children.push(Y('circle',{cx:size*.5,cy:size*.17,r:size*.018,fill:color,opacity:lamp.level}));
    return libraryTag(svg,frame,'native-morph');
  }
  const svg=robotNativeSvg(frame,appearance,size,id,options);
  const shape=robotInspectShape(frame,appearance,size,options),r=shape.sprite;
  const defs=svg.children[0],group=svg.children[1];
  const loops=libraryLampLoops(meta);
  const lamps=loops.flatMap((loop,i)=>tl(dc(frame.body),jp(frame,size),r,{loops:[loop],shiftY:0}).map(projected=>Y('path',{d:nu([projected]),fill:color,opacity:lamp.working?Math.max(.4,lamp.level-i*.065):1})));
  group.children.push(Y('g',{'clip-path':`url(#${id}-shell)`},lamps));
  if(meta.glow&&(options.displaySize??size)>=48){
    defs.children.push(Y('filter',{id:id+'-lamp-glow',x:'-50%',y:'-50%',width:'200%',height:'200%'},[Y('feGaussianBlur',{stdDeviation:r*.009})]));
    group.children.push(Y('g',{filter:`url(#${id}-lamp-glow)`,'clip-path':`url(#${id}-shell)`,opacity:.30},lamps));
  }
  return libraryTag(svg,frame,'solid');
}
