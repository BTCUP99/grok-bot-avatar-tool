// Local, visible observation only. No synthetic input, engine mutation, or network.
const beanAuditState={gaze:null,moves:0,leaves:0,pointerDowns:0,trusted:false,buttons:null,rect:null,mark:null,host:null};
let beanAuditPanel=null,beanAuditText=null,beanAuditTimer=null;
function beanAuditInput(root,gaze){
  const mark=root.querySelector('.sand-grok-bot-mark');
  if(!mark)return;
  const use=mark.querySelector('use');
  const href=use?.getAttribute('href')??'';
  const own=mark.querySelector('svg[__AVATAR_MARKER__]');
  if(!own&&!href.includes('__TARGET_BOT_ID__'))return;
  beanAuditState.host=mark;
  beanAuditState.mark=own??document.getElementById(href.replace(/^#/,''));
  beanAuditState.gaze=gaze;
  gaze===null?beanAuditState.leaves++:beanAuditState.moves++;
  const r=mark.getBoundingClientRect();
  beanAuditState.rect=[r.x,r.y,r.width,r.height].map(v=>+v.toFixed(2));
  beanAuditMount();beanAuditPaint();
}
function beanAuditPaint(){
  if(!beanAuditText)return;
  const s=beanAuditState;
  // A state transition can replace the host as well as its SVG. Rebind the
  // observed target surface without changing its input or native engine.
  if(s.host&&!s.host.isConnected&&s.rect){
    s.host=[...document.querySelectorAll('.sand-grok-bot-mark')].find(mark=>{
      const r=mark.getBoundingClientRect(),href=mark.querySelector('use')?.getAttribute('href')??'';
      return r.width===s.rect[2]&&Math.abs(r.x-s.rect[0])<1&&Math.abs(r.y-s.rect[1])<1&&(mark.querySelector('svg[__AVATAR_MARKER__]')||href.includes('__TARGET_BOT_ID__'));
    })??s.host;
  }
  // Native rendering may replace the SVG when effect-node topology changes.
  // Resolve the current node rather than keeping a detached previous frame.
  if(s.host?.isConnected){
    const own=s.host.querySelector('svg[__AVATAR_MARKER__]');
    const href=s.host.querySelector('use')?.getAttribute('href')??'';
    s.mark=own??document.getElementById(href.replace(/^#/,''));
  }
  const neon=s.mark?.hasAttribute('data-neon-state')?{shape:s.mark.getAttribute('data-avatar-shape'),avatarState:s.mark.getAttribute('data-neon-state'),expression:s.mark.getAttribute('data-neon-expression'),lamp:s.mark.getAttribute('data-neon-led-level'),clock:s.mark.getAttribute('data-neon-clock'),gesture:s.mark.getAttribute('data-neon-gesture'),nods:s.mark.getAttribute('data-neon-nods'),demo:s.mark.getAttribute('data-neon-demo')}:{};
  beanAuditText.textContent=JSON.stringify({gaze:s.gaze,moves:s.moves,leaves:s.leaves,pointerDowns:s.pointerDowns,trusted:s.trusted,buttons:s.buttons,avatarRect:s.rect,pose:s.mark?.getAttribute('data-pose')??null,...neon},null,2);
}
function beanAuditMount(){
  if(beanAuditPanel)return;
  beanAuditPanel=document.createElement('section');
  beanAuditPanel.setAttribute('aria-label','__AVATAR_NAME__悬停验收');
  beanAuditPanel.style.cssText='position:fixed;right:24px;bottom:24px;z-index:2147483000;padding:16px;background:#fff9ef;color:#513b2c;border:1px solid #e7c7a4;border-radius:14px;box-shadow:0 4px 18px #0001;font:12px system-ui;pointer-events:auto;width:330px';
  const title=document.createElement('strong');title.textContent='官方客户端 · __AVATAR_NAME__验收';
  beanAuditText=document.createElement('pre');beanAuditText.style.cssText='font:11px monospace;white-space:pre-wrap;margin:10px 0';
  const toggle=document.createElement('button');toggle.textContent='收起验收面板';
  toggle.onclick=()=>{const hidden=beanAuditText.hidden=!beanAuditText.hidden;toggle.textContent=hidden?'展开验收面板':'收起验收面板'};
  beanAuditPanel.append(title,beanAuditText,toggle);document.body.append(beanAuditPanel);
  beanAuditTimer=setInterval(beanAuditPaint,100);
}
document.addEventListener('pointermove',event=>{beanAuditState.trusted=event.isTrusted;beanAuditState.buttons=event.buttons},true);
document.addEventListener('pointerup',event=>{beanAuditState.trusted=event.isTrusted;beanAuditState.buttons=event.buttons;beanAuditPaint()},true);
document.addEventListener('pointerdown',()=>{beanAuditState.pointerDowns++;beanAuditPaint()},true);
