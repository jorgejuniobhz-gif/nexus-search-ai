import path from 'node:path';
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
 if((env.NEXUS_MODE||'admin-local')!=='admin-local'||(env.NEXUS_HOST||'127.0.0.1')!=='127.0.0.1') throw Error('Somente admin-local em 127.0.0.1 é permitido. LAN exige identidade e ACL por usuário.');
 const upstream=new URL(env.EVERYTHING_URL||'http://127.0.0.1:8888/');
 if(upstream.origin!=='http://127.0.0.1:8888'||upstream.pathname!=='/'||upstream.search||upstream.hash||upstream.username||upstream.password) throw Error('Everything deve ser http://127.0.0.1:8888/');
 const hash=env.NEXUS_ADMIN_HASH||'';
 if(!/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(hash)) throw Error('Execute npm run setup para configurar a senha.');
 const roots=JSON.parse(env.NEXUS_ROOTS||'[]');
 if(!Array.isArray(roots)||!roots.length||roots.length>20) throw Error('Configure de 1 a 20 raízes aprovadas.');
 for(const r of roots) { if(!safePath(r.path)||(r.unc&&(!safePath(r.unc)||!r.unc.startsWith('\\\\')))) throw Error('Raiz inválida.'); r.path=path.win32.normalize(r.path); }
 const port=Number(env.NEXUS_PORT||3000); if(!Number.isInteger(port)||port<1024||port>65535||port===8888) throw Error('Porta inválida.');
 return {port,upstream,roots,hash,downloads:env.NEXUS_DOWNLOADS==='true'};
}
export function passwordOK(password,hash) { const [salt,expected]=hash.split(':'); return typeof password==='string'&&password.length<=1024&&timingSafeEqual(scryptSync(password,salt,64),Buffer.from(expected,'hex')); }
export function searchQuery(params,cfg) {
 const q=(params.get('q')||'').trim(), folder=params.get('folder')||'', type=params.get('type')||'all', ext=params.get('ext')||'';
 if(q.length>200||q.includes('"')||/[\x00-\x1f]/.test(q)||!['all','file','folder'].includes(type)||!/^([a-z0-9]{1,16}(;[a-z0-9]{1,16})*)?$/i.test(ext)) fail(400,'Filtro inválido. Use texto simples, sem aspas.');
 if(folder&&(!safePath(folder)||!cfg.roots.some(r=>inside(r.path,folder)))) fail(403,'Pasta fora do escopo.');
 const offset=Number(params.get('offset')||0), count=Number(params.get('count')||25);
 if(!Number.isSafeInteger(offset)||offset<0||offset>1000000||![25,50,100].includes(count)) fail(400,'Paginação inválida.');
 const scopes=(folder?[{path:folder}]:cfg.roots).map(r=>reEscape(r.path.replace(/\\$/,''))+'\\\\');
 const query=[`regex:"^(?:${scopes.join('|')})"`,...(q?[`regex:"${reEscape(q)}"`]:[]),...(type==='all'?[]:[type==='folder'?'folder:':'file:']),...(ext?[`ext:${ext}`]:[])].join(' ');
 const url=new URL(cfg.upstream); for(const [k,v] of Object.entries({search:query,json:1,path:1,path_column:1,size_column:1,offset,count,sort:'name',ascending:1})) url.searchParams.set(k,v);
 return {url,offset,count,q,folder};
}
export function normalizeResult(row,cfg) {
 if(!row||!['file','folder'].includes(row.type)||typeof row.name!=='string'||/[\\/]/.test(row.name)||!row.name||row.name==='.'||row.name==='..'||!safePath(row.path)) return null;
 const full=path.win32.join(row.path||'',row.name);
 if(!safePath(full)) return null;
 const root=cfg.roots.find(r=>inside(r.path,full)); if(!root) return null;
 const unc=root.unc?path.win32.join(root.unc,path.win32.relative(root.path,full)):(full.startsWith('\\\\')?full:null);
 return {name:row.name,path:path.win32.normalize(row.path),rootPath:root.path,fullPath:full,type:row.type,size:row.type==='file'&&row.size!==undefined&&Number.isFinite(Number(row.size))?Number(row.size):null,unc};
}
