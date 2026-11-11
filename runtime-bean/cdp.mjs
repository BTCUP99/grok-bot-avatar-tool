// Local developer connection used by the requested runtime avatar loader.
// No DOM automation, authentication access, or input simulation.
export class CDP {
  constructor(url) {
    const u = new URL(url);
    if (u.protocol !== 'ws:' || u.hostname !== '127.0.0.1' || u.port !== '19223' || !/^\/devtools\/page\/[\w-]+$/.test(u.pathname)) throw Error('Unexpected debugger endpoint');
    this.ws = new WebSocket(url); this.id = 0; this.pending = new Map(); this.listeners = new Map();
    this.ready = new Promise((resolve, reject) => { this.ws.addEventListener('open', resolve, {once:true}); this.ws.addEventListener('error', reject, {once:true}); });
    this.ws.addEventListener('message', event => {
      const m = JSON.parse(event.data);
      if (m.id) {const p=this.pending.get(m.id);if(p){clearTimeout(p.timer);this.pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}}
      else for(const cb of this.listeners.get(m.method)??[]) Promise.resolve(cb(m.params)).catch(e=>console.error('event:',e.message));
    });
    this.ws.addEventListener('close',()=>{for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(Error('CDP closed'));}this.pending.clear();});
  }
  on(name, cb) {const a=this.listeners.get(name)??[];a.push(cb);this.listeners.set(name,a);}
  async call(method, params={}) {
    await this.ready; const id=++this.id;
    return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);reject(Error(`${method} timeout`));},10000);this.pending.set(id,{resolve,reject,timer});this.ws.send(JSON.stringify({id,method,params}));});
  }
  close(){this.ws.close();}
}
export const rendererURL='file:///Applications/Grok%20Bot.app/Contents/Resources/app.asar/dist/renderer/index.html';
export async function target(){
  const r=await fetch('http://127.0.0.1:19223/json/list',{signal:AbortSignal.timeout(2000),redirect:'error'});
  if(!r.ok)throw Error(`CDP HTTP ${r.status}`);
  const matches=(await r.json()).filter(t=>t.type==='page' && decodeURI(t.url)===decodeURI(rendererURL));
  if(matches.length!==1)throw Error(`Expected exactly one official Grok Bot window, found ${matches.length}`);
  return matches[0];
}
