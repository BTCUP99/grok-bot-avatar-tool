// Original neon-night material over native geometry, gaze and expression contours.
Hs.neonNight=()=>Hs.milkcat();
cc.neonNight=()=>vc(1.22,Cc(z('neonNight',2)),.29,.14);
Oo.neonNight={width:.24,height:.41,gap:.49,shiftY:.08};

// Only this character gets an elapsed render clock; native motion is untouched.
const neonNativeEngineFactory=eo;
eo=function(options={}){
  const engine=neonNativeEngineFactory(options);
  if(options.body!=='neonNight')return engine;
  let clock=0,lastGesture=null,nods=0;
  const advance=engine.advance,frame=engine.frame,poke=engine.poke;
  engine.poke=(name,options)=>{poke(name,options);lastGesture={name,at:clock};if(name==='nod')nods++};
  engine.advance=dt=>{advance(dt);if(Number.isFinite(dt)&&dt>0)clock+=Math.min(dt,.1)};
  engine.frame=()=>{
    const value=frame();if(value.body!=='neonNight')return value;
    const snapshot=globalThis.__grokNeonAvatar?.store.getSnapshot();
    return {...value,neonClock:clock,neonState:options.avatarState?.()??snapshot?.state??'idle',neonExpression:engine.face,neonDemo:snapshot?.isDemo??false,neonGesture:lastGesture&&clock-lastGesture.at<.5?lastGesture.name:'',neonNods:nods};
  };
  return engine;
};

const neonWorkingStates=new Set(['thinking','streaming','searching','reading','working','coding','running','computing','controlling','writing','sending','receiving','uploading','progress','spawning','loading','dictating','orbit','radar']);
function neonLamp(frame) {
  const state=frame.neonState??'idle',working=neonWorkingStates.has(state);
  const level=working?.55+.45*(.5+.5*Math.sin((frame.neonClock??0)*Math.PI*2/1.3)):1;
  return {state,working,level,color:state==='finished'?'#c9ff83':state==='blocked'||state==='failed'?'#ffca7d':state==='waiting'?'#bf9bff':working?'#5df8ff':'#8ef9e8'};
}
function neonTag(svg,frame,kind) {
  const lamp=neonLamp(frame);
  Object.assign(svg.attrs,{'data-neon-native':'1','data-pose':frame.quat.map(v=>v.toFixed(5)).join(','),'data-neon-state':lamp.state,'data-neon-expression':frame.neonExpression??'neutral','data-neon-led-level':lamp.level.toFixed(3),'data-neon-clock':(frame.neonClock??0).toFixed(3),'data-neon-kind':kind,'data-neon-demo':String(frame.neonDemo??false),'data-neon-gesture':frame.neonGesture??'','data-neon-nods':frame.neonNods??0});
  return svg;
}
function neonNativeSvg(frame,appearance,size,id,options={}) {
  if(frame.bodies.length!==1||frame.morph!=null){
    const svg=Hg(frame,{...appearance,cutout:false,inkPaint:'#74f0ee',spotPaint:'#c4fbff'},size,id,options.displaySize??size,options.extent);
    const lamp=neonLamp(frame);
    svg.children.push(Y('circle',{cx:size*.5,cy:size*.17,r:size*.018,fill:lamp.color,opacity:lamp.level}));
    return neonTag(svg,frame,'native-morph');
  }
  // Reuse the already verified milkcat material layout without mutating its source.
  const svg=milkcatNativeSvg(frame,appearance,size,id,options);
  delete svg.attrs['data-milkcat-native'];
  const shape=Dp(frame,{...appearance,cutout:false,spotPaint:'#91f9fa'},size,options),r=shape.sprite;
  const defs=svg.children[0],group=svg.children[1],lamp=neonLamp(frame);
  const colors=['#7379bd','#303953','#0d1626'];
  const mapping={'#8f6267':'#64dbea','#4b414b':'#111b33','#fff4db':'#91f9fa','#f09ca8':'#bb85ff','#eab3b6':'#9b9be7','#e8a9b8':'#83e5f3','#c88e83':lamp.color};
  const walk=node=>{
    if(node.tag==='stop'&&node.attrs['stop-color'])node.attrs['stop-color']=colors.shift()??node.attrs['stop-color'];
    if(mapping[node.attrs.fill])node.attrs.fill=mapping[node.attrs.fill];
    node.children.forEach(walk);
  };walk(svg);
  const eyes=group.children.find(node=>node.attrs.mask===`url(#${id}-inside)`);
  group.children.splice(1,0,Y('g',{'clip-path':`url(#${id}-shell)`},[
    Y('use',{href:`#${id}-body`,fill:'none',stroke:'#b2ceff','stroke-width':r*.009,opacity:.5})
  ]));
  const poly=points=>points.map(([x,y])=>({x,y}));
  const accents=[
    [poly([[-.52,.27],[-.14,.31],[.40,.31],[.44,.26],[-.12,.26],[-.49,.22]]),'#6cf3ff',.5],
    [poly([[-.49,.18],[-.38,.18],[-.14,-.23],[-.25,-.23]]),'#d0f8ff',.12],
    [poly([[.34,.66],[.41,.74],[.49,.72],[.42,.62]]),'#9bf7f3',.85],
  ];
  if(lamp.working){
    for(const side of [-1,1])accents.push([poly([[side*.51,.48],[side*.56,.60],[side*.62,.62],[side*.59,.48]]),lamp.color,lamp.level]);
  }
  const decorations=accents.flatMap(([loop,fill,opacity])=>tl(dc('neonNight'),jp(frame,size),r,{loops:[loop],shiftY:0}).map(loop=>Y('path',{d:nu([loop]),fill,opacity})));
  // The forehead lamp is projected through the same seat and native quaternion.
  const lampLoop=Array.from({length:40},(_,i)=>({x:Math.cos(i/40*Math.PI*2)*(lamp.working?.070:.045),y:.53+Math.sin(i/40*Math.PI*2)*(lamp.working?.070:.045)}));
  decorations.push(...tl(dc('neonNight'),jp(frame,size),r,{loops:[lampLoop],shiftY:0}).map(loop=>Y('path',{d:nu([loop]),fill:lamp.color,opacity:lamp.level})));
  group.children.splice(3,0,Y('g',{'clip-path':`url(#${id}-shell)`},decorations));
  if((options.displaySize??size)>=48&&eyes){
    defs.children.push(Y('filter',{id:id+'-neon',x:'-50%',y:'-50%',width:'200%',height:'200%'},[Y('feGaussianBlur',{stdDeviation:r*.012})]));
    group.children.splice(4,0,Y('g',{filter:`url(#${id}-neon)`,'clip-path':`url(#${id}-shell)`},eyes.children.map(node=>Y('path',{...node.attrs,fill:'#5df8ff',opacity:.38}))));
  }
  return neonTag(svg,frame,'solid');
}
