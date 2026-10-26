import http from 'node:http';
import https from 'node:https';
import { readFileSync } from 'node:fs';
import { readFile, open, realpath, lstat } from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { config, passwordOK, searchQuery, normalizeResult, inside, fail } from './core.mjs';
import { UserStore, ADMIN_ID, accountRoots } from './users.mjs';
const publicDir=fileURLToPath(new URL('./public/',import.meta.url));
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));};
async function body(req){let text='';for await(const chunk of req){text+=chunk;if(Buffer.byteLength(text)>32768)fail(413,'Requisição grande demais.');}try{return JSON.parse(text);}catch{fail(400,'JSON inválido.');}}
export function createApp(cfg,{fetcher=fetch,fileAccess=checkedFile,users=new UserStore()}={}){
 const sessions=new Map(),attempts=new Map();let inFlight=0;
 const origin=cfg.publicOrigin||`http://127.0.0.1:${cfg.port}`;
 const admin=()=>({id:ADMIN_ID,username:'admin',name:'Administrador',active:true,version:users.admin?.version||1,hash:users.admin?.hash||cfg.hash,downloads:true});
 const account=id=>id===ADMIN_ID?admin():users.get(id);
 function revoke(userId){for(const [id,s] of sessions)if(s.userId===userId){for(const stream of s.streams)stream.destroy();sessions.delete(id);}}
 function current(session,token){
  const user=session&&account(session.userId);
  if(!session||sessions.get(token)!==session||session.expires<Date.now()||!user?.active||session.version!==user.version){if(session)revoke(session.userId);fail(401,'Sessão encerrada. Entre novamente.');}
  return user;
 }
 const handler=async(req,res)=>{
  for(const [k,v] of Object.entries({'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",'Permissions-Policy':'camera=(), microphone=(), geolocation=()'}))res.setHeader(k,v);
  if(cfg.tls)res.setHeader('Strict-Transport-Security','max-age=31536000');
  try{
   if((cfg.mode!=='accounts'&&!['127.0.0.1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress))||req.headers.host?.toLowerCase()!==new URL(origin).host.toLowerCase())fail(403,'Host ou acesso não permitido.');
   if(req.headers['x-forwarded-for']||req.headers['x-forwarded-user']||req.headers.forwarded)fail(403,'Proxy não permitido.');
   if((req.headers.origin&&req.headers.origin!==origin)||req.headers['sec-fetch-site']==='cross-site')fail(403,'Origem bloqueada.');
   if(req.method==='POST'&&req.headers.origin!==origin)fail(403,'Origem obrigatória.');
   const url=new URL(req.url,origin),route=url.pathname;
   for(const [id,s] of sessions)if(s.expires<Date.now()){for(const stream of s.streams)stream.destroy();sessions.delete(id);}
   const token=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('nexus='))?.slice(6),session=sessions.get(token);
   if(route==='/api/login'&&req.method==='POST'){
    const input=await body(req);const username=typeof input?.username==='string'?input.username.trim().toLowerCase():'admin';
    for(const [key,bucket] of attempts)if(bucket.since<Date.now()-60000)attempts.delete(key);
    if(attempts.size>2000)fail(429,'Muitas tentativas. Aguarde um minuto.');
    for(const [key,max] of [[`ip:${req.socket.remoteAddress}`,20],[`user:${username.slice(0,32)}`,6]]){const bucket=attempts.get(key)||{since:Date.now(),count:0};if(bucket.count>=max)fail(429,'Aguarde um minuto antes de tentar novamente.');bucket.count++;attempts.set(key,bucket);}
    const user=username==='admin'?admin():users.find(username);
    const valid=passwordOK(input?.password,user?.hash||cfg.hash);
    if(!valid||!user?.active)fail(401,'Usuário ou senha inválidos.');
    if(session){for(const stream of session.streams)stream.destroy();sessions.delete(token);}
    const id=randomBytes(32).toString('hex');if(sessions.size>=1000)fail(429,'Limite de sessões atingido.');
    sessions.set(id,{userId:user.id,version:user.version,expires:Date.now()+30*60000,items:new Map(),streams:new Set()});
    res.setHeader('Set-Cookie',`nexus=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=1800${cfg.tls?'; Secure':''}`);return json(res,200,{ok:true});
   }
   if(route.startsWith('/api/')){
    const user=current(session,token),isAdmin=user.id===ADMIN_ID;
    const roots=accountRoots(user,cfg),scope={...cfg,roots},canDownload=cfg.downloads&&user.downloads;
    if(route==='/api/logout'&&req.method==='POST'){for(const stream of session.streams)stream.destroy();sessions.delete(token);res.setHeader('Set-Cookie',`nexus=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${cfg.tls?'; Secure':''}`);return json(res,200,{ok:true});}
    if(route==='/api/password'&&req.method==='POST'){
     const key='password:'+user.id;let bucket=attempts.get(key);if(!bucket||bucket.since<Date.now()-60000)bucket={since:Date.now(),count:0};if(bucket.count>=6)fail(429,'Aguarde um minuto antes de tentar novamente.');bucket.count++;attempts.set(key,bucket);
     const input=await body(req);
     if(!passwordOK(input?.currentPassword,user.hash))fail(403,'Senha atual incorreta.');
     if(typeof input.newPassword!=='string'||input.newPassword!==input.confirmPassword)fail(400,'A confirmação deve ser igual à nova senha.');
     await users.changePassword(user.id,input.newPassword,user.version);revoke(user.id);
     res.setHeader('Set-Cookie',`nexus=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${cfg.tls?'; Secure':''}`);return json(res,200,{ok:true});
    }
    if(route==='/api/session'&&req.method==='GET')return json(res,200,{mode:cfg.mode||'admin-local',downloads:canDownload,expires:session.expires,user:{username:user.username,name:user.name,role:isAdmin?'admin':'user'}});
    if(route==='/api/admin/users'||route.startsWith('/api/admin/users/')){
     if(!isAdmin)fail(403,'Somente o administrador pode gerenciar usuários.');
     if(route==='/api/admin/users'&&req.method==='GET')return json(res,200,{users:users.list(),downloadsEnabled:cfg.downloads});
     if(req.method==='POST'){
      const id=route==='/api/admin/users'?null:route.slice('/api/admin/users/'.length);if(id&&!/^[a-f0-9]{32}$/.test(id))fail(404,'Usuário não encontrado.');
      const saved=await users.save(await body(req),cfg,id);revoke(saved.id);return json(res,id?200:201,{user:saved});
     }
     fail(405,'Método não permitido.');
    }
    if(route==='/api/roots'&&req.method==='GET')return json(res,200,{roots:roots.map(r=>({path:r.path,name:path.win32.basename(r.path)||r.path}))});
    if((route==='/api/search'||route==='/api/folders')&&req.method==='GET'){
     const params=new URLSearchParams(url.searchParams);
     if(!roots.length){if(params.get('folder'))fail(403,'Pasta fora do escopo.');return json(res,200,{items:[],total:0,offset:0,count:25});}
     if(inFlight>=3)fail(429,'Há pesquisas em andamento. Tente novamente.');
     if(route==='/api/folders'){params.set('type','folder');params.set('q','');params.set('ext','');params.set('count','100');params.set('view','children');}
     const query=searchQuery(params,scope);let data;
     inFlight++;try{const response=await fetcher(query.url,{signal:AbortSignal.timeout(8000),redirect:'error'});if(!response.ok)throw Error();const chunks=[];let bytes=0;for await(const c of response.body){bytes+=c.length;if(bytes>2*1024*1024)throw Error();chunks.push(c);}data=JSON.parse(Buffer.concat(chunks).toString());}
     catch{fail(502,'Everything indisponível ou resposta inválida. Verifique o serviço local na porta 8888.');}finally{inFlight--;}
     current(session,token);
     if(!Array.isArray(data.results)||!Number.isSafeInteger(data.totalResults)||data.totalResults<0||data.results.length>query.count)fail(502,'Formato inesperado do Everything.');
     const items=data.results.map(row=>normalizeResult(row,scope));
     if(items.some(x=>!x))fail(502,'Resposta fora do escopo aprovado.');
     if(items.some(x=>(query.folder&&!inside(query.folder,x.fullPath))||(query.view==='children'&&path.win32.normalize(x.path).replace(/\\$/,'').toLowerCase()!==path.win32.normalize(query.folder).replace(/\\$/,'').toLowerCase())||(route==='/api/folders'&&x.type!=='folder')))fail(502,'Resposta fora da pasta selecionada.');
     if(session.items.size>1000)session.items.clear();
     for(const item of items){item.id=randomBytes(18).toString('hex');session.items.set(item.id,item);}
     return json(res,200,{items,total:data.totalResults,offset:query.offset,count:query.count});
    }
    if((route==='/api/access'&&req.method==='POST')||(route==='/api/download'&&req.method==='GET')){
     const id=route==='/api/access'?(await body(req)).id:url.searchParams.get('id'),item=session.items.get(id);
     if(!canDownload||!item||item.type!=='file'||!roots.some(r=>inside(r.path,item.fullPath)))fail(403,'Download não autorizado.');
     let handle;try{handle=await fileAccess(item.fullPath,roots);}catch{fail(403,'Arquivo sem acesso de leitura ou fora das pastas permitidas.');}
     try{
      current(session,token);
      if(route==='/api/access')return json(res,200,{allowed:true});
      res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename="download"; filename*=UTF-8''${encodeURIComponent(item.name).replace(/['()*]/g,c=>'%'+c.charCodeAt(0).toString(16))}`});
      session.streams.add(res);try{await pipeline(handle.createReadStream(),res);}finally{session.streams.delete(res);}return;
     }finally{await handle.close().catch(()=>{});}
    }
    fail(404,'Recurso não encontrado.');
   }
   if(req.method!=='GET')fail(405,'Método não permitido.');
   const assets=new Map([['/',['index.html','text/html']],['/app.js',['app.js','text/javascript']],['/users.js',['users.js','text/javascript']],['/style.css',['style.css','text/css']]]);
   if(!assets.has(route))fail(404,'Recurso não encontrado.');
   const [file,type]=assets.get(route);const content=await readFile(path.join(publicDir,file));res.writeHead(200,{'Content-Type':`${type}; charset=utf-8`});res.end(content);
  }catch(error){if(res.headersSent){res.destroy();return;}json(res,error.status||500,{error:error.status?error.message:'Falha interna. Tente novamente.'});}
 };
 const server=cfg.tls?https.createServer({cert:readFileSync(cfg.tls.cert),key:readFileSync(cfg.tls.key),minVersion:'TLSv1.2'},handler):http.createServer(handler);
 server.requestTimeout=15000;server.headersTimeout=10000;return server;
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
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const cfg=config(),users=await UserStore.open(cfg.usersFile);createApp(cfg,{users}).listen(cfg.port,cfg.host,()=>console.log(`Nexus Search AI Web — ${cfg.publicOrigin||`http://127.0.0.1:${cfg.port}`} (${cfg.mode})`));}catch(e){console.error(e.message);process.exitCode=1;}
}
