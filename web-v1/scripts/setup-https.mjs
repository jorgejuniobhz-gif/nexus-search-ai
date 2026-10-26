import { readFile,writeFile,mkdir,rename,unlink,copyFile,lstat } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv,parseArgs } from 'node:util';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { config } from '../core.mjs';
import { generateLocalCertificate,verifyLocalCertificate,validDnsName } from './local-certificate.mjs';
export function updateEnv(text,values){const lines=text.split(/\r?\n/),seen=new Set();const output=lines.map(line=>{const found=line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/);if(!found||!Object.hasOwn(values,found[1]))return line;const key=found[1];if(seen.has(key))return '';seen.add(key);return `${key}='${values[key]}'`;});for(const [key,value] of Object.entries(values))if(!seen.has(key))output.push(`${key}='${value}'`);return output.join('\n').replace(/\n+$/,'')+'\n';}
async function secureDirectory(dir){if(process.platform!=='win32')return;const result=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command','[System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value'],{encoding:'utf8',windowsHide:true});const sid=result.stdout?.trim();if(result.status!==0||!/^S-1-5-[0-9-]+$/.test(sid))throw Error('Não foi possível identificar a conta Windows.');const acl=spawnSync('icacls.exe',[dir,'/inheritance:r','/grant:r',`*${sid}:(OI)(CI)F`,'*S-1-5-18:(OI)(CI)F','*S-1-5-32-544:(OI)(CI)F'],{encoding:'utf8',windowsHide:true});if(acl.status!==0)throw Error('Não foi possível proteger a pasta TLS. A configuração não foi alterada.');}
export async function setupHttps(root,{hostname='nexus',port=3443,secure=secureDirectory}={}){
 if(!validDnsName(hostname)||!Number.isInteger(port)||port<1024||port>65535||port===8888)throw Error('Nome ou porta inválidos.');hostname=hostname.toLowerCase();
 const envPath=path.join(root,'.env'),original=await readFile(envPath,'utf8'),tlsDir=path.join(root,'data','tls');
 const certFile=path.join(tlsDir,'server-cert.pem'),keyFile=path.join(tlsDir,'server-key.pem'),caFile=path.join(tlsDir,'nexus-ca.cer');
 const values={NEXUS_MODE:'accounts',NEXUS_HOST:'0.0.0.0',NEXUS_PORT:String(port),NEXUS_PUBLIC_ORIGIN:`https://${hostname}:${port}`,NEXUS_TLS_CERT:certFile.replaceAll('\\','/'),NEXUS_TLS_KEY:keyFile.replaceAll('\\','/')};
 if(Object.values(values).some(v=>v.includes("'")))throw Error('O caminho da instalação não pode conter apóstrofos neste assistente.');
 const updated=updateEnv(original,values);config(parseEnv(updated));
 await mkdir(path.dirname(tlsDir),{recursive:true});let fresh=false;try{await mkdir(tlsDir,{mode:0o700});fresh=true;}catch(e){if(e.code!=='EEXIST')throw e;if((await lstat(tlsDir)).isSymbolicLink())throw Error('Pasta TLS não pode ser um link.');}
 await secure(tlsDir);let certificate;
 if(fresh){certificate=generateLocalCertificate(hostname);await writeFile(keyFile,certificate.keyPem,{flag:'wx',mode:0o600});await writeFile(certFile,certificate.certPem,{flag:'wx',mode:0o600});await writeFile(caFile,certificate.caDer,{flag:'wx',mode:0o600});}
 else{const [ca,cert,key]=await Promise.all([readFile(caFile),readFile(certFile),readFile(keyFile)]);certificate=verifyLocalCertificate(hostname,ca,cert,key);}
 const backup=envPath+'.before-https-'+Date.now()+'-'+randomBytes(4).toString('hex');await copyFile(envPath,backup,constants.COPYFILE_EXCL);
 const tmp=envPath+'.'+randomBytes(8).toString('hex')+'.tmp';try{await writeFile(tmp,updated,{flag:'wx',mode:0o600});await rename(tmp,envPath);}finally{await unlink(tmp).catch(()=>{});}
 return {origin:values.NEXUS_PUBLIC_ORIGIN,caFile,backup,fingerprint:certificate.fingerprint,expires:certificate.expires};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const {values}=parseArgs({options:{name:{type:'string',default:'nexus'},port:{type:'string',default:'3443'}}});const result=await setupHttps(fileURLToPath(new URL('../',import.meta.url)),{hostname:values.name,port:Number(values.port)});console.log('HTTPS configurado: '+result.origin);console.log('Certificado público para os PCs: '+result.caFile);console.log('Impressão SHA-256 da autoridade local: '+result.fingerprint);console.log('Certificado de servidor válido até: '+result.expires);console.log('Backup do .env: '+result.backup);console.log('Confie no certificado público nos PCs, configure o firewall LAN e execute npm.cmd start. Nenhuma regra ou certificado foi instalado no Windows automaticamente.');}
 catch(e){console.error('Configuração HTTPS não concluída: '+(e.code==='ENOENT'?'Arquivo necessário ausente. Execute na instalação já configurada.':e.message));process.exitCode=1;}
}
