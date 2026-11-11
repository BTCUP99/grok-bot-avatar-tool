// Original design source. Loaded only by generate.mjs into the verified renderer.
// All faces, markings and eyes use the native pose and native surface projector.
const robotRound = (cx, cy, w, h, radius) => {
  const r = Math.min(radius, w / 2, h / 2), points = [];
  for (const [x, y, start] of [[cx+w/2-r,cy+h/2-r,0],[cx-w/2+r,cy+h/2-r,90],[cx-w/2+r,cy-h/2+r,180],[cx+w/2-r,cy-h/2+r,270]]) {
    for (let i=0;i<=8;i++) {const a=(start+i*90/8)*Math.PI/180;points.push({x:x+r*Math.cos(a),y:y+r*Math.sin(a)});}
  }
  return points;
};
const robotOval = (x,y,rx,ry=rx) => Array.from({length:48},(_,i)=>({x:x+rx*Math.cos(i/48*Math.PI*2),y:y+ry*Math.sin(i/48*Math.PI*2)}));
const robotPoly = points => points.map(([x,y])=>({x,y}));
const robotStar = (x,y,r) => robotPoly([[x,y+r],[x+r*.25,y+r*.25],[x+r,y],[x+r*.25,y-r*.25],[x,y-r],[x-r*.25,y-r*.25],[x-r,y],[x-r*.25,y+r*.25]]);
const robotPaint = (loop,fill,opacity=1) => ({loop,fill,opacity});
const robotPanel = (w,h,y,fill,r=.18) => robotPaint(robotRound(0,y,w,h,r),fill);
const robotDot = (x,y,r,fill) => robotPaint(robotOval(x,y,r),fill);
const robotBar = (x,y,w,h,fill,r=.02) => robotPaint(robotRound(x,y,w,h,r),fill);
const robotCheeks = (color='#f09ca8') => [-1,1].map(s=>robotPaint(robotOval(s*.49,-.27,.115,.045),color,.8));
const robotScrews = (color='#e8ebed') => [-1,1].flatMap(s=>[robotDot(s*.70,.48,.035,color),robotDot(s*.70,-.48,.035,color)]);

