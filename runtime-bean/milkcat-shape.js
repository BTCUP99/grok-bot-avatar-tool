// Milkcat / 奶糖喵机. Native 0.78.4 geometry and expression projection.
Hs.milkcat = () => 'M39 91 Q23 56 34 25 Q41 12 62 41 L83 61 Q127 43 168 61 L195 29 Q215 7 223 29 Q235 59 218 93 Q237 118 232 159 Q228 215 182 229 Q125 245 70 228 Q24 213 22 163 Q18 121 39 91Z';
cc.milkcat = () => vc(1.22, Cc(z('milkcat',2)), .29, .14);
Oo.milkcat = {width:.24,height:.41,gap:.49,shiftY:.08};

function milkcatNativeSvg(frame,appearance,size,id,options={}) {
  const shape=Dp(frame,{...appearance,cutout:false,spotPaint:'#fff4db'},size,options);
  const r=shape.sprite;
  if(frame.eyes!=null && frame.glow==null){
    const contours=ko('milkcat',frame.eyes),aspect=.41/(.24*(.5244/.2392));
    shape.eyes=tl(dc('milkcat'),jp(frame,size),r,{
      ...contours,loops:contours.loops.map(loop=>loop.map(p=>({x:p.x,y:p.y*aspect})))
    }).map(loop=>nu([loop]));
  }
  shape.bodyFill={cx:r*.30,cy:r*.20,r:r*.86,stops:[
    {offset:0,color:'#fffdf1'},{offset:.58,color:'#f6dfca'},{offset:1,color:'#d7ac9e'}
  ]};
  const svg=kp(shape,id,options.extent),defs=svg.children[0],group=svg.children[1];
  svg.attrs['data-milkcat-native']='1';
  svg.attrs['data-pose']=frame.quat.map(v=>v.toFixed(5)).join(',');
  const round=(cx,cy,w,h,radius)=>{
    const r=Math.min(radius,w/2,h/2),points=[];
    for(const [x,y,start] of [[cx+w/2-r,cy+h/2-r,0],[cx-w/2+r,cy+h/2-r,90],[cx-w/2+r,cy-h/2+r,180],[cx+w/2-r,cy-h/2+r,270]]){
      for(let i=0;i<=8;i++){const a=(start+i*90/8)*Math.PI/180;points.push({x:x+r*Math.cos(a),y:y+r*Math.sin(a)});}
    }
    return points;
  };
  const oval=(x,y,rx,ry=rx)=>Array.from({length:48},(_,i)=>({x:x+rx*Math.cos(i/48*Math.PI*2),y:y+ry*Math.sin(i/48*Math.PI*2)}));
  const poly=points=>points.map(([x,y])=>({x,y}));
  const paint=[
    [poly([[-.68,.43],[-.72,.77],[-.40,.48]]),'#eab3b6'],
    [poly([[.39,.49],[.73,.80],[.66,.39]]),'#eab3b6'],
    [round(0,-.04,1.38,.93,.30),'#8f6267'],
    [round(0,-.05,1.27,.81,.26),'#4b414b'],
    [oval(-.49,-.27,.115,.045),'#f09ca8',.8],
    [oval(.49,-.27,.115,.045),'#f09ca8',.8],
    [round(0,-.43,.10,.035,.02),'#e8a9b8'],
    [oval(0,.53,.045),'#c88e83'],
  ];
  defs.children.push(Y('clipPath',{id:id+'-shell'},shape.body.map(d=>Y('path',{d}))));
  const markings=paint.flatMap(([loop,fill,opacity=1])=>tl(dc('milkcat'),jp(frame,size),r,{loops:[loop],shiftY:0}).map(projected=>Y('path',{d:nu([projected]),fill,opacity})));
  group.children.splice(1,0,Y('g',{'clip-path':`url(#${id}-shell)`},markings));
  const glints=[];
  shape.eyes.forEach((d,i)=>{
    const points=Hp(d).flat();if(points.length<3)return;
    const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
    const x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
    defs.children.push(Y('clipPath',{id:id+'-eye-'+i},[Y('path',{d})]));
    glints.push(Y('ellipse',{cx:x+w*.36,cy:y+h*.24,rx:w*.13,ry:Math.min(w*.15,h*.12),fill:'#ffffff',opacity:.64,'clip-path':`url(#${id}-eye-${i})`}));
  });
  group.children.push(Y('g',{'clip-path':`url(#${id}-shell)`},glints));
  return svg;
}
