import { createInterface } from 'node:readline/promises';
import { randomBytes, scryptSync } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { config } from '../core.mjs';
const rl=createInterface({input:process.stdin,output:process.stdout});
try {
 console.log('Configuração local. A senha será gerada e exibida uma única vez. Guarde-a em seu gerenciador de senhas.');
 const root=await rl.question('Pasta Windows aprovada para pesquisa (caminho absoluto): ');
 const unc=await rl.question('UNC correspondente (opcional; Enter para omitir): ');
 const password=randomBytes(24).toString('base64url'),salt=randomBytes(16).toString('hex');
 const env={NEXUS_MODE:'admin-local',NEXUS_HOST:'127.0.0.1',NEXUS_PORT:'3000',EVERYTHING_URL:'http://127.0.0.1:8888/',NEXUS_ADMIN_HASH:salt+':'+scryptSync(password,salt,64).toString('hex'),NEXUS_ROOTS:JSON.stringify([{path:root,...(unc?{unc}: {})}]),NEXUS_DOWNLOADS:'false'};
 config(env);
 const text=Object.entries(env).map(([k,v])=>`${k}='${v.replace(/'/g,"'\"'\"'")}'`).join('\n');
 if(Object.values(env).some(v=>v.includes("'")))throw Error('Use raízes sem apóstrofos nesta configuração.');
 await writeFile(new URL('../.env',import.meta.url),text+'\n',{flag:'wx',mode:0o600});console.log('Senha do administrador: '+password);console.log('Configuração criada. Execute npm start.');
}catch(e){console.error(e.code==='EEXIST'?'Já existe .env. Edite-a localmente; nenhum arquivo foi substituído.':e.message);process.exitCode=1;}finally{rl.close();}