const robotCatalog = [
  {
    key:'milkcat',name:'奶糖喵机',english:'MILK / 01',tone:'软萌陪伴',tag:'奶油陶瓷 · 猫耳 · 草莓面颊',
    story:'一只把机械零件藏进奶糖里的猫。高低耳朵和柔软护目窗，让它像随时准备蹭你一下。',
    bg:'#f4e6e2',accent:'#bc6479',colors:['#fffdf1','#f6dfca','#d7ac9e'],eye:'#fff4db',
    outline:'M39 91 Q23 56 34 25 Q41 12 62 41 L83 61 Q127 43 168 61 L195 29 Q215 7 223 29 Q235 59 218 93 Q237 118 232 159 Q228 215 182 229 Q125 245 70 228 Q24 213 22 163 Q18 121 39 91Z',
    depth:.29,bevel:.14,size:1.22,eyes:{width:.24,height:.41,gap:.49,shiftY:.08},
    paint:[robotPaint(robotPoly([[-.68,.43],[-.72,.77],[-.40,.48]]),'#eab3b6'),robotPaint(robotPoly([[.39,.49],[.73,.80],[.66,.39]]),'#eab3b6'),robotPanel(1.38,.93,-.04,'#8f6267',.30),robotPanel(1.27,.81,-.05,'#4b414b',.26),...robotCheeks(),robotBar(0,-.43,.10,.035,'#e8a9b8'),robotDot(0,.53,.045,'#c88e83')],
  },
  {
    key:'titan',name:'钛坦大力士',english:'TITAN / 02',tone:'健壮重装',tag:'钛灰装甲 · 宽颚 · 工业黄',
    story:'可靠到能替你扛下一整座服务器。宽颚、铆钉和低矮的眼睛，把力量压进一个小图标。',
    bg:'#e1e6e7',accent:'#556571',colors:['#9cabb4','#586b7b','#263c51'],eye:'#fff19a',
    outline:'M47 28 L208 28 L233 57 L233 165 L206 210 L173 235 L83 235 L48 211 L23 165 L23 57Z',
    depth:.43,bevel:.12,size:1.19,eyes:{width:.29,height:.23,gap:.58,shiftY:.02},
    paint:[robotPanel(1.47,.76,.05,'#26323e',.10),robotBar(0,.56,1.31,.15,'#ffce54',.035),robotPaint(robotPoly([[-.1,.64],[.02,.64],[.21,.49],[.08,.49]]),'#283e50'),robotPanel(.95,.31,-.51,'#304352',.04),...[-.28,-.14,0,.14,.28].map(x=>robotBar(x,-.51,.045,.18,'#adbbc0')),...robotScrews(),robotBar(-.72,.03,.09,.43,'#ffce54'),robotBar(.72,.03,.09,.43,'#ffce54')],
  },
  {
    key:'bitboy',name:'像素小子',english:'BITBOY / 03',tone:'顽皮数码',tag:'掌机绿 · 阶梯轮廓 · 电量灯',
    story:'从九十年代的掌机里溜出来的小家伙。棱角分明，却总带着一点傻乎乎的乐观。',
    bg:'#e7ebce',accent:'#667832',colors:['#dded9a','#a6c871','#688d4a'],eye:'#dfffad',
    outline:'M75 23 L101 23 L101 43 L181 43 L181 57 L212 57 L212 83 L231 83 L231 184 L212 184 L212 216 L184 216 L184 231 L62 231 L62 215 L35 215 L35 184 L23 184 L23 83 L44 83 L44 57 L75 57Z',
    depth:.30,bevel:.035,size:1.22,eyes:{width:.24,height:.34,gap:.52,shiftY:.05},
    paint:[robotPanel(1.42,.99,.02,'#50774d',.025),robotPanel(1.26,.81,.04,'#243e38',.02),robotBar(-.37,.61,.25,.07,'#f4ffc9',.005),...[-.20,-.07,.06].map(x=>robotBar(x,-.59,.065,.065,'#3b6044',.004)),robotBar(.44,-.57,.10,.16,'#fc9c70',.01),robotBar(.44,-.57,.20,.055,'#fc9c70',.01),robotDot(-.51,-.28,.035,'#a4d37c'),robotDot(-.39,-.28,.035,'#a4d37c')],
  },
  {
    key:'jelly',name:'泡泡水母',english:'JELLY / 04',tone:'治愈透明感',tag:'冰蓝果冻 · 圆顶 · 气泡感',
    story:'像一块装了情绪传感器的海盐布丁。圆顶与波浪裙边让它轻盈、安静，又有一点外星感。',
    bg:'#deedf0',accent:'#3e889a',colors:['#e5ffff','#8de2e6','#42a8c0'],eye:'#275a76',
    outline:'M22 152 C10 83 49 23 122 19 C196 14 241 72 235 150 L235 189 Q234 212 216 214 Q201 218 191 202 Q185 198 182 211 Q173 241 155 224 L142 210 Q129 236 111 222 L94 211 Q77 239 60 217 L52 203 Q27 224 23 201Z',
    depth:.33,bevel:.16,size:1.24,eyes:{width:.27,height:.43,gap:.50,shiftY:.005},
    paint:[robotPanel(1.49,.95,.03,'#c6f6ee',.38),robotPaint(robotOval(-.43,.57,.27,.08),'#f6ffff',.8),robotPaint(robotOval(.55,.40,.08,.11),'#eaffff',.7),...robotCheeks('#71c7db'),robotDot(0,-.43,.04,'#4294b1'),robotPaint(robotStar(.52,.52,.10),'#f6ffff')],
  },
  {
    key:'oni',name:'赤焰鬼丸',english:'ONI / 05',tone:'热血机甲',tag:'朱红武士 · 双角 · 金色战纹',
    story:'有脾气的桌面守卫。上挑金角和深色面甲保留武士的锋利感，眼睛仍然可以温柔地眨动。',
    bg:'#eeddd6',accent:'#b14936',colors:['#ffad76','#e85c3f','#9a2d32'],eye:'#ffe49a',
    outline:'M48 86 L18 16 Q14 6 26 13 L91 58 L164 58 L229 13 Q242 7 237 22 L208 89 L235 112 L222 185 L175 224 L127 244 L78 224 L34 186 L21 111Z',
    depth:.38,bevel:.07,size:1.24,eyes:{width:.29,height:.23,gap:.50,shiftY:.10},
    paint:[robotPaint(robotPoly([[-.86,.86],[-.31,.51],[-.53,.33]]),'#ffdc7c'),robotPaint(robotPoly([[.86,.86],[.31,.51],[.53,.33]]),'#ffdc7c'),robotPaint(robotPoly([[-.76,.22],[-.37,.34],[0,.18],[.37,.34],[.76,.22],[.55,-.37],[0,-.66],[-.55,-.37]]),'#4c2733'),robotPaint(robotPoly([[0,.70],[.13,.45],[0,.26],[-.13,.45]]),'#ffe4a6'),robotBar(0,-.53,.055,.23,'#eaa65c'),robotPaint(robotPoly([[-.65,-.28],[-.27,-.41],[-.21,-.51],[-.63,-.40]]),'#ffd07c'),robotPaint(robotPoly([[.65,-.28],[.27,-.41],[.21,-.51],[.63,-.40]]),'#ffd07c')],
  },
  {
    key:'luna',name:'月球邮差',english:'LUNA / 06',tone:'梦幻太空',tag:'薰衣草头盔 · 耳舱 · 星星邮戳',
    story:'每天往返月球，给你送一点宇宙里的好消息。圆形头盔、两只耳舱和一枚小星星，组成它的制服。',
    bg:'#e8e2f2',accent:'#8071a8',colors:['#f4efff','#bdabe7','#7a70b6'],eye:'#fcf6ff',
    outline:'M42 85 C45 37 84 18 127 18 C173 18 209 40 215 85 L230 85 Q243 88 243 108 L243 159 Q240 180 218 179 C201 216 176 237 128 237 C80 237 52 214 38 179 Q14 180 13 159 L13 108 Q14 87 29 85Z',
    depth:.38,bevel:.17,size:1.23,eyes:{width:.23,height:.40,gap:.46,shiftY:.04},
    paint:[robotPaint(robotOval(0,-.005,.74,.76),'#f5edff'),robotPaint(robotOval(0,-.02,.635,.65),'#62558c'),robotBar(-.85,-.005,.15,.45,'#8e80be',.06),robotBar(.85,-.005,.15,.45,'#8e80be',.06),robotPaint(robotStar(.43,.40,.12),'#ffdd97'),robotBar(0,-.55,.23,.055,'#d5c7f0'),robotDot(-.44,-.30,.04,'#b5a1d7'),robotDot(.44,-.30,.04,'#b5a1d7')],
  },
  {
    key:'sprout',name:'苔藓园丁',english:'SPROUT / 07',tone:'自然森系',tag:'鼠尾草绿 · 新芽 · 生物机械',
    story:'用光合作用为自己充电，负责照看你没空照顾的小情绪。叶芽和不对称眼罩让它更像活物。',
    bg:'#e1e9dc',accent:'#648866',colors:['#d7e8a7','#9eb879','#658b66'],eye:'#fff2cb',
    outline:'M101 62 C76 59 65 30 77 14 C105 13 125 26 130 48 C147 17 172 14 192 24 C191 47 168 61 145 64 L145 74 C204 77 236 104 234 163 C231 215 192 237 127 239 C63 237 23 215 22 163 C20 104 49 78 111 74 L111 63Z',
    depth:.32,bevel:.14,size:1.25,eyes:{width:.24,height:.40,gap:.50,shiftY:.13},
    paint:[robotPaint(robotPoly([[-.38,.81],[-.10,.63],[-.12,.49],[-.39,.67]]),'#6a975f'),robotPaint(robotPoly([[.1,.52],[.31,.82],[.53,.79],[.35,.60]]),'#436f55'),robotPanel(1.44,.86,-.10,'#53766a',.32),robotPanel(1.30,.72,-.10,'#354f4a',.27),...robotCheeks('#d3ae78'),robotDot(-.12,-.59,.025,'#e5daac'),robotDot(0,-.62,.025,'#e5daac'),robotDot(.12,-.59,.025,'#e5daac')],
  },
  {
    key:'radio',name:'磁带电台',english:'FREQ / 08',tone:'复古潮玩',tag:'芥末黄 · 扬声器 · 模拟年代',
    story:'脑袋里住着一间深夜电台。圆角箱体与扬声器纹路像旧磁带机，暖色外壳有一点玩具的笨拙。',
    bg:'#f0e5cf',accent:'#9e783c',colors:['#ffdf86','#eeb64b','#b77e30'],eye:'#f8e8b2',
    outline:'M61 36 L83 36 L83 20 L105 20 L105 36 L203 36 Q232 36 232 65 L232 200 Q232 229 203 229 L49 229 Q21 229 21 201 L21 65 Q21 36 50 36Z',
    depth:.35,bevel:.09,size:1.20,eyes:{width:.22,height:.37,gap:.43,shiftY:.01},
    paint:[robotPanel(1.29,.95,.05,'#315553',.12),robotPanel(1.17,.83,.05,'#21413f',.085),robotBar(0,-.59,.74,.18,'#a36e2d',.045),...[-.25,-.15,-.05,.05,.15,.25].map(x=>robotBar(x,-.59,.028,.10,'#ffdf84',.005)),robotDot(-.62,-.58,.067,'#f1e5b8'),robotDot(.62,-.58,.067,'#d65c41'),robotBar(0,.62,.86,.055,'#fff1b7'),...[-.71,.71].flatMap(x=>[-.22,-.07,.08,.23].map(y=>robotBar(x,y,.055,.055,'#9b753b',.015)))],
  },
  {
    key:'oracle',name:'星核法师',english:'ORACLE / 09',tone:'神秘晶体',tag:'电光蓝 · 菱形冠 · 紫色灵核',
    story:'一枚误把自己当机器人的魔法晶核。几何切面与符文灯带让它有棱角，也像一件发光的饰品。',
    bg:'#e0e6f4',accent:'#5875c4',colors:['#9dcaff','#527ce1','#3b419f'],eye:'#d9ffff',
    outline:'M127 10 L184 52 L231 117 L224 176 L174 220 L127 245 L81 220 L30 176 L23 117 L70 52Z',
    depth:.39,bevel:.045,size:1.28,eyes:{width:.24,height:.36,gap:.46,shiftY:.07},
    paint:[robotPaint(robotPoly([[0,.88],[-.30,.53],[0,.26],[.30,.53]]),'#b8e6ff'),robotPaint(robotPoly([[-.30,.53],[0,.26],[0,.88]]),'#e2fcff',.65),robotPaint(robotPoly([[-.67,.18],[-.45,.36],[.45,.36],[.67,.18],[.43,-.42],[0,-.66],[-.43,-.42]]),'#3c347c'),robotPaint(robotPoly([[-.79,.18],[-.65,-.39],[-.45,-.51],[-.57,.02]]),'#9edfff'),robotPaint(robotPoly([[.79,.18],[.65,-.39],[.45,-.51],[.57,.02]]),'#9edfff'),robotPaint(robotStar(0,-.48,.11),'#dcbbff'),robotDot(0,.51,.06,'#fff9ff')],
  },
  {
    key:'ninja',name:'墨墨忍者',english:'KAGE / 10',tone:'极简酷黑',tag:'石墨黑 · 酸橙绿 · 隐秘面罩',
    story:'话不多，行动很快。几乎全黑的菱角外壳，只留下一对荧光眼睛和一道醒目的斜切战纹。',
    bg:'#dee4df',accent:'#58695d',colors:['#667576','#35444a','#17232e'],eye:'#c9ff6c',
    outline:'M72 28 L184 28 L222 66 L236 132 L213 194 L169 231 L87 231 L43 194 L20 132 L34 66Z',
    depth:.36,bevel:.09,size:1.22,eyes:{width:.31,height:.18,gap:.55,shiftY:.04},
    paint:[robotPaint(robotPoly([[-.82,.17],[-.64,.36],[.63,.36],[.82,.17],[.65,-.22],[-.65,-.22]]),'#14222b'),robotPaint(robotPoly([[-.20,-.31],[0,-.22],[.2,-.31],[0,-.65]]),'#4c5c60'),robotPaint(robotPoly([[.30,.73],[.46,.73],[.07,.40],[-.09,.40]]),'#d4fb78'),robotBar(-.61,-.42,.10,.055,'#aee757'),robotBar(-.48,-.49,.10,.055,'#aee757'),robotBar(.62,.04,.03,.32,'#778a8a')],
  },
];

