import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scryptSync, timingSafeEqual } from 'node:crypto';
export class HttpError extends Error { constructor(status, message) { super(message); this.status=status; } }
export const fail=(code,message)=>{throw new HttpError(code,message);};
export const reEscape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export function inside(root,p) { const rel=path.win32.relative(root,p); return rel==='' || (!rel.startsWith('..\\') && rel!=='..' && !path.win32.isAbsolute(rel)); }
export function safePath(p) {
 if(typeof p!=='string'||/[\x00-\x1f"<>|?*]/.test(p)||p.includes('/')||p.startsWith('\\\\?\\')||p.startsWith('\\\\.\\')) return false;
 if(!/^(?:[a-z]:\\|\\\\[^\\]+\\[^\\]+(?:\\|$))/i.test(p)) return false;
 return p.split('\\').every((part,i)=>!part||(!/[ .]$/.test(part)&&part!=='.'&&part!=='..'&&!/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)&&(!part.includes(':')||(i===0&&/^[a-z]:$/i.test(part)))));
}
export function config(env=process.env) {
 const mode=env.NEXUS_MODE||'admin-local',host=env.NEXUS_HOST||'127.0.0.1';
 if(!['admin-local','accounts'].includes(mode)||(mode==='admin-local'&&host!=='127.0.0.1'))throw Error('Modo inválido. A instalação local deve usar 127.0.0.1.');
 let publicOrigin=null,tls=null;
 if(mode==='accounts'){
  if(!env.NEXUS_TLS_CERT||!env.NEXUS_TLS_KEY||!env.NEXUS_PUBLIC_ORIGIN)throw Error('Acesso de equipe exige HTTPS: configure certificado, chave e origem pública.');
  const origin=new URL(env.NEXUS_PUBLIC_ORIGIN);
  if(origin.protocol!=='https:'||origin.pathname!=='/'||origin.search||origin.hash||origin.username||origin.password)throw Error('Origem pública HTTPS inválida.');
  if(!['0.0.0.0','127.0.0.1'].includes(host))throw Error('Use 0.0.0.0 ou 127.0.0.1 como host.');
  publicOrigin=origin.origin;tls={cert:env.NEXUS_TLS_CERT,key:env.NEXUS_TLS_KEY};
 }
 const upstream=new URL(env.EVERYTHING_URL||'http://127.0.0.1:8888/');
 if(upstream.origin!=='http://127.0.0.1:8888'||upstream.pathname!=='/'||upstream.search||upstream.hash||upstream.username||upstream.password) throw Error('Everything deve ser http://127.0.0.1:8888/');
 const hash=env.NEXUS_ADMIN_HASH||'';
 if(!/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(hash)) throw Error('Execute npm run setup para configurar a senha.');
 const roots=JSON.parse(env.NEXUS_ROOTS||'[]');
 if(!Array.isArray(roots)||!roots.length||roots.length>20) throw Error('Configure de 1 a 20 raízes aprovadas.');
 for(const r of roots) { if(!safePath(r.path)||(r.unc&&(!safePath(r.unc)||!r.unc.startsWith('\\\\')))) throw Error('Raiz inválida.'); r.path=path.win32.normalize(r.path); }
 const port=Number(env.NEXUS_PORT||3000); if(!Number.isInteger(port)||port<1024||port>65535||port===8888) throw Error('Porta inválida.');
 if(publicOrigin&&Number(new URL(publicOrigin).port||443)!==port)throw Error('A porta da origem HTTPS deve ser igual à porta do Nexus.');
 let content=null;
 if(env.NEXUS_CONTENT_ENABLED==='true'){
  if(!env.NEXUS_CONTENT_PYTHON||!env.NEXUS_CONTENT_DB||!path.isAbsolute(env.NEXUS_CONTENT_PYTHON)||!path.isAbsolute(env.NEXUS_CONTENT_DB))throw Error('Configure caminhos absolutos do Python e do índice de conteúdo.');
  content={python:env.NEXUS_CONTENT_PYTHON,db:env.NEXUS_CONTENT_DB};
 }
 return {port,host,mode,publicOrigin,tls,upstream,roots,hash,content,downloads:env.NEXUS_DOWNLOADS==='true',usersFile:path.resolve(env.NEXUS_USERS_FILE||fileURLToPath(new URL('./data/users.json',import.meta.url)))};
}
export function passwordOK(password,hash) { const [salt,expected]=hash.split(':'); return typeof password==='string'&&password.length<=1024&&timingSafeEqual(scryptSync(password,salt,64),Buffer.from(expected,'hex')); }
// Calendar days use the Everything host's local timezone.
export function modifiedPeriod(params) {
 const from=params.get('modifiedFrom')||'',to=params.get('modifiedTo')||'';
 const valid=value=>{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||value<'1601-01-01'||value>'9999-12-31')return false;
  const date=new Date(value+'T00:00:00Z');
  return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
 };
 if((from&&!valid(from))||(to&&!valid(to)))fail(400,'Período inválido. Informe datas válidas.');
 if(from&&to&&from>to)fail(400,'A data inicial deve ser anterior ou igual à data final.');
 // Everything date ranges include both entire calendar days.
 const terms=from&&to?['dm:'+from+'..'+to]:from?['dm:>='+from]:to?['dm:<='+to]:[];
 return {from,to,terms};
}
export function searchQuery(params,cfg) {
 const period=modifiedPeriod(params);
 const q=(params.get('q')||'').trim(), folder=params.get('folder')||'', type=params.get('type')||'all', ext=params.get('ext')||'';
 if(q.length>200||q.includes('"')||/[\x00-\x1f]/.test(q)||!['all','file','folder'].includes(type)||!/^([a-z0-9]{1,16}(;[a-z0-9]{1,16})*)?$/i.test(ext)) fail(400,'Filtro inválido. Use texto simples, sem aspas.');
 if(folder&&(!safePath(folder)||!cfg.roots.some(r=>inside(r.path,folder)))) fail(403,'Pasta fora do escopo.');
 const view=params.get('view')||'subtree';
 if(!['subtree','children'].includes(view)||(view==='children'&&!folder)) fail(400,'Escopo de navegação inválido.');
 const offset=Number(params.get('offset')||0), count=Number(params.get('count')||25);
 if(!Number.isSafeInteger(offset)||offset<0||offset>1000000||![25,50,100].includes(count)) fail(400,'Paginação inválida.');
 const scopes=(folder?[{path:folder}]:cfg.roots).map(r=>reEscape(r.path.replace(/\\$/,''))+'\\\\');
 const query=[`regex:"^(?:${scopes.join('|')})${view==='children'?'[^\\\\]+$':''}"`,...(q?[`regex:"${reEscape(q)}"`]:[]),...(type==='all'?[]:[type==='folder'?'folder:':'file:']),...(ext?[`ext:${ext}`]:[]),...period.terms].join(' ');
 const url=new URL(cfg.upstream); for(const [k,v] of Object.entries({search:query,json:1,path:1,path_column:1,size_column:1,offset,count,sort:'name',ascending:1})) url.searchParams.set(k,v);
 return {url,offset,count,q,folder,view};
}
export function normalizeResult(row,cfg) {
 if(!row||!['file','folder'].includes(row.type)||typeof row.name!=='string'||/[\\/]/.test(row.name)||!row.name||row.name==='.'||row.name==='..'||!safePath(row.path)) return null;
 const full=path.win32.join(row.path||'',row.name);
 if(!safePath(full)) return null;
 const root=cfg.roots.find(r=>inside(r.path,full)); if(!root) return null;
 const unc=root.unc?path.win32.join(root.unc,path.win32.relative(root.path,full)):(full.startsWith('\\\\')?full:null);
 return {name:row.name,path:path.win32.normalize(row.path),rootPath:root.path,fullPath:full,type:row.type,size:row.type==='file'&&row.size!==undefined&&Number.isFinite(Number(row.size))?Number(row.size):null,unc};
}
