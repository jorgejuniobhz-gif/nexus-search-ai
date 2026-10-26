import http from 'node:http';
import { readFile, open, realpath, lstat } from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { config, passwordOK, searchQuery, normalizeResult, inside, fail } from './core.mjs';
const publicDir=fileURLToPath(new URL('./public/',import.meta.url));
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));};
async function body(req) { let text=''; for await(const chunk of req) {text+=chunk;if(Buffer.byteLength(text)>4096) fail(413,'Requisição grande demais.');} try{return JSON.parse(text);}catch{fail(400,'JSON inválido.');} }
export function createApp(cfg,{fetcher=fetch,fileAccess=checkedFile}={}) {
 const sessions=new Map(); let attempts=[]; let inFlight=0;
 const origin=`http://127.0.0.1:${cfg.port}`;
 const server=http.createServer(async(req,res)=>{
  for(const [k,v] of Object.entries({'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",'Permissions-Policy':'camera=(), microphone=(), geolocation=()'}))res.setHeader(k,v);
  try {
   if(!['127.0.0.1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)||req.headers.host!==`127.0.0.1:${cfg.port}`) fail(403,'Acesso somente no administrador local.');
   if(req.headers['x-forwarded-for']||req.headers['x-forwarded-user']||req.headers.forwarded) fail(403,'Proxy não permitido nesta versão.');
   if(req.headers.origin&&req.headers.origin!==origin) fail(403,'Origem bloqueada.');
   if(req.headers['sec-fetch-site']==='cross-site') fail(403,'Origem bloqueada.');
   const url=new URL(req.url,origin), route=url.pathname;
   if(req.method==='POST'&&req.headers.origin!==origin) fail(403,'Origem obrigatória.');
   for(const [id,s] of sessions)if(s.expires<Date.now())sessions.delete(id);
   const token=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('nexus='))?.slice(6), session=sessions.get(token);
   if(route==='/api/login'&&req.method==='POST') {
    attempts=attempts.filter(t=>t>Date.now()-60000);if(attempts.length>=5)fail(429,'Aguarde um minuto antes de tentar novamente.');attempts.push(Date.now());
    if(!passwordOK((await body(req)).password,cfg.hash))fail(401,'Senha inválida.');
    const id=randomBytes(32).toString('hex'); if(sessions.size>=10)sessions.delete(sessions.keys().next().value);
    sessions.set(id,{expires:Date.now()+30*60000,items:new Map()});res.setHeader('Set-Cookie',`nexus=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=1800`);return json(res,200,{ok:true});
   }
   if(route.startsWith('/api/')) {
    if(!session)fail(401,'Entre como administrador local.');
    if(route==='/api/logout'&&req.method==='POST'){sessions.delete(token);res.setHeader('Set-Cookie','nexus=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return json(res,200,{ok:true});}
    if(route==='/api/session'&&req.method==='GET')return json(res,200,{mode:'admin-local',downloads:cfg.downloads,expires:session.expires});
    if(route==='/api/roots'&&req.method==='GET')return json(res,200,{roots:cfg.roots.map(r=>({path:r.path,name:path.win32.basename(r.path)||r.path}))});
    if((route==='/api/search'||route==='/api/folders')&&req.method==='GET') {
     if(inFlight>=3)fail(429,'Há pesquisas em andamento. Tente novamente.');
     const params=new URLSearchParams(url.searchParams);
     if(route==='/api/folders') {params.set('type','folder');params.set('q','');params.set('ext','');params.set('count','100');params.set('view','children');}
     const query=searchQuery(params,cfg);let data;
     inFlight++; try {const response=await fetcher(query.url,{signal:AbortSignal.timeout(8000),redirect:'error'});if(!response.ok)throw Error();
      const chunks=[];let bytes=0;for await(const c of response.body){bytes+=c.length;if(bytes>2*1024*1024)throw Error();chunks.push(c);} data=JSON.parse(Buffer.concat(chunks).toString());
     }catch{fail(502,'Everything indisponível ou resposta inválida. Verifique o serviço local na porta 8888.');}finally{inFlight--;}
     if(!Array.isArray(data.results)||!Number.isSafeInteger(data.totalResults)||data.totalResults<0||data.results.length>query.count)fail(502,'Formato inesperado do Everything.');
     const items=data.results.map(row=>normalizeResult(row,cfg));
     // Fail closed: never send an upstream total when the returned page violates scope.
     if(items.some(x=>!x))fail(502,'Resposta fora do escopo aprovado.');
     if(items.some(x=>(query.folder&&!inside(query.folder,x.fullPath))||(query.view==='children'&&path.win32.normalize(x.path).replace(/\\$/,'').toLowerCase()!==path.win32.normalize(query.folder).replace(/\\$/,'').toLowerCase())||(route==='/api/folders'&&x.type!=='folder')))fail(502,'Resposta fora da pasta selecionada.');
     if(session.items.size>1000)session.items.clear();
     for(const item of items){item.id=randomBytes(18).toString('hex');session.items.set(item.id,item);}
     return json(res,200,{items,total:data.totalResults,offset:query.offset,count:query.count});
    }
    if((route==='/api/access'&&req.method==='POST')||(route==='/api/download'&&req.method==='GET')) {
     const id=route==='/api/access'?(await body(req)).id:url.searchParams.get('id'), item=session.items.get(id);
     if(!cfg.downloads||!item||item.type!=='file')fail(403,'Download não autorizado.');
     let handle;try{handle=await fileAccess(item.fullPath,cfg.roots);}catch{fail(403,'Arquivo sem acesso de leitura ou fora das raízes aprovadas.');}
     if(route==='/api/access'){await handle.close();return json(res,200,{allowed:true});}
     // Reopen and reauthorize on every download; an earlier check grants no permanent access.
     res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename="download"; filename*=UTF-8''${encodeURIComponent(item.name).replace(/['()*]/g,c=>'%'+c.charCodeAt(0).toString(16))}`});
     try{await pipeline(handle.createReadStream(),res);}finally{await handle.close().catch(()=>{});}return;
    }
    fail(404,'Recurso não encontrado.');
   }
   if(req.method!=='GET')fail(405,'Método não permitido.');
   const assets={'/':['index.html','text/html'],'/app.js':['app.js','text/javascript'],'/style.css':['style.css','text/css']};
   if(!assets[route])fail(404,'Recurso não encontrado.');
   const [file,type]=assets[route];res.writeHead(200,{'Content-Type':`${type}; charset=utf-8`});res.end(await readFile(path.join(publicDir,file)));
  }catch(error){if(res.headersSent){res.destroy();return;}json(res,error.status||500,{error:error.status?error.message:'Falha interna. Tente novamente.'});}
 });
 server.requestTimeout=15000;server.headersTimeout=10000;
 return server;
}
export async function checkedFile(full,roots) {
 if(process.platform!=='win32')throw Error('Windows necessário.');
 const root=roots.find(r=>inside(r.path,full));if(!root)throw Error();
 // Refuse symbolic links/junctions on the entire path, including configured root ancestors.
 let cursor=path.win32.parse(full).root;
 for(const segment of full.slice(cursor.length).split('\\').filter(Boolean)){cursor=path.win32.join(cursor,segment);if((await lstat(cursor)).isSymbolicLink())throw Error();}
 const [resolved,rootResolved]=await Promise.all([realpath(full),realpath(root.path)]);
 if(!inside(rootResolved,resolved))throw Error();
 const handle=await open(resolved,'r');try{if(!(await handle.stat()).isFile())throw Error();return handle;}catch(e){await handle.close();throw e;}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 try{const cfg=config();createApp(cfg).listen(cfg.port,'127.0.0.1',()=>console.log(`Nexus Search AI Web 1.0 — http://127.0.0.1:${cfg.port} (administrador local)`));}catch(e){console.error(e.message);process.exitCode=1;}
}
