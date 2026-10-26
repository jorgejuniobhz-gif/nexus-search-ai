import { randomBytes, scryptSync } from 'node:crypto';
import { readFile, writeFile, mkdir, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { safePath, inside, fail } from './core.mjs';
export const ADMIN_ID='bootstrap-admin';
const hashPattern=/^[a-f0-9]{32}:[a-f0-9]{128}$/;
export function hashPassword(password){
 if(typeof password!=='string'||password.length<12||password.length>128)fail(400,'Use uma senha de 12 a 128 caracteres.');
 const salt=randomBytes(16).toString('hex');return salt+':'+scryptSync(password,salt,64).toString('hex');
}
export function visibleUser(u){return {id:u.id,username:u.username,name:u.name,active:u.active,downloads:u.downloads,paths:[...u.paths],version:u.version};}
function validRecord(u){return u&&/^[a-f0-9]{32}$/.test(u.id)&&/^[a-z0-9][a-z0-9._-]{2,31}$/.test(u.username)&&u.username!=='admin'&&typeof u.name==='string'&&u.name.trim().length>0&&u.name.length<=80&&!/[\x00-\x1f]/.test(u.name)&&typeof u.active==='boolean'&&typeof u.downloads==='boolean'&&Array.isArray(u.paths)&&u.paths.length<=20&&u.paths.every(safePath)&&hashPattern.test(u.hash)&&Number.isSafeInteger(u.version)&&u.version>=1;}
export class UserStore {
 constructor(file=null,users=[]){this.file=file;this.users=users;this.queue=Promise.resolve();}
 static async open(file){
  let users=[];
  try{const raw=await readFile(file);if(raw.length>2*1024*1024)throw Error();const data=JSON.parse(raw.toString().trim());if(data.schema!==1||!Array.isArray(data.users)||data.users.length>200||!data.users.every(validRecord))throw Error();users=data.users;
   if(new Set(users.map(u=>u.id)).size!==users.length||new Set(users.map(u=>u.username)).size!==users.length)throw Error();
  }catch(e){if(e.code!=='ENOENT')throw Error('Base de usuários inválida ou sem acesso. Restaure a cópia local; nenhuma conta foi recriada.');}
  return new UserStore(file,users);
 }
 get(id){return this.users.find(u=>u.id===id);}
 find(username){return this.users.find(u=>u.username===username);}
 list(){return this.users.map(visibleUser);}
 save(input,cfg,id=null){
  const operation=this.queue.then(async()=>{
   if(!input||typeof input!=='object')fail(400,'Cadastro inválido.');
   const prev=id?this.get(id):null;if(id&&!prev)fail(404,'Usuário não encontrado.');
   if(prev&&input.version!==prev.version)fail(409,'Cadastro alterado. Reabra o usuário antes de salvar.');
   const username=typeof input.username==='string'?input.username.trim().toLowerCase():'';
   const name=typeof input.name==='string'?input.name.trim():'';
   if(!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username)||username==='admin'||!name||name.length>80||/[\x00-\x1f]/.test(name))fail(400,'Informe nome e login válido (3–32 letras, números, ponto, hífen ou sublinhado). admin é reservado.');
   if(this.users.some(u=>u.id!==id&&u.username===username))fail(409,'Esse login já está cadastrado.');
   if(!Array.isArray(input.paths)||input.paths.length>20||input.paths.some(p=>!safePath(p)||!cfg.roots.some(r=>inside(r.path,p))))fail(400,'Selecione até 20 pastas dentro das raízes aprovadas.');
   if(typeof input.active!=='boolean'||typeof input.downloads!=='boolean')fail(400,'Permissões inválidas.');
   const paths=[...new Set(input.paths.map(p=>path.win32.normalize(p)))];
   const minimal=paths.filter((p,i)=>!paths.some((other,j)=>i!==j&&inside(other,p)&&(other.toLowerCase()!==p.toLowerCase()||j<i)));
   const hash=input.password!==undefined&&input.password!==''?hashPassword(input.password):prev?.hash;
   if(!hash)fail(400,'Informe uma senha inicial de pelo menos 12 caracteres.');
   if(!prev&&this.users.length>=200)fail(409,'Limite de 200 usuários atingido. Desative contas sem uso.');
   const user={id:prev?.id||randomBytes(16).toString('hex'),username,name,hash,active:input.active,downloads:input.downloads,paths:minimal,version:(prev?.version||0)+1};
   const next=this.users.filter(u=>u.id!==user.id).concat(user);
   const serialized=JSON.stringify({schema:1,users:next});if(Buffer.byteLength(serialized)>2*1024*1024)fail(409,'Limite da base de usuários atingido.');
   if(this.file){
    await mkdir(path.dirname(this.file),{recursive:true});const tmp=this.file+'.'+randomBytes(8).toString('hex')+'.tmp';
    try{await writeFile(tmp,serialized,{flag:'wx',mode:0o600});await rename(tmp,this.file);}finally{await unlink(tmp).catch(()=>{});}
   }
   this.users=next;return visibleUser(user);
  });this.queue=operation.catch(()=>{});return operation;
 }
}
export function accountRoots(account,cfg){
 if(account.id===ADMIN_ID)return cfg.roots;
 // Intersect every grant with the current global configuration on every request.
 return account.paths.flatMap(p=>{const root=cfg.roots.find(r=>inside(r.path,p));if(!root)return [];return [{path:p,...(root.unc?{unc:path.win32.join(root.unc,path.win32.relative(root.path,p))}:{})}];});
}
