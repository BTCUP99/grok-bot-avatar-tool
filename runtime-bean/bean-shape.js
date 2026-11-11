// Add one local shape to the Grok Bot 0.78.4 renderer in memory.
// Motion, surface projection, clipping, and pointer handling remain native.
Hs.apricotBean = () => 'M43 100 C54 90 77 91 85 72 C86 39 112 13 144 15 C183 16 211 50 214 92 C220 133 197 171 166 194 C128 221 77 224 42 197 C9 172 13 125 43 100 Z';
cc.apricotBean = () => {
  const balls = Fc('apricotBean');
  return {size:1.25, silhouette:{kind:'solid',samples:[],balls,isLoop:false,yawPeriod:null},seat:xc('apricotBean',balls)};
};
Oo.apricotBean = {width:.258,height:.48,gap:.49,shiftY:.035};

function beanNativeSvg(frame, appearance, size, id, options) {
  const shape = Dp(frame, {...appearance,cutout:false,spotPaint:'#3c2924'}, size, options);
  const r = shape.sprite;
  shape.bodyFill = {cx:r*.36,cy:r*.28,r:r*.65,stops:[
    {offset:0,color:'#ffe2ae'},{offset:.43,color:'#ffc180'},
    {offset:.79,color:'#f4a260'},{offset:1,color:'#dc8347'}
  ]};
  const svg = kp(shape,id,options.extent);
  svg.attrs['data-bean-native'] = '1';
  svg.attrs['data-pose'] = frame.quat.map(v=>v.toFixed(5)).join(',');
  const defs = svg.children[0], group = svg.children[1];
  // The cheek loops pass through the same wrapped-surface projector as eyes.
  const ellipse = (cx,cy,rx,ry) => Array.from({length:40},(_,k)=>{
    const a=k/40*Math.PI*2;return {x:cx+rx*Math.cos(a),y:cy+ry*Math.sin(a)};
  });
  const cheeks = tl(dc('apricotBean'),jp(frame,size),r,{
    loops:[ellipse(-.40,-.24,.115,.06),ellipse(.40,-.24,.115,.06)],shiftY:.035
  }).map(loop=>Y('path',{d:nu([loop]),fill:'#e67b65',opacity:.38}));
  defs.children.push(Y('clipPath',{id:id+'-bean-clip'},shape.body.map(d=>Y('path',{d}))));
  // Small highlights are derived from each projected eye; eyelids clip them.
  const highlights=[];
  shape.eyes.forEach((d,i)=>{
    const points=Hp(d).flat();if(points.length<3)return;
    const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
    const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
    const w=x1-x0,h=y1-y0;
    defs.children.push(Y('clipPath',{id:id+'-eye-'+i},[Y('path',{d})]));
    highlights.push(Y('ellipse',{cx:x0+w*.36,cy:y0+h*.25,rx:w*.16,ry:Math.min(w*.20,h*.12),fill:'#fff8e9',opacity:.9,'clip-path':`url(#${id}-eye-${i})`}));
  });
  group.children.push(Y('g',{'clip-path':`url(#${id}-bean-clip)`},[...cheeks,...highlights]));
  return svg;
}
