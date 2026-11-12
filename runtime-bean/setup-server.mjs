import http from 'node:http';
import {randomBytes} from 'node:crypto';
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function setupHtml({botCount=0,action,nonce='',error='',success=false}){
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Grok Bot 头像工具</title><style>*{box-sizing:border-box}body{margin:0;background:#f1f5f3;color:#203e43;font-family:system-ui,"PingFang SC",sans-serif}main{max-width:650px;margin:50px auto;padding:32px;background:#fff;border:1px solid #dce7e4;border-radius:24px}small{letter-spacing:2px;color:#4a8488}h1{font-size:30px;margin:14px 0}p{line-height:1.8;color:#607a7e}.steps{padding:14px 18px;border-radius:12px;background:#eff6f4;font-size:14px;line-height:1.9}form{margin:24px 0 0}button{border:0;background:#267781;color:white;border-radius:12px;padding:14px 22px;font:600 15px system-ui;cursor:pointer;width:100%}.error,.note{padding:12px;background:#fff1e8;color:#985a29;border-radius:10px}.foot{font-size:12px;margin-bottom:0}@media(max-width:680px){main{margin:18px;padding:24px}}</style><main><small>GROK BOT AVATAR TOOL · 1.5.0</small><h1>${success?'已准备好，去 Bot 里选头像':'启动 Grok Bot，给任意 Bot 换头像'}</h1>${success?'<p>Grok Bot 已通过头像工具启动。</p><div class="steps">打开任意 Bot → 对话详情 → 点击头像 → <strong>原创动态头像</strong> 或 <strong>写真头像</strong>。<br>选择 42 款中的任意一款，点“应用头像”即可；每个 Bot 可以选不同款式。<br>想换回原来的头像，在同一窗口点“恢复原头像”。</div><p>下次双击同一个“启动头像工具.command”，会自动加载并记住每个 Bot 的选择。</p>':`<p>无需上传图片，也不需要事先选择 Bot。每个 Bot 的头像窗口提供 31 款动态角色和 11 款写真。</p><div class="steps">先确认 Grok Bot 已登录，再用 <strong>Command-Q</strong> 完全退出。<br>然后点下方“启动 Grok Bot”。</div>${error?'<p class="error" role="alert">'+escape(error)+'</p>':''}${botCount?'':'<p class="note">还没有在本机找到 Bot 列表。可以先启动，登录并同步后再在 Bot 详情里选择头像。</p>'}<form method="post" action="${escape(action)}"><input type="hidden" name="nonce" value="${escape(nonce)}"><button type="submit">启动 Grok Bot</button></form>`}<p class="foot">仅这台 Mac 显示 · 不修改云端头像 · Apple Silicon · 已验证 Grok Bot 1.0.1 · 其他版本自动检查头像兼容性</p></main></html>`;
}
export async function serveSetup({botCount=0,onStart,onListen,timeoutMs=30*60*1000}){
  const secret=randomBytes(24).toString('hex'),path='/'+secret,nonce=randomBytes(24).toString('hex');
  let busy=false,server,origin;
  const result=new Promise((resolve,reject)=>{
    server=http.createServer(async(req,res)=>{
      const send=(code,html)=>{res.writeHead(code,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"});res.end(html)};
      if(req.headers.host!==new URL(origin).host||req.url!==path){send(404,'Not found');return}
      if(req.method==='GET'){send(200,setupHtml({botCount,action:path,nonce}));return}
      if(req.method!=='POST'||(req.headers.origin&&req.headers.origin!=='null'&&req.headers.origin!==origin)||!String(req.headers['content-type']??'').startsWith('application/x-www-form-urlencoded')){send(403,'Forbidden');return}
      if(busy){send(409,'正在启动，请稍候。');return}
      let body='';try{
        for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>4096)throw Error('请求过长。')}
        const params=new URLSearchParams(body);if(params.get('nonce')!==nonce){send(403,'Forbidden');return}
        busy=true;await onStart();send(200,setupHtml({botCount,action:path,nonce,success:true}));
        resolve({started:true});server.close();
      }catch(error){busy=false;send(400,setupHtml({botCount,action:path,nonce,error:error.message}));}
    });
    server.on('error',reject);server.listen(0,'127.0.0.1',()=>{origin='http://127.0.0.1:'+server.address().port;onListen?.(origin+path)});
  });
  const timer=setTimeout(()=>server.close(),timeoutMs);timer.unref();
  result.finally(()=>clearTimeout(timer)).catch(()=>{});
  return {server,result,get url(){return origin?origin+path:null}};
}