function robotRegisterDesigns(designs) { for (const design of designs) {
  const key='robot_'+design.key;
  Hs[key]=()=>design.outline;
  cc[key]=()=>vc(design.size,Cc(z(key,2)),design.depth,design.bevel);
  Oo[key]=design.eyes;
} }
robotRegisterDesigns(robotCatalog);

function robotInspectShape(frame,appearance,size,options={}) {
  const design=robotCatalog.find(d=>'robot_'+d.key===frame.body);
  const shape=Dp(frame,{...appearance,cutout:false,spotPaint:design.eye},size,options);
  if(frame.eyes!=null && frame.glow==null){
    const contours=ko(frame.body,frame.eyes);
    // The verified renderer uses width for both oval axes. Apply the design's
    // vertical aspect to its native expression contours before projection.
    // Blink, tilt, gaze and expression still come from the original engine.
    const aspect=design.eyes.height/(design.eyes.width*(.5244/.2392));
    const slope={titan:-.10,oni:-.28,ninja:-.05}[design.key]??0;
    const loops=contours.loops.map((loop,i)=>{
      const cx=loop.reduce((s,p)=>s+p.x,0)/loop.length;
      return loop.map(p=>({x:p.x,y:p.y*aspect+(p.x-cx)*(i===0?slope:-slope)}));
    });
    shape.eyes=tl(dc(frame.body),jp(frame,size),shape.sprite,{...contours,loops}).map(loop=>nu([loop]));
  }
  return shape;
}

