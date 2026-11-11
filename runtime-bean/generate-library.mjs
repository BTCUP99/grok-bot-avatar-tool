// Produces distributable original art only; the vendor renderer stays in memory.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {loadNativeLibrary} from './library-native.mjs';
import {libraryCharacters} from './library.mjs';
import {createLibraryStore} from './library-state.mjs';
import {createNeonCompletionGate} from './neon-state.mjs';
import {sha} from './patch.mjs';

const {native,checked}=await loadNativeLibrary({includePickerImages:false});
const editorContract=checked.contract.editor;
const store=createLibraryStore('neonNight',libraryCharacters.map(c=>c.shape)),gate=createNeonCompletionGate();
globalThis.__grokAvatarLibrary={store};globalThis.__grokNeonAvatar={store};
const out=new URL('./library/',import.meta.url),write=(file,data)=>writeFileSync(new URL(file,out),data);
for(const path of ['icons/','sheets/','specs/','characters/'])mkdirSync(new URL(path,out),{recursive:true});
const palette=native.D('#6475ba','#91f9fa'),settle=e=>{for(let i=0;i<180;i++)e.advance(1/60);return e.frame()};
const cells=[],manifest=[];
let serial=0;
const render=(frame,size,zoom)=>native.O({...frame,zoom:zoom??frame.zoom},palette,size,'library-'+serial++);
for(const c of libraryCharacters){
  store.select(c.shape);store.setActual('idle');
  const engine=native.P({body:c.shape});engine.rest();const rest=settle(engine);engine.setGaze([0,0]);const front=settle(engine);
  store.setActual('working');engine.setGaze(null);const controller=native.stateController(engine,'working',{seed:7,isResting:false});
  for(let i=0;i<25;i++){controller.advance(1/60);engine.advance(1/60)}const working=engine.frame();
  store.setActual('finished',1000);controller.setState('finished');gate({setExpression:engine.setExpression,poke:engine.poke},store.getSnapshot());
  for(let i=0;i<9;i++){controller.advance(1/60);engine.advance(1/60)}const happy=engine.frame();
  const filename=c.number+'-'+c.key;
  const states=[['rest','闲置侧脸',rest],['front','悬停正面',front],['working','工作反馈',working],['finished','开心与点头',happy]];
  for(const [key,,frame] of states)write('icons/'+filename+'-'+key+'.svg',render(frame,1024,.72));
  const tiles=states.map(([key,label,frame],i)=>`<g transform="translate(${24+i*238} 88)"><rect width="222" height="260" rx="18" fill="#ffffff"/><text x="20" y="31" font-size="17">${label}</text><g transform="translate(7 44)">${render(frame,208,.78)}</g></g>`).join('');
  write('sheets/'+filename+'.svg',`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="432" viewBox="0 0 1000 432"><rect width="1000" height="432" fill="#f7f8f6"/><g font-family="PingFang SC,system-ui,sans-serif" fill="#263c43"><text x="24" y="48" font-size="28" font-weight="700">${c.number} ${c.name}</text>${tiles}<text x="24" y="384" font-size="14" fill="#687d80">原生引擎离线状态抽样 · 灯光：${c.light} · 工作呼吸周期 1.3 秒 · 完成原生 happy + nod</text><text x="24" y="410" font-size="12" fill="#687d80">截图式抽样不能替代实际窗口动画；通过统一头像工具查看连续响应。</text></g></svg>`);
  const design=native.robotCatalog.find(d=>'robot_'+d.key===c.shape),geometry=native.geometry(c.shape);
  const entry={...c,collection:Number(c.number)>11?'wonder':'classic',story:design?.story??'在霓虹灯下工作的夜行伙伴。',tag:design?.tag??'霓虹 · 原生猫耳',geometry:{size:geometry.size,kind:geometry.silhouette.kind,depth:design?.depth??.29,bevel:design?.bevel??.14},eyeLayout:design?.eyes??{width:.24,height:.41,gap:.49,shiftY:.08},colors:design?.colors??['#7379bd','#303953','#0d1626'],eyeColor:design?.eye??'#91f9fa',workingPeriodSeconds:1.3,completion:{expression:'happy',gesture:'nod',deduplicate:'per native engine and completion key'},definition:'characters/'+filename+'.json',icons:states.map(([state])=>'icons/'+filename+'-'+state+'.svg'),sheet:'sheets/'+filename+'.svg',parameterSnapshot:c.shape==='neonNight'?'../霓虹夜行参数快照.json':'specs/'+c.name+'参数快照.json'};
  manifest.push(entry);
  const baseDesign=design??native.robotCatalog.find(item=>item.key==='milkcat');
  write(entry.definition,JSON.stringify({formatVersion:1,...entry,outline:baseDesign.outline,paint:baseDesign.paint,materialSource:c.shape==='neonNight'?'../neon-shape.js':'../library-runtime.js',note:'Original geometry and decorative loops; native runtime is required for surface projection, expressions and motion.'},null,2)+'\n');
  cells.push({c,design,svg:render(front,220,.8)});
}
function overview(title,items,file){
  const height=160+Math.ceil(items.length/4)*330;
  const tiles=items.map(({c,design,svg},i)=>`<g transform="translate(${28+(i%4)*320} ${130+Math.floor(i/4)*330})"><rect width="304" height="312" rx="22" fill="${design?.bg??'#dfe9f0'}"/><text x="20" y="33" font-size="14" fill="#607778">${c.number} / ${design?.tone??'霓虹赛博'}</text><g transform="translate(42 35)">${svg}</g><text x="20" y="264" font-size="25" font-weight="700" fill="#263c43">${c.name}</text><text x="20" y="291" font-size="12" fill="#607778">${design?.tag??'霓虹灯带 · 原生猫耳'}</text></g>`).join('');
  write(file,`<svg xmlns="http://www.w3.org/2000/svg" width="1336" height="${height}" viewBox="0 0 1336 ${height}"><rect width="1336" height="${height}" fill="#fafbf8"/><g font-family="PingFang SC,system-ui,sans-serif"><text x="28" y="52" font-size="36" font-weight="700" fill="#263c43">${title}</text><text x="28" y="88" font-size="17" fill="#6e8385">独立实体轮廓 / 原生鼠标视线与表情 / 工作灯与开心点头 / SVG 与 1024 透明预览</text>${tiles}<text x="28" y="${height-12}" font-size="12" fill="#7b8b8a">原生引擎离线渲染；连续交互见实际 Bot 窗口。Grok Bot ${checked.version} / macOS Apple Silicon。</text></g></svg>`);
}
overview('原创头像库 · '+manifest.length+' 款',cells,'机器人头像库总览.svg');
overview('奇想新作 · 20 个不安分的小生命',cells.filter(({c})=>Number(c.number)>11),'奇想新作总览.svg');
write('manifest.json',JSON.stringify({formatVersion:1,appVersion:checked.version,architecture:process.arch,officialAsarSHA256:checked.officialHash,scope:'Original character definitions and derived art; acceptance scope is documented separately',editorContract,sourceSHA256:Object.fromEntries(['../avatar-designs/catalog-shapes.js','../avatar-designs/fantasy-shapes.js','library.mjs','library-runtime.js','library-state.mjs','library-bridge.js','library-picker.js','tool.mjs','setup-server.mjs','audit.js','milkcat-shape.js','neon-shape.js','neon-state.mjs','patch.mjs'].map(file=>[file,sha(readFileSync(new URL(file,import.meta.url)))])),characterCount:manifest.length,characters:manifest},null,2)+'\n');
const cards=manifest.map(c=>`<article><div class="images">${['rest','front','working','finished'].map((state,i)=>`<figure><img src="icons/${c.number}-${c.key}-${state}.svg" alt="${c.name} ${['闲置','正面','工作','完成'][i]}" loading="lazy"><figcaption>${['闲置','正面','工作','完成'][i]}</figcaption></figure>`).join('')}</div><h2>${c.number} ${c.name}</h2><p>${c.story}</p><p>${c.tag}</p><p>独立灯光：${c.light} · 完成：开心与点头</p><a href="sheets/${c.number}-${c.key}.svg">状态规格图</a> <a href="icons/${c.number}-${c.key}-front.png" download>1024 透明 PNG</a> <a href="icons/${c.number}-${c.key}-front.svg" download>可缩放 SVG</a></article>`).join('');
write('index.html',`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>原创头像库 · ${manifest.length} 款</title><style>*{box-sizing:border-box}body{margin:0;background:#f6f8f5;color:#243e46;font-family:system-ui,"PingFang SC",sans-serif}main{max-width:1480px;margin:auto;padding:40px 28px}h1{font-size:36px}header p{max-width:960px;line-height:1.9;color:#637e80}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(330px,1fr));gap:20px}article{padding:22px;border-radius:20px;background:white;border:1px solid #e0e9e6}h2{font-size:22px;margin:22px 0 8px}p{font-size:13px;line-height:1.9}.images{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}figure{margin:0;text-align:center;background:#f5f8f7;border-radius:14px;padding:5px}img{display:block;width:100%;aspect-ratio:1}figcaption{font-size:11px;padding:4px}a{display:inline-block;margin:6px 12px 0 0;color:#286c7b;font-size:12px}@media(max-width:420px){main{padding:20px 14px}.grid{grid-template-columns:1fr}h1{font-size:28px}}</style><main><header><h1>原创头像库 · ${manifest.length} 款</h1><p>原有十一款与二十款奇想新作，共用原生实体投影、交互与状态响应。此页展示离线状态抽样；要看真正的悬停、工作灯与点头，请先退出 Grok Bot，再双击根目录的「启动头像工具.command」。在对话详情点击头像，进入「原创动态头像」搜索、分组并选择 ${manifest.length} 款。</p></header><section class="grid">${cards}</section><p>SVG 可缩放；PNG 为 1024 × 1024 透明预览。PNG/SVG 导出只用于素材和展示；实际交互由程序化几何与原生引擎驱动。适配：Grok Bot ${checked.version} / macOS Apple Silicon。</p></main></html>`);
console.log(JSON.stringify({characters:manifest.length,transparentSvgExports:manifest.length*4,stateSheets:manifest.length,overview:true,manifest:true},null,2));