function robotNativeSvg(frame,appearance,size,id,options={}) {
  const design=robotCatalog.find(d=>'robot_'+d.key===frame.body);
  const shape=robotInspectShape(frame,appearance,size,options);
  const r=shape.sprite;
  shape.bodyFill={cx:r*.30,cy:r*.20,r:r*.86,stops:design.colors.map((color,i)=>({offset:[0,.58,1][i],color}))};
  const svg=kp(shape,id,options.extent),defs=svg.children[0],group=svg.children[1];
  svg.attrs['data-robot-design']=design.key;
  svg.attrs['data-pose']=frame.quat.map(v=>v.toFixed(5)).join(',');
  defs.children.push(Y('clipPath',{id:id+'-shell'},shape.body.map(d=>Y('path',{d}))));
  const markings=design.paint.flatMap(({loop,fill,opacity})=>tl(dc(frame.body),jp(frame,size),r,{loops:[loop],shiftY:0}).map(projected=>Y('path',{d:nu([projected]),fill,opacity})));
  // Place paint under the original expression-aware eye layer.
  group.children.splice(1,0,Y('g',{'clip-path':`url(#${id}-shell)`},markings));
  // Projected eye bounds supply a tiny glint; native eyelids clip each glint.
  const glints=[];
  shape.eyes.forEach((d,i)=>{
    const p=Hp(d).flat();if(p.length<3)return;
    const xs=p.map(v=>v[0]),ys=p.map(v=>v[1]);
    const x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
    defs.children.push(Y('clipPath',{id:id+'-eye-'+i},[Y('path',{d})]));
    glints.push(Y('ellipse',{cx:x+w*.36,cy:y+h*.24,rx:w*.13,ry:Math.min(w*.15,h*.12),fill:'#ffffff',opacity:.64,'clip-path':`url(#${id}-eye-${i})`}));
  });
  group.children.push(Y('g',{'clip-path':`url(#${id}-shell)`},glints));
  return svg;
}
